'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { formatPerfDate } from '@/utils/helpers/perf-formatter';
import { useLocale } from '@/hooks/useLocale';
import { cookieStore } from '@/utils/auth/cookieStore';
import { toTitleCase } from '@/utils/helpers/textManipulation';
import type { UserLevel } from '@/utils/helpers/filterHelper';
import type { UserProfile } from '@/app/types/index';
import { QueryKeys } from '@/utils/queryKeys';
import type { Triplet } from '@/types/domain';

interface AttendanceRecord {
  id?: string | number;
  tanggal?: string | null;
  attendance?: string | null;
  total_late_time?: string | null;
  go_home_early?: string | null;
  fcba?: string | null;
  section?: string | null;
  gang?: string | null;
  _displayDate?: string;
  _status?: ClassifiedStatus;
}

interface DashboardStats {
  totalHadir: number;
  totalTepatWaktu: number;
  totalTelat: number;
  totalPulangAwal: number;
  totalAlpa: number;
}

interface HarvestingRecord {
  id?: string;
  nodokumen?: string;
  tanggal?: string;
  kode_karyawan?: string;
  nama_karyawan?: string;
  output?: string | number;
  status_harvesting?: string;
  fcba?: string;
  afdeling?: string;
}

interface TransportRecord {
  id?: string;
  nopengangkutan?: string;
  tanggal?: string;
  status_pengangkutan?: string;
  driver?: string;
  type_pengangkutan?: string;
  fcba?: string;
  afdeling?: string;
  output?: string | number;
  jjg?: string | number;
  jumlah?: string | number;
  quantity?: string | number;
  tonase?: string | number;
  berat?: string | number;
}

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface DailyGroupKey {
  date: string;
  fcba?: string;
  afdeling?: string;
}

interface DailySummary extends DailyGroupKey {
  hadir: number;
  tepatWaktu: number;
  telat: number;
  pulangAwal: number;
  alpa: number;
  _displayDate?: string;
}

interface MonthlySummary {
  year: number;
  month: number;
  monthName: string;
  hadir: number;
  tepatWaktu: number;
  telat: number;
  pulangAwal: number;
  alpa: number;
}

interface YearlySummary {
  year: number;
  hadir: number;
  tepatWaktu: number;
  telat: number;
  pulangAwal: number;
  alpa: number;
}

type DetailMode = 'perHari' | 'perBaris';

type ClassifiedStatus = 'HADIR' | 'TEPAT_WAKTU' | 'TELAT' | 'PULANG_AWAL' | 'ALPHA' | 'OTHER';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const getDateRange = (frame: Timeframe, month?: string, year?: string): { from: string; to: string } => {
  if (month && month !== 'ALL' && year) {
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const dateFrom = new Date(y, m, 1);
    const dateTo = new Date(y, m + 1, 0);
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    return { from: toISO(dateFrom), to: toISO(dateTo) };
  }

  const today = new Date();
  const dateTo = new Date(today);
  const dateFrom = new Date(today);

  if (frame === 'daily') {
  } else if (frame === 'weekly') {
    dateFrom.setDate(today.getDate() - 6);
  } else if (frame === 'monthly') {
    dateFrom.setDate(1);
  } else if (frame === 'yearly') {
    dateFrom.setMonth(0, 1);
    dateTo.setMonth(11, 31);
  }

  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { from: toISO(dateFrom), to: toISO(dateTo) };
};

const parseDateOnly = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const onlyDate = trimmed.split(' ')[0];
  if (!onlyDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return null;
  return onlyDate;
};

const DASHBOARD_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const DASHBOARD_MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const formatYearID = (year: number): string => {
  return year.toString();
};

export const isNonZeroTime = (raw?: string | null): boolean => {
  if (!raw) return false;
  const t = raw.trim();
  if (!t) return false;
  if (t === '0' || t === '00:00' || t === '0:00') return false;
  return true;
};

