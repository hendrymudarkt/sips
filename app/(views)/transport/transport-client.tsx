'use client';

import React, { useMemo } from 'react';
import type { TableColumn } from 'react-data-table-component';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import { SearchSelect } from '@/app/components/ui/search-select';
import { EmployeeNameCell } from '@/app/components/ui/employee-name-cell';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { FormModal } from '@/app/components/ui/form-modal';
import { SummaryCards } from '@/app/components/ui/summary-cards';
import { PageLayout } from '@/app/components/ui/page-layout';
import { Toolbar } from '@/app/components/ui/toolbar';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { DeleteModal } from '@/app/components/feedback/delete-modal';
import { Icon } from '@/app/components/ui/icons';
import { useLocale } from '@/hooks/useLocale';
import { useTransportData } from '@/hooks/useTransportData';
import { formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { QueryKeys } from '@/utils/queryKeys';
import type { Transport } from '@/types/domain';

const normalizeNonNegative = (value: string) => (value.startsWith('-') ? '0' : value);

const formatTotal = (value: number, localeTag = 'id-ID'): string =>
  formatPerfNumber(value, localeTag, { maximumFractionDigits: 2 });

export default function PengangkutanPage() {
  const localeTag = useLocale();
  const t = useTranslations('Transport');

  const {
    q, setQ,
    showFilters, setShowFilters,
    filters, setFilters, setAppliedFilters,
    items, filtered, loading, isFetching,
    totalCards,
    canModify,
    isFcbaLocked, isAfdelingLocked, isKemandoranLocked,
    homeFcba, homeSection, homeGang,
    pabrikOptions, kendaraanOptionsAsOptions, kendaraanData,
    keraniOptions, keraniOptionsAsOptions,
    driverOptionsAsOptions,
    tkbmOptions, tkbmOptions2, tkbmOptions3, tkbmOptions4, tkbmOptions5,
    isLoadingTkbm,
    open, setOpen, isEditing,
    deleteOpen, deleteTarget,
    form, setForm,
    shouldDisableForm, formDisabled, formBelowNodokumenDisabled,
    harvestMatched, harvestStatus,
    submitLoading, deleteMutation,
    handleNoBaExcaChange,
    handleSubmit,
    openEditRecord, openNewRecord,
    handleDeleteRecord,
    closeDeleteModal,
    handleConfirmDelete,
    handleExport,
    queryClient,
  } = useTransportData();

  const tourSteps: TourStep[] = useMemo(() => [
    {
      icon: '👋',
      title: t('tourWelcomeTitle'),
      content: t('tourWelcomeDesc'),
    },
    {
      icon: '🔍',
      title: t('tourActionsTitle'),
      content: t('tourActionsDesc'),
      targetSelector: '[data-tour="action-buttons"]',
    },
    {
      icon: '🔎',
      title: t('tourSearchTitle'),
      content: t('tourSearchDesc'),
      targetSelector: '[data-tour="quick-search"]',
    },
    {
      icon: '📋',
      title: t('tourFilterTitle'),
      content: t('tourFilterDesc'),
      targetSelector: '[data-tour="filter-button"]',
      modalPosition: 'bottom',
    },
    {
      icon: '📄',
      title: t('tourTableTitle'),
      content: t('tourTableDesc'),
      targetSelector: '[data-tour="data-table"]',
      modalPosition: 'top',
    },
    {
      icon: '➕',
      title: t('tourFormTitle'),
      content: t('tourFormDesc'),
      targetSelector: '[data-tour="add-button"]',
      modalPosition: 'top-left',
    },
  ], [t]);

  const columns: TableColumn<Transport & { _index: number }>[] = useMemo(
    () => [
      {
        name: <span title={t('colAksiTooltip')}>{t('colAksi')}</span>,
        width: '130px',
        style: { justifyContent: 'center' },
        cell: r => (
          <div className="flex flex-wrap gap-2 justify-center">
            {canModify && (
              <>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => openEditRecord(r)}
                  title="Edit pengangkutan"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-error"
                  onClick={() => handleDeleteRecord(r)}
                  title="Hapus pengangkutan"
                >
                  Hapus
                </button>
              </>
            )}
          </div>
        ),
        ignoreRowClick: true,
      },
      {
        name: <span title={t('colStatusTooltip')}>{t('colStatus')}</span>,
        selector: r => r.status_pengangkutan ?? '-',
        sortable: true,
        width: '120px',
        cell: r => <StatusBadge status={r.status_pengangkutan} />,
      },
      {
        name: <span title={t('colNoTooltip')}>{t('colNo')}</span>,
        selector: r => r._index,
        width: '60px',
      },
      {
        name: <span title={t('colNoPengangkutanTooltip')}>{t('colNoPengangkutan')}</span>,
        selector: r => r.nopengangkutan,
        sortable: true,
        width: '200px',
      },
      {
        name: <span title={t('colNoSpbTooltip')}>{t('colNoSpb')}</span>,
        selector: r => r.nospb || '-',
        sortable: true,
        width: '180px',
      },
      {
        name: <span title={t('colNoDokumenTooltip')}>{t('colNoDokumen')}</span>,
        selector: r => r.nodokumen || '-',
        sortable: true,
        width: '250px',
      },
      {
        name: <span title={t('colTanggalTooltip')}>{t('colTanggal')}</span>,
        selector: r => r.tanggal || '-',
        cell: r => r._displayDate || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={t('colKeraniTooltip')}>{t('colKerani')}</span>,
        selector: r => r.nama_karyawan_kerani || r.kode_karyawan_kerani || '-',
        sortable: true,
        width: '220px',
        cell: r => <EmployeeNameCell name={r.nama_karyawan_kerani} code={r.kode_karyawan_kerani} />,
      },
      {
        name: <span title={t('colDriverTooltip')}>{t('colDriver')}</span>,
        selector: r => r.nama_karyawan_driver || r.kode_karyawan_driver || '-',
        sortable: true,
        width: '220px',
        cell: r => <EmployeeNameCell name={r.nama_karyawan_driver} code={r.kode_karyawan_driver} />,
      },
      {
        name: <span title={t('colTkbm1Tooltip')}>{t('colTkbm1')}</span>,
        selector: r => r.nama_tkbm1 || r.tkbm1 || '-',
        sortable: true,
        width: '180px',
        cell: r => <EmployeeNameCell name={r.nama_tkbm1} code={r.tkbm1} />,
      },
      {
        name: <span title={t('colTkbm2Tooltip')}>{t('colTkbm2')}</span>,
        selector: r => r.nama_tkbm2 || r.tkbm2 || '-',
        sortable: true,
        width: '180px',
        cell: r => <EmployeeNameCell name={r.nama_tkbm2} code={r.tkbm2} />,
      },
      {
        name: <span title={t('colTkbm3Tooltip')}>{t('colTkbm3')}</span>,
        selector: r => r.nama_tkbm3 || r.tkbm3 || '-',
        sortable: true,
        width: '180px',
        cell: r => <EmployeeNameCell name={r.nama_tkbm3} code={r.tkbm3} />,
      },
      {
        name: <span title={t('colTkbm4Tooltip')}>{t('colTkbm4')}</span>,
        selector: r => r.nama_tkbm4 || r.tkbm4 || '-',
        sortable: true,
        width: '180px',
        cell: r => <EmployeeNameCell name={r.nama_tkbm4} code={r.tkbm4} />,
      },
      {
        name: <span title={t('colTkbm5Tooltip')}>{t('colTkbm5')}</span>,
        selector: r => r.nama_tkbm5 || r.tkbm5 || '-',
        sortable: true,
        width: '180px',
        cell: r => <EmployeeNameCell name={r.nama_tkbm5} code={r.tkbm5} />,
      },
      {
        name: <span title={t('colTypeTooltip')}>{t('colType')}</span>,
        selector: r => r._typeLabel || '-',
        sortable: true,
        width: '90px',
      },
      {
        name: <span title={t('colKendaraanTooltip')}>{t('colKendaraan')}</span>,
        sortable: true,
        selector: r => r.kode_kendaraan ?? '',
        width: '200px',
        cell: r => {
          const kode = r.kode_kendaraan || '-';
          const nama = r.nama_kendaraan || '';
          return (
            <div>
              <div className="font-bold">{nama ? `${kode} - ${nama}` : kode}</div>
              {r.registrationno && <div className="text-xs text-gray-500">{r.registrationno}</div>}
            </div>
          );
        },
      },
      {
        name: <span title={t('colNoPolisiTooltip')}>{t('colNoPolisi')}</span>,
        selector: r => r.no_pol ?? r.registrationno ?? '-',
        sortable: true,
        width: '140px',
      },
      {
        name: <span title={t('colFcbaTooltip')}>{t('colFcba')}</span>,
        selector: r => r.fcba || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colPabrikTooltip')}>{t('colPabrik')}</span>,
        selector: r => r.pabrik_tujuan || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colAfdelingTooltip')}>{t('colAfdeling')}</span>,
        selector: r => r.afdeling || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colFieldTooltip')}>{t('colField')}</span>,
        selector: r => r.fieldcode || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span title={t('colTphTooltip')}>{t('colTph')}</span>,
        selector: r => r.tph || '-',
        sortable: true,
        width: '80px',
      },
      {
        name: t('colTotalJanjang'),
        selector: r => r._totaljanjangNum || 0,
        sortable: true,
        width: '120px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._totaljanjangNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: t('colOutput'),
        selector: r => r._outputNum || 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._outputNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span title={t('colJanjangNormalTooltip')}>{t('colJanjangNormal')}</span>,
        selector: r => r._janjangnormalNum || 0,
        sortable: true,
        width: '120px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._janjangnormalNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span title={t('colBrondolanTooltip')}>{t('colBrondolan')}</span>,
        selector: r => r._brondolanNum || 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._brondolanNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span title={t('colMentahTooltip')}>{t('colMentah')}</span>,
        selector: r => r._mentahNum || 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._mentahNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span title={t('colAbnormalTooltip')}>{t('colAbnormal')}</span>,
        selector: r => r._abnormalNum || 0,
        sortable: true,
        width: '100px',
        style: { justifyContent: 'center' },
        cell: r => (
          <span className="text-center w-full">
            {formatPerfNumber(r._abnormalNum || 0, localeTag)}
          </span>
        ),
      },
      {
        name: <span title={t('colFcbaDestTooltip')}>{t('colFcbaDest')}</span>,
        selector: r => r.fcba_destination || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colAfdelingDestTooltip')}>{t('colAfdelingDest')}</span>,
        selector: r => r.afdeling_destination || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colExceptionCaseTooltip')}>{t('colExceptionCase')}</span>,
        selector: r => r.exception_case || '-',
        sortable: true,
        width: '200px',
      },
      {
        name: <span title={t('colNoBaExcaTooltip')}>{t('colNoBaExca')}</span>,
        selector: r => r.no_ba_exca || '-',
        sortable: true,
        width: '100px',
        style: { justifyContent: 'center' },
        cell: r =>
          r.no_ba_exca ? (
            <a
              href={r.no_ba_exca}
              target="_blank"
              rel="noopener noreferrer"
              title={`Lampiran Exception Case | No Dokumen : ${r.nodokumen || '-'} | No Pengangkutan : ${r.nopengangkutan || '-'}`}
            >
              <Icon name="document-attach" className="h-6 w-6 text-primary hover:text-primary-focus transition-colors" />
            </a>
          ) : (
            '-'
          ),
      },
      {
        name: <span title={t('colEtdTooltip')}>{t('colEtd')}</span>,
        selector: r => r.etd || '-',
        sortable: true,
        width: '160px',
      },
      {
        name: <span title={t('colEtaTooltip')}>{t('colEta')}</span>,
        selector: r => r.eta || '-',
        sortable: true,
        width: '160px',
      },
    ],
    [localeTag, canModify, handleDeleteRecord, openEditRecord, t]
  );

  return (
    <PageLayout>
        <Toolbar
          title={t('pageTitle')}
          titleTooltip={t('pageTitleTooltip')}
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
              onClick: () => queryClient.invalidateQueries({ queryKey: QueryKeys.TRANSPORT() }),
              loading: isFetching,
            },
            {
              key: 'export',
              label: t('export'),
              icon: 'export',
              onClick: handleExport,
              disabled: items.length === 0,
            },
            ...(canModify ? [{
              key: 'add',
              label: t('addTransport'),
              icon: 'plus',
              onClick: openNewRecord,
              variant: 'primary' as const,
              tour: 'add-button',
            }] : []),
          ]}
        >
          <AppTour steps={tourSteps} btnClassName="join-item flex-1 sm:flex-none" />
        </Toolbar>

        <div className="mb-3 flex flex-col md:flex-row items-center gap-4 animate-slideUp [animation-delay:100ms]">
          {/* TOTAL CARDS (di kiri) */}
          <SummaryCards cards={totalCards.map(c => ({ ...c, value: formatTotal(c.value, localeTag) }))} />

          <QuickSearch value={q} onChange={setQ} placeholder={t('searchPlaceholder')} className="w-full sm:w-72 sm:shrink-0 sm:ml-auto" />
        </div>

        {showFilters && (
          <FilterBar
            fields={[
              { key: 'tanggal', label: '', type: 'date' },
              { key: 'tanggal_end', label: '', type: 'date' },
              { key: 'nopengangkutan', label: t('filterNoPengangkutan'), type: 'text', placeholder: t('filterNoPengangkutan') },
              { key: 'nospb', label: t('filterNoSpb'), type: 'text', placeholder: t('filterNoSpb') },
              { key: 'nodokumen', label: t('filterNoDokumen'), type: 'text', placeholder: t('filterNoDokumen') },
              { key: 'kode_karyawan_driver', label: t('filterDriver'), type: 'text', placeholder: t('filterDriver') },
              { key: 'kode_karyawan_kerani', label: t('filterKerani'), type: 'text', placeholder: t('filterKerani') },
              { key: 'fcba', label: t('filterFcba'), type: 'text', placeholder: t('filterFcba'), disabled: isFcbaLocked },
              { key: 'afdeling', label: t('filterAfdeling'), type: 'text', placeholder: t('filterAfdeling'), disabled: isAfdelingLocked },
              { key: 'fieldcode', label: t('filterFieldcode'), type: 'text', placeholder: t('filterFieldcode') },
              { key: 'tph', label: t('filterTph'), type: 'text', placeholder: t('filterTph') },
              { key: 'kode_kendaraan', label: t('filterKendaraan'), type: 'text', placeholder: t('filterKendaraan') },
              { key: 'kemandoran', label: t('filterKemandoran'), type: 'text', placeholder: t('filterKemandoran'), disabled: isKemandoranLocked },
              { key: 'status_pengangkutan', label: t('filterStatus'), type: 'select', options: [
                { value: '', label: t('filterStatus') },
                { value: 'Approved', label: t('filterStatusOptionsApproved') },
                { value: 'Planned', label: t('filterStatusOptionsPlanned') },
                { value: 'Completed', label: t('filterStatusOptionsCompleted') },
              ]},
            ]}
            values={filters}
            onChange={(key, value) => setFilters(s => ({ ...s, [key]: value }))}
            onApply={() => setAppliedFilters({ ...filters })}
            onReset={() => {
              const reset = {
                tanggal: '', tanggal_end: '', nopengangkutan: '', nospb: '', nodokumen: '',
                kode_karyawan_kerani: '', kode_karyawan_driver: '', fcba: '', afdeling: '',
                kemandoran: '', fieldcode: '', tph: '', kode_kendaraan: '', status_pengangkutan: '',
              };
              if (isFcbaLocked && homeFcba) reset.fcba = homeFcba;
              if (isAfdelingLocked && homeSection) reset.afdeling = homeSection;
              if (isKemandoranLocked && homeGang) reset.kemandoran = homeGang;
              setFilters(reset);
              setAppliedFilters(reset);
            }}
            loading={loading}
            t={t}
          />
        )}

        <AppDataTable
          columns={columns}
          data={filtered}
          loading={loading}
          pointerOnHover
          namespace="Transport"
          onClearSearch={q ? () => setQ('') : undefined}
        />

        <FormModal
          open={open}
          title={isEditing ? t('modalEditTitle') : t('modalAddTitle')}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
          loading={submitLoading}
          loadingText={t('modalSaving')}
          cancelText={t('modalCancel')}
          confirmText={isEditing ? t('modalUpdate') : t('modalSave')}
          confirmDisabled={submitLoading || formBelowNodokumenDisabled}
          formId="pengangkutan-form"
          size="lg"
        >
          <div className="col-span-12 grid grid-cols-12 gap-3">
            <fieldset className="fieldset col-span-12 md:col-span-3">
              <legend className="fieldset-legend">{t('formTanggal')}</legend>
              <input
                type="date"
                className="input input-bordered w-full"
                value={form.tanggal}
                onChange={e => setForm(s => ({ ...s, tanggal: e.target.value }))}
                disabled={formDisabled}
                required
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">{t('formTipe')}</legend>
              <select
                className="select select-bordered w-full"
                value={form.type_pengangkutan}
                onChange={e => setForm(s => ({ ...s, type_pengangkutan: e.target.value }))}
                disabled={shouldDisableForm}
                required
              >
                <option value="">Pilih tipe</option>
                <option value="1">Langsir</option>
                <option value="2">Direct</option>
              </select>
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-3">
              <legend className="fieldset-legend">{t('formPabrik')}</legend>
              <select
                className="select select-bordered w-full"
                value={form.pabrik_tujuan}
                onChange={e => setForm(s => ({ ...s, pabrik_tujuan: e.target.value }))}
                disabled={formDisabled}
                required
              >
                <option value="">Pilih pabrik</option>
                {pabrikOptions.map(option => (
                  <option key={option.fccode} value={option.fccode}>
                    {option.fccode} - {option.fcname}
                  </option>
                ))}
              </select>
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">{t('formKerani')}</legend>
              <SearchSelect
                options={keraniOptionsAsOptions}
                value={form.kode_karyawan_kerani}
                onChange={v => setForm(s => ({ ...s, kode_karyawan_kerani: v }))}
                placeholder={keraniOptions.length === 0 ? 'Tidak ada Kerani' : 'Pilih Kerani'}
                required
                translationNamespace="Transport"
              />
            </fieldset>
          </div>
          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formNoDokumen')}</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.nodokumen}
              onChange={e => setForm(s => ({ ...s, nodokumen: e.target.value }))}
              disabled={!form.type_pengangkutan}
              required
            />
          </fieldset>
          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formNoPengangkutan')}</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.nopengangkutan}
              onChange={e => setForm(s => ({ ...s, nopengangkutan: e.target.value }))}
              readOnly={isEditing}
              tabIndex={-1}
              required
            />
          </fieldset>
          <fieldset className="fieldset col-span-12 md:col-span-4">
            <legend className="fieldset-legend">{t('formNoSpb')}</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.nospb}
              onChange={e => setForm(s => ({ ...s, nospb: e.target.value }))}
              readOnly={isEditing}
              tabIndex={-1}
            />
          </fieldset>
          {form.nodokumen.trim() ? (
            <div className="col-span-12">
              <p className={`text-sm ${harvestMatched ? 'text-success' : 'text-warning'}`}>
                {harvestStatus}
              </p>
            </div>
          ) : null}
          <fieldset className="fieldset col-span-12 md:col-span-6">
            <legend className="fieldset-legend">{t('formKendaraan')}</legend>
            <SearchSelect
              options={kendaraanOptionsAsOptions}
              value={form.kode_kendaraan}
              onChange={v => setForm(s => ({ ...s, kode_kendaraan: v }))}
              placeholder={
                kendaraanData.length === 0 ? 'Tidak ada kendaraan' : 'Pilih Kendaraan'
              }
              disabled={formBelowNodokumenDisabled}
              required
              translationNamespace="Transport"
            />
          </fieldset>
          <fieldset className="fieldset col-span-12 md:col-span-6">
            <legend className="fieldset-legend">{t('formDriver')}</legend>
            <SearchSelect
              options={driverOptionsAsOptions}
              value={form.kode_karyawan_driver}
              onChange={v => setForm(s => ({ ...s, kode_karyawan_driver: v }))}
              placeholder={driverOptionsAsOptions.length === 0 ? 'Tidak ada Driver' : 'Pilih Driver'}
              disabled={formBelowNodokumenDisabled}
              required
              translationNamespace="Transport"
            />
          </fieldset>

          <div className="col-span-12 grid grid-cols-12 gap-3">
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">{t('formTkbm1')}</legend>
              <SearchSelect
                options={tkbmOptions}
                value={form.tkbm1}
                onChange={v => setForm(s => ({ ...s, tkbm1: v }))}
                placeholder={
                  !form.tanggal
                    ? 'Isi Tanggal dulu'
                    : !form.kode_karyawan_kerani
                      ? 'Pilih Kerani dulu'
                      : isLoadingTkbm
                        ? 'Memuat TKBM...'
                        : tkbmOptions.length === 0
                          ? 'Tidak ada TKBM'
                          : 'Pilih TKBM'
                }
                disabled={
                  formBelowNodokumenDisabled ||
                  !form.tanggal ||
                  !form.kode_karyawan_kerani ||
                  isLoadingTkbm
                }
                required
                translationNamespace="Transport"
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">TKBM 2</legend>
              <SearchSelect
                options={tkbmOptions2}
                value={form.tkbm2}
                onChange={v => setForm(s => ({ ...s, tkbm2: v }))}
                placeholder={
                  !form.tanggal
                    ? 'Isi Tanggal dulu'
                    : !form.kode_karyawan_kerani
                      ? 'Pilih Kerani dulu'
                      : isLoadingTkbm
                        ? 'Memuat TKBM...'
                        : tkbmOptions.length === 0
                          ? 'Tidak ada TKBM'
                          : 'Pilih TKBM'
                }
                disabled={
                  formBelowNodokumenDisabled ||
                  !form.tanggal ||
                  !form.kode_karyawan_kerani ||
                  isLoadingTkbm
                }
                translationNamespace="Transport"
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">TKBM 3</legend>
              <SearchSelect
                options={tkbmOptions3}
                value={form.tkbm3}
                onChange={v => setForm(s => ({ ...s, tkbm3: v }))}
                placeholder={
                  !form.tanggal
                    ? 'Isi Tanggal dulu'
                    : !form.kode_karyawan_kerani
                      ? 'Pilih Kerani dulu'
                      : isLoadingTkbm
                        ? 'Memuat TKBM...'
                        : tkbmOptions.length === 0
                          ? 'Tidak ada TKBM'
                          : 'Pilih TKBM'
                }
                disabled={
                  formBelowNodokumenDisabled ||
                  !form.tanggal ||
                  !form.kode_karyawan_kerani ||
                  isLoadingTkbm
                }
                translationNamespace="Transport"
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">TKBM 4</legend>
              <SearchSelect
                options={tkbmOptions4}
                value={form.tkbm4}
                onChange={v => setForm(s => ({ ...s, tkbm4: v }))}
                placeholder={
                  !form.tanggal
                    ? 'Isi Tanggal dulu'
                    : !form.kode_karyawan_kerani
                      ? 'Pilih Kerani dulu'
                      : isLoadingTkbm
                        ? 'Memuat TKBM...'
                        : tkbmOptions.length === 0
                          ? 'Tidak ada TKBM'
                          : 'Pilih TKBM'
                }
                disabled={
                  formBelowNodokumenDisabled ||
                  !form.tanggal ||
                  !form.kode_karyawan_kerani ||
                  isLoadingTkbm
                }
                translationNamespace="Transport"
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">TKBM 5</legend>
              <SearchSelect
                options={tkbmOptions5}
                value={form.tkbm5}
                onChange={v => setForm(s => ({ ...s, tkbm5: v }))}
                placeholder={
                  !form.tanggal
                    ? 'Isi Tanggal dulu'
                    : !form.kode_karyawan_kerani
                      ? 'Pilih Kerani dulu'
                      : isLoadingTkbm
                        ? 'Memuat TKBM...'
                        : tkbmOptions.length === 0
                          ? 'Tidak ada TKBM'
                          : 'Pilih TKBM'
                }
                disabled={
                  formBelowNodokumenDisabled ||
                  !form.tanggal ||
                  !form.kode_karyawan_kerani ||
                  isLoadingTkbm
                }
                translationNamespace="Transport"
              />
            </fieldset>
          </div>
          <details className="col-span-12" open={false}>
            <summary className="text-sm font-semibold text-base-content/80 cursor-pointer select-none">
              Lokasi Asal & Tujuan
            </summary>
            <div className="mt-2 border-t border-base-300" />
            <div className="grid grid-cols-12 gap-3 mt-2">
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">FCBA</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.fcba}
                  readOnly
                />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">Afdeling</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.afdeling}
                  readOnly
                />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">Field Code</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.fieldcode}
                  readOnly
                />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">TPH</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.tph}
                  readOnly
                />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">FCBA Tujuan</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.fcba_destination}
                  readOnly
                />
              </fieldset>
              <fieldset className="fieldset col-span-12 md:col-span-3">
                <legend className="fieldset-legend">Afdeling Tujuan</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={form.afdeling_destination}
                  readOnly
                />
              </fieldset>
            </div>
          </details>

          <div className="col-span-12 grid grid-cols-12 gap-3">
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Total Janjang</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full"
                value={form.totaljanjang}
                onChange={e =>
                  setForm(s => ({ ...s, totaljanjang: normalizeNonNegative(e.target.value) }))
                }
                disabled={formBelowNodokumenDisabled}
                required
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Output</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full"
                value={form.output}
                onChange={e =>
                  setForm(s => ({ ...s, output: normalizeNonNegative(e.target.value) }))
                }
                disabled={formBelowNodokumenDisabled}
                required
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Janjang Normal</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full"
                value={form.janjangnormal}
                onChange={e =>
                  setForm(s => ({
                    ...s,
                    janjangnormal: normalizeNonNegative(e.target.value),
                  }))
                }
                disabled={formBelowNodokumenDisabled}
                required
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Brondolan</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full pointer-events-none select-none"
                value={form.brondolan}
                readOnly
                tabIndex={-1}
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Mentah</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full pointer-events-none select-none"
                value={form.mentah}
                readOnly
                tabIndex={-1}
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-2">
              <legend className="fieldset-legend">Abnormal</legend>
              <input
                type="number"
                min="0"
                step="any"
                className="input input-bordered w-full"
                value={form.abnormal}
                onChange={e =>
                  setForm(s => ({ ...s, abnormal: normalizeNonNegative(e.target.value) }))
                }
                disabled={formBelowNodokumenDisabled}
                required
              />
            </fieldset>
          </div>

          <div className="col-span-12 grid grid-cols-12 gap-3">
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">ETD</legend>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={form.etd}
                readOnly
                tabIndex={-1}
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">BA PDF *</legend>
              <input
                type="file"
                accept="application/pdf"
                className="file-input file-input-bordered w-full"
                onChange={handleNoBaExcaChange}
                required={!isEditing}
                disabled={formBelowNodokumenDisabled}
              />
            </fieldset>
            <fieldset className="fieldset col-span-12 md:col-span-4">
              <legend className="fieldset-legend">Exception Case</legend>
              <textarea
                className="textarea textarea-bordered w-full h-24"
                value={form.exception_case}
                onChange={e => setForm(s => ({ ...s, exception_case: e.target.value }))}
                disabled={formBelowNodokumenDisabled}
                required
              />
            </fieldset>
          </div>
        </FormModal>

        <DeleteModal
          open={deleteOpen}
          onClose={closeDeleteModal}
          onConfirm={handleConfirmDelete}
          isLoading={deleteMutation.isPending}
          title={t('modalDeleteTitle')}
          description={t('modalDeleteDesc', { noPengangkutan: deleteTarget?.nopengangkutan ?? '' })}
          label={t('modalDeleteLabel')}
          confirmText={t('modalDelete')}
          cancelText={t('modalCancel')}
        />
    </PageLayout>
  );
}

