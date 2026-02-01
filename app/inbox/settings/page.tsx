import Link from 'next/link'
import { RateLimitPanel } from '@/components/inbox/rate-limit-panel'

export default function InboxSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Tenant configuration</p>
      </div>

      <RateLimitPanel />

      <div className="rounded border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/inbox/settings/custom-fields"
            className="rounded border p-4 hover:bg-gray-50"
          >
            <div className="font-medium text-gray-900">Custom fields</div>
            <div className="mt-1 text-sm text-gray-600">Manage customer custom fields</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
