import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { getExportJob, pruneExportJobs } from '@/lib/export-jobs'
import { sanitizeText } from '@/lib/sanitize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox/exports/[id]
 * - Returns JSON status by default.
 * - If ?download=1 and READY, returns the CSV attachment.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('exportData')
    pruneExportJobs()

    const { id } = await params
    const jobId = sanitizeText(id, { maxLen: 64 })
    const job = getExportJob(jobId)
    if (!job) return NextResponse.json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } }, { status: 404 })
    if (job.ownerLineAccountId !== user.lineAccountId) {
      return NextResponse.json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === '1'
    if (download) {
      if (job.status !== 'READY' || !job.csv) {
        return NextResponse.json(
          { success: false, error: { message: 'Not ready', code: 'NOT_READY' } },
          { status: 409 }
        )
      }
      return new Response(job.csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=\"${job.filename}\"`,
          'X-Export-Generated-At': new Date(job.createdAt).toISOString(),
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          status: job.status,
          filename: job.filename,
          createdAt: new Date(job.createdAt).toISOString(),
          error: job.error ?? null,
          downloadUrl: job.status === 'READY' ? `/api/inbox/exports/${job.id}?download=1` : null,
        },
      },
      { status: job.status === 'PENDING' ? 202 : job.status === 'FAILED' ? 500 : 200 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }
    console.error('Error fetching export job:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
