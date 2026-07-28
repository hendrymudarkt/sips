'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableColumn } from 'react-data-table-component';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import { SkeletonTable } from '@/app/components/ui/skeletons';
import { Icon } from '@/app/components/ui/icons';
import type { Option } from '@/app/components/ui/search-select';
import { AttendanceGalleryView, type AttendanceGalleryViewHandle } from '@/app/components/features/attendance-gallery-view';
import AttendanceFormModal from '@/app/components/features/attendance-form-modal';
import { DeleteModal } from '@/app/components/feedback/delete-modal';
import { PhotoCell } from '@/app/components/ui/photo-cell';
import { Toolbar } from '@/app/components/ui/toolbar';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { useLocale } from '@/hooks/useLocale';
import type { BusinessUnit } from '@/utils/services/businessUnitService';
import { fetchBusinessUnits } from '@/utils/services/businessUnitService';
import type { SectionMaster } from '@/utils/services/masterDataService';
import { fetchGangs, fetchSections } from '@/utils/services/masterDataService';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { formatPerfDate } from '@/utils/helpers/perf-formatter';

/* =========================
   T Y P E S
========================= */
type Absensi = {
  _rowKey?: string;
  // ⚡ Bolt Optimization: cached display and search values
  _displayDate?: string;
  _dateOnly?: string;
  _searchContent?: string;
  _mandorLabel?: string;
  _mandorCode?: string;
  _mandorName?: string;
  _karyawanLabel?: string;
  _karyawanCode?: string;
  _karyawanName?: string;
  _timeInDisplay?: string;
  _timeOutDisplay?: string;
  id: string;
  tanggal: string;
  kemandoran: string;
  kode_karyawan_mandor?: string | null;
  kode_karyawan: string;
  time_in?: string | null; // "YYYY-MM-DD HH:mm:ss"
  time_out?: string | null; // "YYYY-MM-DD HH:mm:ss"
  location_in?: string | null;
  location_out?: string | null;
  pengancakan?: string | null;
  total_late_time?: string | null; // "HH:MM"
  go_home_early?: string | null; // "HH:MM"
  attendance_type: 'REGULAR' | 'ASSISTENSI';
  attendance: 'KJ' | 'WH' | 'WS' | 'MK' | 'ML' | 'P1' | 'KB' | 'OT';
  exception_case?: string | null;
  no_ba_exca?: string | null; // URL/filename PDF
  fcba?: string | null;
  section?: string | null;
  gang?: string | null;
  fcba_destination?: string | null;
  section_destination?: string | null;
  id_device?: string | null;
  mac_address?: string | null;
  images?: string | null;
  status_attendance?: string | null;
  mandays?: number | string | null;

  namakaryawan?: string | null;
};

type FormState = {
  id?: string;
  tanggal: string; // "YYYY-MM-DD"
  kemandoran: string;
  kode_karyawan_mandor: string;
  kode_karyawan: string;
  time_in: string; // "HH:MM"
  time_out: string; // "HH:MM"
  location_in: string;
  location_out: string;
  pengancakan: string; // dari NOANCAK
  total_late_time: string; // H:MM (readOnly)
  go_home_early: string; // H:MM (readOnly)
  attendance_type: 'REGULAR' | 'ASSISTENSI';
  attendance: 'KJ' | 'WH' | 'WS' | 'MK' | 'ML' | 'P1' | 'KB' | 'OT';
  exception_case: string; // textarea
  no_ba_exca: string;
  no_ba_exca_file?: File | undefined; // PDF upload
  fcba: string;
  section: string;
  gang: string;
  fcba_destination: string;
  section_destination: string;
  id_device: string;
  mac_address: string;
  images: File | undefined;

  mandays: string; // readOnly "0 – 1"
};

const initialForm: FormState = {
  id: undefined,
  tanggal: '',
  kemandoran: '',
  kode_karyawan_mandor: '',
  kode_karyawan: '',
  time_in: '',
  time_out: '',
  location_in: '',
  location_out: '',
  pengancakan: '',
  total_late_time: '',
  go_home_early: '',
  attendance_type: 'REGULAR',
  attendance: 'KJ',
  exception_case: '',
  no_ba_exca: '',
  no_ba_exca_file: undefined,
  fcba: '',
  section: '',
  gang: '',
  fcba_destination: '',
  section_destination: '',
  id_device: '',
  mac_address: '',
  images: undefined,
  mandays: '0',
};

type Filters = Partial<{
  tanggal: string;
  tanggal_end: string;
  kemandoran: string;
  kode_karyawan_mandor: string;
  kode_karyawan: string;
  fcba: string;
  afdeling: string;
  gang: string;
  attendance: string;
  status_attendance: string;
  attendance_type: string;
  fcba_destination: string;
  section_destination: string;
}>;

type Triplet = { fcba: string; sectionname: string; gangcode: string };

type Employee = {
  fccode: string;
  fullname?: string;
  fcba?: string;
  sectionname?: string;
  gangcode?: string;
  noancak?: string;
};

type EmployeesApiRow = {
  [key: string]: unknown;
  fccode?: unknown;
  fcname?: unknown;
  fcba?: unknown;
  sectionname?: unknown;
  gangcode?: unknown;
};

/**
 * ⚡ Bolt Optimization: Use Map-based lookups for Business Units to avoid O(N) .find() in loops.
 */
