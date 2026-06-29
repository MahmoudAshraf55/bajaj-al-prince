import * as XLSX from 'xlsx';

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function exportMultiSheet(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
