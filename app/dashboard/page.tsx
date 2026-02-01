import { requireAuth } from '@/lib/permissions'
import { SignOutButton } from '@/components/auth/signout-button'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  try {
    const user = await requireAuth()

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Welcome back, {user.name || user.email}
              </p>
            </div>
            <SignOutButton className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Sign out
            </SignOutButton>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">User Information</h3>
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Role</dt>
                  <dd className="text-sm font-medium text-gray-900">{user.role}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Line Account ID</dt>
                  <dd className="text-sm font-medium text-gray-900">{user.lineAccountId}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Quick Stats</h3>
              <p className="mt-4 text-sm text-gray-600">
                Dashboard features will be implemented in subsequent tasks.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Recent Activity</h3>
              <p className="mt-4 text-sm text-gray-600">
                Activity tracking will be implemented in subsequent tasks.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  } catch {
    redirect('/auth/signin')
  }
}
