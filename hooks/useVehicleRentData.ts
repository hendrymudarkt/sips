'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type { Option } from '@/app/components/ui/search-select';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { extractArrayData } from '@/utils/api/apiHelpers';
import { cookieStore } from '@/utils/auth/cookieStore';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { QueryKeys } from '@/utils/queryKeys';
import { formatPerfDate } from '@/utils/helpers/perf-formatter';
import { useLocale } from '@/hooks/useLocale';
import type { VehicleRent, VehicleRentFormState, VehicleRentFilters } from '@/types/domain';
import { initialVehicleRentForm } from '@/types/domain';

export type MasterContract = {
  agreementcode?: string;
  agreementdate?: string;
  contractorcode?: string;
  contractorname?: string;
  startdate?: string;
  finishdate?: string;
  fcba?: string;
  [key: string]: unknown;
};

const getTodayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

const formatDate = (v?: string | null) => {
  if (!v) return '';
  const s = String(v);
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : s.split(' ')[0];
};

const daysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

export const isValidNik = (nik: string): boolean => {
  if (!/^\d{16}$/.test(nik)) return false;
  const province = Number(nik.slice(0, 2));
  if (province < 11 || province > 97) return false;

  let day = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const year = 1900 + Number(nik.slice(10, 12));
  if (day > 40) day -= 40;
  if (month < 1 || month > 12 || day < 1) return false;
  if (day > daysInMonth(month, year)) return false;

  if (nik.slice(12, 16) === '0000') return false;
  return true;
};

