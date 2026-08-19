'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import type { TableColumn } from 'react-data-table-component';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import { SkeletonTable } from '@/app/components/ui/skeletons';
import { SearchSelect, type Option } from '@/app/components/ui/search-select';
import { EmptyState } from '@/app/components/feedback/empty-state';
import { Icon } from '@/app/components/ui/icons';
import { PhotoCell } from '@/app/components/ui/photo-cell';
import { SectionHeader } from '@/app/components/ui/section-header';
import { Toolbar } from '@/app/components/ui/toolbar';
import { PageLayout } from '@/app/components/ui/page-layout';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { UsersGalleryView, type UsersGalleryHandle } from '@/app/components/features/users-gallery-view';
import { useUsersData } from '@/hooks/useUsersData';
import { QueryKeys } from '@/utils/queryKeys';
import { buildWhatsAppUrl, buildMailtoUrl } from '@/utils/helpers/contactLinks';
import { isSafeHref } from '@/lib/utils/inputSanitizer';
import type { SipsUser, UserFormState } from '@/types/domain';
import { initialUserForm } from '@/types/domain';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { FormModal } from '@/app/components/ui/form-modal';
import { PhotoUpload } from '@/app/components/ui/photo-upload';

const LEVEL_OPTIONS: Option[] = [
  { value: 'MGR', label: 'MGR - Manager' },
  { value: 'KSI', label: 'KSI - Kepala Administrasi' },
  { value: 'AST', label: 'AST - Asisten' },
  { value: 'MD1', label: 'MD1 - Mandor 1' },
  { value: 'MDP', label: 'MDP - Mandor Panen' },
  { value: 'KRP', label: 'KRP - Kerani Panen' },
  { value: 'KRT', label: 'KRT - Kerani Transport' },
  { value: 'KRA', label: 'KRA - Kerani Afdeling' },
];

const POSITION_OPTIONS: Option[] = [
  { value: 'EM', label: 'EM - Manager' },
  { value: 'KASIE', label: 'KASIE - Kepala Administrasi' },
  { value: 'ASISTEN', label: 'ASISTEN - Asisten' },
  { value: 'MANDOR1', label: 'MANDOR1 - Mandor 1' },
  { value: 'MD.PANEN', label: 'MD.PANEN - Mandor Panen' },
  { value: 'KR.PANEN', label: 'KR.PANEN - Kerani Panen' },
  { value: 'KR.TRANS', label: 'KR.TRANS - Kerani Transport' },
  { value: 'KR.AFDELING', label: 'KR.AFDELING - Kerani Afdeling' },
];

const POSITION_TO_LEVEL: Record<string, string> = {
  EM: 'MGR',
  KASIE: 'KSI',
  ASISTEN: 'AST',
  MANDOR1: 'MD1',
  'MD.PANEN': 'MDP',
  'KR.PANEN': 'KRP',
  'KR.TRANS': 'KRT',
  'KR.AFDELING': 'KRA',
};

const initialBulkRow: UserFormState = { ...initialUserForm, password: '12345678' };

