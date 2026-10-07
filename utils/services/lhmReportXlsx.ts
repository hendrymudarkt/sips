export type LhmReportExcelRow = {
  _rowNo?: number | string;
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
  jumlahdenda: number | string;
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
};

export type LhaReportExcelRow = {
  fcname: string;
  luas: string;
  output: string;
  brondol: string;
  normal: string;
  abnormal: string;
  overripe: string;
  empty: string;
  mentah: string;
};

export type LhmReportExcelMeta = {
  fcba: string;
  afdeling: string;
  tanggal: string;
  kemandoran: string;
  mandorPanen: string;
  keraniPanen: string;
  keraniTransport: string;
  mandor1: string;
  asistenAfdeling: string;
};

export type LhmReportExcelTotals = Record<string, number>;

export const LHM_EXCEL_COLUMN_COUNT = 36;

const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFEEEEEE' },
};
const TOTAL_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFF2F2F2' },
};
const THIN_BORDER = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

const COLUMN_WIDTHS = [
  5, 14, 22, 8, 6, 8, 10, 9, 9, 8, 9, 11, 9, 11, 7, 7, 11, 11, 9, 11, 9, 9, 11, 9, 9, 11, 9, 9, 11,
  12, 12, 12, 12, 12, 12, 16,
];

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return isNaN(n) ? 0 : n;
}

export function buildLhmExportFileName(
  meta: Pick<LhmReportExcelMeta, 'fcba' | 'afdeling' | 'kemandoran' | 'tanggal'>
): string {
  const safe = (s: string) => (s || '-').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `LHM_${safe(meta.fcba)}_${safe(meta.afdeling)}_${safe(meta.kemandoran)}_${safe(meta.tanggal)}.xlsx`;
}

export function mapLhmRowToExcelCells(row: LhmReportExcelRow): (string | number)[] {
  return [
    row._rowNo ?? '',
    row.employeecode ?? '',
    row.nama ?? '',
    row.attendance ?? '',
    row.hk ?? '',
    row.blok ?? '',
    row.tahuntanam ?? '',
    toNum(row.jjg),
    toNum(row.brd),
    toNum(row.ha),
    toNum(row.mentahqty),
    toNum(row.mentahrp),
    toNum(row.emptybunchqty),
    toNum(row.emptybunchrp),
    '-',
    '-',
    toNum(row.jumlahdenda) * -1,
    toNum(row.totalalljjg),
    toNum(row.basis),
    toNum(row.rpbasis),
    toNum(row.premilv1),
    toNum(row.rate1),
    toNum(row.rplv1),
    toNum(row.premilv2),
    toNum(row.rate2),
    toNum(row.rplv2),
    toNum(row.premilv3),
    toNum(row.rate3),
    toNum(row.rplv3),
    toNum(row.totalrppremi),
    toNum(row.rphk),
    toNum(row.kurangbasis),
    toNum(row.totalrppremi) + toNum(row.rpbasis),
    toNum(row.brd_rp),
    toNum(row.total),
    row.keterangan ?? '',
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Worksheet = any;

function styleRange(
  ws: Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  bold = false,
  fill?: typeof HEADER_FILL
) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      if (bold) cell.font = { bold: true, size: 10 };
      if (fill) cell.fill = fill;
    }
  }
}

function setMerged(
  ws: Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  value: string,
  bold = false
) {
  ws.mergeCells(r1, c1, r2, c2);
  const cell = ws.getCell(r1, c1);
  cell.value = value;
  styleRange(ws, r1, c1, r2, c2, bold, HEADER_FILL);
}

