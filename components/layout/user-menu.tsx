'use client'

import { useSession } from 'next-auth/react'
import { LogOut, User, Settings } from 'lucide-react'
import { SignOutButton } from '@/components/auth/signout-button'
import { useState, useRef, useEffect } from 'react'
import { getCsrfToken } from '@/lib/csrf-client'
import { signOut } from 'next-auth/react'
import Image from 'next/image'

export function UserMenu() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!session?.user) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        <span className="hidden md:inline">{session.user.name || session.user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg">
          <div className="border-b p-3">
            <p className="text-sm font-medium text-gray-900">
              {session.user.name || 'User'}
            </p>
            <p className="text-xs text-gray-500">{session.user.email}</p>
            {session.user.role && (
              <p className="mt-1 text-xs font-medium text-gray-600">
                Role: {session.user.role}
              </p>
            )}
          </div>

          <div className="p-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setIsOpen(false)
                // Navigate to settings
              }}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            <SignOutButton className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              Sign Out
            </SignOutButton>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={async () => {
                setIsOpen(false)
                try {
                  await fetch('/api/inbox/sessions/revoke-all', {
                    method: 'POST',
                    headers: { 'x-csrf-token': getCsrfToken() },
                  })
                } finally {
                  await signOut({ callbackUrl: '/auth/signin' })
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out all devices
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