export function useVehicleRentData() {
  const localeTag = useLocale();
  const t = useTranslations('VehicleRent');
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<VehicleRentFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<VehicleRentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [userLevel, setUserLevel] = useState('');
  const [homeFcba, setHomeFcba] = useState('');

  const canModify = userLevel === 'ADM' || userLevel === 'KSI';

  useEffect(() => {
    setUserLevel(cookieStore.getLevel());
    setHomeFcba(cookieStore.getFcba());
  }, []);

  const effectiveFilters = useMemo<VehicleRentFilters>(() => {
    if (!userLevel || userLevel === 'ADM' || !homeFcba) return appliedFilters;
    return { ...appliedFilters, fcba: homeFcba };
  }, [appliedFilters, userLevel, homeFcba]);

  const formatFilterParams = useCallback((f: VehicleRentFilters): string => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    return params.toString();
  }, []);

  const {
    data: items = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: QueryKeys.VEHICLE_RENTS(effectiveFilters as Record<string, string>),
    queryFn: async () => {
      const params = formatFilterParams(effectiveFilters);
      const res = await fetch(`/api/vehicle-rents${params ? `?${params}` : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          await logoutAndRedirect();
          return [];
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      return extractArrayData<VehicleRent>(json).map((r, i) => ({
        ...r,
        _rowKey: String(r.id ?? i),
        _displayDate: formatDate(r.tanggal) ? formatPerfDate(formatDate(r.tanggal), localeTag) : '-',
        _displayValidFrom: formatDate(r.valid_from) ? formatPerfDate(formatDate(r.valid_from), localeTag) : '-',
        _displayValidUntil: formatDate(r.valid_until) ? formatPerfDate(formatDate(r.valid_until), localeTag) : '-',
      }));
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const filteredItems = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    const searchable = (r: VehicleRent) =>
      `${r.contract_no ?? ''} ${r.vehicle_code ?? ''} ${r.vehicle_name ?? ''} ${r.registration_no ?? ''} ${r.nik ?? ''} ${r.driver_name ?? ''} ${r.fcba ?? ''} ${r.tanggal ?? ''}`.toLowerCase();
    return items.filter(r => searchable(r).includes(s));
  }, [items, q]);

  // ─── Contracts (dependent on selected tanggal) ────────────────────────────
  const [form, setForm] = useState<VehicleRentFormState>(initialVehicleRentForm);
  const [isEditing, setIsEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const contractFcba = !userLevel || userLevel === 'ADM' ? form.fcba || undefined : homeFcba || undefined;

  const { data: contracts = [], isFetching: isFetchingContracts } = useQuery({
    queryKey: QueryKeys.CONTRACTS(form.tanggal || undefined, contractFcba),
    queryFn: async () => {
      const url = new URL('/api/master/contracts', window.location.origin);
      if (form.tanggal) url.searchParams.append('tanggal', form.tanggal);
      if (contractFcba) url.searchParams.append('fcba', contractFcba);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          await logoutAndRedirect();
          return [];
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      return extractArrayData<MasterContract>(json);
    },
    enabled: !!form.tanggal,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const contractOptions: Option[] = useMemo(
    () =>
      contracts
        .filter(c => c.agreementcode)
        .map(c => ({
          value: c.agreementcode as string,
          label: `${c.agreementcode}${c.contractorname ? ` - ${c.contractorname}` : ''}${c.fcba ? ` (${c.fcba})` : ''}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [contracts]
  );

  const contractByCode = useMemo(() => {
    const map = new Map<string, MasterContract>();
    for (const c of contracts) {
      if (c.agreementcode) map.set(c.agreementcode, c);
    }
    return map;
  }, [contracts]);

  const handleContractChange = (code: string) => {
    const c = contractByCode.get(code);
    setForm(s => ({
      ...s,
      contract_no: code,
      valid_from: c?.startdate ? String(c.startdate).split(' ')[0] : '',
      valid_until: c?.finishdate ? String(c.finishdate).split(' ')[0] : '',
    }));
  };

  const resetForm = () => {
    setForm({
      ...initialVehicleRentForm,
      tanggal: getTodayISO(),
      fcba: userLevel && userLevel !== 'ADM' && homeFcba ? homeFcba : '',
    });
  };

  const openNewRecord = () => {
    if (!canModify) return;
    resetForm();
    setIsEditing(false);
    setOpen(true);
  };

  const openEditRecord = useCallback(
    (row: VehicleRent) => {
      if (!canModify) return;
      setForm({
        id: String(row.id),
        tanggal: formatDate(row.tanggal),
        contract_no: row.contract_no || '',
        fcba: row.fcba || '',
        vehicle_code: row.vehicle_code || '',
        vehicle_name: row.vehicle_name || '',
        registration_no: row.registration_no || '',
        nik: row.nik || '',
        driver_name: row.driver_name || '',
        valid_from: formatDate(row.valid_from),
        valid_until: formatDate(row.valid_until),
      });
      setIsEditing(true);
      setOpen(true);
    },
    [canModify]
  );

  const buildBody = (): Record<string, string> => {
    const body: Record<string, string> = {};
    const fields: (keyof VehicleRentFormState)[] = [
      'tanggal',
      'contract_no',
      'fcba',
      'vehicle_code',
      'vehicle_name',
      'registration_no',
      'nik',
      'driver_name',
      'valid_from',
      'valid_until',
    ];
    for (const f of fields) {
      const v = form[f];
      if (v !== undefined && v !== null && v !== '') body[f] = v;
    }
    return body;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEditing && !form.id) {
      toast.error(t('toastIdRequired'));
      return;
    }
    const requiredFields: [keyof VehicleRentFormState, string][] = [
      ['tanggal', t('formTanggal')],
      ['contract_no', t('formContractNo')],
      ['vehicle_code', t('formVehicleCode')],
      ['vehicle_name', t('formVehicleName')],
      ['registration_no', t('formRegistrationNo')],
      ['nik', t('formNik')],
      ['driver_name', t('formDriverName')],
      ['valid_from', t('formValidFrom')],
      ['valid_until', t('formValidUntil')],
    ];
    const missing = requiredFields.filter(([k]) => !String(form[k]).trim());
    if (missing.length > 0) {
      toast.error(t('toastRequiredFields', { fields: missing.map(([, label]) => label).join(', ') }));
      return;
    }
    if (form.nik && !isValidNik(form.nik)) {
      toast.error(t('toastNikInvalid'));
      return;
    }
    setSubmitLoading(true);
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const url = isEditing
        ? `/api/vehicle-rents/${encodeURIComponent(form.id)}`
        : '/api/vehicle-rents';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(buildBody()),
        credentials: 'include',
      });
      const json = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return;
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || t('toastSaveError'));
      }
      toast.success(isEditing ? t('toastSaveSuccess') : t('toastAddSuccess'));
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: QueryKeys.VEHICLE_RENTS() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toastSaveError'));
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      const res = await fetch(`/api/vehicle-rents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      const json = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || t('toastDeleteError'));
      }
      return id;
    },
    onSuccess: () => {
      toast.success(t('toastDeleteSuccess'));
      setDeleteOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: QueryKeys.VEHICLE_RENTS() });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleDeleteRecord = useCallback(
    (row: VehicleRent) => {
      if (!canModify) return;
      setDeleteTarget({
        id: String(row.id),
        label: row.contract_no || String(row.id),
      });
      setDeleteOpen(true);
    },
    [canModify]
  );

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast.error(t('noData'));
      return;
    }
    const dataToExport = filteredItems.map((r, idx) => ({
      No: idx + 1,
      [t('colTanggal')]: r._displayDate ?? '-',
      [t('colContractNo')]: r.contract_no ?? '-',
      FCBA: r.fcba ?? '-',
      [t('colVehicleCode')]: r.vehicle_code ?? '-',
      [t('colVehicleName')]: r.vehicle_name ?? '-',
      [t('colRegistrationNo')]: r.registration_no ?? '-',
      NIK: r.nik ?? '-',
      [t('colDriverName')]: r.driver_name ?? '-',
      [t('colValidFrom')]: r._displayValidFrom ?? '-',
      [t('colValidUntil')]: r._displayValidUntil ?? '-',
    }));
    exportJsonToCsv(dataToExport, `VehicleRents_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const loading = isLoading || isFetching;

  return {
    q, setQ,
    showFilters, setShowFilters,
    filters, setFilters, setAppliedFilters,
    items: filteredItems,
    loading, isFetching,
    canModify,
    open, setOpen, isEditing,
    form, setForm,
    contractOptions, isFetchingContracts,
    handleContractChange,
    submitLoading,
    handleSubmit,
    openEditRecord, openNewRecord,
    deleteOpen, deleteTarget,
    closeDeleteModal: () => setDeleteOpen(false),
    handleDeleteRecord, handleConfirmDelete,
    deleteMutation,
    handleExport,
    queryClient,
  };
}