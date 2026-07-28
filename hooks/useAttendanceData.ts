'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessUnit } from '@/utils/services/businessUnitService';
import { fetchBusinessUnits } from '@/utils/services/businessUnitService';
import type { SectionMaster } from '@/utils/services/masterDataService';
import { fetchGangs, fetchSections } from '@/utils/services/masterDataService';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { formatPerfDate } from '@/utils/helpers/perf-formatter';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { useLocale } from '@/hooks/useLocale';
import type { Absensi, FormState, Filters, Triplet, Employee, EmployeesApiRow } from '@/types/domain';
import { initialForm } from '@/types/domain';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { getTodayISO, getYesterdayISO } from '@/utils/helpers/datetime';
import { cookieStore } from '@/utils/auth/cookieStore';
import { getFilterCriteria, getLockedFields, type UserLevel } from '@/utils/helpers/filterHelper';
import { getReadableDevice, getOrCreateDeviceIds } from '@/utils/helpers/deviceHelper';
import { extractArrayData, extractSingleData } from '@/utils/api/apiHelpers';
import { fetchAttendanceList, fetchAttendanceDetail, deleteAttendance } from '@/utils/services/attendanceService';
import { QueryKeys } from '@/utils/queryKeys';

function getBusinessUnitLookups(businessUnits: BusinessUnit[] | undefined) {
  const codeMap = new Map<string, BusinessUnit>();
  const nameMap = new Map<string, BusinessUnit>();
  if (Array.isArray(businessUnits)) {
    for (const bu of businessUnits) {
      if (bu.fccode) codeMap.set(bu.fccode, bu);
      if (bu.fcname) nameMap.set(bu.fcname.toLowerCase(), bu);
    }
  }
  return { codeMap, nameMap };
}

function resolveBusinessUnitCode(
  value: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> }
): string {
  if (!value) return '';
  const directMatch = lookups.codeMap.get(value);
  if (directMatch) return directMatch.fccode;
  const nameMatch = lookups.nameMap.get(value.toLowerCase());
  return nameMatch?.fccode || value;
}

function resolveBusinessUnitName(
  value: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> }
): string {
  if (!value) return '';
  const directMatch = lookups.codeMap.get(value);
  if (directMatch) return directMatch.fcname || directMatch.fccode;
  return value;
}

function matchesEmployeeFcba(
  employeeFcba: string | undefined,
  selectedFcba: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> },
  preResolved?: { code: string; name: string }
): boolean {
  const employeeValue = (employeeFcba || '').trim();
  if (!employeeValue || !selectedFcba) return false;
  const selectedCode = preResolved?.code || resolveBusinessUnitCode(selectedFcba, lookups);
  const selectedName = preResolved?.name || resolveBusinessUnitName(selectedFcba, lookups);
  return (
    employeeValue === selectedFcba ||
    employeeValue === selectedCode ||
    employeeValue === selectedName
  );
}