const classifyStatus = (record: AttendanceRecord): ClassifiedStatus => {
  const code = (record.attendance || '').toUpperCase().trim();
  const lateRaw = record.total_late_time;
  const goHomeRaw = record.go_home_early;

  const isAlphaCode = ['P1', 'MK'].includes(code);
  if (isAlphaCode) return 'ALPHA';

  const isLate = isNonZeroTime(lateRaw);
  const isEarly = isNonZeroTime(goHomeRaw);

  if (isEarly) return 'PULANG_AWAL';
  if (isLate) return 'TELAT';
  return 'TEPAT_WAKTU';
};

const extractAttendanceArray = (payload: unknown): AttendanceRecord[] => {
  if (!isRecord(payload)) return [];
  if ('ok' in payload && payload.ok === true && 'data' in payload) {
    const d = (payload as { data: unknown }).data;
    if (Array.isArray(d)) return d as AttendanceRecord[];
    if (isRecord(d) && 'data' in d && Array.isArray((d as { data: unknown }).data)) {
      return (d as { data: AttendanceRecord[] }).data;
    }
  }
  return [];
};

const extractTriplets = (payload: unknown): Triplet[] => {
  if (!isRecord(payload)) return [];
  if ('ok' in payload && payload.ok === true && 'data' in payload) {
    const d = (payload as { data: unknown }).data;
    if (Array.isArray(d)) {
      const triplets: Triplet[] = [];
      const seen = new Set<string>();

      for (const row of d) {
        if (!isRecord(row)) continue;
        const fcba = String(row.fcba ?? '').trim();
        const sectionname = String(row.sectionname ?? '').trim();
        const gangcode = String(row.gangcode ?? '').trim();

        if (!fcba && !sectionname && !gangcode) continue;

        const key = `${fcba}|${sectionname}|${gangcode}`;
        if (!seen.has(key)) {
          seen.add(key);
          triplets.push({ fcba, sectionname, gangcode });
        }
      }
      return triplets;
    }
    if (isRecord(d) && 'data' in d && Array.isArray((d as { data: unknown }).data)) {
      return extractTriplets({ ok: true, data: (d as { data: unknown }).data });
    }
  }
  return [];
};

