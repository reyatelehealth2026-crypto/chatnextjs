'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { hasPermission, type Permission } from '@/lib/permissions-core'
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  FileText,
  Zap,
  Send,
  UserCircle,
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
}

const navigation: NavigationItem[] = [
  { 
    name: 'Conversations', 
    href: '/inbox', 
    icon: MessageSquare,
    permission: 'viewConversations'
  },
  { 
    name: 'Customers', 
    href: '/inbox/customers', 
    icon: Users,
    permission: 'viewCustomers'
  },
  { 
    name: 'Templates', 
    href: '/inbox/templates', 
    icon: FileText,
    permission: 'viewTemplates'
  },
  { 
    name: 'Auto-Reply', 
    href: '/inbox/auto-reply', 
    icon: Zap,
    permission: 'viewAutoReplyRules'
  },
  { 
    name: 'Broadcasts', 
    href: '/inbox/broadcasts', 
    icon: Send,
    permission: 'viewBroadcasts'
  },
  { 
    name: 'Segments', 
    href: '/inbox/segments', 
    icon: UserCircle,
    permission: 'viewSegments'
  },
  { 
    name: 'Analytics', 
    href: '/inbox/analytics', 
    icon: BarChart3,
    permission: 'viewAnalytics'
  },
  { 
    name: 'Settings', 
    href: '/inbox/settings', 
    icon: Settings,
    permission: 'viewSettings'
  },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const visibleNavigation = navigation.filter((item) => {
    if (!item.permission) return true
    if (!session?.user?.role) return false
    return hasPermission(session.user.role, item.permission)
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <h1 className="text-xl font-bold text-gray-900">Inbox System</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </div>
  )
}
