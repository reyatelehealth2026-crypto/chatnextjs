export function sanitizeText(input: unknown, opts?: { maxLen?: number }) {
  const maxLen = opts?.maxLen ?? 5000
  if (typeof input !== 'string') return ''
  const s = input.replace(/\u0000/g, '').trim()
  if (s.length > maxLen) return s.slice(0, maxLen)
  return s
}

