type ExportJobStatus = 'PENDING' | 'READY' | 'FAILED'

type ExportJob = {
  id: string
  createdAt: number
  status: ExportJobStatus
  ownerLineAccountId: string
  ownerUserId: string
  filename: string
  csv?: string
  error?: string
}

const jobs = new Map<string, ExportJob>()

function id() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '')
}

export function createExportJob(params: {
  ownerLineAccountId: string
  ownerUserId: string
  filename: string
  build: () => Promise<string>
}) {
  const jobId = id()
  const job: ExportJob = {
    id: jobId,
    createdAt: Date.now(),
    status: 'PENDING',
    ownerLineAccountId: params.ownerLineAccountId,
    ownerUserId: params.ownerUserId,
    filename: params.filename,
  }
  jobs.set(jobId, job)

  setTimeout(async () => {
    try {
      const csv = await params.build()
      jobs.set(jobId, { ...job, status: 'READY', csv })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed'
      jobs.set(jobId, { ...job, status: 'FAILED', error: msg })
    }
  }, 0)

  return jobId
}

export function getExportJob(jobId: string) {
  return jobs.get(jobId) ?? null
}

export function pruneExportJobs(params?: { maxAgeMs?: number }) {
  const maxAgeMs = params?.maxAgeMs ?? 15 * 60_000
  const now = Date.now()
  for (const [k, v] of jobs.entries()) {
    if (now - v.createdAt > maxAgeMs) jobs.delete(k)
  }
}
