'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { type Permission, type UserRole } from '@/lib/permissions-core'

interface ProtectedProps {
  children: React.ReactNode
  permission?: Permission
  roles?: UserRole[]
  fallback?: React.ReactNode
}

/**
 * Component to conditionally render children based on permissions
 */
export function Protected({ children, permission, roles, fallback = null }: ProtectedProps) {
  const { hasPermission: checkPermission, hasRole } = usePermissions()

  // Check permission if provided
  if (permission && !checkPermission(permission)) {
    return <>{fallback}</>
  }

  // Check roles if provided
  if (roles && !hasRole(roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
