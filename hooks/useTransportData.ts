'use client';

import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Option } from '@/app/components/ui/search-select';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { cookieStore } from '@/utils/auth/cookieStore';
import { getFilterCriteria, getLockedFields } from '@/utils/helpers/filterHelper';
import { formatPerfDate, getCachedCollator } from '@/utils/helpers/perf-formatter';
import { fetchBusinessUnits } from '@/utils/services/businessUnitService';
import { fetchMasterUsers as fetchMasterUsersService, fetchTransportList } from '@/utils/services/transportService';
import { extractArrayData } from '@/utils/api/apiHelpers';
import { fetchHarvestByDocumentNo } from '@/utils/services/harvestService';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { useLocale } from '@/hooks/useLocale';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { QueryKeys } from '@/utils/queryKeys';
import { getTodayISO, getYesterdayISO } from '@/utils/helpers/datetime';
import type {
  Transport,
  TransportFormState,
  TransportFilters,
  DeleteTarget,
} from '@/types/domain';
import { initialTransportForm } from '@/types/domain';

type MasterUser = {
  fccode?: string;
  idkaryawan?: string;
  fullname?: string;
  fcba?: string;
  afdeling?: string;
  gangcode?: string;
  [key: string]: unknown;
};

type HarvestSource = {
  fcba: string;
  afdeling: string;
  fieldcode: string;
  tph: string;
  totaljanjang: string;
  output: string;
  brondolan: string;
  mentah: string;
};

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTimeForApi = (value: string) => {
  if (!value) return '';
  const s = value.replace('T', ' ');
  return s.includes(':') && s.split(':').length === 3 ? s : `${s}:00`;
};

const getUserScope = () => ({
  level: cookieStore.getLevel(),
  fcba: cookieStore.getFcba(),
  afdeling: cookieStore.getSection(),
  gang: cookieStore.getGang(),
});

const fetchMasterUsers = async (params: Record<string, string>) => {
  try {
    const res = await fetchMasterUsersService(params);
    if (!res.ok) return [] as MasterUser[];
    const json = await res.json();
    return Array.isArray(json.data) ? (json.data as MasterUser[]) : [];
  } catch (err) {
    console.error('Failed to fetch master users', err);
    return [] as MasterUser[];
  }
};

