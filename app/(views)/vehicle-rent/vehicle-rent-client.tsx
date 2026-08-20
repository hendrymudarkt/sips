'use client';

import React, { useCallback, useMemo } from 'react';
import type { TableColumn } from 'react-data-table-component';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import { SearchSelect } from '@/app/components/ui/search-select';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { FormModal } from '@/app/components/ui/form-modal';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { PageLayout } from '@/app/components/ui/page-layout';
import { Toolbar } from '@/app/components/ui/toolbar';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { useVehicleRentData } from '@/hooks/useVehicleRentData';
import { QueryKeys } from '@/utils/queryKeys';
import type { VehicleRent } from '@/types/domain';

export default function VehicleRentPage() {
  const t = useTranslations('VehicleRent');

  const {
    q, setQ,
    showFilters, setShowFilters,
    filters, setFilters, setAppliedFilters,
    items, loading, isFetching,
    canModify,
    open, setOpen, isEditing,
    form, setForm,
    contractOptions, isFetchingContracts, handleContractChange,
    submitLoading,
    handleSubmit,
    openEditRecord, openNewRecord,
    deleteOpen, deleteTarget,
    closeDeleteModal, handleDeleteRecord, handleConfirmDelete,
    deleteMutation,
    handleExport,
    queryClient,
  } = useVehicleRentData();

const tourSteps: TourStep[] = useMemo(
    () => [
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
      {
        icon: '📅',
        title: t('tourFormTanggalTitle'),
        content: t('tourFormTanggalDesc'),
        targetSelector: '[data-tour="form-tanggal"]',
        modalPosition: 'bottom',
      },
      {
        icon: '📝',
        title: t('tourFormContractTitle'),
        content: t('tourFormContractDesc'),
        targetSelector: '[data-tour="form-contract"]',
        modalPosition: 'bottom',
      },
      {
        icon: '🚗',
        title: t('tourFormVehicleTitle'),
        content: t('tourFormVehicleDesc'),
        targetSelector: '[data-tour="form-vehicle"]',
        modalPosition: 'bottom',
      },
      {
        icon: '🪪',
        title: t('tourFormNikTitle'),
        content: t('tourFormNikDesc'),
        targetSelector: '[data-tour="form-nik"]',
        modalPosition: 'bottom',
      },
      {
        icon: '🗓️',
        title: t('tourFormValidTitle'),
        content: t('tourFormValidDesc'),
        targetSelector: '[data-tour="form-valid"]',
        modalPosition: 'bottom',
      },
    ],
    [t]
  );

  const handleTourStepChange = useCallback(
    (idx: number) => {
      if (idx < 6) setOpen(false);
      else if (!open) openNewRecord();
    },
    [open, openNewRecord, setOpen]
  );

  type VehicleRentRow = VehicleRent & { _index?: number; _displayDate?: string; _displayValidFrom?: string; _displayValidUntil?: string };

  const columns: TableColumn<VehicleRentRow>[] = useMemo(
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
                  title="Edit vehicle rent"
                >
                  {t('edit')}
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-error"
                  onClick={() => handleDeleteRecord(r)}
                  title="Hapus vehicle rent"
                >
                  {t('delete')}
                </button>
              </>
            )}
          </div>
        ),
        ignoreRowClick: true,
      },
      {
        name: <span title={t('colNoTooltip')}>{t('colNo')}</span>,
        selector: r => r._index ?? 0,
        width: '60px',
      },
      {
        name: <span title={t('colTanggalTooltip')}>{t('colTanggal')}</span>,
        selector: r => r.tanggal || '-',
        cell: r => r._displayDate || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={t('colContractNoTooltip')}>{t('colContractNo')}</span>,
        selector: r => r.contract_no || '-',
        sortable: true,
        width: '150px',
      },
      {
        name: <span title={t('colFcbaTooltip')}>{t('colFcba')}</span>,
        selector: r => r.fcba || '-',
        sortable: true,
        width: '90px',
      },
      {
        name: <span title={t('colVehicleCodeTooltip')}>{t('colVehicleCode')}</span>,
        selector: r => r.vehicle_code || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={t('colVehicleNameTooltip')}>{t('colVehicleName')}</span>,
        selector: r => r.vehicle_name || '-',
        sortable: true,
        width: '180px',
      },
      {
        name: <span title={t('colRegistrationNoTooltip')}>{t('colRegistrationNo')}</span>,
        selector: r => r.registration_no || '-',
        sortable: true,
        width: '140px',
      },
      {
        name: <span title={t('colNikTooltip')}>{t('colNik')}</span>,
        selector: r => r.nik || '-',
        sortable: true,
        width: '150px',
      },
      {
        name: <span title={t('colDriverNameTooltip')}>{t('colDriverName')}</span>,
        selector: r => r.driver_name || '-',
        sortable: true,
        width: '180px',
      },
      {
        name: <span title={t('colValidFromTooltip')}>{t('colValidFrom')}</span>,
        selector: r => r.valid_from || '-',
        cell: r => r._displayValidFrom || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={t('colValidUntilTooltip')}>{t('colValidUntil')}</span>,
        selector: r => r.valid_until || '-',
        cell: r => r._displayValidUntil || '-',
        sortable: true,
        width: '120px',
      },
    ],
    [canModify, handleDeleteRecord, openEditRecord, t]
  );

  const indexedData = useMemo(
    () => items.map((r, i) => ({ ...r, _index: i + 1 })),
    [items]
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
            variant: 'outline',
            tour: 'filter-button',
          },
          {
            key: 'refresh',
            label: t('refresh'),
            icon: 'refresh',
            onClick: () => queryClient.invalidateQueries({ queryKey: QueryKeys.VEHICLE_RENTS() }),
            loading: isFetching,
            variant: 'outline',
          },
          {
            key: 'export',
            label: t('export'),
            icon: 'export',
            onClick: handleExport,
            variant: 'outline',
          },
          ...(canModify
            ? [
                {
                  key: 'add',
                  label: t('addVehicleRent'),
                  icon: 'plus' as const,
                  onClick: openNewRecord,
                  variant: 'primary' as const,
                  tour: 'add-button',
                },
              ]
            : []),
        ]}
      >
        <AppTour
          steps={tourSteps}
          onStepChange={handleTourStepChange}
          onClose={() => setOpen(false)}
          btnClassName="join-item flex-1 sm:flex-none"
        />
      </Toolbar>

      <div className="mb-3 flex flex-col md:flex-row items-center gap-4 animate-slideUp [animation-delay:100ms]">
        <QuickSearch
          value={q}
          onChange={setQ}
          placeholder={t('searchPlaceholder')}
          className="w-full sm:w-72 sm:shrink-0 sm:ml-auto"
        />
      </div>

      {showFilters && (
        <FilterBar
          fields={[
            { key: 'tanggal', label: '', type: 'date' },
            { key: 'contract_no', label: t('filterContractNo'), type: 'text', placeholder: t('filterContractNo') },
            { key: 'fcba', label: t('filterFcba'), type: 'text', placeholder: t('filterFcba') },
            { key: 'vehicle_code', label: t('filterVehicleCode'), type: 'text', placeholder: t('filterVehicleCode') },
            { key: 'vehicle_name', label: t('filterVehicleName'), type: 'text', placeholder: t('filterVehicleName') },
            { key: 'registration_no', label: t('filterRegistrationNo'), type: 'text', placeholder: t('filterRegistrationNo') },
            { key: 'nik', label: t('filterNik'), type: 'text', placeholder: t('filterNik') },
            { key: 'driver_name', label: t('filterDriverName'), type: 'text', placeholder: t('filterDriverName') },
            { key: 'valid_from', label: t('filterValidFrom'), type: 'date' },
            { key: 'valid_until', label: t('filterValidUntil'), type: 'date' },
          ]}
          values={filters}
          onChange={(key, value) => setFilters(s => ({ ...s, [key]: value }))}
          onApply={() => setAppliedFilters({ ...filters })}
          onReset={() => {
            const reset = {
              tanggal: '', contract_no: '', fcba: '', vehicle_code: '',
              vehicle_name: '', registration_no: '', nik: '', driver_name: '',
              valid_from: '', valid_until: '',
            };
            setFilters(reset);
            setAppliedFilters(reset);
          }}
          loading={loading}
          t={t}
        />
      )}

      <AppDataTable
        columns={columns}
        data={indexedData}
        loading={loading}
        pointerOnHover
        namespace="VehicleRent"
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
        confirmDisabled={submitLoading}
        formId="vehicle-rent-form"
        size="lg"
      >
        <div className="col-span-12 grid grid-cols-12 gap-3">
          <fieldset className="fieldset col-span-12 md:col-span-3" data-tour="form-tanggal">
            <legend className="fieldset-legend">{t('formTanggal')}</legend>
            <input
              type="date"
              className="input input-bordered w-full"
              value={form.tanggal}
              onChange={e => {
                setForm(s => ({ ...s, tanggal: e.target.value }));
                if (e.target.value !== form.tanggal) {
                  setForm(s => ({ ...s, contract_no: '' }));
                }
              }}
              required
            />
          </fieldset>
          <fieldset className="fieldset col-span-12 md:col-span-9" data-tour="form-contract">
            <legend className="fieldset-legend">{t('formContractNo')}</legend>
            <SearchSelect
              options={contractOptions}
              value={form.contract_no}
              onChange={handleContractChange}
              placeholder={
                !form.tanggal
                  ? t('selectTanggalFirst')
                  : isFetchingContracts
                    ? t('loadingContracts')
                    : contractOptions.length === 0
                      ? t('noContracts')
                      : t('selectContract')
              }
              disabled={!form.tanggal || isFetchingContracts}
              required
              translationNamespace="VehicleRent"
            />
          </fieldset>
        </div>
        <fieldset className="fieldset col-span-12 md:col-span-4" data-tour="form-vehicle">
          <legend className="fieldset-legend">{t('formVehicleCode')}</legend>
          <input
            type="text"
            className="input input-bordered w-full uppercase"
            value={form.vehicle_code}
            onChange={e =>
              setForm(s => ({ ...s, vehicle_code: e.target.value.toUpperCase() }))
            }
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('formVehicleName')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.vehicle_name}
            onChange={e => setForm(s => ({ ...s, vehicle_name: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('formRegistrationNo')}</legend>
          <input
            type="text"
            maxLength={9}
            className="input input-bordered w-full uppercase"
            value={form.registration_no}
            onChange={e =>
              setForm(s => ({ ...s, registration_no: e.target.value.toUpperCase() }))
            }
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6" data-tour="form-nik">
          <legend className="fieldset-legend">{t('formNik')}</legend>
          <input
            type="text"
            inputMode="numeric"
            maxLength={16}
            className="input input-bordered w-full"
            value={form.nik}
            onChange={e =>
              setForm(s => ({ ...s, nik: e.target.value.replace(/\D/g, '').slice(0, 16) }))
            }
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('formDriverName')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.driver_name}
            onChange={e => setForm(s => ({ ...s, driver_name: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6" data-tour="form-valid">
          <legend className="fieldset-legend">{t('formValidFrom')}</legend>
          <input
            type="date"
            className="input input-bordered w-full pointer-events-none select-none bg-base-200"
            value={form.valid_from}
            readOnly
            tabIndex={-1}
            title={t('formValidFromAuto')}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('formValidUntil')}</legend>
          <input
            type="date"
            className="input input-bordered w-full pointer-events-none select-none bg-base-200"
            value={form.valid_until}
            readOnly
            tabIndex={-1}
            title={t('formValidUntilAuto')}
            required
          />
        </fieldset>
      </FormModal>

      <ConfirmModal
        open={deleteOpen}
        title={t('modalDeleteTitle')}
        message={t('modalDeleteDesc', { contractNo: deleteTarget?.label ?? '' })}
        confirmText={t('modalDelete')}
        cancelText={t('modalCancel')}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteModal}
        loading={deleteMutation.isPending}
        danger
      />
    </PageLayout>
  );
}