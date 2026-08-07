'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessUnit } from '@/utils/services/businessUnitService';
import { fetchBusinessUnits } from '@/utils/services/businessUnitService';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import type { Harvest, HarvestFormState, HarvestFilters, Triplet, Employee } from '@/types/domain';
import { initialHarvestForm } from '@/types/domain';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { getProxiedImageUrl } from '@/utils/helpers/imageHelper';
import { formatPerfDate } from '@/utils/helpers/perf-formatter';
import { useLocale } from '@/hooks/useLocale';
import { getTodayISO, getYesterdayISO } from '@/utils/helpers/datetime';
import { cookieStore } from '@/utils/auth/cookieStore';
import { type UserLevel } from '@/utils/helpers/filterHelper';
import { getReadableDevice, getOrCreateDeviceIds } from '@/utils/helpers/deviceHelper';
import { extractArrayData, extractSingleData } from '@/utils/api/apiHelpers';
import {
  fetchHarvestList,
  fetchHarvestDetail,
  fetchTphFieldcodes,
  fetchTphDetail,
} from '@/utils/services/harvestService';
import { QueryKeys } from '@/utils/queryKeys';

type EmployeesApiRow = {
  [key: string]: unknown;
  fccode?: unknown;
  fcname?: unknown;
  fcba?: unknown;
  sectionname?: unknown;
  gangcode?: unknown;
  noancak?: unknown;
  NOANCAK?: unknown;
};

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const getMonthDateRange = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start: formatDateISOStatic(start), end: formatDateISOStatic(end) };
};

const formatDateISOStatic = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Convert a tanggal string (from API) into a value compatible with
 * <input type="datetime-local"> i.e. YYYY-MM-DDTHH:MM.
 * Accepts "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DDTHH:MM:SS", ISO with Z, or date-only.
 */
const formatTanggalForInput = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/.exec(trimmed);
  if (match) {
    return `${match[1]}T${match[2]}:${match[3]}`;
  }
  const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return dateOnly ? dateOnly[1] : '';
};

const formatDocDate = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return '';
  return `${match[3]}${match[2]}${match[1].slice(-2)}`;
};

const getRunningNumber = (nodokumen: string | null | undefined) => {
  const match = /\/(\d{4})$/.exec((nodokumen || '').trim());
  return match ? Number(match[1]) : 0;
};

const buildHarvestDocumentNo = ({
  fcba,
  afdeling,
  fieldcode,
  noancak,
  tanggal,
  running,
}: {
  fcba: string;
  afdeling: string;
  fieldcode: string;
  noancak: string;
  tanggal: string;
  running: number;
}) => {
  const docDate = formatDocDate(tanggal);
  if (!fcba || !afdeling || !fieldcode || !noancak || !docDate || running <= 0) return '';
  return `${fcba}/${afdeling}/${fieldcode}-${noancak}/${docDate}/${String(running).padStart(4, '0')}`;
};

