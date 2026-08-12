'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import type { TableColumn } from 'react-data-table-component';
import { AccessDenied } from '@/app/components/feedback/access-denied';
import { useLocale } from '@/hooks/useLocale';
import { useUploadPage } from '@/hooks/useUploadPage';
import { useBatchSubmit } from '@/hooks/useBatchSubmit';
import { formatPerfDate, formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { Toolbar } from '@/app/components/ui/toolbar';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { SummaryCards } from '@/app/components/ui/summary-cards';
import { PageLayout } from '@/app/components/ui/page-layout';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { getTodayISO, getYesterdayISO } from '@/utils/helpers/datetime';
import AppTour, { type TourStep } from '@/app/components/feedback/app-tour';

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
  const t = useTranslations('HarvestUpload');
  const localeTag = useLocale();
  const { isAdmin, initCheck, userFcba } = useUploadPage();
  const { submit, submitting, submitProgress } = useBatchSubmit<HarvestingUploadData>();

  const tourSteps: TourStep[] = [
    { icon: '👋', title: t('tour1Title'), content: t('tour1Desc') },
    { icon: '🔍', title: t('tour2Title'), content: t('tour2Desc'), targetSelector: '[data-tour="action-buttons"]' },
    { icon: '🔎', title: t('tour3Title'), content: t('tour3Desc'), targetSelector: '[data-tour="quick-search"]' },
    { icon: '📋', title: t('tour4Title'), content: t('tour4Desc'), targetSelector: '[data-tour="filter-button"]' },
    { icon: '📄', title: t('tour5Title'), content: t('tour5Desc'), targetSelector: '[data-tour="data-table"]' },
  ];

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
    const initialParams = {
      ...EMPTY_PARAMS,
      fcba: isAdmin ? '' : userFcba,
      tanggal: getYesterdayISO(),
      tanggal_end: getTodayISO(),
    };
    setFormParams(initialParams);
    fetchData(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCheck]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await fetchData();
  };

  const handleResetFilter = () => {
    setFormParams({
      ...EMPTY_PARAMS,
      fcba: isAdmin ? '' : userFcba,
      tanggal: getYesterdayISO(),
      tanggal_end: getTodayISO(),
    });
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
      totalBunch: 0,
      totalEstateWeight: 0,
    };
    const distinctSpb = new Set<string>();

    for (const item of dataWithKey) {
      if (!search || (item._searchContent && item._searchContent.includes(search))) {
        result.push(item as HarvestingUploadData & { _rowKey: string; _searchContent: string });

        // ⚡ Bolt Optimization: Use pre-calculated numbers to avoid thousands of O(N*M) parsing calls during search
        stats.totalBunch += item._bunchNum || 0;
        stats.totalEstateWeight += item._estateWeightNum || 0;

        const key = (item.nospb || '').trim();
        if (key) distinctSpb.add(key);
      }
    }

    const spbCount = distinctSpb.size;
    return {
      filteredDataWithKey: result,
      summary: {
        totalRows: result.length,
        count: spbCount,
        totalBunch: stats.totalBunch,
        totalEstateWeight: stats.totalEstateWeight,
        avgBunch: spbCount > 0 ? (stats.totalBunch / spbCount).toFixed(2) : 0,
      },
    };
  }, [dataWithKey, searchTerm]);

  const columns: TableColumn<HarvestingUploadData>[] = useMemo(
    () => [
      {
        name: <span className="whitespace-nowrap">{t('colNo')}</span>,
        minWidth: '50px',
        noWrap: true,
        cell: (_row, idx) => <span>{idx + 1}</span>,
        ignoreRowClick: true,
      },
      { name: <span className="whitespace-nowrap">{t('colNoSpb')}</span>, selector: r => r.nospb || '-', sortable: true, minWidth: '170px', noWrap: true },
      { name: <span className="whitespace-nowrap">{t('colChitno')}</span>, selector: r => r.chitno || '-', sortable: true, minWidth: '170px', noWrap: true },
      { name: <span className="whitespace-nowrap">{t('colFieldCode')}</span>, selector: r => r.fieldcode || '-', sortable: true, minWidth: '110px', noWrap: true },
      {
        name: <span className="whitespace-nowrap">{t('colReceptionDate')}</span>,
        sortable: true,
        minWidth: '140px',
        noWrap: true,
        selector: r => r.receptiondate || '',
        cell: r => formatPerfDate(r.receptiondate || '', localeTag) || '-',
      },
      {
        name: <span className="whitespace-nowrap">{t('colHarvestDate')}</span>,
        sortable: true,
        minWidth: '140px',
        noWrap: true,
        selector: r => r.harvestdate || '',
        cell: r => formatPerfDate(r.harvestdate || '', localeTag) || '-',
      },
      { name: t('colVehicle'), selector: r => r.vehicle || '-', sortable: true, minWidth: '130px', noWrap: true },
      { name: t('colDriver'), selector: r => r.driver || '-', sortable: true, minWidth: '180px', noWrap: true },
      { name: t('colMill'), selector: r => r.mill || '-', sortable: true, minWidth: '100px', noWrap: true },
      { name: <span className="whitespace-nowrap">{t('colCropCode')}</span>, selector: r => r.cropcode || '-', sortable: true, minWidth: '110px', noWrap: true },
      { name: <span className="whitespace-nowrap">{t('colProductCode')}</span>, selector: r => r.productcode || '-', sortable: true, minWidth: '120px', noWrap: true },
      {
        name: t('colBunch'),
        selector: r => r._bunchNum || 0,
        sortable: true,
        minWidth: '110px',
        noWrap: true,
        cell: r => formatPerfNumber(r._bunchNum || 0, localeTag),
      },
      {
        name: <span className="whitespace-nowrap">{t('colEstateWt')}</span>,
        selector: r => r._estateWeightNum || 0,
        sortable: true,
        minWidth: '150px',
        noWrap: true,
        cell: r => formatPerfNumber(r._estateWeightNum || 0, localeTag),
      },
      {
        name: <span className="whitespace-nowrap">{t('colMillWtBruto')}</span>,
        selector: r => r._millWeightBrutoNum || 0,
        sortable: true,
        minWidth: '150px',
        noWrap: true,
        cell: r => formatPerfNumber(r._millWeightBrutoNum || 0, localeTag),
      },
      {
        name: <span className="whitespace-nowrap">{t('colMillWtNetto')}</span>,
        selector: r => r._millWeightNettoNum || 0,
        sortable: true,
        minWidth: '150px',
        noWrap: true,
        cell: r => formatPerfNumber(r._millWeightNettoNum || 0, localeTag),
      },
      { name: t('colFcba'), selector: r => r.fcba || '-', sortable: true, minWidth: '110px', noWrap: true },
      { name: t('colKeterangan'), selector: r => r.keterangan || '-', sortable: true, minWidth: '220px', noWrap: true },
      { name: <span className="whitespace-nowrap">{t('colLastUpdate')}</span>, selector: r => r.lastupdate || '-', sortable: true, minWidth: '180px', noWrap: true },
    ],
    [localeTag, t]
  );

  const handleSubmitHarvesting = () => {
    if (data.length === 0) {
      setError(t('noDataToSubmit'));
      return;
    }
    setConfirmOpen(true);
  };

  const handleExport = () => {
    if (filteredDataWithKey.length === 0) return;
    const exportData = filteredDataWithKey.map(row => ({
      'No SPB': row.nospb || '',
      'Chit No': row.chitno || '',
      'Field Code': row.fieldcode || '',
      'Reception Date': row.receptiondate || '',
      'Harvest Date': row.harvestdate || '',
      'Vehicle': row.vehicle || '',
      'Driver': row.driver || '',
      'Mill': row.mill || '',
      'Crop Code': row.cropcode || '',
      'Product Code': row.productcode || '',
      'Bunch': row._bunchNum || 0,
      'Estate Weight (kg)': row._estateWeightNum || 0,
      'Mill Weight Bruto': row._millWeightBrutoNum || 0,
      'Mill Weight Netto': row._millWeightNettoNum || 0,
      'FCBA': row.fcba || '',
      'Keterangan': row.keterangan || '',
      'Last Update': row.lastupdate || '',
    }));
    exportJsonToCsv(exportData, `Harvesting_Upload_${new Date().toISOString().slice(0, 10)}.csv`);
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
        `${t('submitSuccess', { count: successCount })}\n\nTotal Bunch: ${summary.totalBunch}\nTotal Estate Weight: ${formatPerfNumber(summary.totalEstateWeight, localeTag)} kg`
      );
      setData([]);
    } else {
      let msg = t('submitPartial', { success: String(successCount), fail: String(totalRecords - successCount) });
      if (successList.length > 0) msg += `\n\nSuccessful SPBs:\n${successList.join(', ')}`;
      if (failMessages.length > 0) {
        msg += `\n\nFailed:\n${failMessages.slice(0, 10).join('\n')}`;
        if (failMessages.length > 10) msg += `\n...dan ${failMessages.length - 10} lainnya`;
      }
      alert(msg);
      if (successCount > 0) await fetchData();
    }
  };

  if (initCheck && !isAdmin) return <AccessDenied />;
  if (!initCheck) return <PageLayout />;

  return (
    <PageLayout>
      <Toolbar
        title={t('title')}
        titleTooltip={t('titleTooltip')}
        actions={[
          {
            key: 'filter',
            label: showFilters ? t('hideFilters') : t('showFilters'),
            icon: 'filter',
            onClick: () => setShowFilters(s => !s),
            tour: 'filter-button',
          },
          {
            key: 'refresh',
            label: t('refresh'),
            icon: 'refresh',
            onClick: () => fetchData(),
            loading: loading,
          },
          {
            key: 'export',
            label: t('export'),
            icon: 'export',
            onClick: handleExport,
            disabled: filteredDataWithKey.length === 0,
          },
          {
            key: 'submit',
            label: submitting ? submitProgress || t('submitting') : t('submit'),
            icon: 'upload',
            onClick: handleSubmitHarvesting,
            disabled: data.length === 0,
            loading: submitting,
            variant: 'primary',
            tour: 'submit-button',
          },
        ]}
      >
        <AppTour steps={tourSteps} btnClassName="join-item flex-1 sm:flex-none" />
      </Toolbar>

      {/* Search + Summary */}
      {data.length > 0 && (
        <div className="mb-3 flex flex-col md:flex-row md:items-center gap-4 animate-slideUp [animation-delay:100ms]">
          <SummaryCards
            cards={[
              { label: t('totalSpb'), value: String(summary.count), className: 'text-primary' },
              {
                label: t('totalBunch'),
                value: formatPerfNumber(summary.totalBunch, localeTag),
                className: 'text-success',
              },
              {
                label: t('avgBunch'),
                value: Number(summary.avgBunch).toFixed(1),
                className: 'text-info',
              },
              {
                label: t('totalEstateWt'),
                value: `${(summary.totalEstateWeight / 1000).toFixed(1)}T`,
                className: 'text-warning',
              },
            ]}
          />
          <div className="flex items-center gap-2 md:ml-auto">
            <QuickSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t('searchPlaceholder')}
              className="w-full sm:w-72 sm:shrink-0"
            />
          </div>
        </div>
      )}

      {/* Filter Section */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'tanggal', label: '', type: 'date', placeholder: t('fTanggalMulai') },
              { key: 'tanggal_end', label: '', type: 'date', placeholder: t('fTanggalAkhir') },
              { key: 'nospb', label: t('fNoSpb'), type: 'text', placeholder: t('fNoSpb') },
              { key: 'chitno', label: t('fChitno'), type: 'text', placeholder: t('fChitno') },
              { key: 'fcba', label: t('fFcba'), type: 'text', placeholder: t('fFcba'), disabled: !isAdmin },
              { key: 'mill', label: t('fMill'), type: 'text', placeholder: t('fMill') },
              { key: 'kode_kendaraan', label: t('fKendaraan'), type: 'text', placeholder: t('fKendaraan') },
              { key: 'kode_karyawan_driver', label: t('fDriver'), type: 'text', placeholder: t('fDriver') },
            ]}
            values={formParams as Record<string, string>}
            onChange={(key, value) => setFormParams(prev => ({ ...prev, [key]: value }))}
            onApply={() => handleSearch()}
            onReset={handleResetFilter}
            loading={loading}
            t={key =>
              key === 'filterApply'
                ? t('filterApply')
                : key === 'filterReset'
                  ? t('filterReset')
                  : t('loading')
            }
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
            <span>{t('loadingFetch')}</span>
          </div>
        )}
        {!loading && data.length === 0 && !error && (
          <div className="alert mb-4 shadow-sm bg-base-200 border border-base-300">
            <div>
              <p className="font-medium">{t('emptyTitle')}</p>
              <p className="text-sm opacity-75">
                {t('emptyHint')}
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
            namespace="Harvest"
            paginationPerPage={100}
            paginationRowsPerPageOptions={[100, 500, 1000, 5000]}
            noDataComponent={<div className="py-8 text-base-content/70">{t('noData')}</div>}
          />
        )}
      <ConfirmModal
        open={confirmOpen}
        title={t('confirmTitle')}
        message={`${t('confirmMessage', { count: data.length })}\n\nTotal Bunch: ${summary.totalBunch}\nTotal Estate Weight: ${formatPerfNumber(summary.totalEstateWeight, localeTag)} kg`}
        confirmText={t('confirmOk')}
        cancelText={t('cancel')}
        onConfirm={handleConfirmHarvesting}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </PageLayout>
  );
}


