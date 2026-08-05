'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppDataTable } from '@/app/components/data/app-data-table';
import type { TableColumn } from 'react-data-table-component';
import { AccessDenied } from '@/app/components/feedback/access-denied';
import { useLocale } from '@/hooks/useLocale';
import { useUploadPage } from '@/hooks/useUploadPage';
import { useBatchSubmit } from '@/hooks/useBatchSubmit';
import { formatPerfDate, formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { UploadLayout } from '@/app/components/ui/upload-layout';

interface HarvestingUploadData {
  spbno?: string;
  nospb: string;
  fieldcode?: string;
  receptiondate?: string;
  harvestdate?: string;
  cropcode?: string;
  productcode?: string;
  own?: string;
  vehicle?: string;
  driver?: string;
  mill?: string;
  agreementcode?: string | null;
  transporttype?: string;
  spb_type?: number;
  bunch?: number | string;
  bucket?: number | null;
  pressemester_abw?: number | string;
  bunch_estateweight?: number | string;
  fcentry?: string | null;
  fcedit?: string | null;
  fcip?: string | null;
  fcba?: string;
  chitno?: string;
  mill_weight_bruto?: number | string;
  mill_weight_gross?: number | string;
  mill_weight_tarra?: number | string;
  mill_weight_potongan?: number | string;
  mill_weight_netto?: number | string;
  mentah?: string | null;
  tankos?: string | null;
  hilang?: string | null;
  keterangan?: string;
  mill_weight_dtl?: number | string;
  bjr_chit?: number | string;
  lasttime?: string;
  lastupdate?: string;
  _rowKey?: string;
  /**
   * ⚡ Bolt Optimization: Cached values to avoid O(N*M) lookups and
   * expensive regex-based number parsing in render/search loops.
   */
  _searchContent?: string;
  _bunchNum?: number;
  _estateWeightNum?: number;
  _millWeightBrutoNum?: number;
  _millWeightNettoNum?: number;
  [key: string]: unknown;
}

interface HarvestingUploadParams {
  nospb?: string;
  tanggal?: string;
  tanggal_end?: string;
  kode_kendaraan?: string;
  kode_karyawan_driver?: string;
  mill?: string;
  fcba?: string;
  chitno?: string;
}

const EMPTY_PARAMS: HarvestingUploadParams = {
  nospb: '',
  tanggal: '',
  tanggal_end: '',
  kode_kendaraan: '',
  kode_karyawan_driver: '',
  mill: '',
  fcba: '',
  chitno: '',
};

const createPayloadItem = (record: HarvestingUploadData): Record<string, unknown> => ({
  spbno: record.nospb || '',
  fieldcode: record.fieldcode || '',
  receptiondate: record.receptiondate || '',
  harvestdate: record.harvestdate || '',
  cropcode: record.cropcode || '',
  productcode: record.productcode || '',
  own: record.own || '',
  vehicle: record.vehicle || '',
  driver: record.driver || '',
  mill: record.mill || '',
  agreementcode: record.agreementcode || null,
  transporttype: record.transporttype || '',
  spb_type: record.spb_type || 0,
  bunch: Number(record.bunch) || 0,
  bucket: record.bucket ? Number(record.bucket) : null,
  pressemester_abw: Number(record.pressemester_abw) || 0,
  bunch_estateweight: Number(record.bunch_estateweight) || 0,
  fcentry: record.fcentry || null,
  fcedit: record.fcedit || null,
  fcip: record.fcip || null,
  fcba: record.fcba || '',
  chitno: record.chitno || '',
  mill_weight_bruto: Number(record.mill_weight_bruto) || 0,
  mill_weight_gross: Number(record.mill_weight_gross) || 0,
  mill_weight_tarra: Number(record.mill_weight_tarra) || 0,
  mill_weight_potongan: Number(record.mill_weight_potongan) || 0,
  mill_weight_netto: Number(record.mill_weight_netto) || 0,
  mentah: record.mentah || null,
  tankos: record.tankos || null,
  hilang: record.hilang || null,
  keterangan: record.keterangan || '',
  mill_weight_dtl: Number(record.mill_weight_dtl) || 0,
  bjr_chit: Number(record.bjr_chit) || 0,
});

export default function HarvestingUploadPage() {
  const localeTag = useLocale();
  const { isMgr, isAdmin, initCheck, userFcba } = useUploadPage();
  const { submit, submitting, submitProgress } = useBatchSubmit<HarvestingUploadData>();

  const [formParams, setFormParams] = useState<HarvestingUploadParams>(EMPTY_PARAMS);
  const [data, setData] = useState<HarvestingUploadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchData = async (overrideParams?: HarvestingUploadParams) => {
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const params = overrideParams ?? formParams;
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) queryParams.append(key, value);
      }

      const url = `/api/harvest/upload${queryParams.toString() ? `?${queryParams}` : ''}`;
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
      data.map((item, idx) => {
        // ⚡ Bolt Optimization: Pre-calculate search content to avoid O(N*M) string operations during search.
        const _searchContent = [
          item.nospb,
          item.vehicle,
          item.driver,
          item.mill,
          item.fcba,
          item.chitno,
          item.fieldcode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return {
          ...item,
          _rowKey: `${item.nospb}-${item.chitno}-${idx}`,
          _searchContent,
          // ⚡ Bolt Optimization: pre-calculate numeric values to avoid redundant regex parsing in loops
          _bunchNum: Number(item.bunch) || 0,
          _estateWeightNum: Number(item.bunch_estateweight) || 0,
          _millWeightBrutoNum: Number(item.mill_weight_bruto) || 0,
          _millWeightNettoNum: Number(item.mill_weight_netto) || 0,
        };
      }),
    [data]
  );

  const { filteredDataWithKey, summary } = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const result: (HarvestingUploadData & { _rowKey: string; _searchContent: string })[] = [];
    const stats = {
      count: 0,
      totalBunch: 0,
      totalEstateWeight: 0,
    };

    for (const item of dataWithKey) {
      if (!search || (item._searchContent && item._searchContent.includes(search))) {
        result.push(item as HarvestingUploadData & { _rowKey: string; _searchContent: string });

        // ⚡ Bolt Optimization: Use pre-calculated numbers to avoid thousands of O(N*M) parsing calls during search
        stats.count++;
        stats.totalBunch += item._bunchNum || 0;
        stats.totalEstateWeight += item._estateWeightNum || 0;
      }
    }

    return {
      filteredDataWithKey: result,
      summary: {
        ...stats,
        avgBunch: stats.count > 0 ? (stats.totalBunch / stats.count).toFixed(2) : 0,
      },
    };
  }, [dataWithKey, searchTerm]);

  const columns: TableColumn<HarvestingUploadData>[] = useMemo(
    () => [
      {
        name: '#',
        width: '50px',
        cell: (_row, idx) => <span>{idx + 1}</span>,
        ignoreRowClick: true,
      },
      { name: 'No SPB', selector: r => r.nospb || '-', sortable: true, width: '110px' },
      { name: 'Chit No', selector: r => r.chitno || '-', sortable: true, width: '120px' },
      { name: 'Field Code', selector: r => r.fieldcode || '-', sortable: true, width: '110px' },
      {
        name: 'Reception Date',
        sortable: true,
        width: '130px',
        selector: r => r.receptiondate || '',
        cell: r => formatPerfDate(r.receptiondate || '', localeTag) || '-',
      },
      {
        name: 'Harvest Date',
        sortable: true,
        width: '130px',
        selector: r => r.harvestdate || '',
        cell: r => formatPerfDate(r.harvestdate || '', localeTag) || '-',
      },
      { name: 'Vehicle', selector: r => r.vehicle || '-', sortable: true, width: '110px' },
      { name: 'Driver', selector: r => r.driver || '-', sortable: true, width: '110px' },
      { name: 'Mill', selector: r => r.mill || '-', sortable: true, width: '100px' },
      { name: 'Crop Code', selector: r => r.cropcode || '-', sortable: true, width: '110px' },
      { name: 'Product Code', selector: r => r.productcode || '-', sortable: true, width: '120px' },
      {
        name: 'Bunch',
        selector: r => r._bunchNum || 0,
        sortable: true,
        width: '100px',
        cell: r => formatPerfNumber(r._bunchNum || 0, localeTag),
      },
      {
        name: 'Estate Weight (kg)',
        selector: r => r._estateWeightNum || 0,
        sortable: true,
        width: '140px',
        cell: r => formatPerfNumber(r._estateWeightNum || 0, localeTag),
      },
      {
        name: 'Mill Weight Bruto',
        selector: r => r._millWeightBrutoNum || 0,
        sortable: true,
        width: '140px',
        cell: r => formatPerfNumber(r._millWeightBrutoNum || 0, localeTag),
      },
      {
        name: 'Mill Weight Netto',
        selector: r => r._millWeightNettoNum || 0,
        sortable: true,
        width: '140px',
        cell: r => formatPerfNumber(r._millWeightNettoNum || 0, localeTag),
      },
      { name: 'FCBA', selector: r => r.fcba || '-', sortable: true, width: '100px' },
      { name: 'Keterangan', selector: r => r.keterangan || '-', sortable: true, width: '150px' },
      { name: 'Last Update', selector: r => r.lastupdate || '-', sortable: true, width: '150px' },
    ],
    [localeTag]
  );

  const handleSubmitHarvesting = () => {
    if (data.length === 0) {
      setError('Tidak ada data untuk dikirim.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmHarvesting = async () => {
    setConfirmOpen(false);
    setError(null);
    const { successCount, failMessages, successList } = await submit(data, {
      createPayloadItem,
      endpoint: '/api/harvest/submit',
      itemLabel: item => `SPB ${item.nospb} (${item.chitno})`,
    });

    const totalRecords = data.length;
    if (successCount === totalRecords) {
      alert(
        `✓ Sukses! Semua ${successCount} data harvesting berhasil dikirim ke SIPS.\n\nTotal Bunch: ${summary.totalBunch}\nTotal Estate Weight: ${formatPerfNumber(summary.totalEstateWeight, localeTag)} kg`
      );
      setData([]);
    } else {
      let msg = `⚠️ Selesai dengan catatan.\nBerhasil: ${successCount}\nGagal: ${totalRecords - successCount}`;
      if (successList.length > 0) msg += `\n\nSuccessful SPBs:\n${successList.join(', ')}`;
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
            <h1 className="text-3xl font-bold text-base-content">Upload Harvesting SPB</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Tampilkan dan upload data panenan TBS dari external API
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
              { key: 'nospb', label: 'No SPB', type: 'text', placeholder: 'SPB2026004804' },
              { key: 'tanggal', label: '', type: 'date', placeholder: 'Tanggal Mulai' },
              { key: 'tanggal_end', label: '', type: 'date', placeholder: 'Tanggal Akhir' },
              { key: 'mill', label: 'Mill', type: 'text', placeholder: 'DOM, PPI, dll' },
              { key: 'kode_kendaraan', label: 'Kode Kendaraan', type: 'text', placeholder: 'L9770CL' },
              { key: 'kode_karyawan_driver', label: 'Driver', type: 'text', placeholder: 'Nama driver' },
              { key: 'chitno', label: 'Chit Number', type: 'text', placeholder: 'TBS2026004804' },
              { key: 'fcba', label: 'FCBA', type: 'text', placeholder: 'PTE, MTE, dll' },
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
            <span>Mengambil data harvesting dari server...</span>
          </div>
        )}
        {!loading && data.length === 0 && !error && (
          <div className="alert mb-4 shadow-sm bg-base-200 border border-base-300">
            <div>
              <p className="font-medium">Tidak ada data harvesting</p>
              <p className="text-sm opacity-75">
                Silakan gunakan filter untuk mencari data SPB panenan.
              </p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="text-sm text-base-content/60">Total SPB</div>
              <div className="text-2xl font-bold text-primary">{summary.count}</div>
            </div>
            <div className="bg-success/10 rounded-lg p-4 border border-success/20">
              <div className="text-sm text-base-content/60">Total Bunch</div>
              <div className="text-2xl font-bold text-success">
                {formatPerfNumber(summary.totalBunch, localeTag)}
              </div>
            </div>
            <div className="bg-info/10 rounded-lg p-4 border border-info/20">
              <div className="text-sm text-base-content/60">Avg Bunch/SPB</div>
              <div className="text-2xl font-bold text-info">
                {Number(summary.avgBunch).toFixed(1)}
              </div>
            </div>
            <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
              <div className="text-sm text-base-content/60">Total Estate Wt</div>
              <div className="text-2xl font-bold text-warning">
                {(summary.totalEstateWeight / 1000).toFixed(1)}T
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 items-center flex-wrap">
          <button
            onClick={handleSubmitHarvesting}
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
              placeholder="Cari No SPB, Vehicle, Driver, Mill..."
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
        message={`Yakin ingin mengirim ${data.length} record harvesting ke SIPS?\n\nTotal Bunch: ${summary.totalBunch}\nTotal Estate Weight: ${formatPerfNumber(summary.totalEstateWeight, localeTag)} kg`}
        onConfirm={handleConfirmHarvesting}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </UploadLayout>
  );
}


