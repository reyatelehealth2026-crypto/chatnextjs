export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init: RequestInit & { retries?: number; baseDelayMs?: number } = {}
) {
  const retries = init.retries ?? 3
  const baseDelay = init.baseDelayMs ?? 300

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init)
      if (!res.ok && attempt < retries && res.status >= 500) {
        const delay = baseDelay * 2 ** attempt
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return res
    } catch (err) {
      if (attempt >= retries) throw err
      const delay = baseDelay * 2 ** attempt
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw new Error('fetchWithBackoff failed')
}

