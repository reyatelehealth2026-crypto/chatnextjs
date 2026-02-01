type LinePushMessageBody =
  | {
    to: string
    messages: Array<{ type: 'text'; text: string }>
  }

/**
 * Minimal LINE Messaging API client (text push only).
 * If credentials are missing, we no-op to keep local dev usable.
 */
export async function sendLineTextMessage(params: {
  channelAccessToken?: string
  to: string
  text: string
}) {
  const token = params.channelAccessToken ?? process.env.LINE_ACCESS_TOKEN
  if (!token) {
    return { ok: true as const, skipped: true as const }
  }

  const body: LinePushMessageBody = {
    to: params.to,
    messages: [{ type: 'text', text: params.text }],
  }

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`LINE push failed: ${res.status} ${detail}`)
  }

  return { ok: true as const, skipped: false as const }
}

export async function getLineProfile(userId: string, channelAccessToken: string) {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  })

  if (!res.ok) return null

  const j = await res.json()
  return {
    displayName: j.displayName as string,
    pictureUrl: j.pictureUrl as string | null,
    statusMessage: j.statusMessage as string | null,
  }
}