export function buildLhmReportSheet(
  ws: Worksheet,
  input: {
    data: LhmReportExcelRow[];
    lhaData: LhaReportExcelRow[];
    mainTotals: LhmReportExcelTotals;
    lhaTotals: LhmReportExcelTotals;
    meta: LhmReportExcelMeta;
  }
): { headerRow: number; firstDataRow: number } {
  const { data, lhaData, mainTotals, lhaTotals, meta } = input;
  const N = LHM_EXCEL_COLUMN_COUNT;
  COLUMN_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let r = 1;
  ws.mergeCells(r, 1, r, N);
  ws.getCell(r, 1).value = 'PT. SENTOSA KALIMANTAN JAYA';
  ws.getCell(r, 1).font = { bold: true, size: 12 };
  ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' };
  r += 1;
  ws.mergeCells(r, 1, r, N);
  ws.getCell(r, 1).value = `Kebun: ${meta.fcba || '-'}`;
  r += 1;
  ws.mergeCells(r, 1, r, N);
  ws.getCell(r, 1).value = `Afdeling: ${meta.afdeling || '-'}`;
  r += 1;
  ws.mergeCells(r, 1, r, N);
  ws.getCell(r, 1).value = 'LHM (LAPORAN HARIAN MANDOR) PANEN';
  ws.getCell(r, 1).font = { bold: true, size: 14 };
  ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  r += 1;
  ws.mergeCells(r, 1, r, N);
  ws.getCell(r, 1).value =
    `Tanggal: ${meta.tanggal || '-'}   |   Mandor Panen: ${meta.mandorPanen}   |   Kerani Panen: ${meta.keraniPanen}   |   Kerani Transport: ${meta.keraniTransport}   |   Mandor I: ${meta.mandor1}`;
  ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  r += 2;

  const hs = r;
  setMerged(ws, hs, 1, hs + 2, 1, 'No', true);
  setMerged(ws, hs, 2, hs + 2, 2, 'NIK', true);
  setMerged(ws, hs, 3, hs + 2, 3, 'Nama Pemanen', true);
  setMerged(ws, hs, 4, hs + 2, 4, 'Absensi', true);
  setMerged(ws, hs, 5, hs + 2, 5, 'HK', true);
  setMerged(ws, hs, 6, hs + 2, 6, 'Blok', true);
  setMerged(ws, hs, 7, hs + 2, 7, 'Tahun Tanam', true);
  setMerged(ws, hs, 8, hs, 10, 'Hasil Kerja', true);
  setMerged(ws, hs, 11, hs, 17, 'Denda', true);
  setMerged(ws, hs, 18, hs + 2, 18, 'Hasil Netto (Jjg)', true);
  setMerged(ws, hs, 19, hs + 2, 19, 'Basis (Jjg)', true);
  setMerged(ws, hs, 20, hs, 30, 'Premi', true);
  setMerged(ws, hs, 31, hs, 35, 'Upah Di Bayar (Rp)', true);
  setMerged(ws, hs, 36, hs + 2, 36, 'Keterangan', true);

  setMerged(ws, hs + 1, 8, hs + 2, 8, 'Jjg', true);
  setMerged(ws, hs + 1, 9, hs + 2, 9, 'Brd', true);
  setMerged(ws, hs + 1, 10, hs + 2, 10, 'Ha', true);
  setMerged(ws, hs + 1, 11, hs + 1, 12, 'Buah Mentah (A)', true);
  setMerged(ws, hs + 1, 13, hs + 1, 14, 'Empty Bunch (E2)', true);
  setMerged(ws, hs + 1, 15, hs + 1, 16, 'Lainnya', true);
  setMerged(ws, hs + 1, 17, hs + 2, 17, 'Jumlah (Rp)', true);
  setMerged(ws, hs + 1, 20, hs + 2, 20, 'Siap Basis (Rp)', true);
  setMerged(ws, hs + 1, 21, hs + 1, 23, 'Lebih Basis 1', true);
  setMerged(ws, hs + 1, 24, hs + 1, 26, 'Lebih Basis 2', true);
  setMerged(ws, hs + 1, 27, hs + 1, 29, 'Lebih Basis 3', true);
  setMerged(ws, hs + 1, 30, hs + 2, 30, 'Jumlah Premi (Rp)', true);
  setMerged(ws, hs + 1, 31, hs + 2, 31, 'Upah Pokok', true);
  setMerged(ws, hs + 1, 32, hs + 2, 32, 'Tidak Capai Basis', true);
  setMerged(ws, hs + 1, 33, hs + 2, 33, 'Premi Panen', true);
  setMerged(ws, hs + 1, 34, hs + 2, 34, 'Premi Brondol', true);
  setMerged(ws, hs + 1, 35, hs + 2, 35, 'Total', true);

  const h3: Record<number, string> = {
    11: 'Jjg',
    12: '(Rp)',
    13: 'Jjg',
    14: '(Rp)',
    15: 'Jjg',
    16: '(Rp)',
    21: 'Jlh Jjg',
    22: 'Rp/Jjg',
    23: '(Rp)',
    24: 'Jlh Jjg',
    25: 'Rp/Jjg',
    26: '(Rp)',
    27: 'Jlh Jjg',
    28: 'Rp/Jjg',
    29: '(Rp)',
  };
  Object.entries(h3).forEach(([c, v]) => {
    const cell = ws.getCell(hs + 2, Number(c));
    cell.value = v;
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 10 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  r = hs + 3;
  for (let c = 1; c <= N; c++) {
    const cell = ws.getCell(r, c);
    cell.value = `(${c})`;
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 9 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  const firstDataRow = r + 1;
  r = firstDataRow;
  const NUMERIC_COLS = new Set([
    8, 9, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    35,
  ]);
  data.forEach(row => {
    const cells = mapLhmRowToExcelCells(row);
    cells.forEach((v, i) => {
      const c = i + 1;
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: NUMERIC_COLS.has(c) ? 'right' : c <= 3 ? 'left' : 'center',
        wrapText: c === 3 || c === 36,
      };
      cell.font = { size: 10 };
      if (NUMERIC_COLS.has(c)) cell.numFmt = '#,##0';
      if (c === 10) cell.numFmt = '#,##0.00';
      if (c === 2) cell.numFmt = '@';
    });
    r += 1;
  });

  ws.mergeCells(r, 1, r, 7);
  ws.getCell(r, 1).value = 'Total';
  const totalVals: (string | number)[] = [
    mainTotals.jjg ?? 0,
    mainTotals.brd ?? 0,
    mainTotals.ha ? Math.round(mainTotals.ha) : '',
    mainTotals.mentahqty ?? 0,
    mainTotals.mentahrp ?? 0,
    mainTotals.emptybunchqty ?? 0,
    mainTotals.emptybunchrp ?? 0,
    0,
    0,
    mainTotals.jumlahdenda ?? 0,
    mainTotals.totalalljjg ?? 0,
    mainTotals.basis ?? 0,
    mainTotals.rpbasis ?? 0,
    mainTotals.premilv1 ?? 0,
    0,
    mainTotals.rplv1 ?? 0,
    mainTotals.premilv2 ?? 0,
    0,
    mainTotals.rplv2 ?? 0,
    mainTotals.premilv3 ?? 0,
    0,
    mainTotals.rplv3 ?? 0,
    mainTotals.totalrppremi ?? 0,
    mainTotals.rphk ?? 0,
    mainTotals.kurangbasis ?? 0,
    mainTotals.totalrppremi ?? 0,
    mainTotals.brd_rp ?? 0,
    mainTotals.total ?? 0,
    '',
  ];
  for (let c = 1; c <= N; c++) {
    const cell = ws.getCell(r, c);
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 10 };
    cell.fill = TOTAL_FILL;
    cell.alignment = {
      vertical: 'middle',
      horizontal: c <= 7 ? 'right' : NUMERIC_COLS.has(c) ? 'right' : 'center',
    };
    if (c > 7) {
      cell.value = totalVals[c - 8];
      if (NUMERIC_COLS.has(c) || c === 10) cell.numFmt = '#,##0';
    }
  }
  r += 2;

  ws.mergeCells(r, 1, r, 10);
  ws.getCell(r, 1).value = 'LHA (Laporan Harian Afdeling)';
  ws.getCell(r, 1).font = { bold: true, size: 11 };
  r += 1;
  const lhaHeaders = [
    'No',
    'Blok',
    'Ha',
    'Jjg',
    'Brondolan',
    'Normal (N)',
    'Abnormal (AB)',
    'Over Ripe (OR)',
    'Empty Bunch (E)',
    'Unripe (A)',
  ];
  lhaHeaders.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 10 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  r += 1;
  lhaData.forEach((row, idx) => {
    const vals: (string | number)[] = [
      idx + 1,
      row.fcname,
      toNum(row.luas),
      toNum(row.output),
      toNum(row.brondol),
      toNum(row.normal),
      toNum(row.abnormal),
      toNum(row.overripe),
      toNum(row.empty),
      toNum(row.mentah),
    ];
    vals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.border = THIN_BORDER;
      cell.font = { size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: i === 1 ? 'center' : i === 0 ? 'center' : 'right',
      };
      if (i >= 2) cell.numFmt = '#,##0';
    });
    r += 1;
  });
  ws.mergeCells(r, 1, r, 2);
  ws.getCell(r, 1).value = 'Total';
  const lhaTotalsArr = [
    lhaTotals.luas ?? 0,
    lhaTotals.output ?? 0,
    lhaTotals.brondol ?? 0,
    lhaTotals.normal ?? 0,
    lhaTotals.abnormal ?? 0,
    lhaTotals.overripe ?? 0,
    lhaTotals.empty ?? 0,
    lhaTotals.mentah ?? 0,
  ];
  for (let c = 1; c <= 10; c++) {
    const cell = ws.getCell(r, c);
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 10 };
    cell.fill = TOTAL_FILL;
    cell.alignment = { vertical: 'middle', horizontal: c <= 2 ? 'right' : 'right' };
    if (c > 2) {
      cell.value = lhaTotalsArr[c - 3];
      cell.numFmt = '#,##0';
    }
  }
  r += 2;

  // Footer 3 zona berdampingan seperti layout print (flex justify-between)
  const F = r;
  const notes = [
    'Catatan:',
    '1. Jumlah pemanen per Mandoran minimal 15 orang (3 mandoran panen)',
    '2. Jumlah pemanen per Mandoran minimal 16 orang (1 atau 2 mandoran panen)',
    '3. (* Sesuai ketetapan IM Pak TA No. 27 Tahun 2023 pada point 7 sd. 12',
    '4. Kriteria Janjang Netto ** setelah dikurangi :',
    '- Buah Mentah (A) mentah (A, A + 1 dan A ≥ 3)',
    '- Buah (S) masak tinggal di pokok',
    '- Denda',
    '- Buah tinggal di piringan/pasar rintis/gawangan',
    '- Buah matahari',
  ];
  notes.forEach((n, i) => {
    ws.mergeCells(F + i, 1, F + i, 12);
    const cell = ws.getCell(F + i, 1);
    cell.value = n;
    cell.font = { bold: i === 0, size: 10 };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  const premiRows = [
    `PREMI KERANI PANEN : Rp ___ X 100% X IKP ___ % = Rp ___ s/d HI Rp ___`,
    `PREMI KERANI TRANSPORT : Rp ___ X 110% X IKKP ___ % = Rp ___ s/d HI Rp ___`,
    `PREMI MANDOR PANEN : Rp ___ X 125% X IKP ___ % = Rp ___ s/d HI Rp ___`,
    `PREMI MANDOR I : Rp ___ X 150% X IPP ___ % = Rp ___ s/d HI Rp ___`,
  ];
  premiRows.forEach((p, i) => {
    ws.mergeCells(F + i, 13, F + i, 24);
    const cell = ws.getCell(F + i, 13);
    cell.value = p;
    cell.font = { size: 10 };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  });

  const ttd = [
    { c: 25, head: 'Dibuat,', name: meta.mandorPanen, role: 'Mandor Panen' },
    { c: 29, head: 'Verifikasi,', name: meta.mandor1, role: 'Mandor I' },
    { c: 33, head: 'Disetujui,', name: meta.asistenAfdeling, role: 'Asisten Afdeling' },
  ];
  ttd.forEach(g => {
    ws.mergeCells(F, g.c, F, g.c + 3);
    ws.getCell(F, g.c).value = g.head;
    ws.getCell(F, g.c).font = { bold: true, size: 10 };
    ws.mergeCells(F + 4, g.c, F + 4, g.c + 3);
    ws.getCell(F + 4, g.c).value = g.name && g.name !== '-' ? g.name : '( ...................... )';
    ws.getCell(F + 4, g.c).alignment = { horizontal: 'center' };
    ws.mergeCells(F + 5, g.c, F + 5, g.c + 3);
    ws.getCell(F + 5, g.c).value = g.role;
    ws.getCell(F + 5, g.c).alignment = { horizontal: 'center' };
  });

  ws.views = [{ state: 'frozen', ySplit: firstDataRow - 1 }];
  ws.autoFilter = {
    from: { row: firstDataRow - 1, column: 1 },
    to: { row: firstDataRow - 1, column: N },
  };
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
  };
  ws.pageMargins = { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 };
  ws.sheetProperties = { pageSetUpPr: { fitToPage: true } };

  return { headerRow: hs, firstDataRow };
}

export async function exportLhmReportToXlsx(input: {
  data: LhmReportExcelRow[];
  lhaData: LhaReportExcelRow[];
  mainTotals: LhmReportExcelTotals;
  lhaTotals: LhmReportExcelTotals;
  meta: LhmReportExcelMeta;
}): Promise<void> {
  // ponytail: dynamic import agar exceljs tidak masuk bundle awal, diunduh saat tombol diklik
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIPS';
  const ws = wb.addWorksheet('LHM');
  buildLhmReportSheet(ws, input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', buildLhmExportFileName(input.meta));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