export function useTransportData() {
  const localeTag = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations('Transport');

  const getInitialFilters = (): TransportFilters => {
    const yesterday = getYesterdayISO();
    const today = getTodayISO();
    return {
      tanggal: yesterday,
      tanggal_end: today,
      nopengangkutan: '',
      nospb: '',
      nodokumen: '',
      kode_karyawan_kerani: '',
      kode_karyawan_driver: '',
      type_pengangkutan: '',
      kode_kendaraan: '',
      fcba: '',
      pabrik_tujuan: '',
      afdeling: '',
      tph: '',
      fieldcode: '',
      status_pengangkutan: '',
      kemandoran: '',
      flag: '',
    };
  };

  const [filters, setFilters] = useState<TransportFilters>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<TransportFilters>(getInitialFilters);

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

  const [q, setQ] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useSearchShortcut();
  const [showFilters, setShowFilters] = useState(false);
  const [userLevel, setUserLevel] = useState<
    'ADM' | 'MGR' | 'KSI' | 'MD1' | 'AST' | 'KRT' | 'KRA' | 'KRP' | 'MDP' | 'OTHER'
  >('OTHER');
  const canModify = userLevel === 'ADM' || userLevel === 'KSI';
  const [scopeReady, setScopeReady] = useState(false);
  const [homeFcba, setHomeFcba] = useState<string>('');
  const [homeSection, setHomeSection] = useState<string>('');
  const [homeGang, setHomeGang] = useState<string>('');

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TransportFormState>(initialTransportForm);
  const [noBaExcaFile, setNoBaExcaFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);


  const [pabrikOptions, setPabrikOptions] = useState<Array<{ fccode: string; fcname: string }>>([]);
  const [driverOptions, setDriverOptions] = useState<Array<{ fccode: string; fullname: string }>>(
    []
  );
  const [harvestMatched, setHarvestMatched] = useState(false);
  const [harvestSource, setHarvestSource] = useState<HarvestSource | null>(null);
  const [harvestStatus, setHarvestStatus] = useState('');

  const harvestFetchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [pabrikRows, driverRows] = await Promise.all([
          fetchBusinessUnits({ fctype: 'M' }),
          fetch('/api/master/karyawans?fcba=CNT', { credentials: 'include' }).then(r =>
            r.ok ? r.json() : { data: [] }
          ),
        ]);

        setPabrikOptions(
          pabrikRows.map(row => ({
            fccode: String(row.fccode || ''),
            fcname: String(row.fcname || ''),
          }))
        );
        setDriverOptions(
          extractArrayData<{ fccode?: string; fcname?: string }>(driverRows)
            .filter(row => row.fccode)
            .map(row => ({
              fccode: String(row.fccode),
              fullname: String(row.fcname || ''),
            }))
        );
      } catch (err) {
        console.warn('Error initializing master data', err);
      }
    };
    init();
  }, []);

  const { data: keraniOptions = [] } = useQuery({
    queryKey: [...QueryKeys.KERANI_OPTIONS(), form.fcba, homeFcba],
    queryFn: async () => {
      const fcba = form.fcba || homeFcba;
      if (!fcba) return [];
      const rows = await fetchMasterUsers({ level: 'KRT', fcba });
      return rows
        .filter(row => row.idkaryawan)
        .map(row => ({
          idkaryawan: String(row.idkaryawan),
          fullname: String(row.fullname || ''),
          fcba: String(row.fcba || ''),
          afdeling: String(row.afdeling || ''),
          gangcode: String(row.gangcode || ''),
        }));
    },
    enabled: !!(form.fcba || homeFcba) && scopeReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const keraniMap = useMemo(() => {
    const map = new Map<
      string,
      {
        idkaryawan: string;
        fullname: string;
        fcba: string;
        afdeling: string;
        gangcode: string;
      }
    >();
    for (const option of keraniOptions) {
      if (option.idkaryawan) map.set(option.idkaryawan, option);
    }
    return map;
  }, [keraniOptions]);

  const { data: kendaraanData = [] } = useQuery({
    queryKey: QueryKeys.SIPS_KENDARAAN(),
    queryFn: async () => {
      const url = new URL('/api/master/sips-kendaraan', window.location.origin);
      url.searchParams.append('vehiclegroupcode', 'DT,TR,MB,RT');
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      return extractArrayData<{ fccode?: string; fcname?: string; registrationno?: string }>(json);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const kendaraanOptionsAsOptions: Option[] = useMemo(
    () => {
      const collator = getCachedCollator('id-ID');
      return kendaraanData
        .filter(row => row.fccode)
        .map(row => ({
          value: String(row.fccode),
          label: `${String(row.fccode)} - ${String(row.fcname || '')}`,
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
    },
    [kendaraanData]
  );

  useEffect(() => {
    if (!form.nodokumen?.trim()) {
      setHarvestMatched(false);
      setHarvestSource(null);
      setHarvestStatus('');
      return;
    }

    if (harvestFetchTimerRef.current) {
      window.clearTimeout(harvestFetchTimerRef.current);
    }

    harvestFetchTimerRef.current = window.setTimeout(async () => {
      const dokumen = form.nodokumen.trim();
      setHarvestMatched(false);
      setHarvestSource(null);
      setHarvestStatus('Mencari data dokumen...');

      try {
        const res = await fetchHarvestByDocumentNo(dokumen);
        if (!res.ok) {
          setHarvestStatus('Gagal mencari dokumen harvest');
          return;
        }

        const json = await res.json();
        if (!json.ok || !Array.isArray(json.data) || json.data.length === 0) {
          setHarvestStatus('Dokumen tidak ditemukan di harvest');
          return;
        }

        const first = json.data[0];
        const harvestFcba = String(first.fcba || '');
        const harvestAfdeling = String(first.afdeling || '');
        const harvestFieldcode = String(first.fieldcode || '');
        const harvestTph = String(first.tph || '');
        const harvestTotaljanjang = String(first.totaljanjang || first.output || '0');
        const harvestOutput = String(first.output || '0');
        const harvestBrondolan = String(first.brondolan || '0');
        const harvestMentah = String(first.mentah || '0');
        setHarvestSource({
          fcba: harvestFcba,
          afdeling: harvestAfdeling,
          fieldcode: harvestFieldcode,
          tph: harvestTph,
          totaljanjang: harvestTotaljanjang,
          output: harvestOutput,
          brondolan: harvestBrondolan,
          mentah: harvestMentah,
        });

        const selectedKerani = keraniMap.get(form.kode_karyawan_kerani);

        if (selectedKerani) {
          if (selectedKerani.fcba === harvestFcba && selectedKerani.afdeling === harvestAfdeling) {
            setForm(current => ({
              ...current,
              fcba: selectedKerani.fcba || harvestFcba,
              afdeling: selectedKerani.afdeling || harvestAfdeling,
              fcba_destination: '',
              afdeling_destination: '',
              fieldcode: harvestFieldcode,
              tph: harvestTph,
              totaljanjang: harvestTotaljanjang,
              output: harvestOutput,
              brondolan: harvestBrondolan,
              mentah: harvestMentah,
            }));
          } else {
            setForm(current => ({
              ...current,
              fcba: selectedKerani.fcba || current.fcba || '',
              afdeling: selectedKerani.afdeling || current.afdeling || '',
              fcba_destination: harvestFcba,
              afdeling_destination: harvestAfdeling,
              fieldcode: harvestFieldcode,
              tph: harvestTph,
              totaljanjang: harvestTotaljanjang,
              output: harvestOutput,
              brondolan: harvestBrondolan,
              mentah: harvestMentah,
            }));
          }
        } else {
          setForm(current => ({
            ...current,
            fcba: harvestFcba,
            afdeling: harvestAfdeling,
            fcba_destination: '',
            afdeling_destination: '',
            fieldcode: harvestFieldcode,
            tph: harvestTph,
            totaljanjang: harvestTotaljanjang,
            output: harvestOutput,
            brondolan: harvestBrondolan,
            mentah: harvestMentah,
          }));
        }

        setHarvestMatched(true);
        setHarvestStatus(`Dokumen ditemukan: ${harvestFcba}/${harvestAfdeling}`);
      } catch (err) {
        console.error('Failed to fetch harvest info', err);
        setHarvestMatched(false);
        setHarvestSource(null);
        setHarvestStatus('Kesalahan saat mencari dokumen harvest');
      }
    }, 500);

    return () => {
      if (harvestFetchTimerRef.current) {
        window.clearTimeout(harvestFetchTimerRef.current);
      }
    };
  }, [form.nodokumen, form.kode_karyawan_kerani, keraniMap]);

  useEffect(() => {
    const selectedKerani = keraniMap.get(form.kode_karyawan_kerani);

    if (harvestMatched && harvestSource) {
      if (
        selectedKerani &&
        selectedKerani.fcba === harvestSource.fcba &&
        selectedKerani.afdeling === harvestSource.afdeling
      ) {
        setForm(current => ({
          ...current,
          fcba: selectedKerani.fcba || harvestSource.fcba,
          afdeling: selectedKerani.afdeling || harvestSource.afdeling,
          fcba_destination: '',
          afdeling_destination: '',
        }));
      } else if (selectedKerani) {
        setForm(current => ({
          ...current,
          fcba: selectedKerani.fcba || harvestSource.fcba,
          afdeling: selectedKerani.afdeling || harvestSource.afdeling,
          fcba_destination: harvestSource.fcba,
          afdeling_destination: harvestSource.afdeling,
        }));
      }
    } else if (selectedKerani) {
      setForm(current => ({
        ...current,
        fcba: selectedKerani.fcba || current.fcba || '',
        afdeling: selectedKerani.afdeling || current.afdeling || '',
      }));
    }
  }, [form.kode_karyawan_kerani, keraniMap, harvestMatched, harvestSource, homeFcba, homeSection]);

  useEffect(() => {
    if (isEditing || !harvestMatched || !form.type_pengangkutan || !form.tanggal) return;

    const fcba = harvestSource?.fcba || form.fcba;
    const afdeling = harvestSource?.afdeling || form.afdeling;
    if (!fcba || !afdeling) return;

    const now = new Date(form.tanggal);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const afdeling2 = afdeling.slice(-2);

    const typeDigit = form.type_pengangkutan;

    const noPengPrefix = `${fcba}${typeDigit}${afdeling2}${month}${year}`;
    const noSpbPrefix = `SPB${fcba}${afdeling2}${month}${year}`;

    const generate = async () => {
      const firstDay = `${now.getFullYear()}-${month}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      const p: Record<string, string> = { tanggal: firstDay, tanggal_end: lastDay };

      let maxNoPeng = 0;
      let maxNoSpb = 0;

      try {
        const res = await fetchTransportList(p);
        if (res.ok) {
          const json = await res.json();
          const rows = (json.data || []) as Array<{
            nopengangkutan?: string;
            nospb?: string;
          }>;

          for (const row of rows) {
            const rp = parseInt((row.nopengangkutan || '').slice(-5), 10);
            if (!Number.isNaN(rp) && rp > maxNoPeng) maxNoPeng = rp;
            const rs = parseInt((row.nospb || '').slice(-5), 10);
            if (!Number.isNaN(rs) && rs > maxNoSpb) maxNoSpb = rs;
          }
        } else {
          console.warn('[useTransportData] fetchTransportList returned not ok, falling back to starting number');
        }
      } catch (err) {
        console.warn('[useTransportData] fetchTransportList failed, falling back to starting number', err);
      }

      const nextNoPeng = maxNoPeng + 1;
      const nextNoSpb = maxNoSpb + 1;

      setForm(current => ({
        ...current,
        nopengangkutan: `${noPengPrefix}${String(nextNoPeng).padStart(5, '0')}`,
        nospb:
          typeDigit === '2' ? `${noSpbPrefix}${String(nextNoSpb).padStart(5, '0')}` : current.nospb,
      }));
    };

    generate();
  }, [
    isEditing,
    harvestMatched,
    form.type_pengangkutan,
    form.tanggal,
    form.fcba,
    form.afdeling,
    harvestSource,
  ]);

  useEffect(() => {
    const { level, fcba, afdeling, gang } = getUserScope();
    setHomeFcba(fcba);
    setHomeSection(afdeling);
    setHomeGang(gang);

    const resolvedLevel =
      level === 'ADM'
        ? 'ADM'
        : ['MGR', 'KSI', 'MD1', 'AST', 'KRT', 'KRA', 'KRP', 'MDP'].includes(level)
          ? (level as 'MGR' | 'KSI' | 'MD1' | 'AST' | 'KRT' | 'KRA' | 'KRP' | 'MDP')
          : 'OTHER';
    setUserLevel(resolvedLevel);
    setScopeReady(true);
  }, []);

  useEffect(() => {
    if (!scopeReady) return;

    const filterCriteria = getFilterCriteria(
      {
        level: userLevel,
        fcba: homeFcba,
        afdeling: homeSection,
        gang: homeGang,
      },
      'transport'
    );

    const newFilters: TransportFilters = {};
    if (filterCriteria.fcba) newFilters.fcba = filterCriteria.fcba;
    if (filterCriteria.afdeling) newFilters.afdeling = filterCriteria.afdeling;
    if (filterCriteria.kemandoran) newFilters.kemandoran = filterCriteria.kemandoran;

    setFilters(prev => {
      const next = { ...prev, ...newFilters };
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      return next;
    });
  }, [scopeReady, userLevel, homeFcba, homeSection, homeGang]);

  const resetForm = () => {
    const now = new Date();
    const etd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setForm({
      ...initialTransportForm,
      tanggal: getTodayISO(),
      etd,
      fcba: isFcbaLocked ? homeFcba : '',
      afdeling: isAfdelingLocked ? homeSection : '',
    });
    setNoBaExcaFile(null);
  };

  const openNewRecord = () => {
    if (!canModify) return;
    resetForm();
    setIsEditing(false);
    setOpen(true);
  };

  const openEditRecord = useCallback(
    (row: Transport) => {
      if (!canModify) return;
      setForm({
        id: row.id,
        nopengangkutan: row.nopengangkutan || '',
        nospb: row.nospb || '',
        nodokumen: row.nodokumen || '',
        tanggal: row.tanggal ? row.tanggal.split(' ')[0] : getTodayISO(),
        kode_karyawan_kerani: row.kode_karyawan_kerani || '',
        kode_karyawan_driver: row.kode_karyawan_driver || '',
        tkbm1: row.tkbm1 || '',
        tkbm2: row.tkbm2 || '',
        tkbm3: row.tkbm3 || '',
        tkbm4: row.tkbm4 || '',
        tkbm5: row.tkbm5 || '',
        type_pengangkutan: row.type_pengangkutan ? String(row.type_pengangkutan) : '',
        kode_kendaraan: row.kode_kendaraan || '',
        tph: row.tph || '',
        fieldcode: row.fieldcode || '',
        fcba: row.fcba || '',
        afdeling: row.afdeling || '',
        fcba_destination: row.fcba_destination || '',
        afdeling_destination: row.afdeling_destination || '',
        pabrik_tujuan: row.pabrik_tujuan || '',
        totaljanjang: row.totaljanjang || '0',
        output: row.output || '0',
        janjangnormal: row.janjangnormal || '0',
        brondolan: row.brondolan || '0',
        mentah: row.mentah || '0',
        abnormal: row.abnormal || '0',
        etd: row.etd ? row.etd.replace(' ', 'T') : '',
        card_id: row.card_id || '',
        flag: row.flag || '',
        exception_case: row.exception_case || '',
      });
      setNoBaExcaFile(null);
      setIsEditing(true);
      setOpen(true);
    },
    [canModify]
  );

  const buildFormData = () => {
    const formData = new FormData();
    const append = (key: string, value: string) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    };
    append('nopengangkutan', form.nopengangkutan);
    append('nospb', form.nospb);
    append('nodokumen', form.nodokumen);
    append('tanggal', form.tanggal);
    append('kode_karyawan_kerani', form.kode_karyawan_kerani);
    append('kode_karyawan_driver', form.kode_karyawan_driver);
    append('tkbm1', form.tkbm1);
    append('tkbm2', form.tkbm2);
    append('tkbm3', form.tkbm3);
    append('tkbm4', form.tkbm4);
    append('tkbm5', form.tkbm5);
    append('type_pengangkutan', form.type_pengangkutan);
    append('kode_kendaraan', form.kode_kendaraan);
    append('tph', form.tph);
    append('fieldcode', form.fieldcode);
    append('fcba', form.fcba);
    append('afdeling', form.afdeling);
    append('fcba_destination', form.fcba_destination);
    append('afdeling_destination', form.afdeling_destination);
    append('pabrik_tujuan', form.pabrik_tujuan);
    append('totaljanjang', form.totaljanjang);
    append('output', form.output);
    append('janjangnormal', form.janjangnormal);
    append('brondolan', form.brondolan);
    append('mentah', form.mentah);
    append('abnormal', form.abnormal);
    append('etd', formatDateTimeForApi(form.etd));
    append('card_id', form.card_id);
    append('flag', form.flag);
    append('exception_case', form.exception_case);
    if (noBaExcaFile) {
      formData.append('no_ba_exca', noBaExcaFile, noBaExcaFile.name);
    }
    return formData;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEditing && !form.id) {
      toast.error(t('toastIdRequired'));
      return;
    }
    if (!form.nopengangkutan) {
      toast.error(t('toastNoPengangkutanRequired'));
      return;
    }
    if (!form.type_pengangkutan) {
      toast.error(t('toastTypeRequired'));
      return;
    }
    if (!form.kode_karyawan_kerani) {
      toast.error(t('toastKeraniRequired'));
      return;
    }
    if (!form.kode_kendaraan) {
      toast.error(t('toastKendaraanRequired'));
      return;
    }
    if (!form.kode_karyawan_driver) {
      toast.error(t('toastDriverRequired'));
      return;
    }
    if (!form.tkbm1) {
      toast.error(t('toastTkbm1Required'));
      return;
    }
    if (form.nodokumen.trim() && !harvestMatched) {
      toast.error(t('toastNoDokumenInvalid'));
      return;
    }
    if (!noBaExcaFile && !isEditing) {
      toast.error(t('toastBaRequired'));
      return;
    }
    setSubmitLoading(true);
    try {
      const formData = buildFormData();

      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      if (csrfToken && !formData.has('_csrf_token')) {
        formData.append('_csrf_token', csrfToken);
      }

      const url = isEditing
        ? `/api/transport/${encodeURIComponent(form.id)}`
        : '/api/transport';
      const method = isEditing ? 'PUT' : 'POST';

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: 'include',
        headers,
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.TRANSPORT() });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t('toastSaveError'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteRecord = useCallback(
    (row: Transport) => {
      if (!canModify) return;
      setDeleteTarget({ id: row.id, nopengangkutan: row.nopengangkutan || row.id });
      setDeleteOpen(true);
    },
    [canModify]
  );

  const deleteMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const body = new FormData();
      body.append('ba_deleted', file);
      body.append('_method', 'DELETE');

      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      if (csrfToken) {
        body.append('_csrf_token', csrfToken);
      }

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const res = await fetch(`/api/transport/${encodeURIComponent(id)}`, {
        method: 'POST',
        body,
        credentials: 'include',
        headers,
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
      queryClient.invalidateQueries({ queryKey: QueryKeys.TRANSPORT() });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmDelete = (file: File) => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id, file });
  };

  const handleNoBaExcaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type !== 'application/pdf') {
      toast.error(t('toastPdfFormat'));
      event.target.value = '';
      setNoBaExcaFile(null);
      return;
    }
    if (file && file.size > 4 * 1024 * 1024) {
      toast.error('File maksimal 4 MB');
      event.target.value = '';
      setNoBaExcaFile(null);
      return;
    }
    setNoBaExcaFile(file);
  };

  const { isFcbaLocked, isAfdelingLocked, isKemandoranLocked } = useMemo(
    () => getLockedFields(userLevel, 'transport'),
    [userLevel]
  );

  const shouldDisableForm = !!form.nodokumen.trim() && !harvestMatched;
  const formDisabled = !form.type_pengangkutan || shouldDisableForm;
  const formBelowNodokumenDisabled =
    !form.type_pengangkutan || !form.nodokumen?.trim() || shouldDisableForm;

  const handleExport = () => {
    if (items.length === 0) {
      toast.error(t('toastNoExportData'));
      return;
    }

    const dataToExport = items.map((r, idx) => ({
      No: idx + 1,
      'No Pengangkutan': r.nopengangkutan || '-',
      'No SPB': r.nospb || '-',
      'No Dokumen': r.nodokumen || '-',
      Tanggal: (r.tanggal || '').split(' ')[0],
      'Kerani Kode': r.kode_karyawan_kerani || '-',
      'Kerani Nama': r.nama_karyawan_kerani || '-',
      'Driver Kode': r.kode_karyawan_driver || '-',
      'Driver Nama': r.nama_karyawan_driver || '-',
      'TKBM1 Kode': r.tkbm1 || '-',
      'TKBM1 Nama': r.nama_tkbm1 || '-',
      'TKBM2 Kode': r.tkbm2 || '-',
      'TKBM2 Nama': r.nama_tkbm2 || '-',
      'TKBM3 Kode': r.tkbm3 || '-',
      'TKBM3 Nama': r.nama_tkbm3 || '-',
      'TKBM4 Kode': r.tkbm4 || '-',
      'TKBM4 Nama': r.nama_tkbm4 || '-',
      'TKBM5 Kode': r.tkbm5 || '-',
      'TKBM5 Nama': r.nama_tkbm5 || '-',
      'Tipe Pengangkutan': r.type_pengangkutan ? String(r.type_pengangkutan) : '-',
      'Kendaraan Kode': r.kode_kendaraan || '-',
      'Kendaraan Nama': r.nama_kendaraan || '-',
      'Kendaraan Plat': r.registrationno || '-',
      Blok: r.fieldcode || '-',
      TPH: r.tph || '-',
      FCBA: r.fcba || '-',
      Pabrik: r.pabrik_tujuan || '-',
      Afdeling: r.afdeling || '-',
      'FCBA Tujuan': r.fcba_destination || '-',
      'Afdeling Tujuan': r.afdeling_destination || '-',
      ETD: r.etd || '-',
      ETA: r.eta || '-',
      'Total Janjang': r.totaljanjang || '0',
      Output: r.output || '0',
      'Janjang Normal': r.janjangnormal || '0',
      Brondolan: r.brondolan || '0',
      Mentah: r.mentah || '0',
      Abnormal: r.abnormal || '0',
      Status: r.status_pengangkutan || '-',
      'Card ID': r.card_id || '-',
      Flag: r.flag || '-',
      'Exception Case': r.exception_case || '-',
      'No BA ExcA': r.no_ba_exca || '-',
    }));

    exportJsonToCsv(dataToExport, `Pengangkutan_${getTodayISO()}.csv`);
  };

  const {
    data: items = [],
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: [...QueryKeys.TRANSPORT(appliedFilters as Record<string, string>), userLevel, homeFcba, homeSection, homeGang],
    queryFn: async () => {
      const p: Record<string, string> = {};
      if (appliedFilters.tanggal) p.tanggal = appliedFilters.tanggal;
      if (appliedFilters.tanggal_end) p.tanggal_end = appliedFilters.tanggal_end;
      if (appliedFilters.nopengangkutan) p.nopengangkutan = appliedFilters.nopengangkutan;
      if (appliedFilters.nospb) p.nospb = appliedFilters.nospb;
      if (appliedFilters.nodokumen) p.nodokumen = appliedFilters.nodokumen;
      if (appliedFilters.kode_karyawan_kerani) p.kode_karyawan_kerani = appliedFilters.kode_karyawan_kerani;
      if (appliedFilters.kode_karyawan_driver) p.kode_karyawan_driver = appliedFilters.kode_karyawan_driver;
      if (appliedFilters.type_pengangkutan) p.type_pengangkutan = appliedFilters.type_pengangkutan;
      if (appliedFilters.kode_kendaraan) p.kode_kendaraan = appliedFilters.kode_kendaraan;
      if (appliedFilters.fcba) p.fcba = appliedFilters.fcba;
      if (appliedFilters.pabrik_tujuan) p.pabrik_tujuan = appliedFilters.pabrik_tujuan;
      if (appliedFilters.afdeling) p.afdeling = appliedFilters.afdeling;
      if (appliedFilters.tph) p.tph = appliedFilters.tph;
      if (appliedFilters.fieldcode) p.fieldcode = appliedFilters.fieldcode;
      if (appliedFilters.status_pengangkutan) p.status_pengangkutan = appliedFilters.status_pengangkutan;
      if (appliedFilters.kemandoran) p.kemandoran = appliedFilters.kemandoran;
      if (appliedFilters.flag) p.flag = appliedFilters.flag;

      const scope = getUserScope();
      const filterCriteria = getFilterCriteria(
        {
          level: scope.level as 'ADM' | 'MGR' | 'KSI' | 'MD1' | 'AST' | 'KRT' | 'KRA' | 'KRP' | 'MDP' | 'OTHER',
          fcba: scope.fcba,
          afdeling: scope.afdeling,
          gang: scope.gang,
        },
        'transport'
      );
      if (filterCriteria.fcba) p.fcba = filterCriteria.fcba;
      if (filterCriteria.afdeling) p.afdeling = filterCriteria.afdeling;
      if (filterCriteria.kemandoran) p.kemandoran = filterCriteria.kemandoran;

      const res = await fetchTransportList(p);

      if (res.status === 404) return [];
      if (res.status === 401) {
        await logoutAndRedirect();
        return [];
      }

      const json = await res.json();
      if (isUnauthenticatedJson(json)) {
        await logoutAndRedirect();
        return [];
      }

      if (!json || !(json.success === true || json.ok === true)) {
        throw new Error(json?.message || json?.error || 'Gagal mengambil data');
      }

      return (json.data || json.rows || []) as Transport[];
    },
    enabled: scopeReady,
  });

  const enrichedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.map((it, idx) => {
      const dateOnly = (it.tanggal || '').split(' ')[0];
      const displayDate = dateOnly ? formatPerfDate(dateOnly, localeTag) : '-';

      const typeLabel =
        String(it.type_pengangkutan) === '1'
          ? t('typeLangsir')
          : String(it.type_pengangkutan) === '2'
            ? t('typeDirect')
            : it.type_pengangkutan
              ? String(it.type_pengangkutan)
              : '-';

      const searchContent = [
        it.nopengangkutan,
        it.nospb,
        it.nodokumen,
        it.kode_karyawan_kerani,
        it.nama_karyawan_kerani,
        it.kode_karyawan_driver,
        it.nama_karyawan_driver,
        it.tkbm1,
        it.nama_tkbm1,
        it.tkbm2,
        it.nama_tkbm2,
        it.tkbm3,
        it.nama_tkbm3,
        it.tkbm4,
        it.nama_tkbm4,
        it.tkbm5,
        it.nama_tkbm5,
        it.fcba,
        it.afdeling,
        it.fcba_destination,
        it.afdeling_destination,
        it.etd,
        it.eta,
        it.status_pengangkutan,
        it.kode_kendaraan,
        it.nama_kendaraan,
        it.registrationno,
        it.card_id,
        it.exception_case,
        it.no_ba_exca,
        dateOnly,
        displayDate,
        typeLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const candidate = [it.nopengangkutan || '', dateOnly, String(idx)].join('|');
      let key = candidate;
      while (seen.has(key)) key = `${key}_`;
      seen.add(key);

      return {
        ...it,
        _rowKey: key,
        _displayDate: displayDate,
        _searchContent: searchContent,
        _typeLabel: typeLabel,
        _totaljanjangNum: toNumber(it.totaljanjang),
        _outputNum: toNumber(it.output),
        _janjangnormalNum: toNumber(it.janjangnormal),
        _brondolanNum: toNumber(it.brondolan),
        _mentahNum: toNumber(it.mentah),
        _abnormalNum: toNumber(it.abnormal),
      };
    });
  }, [items, localeTag, t]);

  const loading = isLoading || isFetching;

  const tkbmAttendanceParams = useMemo(() => {
    const selectedKerani = keraniMap.get(form.kode_karyawan_kerani);
    return {
      tanggal: form.tanggal,
      fcba: selectedKerani?.fcba || form.fcba || homeFcba,
      afdeling: selectedKerani?.afdeling || form.afdeling || homeSection,
      gangcode: selectedKerani?.gangcode || homeGang,
    };
  }, [
    form.tanggal,
    form.kode_karyawan_kerani,
    form.fcba,
    form.afdeling,
    keraniMap,
    homeFcba,
    homeSection,
    homeGang,
  ]);

  const { data: tkbmAttendanceData = [], isLoading: isLoadingTkbm } = useQuery({
    queryKey: [
      'tkbm-attendance',
      tkbmAttendanceParams.tanggal,
      tkbmAttendanceParams.fcba,
      tkbmAttendanceParams.afdeling,
      tkbmAttendanceParams.gangcode,
    ],
    queryFn: async () => {
      const { tanggal, fcba, afdeling, gangcode } = tkbmAttendanceParams;
      if (!tanggal || !fcba || !afdeling || !gangcode) return [];

      const params = new URLSearchParams();
      params.append('tanggal', tanggal);
      params.append('fcba', fcba);
      params.append('afdeling', afdeling);
      params.append('kemandoran', gangcode);

      const res = await fetch(`/api/attendance?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const rowsRaw = extractArrayData<Record<string, unknown>>(json);

      const mapEmp = new Map<string, { fccode: string; fullname?: string }>();
      for (const it of rowsRaw) {
        const fccode = String(it.kode_karyawan ?? it.fccode ?? '').trim();
        if (!fccode) continue;
        if (!mapEmp.has(fccode)) {
          mapEmp.set(fccode, {
            fccode,
            fullname: typeof it.namakaryawan === 'string' ? it.namakaryawan : undefined,
          });
        }
      }
      return Array.from(mapEmp.values());
    },
    enabled: !!form.tanggal && !!form.kode_karyawan_kerani && (!!homeFcba || userLevel === 'ADM'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const tkbmOptions: Option[] = useMemo(() => {
    if (!tkbmAttendanceData.length) return [];
    const collator = getCachedCollator('id-ID');
    return tkbmAttendanceData
      .map(e => ({
        value: e.fccode,
        label: e.fullname ? `${e.fccode} - ${e.fullname}` : e.fccode,
      }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [tkbmAttendanceData]);

  const tkbmOptions2 = useMemo(
    () => tkbmOptions.filter(o => o.value !== form.tkbm1),
    [tkbmOptions, form.tkbm1]
  );
  const tkbmOptions3 = useMemo(
    () => tkbmOptions.filter(o => o.value !== form.tkbm1 && o.value !== form.tkbm2),
    [tkbmOptions, form.tkbm1, form.tkbm2]
  );
  const tkbmOptions4 = useMemo(
    () =>
      tkbmOptions.filter(
        o => o.value !== form.tkbm1 && o.value !== form.tkbm2 && o.value !== form.tkbm3
      ),
    [tkbmOptions, form.tkbm1, form.tkbm2, form.tkbm3]
  );
  const tkbmOptions5 = useMemo(
    () =>
      tkbmOptions.filter(
        o =>
          o.value !== form.tkbm1 &&
          o.value !== form.tkbm2 &&
          o.value !== form.tkbm3 &&
          o.value !== form.tkbm4
      ),
    [tkbmOptions, form.tkbm1, form.tkbm2, form.tkbm3, form.tkbm4]
  );

  const keraniOptionsAsOptions: Option[] = useMemo(
    () => {
      const collator = getCachedCollator('id-ID');
      return keraniOptions
        .filter(k => k.idkaryawan)
        .map(k => ({
          value: String(k.idkaryawan),
          label: k.fullname ? `${k.idkaryawan} - ${k.fullname}` : String(k.idkaryawan),
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
    },
    [keraniOptions]
  );

  const driverOptionsAsOptions: Option[] = useMemo(
    () => {
      const collator = getCachedCollator('id-ID');
      return driverOptions
        .filter(d => d.fccode)
        .map(d => ({
          value: d.fccode,
          label: `${d.fccode} - ${d.fullname}`,
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
    },
    [driverOptions]
  );

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

  const { filtered, totals } = useMemo(() => {
    const s = q.trim().toLowerCase();
    const result: (Transport & { _index: number })[] = [];
    const t = {
      totaljanjang: 0,
      brondolan: 0,
      totalSpb: 0,
      totalDokumen: 0,
    };
    const spbSet = new Set<string>();
    const dokumenSet = new Set<string>();

    for (const it of enrichedItems) {
      if (!s || it._searchContent?.includes(s)) {
        result.push({ ...it, _index: result.length + 1 });

        t.totaljanjang += it._totaljanjangNum || 0;
        t.brondolan += it._brondolanNum || 0;
        if (it.nospb) spbSet.add(it.nospb.trim());
        if (it.nodokumen) dokumenSet.add(it.nodokumen.trim());
      }
    }

    t.totalSpb = spbSet.size;
    t.totalDokumen = dokumenSet.size;

    return { filtered: result, totals: t };
  }, [q, enrichedItems]);

  const totalCards = [
    {
      label: t('totalJanjang'),
      value: totals.totaljanjang,
      className: 'text-primary',
    },
    {
      label: t('totalBrondolan'),
      value: totals.brondolan,
      className: 'text-success',
    },
    {
      label: t('totalSpb'),
      value: totals.totalSpb,
      className: 'text-info',
    },
    {
      label: t('totalDokumen'),
      value: totals.totalDokumen,
      className: 'text-secondary',
    },
  ];

  return {
    q, setQ, isSearchFocused, setIsSearchFocused, searchInputRef,
    showFilters, setShowFilters,
    filters, setFilters, appliedFilters, setAppliedFilters,
    items, isLoading, isFetching, queryError,
    userLevel, canModify,
    open, setOpen, isEditing,
    form, setForm,
    pabrikOptions, driverOptions, kendaraanOptionsAsOptions, kendaraanData,
    keraniOptions, keraniOptionsAsOptions, keraniMap,
    harvestMatched, harvestStatus,
    deleteOpen, deleteTarget,
    submitLoading,
    loading,
    totalCards,
    filtered,
    tkbmOptions, tkbmOptions2, tkbmOptions3, tkbmOptions4, tkbmOptions5,
    isLoadingTkbm,
    isFcbaLocked, isAfdelingLocked, isKemandoranLocked,
    shouldDisableForm, formDisabled, formBelowNodokumenDisabled,
    homeFcba, homeSection, homeGang,
    noBaExcaFile,
    localeTag,
    handleNoBaExcaChange,
    handleSubmit,
    openEditRecord,
    handleDeleteRecord,
    closeDeleteModal,
    handleConfirmDelete,
    deleteMutation,
    handleExport,
    queryClient,
    openNewRecord,
    driverOptionsAsOptions,
  };
}
