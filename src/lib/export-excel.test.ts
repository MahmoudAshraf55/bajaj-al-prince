import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel, exportMultiSheet } from '@/lib/export-excel';

describe('exportToExcel', () => {
  it('produces a valid xlsx buffer', () => {
    const data = [{ name: 'Product A', price: 100 }, { name: 'Product B', price: 200 }];
    const buffer = exportToExcel(data, 'products.xlsx');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('contains the correct data in the sheet', () => {
    const data = [{ name: 'Product A', price: 100 }];
    const buffer = exportToExcel(data, 'test.xlsx', 'Products');

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Products');

    const sheet = wb.Sheets['Products'];
    const rows = XLSX.utils.sheet_to_json(sheet);
    expect(rows).toEqual([{ name: 'Product A', price: 100 }]);
  });

  it('uses default sheet name Sheet1', () => {
    const data = [{ id: 1 }];
    const buffer = exportToExcel(data, 'test.xlsx');

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Sheet1');
  });

  it('handles empty data array', () => {
    const buffer = exportToExcel([], 'empty.xlsx');
    expect(buffer.byteLength).toBeGreaterThan(0);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets['Sheet1'];
    const rows = XLSX.utils.sheet_to_json(sheet);
    expect(rows).toEqual([]);
  });
});

describe('exportMultiSheet', () => {
  it('creates workbook with multiple sheets', () => {
    const sheets = [
      { name: 'Products', data: [{ name: 'A', price: 10 }] },
      { name: 'Orders', data: [{ id: 1, total: 50 }] },
    ];
    const buffer = exportMultiSheet(sheets);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Products', 'Orders']);
  });

  it('each sheet contains correct data', () => {
    const sheets = [
      { name: 'Sheet1', data: [{ x: 1 }] },
      { name: 'Sheet2', data: [{ y: 2 }] },
    ];
    const buffer = exportMultiSheet(sheets);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'])).toEqual([{ x: 1 }]);
    expect(XLSX.utils.sheet_to_json(wb.Sheets['Sheet2'])).toEqual([{ y: 2 }]);
  });

  it('throws on empty sheets array', () => {
    expect(() => exportMultiSheet([])).toThrow();
  });
});
