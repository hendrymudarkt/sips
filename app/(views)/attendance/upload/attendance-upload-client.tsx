'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppDataTable } from '@/app/components/data/app-data-table';
import type { TableColumn } from 'react-data-table-component';
import {
  AttendanceUploadParams,
  fetchAttendanceUpload,
  insertAttendanceData,
  AttendanceUploadData as BaseAttendanceUploadData,
} from '@/utils/services/attendanceUploadService';
import { AccessDenied } from '@/app/components/feedback/access-denied';
import { useLocale } from '@/hooks/useLocale';
import { formatPerfDate, formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { useUploadPage } from '@/hooks/useUploadPage';
import { Icon } from '@/app/components/ui/icons';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { UploadLayout } from '@/app/components/ui/upload-layout';

const EMPTY_PARAMS: AttendanceUploadParams = {
  tanggal: '',
  tanggal_end: '',
  fcba: '',
  afdeling: '',
  gangcode: '',
};

/**
 * ? Bolt Optimization: Safely convert mixed API values to numbers.
 * Handles strings with commas and ensures a valid finite number is returned.
 */
const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface AttendanceUploadData extends BaseAttendanceUploadData {
  _rowKey?: string;
  _searchContent?: string;
  _displayDate?: string;
  _mandaysNum?: number;
  _othrsNum?: number;
  _rateNum?: number;
  _unitNum?: number;
  _outputNum?: number;
  _overtimeHoursNum?: number;
  _kgBrondolanNum?: number;
  _kgJanjangNum?: number;
  _bjrNum?: number;
}

export default function AttendanceUploadPage() {
  const localeTag = useLocale();
  const { isMgr, isAdmin, initCheck, userFcba, userAfdeling } = useUploadPage();

  const [formParams, setFormParams] = useState<AttendanceUploadParams>(EMPTY_PARAMS);
  const [data, setData] = useState<AttendanceUploadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchData = async (overrideParams?: AttendanceUploadParams) => {
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const paramsToUse = overrideParams || formParams;
      const response = await fetchAttendanceUpload(paramsToUse);

      if (response.success) {
        if (response.data && response.data.length > 0) {
          // Deduplicate data by linenokey to avoid React key warnings
          const uniqueData = Array.from(
            new Map(response.data.map(item => [item.linenokey, item])).values()
          );

          setData(uniqueData);
        }
        // Keep empty data as an empty state without setting an error
      } else {
        // Set an error only for serious failures, not empty data
        if (!response.message || !response.message.toLowerCase().includes('tidak ditemukan')) {
          setError(response.message || 'Gagal mengambil data');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initCheck) return;
    const initialParams: AttendanceUploadParams = {
      ...EMPTY_PARAMS,
      fcba: userFcba,
      afdeling: userAfdeling,
    };
    setFormParams(prev => ({
      ...prev,
      fcba: userFcba || prev.fcba,
      afdeling: userAfdeling || prev.afdeling,
    }));
    fetchData(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCheck]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await fetchData();
  };

  const handleResetFilter = () => {
    setFormParams(
      isAdmin ? EMPTY_PARAMS : { ...EMPTY_PARAMS, fcba: userFcba, afdeling: userAfdeling }
    );
  };

  // Add row keys for DataTable
  const dataWithKey = useMemo(() => {
    return data.map((item, idx) => {
      // ? Bolt Optimization: Pre-calculate display values and numbers once.
      // This converts O(N*R) work during render into O(N) work here.
      const _displayDate = formatPerfDate(item.fddate, localeTag) || '-';
      const _mandaysNum = toNumber(item.mandays);
      const _othrsNum = toNumber(item.othrs);
      const _rateNum = toNumber(item.rate);
      const _unitNum = toNumber(item.unit);
      const _outputNum = toNumber(item.output);
      const _overtimeHoursNum = toNumber(item.overtime_hours);
      const _kgBrondolanNum = toNumber(item.kg_brondolan);
      const _kgJanjangNum = toNumber(item.kg_janjang);
      const _bjrNum = toNumber(item.bjr);

      // ? Bolt Optimization: Pre-calculate search content to avoid O(N*M) string operations during search.
      const _searchContent = [
        item.employeecode,
        item.gangcode,
        item.jobcode,
        item.afdeling,
        item.attendance,
        item.locationcode,
        item.locationtype,
        item.fcba,
        item.reference,
        item.remarks,
        item.linenokey,
        item.id,
        _displayDate,
      ]
        .filter(v => v !== null && v !== undefined)
        .join(' ')
        .toLowerCase();

      return {
        ...item,
        _rowKey: `${item.linenokey}-${item.id}-${idx}`,
        _searchContent,
        _displayDate,
        _mandaysNum,
        _othrsNum,
        _rateNum,
        _unitNum,
        _outputNum,
        _overtimeHoursNum,
        _kgBrondolanNum,
        _kgJanjangNum,
        _bjrNum,
      };
    });
  }, [data, localeTag]);

  const filteredDataWithKey = useMemo(() => {
    if (!searchTerm.trim()) {
      return dataWithKey;
    }
    const search = searchTerm.toLowerCase();
    // ? Bolt Optimization: Use pre-calculated search content for O(N) filtering.
    return dataWithKey.filter(record => record._searchContent?.includes(search));
  }, [dataWithKey, searchTerm]);

  // Define DataTable columns
  const columns: TableColumn<AttendanceUploadData>[] = useMemo(
    () => [
      {
        name: '#',
        width: '50px',
        cell: (_row, idx) => <span>{idx + 1}</span>,
        ignoreRowClick: true,
      },
      {
        name: 'ID',
        selector: row => row.id,
        sortable: true,
        width: '80px',
      },
      {
        name: 'Line Key',
        selector: row => row.linenokey,
        sortable: true,
        width: '100px',
      },
      {
        name: 'Employee Code',
        selector: row => row.employeecode || '-',
        sortable: true,
        width: '130px',
      },
      {
        name: 'Job Code',
        selector: row => row.jobcode || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Attendance',
        selector: row => row.attendance || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Date',
        // ? Bolt: Use raw date in selector for correct chronological sorting.
        selector: row => row.fddate || '',
        // ? Bolt: Use pre-calculated display date in cell for O(1) rendering.
        cell: row => <span>{row._displayDate}</span>,
        sortable: true,
        width: '120px',
      },
      {
        name: 'Afdeling',
        selector: row => row.afdeling || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Gang Code',
        selector: row => row.gangcode || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Location Type',
        selector: row => row.locationtype || '-',
        sortable: true,
        width: '130px',
      },
      {
        name: 'Location Code',
        selector: row => row.locationcode || '-',
        sortable: true,
        width: '130px',
      },
      {
        name: 'Mandays',
        selector: row => row._mandaysNum || 0,
        cell: row => <span>{formatPerfNumber(row._mandaysNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
      {
        name: 'Othrs',
        selector: row => row._othrsNum || 0,
        cell: row => <span>{formatPerfNumber(row._othrsNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
      {
        name: 'Rate',
        selector: row => row._rateNum || 0,
        cell: row => <span>{formatPerfNumber(row._rateNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
      {
        name: 'Unit',
        selector: row => row._unitNum || 0,
        cell: row => <span>{formatPerfNumber(row._unitNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
      {
        name: 'Output',
        selector: row => row._outputNum || 0,
        cell: row => <span>{formatPerfNumber(row._outputNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
      {
        name: 'OT Hours',
        selector: row => row._overtimeHoursNum || 0,
        cell: row => <span>{formatPerfNumber(row._overtimeHoursNum || 0, localeTag)}</span>,
        sortable: true,
        width: '110px',
      },
      {
        name: 'Remarks',
        selector: row => row.remarks || '-',
        sortable: true,
        width: '150px',
      },
      {
        name: 'Reference',
        selector: row => row.reference || '-',
        sortable: true,
        width: '130px',
      },
      {
        name: 'FCBA',
        selector: row => row.fcba || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: 'Status',
        selector: row => row.rowstate || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Last Update',
        selector: row => row.lastupdate || '-',
        sortable: true,
        width: '150px',
      },
      {
        name: 'Entry By',
        selector: row => row.fcentry || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'Edit By',
        selector: row => row.fcedit || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: 'KG Brondolan',
        selector: row => row._kgBrondolanNum || 0,
        cell: row => <span>{formatPerfNumber(row._kgBrondolanNum || 0, localeTag)}</span>,
        sortable: true,
        width: '130px',
      },
      {
        name: 'KG Janjang',
        selector: row => row._kgJanjangNum || 0,
        cell: row => <span>{formatPerfNumber(row._kgJanjangNum || 0, localeTag)}</span>,
        sortable: true,
        width: '130px',
      },
      {
        name: 'BJR',
        selector: row => row._bjrNum || 0,
        cell: row => <span>{formatPerfNumber(row._bjrNum || 0, localeTag)}</span>,
        sortable: true,
        width: '100px',
      },
    ],
    [localeTag]
  );

  const handleSubmitAttendance = () => {
    if (data.length === 0) {
      setError('Tidak ada data untuk dikirim. Silakan cari data terlebih dahulu.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmAttendance = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    setSubmitProgress('Preparing data...');

    const BATCH_SIZE = 100;
    const totalRecords = data.length;
    let successCount = 0;
    const failMessages: string[] = [];

    try {
      // Helper to format payload item
      const createPayloadItem = (record: AttendanceUploadData) => {
        let formattedFddate = record.fddate;
        try {
          if (record.fddate && typeof record.fddate === 'string') {
            if (record.fddate.includes('T')) {
              formattedFddate = record.fddate.replace('T', ' ').substring(0, 19);
            } else if (record.fddate.length === 10) {
              // Append time if only date is present
              formattedFddate = `${record.fddate} 00:00:00`;
            }
          }
        } catch (e) {
          console.warn('Date formatting error:', e);
        }

        return {
          // REQUIRED FIELDS
          gangcode: record.gangcode || '',
          fddate: formattedFddate || '',
          employeecode: record.employeecode || '',
          attendance: record.attendance || '',
          fcba: record.fcba || '',
          linenokey: Number(record.linenokey || 0),
          documentno: Number(record.documentno || 0),

          // OPTIONAL FIELDS
          supervision_1: record.supervision_1 || null,
          supervision_2: record.supervision_2 || null,
          supervision_3: record.supervision_3 || null,
          supervision_4: record.supervision_4 || null,
          supervision_5: record.supervision_5 || null,
          jobcode: record.jobcode || null,
          locationtype: record.locationtype || null,
          locationcode: record.locationcode || null,
          mandays: record.mandays ? Number(record.mandays) : 0,
          othrs: record.othrs ? Number(record.othrs) : 0,
          rate: record.rate ? Number(record.rate) : 0,
          unit: record.unit ? Number(record.unit) : 0,
          output: record.output ? Number(record.output) : 0,
          reference: record.reference || null,
          remarks: record.remarks || 'SIPS MOBILE',
          fcentry: record.fcentry || null,
          fcedit: record.fcedit || null,
          fcip: record.fcip || null,
          lastupdate: record.lastupdate || null,
          lasttime: record.lasttime || null,
          overtime_hours: record.overtime_hours ? Number(record.overtime_hours) : 0,
          type_overtime: record.type_overtime ? Number(record.type_overtime) : 0,
          chargejob: record.chargejob || null,
          chargetype: record.chargetype || null,
          chargecode: record.chargecode || null,
          bucket: record.bucket || null,
          spbno: record.spbno || null,
          kg_janjang: record.kg_janjang ? Number(record.kg_janjang) : 0,
          kg_brondolan: record.kg_brondolan ? Number(record.kg_brondolan) : 0,
          rowstate: record.rowstate || null,
          document_classification: record.document_classification
            ? Number(record.document_classification)
            : null,
          basis_bm: record.basis_bm ? Number(record.basis_bm) : 0,
          bjr: record.bjr ? Number(record.bjr) : 0,
          sourcetime: record.sourcetime || null,
          janjang: 0,
          generate: 'SIPS MOBILE GENERATE',
          generatetime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          fieldcode: record.fieldcode || null,
        };
      };

      // Process in batches
      for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

        setSubmitProgress(
          `Submitting batch ${currentBatchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, totalRecords)}/${totalRecords})...`
        );

        const recordsToSubmit = {
          data: batch.map(createPayloadItem),
        };

        try {
          const response = await insertAttendanceData(
            recordsToSubmit as { data: Record<string, unknown>[] }
          );
          if (response.success) {
            successCount += batch.length;
          } else {
            // Batch level error logic - if backend says failure for whole batch
            throw new Error(response.message || 'Batch failed');
          }
        } catch (batchErr) {
          console.error(`Batch ${currentBatchNum} failed:`, batchErr);

          // RETRY STRATEGY: Try 1 by 1 to identify problematic rows
          setSubmitProgress(`Batch ${currentBatchNum} failed. Retrying item 1/${batch.length}...`);

          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const globalIndex = i + j + 1; // 1-based index

            try {
              const singlePayload = {
                data: [createPayloadItem(item)],
              };

              setSubmitProgress(
                `Retrying batch ${currentBatchNum} (Item ${j + 1}/${batch.length})...`
              );
              const singleResp = await insertAttendanceData(
                singlePayload as { data: Record<string, unknown>[] }
              );

              if (singleResp.success) {
                successCount++;
              } else {
                failMessages.push(`Baris ${globalIndex}: ${singleResp.message}`);
              }
            } catch (singleErr) {
              const errMsg = singleErr instanceof Error ? singleErr.message : 'Unknown error';
              failMessages.push(`Baris ${globalIndex} Error: ${errMsg}`);
            }
          }
        }
      }

      setSubmitProgress('');
      if (successCount === totalRecords) {
        alert(`? Sukses! Semua ${successCount} data berhasil dikirim ke SIPS.`);
        setData([]); // Clear list on full success
      } else {
        // Partial success or failure
        const msg = `??? Selesai dengan catatan.\nBerhasil: ${successCount}\nGagal: ${totalRecords - successCount}\n\nDetail Error:\n${failMessages.slice(0, 20).join('\n')}${failMessages.length > 20 ? '\n...dan ' + (failMessages.length - 20) + ' lainnya' : ''}`;
        alert(msg);

        if (successCount > 0) {
          await fetchData();
        }
      }
    } catch (err) {
      console.error('Submit critical error:', err);
      setError(`Critical Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  if (initCheck && !isMgr && !isAdmin) return <AccessDenied />;
  if (!initCheck) return <UploadLayout />;

  return (
    <UploadLayout>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Upload Attendance</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Tampilkan dan upload data attendance dari external API
            </p>
          </div>
          <div className="flex justify-start sm:justify-end gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowFilters(s => !s)}
              title="Tampilkan / sembunyikan filter"
            >
              {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'tanggal', label: '', type: 'date', placeholder: 'Tanggal Mulai' },
              { key: 'tanggal_end', label: '', type: 'date', placeholder: 'Tanggal Akhir' },
              { key: 'fcba', label: 'FCBA', type: 'text', placeholder: 'e.g., MTE' },
              { key: 'afdeling', label: 'Afdeling', type: 'text', placeholder: 'e.g., AFD-01' },
              { key: 'gangcode', label: 'Gang Code', type: 'text', placeholder: 'e.g., PN013' },
            ]}
            values={formParams as Record<string, string>}
            onChange={(key, value) => setFormParams(prev => ({ ...prev, [key]: value }))}
            onApply={() => handleSearch()}
            onReset={handleResetFilter}
            loading={loading}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-4 shadow-sm">
            <div className="w-full">
              <p className="font-semibold">? Error: {error}</p>
              <details className="mt-3 border-t border-base-content/20 pt-3">
                <summary className="text-xs cursor-pointer font-medium opacity-75 select-none">
                  ?? Debug Info (Klik untuk expand)
                </summary>
                <div className="mt-2 text-xs opacity-75 space-y-2">
                  <div className="bg-base-200 p-2 rounded">
                    <p className="font-mono text-xs">API route: /api/attendance/upload</p>
                  </div>
                  <div>
                    <p className="font-semibold">Kemungkinan Penyebab:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Token authentication expired atau invalid</li>
                      <li>External API server error atau sedang maintenance</li>
                      <li>Parameter API tidak valid</li>
                      <li>Network/Koneksi timeout</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">Cara Debug:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Tekan F12 ? buka tab &quot;Console&quot;</li>
                      <li>Cari log dengan prefix &quot;ATTENDANCE UPLOAD DEBUG&quot;</li>
                      <li>Buka tab &quot;Network&quot; ? cari request ke /api/attendance/upload</li>
                      <li>Cek response details dan error message</li>
                      <li>Jika perlu login ulang: refresh halaman & login kembali</li>
                    </ol>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !showFilters && (
          <div className="alert alert-info mb-4 shadow-sm">
            <span className="loading loading-spinner loading-sm"></span>
            <span>Mengambil data dari server...</span>
          </div>
        )}

        {/* Empty State - Data tidak ditemukan (tanpa error) */}
        {!loading && data.length === 0 && !error && (
          <div className="alert mb-4 shadow-sm bg-base-200 border border-base-300">
            <Icon name="info" className="h-5 w-5" />
            <div>
              <p className="font-medium">Data tidak ditemukan</p>
              <p className="text-sm opacity-75">
                Silakan gunakan filter untuk mencari data, atau coba dengan parameter yang berbeda.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 items-center flex-wrap">
          <button
            onClick={handleSubmitAttendance}
            disabled={data.length === 0 || submitting}
            className="btn btn-success"
            title="Submit semua data attendance ke database SIPS"
          >
            {submitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {submitProgress || 'Submitting...'}
              </>
            ) : (
              '?? Submit to SIPS'
            )}
          </button>

          {data.length > 0 && (
            <span className="text-sm font-medium">Total Data: {data.length} records</span>
          )}
        </div>

        {/* Search Box */}
        {data.length > 0 && (
          <div className="mb-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="search" className="h-5 w-5 text-base-content/40" />
              </div>
              <input
                type="text"
                placeholder="Cari berdasarkan Employee Code, Gang, Job, Afdeling, dll..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input input-bordered input-sm w-full pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  title="Clear search"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-base-content/60 mt-2">
                Menampilkan {filteredDataWithKey.length} dari {dataWithKey.length} records
              </p>
            )}
          </div>
        )}

        {/* Empty search result */}
        {data.length > 0 && searchTerm && filteredDataWithKey.length === 0 && (
          <div className="alert mb-4 shadow-sm bg-base-200 border border-base-300">
            <Icon name="empty-search" className="w-12 h-12 opacity-30 text-primary" />
            <div>
              <p className="font-medium">Tidak ada hasil untuk &quot;{searchTerm}&quot;</p>
              <p className="text-sm opacity-75">
                Coba gunakan kata kunci yang berbeda atau{' '}
                <button onClick={() => setSearchTerm('')} className="link link-primary">
                  hapus pencarian
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {data.length > 0 && (
          <AppDataTable
            columns={columns}
            data={filteredDataWithKey}
            loading={loading}
            paginationPerPage={10}
            paginationRowsPerPageOptions={[10, 30, 100, 500]}
            noDataComponent={<div className="py-8 text-base-content/70">Tidak ada data.</div>}
          />
        )}
      <ConfirmModal
        open={confirmOpen}
        title="Konfirmasi"
        message={`Yakin ingin mengirim ${data.length} record ke SIPS?`}
        onConfirm={handleConfirmAttendance}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </UploadLayout>
  );
}


