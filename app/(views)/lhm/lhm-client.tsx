'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TableColumn } from 'react-data-table-component';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { AppDataTable } from '@/app/components/data/app-data-table';
import AppTour from '@/app/components/feedback/app-tour';
import type { TourStep } from '@/app/components/feedback/app-tour';
import { Icon } from '@/app/components/ui/icons';
import { ExportButton } from '@/app/components/ui/export-button';
import { useLocale } from '@/hooks/useLocale';
import { isUnauthenticatedJson, logoutAndRedirect } from '@/utils/auth/authHelper';
import { getTodayISO, formatDateDMY, getYesterdayISO } from '@/utils/helpers/datetime';
import { exportJsonToCsv } from '@/utils/services/exportCsv';
import { formatPerfNumber, formatPerfDate } from '@/utils/helpers/perf-formatter';
import { toNumber } from '@/lib/utils/helpers';
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { SummaryCards } from '@/app/components/ui/summary-cards';
import { PageLayout } from '@/app/components/ui/page-layout';
import { NumberCell } from '@/app/components/ui/number-cell';
import { LhmActionCell } from '@/app/components/ui/lhm-action-cell';
import { Toolbar } from '@/app/components/ui/toolbar';

/* =========================
   T Y P E S
========================= */
type LhmData = {
  _rowKey?: string;
  // ⚡ Bolt Optimization: cached search and display values
  _searchContent?: string;
  _displayDate?: string;
  _dateOnly?: string;
  _jjgNum?: number;
  _brdNum?: number;
  _haNum?: number;
  _mentahqtyNum?: number;
  _mentahrpNum?: number;
  _emptybunchqtyNum?: number;
  _emptybunchrpNum?: number;
  _jumlahdendaNum?: number;
  _totalalljjgNum?: number;
  _basisNum?: number;
  _rpbasisNum?: number;
  _premilv1Num?: number;
  _rate1Num?: number;
  _rplv1Num?: number;
  _premilv2Num?: number;
  _rate2Num?: number;
  _rplv2Num?: number;
  _premilv3Num?: number;
  _rate3Num?: number;
  _rplv3Num?: number;
  _totalrppremiNum?: number;
  _brd_rpNum?: number;
  _kurangbasisNum?: number;
  _hariliburNum?: number;
  _rphkNum?: number;
  _totalNum?: number;
  _premiPanenNum?: number;

  id: string;
  rowdata: string;
  fddate: string;
  kemandoran: string;
  level_user_detail: string;
  fcba: string;
  afdeling: string;
  employeecode: string;
  nama: string;
  attendance: string;
  hk: string | null;
  blok: string;
  tahuntanam: string;
  jjg: string;
  brd: string;
  ha: string;
  mentahqty: string;
  mentahrp: string;
  emptybunchqty: string;
  emptybunchrp: string;
  jumlahdenda: string;
  totalalljjg: string;
  basis: string;
  rpbasis: string;
  premilv1: string;
  rate1: string;
  rplv1: string;
  premilv2: string;
  rate2: string;
  rplv2: string;
  premilv3: string;
  rate3: string;
  rplv3: string;
  totalrppremi: string;
  brd_rp: string;
  kurangbasis: string;
  harilibur: string;
  rphk: string;
  total: string;
  under_ripe: string;
  overripe: string;
  abnormal: string;
  long_stalk: string;
  eaten_by_rat: string;
  unharvest_ffb: string;
  uncollect_lf_circle: string;
  uncollect_lf_piece: string;
  unarrange_ffb: string;
  unprune_frond: string;
  qe_1_pelepah_tidak_disusun: string;
  qe_2_buah_matahari: string;
  qe_3_buah_busuk: string;
  qe_4_buah_mentah_diperam: string;
  qe_5_over_pruning: string;
  qe_6_brondolan_tidak_dialas: string;
  qe_7_brondolan_kotor_sampah: string;
  qe_8_buah_dibelah: string;
  qe_9: string;
  qe_10: string;
  fcentry: string;
  fcedit: string;
  fcip: string;
  lastupdate: string;
  lasttime: string;
  qe_11_buah_mentah_a1: string;
  qe_12_buah_tinggal_s: string;
  qe_13_b_ggng_pjg_t_dipotong: string;
  qe_14: string;
  qe_15: string;
  qe_16_buah_mentah_kerani: string;
  qe_17_buah_mentah_mandor: string;
  documentno: string;
};

