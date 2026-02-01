'use client'

import { useSession } from 'next-auth/react'
import { hasPermission, hasAnyRole, type Permission, type UserRole } from '@/lib/permissions-core'

/**
 * Hook to check user permissions on the client side
 */
export function usePermissions() {
  const { data: session, status } = useSession()
  const user = session?.user

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: !!user,
    hasPermission: (permission: Permission) => {
      if (!user) return false
      return hasPermission(user.role, permission)
    },
    hasRole: (roles: UserRole[]) => {
      if (!user) return false
      return hasAnyRole(user.role, roles)
    },
    role: user?.role,
  }
}
