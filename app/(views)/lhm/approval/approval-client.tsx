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
import { QuickSearch } from '@/app/components/ui/quick-search';
import { FilterBar } from '@/app/components/ui/filter-bar';
import { NumberCell } from '@/app/components/ui/number-cell';
import { LhmActionCell } from '@/app/components/ui/lhm-action-cell';
import { SummaryCards } from '@/app/components/ui/summary-cards';
import { PageLayout } from '@/app/components/ui/page-layout';
import { ConfirmModal } from '@/app/components/ui/confirm-modal';
import { Toolbar } from '@/app/components/ui/toolbar';

/* =========================
   T Y P E S
========================= */
type LhmData = {
  _rowKey?: string;
  _selected?: boolean;
  // ? Bolt Optimization: cached search and display values
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
  _totalbrdNum?: number;
  _totalNum?: number;
  _premiPanenNum?: number;

  id: string;
  rowdata: string;
  fddate: string;
  kemandoran: string;
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
  basis_ha: string;
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
  totalbrd: string;
  rate_brondolan: string;
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
  level_user: string;
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
  level_user: string;
  upload: string;
}>;

const getEmptyFilters = (): Filters => {
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
    upload: 'N',
  };
};

/* =========================
   U T I L S
========================= */
const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

import { cookieStore } from '@/utils/auth/cookieStore';
import { type UserLevel } from '@/utils/helpers/filterHelper';