const getBusinessUnitLookups = (businessUnits: BusinessUnit[] | undefined) => {
  const codeMap = new Map<string, BusinessUnit>();
  const nameMap = new Map<string, BusinessUnit>();

  if (Array.isArray(businessUnits)) {
    for (const bu of businessUnits) {
      if (bu.fccode) codeMap.set(bu.fccode, bu);
      if (bu.fcname) nameMap.set(bu.fcname.toLowerCase(), bu);
    }
  }

  return { codeMap, nameMap };
};

const resolveBusinessUnitCode = (
  value: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> }
): string => {
  if (!value) return '';
  const directMatch = lookups.codeMap.get(value);
  if (directMatch) return directMatch.fccode;

  const nameMatch = lookups.nameMap.get(value.toLowerCase());
  return nameMatch?.fccode || value;
};

const resolveBusinessUnitName = (
  value: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> }
): string => {
  if (!value) return '';
  const directMatch = lookups.codeMap.get(value);
  if (directMatch) return directMatch.fcname || directMatch.fccode;
  return value;
};

const matchesEmployeeFcba = (
  employeeFcba: string | undefined,
  selectedFcba: string,
  lookups: { codeMap: Map<string, BusinessUnit>; nameMap: Map<string, BusinessUnit> },
  preResolved?: { code: string; name: string }
): boolean => {
  const employeeValue = (employeeFcba || '').trim();
  if (!employeeValue || !selectedFcba) return false;

  const selectedCode = preResolved?.code || resolveBusinessUnitCode(selectedFcba, lookups);
  const selectedName = preResolved?.name || resolveBusinessUnitName(selectedFcba, lookups);

  return (
    employeeValue === selectedFcba ||
    employeeValue === selectedCode ||
    employeeValue === selectedName
  );
};

/* =========================
   U T I L S
========================= */
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { getTodayISO, getYesterdayISO } from '@/utils/helpers/datetime';
import { buildMapUrl } from '@/utils/services/mapHelper';
import { cookieStore } from '@/utils/auth/cookieStore';
import { getFilterCriteria, getLockedFields, type UserLevel } from '@/utils/helpers/filterHelper';
import { getReadableDevice, getOrCreateDeviceIds } from '@/utils/helpers/deviceHelper';
import { extractArrayData, extractSingleData } from '@/utils/api/apiHelpers';

const LocationButton: React.FC<{ loc?: string | null; label?: string }> = ({ loc, label }) => {
  const t = useTranslations('Attendance');
  if (!loc) return <>-</>;
  const href = buildMapUrl(loc);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-ghost btn-xs gap-1"
      title={loc}
    >
      <span aria-hidden>📍</span> {label ?? t('gpsDefaultLabel')}
    </a>
  );
};

/* ====== Date/Time helpers ====== */
const combineToDate = (dateISO: string, hhmm: string): Date | null => {
  if (!dateISO || !hhmm) return null;
  const [hhStr, mmStr] = hhmm.split(':');
  const hh = parseInt(hhStr ?? '', 10);
  const mm = parseInt(mmStr ?? '', 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(`${dateISO}T00:00`);
  if (Number.isNaN(+d)) return null;
  d.setHours(hh, mm, 0, 0);
  return d;
};

const combineToApiString = (dateISO: string, hhmm: string): string => `${dateISO} ${hhmm}:00`;

const hhmm = (minutes: number) => {
  const m = Math.max(0, Math.floor(minutes));
  const H = Math.floor(m / 60);
  const M = m % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
};

const diffMinutes = (a?: Date | null, b?: Date | null) => {
  if (!a || !b) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 60000);
};

/* Text H:MM normalizer */
const normalizeHM = (input: string) => {
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
};