export function useHarvestData() {
  const localeTag = useLocale();
  const tH = useTranslations('Harvest');
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useSearchShortcut();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [allExpanded, setAllExpanded] = useState(false);
  const galleryRef = useRef<{ expandAll: () => void; collapseAll: () => void }>(null);

  const getInitialFilters = (): HarvestFilters => {
    const yesterday = getYesterdayISO();
    const today = getTodayISO();
    return {
      tanggal: yesterday,
      tanggal_end: today,
      nodokumen: '',
      kode_karyawan: '',
      fcba: '',
      afdeling: '',
      tph: '',
      kemandoran: '',
    };
  };

  const [filters, setFilters] = useState<HarvestFilters>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<HarvestFilters>(getInitialFilters);

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
      setAppliedFilters(prev => ({
        ...prev,
        ...(tanggal ? { tanggal } : {}),
        ...(tanggal_end ? { tanggal_end } : {}),
      }));
    }
  }, []);

  const [userLevel, setUserLevel] = useState<UserLevel>('OTHER');
  const [homeFcba, setHomeFcba] = useState<string>('');
  const [homeSection, setHomeSection] = useState<string>('');
  const [homeGang, setHomeGang] = useState<string>('');
  const [userFcbaCookie, setUserFcbaCookie] = useState<string>('');
  const [userAfdelingCookie, setUserAfdelingCookie] = useState<string>('');

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');


  const [form, setForm] = useState<HarvestFormState>(initialHarvestForm);
  const [preview, setPreview] = useState<string>('');
  const imgRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [selFcba, setSelFcba] = useState<string>('');
  const [selSection, setSelSection] = useState<string>('');

  const [locLoading, setLocLoading] = useState<boolean>(false);

  const canModify = userLevel === 'ADM' || userLevel === 'KSI';

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

  useEffect(() => {
    setHomeFcba(cookieStore.getFcba());
    setHomeSection(cookieStore.getSection());
    setHomeGang(cookieStore.getGang());
    setUserFcbaCookie(
      cookieStore.getCookie('user_Fcba') || cookieStore.getCookie('user_fcba') || ''
    );
    setUserAfdelingCookie(
      cookieStore.getCookie('user_Afdeling') || cookieStore.getCookie('user_afdeling') || ''
    );

    const levelRaw = cookieStore.getLevel();
    if (
      levelRaw === 'ADM' ||
      levelRaw === 'MGR' ||
      levelRaw === 'KSI' ||
      levelRaw === 'MD1' ||
      levelRaw === 'AST' ||
      levelRaw === 'KRT' ||
      levelRaw === 'KRA' ||
      levelRaw === 'KRP' ||
      levelRaw === 'MDP'
    ) {
      setUserLevel(levelRaw as UserLevel);
    } else {
      setUserLevel('OTHER');
    }

    const ckTrip = cookieStore.getCookie('opt_triplets');
    if (ckTrip) {
      try {
        const arr = JSON.parse(ckTrip) as Triplet[];
        if (Array.isArray(arr) && arr.length) setTriplets(arr);
      } catch {
        // ignore
      }
    }
  }, []);

  const getScopedFilters = useCallback(
    (baseFilters: HarvestFilters): HarvestFilters => {
      const scopedFilters: HarvestFilters = { ...baseFilters };
      if (userLevel === 'ADM' || userLevel === 'OTHER') {
        return scopedFilters;
      }
      scopedFilters.fcba = userFcbaCookie || homeFcba;
      if (userLevel === 'MGR' || userLevel === 'KSI') {
        // only FCBA locked
      } else if (userLevel === 'MDP' || userLevel === 'KRP') {
        scopedFilters.afdeling = userAfdelingCookie || homeSection;
        scopedFilters.kemandoran = homeGang;
      } else {
        // MD1, AST, KRT, KRA
        scopedFilters.afdeling = userAfdelingCookie || homeSection;
      }
      return scopedFilters;
    },
    [userLevel, homeFcba, homeSection, homeGang, userFcbaCookie, userAfdelingCookie]
  );

  const isFcbaLocked = userLevel !== 'ADM' && userLevel !== 'OTHER';
  const isAfdelingLocked = !(
    userLevel === 'ADM' ||
    userLevel === 'MGR' ||
    userLevel === 'KSI' ||
    userLevel === 'OTHER'
  );
  const isKemandoranLocked = userLevel === 'MDP' || userLevel === 'KRP';

  useEffect(() => {
    setFilters(current => {
      const next = getScopedFilters(current);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [getScopedFilters]);

  useEffect(() => {
    if (userLevel !== 'ADM' && !selFcba) {
      setSelFcba(userFcbaCookie || homeFcba || '');
    }
    if (!(userLevel === 'ADM' || userLevel === 'MGR' || userLevel === 'KSI') && !selSection) {
      setSelSection(userAfdelingCookie || homeSection || '');
    }
  }, [userLevel, homeFcba, homeSection, selFcba, selSection, userFcbaCookie, userAfdelingCookie]);

  const {
    data: items = [],
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: [...QueryKeys.HARVEST(appliedFilters as Record<string, string>), userLevel, homeFcba, homeSection, homeGang],
    queryFn: async () => {
      const f = getScopedFilters(appliedFilters);
      const p: Record<string, string> = {};
      if (f.tanggal) p.tanggal = f.tanggal;
      if (f.tanggal_end) p.tanggal_end = f.tanggal_end!;
      if (f.nodokumen) p.nodokumen = f.nodokumen;
      if (f.kode_karyawan) p.kode_karyawan = f.kode_karyawan;
      if (f.fcba) p.fcba = f.fcba;
      if (f.afdeling) p.afdeling = f.afdeling;
      if (f.tph) p.tph = f.tph;
      if (f.fieldcode) p.fieldcode = f.fieldcode;
      if (f.kemandoran) p.kemandoran = f.kemandoran;
      if (f.status_pengangkutan) p.status_pengangkutan = f.status_pengangkutan;

      const res = await fetchHarvestList(p);

      if (!res.ok) {
        if (res.status === 401) {
          await logoutAndRedirect();
          return [];
        }
        if (res.status === 404) return [];
        throw new Error(`HTTP ${res.status}`);
      }

      const json: unknown = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }
      const raw = extractArrayData<Harvest>(json);

      const byId = new Map<string, Harvest>();
      for (const row of raw) {
        if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
      }
      const dataRaw = Array.from(byId.values());

      const seen = new Set<string>();
      return dataRaw.map((it, idx) => {
        const dateOnly = (it.tanggal || '').split(' ')[0];
        const displayDate = dateOnly ? formatPerfDate(dateOnly, localeTag) : '-';

        const searchContent = [
          it.nodokumen,
          it.kode_karyawan,
          it.nama_karyawan,
          it.fcba,
          it.afdeling,
          it.tph,
          it.fieldcode,
          it.status_harvesting,
          it.status_pengangkutan,
          it.kemandoran,
          dateOnly,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const candidate = [it.id || '', it.nodokumen || '', dateOnly, String(idx)].join('|');
        let key = candidate;
        while (seen.has(key)) key = `${key}_`;
        seen.add(key);
        return {
          ...it,
          _rowKey: key,
          _displayDate: displayDate,
          _searchContent: searchContent,
          _outputNum: toNumber(it.output),
          _mentahNum: toNumber(it.mentah),
          _overNum: toNumber(it.overripe),
          _busukNum: toNumber(it.busuk),
          _busuk2Num: toNumber(it.busuk2),
          _kecilNum: toNumber(it.buahkecil),
          _partenoNum: toNumber(it.parteno),
          _parteno50Num: toNumber(it.parteno50plus),
          _brondolNum: toNumber(it.brondol),
          _panjangNum: toNumber(it.tangkaipanjang),
          _outputPgknNum: toNumber(it.output_pgkn),
          _sisaPgknNum: toNumber(it.sisa_pgkn),
          _tinggalNum: toNumber(it.tinggal),
        };
      });
    },
    enabled: !!homeFcba || userLevel === 'ADM',
  });

  const loading = isLoading || isFetching;

  useEffect(() => {
    if (queryError) {
      const msg =
        typeof queryError === 'string'
          ? queryError
          : queryError instanceof Error
            ? queryError.message
            : tH('toastFetchError');
      toast.error(msg);
    }
  }, [queryError, tH]);

  const { data: nextDocumentNo = '', isFetching: isFetchingDocumentNo } = useQuery({
    queryKey: QueryKeys.HARVEST_DOCUMENT_NO(
      form.tanggal,
      form.fcba,
      form.afdeling,
      form.fieldcode,
      form.noancak,
      form.kemandoran
    ),
    queryFn: async () => {
      const range = getMonthDateRange(form.tanggal);
      if (
        !range ||
        !form.fcba ||
        !form.afdeling ||
        !form.fieldcode ||
        !form.noancak ||
        !form.kemandoran
      ) {
        return '';
      }

      const params: Record<string, string> = {
        tanggal: range.start,
        tanggal_end: range.end,
        fcba: form.fcba,
        afdeling: form.afdeling,
        kemandoran: form.kemandoran,
      };

      try {
        const res = await fetchHarvestList(params);
        if (res.status === 401) {
          await logoutAndRedirect();
          return '';
        }
        if (!res.ok) {
          console.warn('[useHarvestData] fetchHarvestList returned not ok, falling back to starting number');
          const fallback = buildHarvestDocumentNo({
            fcba: form.fcba,
            afdeling: form.afdeling,
            fieldcode: form.fieldcode,
            noancak: form.noancak,
            tanggal: form.tanggal,
            running: 1,
          });
          return fallback;
        }

        const json: unknown = await res.json();
        if (isUnauthenticatedJson(json)) {
          await logoutAndRedirect();
          return '';
        }

        const rows = extractArrayData<Harvest>(json);
        const maxRunning = rows.reduce(
          (max, row) => Math.max(max, getRunningNumber(row.nodokumen)),
          0
        );

        return buildHarvestDocumentNo({
          fcba: form.fcba,
          afdeling: form.afdeling,
          fieldcode: form.fieldcode,
          noancak: form.noancak,
          tanggal: form.tanggal,
          running: maxRunning + 1,
        });
      } catch (err) {
        console.warn('[useHarvestData] fetchHarvestList failed, falling back to starting number', err);
        const fallback = buildHarvestDocumentNo({
          fcba: form.fcba,
          afdeling: form.afdeling,
          fieldcode: form.fieldcode,
          noancak: form.noancak,
          tanggal: form.tanggal,
          running: 1,
        });
        return fallback;
      }
    },
    enabled:
      !isEditing &&
      !!form.tanggal &&
      !!form.fcba &&
      !!form.afdeling &&
      !!form.fieldcode &&
      !!form.noancak &&
      !!form.kemandoran,
    staleTime: 0,
  });

  useEffect(() => {
    if (isEditing || !nextDocumentNo) return;
    setForm(s => (s.nodokumen === nextDocumentNo ? s : { ...s, nodokumen: nextDocumentNo }));
  }, [isEditing, nextDocumentNo]);

  useEffect(() => {
    if (isEditing) return;
    setForm(s => (s.nodokumen ? { ...s, nodokumen: '' } : s));
  }, [
    isEditing,
    form.tanggal,
    form.fcba,
    form.afdeling,
    form.fieldcode,
    form.noancak,
    form.kemandoran,
  ]);

  const { data: businessUnits = [], isLoading: isLoadingBU } = useQuery({
    queryKey: QueryKeys.BUSINESS_UNITS(),
    queryFn: async () => {
      try {
        const bu = await fetchBusinessUnits({ fctype: 'E' });
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [], isLoading: isLoadingEmp } = useQuery({
    queryKey: [...QueryKeys.EMPLOYEES(userLevel, homeFcba, homeSection)],
    queryFn: async () => {
      let apiUrl = '/api/master/karyawans';
      const params = new URLSearchParams();

      if (userLevel === 'AST') {
        if (homeFcba) params.append('fcba', homeFcba);
        if (homeSection) params.append('sectionname', homeSection);
      } else if (userLevel === 'MGR' || userLevel === 'KSI') {
        if (homeFcba) params.append('fcba', homeFcba);
      }

      if (params.toString()) {
        apiUrl += `?${params.toString()}`;
      }

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

      const mapEmp = new Map<string, Employee>();
      for (const it of rowsRaw) {
        const fccode = String(it.fccode ?? '').trim();
        if (!fccode) continue;
        if (!mapEmp.has(fccode)) {
          const noancakValue =
            (it as { noancak?: unknown }).noancak ?? (it as { NOANCAK?: unknown }).NOANCAK;
          const noancak = typeof noancakValue === 'string' ? noancakValue.trim() : undefined;

          mapEmp.set(fccode, {
            fccode,
            fullname: typeof it.fcname === 'string' ? it.fcname : undefined,
            fcba: String(it.fcba ?? '').trim(),
            sectionname: String(it.sectionname ?? '').trim(),
            gangcode: String(it.gangcode ?? '').trim(),
            noancak,
          });
        }
      }
      return Array.from(mapEmp.values());
    },
    enabled: !!homeFcba || userLevel === 'ADM',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const buLookups = useMemo(() => getBusinessUnitLookups(businessUnits), [businessUnits]);

  const { data: tphFieldcodeData = [], isLoading: isLoadingFieldcode } = useQuery({
    queryKey: QueryKeys.TPH_FIELDCODES(selFcba, selSection),
    queryFn: async () => {
      if (!selFcba || !selSection) return [];

      try {
        const res = await fetchTphFieldcodes(selFcba, selSection);
        if (!res.ok) {
          if (res.status === 404) return [];
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const data = extractArrayData<{
          fccode?: string;
          fcname?: string;
          planting_year?: string;
          bjr?: string;
          ha_planted?: string;
          ownership?: string;
          status?: string;
          afdeling?: string;
          fcba?: string;
        }>(json);
        return data;
      } catch (err) {
        console.error('Failed to fetch TPH fieldcodes:', err);
        return [];
      }
    },
    enabled: !!selFcba && !!selSection,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const fieldcodeOptions = useMemo(() => {
    if (!tphFieldcodeData.length) return [];
    const set = new Set<string>();
    for (const t of tphFieldcodeData) {
      const fc = String(t.fccode ?? '').trim();
      if (fc) set.add(fc);
    }
    return Array.from(set)
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [tphFieldcodeData]);

  const { data: tphDetailData = [], isLoading: isLoadingTph } = useQuery({
    queryKey: QueryKeys.TPH_DETAIL(selFcba, selSection, form.fieldcode),
    queryFn: async () => {
      if (!selFcba || !selSection || !form.fieldcode) return [];

      try {
        const res = await fetchTphDetail(selFcba, selSection, form.fieldcode);
        if (!res.ok) {
          if (res.status === 404) return [];
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const data = extractArrayData<{
          notph?: string;
          fieldcode?: string;
          ancakno?: string;
          division?: string;
        }>(json);
        return data;
      } catch (err) {
        console.error('Failed to fetch TPH detail:', err);
        return [];
      }
    },
    enabled: !!selFcba && !!selSection && !!form.fieldcode,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const tphOptions = useMemo(() => {
    if (!tphDetailData.length) return [];
    const set = new Map<string, string>();
    for (const t of tphDetailData) {
      const notph = String(t.notph ?? '').trim();
      if (notph && !set.has(notph)) {
        set.set(notph, notph);
      }
    }
    return Array.from(set, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [tphDetailData]);

  const tphDetailMap = useMemo(() => {
    const map = new Map<string, (typeof tphDetailData)[0]>();
    for (const t of tphDetailData) {
      if (t.notph) map.set(t.notph, t);
    }
    return map;
  }, [tphDetailData]);

  const prefetchTphData = useCallback(
    async (fcba: string, section: string, fieldcode?: string) => {
      const fcbaName = resolveBusinessUnitName(fcba, buLookups);

      if (fieldcode) {
        await queryClient.prefetchQuery({
          queryKey: QueryKeys.TPH_DETAIL(fcba, section, fieldcode),
          queryFn: async () => {
            try {
              const res = await fetchTphDetail(fcbaName, section, fieldcode);
              if (!res.ok) return [];
              const json = await res.json();
              return extractArrayData<{
                notph?: string;
                fieldcode?: string;
                ancakno?: string;
                division?: string;
              }>(json);
            } catch {
              return [];
            }
          },
          staleTime: 30 * 60 * 1000,
        });
      } else {
        await queryClient.prefetchQuery({
          queryKey: QueryKeys.TPH_FIELDCODES(fcba, section),
          queryFn: async () => {
            try {
              const params = new URLSearchParams({
                fcba: fcbaName,
                afdeling: section,
              });
              const res = await fetch(`/api/master/tph?${params.toString()}`, {
                credentials: 'include',
              });
              if (!res.ok) return [];
              const json = await res.json();
              return extractArrayData<{
                notph?: string;
                fieldcode?: string;
                ancakno?: string;
                division?: string;
              }>(json);
            } catch {
              return [];
            }
          },
          staleTime: 30 * 60 * 1000,
        });
      }
    },
    [buLookups, queryClient]
  );

  useEffect(() => {
    if (selFcba && selSection) {
      prefetchTphData(selFcba, selSection);
    }
  }, [selFcba, selSection, prefetchTphData]);

  useEffect(() => {
    if (selFcba && selSection && form.fieldcode) {
      prefetchTphData(selFcba, selSection, form.fieldcode);
    }
  }, [selFcba, selSection, form.fieldcode, prefetchTphData]);

  const handleGetLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast.error(tH('toastGeolocUnsupported'));
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const value = `${latitude},${longitude}`;
        setForm(s => ({ ...s, location: value }));
        setLocLoading(false);
      },
      err => {
        console.error('Geolocation error:', err);
        toast.error(
          err.code === err.PERMISSION_DENIED ? tH('toastGeolocDenied') : tH('toastGeolocError')
        );
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const mutation = useMutation({
    mutationFn: async ({ url, method, body }: { url: string; method: string; body: FormData }) => {
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.HARVEST() });
      setOpen(false);
      setForm(initialHarvestForm);
      setPreview('');
      if (imgRef.current) imgRef.current.value = '';
      if (pdfRef.current) pdfRef.current.value = '';
      toast.success(isEditing ? tH('toastSaveSuccess') : tH('toastAddSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const body = new FormData();
      body.append('ba_deleted', file);
      body.append('_method', 'DELETE');

      const res = await fetch(`/api/harvest/${id}`, {
        method: 'POST',
        body,
        credentials: 'include',
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
              : tH('toastDeleteError');
        throw new Error(errorMsg);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.HARVEST() });
      toast.success(tH('toastDeleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const fetchDetail = useCallback(
    async (id: string) => {
      setIsEditing(true);
      setDetailLoading(true);
      setOpen(true);
      try {
        const res = await fetchHarvestDetail(id);
        if (res.status === 401) {
          await logoutAndRedirect();
          return;
        }
        const json = await res.json();
        if (isUnauthenticatedJson(json)) {
          await logoutAndRedirect();
          return;
        }
        const data = extractSingleData<Harvest>(json);
        if (!res.ok || !data) throw new Error('Gagal ambil data');

        setForm({
          id: data.id,
          nodokumen: data.nodokumen || '',
          tanggal: formatTanggalForInput(data.tanggal),
          kode_karyawan_mandor1: data.kode_karyawan_mandor1 || '',
          kode_karyawan_mandor_panen: data.kode_karyawan_mandor_panen || '',
          kode_karyawan_kerani: data.kode_karyawan_kerani || '',
          kode_karyawan: data.kode_karyawan || '',
          noancak: data.noancak || '',
          tph: data.tph || '',
          fieldcode: data.fieldcode || '',
          fcba: data.fcba || '',
          afdeling: data.afdeling || '',
          output: data.output || '',
          mentah: data.mentah || '0',
          overripe: data.overripe || '0',
          busuk: data.busuk || '0',
          busuk2: data.busuk2 || '0',
          buahkecil: data.buahkecil || '0',
          brondol: data.brondol || '0',
          alasbrondol: data.alasbrondol || '',
          tangkaipanjang: data.tangkaipanjang || '0',
          parteno: data.parteno || '0',
          parteno50plus: data.parteno50plus || '0',
          status_assistensi: data.status_assistensi || '',
          status_harvesting: data.status_harvesting || 'Planned',
          kemandoran: data.kemandoran || '',
          exception_case: data.exception_case || '',
          location: data.location || '',
          id_device:
            data.id_device || `${getReadableDevice()} • ${getOrCreateDeviceIds().deviceId}`,
          card_id: data.card_id || '',
          images: null,
          no_ba_exca: data.no_ba_exca || null,
        });
        setPreview(data.images ? getProxiedImageUrl(data.images) : '');
        setSelFcba(data.fcba || homeFcba || '');
        setSelSection(data.afdeling || homeSection || '');
      } catch (e) {
        const msg = e instanceof Error ? e.message : tH('toastFetchDetailError');
        toast.error(msg);
        setOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [homeFcba, homeSection, tH]
  );

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

  const sectionOptions = useMemo(() => {
    if (!selFcba) return [];
    const selCode = resolveBusinessUnitCode(selFcba, buLookups);
    const selName = resolveBusinessUnitName(selFcba, buLookups);

    const sections = new Set<string>();
    for (const t of triplets) {
      if (t.fcba === selFcba || t.fcba === selCode || t.fcba === selName) {
        if (t.sectionname) sections.add(t.sectionname);
      }
    }

    return Array.from(sections)
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [triplets, selFcba, buLookups]);

  const kemandoranOptions = useMemo(() => {
    if (!selFcba || !selSection) return [];
    const fcbaName = resolveBusinessUnitName(selFcba, buLookups);

    const set = new Set<string>();
    for (const e of employees) {
      if (
        (e.fcba || '') === fcbaName &&
        (e.sectionname || '') === selSection &&
        (e.gangcode || '').toUpperCase().startsWith('MD')
      ) {
        const raw = (e.gangcode || '').trim();
        if (raw) set.add(raw);
      }
    }

    return Array.from(set)
      .sort()
      .map(v => ({ value: v, label: v }));
  }, [employees, selFcba, selSection, buLookups]);

  const { data: employeesByGang = [], isLoading: isLoadingEmpByGang } = useQuery({
    queryKey: [...QueryKeys.EMPLOYEES_ABSENSI(form.tanggal), userLevel, homeFcba, homeSection, homeGang],
    queryFn: async () => {
      if (!form.tanggal) return [];

      const tanggalDate = form.tanggal.replace('T', ' ').split(' ')[0];
      const params = new URLSearchParams();
      params.append('tanggal', tanggalDate);

      if (['KRP', 'MDP', 'KRA', 'MD1', 'AST', 'KSI', 'MGR'].includes(userLevel)) {
        if (homeFcba) params.append('fcba', homeFcba);
      }

      if (['KRP', 'MDP', 'KRA', 'MD1', 'AST'].includes(userLevel)) {
        if (homeSection) params.append('afdeling', homeSection);
      }
      if (['KRP', 'MDP'].includes(userLevel)) {
        if (homeGang) params.append('kemandoran', homeGang);
      }

      try {
        const res = await fetch(`/api/attendance?${params.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 404) return [];
          let detail = `HTTP ${res.status}`;
          try {
            const errBody = await res.clone().json();
            if (errBody?.error) detail = errBody.error;
          } catch {
            /* fallback ke HTTP status */
          }
          throw new Error(detail);
        }
        const json = await res.json();
        const rowsRaw = extractArrayData<Record<string, unknown>>(json);

        const mapEmp = new Map<string, Employee>();
        for (const it of rowsRaw) {
          const fccode = String(it.kode_karyawan ?? it.fccode ?? '').trim();
          if (!fccode) continue;
          if (!mapEmp.has(fccode)) {
            const noancakValue =
              (it as { noancak?: unknown }).noancak ??
              (it as { NOANCAK?: unknown }).NOANCAK ??
              (it as { pengancakan?: unknown }).pengancakan;
            const noancak = typeof noancakValue === 'string' ? noancakValue.trim() : undefined;

            mapEmp.set(fccode, {
              fccode,
              fullname:
                typeof it.namakaryawan === 'string'
                  ? it.namakaryawan
                  : typeof it.fcname === 'string'
                    ? it.fcname
                    : undefined,
              fcba: String(it.fcba ?? '').trim(),
              sectionname: String(it.section ?? it.sectionname ?? '').trim(),
              gangcode: String(it.gangcode ?? it.kemandoran ?? '').trim(),
              noancak,
            });
          }
        }
        return Array.from(mapEmp.values());
      } catch (err) {
        console.error('Failed to fetch employees from absensi:', err);
        return [];
      }
    },
    enabled: !!form.tanggal && (!!homeFcba || userLevel === 'ADM'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const employeeByGangMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employeesByGang) {
      if (e.fccode) map.set(e.fccode, e);
    }
    return map;
  }, [employeesByGang]);

  const employeeOptions = useMemo(() => {
    if (!employeesByGang.length) return [];
    return employeesByGang
      .map(e => ({
        value: e.fccode,
        label: e.fullname ? `${e.fccode} - ${e.fullname}` : e.fccode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employeesByGang]);

  const onChangeFcba = (v: string) => {
    setSelFcba(v);
    setSelSection('');
    setForm(s => ({
      ...s,
      fcba: v,
      afdeling: '',
      fieldcode: '',
      kemandoran: '',
      noancak: '',
      kode_karyawan: '',
      tph: '',
    }));
  };

  const onChangeSection = (v: string) => {
    setSelSection(v);
    setForm(s => ({
      ...s,
      afdeling: v,
      kemandoran: '',
      kode_karyawan: '',
    }));
  };

  const onChangeFieldcode = (v: string) => {
    setForm(s => ({
      ...s,
      fieldcode: v,
      noancak: '',
      tph: '',
    }));
  };

  const onChangeGang = (v: string) => {
    setForm(s => ({
      ...s,
      kemandoran: v,
      kode_karyawan: '',
    }));
  };

  const onChangeEmployee = (fccode: string) => {
    const emp = employeeByGangMap.get(fccode);
    if (!emp) return;

    setSelFcba(emp.fcba || '');
    setSelSection(emp.sectionname || '');

    setForm(s => ({
      ...s,
      kode_karyawan: fccode,
      fcba: emp.fcba || '',
      afdeling: emp.sectionname || '',
      kemandoran: emp.gangcode || '',
      fieldcode: '',
      tph: '',
      noancak: '',
    }));
  };

  useEffect(() => {
    const { deviceId } = getOrCreateDeviceIds();
    setForm(s => ({
      ...s,
      id_device: s.id_device || `${getReadableDevice()} • ${deviceId}`,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    if (!canModify) {
      toast.error(tH('toastNoPermission'));
      return;
    }

    const requiredFields: { value: string; label: string }[] = [
      { value: form.tanggal, label: tH('formTanggal') },
      { value: form.kode_karyawan, label: tH('formKaryawan') },
      { value: form.fcba, label: tH('formFcba') },
      { value: form.afdeling, label: tH('formAfdeling') },
      { value: form.fieldcode, label: tH('formFieldCode') },
      { value: form.tph, label: tH('formTph') },
      { value: form.nodokumen, label: tH('formNoDokumen') },
      { value: form.output, label: tH('formOutput') },
    ];
    const emptyFields = requiredFields.filter(f => !f.value);
    if (emptyFields.length > 0) {
      const names = emptyFields.map(f => `'${f.label}'`).join(', ');
      toast.error(tH('toastFieldRequired', { fields: names }));
      return;
    }

    if (!isEditing) {
      if (!(form.no_ba_exca instanceof File)) {
        toast.error(tH('toastPdfUploadRequired'));
        return;
      }
    } else {
      if (
        !(form.no_ba_exca instanceof File) &&
        !(typeof form.no_ba_exca === 'string' && form.no_ba_exca)
      ) {
        toast.error(tH('toastPdfUploadRequired'));
        return;
      }
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'images' && value instanceof File) {
        formData.append(key, value);
      } else if (key === 'no_ba_exca' && value instanceof File) {
        formData.append(key, value);
      } else if (key === 'no_ba_exca') {
        // skip
      } else if (key === 'tanggal' && value) {
        const tanggal = String(value).trim().replace('T', ' ');
        const match = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?$/.exec(tanggal);
        formData.append(
          key,
          match ? `${match[1]} ${match[2] ? `${match[2]}:00` : '00:00:00'}` : tanggal
        );
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const url = isEditing && form.id ? `/api/harvest/${form.id}` : '/api/harvest';
    const method = isEditing && form.id ? 'PUT' : 'POST';

    mutation.mutate({ url, method, body: formData });
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

  const handleConfirmDelete = (file: File) => {
    if (!deleteTargetId) return;
    if (file.type !== 'application/pdf') {
      toast.error(tH('toastPdfFormat'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(tH('toastPdfSize'));
      return;
    }

    deleteMutation.mutate(
      { id: deleteTargetId, file },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          setDeleteTargetId('');
        },
      }
    );
  };

  const { filtered, harvestTotals } = useMemo(() => {
    const s = q.trim().toLowerCase();
    const result: Harvest[] = [];
    const totals = {
      output: 0,
      mentah: 0,
      overripe: 0,
      busuk: 0,
      brondol: 0,
      output_pgkn: 0,
      sisa_pgkn: 0,
      tinggal: 0,
    };

    for (const it of items) {
      if (!s || it._searchContent?.includes(s)) {
        result.push(it);

        totals.output += it._outputNum || 0;
        totals.mentah += it._mentahNum || 0;
        totals.overripe += it._overNum || 0;
        totals.busuk += it._busukNum || 0;
        totals.brondol += it._brondolNum || 0;
        totals.output_pgkn += (it._outputPgknNum ?? 0);
        totals.sisa_pgkn += (it._sisaPgknNum ?? 0);
        totals.tinggal += (it._tinggalNum ?? 0);
      }
    }

    return { filtered: result, harvestTotals: totals };
  }, [q, items]);

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error(tH('toastNoExportData'));
      return;
    }

    const dataToExport = filtered.map((r, idx) => ({
      No: idx + 1,
      'No Dokumen': r.nodokumen || '-',
      Tanggal: (r.tanggal || '').split(' ')[0],
      'Kode Karyawan': r.kode_karyawan || '-',
      'Nama Karyawan': r.nama_karyawan || '-',
      Kemandoran: r.kemandoran || '-',
      FCBA: r.fcba || '-',
      Afdeling: r.afdeling || '-',
      TPH: r.tph || '-',
      'Field Code': r.fieldcode || '-',
      Output: r.output || '0',
      Mentah: r.mentah || '0',
      Overripe: r.overripe || '0',
      Busuk: r.busuk || '0',
      Busuk2: r.busuk2 || '0',
      'Buah Kecil': r.buahkecil || '0',
      Brondol: r.brondol || '0',
      'Alas Brondol': r.alasbrondol || '0',
      'Tangkai Panjang': r.tangkaipanjang || '0',
      Parteno: r.parteno || '0',
      'Parteno 50+': r.parteno50plus || '0',
      Status: r.status_harvesting || '-',
      Lokasi: r.location || '-',
    }));

    exportJsonToCsv(
      dataToExport,
      `Harvesting_${filters.tanggal || 'all'}_${filters.tanggal_end || 'all'}.csv`
    );
  };

  const getNowDateTimeLocal = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const onAddClick = () => {
    setIsEditing(false);
    setForm({
      ...initialHarvestForm,
      tanggal: getNowDateTimeLocal(),
      fcba: userLevel === 'ADM' ? '' : userFcbaCookie || homeFcba || '',
      afdeling:
        userLevel === 'ADM' || userLevel === 'KSI'
          ? ''
          : userAfdelingCookie || homeSection || '',
    });    setPreview('');
    setSelFcba(userLevel === 'ADM' ? '' : userFcbaCookie || homeFcba || '');
    setSelSection(
      userLevel === 'ADM' || userLevel === 'KSI'
        ? ''
        : userAfdelingCookie || homeSection || ''
    );
    setOpen(true);
    setTimeout(() => {
      handleGetLocation();
    }, 0);
  };

  return {
    q, setQ, isSearchFocused, setIsSearchFocused,
    showFilters, setShowFilters,
    searchInputRef,
    filters, setFilters, appliedFilters, setAppliedFilters,
    viewMode, setViewMode, allExpanded, setAllExpanded,
    galleryRef,

    items, loading, isFetching,
    businessUnits, isLoadingBU,
    employees, isLoadingEmp,
    tphFieldcodeData, isLoadingFieldcode,
    tphDetailData, isLoadingTph,
    employeesByGang, isLoadingEmpByGang,

    fcbaOptions, sectionOptions, kemandoranOptions,
    fieldcodeOptions, tphOptions,
    employeeOptions, tphDetailMap,

    mutation, deleteMutation, queryClient,

    userLevel, homeFcba, homeSection, homeGang,
    isFcbaLocked, isAfdelingLocked, isKemandoranLocked,
    canModify,
    getScopedFilters,
    userFcbaCookie, userAfdelingCookie,

    filtered, harvestTotals,

    open, setOpen,
    isEditing, setIsEditing,
    detailLoading,
    deleteOpen, setDeleteOpen,
    deleteTargetId,
    form, setForm,
    preview, setPreview,
    imgRef, pdfRef,

    selFcba, setSelFcba,
    selSection, setSelSection,

    locLoading,

    nextDocumentNo, isFetchingDocumentNo,

    onAddClick,
    handleSubmit,
    handleDelete,
    closeDeleteModal,
    handleConfirmDelete,
    onChangeFcba, onChangeSection, onChangeFieldcode,
    onChangeGang, onChangeEmployee,
    handleGetLocation,
    fetchDetail,
    handleExport,
  };
}