export function useDashboardData() {
  const localeTag = useLocale();
  const queryClient = useQueryClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel>('OTHER');

  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');

  const [filterFcba, setFilterFcba] = useState<string>('ALL');
  const [filterAfdeling, setFilterAfdeling] = useState<string>('');

  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  const [showFilters, setShowFilters] = useState(false);

  const [detailMode, setDetailMode] = useState<DetailMode>('perHari');

  const handleClearFilters = useCallback(() => {
    setFilterFcba('ALL');
    setFilterAfdeling('');
    setSelectedMonth('ALL');
    setSelectedYear(String(new Date().getFullYear()));
    setTimeframe('monthly');
  }, []);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    queryClient.prefetchQuery({
      queryKey: QueryKeys.TRIPLETS(),
      queryFn: async () => {
        const ckTrip = cookieStore.getCookie('opt_triplets');
        if (ckTrip) {
          try {
            const arr = JSON.parse(ckTrip) as Triplet[];
            if (Array.isArray(arr) && arr.length > 0) return arr;
          } catch {
            /* ignore */
          }
        }
        const res = await fetch('/api/master/karyawans', { credentials: 'include' });
        if (!res.ok) return [];
        const json = await res.json();
        return extractTriplets(json);
      },
      staleTime: 30 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: QueryKeys.USER_PROFILE(),
      queryFn: async () => {
        const res = await fetch('/api/master/user/profile', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.ok && typeof json.data === 'object' && json.data !== null) {
          const data = json.data as Record<string, unknown>;
          return data.data ? data.data : data;
        }
        return null;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [isClient, queryClient]);

  const userProfileKey = useMemo(() => {
    return `${userProfile?.fcba || ''}|${userProfile?.afdeling || ''}|${
      userProfile?.section || ''
    }`;
  }, [userProfile?.fcba, userProfile?.afdeling, userProfile?.section]);

  const { data: triplets = [] } = useQuery({
    queryKey: QueryKeys.TRIPLETS(),
    queryFn: async () => {
      const ckTrip = cookieStore.getCookie('opt_triplets');
      if (ckTrip) {
        try {
          const arr = JSON.parse(ckTrip) as Triplet[];
          if (Array.isArray(arr) && arr.length > 0) return arr;
        } catch {
          /* ignore */
        }
      }

      const res = await fetch('/api/master/karyawans', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          await logoutAndRedirect();
        }
        return [];
      }
      const json = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      return extractTriplets(json);
    },
    enabled: isClient,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: profileData } = useQuery<UserProfile | null>({
    queryKey: QueryKeys.USER_PROFILE(),
    queryFn: async () => {
      const res = await fetch('/api/master/user/profile', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          await logoutAndRedirect();
        }
        return null;
      }
      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return null;
      }
      if (json.ok && typeof json.data === 'object' && json.data !== null) {
        const data = json.data as Record<string, unknown>;
        const inner = data.data ? data.data : data;
        return inner as UserProfile;
      }
      return null;
    },
    enabled: isClient,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  useEffect(() => {
    if (profileData) {
      setUserProfile(prev => ({ ...(prev || {}), ...profileData }));
      const lvl2 = (profileData.level || '').toUpperCase() as UserLevel;
      const validLevels: UserLevel[] = ['ADM', 'MGR', 'KSI', 'AST', 'KRA', 'MD1', 'KRT', 'KRP', 'MDP'];
      const finalLevel = validLevels.includes(lvl2) ? lvl2 : 'OTHER';
      if (finalLevel !== 'OTHER') {
        setUserLevel(finalLevel);
        if (finalLevel === 'ADM') {
          setFilterFcba('ALL');
        } else if (['MGR', 'KSI'].includes(finalLevel)) {
          setFilterFcba(profileData.fcba || '');
        } else if (['AST', 'KRA', 'MD1', 'KRT'].includes(finalLevel)) {
          setFilterFcba(profileData.fcba || '');
          setFilterAfdeling(profileData.afdeling || profileData.section || '');
        } else if (['KRP', 'MDP'].includes(finalLevel)) {
          setFilterFcba(profileData.fcba || '');
          setFilterAfdeling(profileData.afdeling || profileData.section || '');
        }
      }
    }
  }, [profileData]);

  const {
    data: attendanceRaw = [],
    isLoading: loading,
    isFetching,
    error: attendanceError,
  } = useQuery({
    queryKey: [...QueryKeys.ATTENDANCE(), timeframe, selectedMonth, selectedYear, filterFcba, filterAfdeling, userLevel, userProfileKey],
    queryFn: async () => {
      const { from, to } = getDateRange(timeframe, selectedMonth, selectedYear);
      const params = new URLSearchParams();
      params.set('tanggal', from);
      params.set('tanggal_end', to);

      const homeFcba = userProfile?.fcba || cookieStore.getCookie('user_Fcba') || '';
      const homeAfdeling =
        userProfile?.afdeling || userProfile?.section || cookieStore.getCookie('user_Section') || '';
      const homeGang = userProfile?.gang || cookieStore.getCookie('user_Gang') || '';

      if (userLevel === 'ADM') {
        if (filterFcba && filterFcba !== 'ALL') params.set('fcba', filterFcba.trim());
        if (filterAfdeling.trim()) params.set('afdeling', filterAfdeling.trim());
      } else if (['MGR', 'KSI'].includes(userLevel)) {
        if (homeFcba) params.set('fcba', homeFcba.trim());
        if (filterAfdeling.trim()) params.set('afdeling', filterAfdeling.trim());
      } else if (['AST', 'KRA', 'MD1'].includes(userLevel)) {
        if (homeFcba) params.set('fcba', homeFcba.trim());
        if (homeAfdeling) params.set('afdeling', homeAfdeling.trim());
      } else if (['MDP', 'KRT', 'KRP'].includes(userLevel)) {
        if (homeFcba) params.set('fcba', homeFcba.trim());
        if (homeAfdeling) params.set('afdeling', homeAfdeling.trim());
        if (homeGang) params.set('kemandoran', homeGang.trim());
      }

      const res = await fetch(`/api/attendance?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

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
        } catch { /* fallback ke HTTP status */ }
        throw new Error(detail);
      }

      const json: unknown = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      return extractAttendanceArray(json);
    },
    enabled: isClient,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const {
    data: harvestingStats = {
      total: 0,
      totalOutput: 0,
      approved: 0,
      planned: 0,
    },
    isLoading: loadingHarvesting,
  } = useQuery({
    queryKey: [...QueryKeys.HARVESTING(), timeframe, selectedMonth, selectedYear, filterFcba, filterAfdeling, userLevel, userProfileKey],
    queryFn: async () => {
      const { from, to } = getDateRange(timeframe, selectedMonth, selectedYear);
      const p = new URLSearchParams();
      p.set('tanggal', from);
      p.set('tanggal_end', to);

      const homeFcba = userProfile?.fcba || cookieStore.getCookie('user_Fcba') || '';
      const homeAfdeling =
        userProfile?.afdeling || userProfile?.section || cookieStore.getCookie('user_Section') || '';
      const homeGang = userProfile?.gang || cookieStore.getCookie('user_Gang') || '';

      if (userLevel === 'ADM') {
        if (filterFcba && filterFcba !== 'ALL') p.set('fcba', filterFcba.trim());
        if (filterAfdeling.trim()) p.set('afdeling', filterAfdeling.trim());
      } else if (['MGR', 'KSI'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (filterAfdeling.trim()) p.set('afdeling', filterAfdeling.trim());
      } else if (['AST', 'KRA', 'KRT', 'MD1'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (homeAfdeling) p.set('afdeling', homeAfdeling.trim());
      } else if (['MDP', 'KRP'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (homeAfdeling) p.set('afdeling', homeAfdeling.trim());
        if (homeGang) p.set('kemandoran', homeGang.trim());
      }

      const res = await fetch(`/api/harvest?${p.toString()}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        await logoutAndRedirect();
        return { total: 0, totalOutput: 0, approved: 0, planned: 0 };
      }
      if (res.status === 404 || !res.ok)
        return { total: 0, totalOutput: 0, approved: 0, planned: 0 };

      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return { total: 0, totalOutput: 0, approved: 0, planned: 0 };
      }
      let rows: unknown[] = [];
      if (Array.isArray(json)) {
        rows = json;
      } else if (
        json &&
        typeof json === 'object' &&
        'data' in json &&
        Array.isArray((json as Record<string, unknown>).data)
      ) {
        rows = (json as Record<string, unknown>).data as unknown[];
      }
      const harvestRows = rows as HarvestingRecord[];

      let totalOutput = 0;
      let approved = 0;
      let planned = 0;

      for (const r of harvestRows) {
        totalOutput += parseInt(String(r.output || 0)) || 0;
        if (r.status_harvesting === 'Approved') approved++;
        else if (r.status_harvesting === 'Planned') planned++;
      }

      return {
        total: harvestRows.length,
        totalOutput,
        approved,
        planned,
      };
    },
    enabled: isClient,
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
  });

  const {
    data: transportStats = {
      total: 0,
      approved: 0,
      planned: 0,
      completed: 0,
      totalOutput: 0,
    },
    isLoading: loadingTransport,
  } = useQuery({
    queryKey: [...QueryKeys.PENGANGKUTANS(), timeframe, selectedMonth, selectedYear, filterFcba, filterAfdeling, userLevel, userProfileKey],
    queryFn: async () => {
      const { from, to } = getDateRange(timeframe, selectedMonth, selectedYear);
      const p = new URLSearchParams();
      p.set('tanggal', from);
      p.set('tanggal_end', to);

      const homeFcba = userProfile?.fcba || cookieStore.getCookie('user_Fcba') || '';
      const homeAfdeling =
        userProfile?.afdeling || userProfile?.section || cookieStore.getCookie('user_Section') || '';
      const homeGang = userProfile?.gang || cookieStore.getCookie('user_Gang') || '';

      if (userLevel === 'ADM') {
        if (filterFcba && filterFcba !== 'ALL') p.set('fcba', filterFcba.trim());
        if (filterAfdeling.trim()) p.set('afdeling', filterAfdeling.trim());
      } else if (['MGR', 'KSI'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (filterAfdeling.trim()) p.set('afdeling', filterAfdeling.trim());
      } else if (['AST', 'KRA', 'KRT', 'MD1'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (homeAfdeling) p.set('afdeling', homeAfdeling.trim());
      } else if (['MDP', 'KRP'].includes(userLevel)) {
        if (homeFcba) p.set('fcba', homeFcba.trim());
        if (homeAfdeling) p.set('afdeling', homeAfdeling.trim());
        if (homeGang) p.set('kemandoran', homeGang.trim());
      }

      const res = await fetch(`/api/transport?${p.toString()}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        await logoutAndRedirect();
        return {
          total: 0,
          approved: 0,
          planned: 0,
          completed: 0,
          totalOutput: 0,
        };
      }
      if (res.status === 404 || !res.ok)
        return {
          total: 0,
          approved: 0,
          planned: 0,
          completed: 0,
          totalOutput: 0,
        };

      const json: Record<string, unknown> = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return {
          total: 0,
          approved: 0,
          planned: 0,
          completed: 0,
          totalOutput: 0,
        };
      }
      let rows: unknown[] = [];
      if (Array.isArray(json)) {
        rows = json;
      } else if (
        json &&
        typeof json === 'object' &&
        'data' in json &&
        Array.isArray((json as Record<string, unknown>).data)
      ) {
        rows = (json as Record<string, unknown>).data as unknown[];
      }
      const transportRows = rows as TransportRecord[];

      let totalOutput = 0;
      let approved = 0;
      let planned = 0;
      let completed = 0;

      for (const r of transportRows) {
        const candidates = [r.output, r.jjg, r.jumlah, r.quantity, r.tonase, r.berat];
        for (const c of candidates) {
          if (c === null || c === undefined || c === '') continue;
          const n = parseInt(String(c).replace(/[^0-9-]/g, ''), 10);
          if (!Number.isNaN(n)) {
            totalOutput += n;
            break;
          }
        }
        if (r.status_pengangkutan === 'Approved') approved++;
        else if (r.status_pengangkutan === 'Planned') planned++;
        else if (r.status_pengangkutan === 'Completed') completed++;
      }

      return {
        total: transportRows.length,
        approved,
        planned,
        completed,
        totalOutput,
      };
    },
    enabled: isClient,
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
  });

  const error = attendanceError
    ? attendanceError instanceof Error
      ? attendanceError.message
      : 'Gagal memuat data dashboard'
    : null;

  useEffect(() => {
    const userInfo = cookieStore.getAllUserInfo();
    const { fullName, level, fcba, section, gang } = userInfo;
    const lvl = (level || '').toUpperCase() as UserLevel;
    const validLevels: UserLevel[] = ['ADM', 'MGR', 'KSI', 'AST', 'KRA', 'MD1', 'KRT', 'KRP', 'MDP'];
    const finalLevel = validLevels.includes(lvl) ? lvl : 'OTHER';

    setUserLevel(finalLevel);
    setUserProfile(prev => ({
      ...(prev || {}),
      fullname: fullName || prev?.fullname,
      level: level || prev?.level,
      fcba: fcba || prev?.fcba,
      afdeling: section || prev?.afdeling,
      gang: gang || prev?.gang,
    }));

    if (finalLevel === 'ADM') {
      setFilterFcba('ALL');
      setFilterAfdeling('');
    } else if (['MGR', 'KSI'].includes(finalLevel)) {
      setFilterFcba(fcba || '');
      setFilterAfdeling('');
    } else if (['AST', 'KRA', 'MD1', 'KRT'].includes(finalLevel)) {
      setFilterFcba(fcba || '');
      setFilterAfdeling(section || '');
    } else if (['KRP', 'MDP'].includes(finalLevel)) {
      setFilterFcba(fcba || '');
      setFilterAfdeling(section || '');
    }
  }, []);

  const fcbaOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const t of triplets) {
      if (t.fcba) uniq.add(t.fcba);
    }

    const base = Array.from(uniq)
      .sort()
      .map(v => ({ value: v, label: v }));

    if (userLevel === 'ADM') {
      return [{ value: 'ALL', label: 'ALL FCBA' }, ...base];
    }
    return base;
  }, [triplets, userLevel]);

  const afdelingOptions = useMemo(() => {
    const uniq = new Set<string>();
    const isAllFcba = !filterFcba || filterFcba === 'ALL';

    for (const t of triplets) {
      if (t.sectionname && (isAllFcba || t.fcba === filterFcba)) {
        uniq.add(t.sectionname);
      }
    }

    const options = Array.from(uniq)
      .sort()
      .map(v => ({ value: v, label: v }));

    return [{ value: '', label: 'Semua Afdeling' }, ...options];
  }, [triplets, filterFcba]);

  const monthOptions = useMemo(() => {
    const months = [
      { value: 'ALL', label: 'Semua Bulan' },
      { value: '01', label: 'Januari' },
      { value: '02', label: 'Februari' },
      { value: '03', label: 'Maret' },
      { value: '04', label: 'April' },
      { value: '05', label: 'Mei' },
      { value: '06', label: 'Juni' },
      { value: '07', label: 'Juli' },
      { value: '08', label: 'Agustus' },
      { value: '09', label: 'September' },
      { value: '10', label: 'Oktober' },
      { value: '11', label: 'November' },
      { value: '12', label: 'Desember' },
    ];
    return months;
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: { value: string; label: string }[] = [];
    for (let y = 2026; y <= currentYear; y++) {
      years.push({ value: String(y), label: String(y) });
    }
    return years.reverse();
  }, []);

  const {
    stats,
    dailySummaries,
    monthlySummaries,
    yearlySummaries,
    rowDetails,
    filteredAttendance,
  } = useMemo(() => {
    const { from, to } = getDateRange(timeframe);

    const stats: DashboardStats = {
      totalHadir: 0,
      totalTepatWaktu: 0,
      totalTelat: 0,
      totalPulangAwal: 0,
      totalAlpa: 0,
    };

    const dailyMap = new Map<string, DailySummary>();
    const monthlyMap = new Map<string, MonthlySummary>();
    const yearlyMap = new Map<number, YearlySummary>();
    const filteredAttendance: AttendanceRecord[] = [];
    const rowDetailsWithDates: { record: AttendanceRecord; date: string }[] = [];

    if (!attendanceRaw.length) {
      return {
        stats,
        dailySummaries: [],
        monthlySummaries: [],
        yearlySummaries: [],
        rowDetails: [],
        filteredAttendance: [],
      };
    }

    for (const r of attendanceRaw) {
      const dateOnly = parseDateOnly(r.tanggal);
      if (!dateOnly || dateOnly < from || dateOnly > to) continue;

      const cls = classifyStatus(r);

      r._displayDate = formatPerfDate(dateOnly, localeTag, DASHBOARD_DATE_OPTIONS);
      r._status = cls;

      filteredAttendance.push(r);
      rowDetailsWithDates.push({ record: r, date: dateOnly });

      if (cls === 'TEPAT_WAKTU') {
        stats.totalTepatWaktu += 1;
        stats.totalHadir += 1;
      } else if (cls === 'TELAT') {
        stats.totalTelat += 1;
        stats.totalHadir += 1;
      } else if (cls === 'PULANG_AWAL') {
        stats.totalPulangAwal += 1;
        stats.totalHadir += 1;
      } else if (cls === 'ALPHA') {
        stats.totalAlpa += 1;
      }

      let keyObj: DailyGroupKey;
      if (userLevel === 'ADM') {
        keyObj = {
          date: dateOnly,
          fcba: r.fcba || '-',
          afdeling: r.section || '-',
        };
      } else if (userLevel === 'MGR') {
        keyObj = {
          date: dateOnly,
          afdeling: r.section || '-',
        };
      } else {
        keyObj = { date: dateOnly };
      }

      const keyParts = [keyObj.date];
      if (keyObj.fcba) keyParts.push(`FCBA:${keyObj.fcba}`);
      if (keyObj.afdeling) keyParts.push(`AFD:${keyObj.afdeling}`);
      const dailyKey = keyParts.join('|');

      let dSummary = dailyMap.get(dailyKey);
      if (!dSummary) {
        dSummary = {
          ...keyObj,
          hadir: 0,
          tepatWaktu: 0,
          telat: 0,
          pulangAwal: 0,
          alpa: 0,
          _displayDate: r._displayDate,
        };
        dailyMap.set(dailyKey, dSummary);
      }

      if (cls === 'TEPAT_WAKTU') {
        dSummary.tepatWaktu += 1;
        dSummary.hadir += 1;
      } else if (cls === 'TELAT') {
        dSummary.telat += 1;
        dSummary.hadir += 1;
      } else if (cls === 'PULANG_AWAL') {
        dSummary.pulangAwal += 1;
        dSummary.hadir += 1;
      } else if (cls === 'ALPHA') {
        dSummary.alpa += 1;
      }

      if (timeframe === 'monthly' || timeframe === 'yearly') {
        const [year, month] = dateOnly.split('-').map(Number);
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

        let mSummary = monthlyMap.get(monthKey);
        if (!mSummary) {
          mSummary = {
            year,
            month,
            monthName: formatPerfDate(new Date(year, month - 1, 1), localeTag, DASHBOARD_MONTH_OPTIONS),
            hadir: 0,
            tepatWaktu: 0,
            telat: 0,
            pulangAwal: 0,
            alpa: 0,
          };
          monthlyMap.set(monthKey, mSummary);
        }

        if (cls === 'TEPAT_WAKTU') {
          mSummary.tepatWaktu += 1;
          mSummary.hadir += 1;
        } else if (cls === 'TELAT') {
          mSummary.telat += 1;
          mSummary.hadir += 1;
        } else if (cls === 'PULANG_AWAL') {
          mSummary.pulangAwal += 1;
          mSummary.hadir += 1;
        } else if (cls === 'ALPHA') {
          mSummary.alpa += 1;
        }
      }

      if (timeframe === 'yearly') {
        const year = parseInt(dateOnly.split('-')[0]);
        let ySummary = yearlyMap.get(year);
        if (!ySummary) {
          ySummary = {
            year,
            hadir: 0,
            tepatWaktu: 0,
            telat: 0,
            pulangAwal: 0,
            alpa: 0,
          };
          yearlyMap.set(year, ySummary);
        }

        if (cls === 'TEPAT_WAKTU') {
          ySummary.tepatWaktu += 1;
          ySummary.hadir += 1;
        } else if (cls === 'TELAT') {
          ySummary.telat += 1;
          ySummary.hadir += 1;
        } else if (cls === 'PULANG_AWAL') {
          ySummary.pulangAwal += 1;
          ySummary.hadir += 1;
        } else if (cls === 'ALPHA') {
          ySummary.alpa += 1;
        }
      }
    }

    // ⚡ Bolt: Optimize date sorting for ISO-8601 formatted string dates (YYYY-MM-DD).
    // Using standard lexicographical comparison operators instead of localeCompare() is up to 100x faster,
    // as it completely bypasses the heavy internationalization collation lookup overhead while yielding
    // identical descending/ascending sort order.
    const dailySummaries = Array.from(dailyMap.values()).sort((a, b) => {
      if (b.date > a.date) return 1;
      if (b.date < a.date) return -1;
      return 0;
    });
    const monthlySummaries = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    const yearlySummaries = Array.from(yearlyMap.values()).sort((a, b) => b.year - a.year);
    const sortedRowDetails = rowDetailsWithDates
      .sort((a, b) => {
        if (b.date > a.date) return 1;
        if (b.date < a.date) return -1;
        return 0;
      })
      .map(item => item.record);

    return {
      stats,
      dailySummaries,
      monthlySummaries,
      yearlySummaries,
      rowDetails: sortedRowDetails,
      filteredAttendance,
    };
  }, [attendanceRaw, timeframe, userLevel, localeTag]);

  const barChartData = useMemo(
    () => [
      { label: 'Hadir (Total)', value: stats.totalHadir },
      { label: 'Tepat Waktu', value: stats.totalTepatWaktu },
      { label: 'Telat', value: stats.totalTelat },
      { label: 'Pulang Awal', value: stats.totalPulangAwal },
      { label: 'Alpha', value: stats.totalAlpa },
    ],
    [stats]
  );

  const pieChartData = useMemo(
    () => [
      { label: 'Tepat Waktu', value: stats.totalTepatWaktu, color: '#10b981' },
      { label: 'Telat', value: stats.totalTelat, color: '#f59e0b' },
      { label: 'Pulang Awal', value: stats.totalPulangAwal, color: '#ef4444' },
      { label: 'Alpha', value: stats.totalAlpa, color: '#000000' },
    ],
    [stats]
  );

  const lineChartData = useMemo(() => {
    if (timeframe === 'daily' || timeframe === 'weekly') {
      return dailySummaries
        .slice()
        .reverse()
        .map(d => ({
          label: d._displayDate || d.date,
          hadir: d.hadir,
          tepatWaktu: d.tepatWaktu,
          telat: d.telat,
          pulangAwal: d.pulangAwal,
          alpa: d.alpa,
        }));
    } else if (timeframe === 'monthly') {
      return monthlySummaries
        .slice()
        .reverse()
        .map(m => ({
          label: m.monthName,
          hadir: m.hadir,
          tepatWaktu: m.tepatWaktu,
          telat: m.telat,
          pulangAwal: m.pulangAwal,
          alpa: m.alpa,
        }));
    } else if (timeframe === 'yearly') {
      return yearlySummaries
        .slice()
        .reverse()
        .map(y => ({
          label: formatYearID(y.year),
          hadir: y.hadir,
          tepatWaktu: y.tepatWaktu,
          telat: y.telat,
          pulangAwal: y.pulangAwal,
          alpa: y.alpa,
        }));
    }
    return [];
  }, [timeframe, dailySummaries, monthlySummaries, yearlySummaries]);

  const { pctHadir, pctTepatWaktu, pctTelat, pctPulangAwal, pctAlpa } = useMemo(() => {
    const total =
      stats.totalTepatWaktu + stats.totalTelat + stats.totalPulangAwal + stats.totalAlpa;

    const calculatePct = (value: number) => (total ? Math.round((value / total) * 100) : 0);

    return {
      pctHadir: calculatePct(stats.totalHadir),
      pctTepatWaktu: calculatePct(stats.totalTepatWaktu),
      pctTelat: calculatePct(stats.totalTelat),
      pctPulangAwal: calculatePct(stats.totalPulangAwal),
      pctAlpa: calculatePct(stats.totalAlpa),
    };
  }, [stats]);

  const displayName =
    toTitleCase(
      userProfile?.fullname || cookieStore.getCookie('user_FullName') || userProfile?.username || ''
    ) || 'User';

  const displayLevel = (userProfile?.level || '').toUpperCase() || userLevel;

  const displayFcba = userProfile?.fcba || '-';
  const displayAfdeling = userProfile?.afdeling || userProfile?.section || '-';
  const displayGang = userProfile?.gang || '-';

  const linkParams = useMemo(() => {
    const { from, to } = getDateRange(timeframe, selectedMonth, selectedYear);
    const p = new URLSearchParams();
    p.set('tanggal', from);
    p.set('tanggal_end', to);
    return p.toString();
  }, [timeframe, selectedMonth, selectedYear]);

  return {
    isClient,
    userProfile,
    userLevel,
    timeframe,
    setTimeframe,
    filterFcba,
    setFilterFcba,
    filterAfdeling,
    setFilterAfdeling,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    showFilters,
    setShowFilters,
    detailMode,
    setDetailMode,
    handleClearFilters,
    triplets,
    loading, isFetching,
    error,
    harvestingStats,
    loadingHarvesting,
    transportStats,
    loadingTransport,
    fcbaOptions,
    afdelingOptions,
    monthOptions,
    yearOptions,
    stats,
    dailySummaries,
    monthlySummaries,
    yearlySummaries,
    rowDetails,
    filteredAttendance,
    barChartData,
    pieChartData,
    lineChartData,
    pctHadir,
    pctTepatWaktu,
    pctTelat,
    pctPulangAwal,
    pctAlpa,
    displayName,
    displayLevel,
    displayFcba,
    displayAfdeling,
    displayGang,
    linkParams,
    localeTag,
  };
}
