import { SignInForm } from '@/components/auth/signin-form'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Sign In | Standalone Inbox System',
  description: 'Sign in to your account',
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the inbox system
          </p>
        </div>
        <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}