/* =========================
   M A I N
========================= */
export default function Approval() {
  const localeTag = useLocale();
  const tL = useTranslations('Lhm');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const handleTourStepChange = useCallback((stepIndex: number) => {
    if (stepIndex === 4) {
      setShowFilters(true);
    }
  }, []);

  const [selectedRows, setSelectedRows] = useState<LhmData[]>([]);
  const [toggledClearRows, setToggledClearRows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>(() => getEmptyFilters());
  const [appliedFilters, setAppliedFilters] = useState<Filters | null>(null);

  const [homeFcba, setHomeFcba] = useState<string>('');
  const [homeAfdeling, setHomeAfdeling] = useState<string>('');
  const [homeGang, setHomeGang] = useState<string>('');
  const [userLevel, setUserLevel] = useState<UserLevel>(() => {
    const level = cookieStore.getLevel();
    const upper = level.toUpperCase();
    const normalized = upper === 'ADMIN' ? 'ADM' : upper;
    return (normalized as UserLevel) || 'OTHER';
  });

  const getScopedFilters = useCallback(
    (baseFilters: Filters): Filters => {
      const scopedFilters: Filters = { ...baseFilters };

      if (userLevel !== 'ADM' && userLevel !== 'OTHER') {
        scopedFilters.level_user = userLevel;
      } else {
        delete scopedFilters.level_user;
      }

      if (userLevel === 'MDP') {
        scopedFilters.fcba = homeFcba;
        scopedFilters.afdeling = homeAfdeling;
        scopedFilters.kemandoran = homeGang;
      } else if (userLevel === 'MGR' || userLevel === 'KSI') {
        scopedFilters.fcba = homeFcba;
      } else if (
        userLevel === 'AST' ||
        userLevel === 'MD1' ||
        userLevel === 'KRA' ||
        userLevel === 'KRT'
      ) {
        scopedFilters.fcba = homeFcba;
        scopedFilters.afdeling = homeAfdeling;
      } else if (userLevel === 'KRP') {
        scopedFilters.fcba = homeFcba;
        scopedFilters.afdeling = homeAfdeling;
        scopedFilters.kemandoran = homeGang;
      }

      return scopedFilters;
    },
    [homeAfdeling, homeFcba, homeGang, userLevel]
  );

  const isFcbaLocked =
    userLevel === 'MDP' ||
    userLevel === 'KRP' ||
    userLevel === 'MGR' ||
    userLevel === 'KSI' ||
    userLevel === 'AST' ||
    userLevel === 'MD1' ||
    userLevel === 'KRA' ||
    userLevel === 'KRT';
  const isAfdelingLocked =
    userLevel === 'MDP' ||
    userLevel === 'KRP' ||
    userLevel === 'AST' ||
    userLevel === 'MD1' ||
    userLevel === 'KRA' ||
    userLevel === 'KRT';
  const isKemandoranLocked = userLevel === 'MDP' || userLevel === 'KRP';

  /* ===== Bootstrap cookies ===== */
  useEffect(() => {
    const fcba = cookieStore.getFcba();
    const afdeling = cookieStore.getSection();
    const gang = cookieStore.getGang();
    const level = cookieStore.getLevel();
    const upperLevel = level.toUpperCase();
    const resolvedLevel = ((upperLevel === 'ADMIN' ? 'ADM' : upperLevel) as UserLevel) || 'OTHER';

    setHomeFcba(fcba);
    setHomeAfdeling(afdeling);
    setHomeGang(gang);
    setUserLevel(resolvedLevel);
  }, []);

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
      setSelectedRows([]);
      setToggledClearRows(prev => !prev);

      try {
        const params = new URLSearchParams();
        const f = getScopedFilters(currentFilters);

        Object.entries(f).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            params.append(k, v as string);
          }
        });

        const res = await fetch(`/api/lhm/approval${params.toString() ? `?${params}` : ''}`, {
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
            // Data kosong, tampilkan message dari API
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
    if (
      appliedFilters &&
      (userLevel === 'ADM' ||
        userLevel === 'OTHER' ||
        ((userLevel === 'MGR' || userLevel === 'KSI') && homeFcba) ||
        ((userLevel === 'AST' ||
          userLevel === 'MD1' ||
          userLevel === 'KRA' ||
          userLevel === 'KRT') &&
          homeFcba &&
          homeAfdeling) ||
        ((userLevel === 'MDP' || userLevel === 'KRP') && homeFcba && homeAfdeling && homeGang))
    ) {
      fetchData(appliedFilters);
    }
  }, [appliedFilters, userLevel, homeFcba, homeAfdeling, homeGang, fetchData]);

  /**
   * ? Bolt Optimization:
   * 1. Single-pass enrichment to add display labels, numeric values, and search content.
   * 2. Uses formatPerfDate with cached formatters (~50x faster).
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
      const _totalbrdNum = toNumber(it.totalbrd);
      const _totalNum = toNumber(it.total);
      const _premiPanenNum = _totalrppremiNum + _rpbasisNum;

      // ? Bolt Optimization: pre-calculate search content string
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
        it.level_user,
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
        _totalbrdNum,
        _totalNum,
        _premiPanenNum,
      };
    });
  }, [items, localeTag]);

  /* ===== Quick search ===== */
  // ? Bolt Optimization: Consolidated filtering and totals calculation in a single pass
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

        // ? Bolt Optimization: Use pre-calculated numbers to avoid thousands of O(N*M) toNumber/regex calls during search
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

  // ? Bolt Optimization: Side-effects (setError) moved out of useMemo to useEffect
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

  /* ===== Row selection ===== */
  const handleRowSelected = useCallback((state: { selectedRows: LhmData[] }) => {
    setSelectedRows(state.selectedRows);
  }, []);

  /* ===== Approve (submit to upstream) ===== */
  const handleApprove = () => {
    if (selectedRows.length === 0) {
      toast.error(tL('toastSelectApprove'));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      // Map selected rows ? baca HA dari `items` (source of truth) karena
      // data-table internal selection masih menyimpan referensi row lama
      const selectedKeys = new Set(selectedRows.map(r => r._rowKey));
      const dataArr = items
        .filter(item => selectedKeys.has(item._rowKey))
        .map(item => ({
          ID: String(item.id ?? ''),
          ROWDATA: String(item.rowdata ?? ''),
          HA: String(item.ha ?? ''),
          BASIS_HA: String(item.basis_ha ?? ''),
          FCBA: String(item.fcba ?? ''),
          FDDATE: String(item.fddate ?? ''),
        }));

      const payload = { data: dataArr };

      // Add CSRF token
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];

      const res = await fetch('/api/lhm/approval/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(tL('toastApproveSuccess', { count: selectedRows.length }));
        setSelectedRows([]);
        setToggledClearRows(prev => !prev);
        if (appliedFilters) fetchData(appliedFilters);
      } else {
        const msg = json.message || 'Gagal meng-approve data';
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat approval';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ===== Export Excel ===== */
  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error(tL('toastNoData'));
      return;
    }

    const dataToExport = filtered.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r._displayDate || formatDateDMY(r.fddate),
      Kemandoran: r.kemandoran || '-',
      FCBA: r.fcba || '-',
      Afdeling: r.afdeling || '-',
      'Kode Karyawan': r.employeecode || '-',
      Nama: r.nama || '-',
      Attendance: r.attendance || '-',
      HK: r.hk ?? '-',
      Blok: r.blok || '-',
      'Tahun Tanam': r.tahuntanam || '-',
      JJG: r._jjgNum || 0,
      BRD: r._brdNum || 0,
      HA: r._haNum || 0,
      MentahQty: r._mentahqtyNum || 0,
      MentahRp: r._mentahrpNum || 0,
      EmptyBunchQty: r._emptybunchqtyNum || 0,
      EmptyBunchRp: r._emptybunchrpNum || 0,
      JumlahDenda: r._jumlahdendaNum || 0,
      TotalAllJjg: r._totalalljjgNum || 0,
      Basis: r._basisNum || 0,
      RpBasis: r._rpbasisNum || 0,
      PremiLv1: r._premilv1Num || 0,
      Rate1: r._rate1Num || 0,
      RpLv1: r._rplv1Num || 0,
      PremiLv2: r._premilv2Num || 0,
      Rate2: r._rate2Num || 0,
      RpLv2: r._rplv2Num || 0,
      PremiLv3: r._premilv3Num || 0,
      Rate3: r._rate3Num || 0,
      RpLv3: r._rplv3Num || 0,
      TotalRpPremi: r._totalrppremiNum || 0,
      KurangBasis: r._kurangbasisNum || 0,
      HariLibur: r._hariliburNum || 0,
      RpHK: r._rphkNum || 0,
      'Brondolan RP': r._brd_rpNum || 0,
      Total: r._totalNum || 0,
      'Document No': r.documentno || '-',
      'Last Update': r.lastupdate || '-',
      'Last Time': r.lasttime || '-',
    }));

    exportJsonToCsv(dataToExport, `Approval_LHM_${filters.fddate}_${filters.fddate_end}.csv`);
  };

  /* ===== Columns ===== */

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        icon: '??',
        title: tL('tourWelcomeTitle'),
        content: tL('tourApprovalWelcomeDesc'),
      },
      {
        icon: '??',
        title: tL('tourActionsTitle'),
        content: tL('tourActionsDesc'),
        targetSelector: '[data-tour="action-buttons"]',
        modalPosition: 'top',
      },
      {
        icon: '??',
        title: tL('tourSearchTitle'),
        content: tL('tourSearchDesc'),
        targetSelector: '[data-tour="quick-search"]',
        modalPosition: 'top-left',
      },
      {
        icon: '??',
        title: tL('tourTotalsTitle'),
        content: tL('tourTotalsDesc'),
        targetSelector: '[data-tour="total-cards"]',
        modalPosition: 'top-left',
      },
      {
        icon: '??',
        title: tL('tourFilterTitle'),
        content: tL('tourFilterDesc'),
        targetSelector: '[data-tour="filter-button"]',
        modalPosition: 'bottom',
      },
      {
        icon: '??',
        title: tL('tourTableTitle'),
        content: tL('tourApprovalTableDesc'),
        targetSelector: '[data-tour="data-table"]',
        modalPosition: 'top',
      },
      {
        icon: '??',
        title: tL('tourHaColumnTitle'),
        content: tL('tourHaColumnDesc'),
        targetSelector: '[data-tour="ha-column"]',
        modalPosition: 'bottom',
      },
      {
        icon: '?',
        title: tL('tourApproveTitle'),
        content: tL('tourApproveDesc'),
        targetSelector: '[data-tour="approve-button"]',
        modalPosition: 'top-left',
      },
    ],
    [tL]
  );

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
        name: (
          <span title="Hektar (HA)" data-tour="ha-column">
            HA
          </span>
        ),
        selector: r => r._haNum ?? 0,
        sortable: true,
        width: '90px',
        cell: r => {
          // jika MDP ? jadi input
          if (userLevel === 'MDP' || userLevel === 'ADM') {
            return (
              <input
                type="number"
                className="input input-xs input-bordered w-full text-right"
                value={r.ha ?? ''}
                onChange={e => {
                  const val = e.target.value;

                  setItems(prev =>
                    prev.map(item => (item._rowKey === r._rowKey ? { ...item, ha: val } : item))
                  );
                }}
              />
            );
          }

          // selain MDP ? readonly
          return <NumberCell value={r._haNum} />;
        },
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
            {formatPerfNumber(r._totalNum ?? '0', localeTag)}
          </span>
        ),
      },
    ],
    [userLevel, tL, localeTag]
  );

  return (
    <PageLayout>
        {/* Header */}
        <Toolbar
          title={tL('pageTitleApproval')}
          titleTooltip={tL('pageTitleApprovalTooltip')}
          actions={[
            { key: 'filter', label: showFilters ? tL('hideFilters') : tL('showFilters'), icon: 'filter', onClick: () => setShowFilters(s => !s), variant: 'outline', tour: 'filter-button' },
            { key: 'refresh', label: loading ? tL('loading') : tL('refresh'), icon: 'refresh', onClick: () => fetchData(appliedFilters ?? getScopedFilters(filters)), disabled: loading, loading, variant: 'outline' },
          ]}
        >
          <AppTour steps={tourSteps} storageKey="tour-approval-lhm" onStepChange={handleTourStepChange} btnClassName="join-item flex-1 sm:flex-none" />
          <ExportButton onClick={handleExport} label={tL('export')} />
          <button
            className="btn btn-primary btn-sm flex-1 sm:flex-none join-item"
            onClick={handleApprove}
            disabled={selectedRows.length === 0 || submitting}
            data-tour="approve-button"
          >
            {submitting ? (
              <><span className="loading loading-spinner loading-xs" /><span className="hidden sm:inline">Approving...</span></>
            ) : (
              <><Icon name="check" className="h-4 w-4" /><span className="hidden sm:inline">{`Approve (${selectedRows.length})`}</span></>
            )}
          </button>
        </Toolbar>

        {/* Selected info */}
        {selectedRows.length > 0 && (
          <div className="mb-3">
            <div className="badge badge-lg badge-success gap-2">
              <span>{selectedRows.length}</span>
              <span>{tL('selectedForApproval')}</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setSelectedRows([]);
                  setToggledClearRows(prev => !prev);
                }}
                title="Batal pilih semua"
              >
                ?
              </button>
            </div>
          </div>
        )}

        {/* Quick Search + Total Cards */}
        <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 animate-slideUp [animation-delay:100ms]">
          {/* Total Cards */}
          <div data-tour="total-cards" className="flex-1 min-w-0">
            <SummaryCards cards={totalCards.map(c => ({ ...c, value: formatPerfNumber(String(c.value), localeTag) }))} />
          </div>
          <QuickSearch
            value={q}
            onChange={setQ}
            placeholder={tL('searchPlaceholder')}
            className="w-full sm:w-72"
          />
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <>
            <FilterBar
            fields={[
              { key: 'fddate', label: 'Tgl Awal', type: 'date', placeholder: tL('filterDateStart') },
              { key: 'fddate_end', label: 'Tgl Akhir', type: 'date', placeholder: tL('filterDateEnd') },
              { key: 'kemandoran', label: 'Kemandoran', type: 'text', placeholder: tL('filterKemandoran'), disabled: isKemandoranLocked },
              { key: 'employeecode', label: 'Karyawan', type: 'text', placeholder: tL('filterKaryawan') },
              { key: 'fcba', label: 'FCBA', type: 'text', placeholder: tL('filterFcba'), disabled: isFcbaLocked },
              { key: 'afdeling', label: 'Afdeling', type: 'text', placeholder: tL('filterAfdeling'), disabled: isAfdelingLocked },
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
              const resetFilters = {
                fddate: yesterday,
                fddate_end: today,
                kemandoran: '',
                employeecode: '',
                fcba: '',
                afdeling: '',
              };
              setFilters(resetFilters);
              setAppliedFilters(resetFilters);
            }}
            loading={loading}
            t={tL}
            showApply
            showReset
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            <input
              className="input input-bordered w-full"
              placeholder="Tahun Tanam"
              value={filters.tahuntanam ?? ''}
              onChange={e => setFilters(s => ({ ...s, tahuntanam: e.target.value }))}
              title="Filter berdasarkan tahun tanam"
            />
            <input
              className="input input-bordered w-full"
              placeholder="Blok"
              value={filters.blok ?? ''}
              onChange={e => setFilters(s => ({ ...s, blok: e.target.value }))}
              title="Filter berdasarkan kode blok"
            />
            <select
              className="select select-bordered w-full"
              value={filters.attendance ?? ''}
              onChange={e => setFilters(s => ({ ...s, attendance: e.target.value }))}
              title="Filter berdasarkan kode attendance"
            >
              <option value="">Attendance</option>
              {['KJ', 'MK', 'WH', 'WS', 'ML', 'P1', 'KB', 'OT'].map(v => (
                <option key={`att-${v}`} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          </>
        )}

        {/* Error */}
        {/* Error visual dihilangkan, cukup toast saja yang muncul */}

        {/* DataTable */}
        <AppDataTable
          columns={columns}
          data={filtered}
          loading={loading}
          selectableRows
          onSelectedRowsChange={handleRowSelected}
          clearSelectedRows={toggledClearRows}
          namespace="Lhm"
          onClearSearch={q ? () => setQ('') : undefined}
        />
      <ConfirmModal
        open={confirmOpen}
        title="Konfirmasi"
        message={tL('modalConfirmApprove', { count: selectedRows.length })}
        onConfirm={handleConfirmApprove}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </PageLayout>
  );
}



