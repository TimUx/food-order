/** Escaped Zellwert für CSV (Semikolon-getrennt, Excel-kompatibel). */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(';');
}