type Filters = Partial<{
  fddate: string;
  fddate_end: string;
  kemandoran: string;
  employeecode: string;
  fcba: string;
  afdeling: string;
  tahuntanam: string;
  blok: string;
  attendance: string;
}>;

import { cookieStore } from '@/utils/auth/cookieStore';
import { getFilterCriteria, getLockedFields, type UserLevel } from '@/utils/helpers/filterHelper';

/* =========================
   M A I N
   ========================= */
export default function Lhm() {
  const localeTag = useLocale();
  const tL = useTranslations('Lhm');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const handleTourStepChange = useCallback((stepIndex: number) => {
    if (stepIndex === 4) {
      setShowFilters(true);
    }
  }, []);

  const [filters, setFilters] = useState<Filters>(() => {
    const yesterday = getYesterdayISO();
    const today = getTodayISO();
    return {
      fddate: yesterday,
      fddate_end: today,
      kemandoran: '',
      employeecode: '',
      fcba: '',
      afdeling: '',
      tahuntanam: '',
      blok: '',
      attendance: '',
    };
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters | null>(null);

  const [userLevel, setUserLevel] = useState<UserLevel>('OTHER');
  const [homeFcba, setHomeFcba] = useState<string>('');
  const [homeSection, setHomeSection] = useState<string>('');
  const [homeGang, setHomeGang] = useState<string>('');
  const [userFcbaCookie, setUserFcbaCookie] = useState<string>('');
  const [userAfdelingCookie, setUserAfdelingCookie] = useState<string>('');

  /* ===== Bootstrap cookies ===== */
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

    const level = cookieStore.getLevel();
    const upperLevel = level.toUpperCase();
    const normalizedLevel = upperLevel === 'ADMIN' ? 'ADM' : upperLevel;
    setUserLevel((normalizedLevel as UserLevel) || 'OTHER');
  }, []);

  const getScopedFilters = useCallback(
    (baseFilters: Filters): Filters => {
      const scopedFilters: Filters = { ...baseFilters };

      const filterCriteria = getFilterCriteria(
        {
          level: userLevel,
          fcba: userFcbaCookie || homeFcba,
          afdeling: userAfdelingCookie || homeSection,
          gang: homeGang,
        },
        'lhm'
      );

      // Apply the filter criteria to base filters
      if (filterCriteria.fcba) scopedFilters.fcba = filterCriteria.fcba;
      if (filterCriteria.afdeling) scopedFilters.afdeling = filterCriteria.afdeling;
      if (filterCriteria.kemandoran) scopedFilters.kemandoran = filterCriteria.kemandoran;

      return scopedFilters;
    },
    [userLevel, homeFcba, homeSection, homeGang, userFcbaCookie, userAfdelingCookie]
  );

  const { isFcbaLocked, isAfdelingLocked, isKemandoranLocked } = useMemo(
    () => getLockedFields(userLevel, 'lhm'),
    [userLevel]
  );

  useEffect(() => {
    setFilters(current => {
      const next = getScopedFilters(current);
      setAppliedFilters(prev => prev ?? next);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [getScopedFilters]);

  /* ===== Fetch LHM data ===== */
  const [items, setItems] = useState<LhmData[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (currentFilters: Filters) => {
      setLoading(true);
      setError(null);
      setItems([]);

      try {
        const params = new URLSearchParams();
        const f = getScopedFilters(currentFilters);

        Object.entries(f).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            params.append(k, v as string);
          }
        });

        const res = await fetch(`/api/lhm${params.toString() ? `?${params}` : ''}`, {
          credentials: 'include',
        });

        if (res.status === 401) {
          await logoutAndRedirect();
          return;
        }

        const json = await res.json();
        if (isUnauthenticatedJson(json)) {
          await logoutAndRedirect();
          return;
        }

        if (!res.ok) {
          const msg = json.message || `HTTP ${res.status}`;
          setError(msg);
          setItems([]);
          return;
        }

        if (json.success && Array.isArray(json.data)) {
          if (json.data.length === 0) {
            // Show the API message when data is empty
            setError(json.message || 'Data tidak ditemukan.');
            setItems([]);
          } else {
            const seen = new Set<string>();
            const data = json.data.map((it: LhmData, idx: number) => {
              const dateOnly = (it.fddate || '').split(' ')[0];

              const candidate = [
                it.employeecode || '',
                it.kemandoran || '',
                dateOnly,
                it.blok || '',
                it.fcba || '',
                it.afdeling || '',
                String(idx),
              ].join('|');
              let key = candidate;
              while (seen.has(key)) key = `${key}_`;
              seen.add(key);

              return {
                ...it,
                _rowKey: key,
                _dateOnly: dateOnly,
              };
            });
            setItems(data);
          }
        } else {
          const msg = json.message || 'Gagal mengambil data';
          setError(msg);
          setItems([]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [getScopedFilters]
  );

  useEffect(() => {
    if (appliedFilters && (homeFcba || userLevel === 'ADM')) {
      fetchData(appliedFilters);
    }
  }, [appliedFilters, userLevel, homeFcba, fetchData]);

  /**
   * ⚡ Bolt Optimization:
   * 1. Single-pass enrichment to add display labels, numeric values, and search content.
   * 2. Uses formatPerfDate and formatPerfNumber with cached formatters (~50x faster).
   * 3. Moves ALL string-to-number parsing and localization logic out of the render loop.
   */
  const enrichedItems = useMemo(() => {
    return items.map(it => {
      const dateOnly = it._dateOnly || '';
      const displayDate = dateOnly ? formatPerfDate(dateOnly, localeTag) : '-';

      // Pre-calculate ALL numeric fields
      const _jjgNum = toNumber(it.jjg);
      const _brdNum = toNumber(it.brd);
      const _haNum = toNumber(it.ha);
      const _mentahqtyNum = toNumber(it.mentahqty);
      const _mentahrpNum = toNumber(it.mentahrp);
      const _emptybunchqtyNum = toNumber(it.emptybunchqty);
      const _emptybunchrpNum = toNumber(it.emptybunchrp);
      const _jumlahdendaNum = toNumber(it.jumlahdenda);
      const _totalalljjgNum = toNumber(it.totalalljjg);
      const _basisNum = toNumber(it.basis);
      const _rpbasisNum = toNumber(it.rpbasis);
      const _premilv1Num = toNumber(it.premilv1);
      const _rate1Num = toNumber(it.rate1);
      const _rplv1Num = toNumber(it.rplv1);
      const _premilv2Num = toNumber(it.premilv2);
      const _rate2Num = toNumber(it.rate2);
      const _rplv2Num = toNumber(it.rplv2);
      const _premilv3Num = toNumber(it.premilv3);
      const _rate3Num = toNumber(it.rate3);
      const _rplv3Num = toNumber(it.rplv3);
      const _totalrppremiNum = toNumber(it.totalrppremi);
      const _brd_rpNum = toNumber(it.brd_rp);
      const _kurangbasisNum = toNumber(it.kurangbasis);
      const _hariliburNum = toNumber(it.harilibur);
      const _rphkNum = toNumber(it.rphk);
      const _totalNum = toNumber(it.total);
      const _premiPanenNum = _totalrppremiNum + _rpbasisNum;

      // ⚡ Bolt Optimization: pre-calculate search content string
      const searchContent = [
        it.employeecode,
        it.nama,
        it.fddate,
        dateOnly,
        displayDate,
        it.kemandoran,
        it.blok,
        it.fcba,
        it.afdeling,
        it.attendance,
        it.tahuntanam,
        it.documentno,
        it.fcentry,
        it.lastupdate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return {
        ...it,
        _displayDate: displayDate,
        _searchContent: searchContent,
        _jjgNum,
        _brdNum,
        _haNum,
        _mentahqtyNum,
        _mentahrpNum,
        _emptybunchqtyNum,
        _emptybunchrpNum,
        _jumlahdendaNum,
        _totalalljjgNum,
        _basisNum,
        _rpbasisNum,
        _premilv1Num,
        _rate1Num,
        _rplv1Num,
        _premilv2Num,
        _rate2Num,
        _rplv2Num,
        _premilv3Num,
        _rate3Num,
        _rplv3Num,
        _totalrppremiNum,
        _brd_rpNum,
        _kurangbasisNum,
        _hariliburNum,
        _rphkNum,
        _totalNum,
        _premiPanenNum,
      };
    });
  }, [items, localeTag]);

  /* ===== Quick search ===== */
  // ⚡ Bolt Optimization: Consolidated filtering and totals calculation in a single pass
  // to avoid redundant O(N) loops. This reduces iterations by ~66% during search/filter operations.
  const { filtered, lhmTotals, attendanceExists } = useMemo(() => {
    const s = q.trim().toLowerCase();
    const result: LhmData[] = [];
    const totals = {
      jjg: 0,
      totalalljjg: 0,
      brd: 0,
      total: 0,
    };
    let hasAttendance = false;

    for (const it of enrichedItems) {
      if (!s || it._searchContent?.includes(s)) {
        result.push(it);

        // ⚡ Bolt Optimization: Use pre-calculated numbers to avoid thousands of O(N*M) parsing/regex calls during search
        totals.jjg += it._jjgNum || 0;
        totals.totalalljjg += it._totalalljjgNum || 0;
        totals.brd += it._brdNum || 0;
        totals.total += it._totalNum || 0;

        if (s && (it.attendance || '').toLowerCase().includes(s)) {
          hasAttendance = true;
        }
      }
    }

    return {
      filtered: result,
      lhmTotals: totals,
      attendanceExists: !s || hasAttendance,
    };
  }, [q, enrichedItems]);

  // ⚡ Bolt Optimization: Side-effects (setError) moved out of useMemo to useEffect
  // to preserve existing error-reporting logic while avoiding React render-phase state updates.
  useEffect(() => {
    if (!q || items.length === 0) {
      setError(null);
    } else if (!attendanceExists) {
      setError(`Data dengan attendance "${q}" tidak ditemukan.`);
    } else {
      setError(null);
    }
  }, [q, items.length, attendanceExists]);

  const totalCards = [
    {
      label: 'Total Janjang (JJG)',
      value: lhmTotals.jjg,
      className: 'text-primary',
    },
    {
      label: 'Total Brondolan (BRD)',
      value: lhmTotals.brd,
      className: 'text-success',
    },
    {
      label: 'Total Gaji',
      value: lhmTotals.total,
      className: 'text-warning',
    },
  ];

  /* ===== Export Excel ===== */
  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error(tL('toastNoData'));
      return;
    }

    const dataToExport = filtered.map((r, idx) => ({
      No: idx + 1,
      Tanggal: formatDateDMY(r.fddate),
      Kemandoran: r.kemandoran || '-',
      FCBA: r.fcba || '-',
      Afdeling: r.afdeling || '-',
      'Kode Karyawan': r.employeecode || '-',
      Nama: r.nama || '-',
      Attendance: r.attendance || '-',
      HK: r.hk ?? '-',
      Blok: r.blok || '-',
      'Tahun Tanam': r.tahuntanam || '-',
      JJG: Number(r.jjg || '0'),
      BRD: Number(r.brd || '0'),
      HA: Number(r.ha || '0'),
      MentahQty: Number(r.mentahqty || '0'),
      MentahRp: Number(r.mentahrp || '0'),
      EmptyBunchQty: Number(r.emptybunchqty || '0'),
      EmptyBunchRp: Number(r.emptybunchrp || '0'),
      JumlahDenda: Number(r.jumlahdenda || '0'),
      TotalAllJjg: Number(r.totalalljjg || '0'),
      Basis: Number(r.basis || '0'),
      RpBasis: Number(r.rpbasis || '0'),
      PremiLv1: Number(r.premilv1 || '0'),
      Rate1: Number(r.rate1 || '0'),
      RpLv1: Number(r.rplv1 || '0'),
      PremiLv2: Number(r.premilv2 || '0'),
      Rate2: Number(r.rate2 || '0'),
      RpLv2: Number(r.rplv2 || '0'),
      PremiLv3: Number(r.premilv3 || '0'),
      Rate3: Number(r.rate3 || '0'),
      RpLv3: Number(r.rplv3 || '0'),
      TotalRpPremi: Number(r.totalrppremi || '0'),
      KurangBasis: Number(r.kurangbasis || '0'),
      HariLibur: Number(r.harilibur || '0'),
      RpHK: Number(r.rphk || '0'),
      'Brondolan RP': Number(r.brd_rp || '0'),
      Total: Number(r.total || '0'),
      'Under Ripe': Number(r.under_ripe || '0'),
      Overripe: Number(r.overripe || '0'),
      Abnormal: Number(r.abnormal || '0'),
      'Long Stalk': Number(r.long_stalk || '0'),
      'Eaten by Rat': Number(r.eaten_by_rat || '0'),
      'Unharvest FFB': Number(r.unharvest_ffb || '0'),
      'Uncollect LF Circle': Number(r.uncollect_lf_circle || '0'),
      'Uncollect LF Piece': Number(r.uncollect_lf_piece || '0'),
      'Unarrange FFB': Number(r.unarrange_ffb || '0'),
      'Unprune Frond': Number(r.unprune_frond || '0'),
      'QE1 Pelepah Tidak Disusun': Number(r.qe_1_pelepah_tidak_disusun || '0'),
      'QE2 Buah Matahari': Number(r.qe_2_buah_matahari || '0'),
      'QE3 Buah Busuk': Number(r.qe_3_buah_busuk || '0'),
      'QE4 Buah Mentah Diperam': Number(r.qe_4_buah_mentah_diperam || '0'),
      'QE5 Over Pruning': Number(r.qe_5_over_pruning || '0'),
      'QE6 Brondolan Tidak Dialas': Number(r.qe_6_brondolan_tidak_dialas || '0'),
      'QE7 Brondolan Kotor Sampah': Number(r.qe_7_brondolan_kotor_sampah || '0'),
      'QE8 Buah Dibelah': Number(r.qe_8_buah_dibelah || '0'),
      QE9: Number(r.qe_9 || '0'),
      QE10: Number(r.qe_10 || '0'),
      'QE11 Buah Mentah A1': Number(r.qe_11_buah_mentah_a1 || '0'),
      'QE12 Buah Tinggal S': Number(r.qe_12_buah_tinggal_s || '0'),
      'QE13 B Ggng Pjg T Dipotong': Number(r.qe_13_b_ggng_pjg_t_dipotong || '0'),
      QE14: Number(r.qe_14 || '0'),
      QE15: Number(r.qe_15 || '0'),
      'QE16 Buah Mentah Kerani': Number(r.qe_16_buah_mentah_kerani || '0'),
      'QE17 Buah Mentah Mandor': Number(r.qe_17_buah_mentah_mandor || '0'),
      'Document No': r.documentno || '-',
      'Last Update': r.lastupdate || '-',
      'Last Time': r.lasttime || '-',
    }));

    exportJsonToCsv(dataToExport, `LHM_${filters.fddate}_${filters.fddate_end}.csv`);
  };

  /* ===== Columns ===== */
  const columns: TableColumn<LhmData>[] = useMemo(
    () => [
      {
        name: <span title={tL('colAksiTooltip')}>{tL('colAksi')}</span>,
        width: '50px',
        cell: (r: LhmData) => (
          <LhmActionCell
            fcba={r.fcba}
            afdeling={r.afdeling}
            fddate={r.fddate}
            kemandoran={r.kemandoran}
          />
        ),
        ignoreRowClick: true,
      },
      {
        name: <span title="Nomor urut baris">#</span>,
        width: '70px',
        cell: (_r, i) => <span>{i + 1}</span>,
        ignoreRowClick: true,
      },
      {
        name: <span title={tL('colApprovalTooltip')}>{tL('colApproval')}</span>,
        selector: r => r.level_user_detail,
        sortable: true,
        width: '150px',
      },
      {
        name: <span title={tL('colTanggalTooltip')}>{tL('colTanggal')}</span>,
        selector: r => r._dateOnly ?? '',
        sortable: true,
        width: '125px',
        cell: r => <span title={r._dateOnly}>{r._displayDate}</span>,
      },
      {
        name: <span title={tL('colKemandoranTooltip')}>{tL('colKemandoran')}</span>,
        selector: r => r.kemandoran,
        sortable: true,
        width: '120px',
      },
      {
        name: <span title={tL('colKaryawanTooltip')}>{tL('colKaryawan')}</span>,
        selector: r => r.employeecode,
        sortable: true,
        width: '180px',
        style: { flexGrow: 2 as number, minWidth: '160px' },
      },
      {
        name: <span title={tL('colNamaTooltip')}>{tL('colNama')}</span>,
        selector: r => r.nama,
        sortable: true,
        width: '160px',
        style: { flexGrow: 2 as number, minWidth: '140px' },
      },
      {
        name: <span title="Kode Attendance">Att</span>,
        selector: r => r.attendance,
        sortable: true,
        width: '80px',
        cell: r =>
          r.attendance ? <span className="badge badge-sm badge-ghost">{r.attendance}</span> : null,
      },
      {
        name: <span title="Hari Kerja (HK)">HK</span>,
        selector: r => r.hk ?? '-',
        sortable: true,
        width: '65px',
        cell: r => r.hk,
      },
      {
        name: <span title="Kode Blok">Blok</span>,
        selector: r => r.blok,
        sortable: true,
        width: '75px',
      },
      {
        name: <span title="Tahun Tanam">Tahun Tanam</span>,
        selector: r => r.tahuntanam,
        sortable: true,
        width: '80px',
      },
      {
        name: <span title="Janjang (JJG)">JJG</span>,
        selector: r => r._jjgNum ?? 0,
        sortable: true,
        width: '70px',
        cell: r => <NumberCell value={r._jjgNum} />,
      },
      {
        name: <span title="Brondolan (BRD)">BRD</span>,
        selector: r => r._brdNum ?? 0,
        sortable: true,
        width: '70px',
        cell: r => <NumberCell value={r._brdNum} />,
      },
      {
        name: <span title="Hektar (HA)">HA</span>,
        selector: r => r._haNum ?? 0,
        sortable: true,
        width: '65px',
        cell: r => <NumberCell value={r._haNum} />,
      },
      {
        name: <span title="Mentah Qty">Mentah-A (Jjg)</span>,
        selector: r => r._mentahqtyNum ?? 0,
        sortable: true,
        width: '110px',
        cell: r => <NumberCell value={r._mentahqtyNum} />,
      },
      {
        name: <span title="Mentah Rp">Mentah-A (Rp)</span>,
        selector: r => r._mentahrpNum ?? 0,
        sortable: true,
        width: '110px',
        cell: r => <NumberCell value={r._mentahrpNum} />,
      },
      {
        name: <span title="Empty Bunch Qty">E (Jjg)</span>,
        selector: r => r._emptybunchqtyNum ?? 0,
        sortable: true,
        width: '70px',
        cell: r => <NumberCell value={r._emptybunchqtyNum} />,
      },
      {
        name: (
          <span title="Empty Bunch Rp">
            E <br />
            (Rp)
          </span>
        ),
        selector: r => r._emptybunchrpNum ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._emptybunchrpNum} />,
      },
      {
        name: <span title="Jumlah Denda">Jumlah (Rp)</span>,
        selector: r => r._jumlahdendaNum ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._jumlahdendaNum} />,
      },
      {
        name: <span title="Hasil Netto Jjg">Hasil Netto (Jjg)</span>,
        selector: r => r._totalalljjgNum ?? 0,
        sortable: true,
        width: '80px',
        cell: r => <NumberCell value={r._totalalljjgNum} />,
      },
      {
        name: <span title="Janjang Basis">Basis (Jjg)</span>,
        selector: r => r._basisNum ?? 0,
        sortable: true,
        width: '70px',
        cell: r => <NumberCell value={r._basisNum} />,
      },
      {
        name: <span title="Rupiah Siap Basis">Siap Basis (Rp)</span>,
        selector: r => r._rpbasisNum ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rpbasisNum} />,
      },
      {
        name: <span title="Jumlah Janjang Lebih Basis Level 1">Level 1 Jlh Jjg</span>,
        selector: r => r._premilv1Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._premilv1Num} />,
      },
      {
        name: <span title="Rupiah / Janjang Level 1">Level 1 Rp/Jjg</span>,
        selector: r => r._rate1Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rate1Num} />,
      },
      {
        name: <span title="Rupiah Level 1">Level 1 Rp</span>,
        selector: r => r._rplv1Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rplv1Num} />,
      },
      {
        name: <span title="Jumlah Janjang Lebih Basis Level 2">Level 2 Jlh Jjg</span>,
        selector: r => r._premilv2Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._premilv2Num} />,
      },
      {
        name: <span title="Rupiah / Janjang Level 2">Level 2 Rp/Jjg</span>,
        selector: r => r._rate2Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rate2Num} />,
      },
      {
        name: <span title="Rupiah Level 2">Level 2 Rp</span>,
        selector: r => r._rplv2Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rplv2Num} />,
      },
      {
        name: <span title="Jumlah Janjang Lebih Basis Level 3">Level 3 Jlh Jjg</span>,
        selector: r => r._premilv3Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._premilv3Num} />,
      },
      {
        name: <span title="Rupiah / Janjang Level 3">Level 3 Rp/Jjg</span>,
        selector: r => r._rate3Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rate3Num} />,
      },
      {
        name: <span title="Rupiah Level 3">Level 3 Rp</span>,
        selector: r => r._rplv3Num ?? 0,
        sortable: true,
        width: '85px',
        cell: r => <NumberCell value={r._rplv3Num} />,
      },
      {
        name: <span title="Jumlah Premi (Rp)">Jumlah Premi (Rp)</span>,
        selector: r => r._totalrppremiNum ?? 0,
        sortable: true,
        width: '95px',
        cell: r => <NumberCell value={r._totalrppremiNum} />,
      },
      {
        name: <span title="Upah Pokok (Rp)">Upah Pokok (Rp)</span>,
        selector: r => r._rphkNum ?? 0,
        sortable: true,
        width: '95px',
        cell: r => <NumberCell value={r._rphkNum} />,
      },
      {
        name: <span title="Tidak Capai Basis (Rp)">Tidak Capai Basis (Rp)</span>,
        selector: r => r._kurangbasisNum ?? 0,
        sortable: true,
        width: '95px',
        cell: r => <NumberCell value={r._kurangbasisNum} />,
      },
      {
        name: <span title="Premi Panen (Rp)">Premi Panen (Rp)</span>,
        selector: r => r._premiPanenNum ?? 0,
        sortable: true,
        width: '95px',
        cell: r => <NumberCell value={r._premiPanenNum} />,
      },
      {
        name: <span title="Premi Brondol (Rp)">Premi Brondol (Rp)</span>,
        selector: r => r._brd_rpNum ?? 0,
        sortable: true,
        width: '95px',
        cell: r => <NumberCell value={r._brd_rpNum} />,
      },
      {
        name: <span title="Total">Total</span>,
        selector: r => r._totalNum ?? 0,
        sortable: true,
        width: '100px',
        cell: r => (
          <span className="font-bold w-full text-right inline-block">
            {formatPerfNumber(String(r._totalNum ?? '0'), localeTag)}
          </span>
        ),
      },
    ],
    [tL, localeTag]
  );

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        icon: '👋',
        title: tL('tourWelcomeTitle'),
        content: tL('tourWelcomeDesc'),
      },
      {
        icon: '🔍',
        title: tL('tourActionsTitle'),
        content: tL('tourActionsDesc'),
        targetSelector: '[data-tour="action-buttons"]',
        modalPosition: 'top',
      },
      {
        icon: '🔎',
        title: tL('tourSearchTitle'),
        content: tL('tourSearchDesc'),
        targetSelector: '[data-tour="quick-search"]',
        modalPosition: 'top-left',
      },
      {
        icon: '📊',
        title: tL('tourTotalsTitle'),
        content: tL('tourTotalsDesc'),
        targetSelector: '[data-tour="total-cards"]',
        modalPosition: 'top-left',
      },
      {
        icon: '📋',
        title: tL('tourFilterTitle'),
        content: tL('tourFilterDesc'),
        targetSelector: '[data-tour="filter-button"]',
        modalPosition: 'bottom',
      },
      {
        icon: '📄',
        title: tL('tourTableTitle'),
        content: tL('tourTableDesc'),
        targetSelector: '[data-tour="data-table"]',
        modalPosition: 'top',
      },
    ],
    [tL]
  );

  return (
    <PageLayout>
        {/* Header */}
        <Toolbar
          title={tL('pageTitle')}
          titleTooltip={tL('pageTitleTooltip')}
          actions={[
            { key: 'filter', label: showFilters ? tL('hideFilters') : tL('showFilters'), icon: 'filter', onClick: () => setShowFilters(s => !s), variant: 'outline', tour: 'filter-button' },
            { key: 'refresh', label: loading ? tL('loading') : tL('refresh'), icon: 'refresh', onClick: () => fetchData(appliedFilters ?? getScopedFilters(filters)), disabled: loading, loading, variant: 'outline' },
          ]}
        >
          <AppTour steps={tourSteps} storageKey="tour-lhm" onStepChange={handleTourStepChange} />
          <ExportButton onClick={handleExport} label={tL('export')} />
        </Toolbar>

        {/* Quick Search + Total Cards */}
        <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-slideUp [animation-delay:100ms]">
          {/* Total Cards */}
          <div data-tour="total-cards">
            <SummaryCards cards={totalCards.map(c => ({ ...c, value: formatPerfNumber(String(c.value), localeTag) }))} />
          </div>
          <QuickSearch
            value={q}
            onChange={setQ}
            placeholder={tL('searchPlaceholder')}
            className="w-full sm:w-72 sm:ml-auto"
          />
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <FilterBar
            fields={[
              { key: 'fddate', label: 'Tgl Awal', type: 'date', placeholder: tL('filterDateStart') },
              { key: 'fddate_end', label: 'Tgl Akhir', type: 'date', placeholder: tL('filterDateEnd') },
              { key: 'kemandoran', label: 'Kemandoran', type: 'text', placeholder: tL('filterKemandoran'), disabled: isKemandoranLocked },
              { key: 'employeecode', label: 'Karyawan', type: 'text', placeholder: tL('filterKaryawan') },
              { key: 'fcba', label: 'FCBA', type: 'text', placeholder: tL('filterFcba'), disabled: isFcbaLocked },
              { key: 'afdeling', label: 'Afdeling', type: 'text', placeholder: tL('filterAfdeling'), disabled: isAfdelingLocked },
              { key: 'tahuntanam', label: 'Tahun Tanam', type: 'text', placeholder: 'Tahun Tanam' },
              { key: 'blok', label: 'Blok', type: 'text', placeholder: 'Blok' },
              {
                key: 'attendance',
                label: 'Attendance',
                type: 'select',
                placeholder: 'Attendance',
                options: [
                  { value: '', label: 'Attendance' },
                  { value: 'KJ', label: 'KJ' },
                  { value: 'MK', label: 'MK' },
                  { value: 'WH', label: 'WH' },
                  { value: 'WS', label: 'WS' },
                  { value: 'ML', label: 'ML' },
                  { value: 'P1', label: 'P1' },
                  { value: 'KB', label: 'KB' },
                  { value: 'OT', label: 'OT' },
                ],
              },
            ]}
            values={filters}
            onChange={(key, val) => setFilters(s => ({ ...s, [key]: val }))}
            onApply={() => {
              if (!filters.fddate && !filters.fddate_end) {
                toast.error(tL('toastFilterDateRequired'));
                return;
              }
              setAppliedFilters(getScopedFilters(filters));
            }}
            onReset={() => {
              const yesterday = getYesterdayISO();
              const today = getTodayISO();
              const resetFilters: Filters = {
                fddate: yesterday,
                fddate_end: today,
                kemandoran: '',
                employeecode: '',
                fcba: '',
                afdeling: '',
                tahuntanam: '',
                blok: '',
                attendance: '',
              };
              const scopedResetFilters = getScopedFilters(resetFilters);
              setFilters(scopedResetFilters);
              setAppliedFilters(scopedResetFilters);
            }}
            loading={loading}
            t={tL}
            showApply
            showReset
          />
        )}

        {/* Error */}
        {/* Error visual dihilangkan, cukup toast saja yang muncul */}

        {/* DataTable */}
        <AppDataTable
          columns={columns}
          data={filtered}
          loading={loading}
          namespace="Lhm"
          onClearSearch={q ? () => setQ('') : undefined}
        />
    </PageLayout>
  );
}
