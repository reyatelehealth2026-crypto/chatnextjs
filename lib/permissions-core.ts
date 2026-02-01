/**
 * Client-safe permission definitions and helpers.
 * (No server imports; safe to use from Client Components.)
 */

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
export const roleHierarchy = ['STAFF', 'AGENT', 'MARKETING', 'ADMIN', 'OWNER'] as const

export type UserRole = (typeof roleHierarchy)[number]

/**
 * Feature permissions by role
 */
export const permissions = {
  // Conversation management
  viewConversations: ['OWNER', 'ADMIN', 'AGENT', 'STAFF', 'MARKETING'],
  assignConversations: ['OWNER', 'ADMIN', 'AGENT'],
  updateConversationStatus: ['OWNER', 'ADMIN', 'AGENT', 'STAFF'],
  deleteConversations: ['OWNER', 'ADMIN'],

  // Customer management
  viewCustomers: ['OWNER', 'ADMIN', 'AGENT', 'STAFF', 'MARKETING'],
  editCustomers: ['OWNER', 'ADMIN', 'AGENT', 'STAFF'],
  deleteCustomers: ['OWNER', 'ADMIN'],
  manageCustomerTags: ['OWNER', 'ADMIN', 'AGENT', 'STAFF'],
  manageCustomerNotes: ['OWNER', 'ADMIN', 'AGENT', 'STAFF'],
  managePoints: ['OWNER', 'ADMIN', 'AGENT'],

  // Templates and automation
  viewTemplates: ['OWNER', 'ADMIN', 'AGENT', 'STAFF', 'MARKETING'],
  manageTemplates: ['OWNER', 'ADMIN', 'MARKETING'],
  viewAutoReplyRules: ['OWNER', 'ADMIN', 'MARKETING'],
  manageAutoReplyRules: ['OWNER', 'ADMIN', 'MARKETING'],

  // Analytics and reporting
  viewAnalytics: ['OWNER', 'ADMIN', 'MARKETING'],
  viewSLA: ['OWNER', 'ADMIN'],
  exportData: ['OWNER', 'ADMIN', 'MARKETING'],

  // Broadcasts
  viewBroadcasts: ['OWNER', 'ADMIN', 'MARKETING'],
  createBroadcasts: ['OWNER', 'ADMIN', 'MARKETING'],
  sendBroadcasts: ['OWNER', 'ADMIN', 'MARKETING'],

  // Segments
  viewSegments: ['OWNER', 'ADMIN', 'MARKETING'],
  manageSegments: ['OWNER', 'ADMIN', 'MARKETING'],

  // Settings and configuration
  viewSettings: ['OWNER', 'ADMIN'],
  manageSettings: ['OWNER', 'ADMIN'],
  manageUsers: ['OWNER', 'ADMIN'],
  manageCustomFields: ['OWNER', 'ADMIN'],
} as const

export type Permission = keyof typeof permissions

export function hasPermission(userRole: string, permission: Permission): boolean {
  const allowedRoles = permissions[permission] as readonly string[]
  return allowedRoles.includes(userRole)
}

export function hasAnyRole(userRole: string, roles: UserRole[]): boolean {
  return roles.includes(userRole as UserRole)
}

export function hasMinimumRole(userRole: string, minimumRole: UserRole): boolean {
  const userRoleIndex = roleHierarchy.indexOf(userRole as UserRole)
  const minimumRoleIndex = roleHierarchy.indexOf(minimumRole)
  return userRoleIndex >= minimumRoleIndex
}

