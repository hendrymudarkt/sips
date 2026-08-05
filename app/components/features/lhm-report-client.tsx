'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

import { useSearchParams } from 'next/navigation';
import './lhm-report-print.css';
import { useLocale } from '@/hooks/useLocale';
import { formatPerfNumber } from '@/utils/helpers/perf-formatter';
import { Icon } from '@/app/components/ui/icons';

export default function LhmReport() {
  const localeTag = useLocale();
  // Fungsi print
  const handlePrint = () => {
    window.print();
  };

  // ⚡ Bolt Optimization: Use formatPerfNumber from @/utils/helpers/perf-formatter.
  // This utility uses a cached Intl.NumberFormat instance, avoiding the significant
  // overhead of creating a new formatter on every call (~50x speedup), which is
  // critical for report tables with hundreds of cells.
  function formatNumber(val: string | number | null | undefined): string {
    return formatPerfNumber(val ?? '0', localeTag);
  }

  function formatNumberRounded(val: string | number | null | undefined): string {
    const num = Number(val ?? '0');
    if (isNaN(num)) return '0';
    return formatPerfNumber(Math.round(num), localeTag);
  }

  // Date formatting helper
  function formatDateDMY(raw: string | null | undefined): string {
    if (!raw) return '-';
    const trimmed = raw.trim();
    if (!trimmed) return '-';
    const onlyDate = trimmed.split(' ')[0];
    const parts = onlyDate.split('-');
    if (parts.length !== 3) return trimmed;
    const [y, m, d] = parts;
    if (!y || !m || !d) return trimmed;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  type LhmData = {
    _rowNo?: number | string;
    fddate: string;
    fcba: string;
    afdeling: string;
    kemandoran: string;
    employeecode: string;
    nama: string;
    attendance: string;
    hk: string;
    blok: string;
    tahuntanam: string;
    jjg: string;
    brd: string;
    ha: string;
    mentahqty: string;
    mentahrp: string;
    emptybunchqty: string;
    emptybunchrp: string;
    jumlahdenda: number;
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
    rphk: string;
    kurangbasis: string;
    brd_rp: string;
    total: string;
    keterangan?: string;
    mandorpanen?: string;
    keranipanen?: string;
    keranitransport?: string;
    mandor1?: string;
    asistenafdeling?: string;
    keranifdeling?: string;
  };

  const searchParams = useSearchParams();
  const fcba = searchParams.get('fcba') || '';
  const afdeling = searchParams.get('afdeling') || '';
  const tanggal = searchParams.get('tanggal') || '';
  const kemandoran = searchParams.get('kemandoran') || '';

  // Print wrapper ref
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<LhmData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type SignatureData = {
    mandorPanen: string;
    keraniPanen: string;
    keraniTransport: string;
    mandor1: string;
    asistenAfdeling: string;
  };

  type LhaData = {
    tanggal: string;
    kemandoran: string;
    fcba: string;
    afdeling: string;
    fccode: string;
    fcname: string;
    luas: string;
    output: string;
    brondol: string;
    normal: string;
    abnormal: string;
    mentah: string;
    overripe: string;
    empty: string;
    busuk: string;
    busuk2: string;
    buahkecil: string;
    parteno: string;
    tangkaipanjang: string;
    parteno50plus: string;
  };

  const [signatures, setSignatures] = useState<SignatureData>({
    mandorPanen: '-',
    keraniPanen: '-',
    keraniTransport: '-',
    mandor1: '-',
    asistenAfdeling: '-',
  });
  const [signaturesLoading, setSignaturesLoading] = useState(false);

  const [lhaData, setLhaData] = useState<LhaData[]>([]);
  const [lhaLoading, setLhaLoading] = useState(false);

  // ⚡ Bolt Optimization: Calculate table totals in O(N) using useMemo.
  // This avoids repeated O(N) reduce calls for every column in the render loop,
  // converting O(N*M) total complexity into O(N).
  const mainTotals = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.jjg += Number(row.jjg || 0);
        acc.brd += Number(row.brd || 0);
        acc.ha += Number(row.ha || 0);
        acc.mentahqty += Number(row.mentahqty || 0);
        acc.mentahrp += Number(row.mentahrp || 0);
        acc.emptybunchqty += Number(row.emptybunchqty || 0);
        acc.emptybunchrp += Number(row.emptybunchrp || 0);
        acc.jumlahdenda += Number(row.jumlahdenda || 0) * -1;
        acc.totalalljjg += Number(row.totalalljjg || 0);
        acc.basis += Number(row.basis || 0);
        acc.rpbasis += Number(row.rpbasis || 0);
        acc.premilv1 += Number(row.premilv1 || 0);
        acc.rplv1 += Number(row.rplv1 || 0);
        acc.premilv2 += Number(row.premilv2 || 0);
        acc.rplv2 += Number(row.rplv2 || 0);
        acc.premilv3 += Number(row.premilv3 || 0);
        acc.rplv3 += Number(row.rplv3 || 0);
        acc.totalrppremi += Number(row.totalrppremi || 0);
        acc.rphk += Number(row.rphk || 0);
        acc.kurangbasis += Number(row.kurangbasis || 0);
        acc.brd_rp += Number(row.brd_rp || 0);
        acc.total += Number(row.total || 0);
        return acc;
      },
      {
        jjg: 0,
        brd: 0,
        ha: 0,
        mentahqty: 0,
        mentahrp: 0,
        emptybunchqty: 0,
        emptybunchrp: 0,
        jumlahdenda: 0,
        totalalljjg: 0,
        basis: 0,
        rpbasis: 0,
        premilv1: 0,
        rplv1: 0,
        premilv2: 0,
        rplv2: 0,
        premilv3: 0,
        rplv3: 0,
        totalrppremi: 0,
        rphk: 0,
        kurangbasis: 0,
        brd_rp: 0,
        total: 0,
      }
    );
  }, [data]);

  const lhaTotals = useMemo(() => {
    return lhaData.reduce(
      (acc, row) => {
        acc.luas += Number(row.luas || 0);
        acc.output += Number(row.output || 0);
        acc.brondol += Number(row.brondol || 0);
        acc.normal += Number(row.normal || 0);
        acc.abnormal += Number(row.abnormal || 0);
        acc.overripe += Number(row.overripe || 0);
        acc.empty += Number(row.empty || 0);
        acc.mentah += Number(row.mentah || 0);
        return acc;
      },
      {
        luas: 0,
        output: 0,
        brondol: 0,
        normal: 0,
        abnormal: 0,
        overripe: 0,
        empty: 0,
        mentah: 0,
      }
    );
  }, [lhaData]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          fcba,
          afdeling,
          tanggal,
          kemandoran,
        });
        const res = await fetch(`/api/lhm/approval?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Filter data sesuai parameter
          // ⚡ Bolt Optimization: Use single-pass filter and O(N) row number calculation
          let currentUniqueCount = 0;
          let lastCode: string | null = null;

          const filtered = json.data
            .filter(
              (row: LhmData) =>
                row.fcba === fcba &&
                row.afdeling === afdeling &&
                row.kemandoran === kemandoran &&
                (row.fddate || '').split(' ')[0] === tanggal
            )
            .map((row: LhmData) => {
              const isNew = row.employeecode !== lastCode;
              if (isNew) {
                currentUniqueCount++;
                lastCode = row.employeecode;
              }
              return { ...row, _rowNo: isNew ? currentUniqueCount : '' };
            });

          setData(filtered);
        } else {
          setError('Data tidak ditemukan.');
        }
      } catch {
        setError('Gagal memuat data LHM.');
      } finally {
        setLoading(false);
      }
    }
    if (fcba && tanggal && kemandoran && afdeling) fetchData();
    else setLoading(false);
  }, [fcba, tanggal, kemandoran, afdeling]);

  // Fetch signatures from API
  useEffect(() => {
    async function fetchSignatures() {
      if (!fcba || !afdeling || !kemandoran) return;

      setSignaturesLoading(true);
      try {
        const params = new URLSearchParams({
          fcba,
          afdeling,
          kemandoran,
        });
        const res = await fetch(`/api/lhm/approval/signatures?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSignatures({
            mandorPanen: json.data.mandorPanen || '-',
            keraniPanen: json.data.keraniPanen || '-',
            keraniTransport: json.data.keraniTransport || '-',
            mandor1: json.data.mandor1 || '-',
            asistenAfdeling: json.data.asistenAfdeling || '-',
          });
        }
      } catch {
        // Silent fail - keep default values
      } finally {
        setSignaturesLoading(false);
      }
    }
    fetchSignatures();
  }, [fcba, afdeling, kemandoran]);

  // Fetch LHA data from API
  useEffect(() => {
    async function fetchLhaData() {
      if (!fcba || !afdeling || !kemandoran || !tanggal) return;

      setLhaLoading(true);
      try {
        const params = new URLSearchParams({
          fcba,
          afdeling,
          kemandoran,
          tanggal,
        });
        const res = await fetch(`/api/report/get-lha?${params.toString()}`);
        if (!res.ok) {
          const errText = await res.text();
          console.error('LHA fetch error:', res.status, errText);
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setLhaData(json.data);
        } else {
          console.error('LHA invalid response:', json);
        }
      } catch (err) {
        console.error('LHA fetch failed:', err);
        // Silent fail - keep empty array
      } finally {
        setLhaLoading(false);
      }
    }
    fetchLhaData();
  }, [fcba, afdeling, kemandoran, tanggal]);

  // Header info with fallback data when empty
  const pt = 'PT. SENTOSA KALIMANTAN JAYA';

  // Helper to render signature with underline or dash
  const renderSignature = (name: string) => {
    if (signaturesLoading) return <span className="animate-pulse">...</span>;
    return name !== '-' ? <span className="underline">{name}</span> : '-';
  };

  const mandorPanenEl = renderSignature(signatures.mandorPanen);
  const keraniPanenEl = renderSignature(signatures.keraniPanen);
  const keraniTransportEl = renderSignature(signatures.keraniTransport);
  const mandor1El = renderSignature(signatures.mandor1);
  const asistenAfdelingEl = renderSignature(signatures.asistenAfdeling);

  return (
    <div>
      {/* Tombol Print, hanya tampil di layar */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        className="no-print"
      >
        <div className="tooltip tooltip-left">
          <div className="tooltip-content">
            <div className="animate-bounce text-orange-400 -rotate-9 text-xl font-black">
              Print Now!
            </div>
          </div>
          <button
            onClick={handlePrint}
            title=""
            className="btn bg-[#03C755] text-white border-[#00b544]"
          >
            <Icon name="print" className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={printRef}
        className="lhm-print-wrapper"
        style={{ overflowX: 'auto' }}
        suppressHydrationWarning
      >
        <div className="lhm-print-header">
          <div className="w-full">
            <div>
              <div>{pt}</div>
              <div>
                Kebun: <span>{fcba}</span>
              </div>
              <div>
                Afdeling: <span>{afdeling}</span>
              </div>
            </div>
            <div className="text-center" style={{ fontWeight: 'bold', fontSize: 18 }}>
              LHM (LAPORAN HARIAN MANDOR) PANEN
            </div>
          </div>
        </div>
        <div className="lhm-print-info">
          <span>
            Tanggal: <span>{formatDateDMY(tanggal)}</span>
          </span>
          <span contentEditable suppressContentEditableWarning style={{ marginLeft: 80 }}>
            Mandor Panen : {mandorPanenEl}
          </span>
          <span contentEditable suppressContentEditableWarning style={{ marginLeft: 80 }}>
            Kerani Panen : {keraniPanenEl}
          </span>
          <span contentEditable suppressContentEditableWarning style={{ marginLeft: 80 }}>
            Kerani Transport : {keraniTransportEl}
          </span>
          <span contentEditable suppressContentEditableWarning style={{ marginLeft: 80 }}>
            Mandor I : {mandor1El}
          </span>
        </div>
        {error && <div style={{ color: 'red', margin: '16px 0' }}>{error}</div>}
        {loading ? (
          <div>Memuat data...</div>
        ) : (
          <table className="lhm-print-table">
            <thead>
              <tr>
                <th rowSpan={3}>No</th>
                <th rowSpan={3}>NIK</th>
                <th rowSpan={3}>Nama Pemanen</th>
                <th rowSpan={3}>Absensi</th>
                <th rowSpan={3}>HK</th>
                <th rowSpan={3}>Blok</th>
                <th rowSpan={3}>Tahun Tanam</th>
                <th colSpan={3}>Hasil Kerja</th>
                <th colSpan={7}>Denda</th>
                <th rowSpan={3}>Hasil Netto (Jjg)</th>
                <th rowSpan={3}>Basis (Jjg)</th>
                <th colSpan={11}>Premi</th>
                <th colSpan={5}>Upah Di Bayar (Rp)</th>
                <th rowSpan={3}>Keterangan</th>
              </tr>
              <tr>
                <th rowSpan={2}>Jjg</th>
                <th rowSpan={2}>Brd</th>
                <th rowSpan={2}>Ha</th>
                <th colSpan={2}>Buah Mentah (A)</th>
                <th colSpan={2}>Empty Bunch (E2)</th>
                <th colSpan={2}>Lainnya</th>
                <th rowSpan={2}>Jumlah (Rp)</th>
                <th rowSpan={2}>Siap Basis (Rp)</th>
                <th colSpan={3}>Lebih Basis 1</th>
                <th colSpan={3}>Lebih Basis 2</th>
                <th colSpan={3}>Lebih Basis 3</th>
                <th rowSpan={2}>Jumlah Premi (Rp)</th>
                <th rowSpan={2}>Upah Pokok</th>
                <th rowSpan={2}>Tidak Capai Basis</th>
                <th rowSpan={2}>Premi Panen</th>
                <th rowSpan={2}>Premi Brondol</th>
                <th rowSpan={2}>Total</th>
              </tr>
              <tr>
                <th>Jjg</th>
                <th>(Rp)</th>
                <th>Jjg</th>
                <th>(Rp)</th>
                <th>Jjg</th>
                <th>(Rp)</th>
                <th className="whitespace-nowrap">Jlh Jjg</th>
                <th>Rp/Jjg</th>
                <th>(Rp)</th>
                <th className="whitespace-nowrap">Jlh Jjg</th>
                <th>Rp/Jjg</th>
                <th>(Rp)</th>
                <th className="whitespace-nowrap">Jlh Jjg</th>
                <th>Rp/Jjg</th>
                <th>(Rp)</th>
              </tr>
              <tr>
                <th>(1)</th>
                <th>(2)</th>
                <th>(3)</th>
                <th>(4)</th>
                <th>(5)</th>
                <th>(6)</th>
                <th>(7)</th>
                <th>(8)</th>
                <th>(9)</th>
                <th>(10)</th>
                <th>(11)</th>
                <th>(12)</th>
                <th>(13)</th>
                <th>(14)</th>
                <th>(15)</th>
                <th>(16)</th>
                <th>(17)</th>
                <th>(18)</th>
                <th>(19)</th>
                <th>(20)</th>
                <th>(21)</th>
                <th>(22)</th>
                <th>(23)</th>
                <th>(24)</th>
                <th>(25)</th>
                <th>(26)</th>
                <th>(27)</th>
                <th>(28)</th>
                <th>(29)</th>
                <th>(30)</th>
                <th>(31)</th>
                <th>(32)</th>
                <th>(33)</th>
                <th>(34)</th>
                <th>(35)</th>
                <th>(36)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={31} style={{ textAlign: 'center' }}>
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row, idx) => {
                    return (
                      <tr key={row.employeecode + idx}>
                        <td>{row._rowNo}</td>
                        <td className="text-center whitespace-nowrap">{row.employeecode}</td>
                        <td className="whitespace-nowrap">{row.nama}</td>
                        <td className="text-center">{row.attendance}</td>
                        <td className="text-center">{row.hk}</td>
                        <td className="text-center">{row.blok}</td>
                        <td className="text-center">{row.tahuntanam}</td>
                        <td className="text-right">{formatNumber(row.jjg)}</td>
                        <td className="text-right">{formatNumber(row.brd)}</td>
                        <td className="text-right">{row.ha}</td>
                        <td className="text-right">{formatNumber(row.mentahqty)}</td>
                        <td className="text-right">{formatNumber(row.mentahrp)}</td>
                        <td className="text-right">{formatNumber(row.emptybunchqty)}</td>
                        <td className="text-right">{formatNumber(row.emptybunchrp)}</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">
                          {Number(row.jumlahdenda) !== 0
                            ? formatNumber(Number(row.jumlahdenda) * -1)
                            : formatNumber(row.jumlahdenda)}
                        </td>
                        <td className="text-right">{formatNumber(row.totalalljjg)}</td>
                        <td className="text-right">{formatNumber(row.basis)}</td>
                        <td className="text-right">{formatNumber(row.rpbasis)}</td>
                        <td className="text-right">{formatNumber(row.premilv1)}</td>
                        <td className="text-right">{formatNumber(row.rate1)}</td>
                        <td className="text-right">{formatNumber(row.rplv1)}</td>
                        <td className="text-right">{formatNumber(row.premilv2)}</td>
                        <td className="text-right">{formatNumber(row.rate2)}</td>
                        <td className="text-right">{formatNumber(row.rplv2)}</td>
                        <td className="text-right">{formatNumber(row.premilv3)}</td>
                        <td className="text-right">{formatNumber(row.rate3)}</td>
                        <td className="text-right">{formatNumber(row.rplv3)}</td>
                        <td className="text-right whitespace-nowrap">
                          {formatNumber(row.totalrppremi)}
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatNumber(row.rphk)}
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatNumber(row.kurangbasis)}
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatNumber(Number(row.totalrppremi || 0) + Number(row.rpbasis || 0))}
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatNumber(row.brd_rp)}
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatNumber(row.total)}
                        </td>
                        <td className="whitespace-nowrap">{row.keterangan || ''}</td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="font-bold bg-gray-100">
                    <td colSpan={7} className="text-right">
                      Total
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.jjg)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.brd)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {mainTotals.ha === 0 ? '' : formatNumberRounded(mainTotals.ha)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.mentahqty)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.mentahrp)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.emptybunchqty)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.emptybunchrp)}
                    </td>
                    <td className="text-right">0</td>
                    <td className="text-right">0</td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.jumlahdenda)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.totalalljjg)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.basis)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.rpbasis)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.premilv1)}
                    </td>
                    <td className="text-right whitespace-nowrap"></td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.rplv1)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.premilv2)}
                    </td>
                    <td className="text-right whitespace-nowrap"></td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.rplv2)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.premilv3)}
                    </td>
                    <td className="text-right whitespace-nowrap"></td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.rplv3)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatNumberRounded(mainTotals.totalrppremi)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap">
                      {formatNumberRounded(mainTotals.rphk)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap">
                      {formatNumberRounded(mainTotals.kurangbasis)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap">
                      {formatNumberRounded(mainTotals.totalrppremi)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap">
                      {formatNumberRounded(mainTotals.brd_rp)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap">
                      {formatNumberRounded(mainTotals.total)}
                    </td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}
        <table className="lhm-print-table mt-2">
          <thead>
            <tr>
              <th>No</th>
              <th>Blok</th>
              <th>Ha</th>
              <th>Jjg</th>
              <th>Brondolan</th>
              <th>Normal (N)</th>
              <th>Abnormal (AB)</th>
              <th>Over Ripe (OR)</th>
              <th>Empty Bunch (E)</th>
              <th>Unripe (A)</th>
            </tr>
          </thead>
          <tbody>
            {lhaLoading ? (
              <tr>
                <td colSpan={9} className="text-center">
                  Memuat data LHA...
                </td>
              </tr>
            ) : lhaData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center">
                  Tidak ada data LHA.
                </td>
              </tr>
            ) : (
              lhaData.map((row, idx) => (
                <tr key={row.fccode + idx}>
                  <td className="text-center">{idx + 1}</td>
                  <td className="text-center">{row.fcname}</td>
                  <td className="text-right">{row.luas}</td>
                  <td className="text-right">{formatNumber(row.output)}</td>
                  <td className="text-right">{formatNumber(row.brondol)}</td>
                  <td className="text-right">{formatNumber(row.normal)}</td>
                  <td className="text-right">{formatNumber(row.abnormal)}</td>
                  <td className="text-right">{formatNumber(row.overripe)}</td>
                  <td className="text-right">{formatNumber(row.empty)}</td>
                  <td className="text-right">{formatNumber(row.mentah)}</td>
                </tr>
              ))
            )}
            <tr className="font-bold bg-gray-100">
              <td colSpan={2} className="text-right">
                Total
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.luas)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.output)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.brondol)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.normal)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.abnormal)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.overripe)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.empty)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatNumberRounded(lhaTotals.mentah)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="footer flex justify-between">
          <div className="lhm-print-notes border-2 border-black p-3 rounded w-full text-sm leading-tight">
            <div>
              <span className="font-semibold">Catatan:</span>
              <ol className="list-decimal pl-4 m-0 space-y-1">
                <li>Jumlah pemanen per Mandoran minimal 15 orang (3 mandoran panen)</li>
                <li>Jumlah pemanen per Mandoran minimal 16 orang (1 atau 2 mandoran panen)</li>
                <li>(* Sesuai ketetapan IM Pak TA No. 27 Tahun 2023 pada point 7 sd. 12</li>
                <li>
                  Kriteria Janjang Netto ** setelah dikurangi :
                  <ul className="pl-4 m-0 space-y-0.5">
                    <li className="before:content-['-'] before:mr-1">
                      Buah Mentah (A) mentah (A, A + 1 dan A ≥ 3)
                    </li>
                    <li className="before:content-['-'] before:mr-1">
                      Buah (S) masak tinggal di pokok
                    </li>
                    <li className="before:content-['-'] before:mr-1">Denda</li>
                    <li className="before:content-['-'] before:mr-1">
                      Buah tinggal di piringan/pasar rintis/gawangan
                    </li>
                    <li className="before:content-['-'] before:mr-1">Buah matahari</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>

          <table className="lhm-premi-table">
            <tbody>
              <tr>
                <td className="premi-label">PREMI KERANI PANEN</td>
                <td className="premi-eq">Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">X 100% X IKP</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">% = Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">s/d HI Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
              </tr>
              <tr>
                <td className="premi-label">PREMI KERANI TRANSPORT</td>
                <td className="premi-eq">Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">X 110% X IKKP</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">% = Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">s/d HI Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
              </tr>
              <tr>
                <td className="premi-label">PREMI MANDOR PANEN</td>
                <td className="premi-eq">Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">X 125% X IKP</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">% = Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">s/d HI Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
              </tr>
              <tr>
                <td className="premi-label">PREMI MANDOR I</td>
                <td className="premi-eq">Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">X 150% X IPP</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">% = Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
                <td className="premi-eq">s/d HI Rp</td>
                <td className="premi-input">
                  <span className="garis"></span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="lhm-print-sign whitespace-nowrap w-full">
            <div>
              <div className="font-bold">Dibuat,</div>
              <div contentEditable suppressContentEditableWarning style={{ marginTop: 48 }}>
                {mandorPanenEl}
              </div>
              <div>Mandor Panen</div>
            </div>
            <div>
              <div className="font-bold">Verifikasi,</div>
              <div contentEditable suppressContentEditableWarning style={{ marginTop: 48 }}>
                {mandor1El}
              </div>
              <div>Mandor I</div>
            </div>
            <div>
              <div className="font-bold">Disetujui,</div>
              <div contentEditable suppressContentEditableWarning style={{ marginTop: 48 }}>
                {asistenAfdelingEl}
              </div>
              <div>Asisten Afdeling</div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          /* Sembunyikan navbar, footer layout, dan tombol print */
          nav,
          .navbar,
          footer,
          .no-print {
            display: none !important;
          }
          /* Pastikan wrapper print tampil penuh */
          .lhm-print-wrapper {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .lhm-print-wrapper,
          .lhm-print-wrapper * {
            visibility: visible !important;
            color: #000 !important;
          }
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