export default function UsersClient() {
  const t = useTranslations('Users');
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get('q') || '';
  const initialFilters = useMemo(() => {
    const f: Record<string, string> = {};
    const qp = ['fcba', 'afdeling', 'gangcode', 'level', 'position'];
    for (const key of qp) {
      const v = searchParams.get(key);
      if (v) f[key] = v;
    }
    return f;
  }, [searchParams]);

  const {
    q, setQ,
    showFilters, setShowFilters,
    filters, setFilters, setAppliedFilters, appliedFilters, clearFilters,
    afdelingFilterOptions, gangcodeFilterOptions,
    scopedFcbaOptions,
    sectionOptions, gangOptions,
    bulkSectionOptions, bulkGangOptions,
    isFcbaRestricted, userFcba, userLevel,
    isLoading, isFetching, filteredUsers,
    setSelFcba, setSelAfdeling,
    form, setForm,
    registerMutation,
    addOpen, setAddOpen,
    bulkOpen, setBulkOpen,
    bulkFcba, setBulkFcba,
    bulkAfdeling, setBulkAfdeling,
    bulkGang, setBulkGang,
    setBulkRows, bulkRows, bulkLoading,
    editOpen, setEditOpen,
    editUser,
    editMutation,
    onChangeFcba, onChangeAfdeling, onChangeGang,
    applyBulkDefaults,
    addBulkRow, removeBulkRow, updateBulkRow,
    handleBulkSubmit,
    handleEdit, handleToggleStatus,
    handleAddUser, handleExport,
  } = useUsersData(initialQ, initialFilters);

  const visibleLevelOptions = useMemo(() => LEVEL_OPTIONS, []);

  const visiblePositionOptions = useMemo(() => POSITION_OPTIONS, []);

  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const galleryRef = useRef<UsersGalleryHandle>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const [editForm, setEditForm] = useState({ username: '', fullname: '', email: '', phone: '', fcba: '', afdeling: '', gangcode: '', idkaryawan: '', level: '', position: '', password: '' });
  const [editPhoto, setEditPhoto] = useState<File | null>(null);

  const isAdmin = userLevel === 'ADM';

  useEffect(() => {
    if (editUser) {
      setEditForm({
        username: editUser.username ?? '',
        fullname: editUser.fullname ?? '',
        email: editUser.email ?? '',
        phone: editUser.phone ?? '',
        fcba: editUser.fcba ?? '',
        afdeling: editUser.afdeling ?? '',
        gangcode: editUser.gangcode ?? '',
        idkaryawan: editUser.idkaryawan ?? '',
        level: editUser.level ?? '',
        position: editUser.position ?? '',
        password: '',
      });
      setEditPhoto(null);
    }
  }, [editUser]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    Object.entries(filters).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const qs = sp.toString();
    const current = window.location.search;
    const next = qs ? `?${qs}` : '';
    if (current !== next) {
      router.replace(next || window.location.pathname, { scroll: false });
    }
  }, [q, filters, router]);

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

  const columns: TableColumn<SipsUser>[] = useMemo(
    () => [
      {
        name: <span className="block text-center w-full">No</span>,
        width: '50px',
        style: { textAlign: 'center' },
        cell: (_row, idx) => <span className="text-base-content/60">{idx + 1}</span>,
      },
      {
        name: <span className="block text-center w-full">{t('actions')}</span>,
        width: '110px',
        style: { textAlign: 'center' },
        cell: row => (
          <div className="flex gap-0.5">
            <button
              className="btn btn-ghost btn-xs px-1"
              onClick={() => handleEdit(row.id)}
              title={t('edit')}
            >
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button
              className={`btn btn-ghost btn-xs px-1 ${row.status === 'Y' ? 'text-warning' : 'text-success'}`}
              onClick={() => {
                if (row.status === 'Y' && !confirm(t('deactivateConfirm'))) return;
                handleToggleStatus(row);
              }}
              title={row.status === 'Y' ? t('deactivate') : t('activate')}
            >
              <Icon name={row.status === 'Y' ? 'close' : 'check'} className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        name: t('username'),
        sortable: true,
        selector: r => r.username,
        width: '130px',
        cell: row => <span className="block truncate" title={row.username}>{row.username ?? '-'}</span>,
      },
      {
        name: t('fullname'),
        sortable: true,
        selector: r => r.fullname,
        width: '180px',
        cell: row => <span className="block truncate" title={row.fullname}>{row.fullname ?? '-'}</span>,
      },
      {
        name: t('email'),
        sortable: true,
        selector: r => r.email,
        width: '190px',
        cell: row =>
          row.email ? (
            <a
              href={isSafeHref(buildMailtoUrl(row.email)) ? buildMailtoUrl(row.email) : undefined}
              className="link link-primary block truncate w-full"
              title={row.email}
            >
              {row.email}
            </a>
          ) : (
            '-'
          ),
      },
      {
        name: t('phone'),
        sortable: true,
        selector: r => r.phone,
        width: '120px',
        cell: row =>
          row.phone ? (
            <a
              href={buildWhatsAppUrl(row.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary inline-flex items-center gap-1 whitespace-nowrap"
              title={t('openWhatsApp')}
            >
              {row.phone}
              <Icon name="external-link" className="h-3.5 w-3.5" />
            </a>
          ) : (
            '-'
          ),
      },
      {
        name: <span className="block text-center w-full">FCBA</span>,
        sortable: true,
        selector: r => r.fcba,
        width: '60px',
        style: { textAlign: 'center' },
        cell: row => <span className="truncate">{row.fcba ?? '-'}</span>,
      },
      {
        name: t('afdeling'),
        sortable: true,
        selector: r => r.afdeling,
        width: '90px',
        cell: row => <span className="block truncate" title={row.afdeling}>{row.afdeling ?? '-'}</span>,
      },
      {
        name: t('gangcode'),
        sortable: true,
        selector: r => r.gangcode,
        width: '90px',
        cell: row => <span className="block truncate" title={row.gangcode}>{row.gangcode ?? '-'}</span>,
      },
      {
        name: <span className="block text-center w-full">{t('position')}</span>,
        sortable: true,
        selector: r => r.position,
        width: '150px',
        cell: row => (
          <div className="flex items-center gap-1 min-w-0">
            <span className="block truncate min-w-0" title={row.position}>{row.position ?? '-'}</span>
            {row.level && <span className="badge badge-ghost badge-xs shrink-0">{row.level}</span>}
          </div>
        ),
      },
      {
        name: <span className="block text-center w-full">{t('status')}</span>,
        sortable: true,
        selector: r => r.status,
        width: '80px',
        style: { textAlign: 'center' },
        cell: row => <StatusBadge status={row.status} label={row.status === 'Y' ? t('active') : t('inactive')} />,
      },
      {
        name: <span title={t('photo')}>{t('photo')}</span>,
        width: '70px',
        cell: row =>
          row.photo ? (
            <PhotoCell imageUrl={row.photo} alt="foto" href={row.photo} size={40} />
          ) : (
            '-'
          ),
        ignoreRowClick: true,
      },
    ],
    [t, handleEdit, handleToggleStatus]
  );

  return (
    <PageLayout>
        {/* ── Header ── */}
        <Toolbar
          title={t('userManagement')}
          actions={[
            { key: 'filter', label: showFilters ? t('hideFilters') : t('showFilters'), icon: 'filter', onClick: () => setShowFilters(s => !s), variant: 'outline', tour: 'filter-button' },
            { key: 'refresh', label: isFetching ? t('loading') : t('refresh'), icon: 'refresh', onClick: () => queryClient.invalidateQueries({ queryKey: QueryKeys.USERS() }), disabled: isFetching, loading: isFetching, variant: 'outline' },
            { key: 'export', label: t('export'), icon: 'export', onClick: handleExport, variant: 'outline' },
            { key: 'add', label: t('addUser'), icon: 'plus', onClick: () => { const df = isFcbaRestricted ? userFcba : ''; setForm({ ...initialUserForm, fcba: df }); setSelFcba(df); setSelAfdeling(''); setAddOpen(true); }, variant: 'primary', tour: 'add-button' },
            { key: 'bulk', label: t('bulkAdd'), icon: 'people', onClick: () => { const df = isFcbaRestricted ? userFcba : ''; setBulkRows([{ ...initialBulkRow, fcba: df }]); setBulkFcba(df); setBulkAfdeling(''); setBulkGang(''); setBulkOpen(true); }, variant: 'outline' },
          ]}
        >
          <AppTour steps={tourSteps} storageKey="tour-users" onStepChange={stepIndex => { if (stepIndex === 3) { setShowFilters(true); } }} btnClassName="join-item flex-1 sm:flex-none" />
        </Toolbar>

        {/* ── Search & View Toggle ── */}
        <div className="flex items-center gap-2 justify-end mb-3">
          <QuickSearch value={q} onChange={setQ} placeholder={t('searchPlaceholder')} className="w-full sm:w-72 sm:shrink-0" />
          <div className="join flex-none">
            <button
              className="btn btn-outline join-item"
              onClick={() => setViewMode(v => (v === 'table' ? 'gallery' : 'table'))}
              title={viewMode === 'table' ? t('galleryView') : t('tableView')}
            >
              <Icon name={viewMode === 'table' ? 'layout-grid' : 'list'} className="h-4 w-4" />
              <span className="hidden sm:inline">{viewMode === 'table' ? t('galleryView') : t('tableView')}</span>
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
                title={allExpanded ? t('closeAll') : t('openAll')}
              >
                <Icon name="chevron-down" className={`h-4 w-4 ${allExpanded ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">{allExpanded ? t('closeAll') : t('openAll')}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Filters ── */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'fcba', label: 'FCBA', type: 'search-select', options: scopedFcbaOptions, disabled: isFcbaRestricted, placeholder: 'FCBA' },
              { key: 'afdeling', label: t('afdeling'), type: 'search-select', options: [{ value: '', label: t('filterAll') }, ...afdelingFilterOptions], placeholder: t('afdeling') },
              { key: 'gangcode', label: t('gangcode'), type: 'search-select', options: [{ value: '', label: t('filterAll') }, ...gangcodeFilterOptions], placeholder: t('gangcode') },
              { key: 'level', label: t('level'), type: 'search-select', options: [{ value: '', label: t('filterAll') }, ...visibleLevelOptions], placeholder: t('level') },
              { key: 'position', label: t('position'), type: 'search-select', options: [{ value: '', label: t('filterAll') }, ...visiblePositionOptions], placeholder: t('position') },
            ]}
            values={filters}
            onChange={(key, value) => {
              if (key.startsWith('__q_')) return;
              setFilters(prev => ({ ...prev, [key]: value || undefined }));
            }}
            onApply={() => setAppliedFilters({ ...filters })}
            onReset={clearFilters}
            showApply={true}
            showReset={true}
          />
        )}

        {/* ── Table / Gallery ── */}
        {viewMode === 'table' ? (
          isLoading ? (
            <SkeletonTable rows={10} />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              namespace="Users"
              onClearSearch={() => {
                setQ('');
                clearFilters();
              }}
            />
          ) : (
            <AppDataTable
              columns={columns}
              data={filteredUsers}
              paginationPerPage={25}
              paginationRowsPerPageOptions={[10, 25, 50, 100]}
              striped
              noDataComponent={<EmptyState namespace="Users" />}
            />
          )
        ) : (
          <div className="animate-slideUp [animation-delay:200ms]">
            {isLoading ? (
              <div className="p-8">
                <SkeletonTable rows={10} />
              </div>
            ) : (
              <UsersGalleryView
                ref={galleryRef}
                items={filteredUsers}
                onClearSearch={
                  q || Object.keys(appliedFilters).length > 0
                    ? () => {
                        setQ('');
                        clearFilters();
                      }
                    : undefined
                }
              />
            )}
          </div>
        )}

      {/* ═══════════════════════ ADD USER MODAL ═══════════════════════ */}
      <FormModal
        open={addOpen}
        title={t('addUser')}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddUser}
        loading={registerMutation.isPending}
        cancelText={t('cancel')}
        confirmText={t('save')}
      >
        {/* Account Information */}
        <SectionHeader title={t('accountInfo')} />
        <fieldset className="fieldset col-span-12 md:col-span-3">
          <legend className="fieldset-legend">{t('username')} *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.username}
            onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-3">
          <legend className="fieldset-legend">{t('fullname')} *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.fullname}
            onChange={e => setForm(s => ({ ...s, fullname: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-3">
          <legend className="fieldset-legend">Email</legend>
          <input
            type="email"
            className="input input-bordered w-full"
            value={form.email}
            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-3">
          <legend className="fieldset-legend">{t('phone')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.phone}
            onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12">
          <legend className="fieldset-legend">{t('password')} *</legend>
          <input
            type="password"
            className="input input-bordered w-full"
            value={form.password}
            onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
            required
            minLength={8}
          />
          <span className="text-[0.6rem] text-base-content/40 mt-0.5 block leading-tight">
            {'Minimal 8 karakter'}
          </span>
        </fieldset>

        {/* Penempatan */}
        <SectionHeader title={t('assignment')} />
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">FCBA</legend>
          <SearchSelect
            options={scopedFcbaOptions}
            value={form.fcba}
            onChange={onChangeFcba}
            placeholder={t('select')}
            translationNamespace="Users"
            disabled={isFcbaRestricted}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('afdeling')}</legend>
          <SearchSelect
            options={sectionOptions}
            value={form.afdeling}
            onChange={onChangeAfdeling}
            placeholder={!form.fcba ? t('selectFcbaFirst') : t('select')}
            translationNamespace="Users"
            disabled={!form.fcba}
          />
          {!form.fcba && (
            <span className="text-[0.6rem] text-base-content/40 mt-0.5 block leading-tight">
              {'Isi FCBA terlebih dahulu'}
            </span>
          )}
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('gangcode')}</legend>
          <SearchSelect
            options={gangOptions}
            value={form.gangcode}
            onChange={onChangeGang}
            placeholder={!form.afdeling ? t('selectAfdelingFirst') : t('select')}
            translationNamespace="Users"
            disabled={!form.afdeling}
          />
        </fieldset>

        {/* Jabatan & Identitas */}
        <SectionHeader title={t('position')} />
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('position')}</legend>
          <select
            className="select select-bordered w-full"
            value={form.position}
            onChange={e => {
              const pos = e.target.value;
              const lvl = POSITION_TO_LEVEL[pos] || '';
              setForm(s => ({ ...s, position: pos, level: lvl }));
            }}
          >
            <option value="">{t('select')}</option>
            {visiblePositionOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('idkaryawan')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={form.idkaryawan}
            onChange={e => setForm(s => ({ ...s, idkaryawan: e.target.value }))}
          />
        </fieldset>
      </FormModal>

      {/* ═══════════════════════ BULK ADD MODAL ═══════════════════════ */}
      <FormModal
        open={bulkOpen}
        title={t('bulkAdd')}
        onClose={() => setBulkOpen(false)}
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); handleBulkSubmit(); }}
        loading={bulkLoading}
        size="full"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setBulkOpen(false)}
              disabled={bulkLoading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="modal-form"
              className="btn btn-secondary btn-sm"
              disabled={bulkLoading}
            >
              {bulkLoading ? <span className="loading loading-spinner loading-sm" /> : null}
              {t('submitAll', {
                count: bulkRows.filter(r => r.username && r.fullname && r.password).length,
              })}
            </button>
          </div>
        }
      >
        {/* Cascading selectors */}
        <div className="col-span-12 bg-base-200/50 -mx-2 sm:-mx-6 px-2 sm:px-6 py-3 border-b border-base-200 mb-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="form-control min-w-[160px] flex-1">
              <label className="label py-0">
                <span className="label-text text-xs font-medium">FCBA</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={bulkFcba}
                onChange={v => {
                  setBulkFcba(v.target.value);
                  setBulkAfdeling('');
                  setBulkGang('');
                }}
                disabled={isFcbaRestricted}
              >
                <option value="">{t('select')}</option>
                {bulkFcba && !scopedFcbaOptions.some(o => o.value === bulkFcba) && (
                  <option value={bulkFcba} disabled>
                    {bulkFcba}
                  </option>
                )}
                {scopedFcbaOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control min-w-[160px] flex-1">
              <label className="label py-0">
                <span className="label-text text-xs font-medium">{t('afdeling')}</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={bulkAfdeling}
                onChange={v => {
                  setBulkAfdeling(v.target.value);
                  setBulkGang('');
                }}
                disabled={!bulkFcba}
              >
                <option value="">{!bulkFcba ? t('selectFcbaFirst') : t('select')}</option>
                {bulkSectionOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control min-w-[160px] flex-1">
              <label className="label py-0">
                <span className="label-text text-xs font-medium">{t('gangcode')}</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={bulkGang}
                onChange={v => setBulkGang(v.target.value)}
                disabled={!bulkAfdeling}
              >
                <option value="">
                  {!bulkAfdeling ? t('selectAfdelingFirst') : t('select')}
                </option>
                {bulkGangOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs mb-0.5"
              onClick={applyBulkDefaults}
              disabled={!bulkFcba && !bulkAfdeling && !bulkGang}
            >
              <Icon name="refresh" className="h-4 w-4" />
              {t('applyDefaults')}
            </button>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="col-span-12">
          <p className="text-sm text-base-content/60 mb-3">{t('bulkHint')}</p>
          <table className="table table-zebra table-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('username')} *</th>
                <th>{t('fullname')} *</th>
                <th>Email</th>
                <th>{t('phone')}</th>
                <th>{t('password')} *</th>
                <th>FCBA</th>
                <th>{t('afdeling')}</th>
                <th>{t('gangcode')}</th>
                <th>{t('position')}</th>
                <th>{t('idkaryawan')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="text-center text-base-content/60">{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-24"
                      value={row.username}
                      onChange={e => updateBulkRow(idx, 'username', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-28"
                      value={row.fullname}
                      onChange={e => updateBulkRow(idx, 'fullname', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      className="input input-bordered input-xs w-28"
                      value={row.email}
                      onChange={e => updateBulkRow(idx, 'email', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-24"
                      value={row.phone}
                      onChange={e => updateBulkRow(idx, 'phone', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="password"
                      className="input input-bordered input-xs w-24"
                      value={row.password}
                      onChange={e => updateBulkRow(idx, 'password', e.target.value)}
                      required
                      minLength={8}
                    />
                  </td>
                  <td>
                    <select
                      className="select select-bordered select-xs w-20"
                      value={row.fcba}
                      onChange={e => updateBulkRow(idx, 'fcba', e.target.value)}
                      disabled={isFcbaRestricted}
                    >
                      <option value="">-</option>
                      {row.fcba && !scopedFcbaOptions.some(o => o.value === row.fcba) && (
                        <option value={row.fcba} disabled>
                          {row.fcba}
                        </option>
                      )}
                      {scopedFcbaOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-20"
                      value={row.afdeling}
                      onChange={e => updateBulkRow(idx, 'afdeling', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-20"
                      value={row.gangcode}
                      onChange={e => updateBulkRow(idx, 'gangcode', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="select select-bordered select-xs w-28"
                      value={row.position}
                      onChange={e => {
                        const pos = e.target.value;
                        const lvl = POSITION_TO_LEVEL[pos] || '';
                        updateBulkRow(idx, 'position', pos);
                        updateBulkRow(idx, 'level', lvl);
                      }}
                    >
                      <option value="">-</option>
                      {visiblePositionOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered input-xs w-28"
                      value={row.idkaryawan}
                      onChange={e => updateBulkRow(idx, 'idkaryawan', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => removeBulkRow(idx)}
                      disabled={bulkRows.length <= 1}
                    >
                      <Icon name="close" className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={addBulkRow}>
            <Icon name="plus" className="h-4 w-4" />
            {t('addRow')}
          </button>
        </div>
      </FormModal>

      {/* ═══════════════════════ EDIT USER MODAL ═══════════════════════ */}
      <FormModal
        open={editOpen}
        title={t('editUser')}
        onClose={() => { setEditOpen(false); setEditPhoto(null); }}
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          if (editForm.password && editForm.password.length < 8) {
            toast.error(t('passwordLength'));
            return;
          }
          const data: Record<string, string> = {};
          const fields = ['username', 'fullname', 'email', 'phone', 'fcba', 'afdeling', 'gangcode', 'idkaryawan', 'level', 'position', 'password'] as const;
          for (const f of fields) {
            if (editForm[f]) data[f] = editForm[f];
          }
          if (editUser) editMutation.mutate({ id: editUser.id, data, photo: editPhoto });
        }}
        loading={editMutation.isPending}
        cancelText={t('cancel')}
        confirmText={t('save')}
      >
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('username')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.username}
            onChange={e => setEditForm(s => ({ ...s, username: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('fullname')} *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.fullname}
            onChange={e => setEditForm(s => ({ ...s, fullname: e.target.value }))}
            required
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">Email</legend>
          <input
            type="email"
            className="input input-bordered w-full"
            value={editForm.email}
            onChange={e => setEditForm(s => ({ ...s, email: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('phone')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.phone}
            onChange={e => setEditForm(s => ({ ...s, phone: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12">
          <legend className="fieldset-legend">{t('password')}</legend>
          <input
            type="password"
            className="input input-bordered w-full"
            value={editForm.password}
            onChange={e => setEditForm(s => ({ ...s, password: e.target.value }))}
            placeholder="••••••••"
            minLength={8}
          />
          <span className="text-[0.6rem] text-base-content/40 mt-0.5 block leading-tight">
            {t('passwordOptionalHint')}
          </span>
        </fieldset>

        <SectionHeader title={t('assignment')} />
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">FCBA</legend>
          <SearchSelect
            options={scopedFcbaOptions}
            value={editForm.fcba}
            onChange={v => setEditForm(s => ({ ...s, fcba: v }))}
            placeholder={t('select')}
            translationNamespace="Users"
            disabled={!isAdmin}
          />
          {!isAdmin && (
            <span className="text-[0.6rem] text-base-content/40 mt-0.5 block leading-tight">
              {t('fcbaAdminOnly')}
            </span>
          )}
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('afdeling')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.afdeling}
            onChange={e => setEditForm(s => ({ ...s, afdeling: e.target.value }))}
          />
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-4">
          <legend className="fieldset-legend">{t('gangcode')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.gangcode}
            onChange={e => setEditForm(s => ({ ...s, gangcode: e.target.value }))}
          />
        </fieldset>

        <SectionHeader title={t('position')} />
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('position')}</legend>
          <select
            className="select select-bordered w-full"
            value={editForm.position}
            onChange={e => {
              const pos = e.target.value;
              const lvl = POSITION_TO_LEVEL[pos] || '';
              setEditForm(s => ({ ...s, position: pos, level: lvl }));
            }}
          >
            <option value="">{t('select')}</option>
            {visiblePositionOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset col-span-12 md:col-span-6">
          <legend className="fieldset-legend">{t('idkaryawan')}</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={editForm.idkaryawan}
            onChange={e => setEditForm(s => ({ ...s, idkaryawan: e.target.value }))}
          />
        </fieldset>

        <SectionHeader title={t('photo')} />
        <fieldset className="fieldset col-span-12 flex justify-center">
          <PhotoUpload
            value={editPhoto || (editUser?.photo ?? null)}
            onChange={f => setEditPhoto(f)}
          />
        </fieldset>
      </FormModal>
    </PageLayout>
  );
}
