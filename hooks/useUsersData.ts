'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type { Option } from '@/app/components/ui/search-select';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { extractArrayData, extractSingleData } from '@/utils/api/apiHelpers';
import { fetchGangs, fetchSections } from '@/utils/services/masterDataService';
import { useCascadingPicker } from './useCascadingPicker';
import { cookieStore } from '@/utils/auth/cookieStore';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { QueryKeys } from '@/utils/queryKeys';
import type { SipsUser, UserFormState, UserFilters } from '@/types/domain';
import { initialUserForm } from '@/types/domain';
import { getCachedCollator } from '@/utils/helpers/perf-formatter';

function isSipsUser(v: unknown): v is SipsUser {
  if (!v || typeof v !== 'object') return false;
  const u = v as Record<string, unknown>;
  return typeof u.id === 'number' || typeof u.id === 'string';
}

export function useUsersData(initialQ = '', initialFilters: UserFilters = {}) {
  const t = useTranslations('Users');
  const queryClient = useQueryClient();
  const searchInputRef = useSearchShortcut();
  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userLevel, setUserLevel] = useState('');
  const [userFcba, setUserFcba] = useState('');

  const effectiveFilters = useMemo<UserFilters>(() => {
    if (!userLevel || userLevel === 'ADM' || !userFcba) return filters;
    return { ...filters, fcba: userFcba };
  }, [filters, userLevel, userFcba]);

  const formatFilterParams = useCallback((f: UserFilters): string => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) params.append(k, v as string);
    });
    return params.toString();
  }, []);

  const {
    data: users = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: QueryKeys.USERS(effectiveFilters),
    queryFn: async () => {
      const params = formatFilterParams(effectiveFilters);
      const res = await fetch(`/api/master/sips-users${params ? `?${params}` : ''}`, {
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
      return extractArrayData<SipsUser>(json).filter(isSipsUser);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { enrichedUsers, afdelingFilterOptions, gangcodeFilterOptions } =
    useMemo(() => {
      const afdSet = new Set<string>();
      const gangSet = new Set<string>();

      const enriched = users.map(u => {
        if (u.afdeling) afdSet.add(u.afdeling);
        if (u.gangcode) gangSet.add(u.gangcode);

        return {
          ...u,
          _search:
            `${u.username ?? ''} ${u.fullname ?? ''} ${u.email ?? ''} ${u.phone ?? ''} ${u.fcba ?? ''} ${u.afdeling ?? ''} ${u.gangcode ?? ''} ${u.level ?? ''} ${u.position ?? ''} ${u.idkaryawan ?? ''}`.toLowerCase(),
        };
      });

      const toOption = (v: string) => ({ value: v, label: v });
      const collator = getCachedCollator('id-ID');
      const sorter = (a: Option, b: Option) => collator.compare(a.label, b.label);

      return {
        enrichedUsers: enriched,
        afdelingFilterOptions: Array.from(afdSet).map(toOption).sort(sorter),
        gangcodeFilterOptions: Array.from(gangSet).map(toOption).sort(sorter),
      };
    }, [users]);

  const [selFcba, setSelFcba] = useState('');
  const [selAfdeling, setSelAfdeling] = useState('');
  const [form, setForm] = useState<UserFormState>(initialUserForm);

  const onChangeFcba = (v: string) => {
    setSelFcba(v);
    setSelAfdeling('');
    setForm(s => ({ ...s, fcba: v, afdeling: '', gangcode: '' }));
  };
  const onChangeAfdeling = (v: string) => {
    setSelAfdeling(v);
    setForm(s => ({ ...s, afdeling: v, gangcode: '' }));
  };
  const onChangeGang = (v: string) => {
    setForm(s => ({ ...s, gangcode: v }));
  };

  const { fcbaOptions, sectionOptions, gangOptions } = useCascadingPicker(selFcba, selAfdeling);

  const isFcbaRestricted = userLevel !== '' && userLevel !== 'ADM' && !!userFcba;
  const scopedFcbaOptions = useMemo<Option[]>(() => {
    if (!isFcbaRestricted) return fcbaOptions;
    return fcbaOptions.filter(o => o.value === userFcba);
  }, [fcbaOptions, isFcbaRestricted, userFcba]);

  const filteredUsers = useMemo(() => {
    if (!q.trim()) return enrichedUsers;
    const s = q.toLowerCase();
    return enrichedUsers.filter(u => u._search?.includes(s));
  }, [enrichedUsers, q]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'Y' | 'N' }) => {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const res = await fetch(`/api/master/user/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      if (!res.ok || !json.ok)
        throw new Error(String(json.message ?? json.error ?? 'Failed to update status'));
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USERS() });
      toast.success(t('statusUpdated'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.status === 401) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      if (!res.ok || !json.ok)
        throw new Error(String(json.message ?? json.error ?? 'Registration failed'));
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USERS() });
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<SipsUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [bulkRows, setBulkRows] = useState<UserFormState[]>([{ ...initialUserForm, password: '12345678' }]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFcba, setBulkFcba] = useState('');
  const [bulkAfdeling, setBulkAfdeling] = useState('');
  const [bulkGang, setBulkGang] = useState('');

  const { data: bulkSectionOptions = [] } = useQuery({
    queryKey: ['masterSections', 'bulk', bulkFcba],
    queryFn: async () => {
      if (!bulkFcba) return [];
      const rows = await fetchSections({ fcba: bulkFcba });
      const collator = getCachedCollator('id-ID');
      return rows
        .map(s => ({
          value: s.fccode,
          label: s.fcname && s.fcname !== s.fccode ? `${s.fccode} - ${s.fcname}` : s.fccode,
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
    },
    enabled: !!bulkFcba,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: bulkGangOptions = [] } = useQuery({
    queryKey: ['masterGangs', 'bulk', bulkFcba, bulkAfdeling],
    queryFn: async () => {
      if (!bulkFcba || !bulkAfdeling) return [];
      const rows = await fetchGangs({ fcba: bulkFcba, afdeling: bulkAfdeling });
      const collator = getCachedCollator('id-ID');
      return rows
        .map(g => ({
          value: g.fccode,
          label: g.fcname && g.fcname !== g.fccode ? `${g.fccode} - ${g.fcname}` : g.fccode,
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
    },
    enabled: !!bulkFcba && !!bulkAfdeling,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const applyBulkDefaults = () => {
    setBulkRows(prev =>
      prev.map(row => ({
        ...row,
        fcba: bulkFcba || row.fcba,
        afdeling: bulkAfdeling || row.afdeling,
        gangcode: bulkGang || row.gangcode,
      }))
    );
  };

  const handleDetail = useCallback(
    async (id: number) => {
      setDetailLoading(true);
      setDetailOpen(true);
      try {
        const res = await fetch(`/api/master/user/${id}`, { credentials: 'include' });
        const json: unknown = await res.json();
        const d = extractSingleData<SipsUser>(json) || users.find(u => u.id === id) || null;
        if (!res.ok || !d) throw new Error('Failed to load user details');
        setDetailUser(d);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load user details');
        setDetailOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [users]
  );

  const handleToggleStatus = useCallback(
    (user: SipsUser) => {
      statusMutation.mutate({ id: user.id, status: user.status === 'Y' ? 'N' : 'Y' });
    },
    [statusMutation]
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerMutation.isPending) return;
    if (!form.username || !form.fullname || !form.password) {
      toast.error(t('requiredFields'));
      return;
    }
    if (form.password.length < 8) {
      toast.error(t('passwordLength'));
      return;
    }
    const fd = new FormData();
    fd.append('username', form.username);
    fd.append('fullname', form.fullname);
    if (form.email) fd.append('email', form.email);
    if (form.phone) fd.append('phone', form.phone);
    fd.append('password', form.password);
    const submitFcba = isFcbaRestricted ? userFcba : form.fcba;
    if (submitFcba) fd.append('fcba', submitFcba);
    if (form.afdeling) fd.append('afdeling', form.afdeling);
    if (form.gangcode) fd.append('gangcode', form.gangcode);
    if (form.level) fd.append('level', form.level);
    if (form.position) fd.append('position', form.position);
    if (form.idkaryawan) fd.append('idkaryawan', form.idkaryawan);
    registerMutation.mutate(fd, {
      onSuccess: () => {
        toast.success(t('userAdded'));
        setAddOpen(false);
        setForm(initialUserForm);
        setSelFcba('');
        setSelAfdeling('');
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const addBulkRow = () => setBulkRows(prev => [...prev, { ...initialUserForm, password: '12345678' }]);
  const removeBulkRow = (idx: number) => setBulkRows(prev => prev.filter((_, i) => i !== idx));
  const updateBulkRow = (idx: number, field: keyof UserFormState, value: string) =>
    setBulkRows(prev => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const handleBulkSubmit = async () => {
    if (bulkLoading) return;
    const validRows = bulkRows.filter(r => r.username && r.fullname && r.password);
    if (validRows.length === 0) {
      toast.error(t('noValidRows'));
      return;
    }
    setBulkLoading(true);
    let success = 0,
      failed = 0;
    for (const row of validRows) {
      const fd = new FormData();
      fd.append('username', row.username);
      fd.append('fullname', row.fullname);
      if (row.email) fd.append('email', row.email);
      if (row.phone) fd.append('phone', row.phone);
      fd.append('password', row.password);
      const rowFcba = isFcbaRestricted ? userFcba : row.fcba;
      if (rowFcba) fd.append('fcba', rowFcba);
      if (row.afdeling) fd.append('afdeling', row.afdeling);
      if (row.gangcode) fd.append('gangcode', row.gangcode);
      if (row.level) fd.append('level', row.level);
      if (row.position) fd.append('position', row.position);
      if (row.idkaryawan) fd.append('idkaryawan', row.idkaryawan);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const json: Record<string, unknown> = await res.json();
        if (res.ok && json.ok) success++;
        else {
          failed++;
          console.error(`Failed ${row.username}:`, json.message || json.error);
        }
      } catch {
        failed++;
      }
    }
    setBulkLoading(false);
    queryClient.invalidateQueries({ queryKey: QueryKeys.USERS() });
    toast.success(t('bulkResult', { success, failed }));
    if (failed === 0) {
      setBulkOpen(false);
      setBulkRows([{ ...initialUserForm, password: '12345678' }]);
      setBulkFcba('');
      setBulkAfdeling('');
      setBulkGang('');
    }
  };

  const resolveSection = useCallback(
    (fcbaCode: string) => fcbaCode,
    []
  );

  const loading = isLoading || isFetching;

  const handleExport = () => {
    if (filteredUsers.length === 0) {
      toast.error(t('noData'));
      return;
    }
    const dataToExport = filteredUsers.map((r, idx) => ({
      No: idx + 1,
      [t('username')]: r.username ?? '-',
      [t('fullname')]: r.fullname ?? '-',
      Email: r.email ?? '-',
      [t('phone')]: r.phone ?? '-',
      FCBA: r.fcba ?? '-',
      [t('afdeling')]: r.afdeling ?? '-',
      [t('gangcode')]: r.gangcode ?? '-',
      [t('level')]: r.level ?? '-',
      [t('position')]: r.position ?? '-',
      [t('idkaryawan')]: r.idkaryawan ?? '-',
      [t('status')]: r.status === 'Y' ? t('active') : t('inactive'),
    }));
    exportJsonToCsv(dataToExport, `Users_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddOpen(false);
        setBulkOpen(false);
        setDetailOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const level = cookieStore.getLevel();
    const fcba = cookieStore.getFcba();
    setUserLevel(level);
    setUserFcba(fcba);
    if (level && level !== 'ADM' && fcba) {
      setFilters(prev => ({ ...prev, fcba }));
    }
  }, []);

  const clearFilters = () => setFilters({});

  return {
    q, setQ, isSearchFocused, setIsSearchFocused,
    searchInputRef, showFilters, setShowFilters,
    filters, setFilters, clearFilters,
    afdelingFilterOptions, gangcodeFilterOptions,
    scopedFcbaOptions, fcbaOptions,
    isFcbaRestricted, userFcba,
    isLoading, isFetching, loading, filteredUsers,
    selFcba, setSelFcba, selAfdeling, setSelAfdeling,
    form, setForm,
    onChangeFcba, onChangeAfdeling, onChangeGang,
    sectionOptions, gangOptions,
    bulkSectionOptions, bulkGangOptions,
    statusMutation, registerMutation, queryClient,
    addOpen, setAddOpen,
    bulkOpen, setBulkOpen,
    detailOpen, setDetailOpen,
    detailUser, detailLoading,
    setBulkRows, bulkRows, bulkLoading,
    bulkFcba, setBulkFcba,
    bulkAfdeling, setBulkAfdeling,
    bulkGang, setBulkGang,
    applyBulkDefaults,
    addBulkRow, removeBulkRow, updateBulkRow,
    handleBulkSubmit,
    handleDetail, handleToggleStatus,
    handleAddUser, handleExport,
    resolveSection,
  };
}
