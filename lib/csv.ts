const CSV_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t'] as const

export function sanitizeCsvCell(value: unknown) {
  const s = String(value ?? '')
  const trimmed = s.replace(/\u0000/g, '')
  const first = trimmed[0] ?? ''
  if ((CSV_INJECTION_PREFIXES as readonly string[]).includes(first)) {
    return `'${trimmed}`
  }
  return trimmed
}

export function csvEscape(value: unknown) {
  const s = sanitizeCsvCell(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

