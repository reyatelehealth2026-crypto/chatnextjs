'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import Link from 'next/link'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-white px-4">
        <Link
          href="#main"
          className="sr-only focus:not-sr-only focus:rounded focus:bg-gray-900 focus:px-2 focus:py-1 focus:text-white"
        >
          Skip to content
        </Link>
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        {/* Mobile logo */}
        <div className="md:hidden">
          <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
        </div>

        {/* Right side - User menu */}
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}