/* =========================
   M A I N
========================= */
export default function Attendance() {
  const localeTag = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations('Attendance');
  const [q, setQ] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useSearchShortcut();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [allExpanded, setAllExpanded] = useState(false);
  const galleryRef = useRef<AttendanceGalleryViewHandle>(null);

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

  // Read tanggal/tanggal_end from URL params (from dashboard navigation)
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

  // Master data / cascading
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

      // Apply the filter criteria to base filters
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

  // Query for attendance list
  const {
    data: items = [],
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ['attendance', filters, userLevel, homeFcba, homeSection, homeKemandoran],
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

      if (start) {
        f.tanggal = start;
      }
      if (end && end !== start) {
        f.tanggal_end = end;
      }

      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, v as string);
        }
      });

      const res = await fetch(`/api/attendance${params.toString() ? `?${params}` : ''}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 404) return [];
        if (res.status === 401) {
          await logoutAndRedirect();
          return [];
        }
        // Baca error message dari response body untuk user-friendly feedback
        let detail = `HTTP ${res.status}`;
        try {
          const errBody = await res.clone().json();
          if (errBody?.error) detail = errBody.error;
        } catch {
          /* fallback ke HTTP status */
        }
        throw new Error(detail);
      }

      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      const raw = extractArrayData<Absensi>(json);

      // ⚡ Bolt Optimization: Consolidate filtering and deduplication into a single-pass O(N) loop.
      const byId = new Map<string, Absensi>();
      for (const row of raw) {
        if (!row?.id || byId.has(row.id)) continue;

        const dateOnly = (row.tanggal || '').split(' ')[0];
        if (start && end) {
          if (!dateOnly || dateOnly < start || dateOnly > end) continue;
        }

        byId.set(row.id, {
          ...row,
          _dateOnly: dateOnly,
        });
      }

      return Array.from(byId.values());
    },
    enabled: !!homeFcba || userLevel === 'ADM', // Wait until bootstrap is done
    staleTime: 2 * 60 * 1000, // 2 menit - attendance data lebih sering berubah
    gcTime: 5 * 60 * 1000, // 5 menit cache
  });

  // show toast if query produces error so the variable is referenced
  useEffect(() => {
    if (queryError) {
      // react-query error can be string or Error
      const msg =
        typeof queryError === 'string'
          ? queryError
          : queryError instanceof Error
            ? queryError.message
            : t('toastFetchError');
      toast.error(msg);
    }
  }, [queryError, t]);

  // Mutations
  const mutation = useMutation({
    mutationFn: async ({ url, method, body }: { url: string; method: string; body: FormData }) => {
      // Add CSRF token to FormData if not already present
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      if (csrfToken && !body.has('_csrf_token')) {
        body.append('_csrf_token', csrfToken);
      }

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const res = await fetch(url, {
        method,
        body,
        credentials: 'include',
        headers,
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
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
      const body = new FormData();
      // Laravel expects file uploads to come via multipart POST; use _method override
      body.append('ba_deleted', file);
      body.append('_method', 'DELETE');

      // Add CSRF token for file upload
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      if (csrfToken) {
        body.append('_csrf_token', csrfToken);
      }

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const res = await fetch(`/api/attendance/${id}`, {
        method: 'POST',
        body,
        credentials: 'include',
        headers,
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
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(t('toastDeleteSuccess'));
      setDeleteOpen(false);
      setDeleteTargetId('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // modal
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  // Close the modal with Escape
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

  // form
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
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /* ===== Device IDs (auto) ===== */
  useEffect(() => {
    const { deviceId, pseudoMac } = getOrCreateDeviceIds();
    setForm(s => ({
      ...s,
      id_device: s.id_device || `${getReadableDevice()} • ${deviceId}`,
      mac_address: s.mac_address || pseudoMac,
    }));
  }, []);

  /* ===== Bootstrap cookies (synchronous only) ===== */
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
        // ignore
      }
    }

    const ckOptFcba = cookieStore.getCookie('opt_fcba');
    if (ckOptFcba) {
      try {
        const arr = JSON.parse(ckOptFcba) as string[];
        if (Array.isArray(arr)) setOptFcba(arr);
      } catch {
        // ignore
      }
    }
  }, []);

  /* ===== Parallel data fetching with useQuery ===== */

  // Business units query - runs in parallel dengan caching lebih lama
  const { data: businessUnits = [], isLoading: isLoadingBU } = useQuery({
    queryKey: ['businessUnits'],
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
    staleTime: 30 * 60 * 1000, // 30 menit - data master jarang berubah
    gcTime: 60 * 60 * 1000, // 1 jam cache di memori
  });

  const buLookups = useMemo(() => getBusinessUnitLookups(businessUnits), [businessUnits]);

  const selectedFcbaCodeForMaster = useMemo(
    () => resolveBusinessUnitCode(selFcba || homeFcba || '', buLookups),
    [selFcba, homeFcba, buLookups]
  );

  const { data: masterSections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['masterSections'],
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
    queryKey: ['masterGangs', selectedFcbaCodeForMaster, selSection],
    queryFn: async () => {
      if (!selectedFcbaCodeForMaster || !selSection) return [];
      return fetchGangs({
        fcba: selectedFcbaCodeForMaster,
        afdeling: selSection,
      });
    },
    enabled: !!selectedFcbaCodeForMaster && !!selSection,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Employees query - runs in parallel, depends on cookies only
  const { data: employees = [], isLoading: isLoadingSmp } = useQuery({
    queryKey: ['employees', userLevel, homeFcba, homeSection],
    queryFn: async () => {
      let apiUrl = '/api/master/karyawans';
      const params = new URLSearchParams();

      if (userLevel === 'AST' || userLevel === 'KRA') {
        if (homeFcba) params.append('fcba', homeFcba);
        if (homeSection) params.append('sectionname', homeSection);
      } else if (userLevel === 'ADM' || userLevel === 'MGR' || userLevel === 'KSI') {
        if (homeFcba) params.append('fcba', homeFcba);
      }

      if (params.toString()) {
        apiUrl += `?${params.toString()}`;
      }

      const r = await fetch(apiUrl, { credentials: 'include' });
      const j: unknown = await r.json();
      const rowsRaw = extractArrayData<EmployeesApiRow>(j);

      // Build triplets from employees if no cookie
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

      // Build employees map
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
    staleTime: 15 * 60 * 1000, // 15 menit - data karyawan jarang berubah
    gcTime: 30 * 60 * 1000, // 30 menit cache
  });

  /* ===== Attendance-type: reset cascade dari FCBA akun ===== */
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
      // KRT: fcba + afdeling + gang locked
      setSelSection(homeSection || '');
      setForm(s => ({ ...s, section: homeSection || '' }));
      setSelGang(homeKemandoran || '');
    } else if (userLevel === 'MD1') {
      // MD1: fcba + afdeling locked
      setSelSection(homeSection || '');
      setForm(s => ({ ...s, section: homeSection || '' }));
    } else {
      setSelSection('');
      setForm(s => ({ ...s, section: '' }));
    }

    if (userLevel !== 'KRT') {
      setSelGang('');
    }
    setForm(s => ({ ...s, kode_karyawan: '' }));
  }, [form.attendance_type, homeFcba, homeSection, homeKemandoran, userLevel, isEditing]);

  /* ===== Options ===== */
  const fcbaOptions = useMemo(() => {
    // prefer list from businessUnits API if available
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

  // convert homeFcba (which might be fcname or fccode) to actual fccode for proper filtering
  const homeFcbaCode = useMemo(() => {
    return resolveBusinessUnitCode(homeFcba, buLookups);
  }, [homeFcba, buLookups]);

  const currentFcbaForForm = useMemo(() => {
    return userLevel === 'ADM' ? selFcba || homeFcbaCode || '' : homeFcbaCode || selFcba || '';
  }, [userLevel, selFcba, homeFcbaCode]);

  const sectionOptions: Option[] = useMemo(() => {
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

    // Match by fcba field in triplets (triplets use fcba name, not fccode)
    // Need to handle both cases: selFcba being fccode or fcba name
    return Array.from(
      new Set(
        triplets
          .filter(t => {
            // Direct match with fcba field
            if (t.fcba === selFcba) return true;
            // Also try to match by extracting fcba from business units if selFcba is fccode
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

  const gangOptions: Option[] = useMemo(() => {
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

    // Get the actual fcba name for matching triplets
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


  const employeeOptions: Option[] = useMemo(() => {
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

  // destination select options should include every FCBA, including the user's current FCBA.
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
        .map(fcba => ({
          value: fcba,
          label: fcba,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    return fcbaOptions;
  }, [optFcba, fcbaOptions, businessUnits]);

  const destSectionOptions: Option[] = useMemo(() => {
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

  const mandorOptions: Option[] = useMemo(() => {
    const fcba = currentFcbaForForm || form.fcba || homeFcbaCode || homeFcba || '';
    const section = selSection || form.section || homeSection || '';

    // Reuse preresolved lookups if possible
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

  /**
   * ⚡ Bolt Optimization: Use a Map for O(1) employee lookups by code.
   * This replaces multiple O(N) .find() calls and consolidates the previous empLabelMap.
   */
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      const code = (e.fccode || '').trim();
      if (code && !map.has(code)) map.set(code, e);
    }
    return map;
  }, [employees]);

  const selectedMandorGang = useMemo(() => {
    const mandor = employeeMap.get(form.kode_karyawan_mandor);
    return mandor?.gangcode || form.kemandoran || '';
  }, [employeeMap, form.kode_karyawan_mandor, form.kemandoran]);

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

  // Fetch destination sections dari API saat FCBA destination berubah (hanya jika ada nilai)
  useEffect(() => {
    if (!destFcba) return;

    const destCode = resolveBusinessUnitCode(destFcba, buLookups);

    setIsLoadingDestSections(true);
    fetchSections({ fcba: destCode })
      .then(sections => {
        setDestSections(sections);

        // Auto-populate section destination
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

  /* ===== Defaults for add mode ===== */
  const setDefaultsForAdd = () => {
    const today = getTodayISO();
    const { deviceId, pseudoMac } = getOrCreateDeviceIds();

    setForm({
      ...initialForm,
      tanggal: today,
      time_in: '07:00',
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

  /* ===== AUTO COMPUTE LATE / EARLY / MANDAYS ===== */
  const recomputeComputedFields = useCallback((s: FormState): FormState => {
    const dIn = combineToDate(s.tanggal, s.time_in);
    const dOut = combineToDate(s.tanggal, s.time_out);

    const baseIn = s.tanggal ? new Date(`${s.tanggal}T07:00`) : null;
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
      const effStart = dIn.getTime() > baseIn.getTime() ? dIn : (baseIn as Date);
      const effEnd = dOut.getTime() < baseOut.getTime() ? dOut : (baseOut as Date);
      effectiveMin = Math.max(0, diffMinutes(effStart, effEnd));
    }

    const fullHK =
      !!dIn &&
      !!dOut &&
      !!baseIn &&
      !!baseOut &&
      dIn.getTime() <= baseIn.getTime() &&
      dOut.getTime() >= baseOut.getTime();

    let mandays = '0';
    if (s.attendance === 'KJ' || s.attendance === 'WH' || s.attendance === 'WS') {
      mandays = fullHK ? '1' : (effectiveMin / 420).toFixed(4);
    } else {
      mandays = '0';
    }

    return {
      ...s,
      total_late_time: totalLate,
      go_home_early: goEarly,
      mandays,
    };
  }, []);

  useEffect(() => {
    setForm(s => recomputeComputedFields(s));
  }, [form.tanggal, form.time_in, form.time_out, form.attendance, recomputeComputedFields]);

  /* ===== SUBMIT ===== */
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
        (userLevel === 'AST' ||
          userLevel === 'KRA' ||
          userLevel === 'MD1' ||
          userLevel === 'KRT') &&
        homeSection
          ? homeSection
          : form.section || '';

      const trimmedException = form.exception_case.trim();
      const hasException = trimmedException.length > 0;

      const hasUploadedPdf = form.no_ba_exca_file instanceof File;
      const hasExistingPdf = !!form.no_ba_exca;

      const exceptionRequired = !isEditing;
      const baExcaRequired = !isEditing;

      if (exceptionRequired && !hasException) {
        throw new Error(t('valExceptionRequired'));
      }

      if (baExcaRequired && !hasUploadedPdf && !hasExistingPdf) {
        throw new Error(t('valBaExcaRequired')); // Fixed: was 'No BA ExlA' changed to 'No BA Exca'
      }

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
        if (finalSection && destSection === finalSection) {
          throw new Error(t('valSectionDestConflict'));
        }

        // Validate that the destination FCBA exists in opt_fcba or business units
        const destExistsInOptFcba = optFcba.length > 0 && optFcba.includes(destFcba);
        const destExistsInBu =
          Array.isArray(businessUnits) && businessUnits.some(bu => bu.fccode === destFcba);
        if (!destExistsInOptFcba && !destExistsInBu) {
          throw new Error(t('valFcbaDestInvalid'));
        }

        fd.append('fcba_destination', destFcba);
        fd.append('section_destination', destSection);
      }

      if (form.images instanceof File) fd.append('images', form.images);
      if (form.no_ba_exca_file instanceof File) {
        fd.append('no_ba_exca', form.no_ba_exca_file);
      }

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

  /* ===== DELETE ===== */
  // wrap in useCallback so memoized columns don't re-create on every render
  const handleDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  }, []);

  const closeDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteOpen(false);
    setDeleteTargetId('');
  };

  /* ===== DETAIL ===== */
  const handleDetail = useCallback(
    async (id: string) => {
      setIsEditing(true);
      setDetailLoading(true);
      setOpen(true);
      try {
        const res = await fetch(`/api/attendance/${id}`, {
          credentials: 'include',
        });
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
          time_in: toHM(d.time_in) || '07:00',
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
          id_device: d.id_device || `${getReadableDevice()} • ${getOrCreateDeviceIds().deviceId}`,
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

  /* ===== PREVIEW FOTO ===== */
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

  /* ===== Columns ===== */
  const sortByLabel = (a: Absensi, b: Absensi, getLabel: (r: Absensi) => string) =>
    getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: 'base' });

  const columns: TableColumn<Absensi>[] = useMemo(
    () => [
      {
        name: <span title={t('colAksiTooltip')}>{t('colAksi')}</span>,
        width: '120px',
        cell: (row: Absensi) => {
          const status = (row.status_attendance || '').toLowerCase();
          const isPlanned = status === 'planned';
          const canEditRole = userLevel === 'ADM' || userLevel === 'KSI';
          const canEdit = canEditRole && isPlanned;

          const canDelete =
            (userLevel === 'ADM' || userLevel === 'KSI') && status !== 'approved' && status !== '';

          return (
            <div className="space-x-1 whitespace-nowrap overflow-visible">
              {canEditRole && (
                <button
                  className={`btn btn-xs ${canEdit ? 'btn-outline' : 'btn-disabled'}`}
                  onClick={() => canEdit && handleDetail(row.id)}
                  disabled={!canEdit}
                  title={canEdit ? t('edit') : t('editDisabledTooltip')}
                >
                  {t('edit')}
                </button>
              )}

              {canDelete && (
                <button
                  className="btn btn-xs btn-error"
                  onClick={() => handleDelete(row.id)}
                  title={t('deleteDisabledTooltip')}
                >
                  {t('delete')}
                </button>
              )}
            </div>
          );
        },
        ignoreRowClick: true,
      },
      {
        name: <span title={t('colStatusTooltip')}>{t('colStatus')}</span>,
        selector: r => r.status_attendance ?? '-',
        sortable: true,
        width: '120px',
        cell: r => (
          <span
            className={`badge ${
              (r.status_attendance || '').toLowerCase() === 'planned'
                ? 'badge-warning'
                : (r.status_attendance || '').toLowerCase() === 'approved'
                  ? 'badge-success'
                  : 'badge-ghost'
            }`}
          >
            {r.status_attendance ?? '-'}
          </span>
        ),
      },
      {
        name: <span title={t('colNoTooltip')}>{t('colNo')}</span>,
        width: '56px',
        cell: (_r, i) => <span>{i + 1}</span>,
        ignoreRowClick: true,
      },
      {
        name: <span title={t('colTanggalTooltip')}>{t('colTanggal')}</span>,
        selector: r => r._dateOnly ?? '',
        sortable: true,
        width: '100px',
        cell: r => <span title={r._dateOnly}>{r._displayDate}</span>,
      },
      {
        name: <span title={t('colKemandoran')}>{t('colKemandoran')}</span>,
        selector: r => r.kemandoran ?? '-',
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={t('colKaryawanTooltip')}>{t('colKaryawan')}</span>,
        style: { flexGrow: 2 as number, minWidth: '220px' },
        width: '240px',
        sortable: true,
        sortFunction: (a, b) => sortByLabel(a, b, r => r._karyawanLabel || ''),
        cell: r => (
          <div className="min-w-0">
            <div className="font-semibold truncate" title={r._karyawanName || '-'}>
              {r._karyawanName || '-'}
            </div>
            <div className="text-xs opacity-70 truncate" title={r._karyawanCode || ''}>
              {r._karyawanCode || ''}
            </div>
          </div>
        ),
      },
      {
        name: <span title={t('colMandorTooltip')}>{t('colMandor')}</span>,
        width: '200px',
        style: { flexGrow: 1.5 as number, minWidth: '220px' },
        sortable: true,
        sortFunction: (a, b) => sortByLabel(a, b, r => r._mandorLabel || ''),
        cell: r => {
          if (!r._mandorCode) return <>-</>;
          return (
            <div className="min-w-0">
              <div className="font-medium truncate" title={r._mandorName || '-'}>
                {r._mandorName || '-'}
              </div>
              <div className="text-xs opacity-70 truncate" title={r._mandorCode}>
                {r._mandorCode}
              </div>
            </div>
          );
        },
      },
      {
        name: <span title={t('colFcbaTooltip')}>{t('colFcba')}</span>,
        selector: r => r.fcba ?? '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colSectionTooltip')}>{t('colSection')}</span>,
        selector: r => r.section || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span>{t('colGang')}</span>,
        selector: r => r.gang || '-',
        sortable: true,
        width: '90px',
      },
      {
        name: <span title={t('colTypeTooltip')}>{t('colType')}</span>,
        selector: r => r.attendance_type,
        sortable: true,
        width: '130px',
        cell: r => <span className="badge badge-outline">{r.attendance_type}</span>,
      },
      {
        name: <span title={t('colAttdTooltip')}>{t('colAttd')}</span>,
        selector: r => r.attendance,
        sortable: true,
        width: '80px',
      },
      {
        name: <span title={t('colMasukTooltip')}>{t('colMasuk')}</span>,
        selector: r => r._timeInDisplay || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span title={t('colPulangTooltip')}>{t('colPulang')}</span>,
        selector: r => r._timeOutDisplay || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span title={t('colLateTooltip')}>{t('colLate')}</span>,
        selector: r => r.total_late_time || '-',
        sortable: true,
        width: '90px',
      },
      {
        name: <span title={t('colHomeEarlyTooltip')}>{t('colHomeEarly')}</span>,
        selector: r => r.go_home_early || '-',
        sortable: true,
        width: '100px',
      },
      {
        name: <span title={t('colPengancakanTooltip')}>{t('colPengancakan')}</span>,
        selector: r => r.pengancakan || '-',
        sortable: true,
        style: { flexGrow: 1.1 as number, minWidth: '145px' },
      },
      {
        name: <span title={t('colHkTooltip')}>{t('colHk')}</span>,
        selector: r => (r.mandays != null ? String(r.mandays) : '-'),
        sortable: true,
        width: '90px',
      },
      {
        name: <span title={t('colFcbaDestTooltip')}>{t('colFcbaDest')}</span>,
        selector: r => r.fcba_destination || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span title={t('colSectionDestTooltip')}>{t('colSectionDest')}</span>,
        selector: r => r.section_destination || '-',
        sortable: true,
        width: '110px',
      },
      {
        name: <span title={t('colLocInTooltip')}>{t('colLocIn')}</span>,
        style: { flexGrow: 1.2 as number, minWidth: '140px' },
        sortable: false,
        cell: r => (
          <div className="flex items-center gap-2">
            <LocationButton loc={r.location_in} />
          </div>
        ),
      },
      {
        name: <span title={t('colLocOutTooltip')}>{t('colLocOut')}</span>,
        style: { flexGrow: 1.2 as number, minWidth: '140px' },
        sortable: false,
        cell: r => (
          <div className="flex items-center gap-2">
            <LocationButton loc={r.location_out} />
          </div>
        ),
      },
      {
        name: <span title={t('colExcTooltip')}>{t('colExc')}</span>,
        selector: r => r.exception_case || '-',
        sortable: true,
        style: { flexGrow: 1.1 as number, minWidth: '160px' },
      },
      {
        name: <span title={t('colBaExcaTooltip')}>{t('colBaExca')}</span>,
        selector: r => r.no_ba_exca || '-',
        sortable: true,
        width: '120px',
        cell: r =>
          r.no_ba_exca ? (
            <a
              href={r.no_ba_exca}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
              title={t('openPdfBaExca')}
            >
              <Icon name="document-attach" className="h-6 w-6 text-primary hover:text-primary-focus transition-colors" />
            </a>
          ) : (
            '-'
          ),
      },
      {
        name: <span title={t('colDeviceTooltip')}>{t('colDevice')}</span>,
        selector: r => r.id_device || '-',
        sortable: true,
        width: '180px',
      },
      {
        name: <span title={t('colMacTooltip')}>{t('colMac')}</span>,
        selector: r => r.mac_address || '-',
        sortable: true,
        width: '160px',
      },
      {
        name: <span title={t('colFotoTooltip')}>{t('colFoto')}</span>,
        width: '90px',
        cell: (r: Absensi) =>
          r.images ? (
            <PhotoCell imageUrl={r.images} alt="foto" href={r.images} size={40} />
          ) : (
            '-'
          ),
        ignoreRowClick: true,
      },
    ],
    [handleDetail, handleDelete, userLevel, t]
  );

  /* ===== EXPORT EXCEL ===== */
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

  /**
   * ⚡ Bolt Optimization:
   * 1. Single-pass enrichment to add display labels and search content.
   * 2. Uses formatPerfDate with cached formatters (~50x faster).
   * 3. Moves expensive Map lookups and string processing out of the render path.
   */
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

  /* ===== Quick search lokal ===== */
  const filtered = useMemo(() => {
    if (!q.trim()) return enrichedItems;
    const s = q.toLowerCase();
    // ⚡ Bolt Optimization: Use pre-calculated search content for O(N) string check
    return enrichedItems.filter(it => it._searchContent?.includes(s));
  }, [q, enrichedItems]);

  const disableUnlessAllowed = (allowed: boolean) => (isEditing ? !allowed : false);

  const canAddOrEdit = userLevel === 'ADM' || userLevel === 'KSI';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 w-full">
      <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto w-full overflow-x-hidden space-y-4">
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
              onClick: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
              loading: isFetching,
            },
            {
              key: 'export',
              label: t('export'),
              icon: 'export',
              onClick: handleExport,
            },
            ...(canAddOrEdit ? [{
              key: 'add',
              label: t('addAttendance'),
              icon: 'plus',
              onClick: onAddClick,
              variant: 'primary' as const,
              tour: 'add-button',
            }] : []),
          ]}
        >
          <AppTour
            steps={tourSteps}
            storageKey="tour-attendance"
            btnClassName="join-item flex-1 sm:flex-none"
          />
        </Toolbar>

        {/* Quick Search & View Toggle */}
        <div className="flex items-center gap-2 justify-end animate-slideUp [animation-delay:100ms]">
          <div className="relative flex-1 md:flex-none md:w-96 group" data-tour="quick-search">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="search" className="h-4 w-4 opacity-50 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
            </div>
            <input
              ref={searchInputRef}
              className="input input-bordered w-full pl-9 pr-10 focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
              placeholder={t('searchPlaceholder')}
              value={q}
              onChange={e => setQ(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              aria-label={t('quickSearch')}
              title={t('quickSearch')}
            />
            {!isSearchFocused && !q && (
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none animate-fadeIn">
                <kbd className="kbd kbd-sm bg-base-200/50 opacity-50">/</kbd>
              </div>
            )}
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50 hover:text-error transition-colors"
                aria-label={t('clearSearch')}
                title={t('clearSearch')}
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
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

        {/* Filter Bar */}
        {showFilters && (
          <div className="bg-base-100 p-4 rounded-xl shadow-sm mb-4 border border-base-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Tanggal Awal */}
              <input
                type="date"
                className="input input-bordered w-full"
                placeholder={t('filterDateStart')}
                value={filters.tanggal ?? ''}
                onChange={e => setFilters(s => ({ ...s, tanggal: e.target.value }))}
                title={t('filterDateStartTooltip')}
              />
              {/* Tanggal Akhir */}
              <input
                type="date"
                className="input input-bordered w-full"
                placeholder={t('filterDateEnd')}
                value={filters.tanggal_end ?? ''}
                onChange={e => setFilters(s => ({ ...s, tanggal_end: e.target.value }))}
                title={t('filterDateEndTooltip')}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterKemandoran')}
                value={filters.kemandoran ?? ''}
                onChange={e => setFilters(s => ({ ...s, kemandoran: e.target.value }))}
                title={t('filterKemandoranTooltip')}
                disabled={isKemandoranLocked}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterKodeKaryawan')}
                value={filters.kode_karyawan ?? ''}
                onChange={e => setFilters(s => ({ ...s, kode_karyawan: e.target.value }))}
                title={t('filterKodeKaryawanTooltip')}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterMandor')}
                value={filters.kode_karyawan_mandor ?? ''}
                onChange={e =>
                  setFilters(s => ({
                    ...s,
                    kode_karyawan_mandor: e.target.value,
                  }))
                }
                title={t('filterMandorTooltip')}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterFcba')}
                value={filters.fcba ?? ''}
                onChange={e => setFilters(s => ({ ...s, fcba: e.target.value }))}
                title={t('filterFcbaTooltip')}
                disabled={isFcbaLocked}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterAfdeling')}
                value={filters.afdeling ?? ''}
                onChange={e => setFilters(s => ({ ...s, afdeling: e.target.value }))}
                title={t('filterAfdelingTooltip')}
                disabled={isAfdelingLocked}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterGang')}
                value={filters.gang ?? ''}
                onChange={e => setFilters(s => ({ ...s, gang: e.target.value }))}
                title={t('filterGangTooltip')}
              />
              <select
                className="select select-bordered w-full"
                value={filters.attendance ?? ''}
                onChange={e => setFilters(s => ({ ...s, attendance: e.target.value }))}
                title={t('filterKodeAttendanceTooltip')}
              >
                <option value="">Attendance</option>
                {['KJ', 'MK', 'WH', 'WS', 'ML', 'P1', 'KB', 'OT'].map(v => (
                  <option key={`att-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered w-full"
                value={filters.attendance_type ?? ''}
                onChange={e => setFilters(s => ({ ...s, attendance_type: e.target.value }))}
                title={t('filterJenisAttendanceTooltip')}
              >
                <option value="">Type</option>
                <option value="REGULAR">REGULAR</option>
                <option value="ASSISTENSI">ASSISTENSI</option>
              </select>
              <select
                className="select select-bordered w-full"
                value={filters.status_attendance ?? ''}
                onChange={e =>
                  setFilters(s => ({
                    ...s,
                    status_attendance: e.target.value,
                  }))
                }
                title={t('filterStatusAttendanceTooltip')}
              >
                <option value="">Status</option>
                <option value="Approved">Approved</option>
                <option value="Planned">Planned</option>
                <option value="Reject">Reject</option>
              </select>
              <input
                className="input input-bordered w-full"
                placeholder={t('filterFcbaTujuan')}
                value={filters.fcba_destination ?? ''}
                onChange={e =>
                  setFilters(s => ({
                    ...s,
                    fcba_destination: e.target.value,
                  }))
                }
                title={t('filterFcbaTujuanTooltip')}
              />
              <input
                className="input input-bordered w-full"
                placeholder={t('filterAfdelingTujuan')}
                value={filters.section_destination ?? ''}
                onChange={e =>
                  setFilters(s => ({
                    ...s,
                    section_destination: e.target.value,
                  }))
                }
                title={t('filterAfdelingTujuanTooltip')}
              />
            </div>

            <div className="flex justify-start gap-2 pt-3 border-t border-base-200">
              <button
                className={`btn btn-outline ${loading ? 'btn-disabled' : ''}`}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['attendance'] })}
                disabled={loading}
                title={t('filterApplyTooltip')}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    {t('loading')}
                  </>
                ) : (
                  t('filterApply')
                )}
              </button>
              <button
                className={`btn ${loading ? 'btn-disabled' : ''}`}
                onClick={() => {
                  const resetFilters: Filters = {
                    tanggal: '',
                    tanggal_end: '',
                    kemandoran: '',
                    kode_karyawan_mandor: '',
                    kode_karyawan: '',
                    fcba: '',
                    afdeling: '',
                    gang: '',
                    attendance: '',
                    attendance_type: '',
                    status_attendance: '',
                    fcba_destination: '',
                    section_destination: '',
                  };
                  setFilters(getScopedFilters(resetFilters));
                }}
                disabled={loading}
                title={t('filterResetTooltip')}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    {t('loading')}
                  </>
                ) : (
                  t('filterReset')
                )}
              </button>
            </div>
          </div>
        )}

        {/* Data Table / Gallery View */}
        {viewMode === 'table' ? (
          <AppDataTable
            columns={columns}
            data={filtered}
            loading={loading}
            pointerOnHover
            namespace="Attendance"
            onClearSearch={q ? () => setQ('') : undefined}
          />
        ) : (
          <div className="animate-slideUp [animation-delay:200ms]">
            {loading ? (
              <div className="p-8">
                <SkeletonTable rows={10} />
              </div>
            ) : (
              <AttendanceGalleryView
                ref={galleryRef}
                items={filtered}
                onClearSearch={q ? () => setQ('') : undefined}
              />
            )}
          </div>
        )}

        <AttendanceFormModal
          open={open}
          isEditing={isEditing}
          detailLoading={detailLoading}
          form={form}
          setForm={setForm}
          preview={preview}
          imgRef={imgRef}
          pdfRef={pdfRef}
          mutation={mutation}
          handleSubmit={handleSubmit}
          setOpen={setOpen}
          onChangeImage={onChangeImage}
          disableUnlessAllowed={disableUnlessAllowed}
          destOptions={destOptions}
          destFcba={destFcba}
          destSection={destSection}
          isLoadingBU={isLoadingBU}
          isLoadingDestSections={isLoadingDestSections}
          destSectionOptions={destSectionOptions}
          userLevel={userLevel}
          selFcba={selFcba}
          setSelFcba={setSelFcba}
          setSelSection={setSelSection}
          setSelGang={setSelGang}
          homeFcba={homeFcba}
          homeSection={homeSection}
          fcbaOptions={fcbaOptions}
          sectionOptions={sectionOptions}
          selSection={selSection}
          gangOptions={gangOptions}
          selGang={selGang}
          mandorOptions={mandorOptions}
          selectedMandorGang={selectedMandorGang}
          employeeOptions={employeeOptions}
          onChangeSection={onChangeSection}
          onChangeGang={onChangeGang}
          onChangeEmployee={onChangeEmployee}
          onChangeMandor={onChangeMandor}
          onChangeDestFcba={onChangeDestFcba}
          onChangeDestSection={onChangeDestSection}
          isLoadingSections={isLoadingSections}
          isLoadingGangs={isLoadingGangs}
          isLoadingSmp={isLoadingSmp}
          t={t}
        />

        {deleteOpen && (
          <DeleteModal
            open={deleteOpen}
            title={t('modalDeleteTitle')}
            description={t('modalDeleteDesc')}
            label={t('modalDeleteLabel')}
            hint={t('modalDeleteHint')}
            cancelText={t('modalCancel')}
            confirmText={t('modalDelete')}
            isLoading={deleteMutation.isPending}
            onClose={closeDeleteModal}
            onConfirm={file => {
              if (file.type !== 'application/pdf') {
                toast.error(t('toastPdfFormat'));
                return;
              }
              if (file.size > 2 * 1024 * 1024) {
                toast.error(t('toastPdfSize'));
                return;
              }
              if (deleteTargetId) {
                deleteMutation.mutate({ id: deleteTargetId, file });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