function combineToDate(dateISO: string, hhmm: string): Date | null {
  if (!dateISO || !hhmm) return null;
  const [hhStr, mmStr] = hhmm.split(':');
  const hh = parseInt(hhStr ?? '', 10);
  const mm = parseInt(mmStr ?? '', 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(`${dateISO}T00:00`);
  if (Number.isNaN(+d)) return null;
  d.setHours(hh, mm, 0, 0);
  return d;
}

function combineToApiString(dateISO: string, hhmm: string): string {
  return `${dateISO} ${hhmm}:00`;
}

function hhmm(minutes: number) {
  const m = Math.max(0, Math.floor(minutes));
  const H = Math.floor(m / 60);
  const M = m % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

function diffMinutes(a?: Date | null, b?: Date | null) {
  if (!a || !b) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

function normalizeHM(input: string) {
  const s = (input || '').trim();
  if (!s) return '';
  const m1 = s.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (m1) {
    const H = Math.max(0, parseInt(m1[1] ?? '0', 10) || 0);
    const M = Math.max(0, Math.min(59, parseInt(m1[2] ?? '0') || 0));
    return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
  }
  const m2 = s.match(/^(\d{1,3})$/);
  if (m2) {
    const num = parseInt(m2[1] ?? '0', 10);
    const H = Math.floor(num / 100);
    const M = num % 100;
    return `${String(H).padStart(2, '0')}:${String(Math.min(59, M)).padStart(2, '0')}`;
  }
  return s;
}

export function useAttendanceData() {
  const localeTag = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations('Attendance');
  const [q, setQ] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useSearchShortcut();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [allExpanded, setAllExpanded] = useState(false);
  const galleryRef = useRef<{ expandAll: () => void; collapseAll: () => void }>(null);

  const [filters, setFilters] = useState<Filters>(() => {
    const yesterday = getYesterdayISO();
    const today = getTodayISO();
    return {
      tanggal: yesterday,
      tanggal_end: today,
      kemandoran: '',
      kode_karyawan_mandor: '',
      kode_karyawan: '',
      fcba: '',
      afdeling: '',
      gang: '',
      attendance: '',
      status_attendance: '',
      attendance_type: '',
      fcba_destination: '',
      section_destination: '',
    };
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tanggal = params.get('tanggal');
    const tanggal_end = params.get('tanggal_end');
    if (tanggal || tanggal_end) {
      setFilters(prev => ({
        ...prev,
        ...(tanggal ? { tanggal } : {}),
        ...(tanggal_end ? { tanggal_end } : {}),
      }));
    }
  }, []);

  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [selFcba, setSelFcba] = useState<string>('');
  const [selSection, setSelSection] = useState<string>('');
  const [selGang, setSelGang] = useState<string>('');
  const [homeFcba, setHomeFcba] = useState<string>('');
  const [homeSection, setHomeSection] = useState<string>('');
  const [homeKemandoran, setHomeKemandoran] = useState<string>('');
  const [userFcbaCookie, setUserFcbaCookie] = useState<string>('');
  const [userAfdelingCookie, setUserAfdelingCookie] = useState<string>('');
  const [userLevel, setUserLevel] = useState<UserLevel>('OTHER');
  const [destFcba, setDestFcba] = useState<string>('');
  const [destSection, setDestSection] = useState<string>('');
  const [destSections, setDestSections] = useState<SectionMaster[]>([]);
  const [isLoadingDestSections, setIsLoadingDestSections] = useState(false);
  const [optFcba, setOptFcba] = useState<string[]>([]);

  const isKemandoranScopedUser = (level: UserLevel) => ['MDP', 'KRT', 'KRP'].includes(level);

  const getScopedFilters = useCallback(
    (baseFilters: Filters): Filters => {
      const scopedFilters: Filters = { ...baseFilters };
      const filterCriteria = getFilterCriteria(
        {
          level: userLevel,
          fcba: userFcbaCookie || homeFcba,
          afdeling: userAfdelingCookie || homeSection,
          gang: homeKemandoran,
        },
        'attendance'
      );
      if (filterCriteria.fcba) scopedFilters.fcba = filterCriteria.fcba;
      if (filterCriteria.afdeling) scopedFilters.afdeling = filterCriteria.afdeling;
      if (filterCriteria.kemandoran) scopedFilters.kemandoran = filterCriteria.kemandoran;
      if (isKemandoranScopedUser(userLevel)) {
        scopedFilters.gang = '';
      }
      return scopedFilters;
    },
    [userLevel, homeFcba, homeSection, homeKemandoran, userFcbaCookie, userAfdelingCookie]
  );

  const { isFcbaLocked, isAfdelingLocked, isKemandoranLocked } = useMemo(
    () => getLockedFields(userLevel, 'attendance'),
    [userLevel]
  );

  useEffect(() => {
    setFilters(current => {
      const next = getScopedFilters(current);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [getScopedFilters]);

  const {
    data: items = [],
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: [...QueryKeys.ATTENDANCE(filters as Record<string, string>), userLevel, homeFcba, homeSection, homeKemandoran],
    queryFn: async () => {
      const base = filters;
      let start = (base.tanggal ?? '').trim();
      let end = (base.tanggal_end ?? '').trim();

      if (start && !end) end = start;
      else if (!start && end) start = end;

      if (start && end && end < start) {
        const tmp = start;
        start = end;
        end = tmp;
      }

      const f: Filters = getScopedFilters(base);
      delete f.tanggal;
      delete f.tanggal_end;

      if (start) f.tanggal = start;
      if (end && end !== start) f.tanggal_end = end;

      const params: Record<string, string> = {};
      Object.entries(f).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params[k] = v as string;
        }
      });

      const res = await fetchAttendanceList(params);

      if (!res.ok) {
        if (res.status === 404) return [];
        if (res.status === 401) {
          await logoutAndRedirect();
          return [];
        }
        let detail = `HTTP ${res.status}`;
        try {
          const errBody = await res.clone().json();
          if (errBody?.error) detail = errBody.error;
        } catch {
          /* fallback */
        }
        throw new Error(detail);
      }

      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      const raw = extractArrayData<Absensi>(json);

      const byId = new Map<string, Absensi>();
      for (const row of raw) {
        if (!row?.id || byId.has(row.id)) continue;
        const dateOnly = (row.tanggal || '').split(' ')[0];
        if (start && end) {
          if (!dateOnly || dateOnly < start || dateOnly > end) continue;
        }
        byId.set(row.id, { ...row, _dateOnly: dateOnly });
      }
      return Array.from(byId.values());
    },
    enabled: !!homeFcba || userLevel === 'ADM',
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (queryError) {
      const msg =
        typeof queryError === 'string'
          ? queryError
          : queryError instanceof Error
            ? queryError.message
            : t('toastFetchError');
      toast.error(msg);
    }
  }, [queryError, t]);

  const mutation = useMutation({
    mutationFn: async ({
      url,
      method,
      body,
    }: {
      url: string;
      method: string;
      body: FormData;
    }) => {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      if (csrfToken && !body.has('_csrf_token')) {
        body.append('_csrf_token', csrfToken);
      }
      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(url, { method, body, credentials: 'include', headers });
      if (res.status === 401) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      if (!res.ok || !json.ok) {
        const errorMsg =
          typeof json.message === 'string'
            ? json.message
            : typeof json.error === 'string'
              ? json.error
              : 'Operation failed';
        throw new Error(errorMsg);
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.ATTENDANCE() });
      setOpen(false);
      setForm(s => ({
        ...initialForm,
        id_device: s.id_device,
        mac_address: s.mac_address,
      }));
      setPreview('');
      if (imgRef.current) imgRef.current.value = '';
      if (pdfRef.current) pdfRef.current.value = '';
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const res = await deleteAttendance(id, file);
      if (res.status === 401) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        throw new Error('Unauthorized');
      }
      if (!res.ok || !json.ok) {
        const errorMsg =
          typeof json.message === 'string'
            ? json.message
            : typeof json.error === 'string'
              ? json.error
              : t('toastDeleteError');
        throw new Error(errorMsg);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.ATTENDANCE() });
      toast.success(t('toastDeleteSuccess'));
      setDeleteOpen(false);
      setDeleteTargetId('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [preview, setPreview] = useState<string>('');
  const imgRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);

  const handleGetLocation = (target: 'in' | 'out') => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast.error(t('toastGeolocUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const value = `${latitude},${longitude}`;
        setForm(s =>
          target === 'in' ? { ...s, location_in: value } : { ...s, location_out: value }
        );
      },
      err => {
        console.error('Geolocation error:', err);
        let message = t('toastGeolocError');
        if (err.code === 1 || err.code === window.GeolocationPositionError?.PERMISSION_DENIED) {
          message = t('toastGeolocDenied');
        } else if (
          err.code === 2 ||
          err.code === window.GeolocationPositionError?.POSITION_UNAVAILABLE
        ) {
          message = t('toastGeolocUnavailable');
        } else if (err.code === 3 || err.code === window.GeolocationPositionError?.TIMEOUT) {
          message = t('toastGeolocTimeout');
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    const { deviceId, pseudoMac } = getOrCreateDeviceIds();
    setForm(s => ({
      ...s,
      id_device: s.id_device || `${getReadableDevice()} • ${deviceId}`,
      mac_address: s.mac_address || pseudoMac,
    }));
  }, []);

  useEffect(() => {
    setHomeFcba(cookieStore.getFcba());
    setHomeSection(cookieStore.getSection());
    setHomeKemandoran(cookieStore.getGang());
    setUserFcbaCookie(
      cookieStore.getCookie('user_Fcba') || cookieStore.getCookie('user_fcba') || ''
    );
    setUserAfdelingCookie(
      cookieStore.getCookie('user_Afdeling') || cookieStore.getCookie('user_afdeling') || ''
    );

    const levelRaw = cookieStore.getLevel();
    const upperLevel = levelRaw.toUpperCase();
    const normalizedLevel = upperLevel === 'ADMIN' ? 'ADM' : upperLevel;
    setUserLevel((normalizedLevel as UserLevel) || 'OTHER');

    const ckTrip = cookieStore.getCookie('opt_triplets');
    if (ckTrip) {
      try {
        const arr = JSON.parse(ckTrip) as Triplet[];
        if (Array.isArray(arr) && arr.length) setTriplets(arr);
      } catch {
        /* ignore */
      }
    }

    const ckOptFcba = cookieStore.getCookie('opt_fcba');
    if (ckOptFcba) {
      try {
        const arr = JSON.parse(ckOptFcba) as string[];
        if (Array.isArray(arr)) setOptFcba(arr);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const { data: businessUnits = [], isLoading: isLoadingBU } = useQuery({
    queryKey: QueryKeys.BUSINESS_UNITS(),
    queryFn: async () => {
      try {
        const bu = await fetchBusinessUnits();
        localStorage.setItem('business_units', JSON.stringify(bu));
        return bu;
      } catch (err) {
        console.warn('failed to fetch business units:', err);
        const cached = localStorage.getItem('business_units');
        if (cached) {
          try {
            return JSON.parse(cached) as BusinessUnit[];
          } catch {
            return [];
          }
        }
        return [];
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const buLookups = useMemo(() => getBusinessUnitLookups(businessUnits), [businessUnits]);

  const selectedFcbaCodeForMaster = useMemo(
    () => resolveBusinessUnitCode(selFcba || homeFcba || '', buLookups),
    [selFcba, homeFcba, buLookups]
  );

  const { data: masterSections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: QueryKeys.MASTER_SECTIONS(),
    queryFn: async () => {
      try {
        const rows = await fetchSections();
        localStorage.setItem('master_sections', JSON.stringify(rows));
        return rows;
      } catch (err) {
        console.warn('failed to fetch master sections:', err);
        const cached = localStorage.getItem('master_sections');
        if (cached) {
          try {
            return JSON.parse(cached) as SectionMaster[];
          } catch {
            return [];
          }
        }
        return [];
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: masterGangs = [], isLoading: isLoadingGangs } = useQuery({
    queryKey: QueryKeys.MASTER_GANGS(selectedFcbaCodeForMaster, selSection),
    queryFn: async () => {
      if (!selectedFcbaCodeForMaster || !selSection) return [];
      return fetchGangs({ fcba: selectedFcbaCodeForMaster, afdeling: selSection });
    },
    enabled: !!selectedFcbaCodeForMaster && !!selSection,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: employees = [], isLoading: isLoadingSmp } = useQuery({
    queryKey: [...QueryKeys.EMPLOYEES(userLevel, homeFcba, homeSection)],
    queryFn: async () => {
      let apiUrl = '/api/master/karyawans';
      const params = new URLSearchParams();

      if (userLevel === 'AST' || userLevel === 'KRA') {
        if (homeFcba) params.append('fcba', homeFcba);
        if (homeSection) params.append('sectionname', homeSection);
      } else if (userLevel === 'ADM' || userLevel === 'MGR' || userLevel === 'KSI') {
        if (homeFcba) params.append('fcba', homeFcba);
      }

      if (params.toString()) apiUrl += `?${params.toString()}`;

      const r = await fetch(apiUrl, { credentials: 'include' });
      const j: unknown = await r.json();
      const rowsRaw = extractArrayData<EmployeesApiRow>(j);

      const ckTrip = cookieStore.getCookie('opt_triplets');
      if (!ckTrip && rowsRaw.length > 0) {
        const map = new Map<string, Triplet>();
        for (const it of rowsRaw) {
          const fcba = String(it.fcba ?? '').trim();
          const sectionname = String(it.sectionname ?? '').trim();
          const gangcode = String(it.gangcode ?? '').trim();
          if (!fcba && !sectionname && !gangcode) continue;
          const key = `${fcba}|${sectionname}|${gangcode}`;
          if (!map.has(key)) map.set(key, { fcba, sectionname, gangcode });
        }
        setTriplets(Array.from(map.values()));
      }

      const mapSmp = new Map<string, Employee>();
      for (const it of rowsRaw) {
        const fccode = String(it.fccode ?? '').trim();
        if (!fccode) continue;
        if (!mapSmp.has(fccode)) {
          const noancakValue =
            (it as { noancak?: unknown }).noancak ?? (it as { NOANCAK?: unknown }).NOANCAK;
          const noancak = typeof noancakValue === 'string' ? noancakValue.trim() : undefined;

          mapSmp.set(fccode, {
            fccode,
            fullname: typeof it.fcname === 'string' ? it.fcname : undefined,
            fcba: String(it.fcba ?? '').trim(),
            sectionname: String(it.sectionname ?? '').trim(),
            gangcode: String(it.gangcode ?? '').trim(),
            noancak,
          });
        }
      }
      return Array.from(mapSmp.values());
    },
    enabled: !!homeFcba || userLevel === 'ADM',
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (isEditing) return;

    if (userLevel === 'ADM') {
      setSelFcba(prev => prev || homeFcba || '');
      setForm(s => ({ ...s, fcba: s.fcba || homeFcba || '' }));
    } else {
      setSelFcba(homeFcba || '');
      setForm(s => ({ ...s, fcba: homeFcba || '' }));
    }

    if (userLevel === 'AST' || userLevel === 'KRA') {
      setSelSection(homeSection || '');
      setForm(s => ({ ...s, section: homeSection || '' }));
    } else if (userLevel === 'KRT') {
      setSelSection(homeSection || '');
      setForm(s => ({ ...s, section: homeSection || '' }));
      setSelGang(homeKemandoran || '');
    } else if (userLevel === 'MD1') {
      setSelSection(homeSection || '');
      setForm(s => ({ ...s, section: homeSection || '' }));
    } else {
      setSelSection('');
      setForm(s => ({ ...s, section: '' }));
    }

    if (userLevel !== 'KRT') setSelGang('');
    setForm(s => ({ ...s, kode_karyawan: '' }));
  }, [form.attendance_type, homeFcba, homeSection, homeKemandoran, userLevel, isEditing]);

  const fcbaOptions = useMemo(() => {
    if (businessUnits && businessUnits.length) {
      return businessUnits
        .map(b => ({
          value: b.fccode,
          label: b.fcname ? `${b.fccode} - ${b.fcname}` : b.fccode,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return Array.from(new Set(triplets.map(t => t.fcba).filter(Boolean)))
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [triplets, businessUnits]);

  const homeFcbaCode = useMemo(
    () => resolveBusinessUnitCode(homeFcba, buLookups),
    [homeFcba, buLookups]
  );

  const currentFcbaForForm = useMemo(
    () =>
      userLevel === 'ADM' ? selFcba || homeFcbaCode || '' : homeFcbaCode || selFcba || '',
    [userLevel, selFcba, homeFcbaCode]
  );

  const sectionOptions = useMemo(() => {
    if (!selFcba) return [];
    const fcbaCode = resolveBusinessUnitCode(selFcba, buLookups);
    const sectionsFromMaster = masterSections
      .filter(section => section.fcba === fcbaCode)
      .filter(section => section.fccode !== destSection)
      .map(section => ({
        value: section.fccode,
        label:
          section.fcname && section.fcname !== section.fccode
            ? `${section.fccode} - ${section.fcname}`
            : section.fccode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (sectionsFromMaster.length) return sectionsFromMaster;

    return Array.from(
      new Set(
        triplets
          .filter(t => {
            if (t.fcba === selFcba) return true;
            const buMatch = buLookups.codeMap.get(selFcba);
            if (buMatch && t.fcba === buMatch.fcname) return true;
            return false;
          })
          .map(t => t.sectionname)
          .filter(section => section !== destSection)
          .filter(Boolean)
      )
    )
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [triplets, selFcba, buLookups, masterSections, destSection]);

  const gangOptions = useMemo(() => {
    if (!selFcba || !selSection) return [];
    const gangsFromMaster = masterGangs
      .map(gang => ({
        value: gang.fccode,
        label:
          gang.fcname && gang.fcname !== gang.fccode
            ? `${gang.fccode} - ${gang.fcname}`
            : gang.fccode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (gangsFromMaster.length) return gangsFromMaster;

    let fcbaName = selFcba;
    const buMatch = buLookups.codeMap.get(selFcba);
    if (buMatch) fcbaName = buMatch.fcname || selFcba;

    return Array.from(
      new Set(
        triplets
          .filter(t => t.fcba === fcbaName && t.sectionname === selSection)
          .map(t => t.gangcode)
          .filter(Boolean)
      )
    )
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [triplets, selFcba, selSection, buLookups, masterGangs]);

  const currentFcbaPreresolved = useMemo(() => {
    const fcba = currentFcbaForForm || form.fcba || selFcba;
    if (!fcba) return undefined;
    return {
      value: fcba,
      code: resolveBusinessUnitCode(fcba, buLookups),
      name: resolveBusinessUnitName(fcba, buLookups),
    };
  }, [currentFcbaForForm, form.fcba, selFcba, buLookups]);

  const employeeOptions = useMemo(() => {
    if (!selFcba || !selSection || !selGang || !currentFcbaPreresolved) return [];

    const pool = employees.filter(
      e =>
        matchesEmployeeFcba(e.fcba, currentFcbaPreresolved.value, buLookups, {
          code: currentFcbaPreresolved.code,
          name: currentFcbaPreresolved.name,
        }) &&
        (e.sectionname || '') === selSection &&
        (e.gangcode || '') === selGang
    );
    const map = new Map<string, string>();
    for (const e of pool) {
      const value = (e.fccode || '').trim();
      if (!value) continue;
      const label = e.fullname ? `${e.fullname}` : value;
      if (!map.has(value)) map.set(value, label);
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [employees, selFcba, selSection, selGang, currentFcbaPreresolved, buLookups]);

  const destOptions = useMemo(() => {
    if (businessUnits && businessUnits.length > 0) {
      return businessUnits
        .map(bu => ({
          value: bu.fccode,
          label: bu.fcname ? `${bu.fccode} - ${bu.fcname}` : bu.fccode,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    if (optFcba && optFcba.length > 0) {
      return optFcba
        .map(fcba => ({ value: fcba, label: fcba }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return fcbaOptions;
  }, [optFcba, fcbaOptions, businessUnits]);

  const destSectionOptions = useMemo(() => {
    if (!destFcba) return [];
    return destSections
      .filter(section => section.fccode !== selSection)
      .map(section => ({
        value: section.fccode,
        label:
          section.fcname && section.fcname !== section.fccode
            ? `${section.fccode} - ${section.fcname}`
            : section.fccode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [destFcba, destSections, selSection]);

  const mandorOptions = useMemo(() => {
    const fcba = currentFcbaForForm || form.fcba || homeFcbaCode || homeFcba || '';
    const section = selSection || form.section || homeSection || '';

    const isFcbaCurrent =
      currentFcbaPreresolved &&
      fcba === (currentFcbaPreresolved.value || currentFcbaForForm || form.fcba || selFcba);

    const preresolved = isFcbaCurrent
      ? { code: currentFcbaPreresolved!.code, name: currentFcbaPreresolved!.name }
      : {
          code: resolveBusinessUnitCode(fcba, buLookups),
          name: resolveBusinessUnitName(fcba, buLookups),
        };

    const pool = employees.filter(
      e =>
        matchesEmployeeFcba(e.fcba, fcba, buLookups, preresolved) &&
        (e.sectionname || '') === section
    );

    const map = new Map<string, string>();
    for (const e of pool) {
      const value = (e.fccode || '').trim();
      if (!value) continue;
      const gangLabel = (e.gangcode || '').trim();
      const fullname = e.fullname ? ` - ${e.fullname}` : '';
      const label = gangLabel ? `${gangLabel} • ${value}${fullname}` : `${value}${fullname}`;
      const name = (e.fullname || '').trim();
      if (!map.has(value)) map.set(value, gangLabel ? `${gangLabel} - ${name || value}` : label);
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [
    employees,
    currentFcbaForForm,
    form.fcba,
    homeFcbaCode,
    homeFcba,
    homeSection,
    selSection,
    form.section,
    buLookups,
    currentFcbaPreresolved,
    selFcba,
  ]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      const code = (e.fccode || '').trim();
      if (code && !map.has(code)) map.set(code, e);
    }
    return map;
  }, [employees]);

  const selectedMandorGang = useMemo(
    () => employeeMap.get(form.kode_karyawan_mandor)?.gangcode || form.kemandoran || '',
    [employeeMap, form.kode_karyawan_mandor, form.kemandoran]
  );

  const onChangeMandor = (fccode: string) => {
    const mandor = employeeMap.get(fccode);
    setForm(s => ({
      ...s,
      kode_karyawan_mandor: fccode,
      kemandoran: mandor?.gangcode || '',
    }));
  };

  const onChangeSection = (v: string) => {
    setSelSection(v);
    setSelGang('');
    if (destSection === v) setDestSection('');
    setForm(s => ({ ...s, section: v, kode_karyawan: '', pengancakan: '' }));
  };

  const onChangeGang = (v: string) => {
    setSelGang(v);
    setForm(s => ({ ...s, gang: v, kode_karyawan: '', pengancakan: '' }));
  };

  const onChangeEmployee = (fccode: string) => {
    const emp = employeeMap.get(fccode);
    setForm(s => ({
      ...s,
      kode_karyawan: fccode,
      pengancakan: emp?.noancak ?? s.pengancakan,
    }));
  };

  const onChangeDestFcba = (v: string) => {
    setDestFcba(v);
    setForm(s => ({ ...s, fcba_destination: v }));
    if (!v) {
      setDestSections([]);
      setDestSection('');
    }
  };

  const onChangeDestSection = (v: string) => {
    if (v && v === selSection) {
      toast.error(t('toastSectionDestSame'));
      return;
    }
    setDestSection(v);
    setForm(s => ({ ...s, section_destination: v }));
  };

  useEffect(() => {
    if (!destFcba) return;

    const destCode = resolveBusinessUnitCode(destFcba, buLookups);

    setIsLoadingDestSections(true);
    fetchSections({ fcba: destCode })
      .then(sections => {
        setDestSections(sections);
        const filtered = sections.filter(s => s.fccode !== selSection);
        if (filtered.length > 0) {
          const firstSection = filtered[0].fccode;
          setDestSection(firstSection);
          setForm(s => ({ ...s, section_destination: firstSection }));
        } else {
          setDestSection('');
        }
      })
      .catch(() => {
        setDestSections([]);
        setDestSection('');
      })
      .finally(() => {
        setIsLoadingDestSections(false);
      });
  }, [destFcba, buLookups, selSection]);

  const setDefaultsForAdd = () => {
    const today = getTodayISO();
    const { deviceId, pseudoMac } = getOrCreateDeviceIds();

    setForm({
      ...initialForm,
      tanggal: today,
      time_in: '06:00',
      time_out: '14:00',
      id_device: `${getReadableDevice()} • ${deviceId}`,
      mac_address: pseudoMac,
      attendance_type: 'REGULAR',
      mandays: '1',
      fcba: userLevel === 'ADM' || userLevel === 'KSI' ? homeFcbaCode || '' : homeFcbaCode || '',
      section: userLevel === 'AST' || userLevel === 'KRA' ? homeSection || '' : '',
    });
  };

  const onAddClick = () => {
    setDefaultsForAdd();
    setIsEditing(false);
    setPreview('');
    setDestFcba('');
    setDestSection('');
    setSelFcba(
      userLevel === 'ADM' || userLevel === 'KSI' ? homeFcbaCode || '' : homeFcbaCode || ''
    );
    setSelSection(userLevel === 'AST' || userLevel === 'KRA' ? homeSection || '' : '');
    setSelGang('');
    setOpen(true);
    setDetailLoading(false);
    if (imgRef.current) imgRef.current.value = '';
    if (pdfRef.current) pdfRef.current.value = '';

    setTimeout(() => {
      handleGetLocation('in');
      handleGetLocation('out');
    }, 0);
  };

  const recomputeComputedFields = useCallback((s: FormState): FormState => {
    const dIn = combineToDate(s.tanggal, s.time_in);
    const dOut = combineToDate(s.tanggal, s.time_out);

    const baseIn = s.tanggal ? new Date(`${s.tanggal}T06:00`) : null;
    const baseOut = s.tanggal ? new Date(`${s.tanggal}T14:00`) : null;

    let totalLate = s.total_late_time;
    if (dIn && baseIn) {
      totalLate = dIn.getTime() > baseIn.getTime() ? hhmm(diffMinutes(baseIn, dIn)) : '00:00';
    }

    let goEarly = s.go_home_early;
    if (dOut && baseOut) {
      goEarly = dOut.getTime() < baseOut.getTime() ? hhmm(diffMinutes(dOut, baseOut)) : '00:00';
    }

    let effectiveMin = 0;
    if (dIn && dOut && baseIn && baseOut) {
      const effStart = dIn.getTime() > baseIn.getTime() ? dIn : baseIn;
      const effEnd = dOut.getTime() < baseOut.getTime() ? dOut : baseOut;
      effectiveMin = Math.max(0, diffMinutes(effStart, effEnd));
    }

    const fullHK =
      !!dIn && !!dOut && !!baseIn && !!baseOut && dIn.getTime() <= baseIn.getTime() && dOut.getTime() >= baseOut.getTime();

    let mandays = '0';
    if (s.attendance === 'KJ' || s.attendance === 'WH' || s.attendance === 'WS') {
      mandays = fullHK ? '1' : (effectiveMin / 480).toFixed(4);
    } else {
      mandays = '0';
    }

    return { ...s, total_late_time: totalLate, go_home_early: goEarly, mandays };
  }, []);

  useEffect(() => {
    setForm(s => recomputeComputedFields(s));
  }, [form.tanggal, form.time_in, form.time_out, form.attendance, recomputeComputedFields]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mutation.isPending) return;

    try {
      if (!form.tanggal) throw new Error(t('valDateRequired'));
      if (!form.time_in) throw new Error(t('valTimeInRequired'));
      if (!form.location_in) throw new Error(t('valLocInRequired'));
      if (!form.kode_karyawan) throw new Error(t('valEmployeeRequired'));

      let finalFcba = currentFcbaForForm || form.fcba || '';
      if (userLevel !== 'ADM' && userLevel !== 'KSI') {
        finalFcba = homeFcba || finalFcba;
      }
      if (!finalFcba) throw new Error(t('valFcbaNotFound'));
      const finalSection =
        (userLevel === 'AST' || userLevel === 'KRA' || userLevel === 'MD1' || userLevel === 'KRT') && homeSection
          ? homeSection
          : form.section || '';

      const trimmedException = form.exception_case.trim();
      const hasException = trimmedException.length > 0;
      const hasUploadedPdf = form.no_ba_exca_file instanceof File;
      const hasExistingPdf = !!form.no_ba_exca;
      const exceptionRequired = !isEditing;
      const baExcaRequired = !isEditing;

      if (exceptionRequired && !hasException) throw new Error(t('valExceptionRequired'));
      if (baExcaRequired && !hasUploadedPdf && !hasExistingPdf)
        throw new Error(t('valBaExcaRequired'));

      const timeInApi = combineToApiString(form.tanggal, form.time_in);
      const timeOutApi = form.time_out ? combineToApiString(form.tanggal, form.time_out) : '';

      const fd = new FormData();
      fd.append('tanggal', form.tanggal);
      fd.append('kode_karyawan', form.kode_karyawan);
      fd.append('attendance', form.attendance);
      fd.append('attendance_type', form.attendance_type);
      fd.append('fcba', finalFcba);
      fd.append('time_in', timeInApi);
      if (form.time_out) fd.append('time_out', timeOutApi);
      fd.append('location_in', form.location_in);
      if (form.location_out) fd.append('location_out', form.location_out);
      if (form.pengancakan) fd.append('pengancakan', form.pengancakan);
      if (form.total_late_time) fd.append('total_late_time', normalizeHM(form.total_late_time));
      if (form.go_home_early) fd.append('go_home_early', normalizeHM(form.go_home_early));
      if (trimmedException) fd.append('exception_case', trimmedException);
      if (finalSection) fd.append('section', finalSection);
      if (form.gang) fd.append('gang', form.gang);
      if (form.kemandoran) fd.append('kemandoran', form.kemandoran);
      if (form.mandays) fd.append('mandays', form.mandays);

      const { deviceId, pseudoMac } = getOrCreateDeviceIds();
      fd.append('id_device', form.id_device || `${getReadableDevice()} • ${deviceId}`);
      fd.append('mac_address', form.mac_address || pseudoMac);

      if (form.attendance_type === 'ASSISTENSI') {
        if (!destFcba) throw new Error(t('valFcbaDestRequired'));
        if (!destSection) throw new Error(t('valSectionDestRequired'));
        if (finalSection && destSection === finalSection) throw new Error(t('valSectionDestConflict'));

        const destExistsInOptFcba = optFcba.length > 0 && optFcba.includes(destFcba);
        const destExistsInBu =
          Array.isArray(businessUnits) && businessUnits.some(bu => bu.fccode === destFcba);
        if (!destExistsInOptFcba && !destExistsInBu) throw new Error(t('valFcbaDestInvalid'));

        fd.append('fcba_destination', destFcba);
        fd.append('section_destination', destSection);
      }

      if (form.images instanceof File) fd.append('images', form.images);
      if (form.no_ba_exca_file instanceof File) fd.append('no_ba_exca', form.no_ba_exca_file);
      if (form.kode_karyawan_mandor) fd.append('kode_karyawan_mandor', form.kode_karyawan_mandor);

      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing && form.id ? `/api/attendance/${form.id}` : `/api/attendance`;

      mutation.mutate(
        { url, method, body: fd },
        {
          onSuccess: () => {
            toast.success(isEditing ? t('toastSaveSuccess') : t('toastAddSuccess'));
          },
        }
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : t('toastSaveError');
      toast.error(message);
    }
  };

  const handleDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  }, []);

  const closeDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteOpen(false);
    setDeleteTargetId('');
  };

  const handleDetail = useCallback(
    async (id: string) => {
      setIsEditing(true);
      setDetailLoading(true);
      setOpen(true);
      try {
        const res = await fetchAttendanceDetail(id);
        const json: unknown = await res.json();
        const d = extractSingleData<Absensi>(json);
        if (!res.ok || !d) throw new Error('Gagal ambil data');

        const toHM = (dt?: string | null) =>
          dt && dt.includes(' ')
            ? (dt.split(' ')[1] ?? '').slice(0, 5)
            : dt
              ? dt.slice(11, 16)
              : '';

        const existingException = (d.exception_case || '').trim();
        const existingBaExca = (d.no_ba_exca || '').trim();

        const filled: FormState = {
          id: d.id,
          tanggal: (d.tanggal || '').split(' ')[0],
          kemandoran: d.kemandoran || '',
          kode_karyawan_mandor: d.kode_karyawan_mandor || '',
          kode_karyawan: d.kode_karyawan || '',
          time_in: toHM(d.time_in) || '06:00',
          time_out: toHM(d.time_out) || '14:00',
          location_in: d.location_in || '',
          location_out: d.location_out || '',
          pengancakan: d.pengancakan || '',
          total_late_time: d.total_late_time || '',
          go_home_early: d.go_home_early || '',
          attendance_type: d.attendance_type || 'REGULAR',
          attendance: d.attendance || 'MK',
          exception_case: existingException,
          no_ba_exca: existingBaExca,
          no_ba_exca_file: undefined,
          fcba: d.fcba || '',
          section: d.section || '',
          gang: d.gang || '',
          fcba_destination: d.fcba_destination || '',
          section_destination: d.section_destination || '',
          id_device:
            d.id_device || `${getReadableDevice()} • ${getOrCreateDeviceIds().deviceId}`,
          mac_address: d.mac_address || getOrCreateDeviceIds().pseudoMac,
          images: undefined,
          mandays: d.mandays != null ? String(d.mandays) : '0',
        };
        setForm(() => filled);

        setSelFcba(d.fcba || homeFcbaCode || '');
        setSelSection(d.section || homeSection || '');
        setSelGang(d.gang || '');

        setDestFcba(d.fcba_destination || '');
        setDestSection(d.section_destination || '');
        setPreview(d.images ? getProxiedImageUrl(d.images) : '');
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('toastFetchDetailError');
        toast.error(msg);
      } finally {
        setDetailLoading(false);
      }
    },
    [homeFcbaCode, homeSection, t]
  );

  const onChangeImage = (f?: File) => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    if (!f) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const enrichedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.map((it, idx) => {
      const displayDate = it._dateOnly ? formatPerfDate(it._dateOnly, localeTag) : '-';
      const mCode = (it.kode_karyawan_mandor || '').trim();
      const mandor = mCode ? employeeMap.get(mCode) : null;
      const mName = mandor?.fullname || '';
      const mandorLabel = mName ? `${mCode} - ${mName}` : mCode;

      const kCode = (it.kode_karyawan || '').trim();
      const kName = it.namakaryawan || '';
      const karyawanLabel = kName ? `${kCode} - ${kName}` : kCode;

      const tIn = it.time_in ? it.time_in.split(' ')[1]?.slice(0, 8) || it.time_in : '-';
      const tOut = it.time_out ? it.time_out.split(' ')[1]?.slice(0, 8) || it.time_out : '-';

      const searchContent = `${it.kemandoran || ''} ${kName} ${kCode} ${mCode} ${mandorLabel} ${it.fcba || ''} ${it.fcba_destination || ''} ${it.section_destination || ''} ${it.section || ''} ${it.gang || ''} ${it.attendance_type || ''} ${it.attendance || ''} ${it.no_ba_exca || ''} ${it.id_device || ''} ${it.mac_address || ''} ${it.location_in || ''} ${it.location_out || ''} ${it.pengancakan || ''} ${it.mandays || ''} ${it._dateOnly || ''} ${displayDate}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      const candidate = `${it.id || ''}|${kCode}|${it._dateOnly || ''}|${idx}`;
      let key = candidate;
      while (seen.has(key)) key = `${key}_`;
      seen.add(key);

      return {
        ...it,
        _rowKey: key,
        _displayDate: displayDate,
        _mandorLabel: mandorLabel,
        _mandorCode: mCode,
        _mandorName: mName,
        _karyawanLabel: karyawanLabel,
        _karyawanCode: kCode,
        _karyawanName: kName,
        _timeInDisplay: tIn,
        _timeOutDisplay: tOut,
        _searchContent: searchContent,
      };
    });
  }, [items, employeeMap, localeTag]);

  const filtered = useMemo(() => {
    if (!q.trim()) return enrichedItems;
    const s = q.toLowerCase();
    return enrichedItems.filter(it => it._searchContent?.includes(s));
  }, [q, enrichedItems]);

  const canAddOrEdit = userLevel === 'ADM' || userLevel === 'KSI';

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error(t('toastNoExportData'));
      return;
    }
    const dataToExport = filtered.map((r, idx) => ({
      [t('exportColNo')]: idx + 1,
      [t('exportColTanggal')]: r._dateOnly || '-',
      [t('exportColKemandoran')]: r.kemandoran || '-',
      [t('exportColKode')]: r._karyawanCode || '-',
      [t('exportColNama')]: r._karyawanName || '-',
      [t('exportColMandor')]: r._mandorCode || '-',
      [t('exportColFcba')]: r.fcba || '-',
      [t('exportColSection')]: r.section || '-',
      [t('exportColGang')]: r.gang || '-',
      [t('exportColType')]: r.attendance_type || '-',
      [t('exportColAttendance')]: r.attendance || '-',
      [t('exportColMasuk')]: r._timeInDisplay || '-',
      [t('exportColPulang')]: r._timeOutDisplay || '-',
      [t('exportColLate')]: r.total_late_time || '-',
      [t('exportColHomeEarly')]: r.go_home_early || '-',
      [t('exportColHk')]: r.mandays != null ? String(r.mandays) : '-',
      [t('exportColStatus')]: r.status_attendance || '-',
    }));
    exportJsonToCsv(dataToExport, `Attendance_${filters.tanggal}_${filters.tanggal_end}.csv`);
  };

  return {
    // Search & filters
    q, setQ, isSearchFocused, setIsSearchFocused,
    showFilters, setShowFilters,
    searchInputRef,
    filters, setFilters,
    viewMode, setViewMode, allExpanded, setAllExpanded,
    galleryRef,

    // Data & loading
    items, loading, isFetching, queryError,
    businessUnits, isLoadingBU,
    masterSections, isLoadingSections,
    masterGangs, isLoadingGangs,
    employees, isLoadingSmp,
    isLoadingDestSections,

    // Mutations
    mutation, deleteMutation, queryClient,

    // Permissions & scoping
    userLevel,
    isFcbaLocked, isAfdelingLocked, isKemandoranLocked,
    canAddOrEdit,
    getScopedFilters,

    // Computed display data
    enrichedItems, filtered,

    // Form options
    fcbaOptions, sectionOptions, gangOptions,
    employeeOptions, mandorOptions,
    destOptions, destSectionOptions,

    // Form state
    open, setOpen,
    isEditing,
    detailLoading,
    deleteOpen, setDeleteOpen,
    deleteTargetId,
    form, setForm,
    preview,
    imgRef, pdfRef,

    // Cascade selection state
    selFcba, setSelFcba,
    selSection, setSelSection,
    selGang, setSelGang,
    homeFcba, homeFcbaCode, homeSection, homeKemandoran,
    destFcba, destSection,

    // Computed form values
    currentFcbaForForm, currentFcbaPreresolved,
    selectedMandorGang,

    // Handlers
    onAddClick,
    handleSubmit,
    handleDelete,
    closeDeleteModal,
    handleDetail,
    handleExport,
    onChangeSection, onChangeGang,
    onChangeEmployee, onChangeMandor,
    onChangeDestFcba, onChangeDestSection,
    onChangeImage,
    handleGetLocation,
    disableUnlessAllowed: (allowed: boolean) => (isEditing ? !allowed : false),
  };
}
