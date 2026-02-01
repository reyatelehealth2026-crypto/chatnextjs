import { auth } from '@/auth'
import {
  permissions,
  roleHierarchy,
  hasAnyRole,
  hasMinimumRole,
  hasPermission,
  type Permission,
  type UserRole,
} from '@/lib/permissions-core'

export {
  permissions,
  roleHierarchy,
  hasAnyRole,
  hasMinimumRole,
  hasPermission,
  type Permission,
  type UserRole,
}

/**
 * Get the current authenticated user
 * Throws an error if not authenticated
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return session.user
}

/**
 * Require authentication and check permission
 * Throws an error if not authenticated or lacks permission
 */
export async function requirePermission(permission: Permission) {
  const user = await requireAuth()

  if (!hasPermission(user.role, permission)) {
    throw new Error('Forbidden: Insufficient permissions')
  }

  return user
}

/**
 * Require authentication and check role
 * Throws an error if not authenticated or lacks required role
 */
export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth()

  if (!hasAnyRole(user.role, roles)) {
    throw new Error('Forbidden: Insufficient role')
  }

  return user
}
