function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))
  return [header, ...lines].join('\n')
}
