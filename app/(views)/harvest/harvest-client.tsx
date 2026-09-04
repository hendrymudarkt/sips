'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import toast from 'react-hot-toast';
import type { TableColumn } from 'react-data-table-component';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import { SkeletonTable } from '@/app/components/ui/skeletons';
import { Icon } from '@/app/components/ui/icons';
import { SearchSelect } from '@/app/components/ui/search-select';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { Toolbar } from '@/app/components/ui/toolbar';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { DeleteModal } from '@/app/components/feedback/delete-modal';
import { PhotoCell } from '@/app/components/ui/photo-cell';
import { EmployeeNameCell } from '@/app/components/ui/employee-name-cell';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FormModal } from '@/app/components/ui/form-modal';
import { SectionHeader } from '@/app/components/ui/section-header';
import { SummaryCards } from '@/app/components/ui/summary-cards';
import { PageLayout } from '@/app/components/ui/page-layout';

const HarvestGalleryView = dynamic(
  () => import('@/app/components/features/harvest-gallery-view').then(mod => mod.HarvestGalleryView),
  {
    loading: () => <div className="p-8"><span className="loading loading-spinner loading-lg" /></div>,
    ssr: false,
  }
);
const HarvestJsonUploadModal = dynamic(() => import('@/app/components/features/harvest-json-upload-modal'), {
  loading: () => null,
  ssr: false,
});
import { useLocale } from '@/hooks/useLocale';
import { useHarvestData } from '@/hooks/useHarvestData';
import { QueryKeys } from '@/utils/queryKeys';
import type { Harvest } from '@/types/domain';
import { buildMapUrl } from '@/utils/services/mapHelper';
import { formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { formatDateDMY, getTodayISO } from '@/utils/helpers/datetime';

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTotal = (value: number, localeTag = 'id-ID'): string =>
  formatPerfNumber(value, localeTag, { maximumFractionDigits: 2 });

const LocationButton: React.FC<{
  loc?: string | null;
  tanggal?: string;
  nodokumen?: string;
}> = ({ loc, tanggal, nodokumen }) => {
  if (!loc) return <span className="text-gray-400">-</span>;
  const googleUrl = buildMapUrl(loc);

  const geoSipsUrl = `/cek-doket?${new URLSearchParams({ dateFrom: formatDateISO(new Date(tanggal || '')) || '', dateTo: formatDateISO(new Date(tanggal || '')) || '', nodokumen: nodokumen || '' }).toString()}`;

  return (
    <div className="flex gap-1">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-xs gap-1"
        title={`Google Maps: ${loc}`}
      >
        <span aria-hidden>📍</span> {'GMaps'}
      </a>
      <a
        href={geoSipsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-xs gap-1 text-info"
        title="Buka di Geo Sips"
      >
        <span aria-hidden>🌐</span> Geo
      </a>
    </div>
  );
};

const formatDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function HarvestPage() {
  const localeTag = useLocale();
  const tH = useTranslations('Harvest');
  const {
    q, setQ,
    showFilters, setShowFilters,
    viewMode, setViewMode, allExpanded, setAllExpanded, galleryRef,
    filters, setFilters, setAppliedFilters,
    filtered, loading, isFetching, harvestTotals,
    isLoadingBU,
    isLoadingEmp,
    isLoadingFieldcode,
    isLoadingTph,
    isLoadingEmpByGang,
    fcbaOptions, sectionOptions, kemandoranOptions,
    fieldcodeOptions, tphOptions,
    employeeOptions, tphDetailMap,
    userLevel, canModify,
    isFcbaLocked, isAfdelingLocked, isKemandoranLocked,
    userFcbaCookie, userAfdelingCookie,
    homeFcba, homeSection,
    mutation, deleteMutation, queryClient,
    open, setOpen,
    isEditing, detailLoading,
    deleteOpen,
    form, setForm,
    preview, setPreview,
    imgRef, pdfRef,
    selFcba,
    selSection,
    locLoading,
    isFetchingDocumentNo,
    getScopedFilters,
    onAddClick,
    handleSubmit, handleDelete,
    closeDeleteModal, handleConfirmDelete,
    onChangeFcba, onChangeSection, onChangeFieldcode,
    onChangeGang, onChangeEmployee,
    handleGetLocation, fetchDetail,
    handleExport,
  } = useHarvestData();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const canUpload = userLevel === 'ADM';

  const tourSteps: TourStep[] = useMemo(() => [
    {
      icon: '👋',
      title: tH('tourWelcomeTitle'),
      content: tH('tourWelcomeDesc'),
    },
    {
      icon: '🔍',
      title: tH('tourActionsTitle'),
      content: tH('tourActionsDesc'),
      targetSelector: '[data-tour="action-buttons"]',
    },
    {
      icon: '🔎',
      title: tH('tourSearchTitle'),
      content: tH('tourSearchDesc'),
      targetSelector: '[data-tour="quick-search"]',
    },
    {
      icon: '📋',
      title: tH('tourFilterTitle'),
      content: tH('tourFilterDesc'),
      targetSelector: '[data-tour="filter-button"]',
      modalPosition: 'bottom',
    },
    {
      icon: '📄',
      title: tH('tourTableTitle'),
      content: tH('tourTableDesc'),
      targetSelector: '[data-tour="data-table"]',
      modalPosition: 'top',
    },
    {
      icon: '➕',
      title: tH('tourFormTitle'),
      content: tH('tourFormDesc'),
      targetSelector: '[data-tour="add-button"]',
      modalPosition: 'top-left',
    },
  ], [tH]);

  const columns: TableColumn<Harvest>[] = useMemo(
    () => [
      {
        name: <span title={tH('colAksiTooltip')}>{tH('colAksi')}</span>,
        width: '120px',
        cell: (row: Harvest) => {
          const status = (row.status_harvesting || '').toLowerCase();
          const isPlanned = status === 'planned';
          const canEditRole = canModify;
          const canEdit = canEditRole && isPlanned;
          const canDelete =
            (userLevel === 'ADM' || userLevel === 'KSI') && status !== 'approved' && status !== '';

          return (
            <div className="space-x-1 whitespace-nowrap overflow-visible">
              {canEditRole && (
                <button
                  className={`btn btn-xs ${canEdit ? 'btn-outline' : 'btn-disabled'}`}
                  onClick={() => canEdit && fetchDetail(row.id)}
                  disabled={!canEdit}
                  title={canEdit ? 'Edit' : 'Hanya bisa edit saat Planned'}
                >
                  Edit
                </button>
              )}

              {canDelete && (
                <button
                  className="btn btn-xs btn-error"
                  onClick={() => handleDelete(row.id)}
                  title="Hapus (hanya ADM & belum Approved)"
                >
                  Hapus
                </button>
              )}
            </div>
          );
        },
        ignoreRowClick: true,
      },
      {
        name: <span title={tH('colStatusTooltip')}>{tH('colStatus')}</span>,
        selector: r => r.status_harvesting ?? '-',
        sortable: true,
        width: '120px',
        cell: r => <StatusBadge status={r.status_harvesting} />,
      },
      {
        name: tH('colNo'),
        width: '56px',
        cell: (_r, i) => <span>{i + 1}</span>,
        ignoreRowClick: true,
      },
      {
        name: tH('colNoDokumen'),
        selector: row => row.nodokumen,
        sortable: true,
        width: '250px',
      },
      {
        name: tH('colTanggal'),
        selector: row => row.tanggal,
        format: row => {
          const d = formatDateDMY(row.tanggal);
          const time = (row.tanggal || '').includes(' ')
            ? (row.tanggal.split(' ')[1] || '').slice(0, 8)
            : '';
          return time ? `${d} ${time}` : d;
        },
        sortable: true,
        width: '150px',
      },
      {
        name: tH('colKaryawan'),
        selector: row => row.nama_karyawan || row.kode_karyawan,
        sortable: true,
        width: '200px',
        cell: row => <EmployeeNameCell name={row.nama_karyawan} code={row.kode_karyawan} />,
      },
      {
        name: tH('colKemandoran'),
        selector: row => row.kemandoran || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: tH('colFcba'),
        selector: row => row.fcba,
        sortable: true,
        width: '80px',
      },
      {
        name: tH('colAfd'),
        selector: row => row.afdeling,
        sortable: true,
        width: '80px',
      },
      {
        name: tH('colTph'),
        selector: row => row.tph,
        sortable: true,
        width: '80px',
      },
      {
        name: tH('colField'),
        selector: row => row.fieldcode,
        sortable: true,
        width: '80px',
      },
      {
        name: tH('colOutput'),
        selector: row => row._outputNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._outputNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colMentah'),
        selector: row => row._mentahNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._mentahNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colOver'),
        selector: row => row._overNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._overNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colBusuk'),
        selector: row => row._busukNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._busukNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colBusuk2'),
        selector: row => row._busuk2Num ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._busuk2Num || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colBuahKecil'),
        selector: row => row._kecilNum ?? 0,
        sortable: true,
        width: '110px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._kecilNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colParteNo'),
        selector: row => row._partenoNum ?? 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._partenoNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colParteNo50'),
        selector: row => row._parteno50Num ?? 0,
        sortable: true,
        width: '130px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._parteno50Num || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colBrondol'),
        selector: row => row._brondolNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._brondolNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: tH('colAlBrondol'),
        selector: row => toNumber(row.alasbrondol),
        sortable: true,
        width: '110px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(toNumber(row.alasbrondol), localeTag)}
          </span>
        ),
      },
      {
        name: tH('colTPanjang'),
        selector: row => row._panjangNum ?? 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'end' },
        cell: row => (
          <span className="text-right w-full">
            {formatPerfNumber(row._panjangNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span>{tH('colTinggal')}</span>,
        selector: r => r._tinggalNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: r => (
          <span className="text-right w-full">
            {formatPerfNumber(r._tinggalNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span>{tH('colOutputAngkut')}</span>,
        selector: r => r._outputPgknNum ?? 0,
        sortable: true,
        width: '110px',
        style: { justifyContent: 'end' },
        cell: r => (
          <span className="text-right w-full">
            {formatPerfNumber(r._outputPgknNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span>{tH('colSisa')}</span>,
        selector: r => r._sisaPgknNum ?? 0,
        sortable: true,
        width: '90px',
        style: { justifyContent: 'end' },
        cell: r => (
          <span className="text-right w-full">
            {formatPerfNumber(r._sisaPgknNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span>{tH('colStatusAngkut')}</span>,
        selector: r => r.info_status_pengangkutan || '-',
        sortable: true,
        width: '200px',
        cell: r => (
          <StatusBadge
            status={r.status_pengangkutan}
            label={r.info_status_pengangkutan || '-'}
            mapping={{ terangkut: 'success', belum: 'error', selisih: 'warning' }}
          />
        ),
      },
      {
        name: (
          <span title={tH('colLokasiTooltip')} className="text-center">
            {tH('colLokasi')}
          </span>
        ),
        selector: row => row.location || '',
        width: '140px',
        cell: row => (
          <LocationButton loc={row.location} tanggal={row.tanggal} nodokumen={row.nodokumen} />
        ),
      },
      {
        name: <span title={tH('colExceptionCaseTooltip')}>{tH('colExceptionCase')}</span>,
        selector: row => row.exception_case || '-',
        sortable: true,
        style: { flexGrow: 1.1 as number, minWidth: '160px' },
      },
      {
        name: <span title={tH('colLampiranTooltip')}>{tH('colLampiran')}</span>,
        selector: row => row.no_ba_exca || '-',
        sortable: true,
        width: '120px',
        cell: row =>
          row.no_ba_exca ? (
            <a
              href={row.no_ba_exca}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
              title={tH('openAttachment')}
            >
              <Icon name="document-attach" className="h-6 w-6 text-primary hover:text-primary-focus transition-colors" />
            </a>
          ) : (
            '-'
          ),
      },
      {
        name: <span title={tH('colFotoTooltip')}>{tH('colFoto')}</span>,
        width: '90px',
        cell: (r: Harvest) =>
          r.images ? (
            <PhotoCell imageUrl={r.images} alt="foto" href={r.images} size={40} />
          ) : (
            '-'
          ),
        ignoreRowClick: true,
      },
    ],
    [canModify, fetchDetail, handleDelete, userLevel, localeTag, tH]
  );

  const totalCards = [
    {
      label: tH('totalJanjang'),
      value: harvestTotals.output,
      className: 'text-primary',
    },
    {
      label: tH('totalTinggal'),
      value: harvestTotals.tinggal,
      className: 'text-accent',
    },
    {
      label: tH('totalTerangkut'),
      value: harvestTotals.output_pgkn,
      className: 'text-info',
    },
    {
      label: tH('totalSisa'),
      value: harvestTotals.sisa_pgkn,
      className: 'text-warning',
    },
    {
      label: tH('totalBrondolan'),
      value: harvestTotals.brondol,
      className: 'text-success',
    },
  ];

  return (
    <PageLayout>
        <Toolbar
          title={tH('pageTitle')}
          titleTooltip={tH('pageTitleTooltip')}
          actions={[
            {
              key: 'filter',
              label: showFilters ? tH('hideFilters') : tH('showFilters'),
              icon: 'filter',
              onClick: () => setShowFilters(s => !s),
              tour: 'filter-button',
            },
            {
              key: 'refresh',
              label: tH('refresh'),
              icon: 'refresh',
              onClick: () => queryClient.invalidateQueries({ queryKey: QueryKeys.HARVEST() }),
              loading: isFetching,
            },
            {
              key: 'export',
              label: tH('export'),
              icon: 'export',
              onClick: handleExport,
            },
            ...(canUpload ? [{
              key: 'upload-json',
              label: 'Upload JSON',
              icon: 'upload',
              onClick: () => setUploadModalOpen(true),
              variant: 'outline' as const,
            }] : []),
            ...(canModify ? [{
              key: 'add',
              label: tH('addHarvest'),
              icon: 'plus',
              onClick: onAddClick,
              variant: 'primary' as const,
              tour: 'add-button',
            }] : []),
          ]}
        >
          <AppTour steps={tourSteps} btnClassName="join-item flex-1 sm:flex-none" />
        </Toolbar>

        {/* TOTAL CARDS + SEARCH & VIEW TOGGLE */}
        <div className="mb-3 flex flex-col md:flex-row md:items-center gap-4 animate-slideUp [animation-delay:100ms]">
          {/* TOTAL CARDS */}
          <SummaryCards cards={totalCards.map(c => ({ ...c, value: formatTotal(c.value, localeTag) }))} />

          {/* SEARCH & VIEW TOGGLE */}
          <div className="flex items-center gap-2 md:ml-auto">
          <QuickSearch value={q} onChange={setQ} placeholder={tH('searchPlaceholder')} className="w-full sm:w-72 sm:shrink-0" />
          <div className="join flex-none">
            <button
              className="btn btn-outline join-item"
              onClick={() => setViewMode(v => v === 'table' ? 'gallery' : 'table')}
              title={viewMode === 'table' ? 'Gallery View' : 'Table View'}
            >
              <Icon name={viewMode === 'table' ? 'layout-grid' : 'list'} className="h-4 w-4" />
              <span className="hidden sm:inline">{viewMode === 'table' ? 'Gallery' : 'Table'}</span>
            </button>
            {viewMode === 'gallery' && (
              <button
                className="btn btn-outline join-item"
                onClick={() => {
                  if (allExpanded) {
                    galleryRef.current?.collapseAll();
                  } else {
                    galleryRef.current?.expandAll();
                  }
                  setAllExpanded(!allExpanded);
                }}
                title={allExpanded ? 'Close All' : 'Open All'}
              >
                <Icon name="chevron-down" className={`h-4 w-4 ${allExpanded ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">{allExpanded ? 'Close' : 'Open'}</span>
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'tanggal', label: '', type: 'date' },
              { key: 'tanggal_end', label: '', type: 'date' },
              { key: 'nodokumen', label: tH('filterNoDokumen'), type: 'text', placeholder: tH('filterNoDokumen') },
              { key: 'kode_karyawan', label: tH('filterKodeKaryawan'), type: 'text', placeholder: tH('filterKodeKaryawan') },
              { key: 'kemandoran', label: tH('filterKemandoran'), type: 'text', placeholder: tH('filterKemandoran'), disabled: isKemandoranLocked },
              { key: 'fcba', label: tH('filterFcba'), type: 'text', placeholder: tH('filterFcba'), disabled: isFcbaLocked },
              { key: 'afdeling', label: tH('filterAfdeling'), type: 'text', placeholder: tH('filterAfdeling'), disabled: isAfdelingLocked },
              { key: 'tph', label: tH('filterTph'), type: 'text', placeholder: tH('filterTph') },
              { key: 'fieldcode', label: tH('filterFieldcode'), type: 'text', placeholder: tH('filterFieldcode') },
              { key: 'status_pengangkutan', label: tH('filterStatusAngkut'), type: 'select',
                options: [
                  { value: '', label: tH('filterAll') },
                  { value: 'BELUM', label: 'BELUM' },
                  { value: 'TERANGKUT', label: 'TERANGKUT' },
                  { value: 'SELISIH', label: 'SELISIH' },
                ]
              },
            ]}
            values={filters}
            onChange={(key, value) => setFilters(s => ({ ...s, [key]: value }))}
            onApply={() => setAppliedFilters({ ...filters })}
            onReset={() => {
              const resetFilters = {
                tanggal: '', tanggal_end: '', nodokumen: '', kode_karyawan: '',
                kemandoran: '', fcba: '', afdeling: '', tph: '', fieldcode: '',
                status_pengangkutan: '',
              };
              const scoped = getScopedFilters(resetFilters);
              setFilters(scoped);
              setAppliedFilters(scoped);
            }}
            loading={loading}
            t={tH}
          />
        )}

        {/* Table / Gallery View */}
        {viewMode === 'table' ? (
          <AppDataTable
            columns={columns}
            data={filtered}
            loading={loading}
            pointerOnHover
            namespace="Harvest"
            onClearSearch={q ? () => setQ('') : undefined}
          />
        ) : (
          <div className="animate-slideUp [animation-delay:200ms]">
            {loading ? (
              <div className="p-8">
                <SkeletonTable rows={10} />
              </div>
            ) : (
              <HarvestGalleryView
                ref={galleryRef}
                items={filtered}
                onClearSearch={q ? () => setQ('') : undefined}
              />
            )}
          </div>
        )}

      <FormModal
        open={open}
        title={isEditing ? tH('modalEditTitle') : tH('modalAddTitle')}
        onClose={() => { setOpen(false); setPreview(''); }}
        onSubmit={handleSubmit}
        loading={mutation.isPending}
        size="lg"
      >
        {detailLoading ? (
          <div className="col-span-12 py-8 text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-2">{tH('modalLoadingDetail')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 col-span-12 gap-2">
                <SectionHeader title={tH('formInfoTitle')} />

                {/* === Row 1: Tanggal + Location chain === */}

                {/* Tanggal */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formTanggal')}</legend>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={form.tanggal}
                    max={`${getTodayISO()}T23:59`}
                    onChange={e => setForm(s => ({ ...s, tanggal: e.target.value }))}
                    readOnly={isEditing && !canUpload}
                    disabled={isEditing && !canUpload}
                    required
                  />
                </fieldset>

                {/* Kode Karyawan - dari API absensi */}
                <fieldset className="fieldset col-span-12 md:col-span-6">
                  <legend className="fieldset-legend">{tH('formKaryawan')}</legend>
                  <SearchSelect
                    options={employeeOptions}
                    value={form.kode_karyawan ?? ''}
                    onChange={onChangeEmployee}
                    placeholder={
                      !form.tanggal
                        ? 'Isi Tanggal dulu'
                        : isLoadingEmpByGang
                          ? 'Memuat Karyawan...'
                          : employeeOptions.length === 0
                            ? 'Tidak ada Karyawan'
                            : 'Pilih Karyawan'
                    }
                    disabled={!form.tanggal || isLoadingEmpByGang}
                    required
                    translationNamespace="Harvest"
                  />
                </fieldset>

                {/* Kemandoran - hanya gang dengan prefix MD */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formKemandoran')}</legend>
                  <SearchSelect
                    options={kemandoranOptions}
                    value={form.kemandoran ?? ''}
                    onChange={onChangeGang}
                    placeholder={
                      isLoadingEmp
                        ? 'Memuat...'
                        : selSection
                          ? kemandoranOptions.length === 0
                            ? 'Tidak ada Kemandoran MD'
                            : 'Pilih Kemandoran'
                          : 'Pilih Afdeling dulu'
                    }
                    disabled={!selSection || isLoadingEmp || !!form.kode_karyawan}
                    translationNamespace="Harvest"
                  />
                </fieldset>

                {/* FCBA: ADM/MGR/KSI bisa pilih, lainnya dikunci ke user_Fcba cookie */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">
                    {userLevel === 'ADM' ? tH('formFcba') : tH('formFcbaAccount')}
                  </legend>
                  {userLevel === 'ADM' ? (
                    <SearchSelect
                      options={fcbaOptions}
                      value={selFcba}
                      onChange={onChangeFcba}
                      placeholder={isLoadingBU ? 'Memuat FCBA...' : 'Pilih FCBA'}
                      disabled={isLoadingBU || !!form.kode_karyawan}
                      required
                      translationNamespace="Harvest"
                    />
                  ) : (
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={userFcbaCookie || homeFcba || ''}
                      readOnly
                      disabled
                    />
                  )}
                </fieldset>

                {/* Afdeling: ADM/MGR/KSI bisa pilih, lainnya dikunci ke user_Afdeling cookie */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">
                    {userLevel === 'ADM' || userLevel === 'MGR' || userLevel === 'KSI'
                      ? tH('formAfdeling')
                      : tH('formAfdelingAccount')}
                  </legend>
                  {userLevel === 'ADM' || userLevel === 'MGR' || userLevel === 'KSI' ? (
                    <SearchSelect
                      options={sectionOptions}
                      value={selSection ?? ''}
                      onChange={onChangeSection}
                      placeholder={
                        isLoadingEmp ? 'Memuat...' : selFcba ? 'Pilih Afdeling' : 'Pilih FCBA dulu'
                      }
                      disabled={!selFcba || isLoadingEmp || !!form.kode_karyawan}
                      required
                      translationNamespace="Harvest"
                    />
                  ) : (
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={userAfdelingCookie || homeSection || ''}
                      readOnly
                      disabled
                    />
                  )}
                </fieldset>

                {/* Field Code - dari API TPH (fcba + afdeling) */}
                <fieldset className="fieldset col-span-12 md:col-span-2">
                  <legend className="fieldset-legend">{tH('formFieldCode')}</legend>
                  {isLoadingFieldcode ? (
                    <div className="skeleton h-10 w-full rounded-md animate-pulse bg-base-300" />
                  ) : (
                    <SearchSelect
                      options={fieldcodeOptions}
                      value={form.fieldcode ?? ''}
                      onChange={onChangeFieldcode}
                      placeholder={
                        selFcba && selSection
                          ? fieldcodeOptions.length === 0
                            ? 'Tidak ada Field Code'
                            : 'Pilih Field Code'
                          : 'Pilih FCBA dan Afdeling dulu'
                      }
                      disabled={!selFcba || !selSection}
                      required
                      translationNamespace="Harvest"
                    />
                  )}
                </fieldset>

                {/* === Row 2: TPH + Personnel === */}

                {/* TPH - dari TPH API (fcba + afdeling + fieldcode) */}
                <fieldset className="fieldset col-span-12 md:col-span-2">
                  <legend className="fieldset-legend">{tH('formTph')}</legend>
                  {isLoadingTph ? (
                    <div className="skeleton h-10 w-full rounded-md animate-pulse bg-base-300" />
                  ) : (
                    <SearchSelect
                      options={tphOptions}
                      value={form.tph ?? ''}
                      onChange={v => {
                        const tphItem = tphDetailMap.get(v);
                        setForm(s => ({ ...s, tph: v, noancak: tphItem?.ancakno || '' }));
                      }}
                      placeholder={
                        form.fieldcode
                          ? tphOptions.length === 0
                            ? 'Tidak ada TPH'
                            : 'Pilih TPH'
                          : 'Pilih Field Code dulu'
                      }
                      disabled={!form.fieldcode}
                      required
                      translationNamespace="Harvest"
                    />
                  )}
                </fieldset>

                {/* No Ancak - otomatis dari TPH yang dipilih */}
                <fieldset className="fieldset col-span-12 md:col-span-2">
                  <legend className="fieldset-legend">{tH('formNoAncak')}</legend>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={form.noancak ?? ''}
                    readOnly
                    disabled
                    placeholder="Otomatis dari TPH"
                  />
                </fieldset>

                {/* === Row 3: Dokumen (full width) === */}

                {/* No Dokumen */}
                <fieldset className="fieldset col-span-12">
                  <legend className="fieldset-legend">{tH('formNoDokumen')}</legend>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={form.nodokumen}
                    readOnly
                    placeholder={
                      isFetchingDocumentNo && !isEditing
                        ? 'Menghitung otomatis...'
                        : 'Otomatis setelah FCBA, afdeling, field, kemandoran, karyawan terisi'
                    }
                    required
                  />
                  <p className="text-xs opacity-70">
                    Format: FCBA/Afdeling/Field-Ancak/DDMMYY/Running bulanan per kemandoran.
                  </p>
                </fieldset>

                <SectionHeader title={tH('formResultsTitle')} />

                {/* --- Hasil Panen --- */}

                {/* Output */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formOutput')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.output}
                    onChange={e => setForm(s => ({ ...s, output: e.target.value }))}
                    required
                    min="0"
                  />
                </fieldset>

                {/* Mentah */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formMentah')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.mentah}
                    onChange={e => setForm(s => ({ ...s, mentah: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Overripe */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formOverripe')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.overripe}
                    onChange={e => setForm(s => ({ ...s, overripe: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Busuk */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formBusuk')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.busuk}
                    onChange={e => setForm(s => ({ ...s, busuk: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Busuk 2 */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formBusuk2')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.busuk2}
                    onChange={e => setForm(s => ({ ...s, busuk2: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Buah Kecil */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formBuahKecil')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.buahkecil}
                    onChange={e => setForm(s => ({ ...s, buahkecil: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Brondol */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">{tH('formBrondol')}</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.brondol}
                    onChange={e => setForm(s => ({ ...s, brondol: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Tangkai Panjang */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">Tangkai Panjang</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.tangkaipanjang}
                    onChange={e =>
                      setForm(s => ({
                        ...s,
                        tangkaipanjang: e.target.value,
                      }))
                    }
                    min="0"
                  />
                </fieldset>

                {/* --- Parteno & Flag --- */}

                {/* Parteno */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">Parteno</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.parteno}
                    onChange={e => setForm(s => ({ ...s, parteno: e.target.value }))}
                    min="0"
                  />
                </fieldset>

                {/* Parteno 50+ */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">Parteno 50+</legend>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.parteno50plus}
                    onChange={e =>
                      setForm(s => ({
                        ...s,
                        parteno50plus: e.target.value,
                      }))
                    }
                    min="0"
                  />
                </fieldset>

                {/* Alas Brondol */}
                <fieldset className="fieldset col-span-12 md:col-span-3">
                  <legend className="fieldset-legend">Alas Brondol</legend>
                  <select
                    className="select select-bordered w-full"
                    value={form.alasbrondol}
                    onChange={e => setForm(s => ({ ...s, alasbrondol: e.target.value }))}
                  >
                    <option value="">- Pilih -</option>
                    <option value="Y">Ya (Y)</option>
                    <option value="N">Tidak (N)</option>
                  </select>
                </fieldset>

                <SectionHeader title={tH('formAdditionalTitle')} />

                {/* Lokasi */}
                <fieldset className="fieldset col-span-12 md:col-span-4">
                  <legend className="fieldset-legend">Lokasi (lat,lng) *</legend>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.location}
                      onChange={e => setForm(s => ({ ...s, location: e.target.value }))}
                      placeholder="contoh: -2.2893371,118.0399877"
                      readOnly={isEditing && !canUpload}
                      disabled={isEditing && !canUpload}
                      required
                    />

                    <button
                      type="button"
                      className={`btn btn-square ${locLoading ? 'btn-disabled' : ''}`}
                      onClick={handleGetLocation}
                      disabled={locLoading || (isEditing && !canUpload)}
                    >
                      {locLoading ? <span className="loading loading-spinner loading-xs" /> : '📍'}
                    </button>
                  </div>

                  {form.location && (
                    <div className="mt-1">
                      <a
                        className="link link-primary text-sm"
                        href={buildMapUrl(form.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka di Google Maps
                      </a>
                    </div>
                  )}
                </fieldset>

                {/* File BA ExCa (PDF) */}
                <fieldset className="fieldset col-span-12 md:col-span-4">
                  <legend className="fieldset-legend">
                    File BA ExCa (PDF)
                    {!isEditing || !(typeof form.no_ba_exca === 'string' && form.no_ba_exca)
                      ? ' *'
                      : ''}
                  </legend>

                  <input
                    type="file"
                    ref={pdfRef}
                    accept=".pdf"
                    className="file-input file-input-bordered w-full"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 4 * 1024 * 1024) {
                        toast.error('File maksimal 4 MB');
                        e.target.value = '';
                        return;
                      }
                      setForm(s => ({ ...s, no_ba_exca: file }));
                    }}
                  />
                </fieldset>

                {/* Exception Case */}
                <fieldset className="fieldset col-span-12 md:col-span-4">
                  <legend className="fieldset-legend">
                    Exception Case
                    {!isEditing ? ' *' : ''}
                  </legend>

                  <textarea
                    className="textarea textarea-bordered min-h-24 w-full"
                    value={form.exception_case}
                    onChange={e =>
                      setForm(s => ({
                        ...s,
                        exception_case: e.target.value,
                      }))
                    }
                    required={!isEditing}
                    rows={3}
                  />
                </fieldset>

                {/* Foto */}
                <div className="col-span-12">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Foto
                      {!isEditing ? ' *' : ''}
                    </legend>

                    <input
                      type="file"
                      ref={imgRef}
                      accept="image/*"
                      className="file-input file-input-bordered w-full"
                      disabled={isEditing && !canUpload}
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 4 * 1024 * 1024) {
                          toast.error('File maksimal 4 MB');
                          e.target.value = '';
                          return;
                        }

                        setForm(s => ({ ...s, images: file }));

                        if (file) {
                          const url = URL.createObjectURL(file);
                          setPreview(url);
                        }
                      }}
                    />

                    {/* Preview */}
                    {preview && (
                      <div className="mt-3 relative w-full h-80 rounded-xl overflow-hidden border">
                        <Image
                          src={preview}
                          alt="Preview"
                          fill
                          className="object-contain bg-base-200"
                          sizes="100vw"
                          unoptimized
                        />
                      </div>
                    )}
                  </fieldset>
                </div>
          </div>
        )}
      </FormModal>

      <DeleteModal open={deleteOpen} onClose={closeDeleteModal} onConfirm={handleConfirmDelete} isLoading={deleteMutation.isPending} />

      {uploadModalOpen && (
        <HarvestJsonUploadModal
          open={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            queryClient.invalidateQueries({ queryKey: QueryKeys.HARVEST() });
          }}
        />
      )}
    </PageLayout>
  );
}
