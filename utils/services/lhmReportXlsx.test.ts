import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildLhmExportFileName,
  buildLhmReportSheet,
  mapLhmRowToExcelCells,
  LHM_EXCEL_COLUMN_COUNT,
} from './lhmReportXlsx';

const baseRow = {
  _rowNo: 1,
  employeecode: '00123',
  nama: 'Budi',
  attendance: 'KJ',
  hk: '1',
  blok: 'A1',
  tahuntanam: '2019',
  jjg: '100',
  brd: '5',
  ha: '1.5',
  mentahqty: '2',
  mentahrp: '1000',
  emptybunchqty: '1',
  emptybunchrp: '500',
  jumlahdenda: 200,
  totalalljjg: '97',
  basis: '80',
  rpbasis: '80000',
  premilv1: '10',
  rate1: '100',
  rplv1: '1000',
  premilv2: '5',
  rate2: '200',
  rplv2: '1000',
  premilv3: '2',
  rate3: '300',
  rplv3: '600',
  totalrppremi: '2600',
  rphk: '80000',
  kurangbasis: '0',
  brd_rp: '2500',
  total: '85100',
  keterangan: '',
};

describe('lhmReportXlsx', () => {
  it('maps one row to 36 excel cells with numeric values', () => {
    const cells = mapLhmRowToExcelCells(baseRow);
    expect(cells).toHaveLength(LHM_EXCEL_COLUMN_COUNT);
    expect(cells[0]).toBe(1);
    expect(cells[1]).toBe('00123');
    expect(cells[7]).toBe(100);
    expect(cells[16]).toBe(-200);
    expect(cells[32]).toBe(82600);
  });

  it('keeps blank _rowNo as-is instead of renumbering', () => {
    const cells = mapLhmRowToExcelCells({ ...baseRow, _rowNo: '' });
    expect(cells[0]).toBe('');
  });

  it('builds a safe file name', () => {
    expect(
      buildLhmExportFileName({
        fcba: 'FC BA',
        afdeling: 'AF/1',
        kemandoran: 'K1',
        tanggal: '2024-01-02',
      })
    ).toBe('LHM_FC-BA_AF-1_K1_2024-01-02.xlsx');
  });

  it('builds header merges and totals on a real worksheet', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('LHM');
    const { headerRow, firstDataRow } = buildLhmReportSheet(ws, {
      data: [baseRow],
      lhaData: [],
      mainTotals: { jjg: 100, ha: 12.6, total: 85100 },
      lhaTotals: {},
      meta: {
        fcba: 'FCBA',
        afdeling: 'AFD',
        tanggal: '2024-01-02',
        kemandoran: 'K1',
        mandorPanen: 'MP',
        keraniPanen: 'KP',
        keraniTransport: 'KT',
        mandor1: 'M1',
        asistenAfdeling: 'AA',
      },
    });
    expect(ws.getCell(headerRow, 1).value).toBe('No');
    expect(ws.getCell(headerRow, 8).value).toBe('Hasil Kerja');
    expect(ws.getCell(headerRow + 3, 1).value).toBe('(1)');
    expect(ws.getCell(firstDataRow, 2).value).toBe('00123');
    expect(ws.getCell(firstDataRow + 1, 1).value).toBe('Total');
    expect(ws.getCell(firstDataRow + 1, 10).value).toBe(13);
    const footerRow = firstDataRow + 7;
    expect(ws.getCell(footerRow, 1).value).toBe('Catatan:');
    expect(String(ws.getCell(footerRow, 13).value)).toContain('PREMI KERANI PANEN');
    expect(ws.getCell(footerRow, 25).value).toBe('Dibuat,');
    expect(ws.getCell(footerRow, 29).value).toBe('Verifikasi,');
    expect(ws.getCell(footerRow, 33).value).toBe('Disetujui,');
    const buf = await wb.xlsx.writeBuffer();
    expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(1000);
  });
});
