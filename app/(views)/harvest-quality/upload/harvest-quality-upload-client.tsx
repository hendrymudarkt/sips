'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppDataTable } from '@/app/components/data/app-data-table';
import type { TableColumn } from 'react-data-table-component';
import { AccessDenied } from '@/app/components/feedback/access-denied';
import { useLocale } from '@/hooks/useLocale';
import { formatPerfDate, formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { useUploadPage } from '@/hooks/useUploadPage';
import { useBatchSubmit } from '@/hooks/useBatchSubmit';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { UploadLayout } from '@/app/components/ui/upload-layout';

interface HarvestQualityUploadData {
  empcode: string;
  fddate: string;
  fieldcode: string;
  under_ripe?: string | number;
  overripe?: string | number;
  abnormal?: string | number;
  long_stalk?: string | number;
  eaten_by_rat?: string | number;
  unharvest_ffb?: string | number;
  uncollect_lf_circle?: string | number;
  uncollect_lf_piece?: string | number;
  unarrange_ffb?: string | number;
  unprune_frond?: string | number;
  qe_1_pelepah_tidak_disusun?: string | number;
  qe_2_buah_matahari?: string | number;
  qe_3_buah_busuk?: string | number;
  qe_4_buah_mentah_diperam?: string | number;
  qe_5_over_pruning?: string | number;
  qe_6_brondolan_tidak_dialas?: string | number;
  qe_7_brondolan_kotor_sampah?: string | number;
  qe_8_buah_dibelah?: string | number;
  qe_9?: string | number;
  qe_10?: string | number;
  qe_11_buah_mentah_a1?: string | number;
  qe_12_buah_tinggal_s?: string | number;
  qe_13_b_ggng_pjg_t_dipotong?: string | number;
  qe_14?: string | number;
  qe_15?: string | number;
  qe_16_buah_mentah_kerani?: string | number;
  qe_17_buah_mentah_mandor?: string | number;
  fcentry?: string | null;
  fcedit?: string | null;
  fcip?: string | null;
  fcba: string;
  lastupdate?: string;
  lasttime?: string;
  documentno: string;
  _rowKey?: string;
  _searchContent?: string;
  _displayDate?: string;
  _underRipeNum?: number;
  _overripeNum?: number;
  _abnormalNum?: number;
  _longStalkNum?: number;
  _eatenByRatNum?: number;
  _unharvestFfbNum?: number;
  _uncollectLfCircleNum?: number;
  _uncollectLfPieceNum?: number;
  _unarrangeFfbNum?: number;
  _unpruneFrondNum?: number;
  _qe1Num?: number;
  _qe2Num?: number;
  _qe3Num?: number;
  _qe4Num?: number;
  _qe5Num?: number;
  [key: string]: unknown;
}

interface HarvestQualityUploadParams {
  empcode?: string;
  fddate?: string;
  fddate_end?: string;
  fieldcode?: string;
  fcba?: string;
}

const EMPTY_PARAMS: HarvestQualityUploadParams = {
  empcode: '',
  fddate: '',
  fddate_end: '',
  fieldcode: '',
  fcba: '',
};

const n = (v: string | number | undefined) => (v ? Number(v) : 0);

const createPayloadItem = (record: HarvestQualityUploadData): Record<string, unknown> => ({
  empcode: record.empcode || '',
  fddate: record.fddate || '',
  fieldcode: record.fieldcode || '',
  under_ripe: n(record.under_ripe),
  overripe: n(record.overripe),
  abnormal: n(record.abnormal),
  long_stalk: n(record.long_stalk),
  eaten_by_rat: n(record.eaten_by_rat),
  unharvest_ffb: n(record.unharvest_ffb),
  uncollect_lf_circle: n(record.uncollect_lf_circle),
  uncollect_lf_piece: n(record.uncollect_lf_piece),
  unarrange_ffb: n(record.unarrange_ffb),
  unprune_frond: n(record.unprune_frond),
  qe_1_pelepah_tidak_disusun: n(record.qe_1_pelepah_tidak_disusun),
  qe_2_buah_matahari: n(record.qe_2_buah_matahari),
  qe_3_buah_busuk: n(record.qe_3_buah_busuk),
  qe_4_buah_mentah_diperam: n(record.qe_4_buah_mentah_diperam),
  qe_5_over_pruning: n(record.qe_5_over_pruning),
  qe_6_brondolan_tidak_dialas: n(record.qe_6_brondolan_tidak_dialas),
  qe_7_brondolan_kotor_sampah: n(record.qe_7_brondolan_kotor_sampah),
  qe_8_buah_dibelah: n(record.qe_8_buah_dibelah),
  qe_9: n(record.qe_9),
  qe_10: n(record.qe_10),
  qe_11_buah_mentah_a1: n(record.qe_11_buah_mentah_a1),
  qe_12_buah_tinggal_s: n(record.qe_12_buah_tinggal_s),
  qe_13_b_ggng_pjg_t_dipotong: n(record.qe_13_b_ggng_pjg_t_dipotong),
  qe_14: n(record.qe_14),
  qe_15: n(record.qe_15),
  qe_16_buah_mentah_kerani: n(record.qe_16_buah_mentah_kerani),
  qe_17_buah_mentah_mandor: n(record.qe_17_buah_mentah_mandor),
  fcentry: record.fcentry || null,
  fcedit: record.fcedit || null,
  fcip: record.fcip || null,
  fcba: record.fcba || '',
  documentno: record.documentno ? Number(record.documentno) : 0,
});

export default function HarvestQualityUploadPage() {
  const localeTag = useLocale();
  const { isMgr, isAdmin, initCheck, userFcba } = useUploadPage();
  const { submit, submitting, submitProgress } = useBatchSubmit<HarvestQualityUploadData>();

  const [formParams, setFormParams] = useState<HarvestQualityUploadParams>(EMPTY_PARAMS);
  const [data, setData] = useState<HarvestQualityUploadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchData = async (overrideParams?: HarvestQualityUploadParams) => {
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const params = overrideParams ?? formParams;
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) queryParams.append(key, value);
      }

      const url = `/api/harvest-quality/upload${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setData(result.data);
      } else if (
        !result.success &&
        result.message &&
        !result.message.toLowerCase().includes('tidak ditemukan')
      ) {
        setError(result.message || 'Gagal mengambil data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initCheck) return;
    const initialParams = { ...EMPTY_PARAMS, fcba: userFcba };
    setFormParams(prev => ({ ...prev, fcba: userFcba || prev.fcba }));
    fetchData(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCheck]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await fetchData();
  };

  const handleResetFilter = () => {
    setFormParams(isAdmin ? EMPTY_PARAMS : { ...EMPTY_PARAMS, fcba: userFcba });
  };

  const dataWithKey = useMemo(
    () =>
      data.map((item, i) => {
        // ⚡ Bolt Optimization: Pre-calculate display date using cached formatters.
        const _displayDate = item.fddate ? formatPerfDate(item.fddate, localeTag) : '-';

        // ⚡ Bolt Optimization: Pre-calculate search content and row keys to avoid O(N*M) string operations during search.
        const _searchContent = [
          item.empcode,
          item.fddate,
          _displayDate,
          item.fieldcode,
          item.fcba,
          item.documentno,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return {
          ...item,
          _rowKey: `${item.empcode}-${item.fddate}-${item.fieldcode}-${item.documentno}-${i}`,
          _searchContent,
          _displayDate,
          // ⚡ Bolt Optimization: pre-calculate numeric values to avoid redundant regex parsing in loops and enable correct sorting.
          _underRipeNum: n(item.under_ripe),
          _overripeNum: n(item.overripe),
          _abnormalNum: n(item.abnormal),
          _longStalkNum: n(item.long_stalk),
          _eatenByRatNum: n(item.eaten_by_rat),
          _unharvestFfbNum: n(item.unharvest_ffb),
          _uncollectLfCircleNum: n(item.uncollect_lf_circle),
          _uncollectLfPieceNum: n(item.uncollect_lf_piece),
          _unarrangeFfbNum: n(item.unarrange_ffb),
          _unpruneFrondNum: n(item.unprune_frond),
          _qe1Num: n(item.qe_1_pelepah_tidak_disusun),
          _qe2Num: n(item.qe_2_buah_matahari),
          _qe3Num: n(item.qe_3_buah_busuk),
          _qe4Num: n(item.qe_4_buah_mentah_diperam),
          _qe5Num: n(item.qe_5_over_pruning),
        };
      }),
    [data, localeTag]
  );

  const { filteredDataWithKey, summary } = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered: HarvestQualityUploadData[] = [];
    const stats = {
      count: 0,
      totalUnderripe: 0,
      totalOverripe: 0,
      totalAbnormal: 0,
    };

    for (const item of dataWithKey) {
      if (!search || (item._searchContent && item._searchContent.includes(search))) {
        filtered.push(item);

        // ⚡ Bolt Optimization: Use pre-calculated numbers to avoid thousands of O(N*M) parsing calls during search.
        stats.count++;
        stats.totalUnderripe += item._underRipeNum || 0;
        stats.totalOverripe += item._overripeNum || 0;
        stats.totalAbnormal += item._abnormalNum || 0;
      }
    }

    return { filteredDataWithKey: filtered, summary: stats };
  }, [dataWithKey, searchTerm]);

  const columns: TableColumn<HarvestQualityUploadData>[] = useMemo(
    () => [
      {
        name: '#',
        width: '50px',
        cell: (_row, idx) => <span>{idx + 1}</span>,
        ignoreRowClick: true,
      },
      { name: 'Employee Code', selector: r => r.empcode || '-', sortable: true, width: '140px' },
      {
        name: 'FD Date',
        sortable: true,
        width: '120px',
        selector: r => r.fddate || '',
        cell: r => r._displayDate || '-',
      },
      { name: 'Field Code', selector: r => r.fieldcode || '-', sortable: true, width: '110px' },
      { name: 'Document No', selector: r => r.documentno || '-', sortable: true, width: '120px' },
      {
        name: 'Under Ripe',
        selector: r => r._underRipeNum || 0,
        cell: r => formatPerfNumber(r._underRipeNum || 0, localeTag),
        sortable: true,
        width: '110px',
      },
      {
        name: 'Overripe',
        selector: r => r._overripeNum || 0,
        cell: r => formatPerfNumber(r._overripeNum || 0, localeTag),
        sortable: true,
        width: '110px',
      },
      {
        name: 'Abnormal',
        selector: r => r._abnormalNum || 0,
        cell: r => formatPerfNumber(r._abnormalNum || 0, localeTag),
        sortable: true,
        width: '110px',
      },
      {
        name: 'Long Stalk',
        selector: r => r._longStalkNum || 0,
        cell: r => formatPerfNumber(r._longStalkNum || 0, localeTag),
        sortable: true,
        width: '110px',
      },
      {
        name: 'Eaten by Rat',
        selector: r => r._eatenByRatNum || 0,
        cell: r => formatPerfNumber(r._eatenByRatNum || 0, localeTag),
        sortable: true,
        width: '120px',
      },
      {
        name: 'Unharvest FFB',
        selector: r => r._unharvestFfbNum || 0,
        cell: r => formatPerfNumber(r._unharvestFfbNum || 0, localeTag),
        sortable: true,
        width: '120px',
      },
      {
        name: 'Uncollect LF Circle',
        selector: r => r._uncollectLfCircleNum || 0,
        cell: r => formatPerfNumber(r._uncollectLfCircleNum || 0, localeTag),
        sortable: true,
        width: '140px',
      },
      {
        name: 'Uncollect LF Piece',
        selector: r => r._uncollectLfPieceNum || 0,
        cell: r => formatPerfNumber(r._uncollectLfPieceNum || 0, localeTag),
        sortable: true,
        width: '135px',
      },
      {
        name: 'Unarrange FFB',
        selector: r => r._unarrangeFfbNum || 0,
        cell: r => formatPerfNumber(r._unarrangeFfbNum || 0, localeTag),
        sortable: true,
        width: '125px',
      },
      {
        name: 'Unprune Frond',
        selector: r => r._unpruneFrondNum || 0,
        cell: r => formatPerfNumber(r._unpruneFrondNum || 0, localeTag),
        sortable: true,
        width: '125px',
      },
      {
        name: 'QE 1 - Pelepah',
        selector: r => r._qe1Num || 0,
        cell: r => formatPerfNumber(r._qe1Num || 0, localeTag),
        sortable: true,
        width: '125px',
      },
      {
        name: 'QE 2 - Buah Matahari',
        selector: r => r._qe2Num || 0,
        cell: r => formatPerfNumber(r._qe2Num || 0, localeTag),
        sortable: true,
        width: '140px',
      },
      {
        name: 'QE 3 - Buah Busuk',
        selector: r => r._qe3Num || 0,
        cell: r => formatPerfNumber(r._qe3Num || 0, localeTag),
        sortable: true,
        width: '125px',
      },
      {
        name: 'QE 4 - Mentah Diperam',
        selector: r => r._qe4Num || 0,
        cell: r => formatPerfNumber(r._qe4Num || 0, localeTag),
        sortable: true,
        width: '145px',
      },
      {
        name: 'QE 5 - Over Pruning',
        selector: r => r._qe5Num || 0,
        cell: r => formatPerfNumber(r._qe5Num || 0, localeTag),
        sortable: true,
        width: '135px',
      },
      { name: 'FCBA', selector: r => r.fcba || '-', sortable: true, width: '100px' },
      { name: 'Last Update', selector: r => r.lastupdate || '-', sortable: true, width: '150px' },
    ],
    [localeTag]
  );

  const handleSubmitHarvestQuality = () => {
    if (data.length === 0) {
      setError('Tidak ada data untuk dikirim.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmHarvestQuality = async () => {
    setConfirmOpen(false);
    setError(null);
    const { successCount, failMessages, successList } = await submit(data, {
      createPayloadItem,
      endpoint: '/api/harvest-quality/submit',
      itemLabel: item => `Doc ${item.documentno} (${item.fieldcode})`,
    });

    const totalRecords = data.length;
    if (successCount === totalRecords) {
      alert(
        `✓ Sukses! Semua ${successCount} data harvesting quality berhasil dikirim ke SIPS.\n\nTotal Under Ripe: ${summary.totalUnderripe}\nTotal Overripe: ${summary.totalOverripe}\nTotal Abnormal: ${summary.totalAbnormal}`
      );
      setData([]);
    } else {
      let msg = `⚠️ Selesai dengan catatan.\nBerhasil: ${successCount}\nGagal: ${totalRecords - successCount}`;
      if (successList.length > 0) msg += `\n\nSuccessful Documents:\n${successList.join(', ')}`;
      if (failMessages.length > 0) {
        msg += `\n\nFailed:\n${failMessages.slice(0, 10).join('\n')}`;
        if (failMessages.length > 10) msg += `\n...dan ${failMessages.length - 10} lainnya`;
      }
      alert(msg);
      if (successCount > 0) await fetchData();
    }
  };

  if (initCheck && !isMgr && !isAdmin) return <AccessDenied />;
  if (!initCheck) return <UploadLayout />;

  return (
    <UploadLayout>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Upload Harvesting Quality</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Tampilkan dan upload data kualitas panenan TBS dari external API
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowFilters(s => !s)}
          >
            {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </button>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'empcode', label: 'Kode Karyawan', type: 'text', placeholder: '06-000223-230221-0323' },
              { key: 'fddate', label: '', type: 'date', placeholder: 'Tanggal Mulai' },
              { key: 'fddate_end', label: '', type: 'date', placeholder: 'Tanggal Akhir' },
              { key: 'fieldcode', label: 'Kode Blok', type: 'text', placeholder: 'I43, I45, dll' },
              { key: 'fcba', label: 'FCBA', type: 'text', placeholder: 'MTE, PTE, dll' },
            ]}
            values={formParams as Record<string, string>}
            onChange={(key, value) => setFormParams(prev => ({ ...prev, [key]: value }))}
            onApply={() => handleSearch()}
            onReset={handleResetFilter}
            loading={loading}
          />
        )}

        {error && (
          <div className="alert alert-error mb-4 shadow-sm">
            <p className="font-semibold">❌ Error: {error}</p>
          </div>
        )}
        {loading && !showFilters && (
          <div className="alert alert-info mb-4 shadow-sm">
            <span className="loading loading-spinner loading-sm" />
            <span>Mengambil data harvesting quality dari server...</span>
          </div>
        )}
        {!loading && data.length === 0 && !error && (
          <div className="alert mb-4 shadow-sm bg-base-200 border border-base-300">
            <div>
              <p className="font-medium">Tidak ada data harvesting quality</p>
              <p className="text-sm opacity-75">
                Silakan gunakan filter untuk mencari data kualitas panen.
              </p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="text-sm text-base-content/60">Total Records</div>
              <div className="text-2xl font-bold text-primary">{summary.count}</div>
            </div>
            <div className="bg-success/10 rounded-lg p-4 border border-success/20">
              <div className="text-sm text-base-content/60">Total Underripe</div>
              <div className="text-2xl font-bold text-success">
                {formatPerfNumber(summary.totalUnderripe, localeTag)}
              </div>
            </div>
            <div className="bg-info/10 rounded-lg p-4 border border-info/20">
              <div className="text-sm text-base-content/60">Total Overripe</div>
              <div className="text-2xl font-bold text-info">
                {formatPerfNumber(summary.totalOverripe, localeTag)}
              </div>
            </div>
            <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
              <div className="text-sm text-base-content/60">Total Abnormal</div>
              <div className="text-2xl font-bold text-warning">
                {formatPerfNumber(summary.totalAbnormal, localeTag)}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 items-center flex-wrap">
          <button
            onClick={handleSubmitHarvestQuality}
            disabled={data.length === 0 || submitting}
            className="btn btn-success"
          >
            {submitting ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                {submitProgress || 'Submitting...'}
              </>
            ) : (
              '📤 Submit ke SIPS'
            )}
          </button>
          {data.length > 0 && (
            <span className="text-sm font-medium">
              {filteredDataWithKey.length} dari {data.length} records
            </span>
          )}
        </div>

        {/* Search Box */}
        {data.length > 0 && (
          <div className="mb-4 max-w-md relative">
            <input
              type="text"
              placeholder="Cari Employee Code, Field Code, Document No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input input-bordered input-sm w-full pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
              >
                ✕
              </button>
            )}
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
        message={`Yakin ingin mengirim ${data.length} record harvesting quality ke SIPS?\n\nTotal Under Ripe: ${summary.totalUnderripe}\nTotal Overripe: ${summary.totalOverripe}\nTotal Abnormal: ${summary.totalAbnormal}`}
        onConfirm={handleConfirmHarvestQuality}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </UploadLayout>
  );
}




