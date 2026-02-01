# Authentication Implementation

This document describes the authentication system implemented for the Standalone Inbox System.

## Overview

The authentication system is built using NextAuth.js v5 (beta) with the following features:

- **Credentials-based authentication** with email and password
- **JWT session strategy** for stateless authentication
- **Role-based access control (RBAC)** with 5 user roles
- **Multi-tenant data isolation** via lineAccountId
- **Route protection** via Next.js middleware
- **API route protection** via helper functions

## Architecture

### Components

1. **NextAuth.js Configuration** (`lib/auth.ts`)
   - Credentials provider setup
   - JWT session strategy
   - Custom callbacks for session and JWT tokens
   - Password verification with bcrypt

2. **Authentication Routes** (`app/api/auth/[...nextauth]/route.ts`)
   - NextAuth.js API routes
   - Exports auth, signIn, signOut functions

3. **Middleware** (`middleware.ts`)
   - Route protection
   - Role-based access control
   - Automatic redirect to sign-in for unauthenticated users
   - Session expiration handling

4. **UI Components**
   - `SignInForm` - Login form with email/password
   - `SignOutButton` - Sign out button component
   - `Protected` - Conditional rendering based on permissions

5. **Permission System** (`lib/permissions.ts`)
   - Permission definitions by feature
   - Role hierarchy
   - Helper functions for permission checks

6. **API Helpers** (`lib/api-helpers.ts`)
   - `withAuth` - Require authentication for API routes
   - `withPermission` - Require specific permission
   - `withRole` - Require specific role
   - `validateLineAccountOwnership` - Multi-tenant security

## User Roles

The system supports 5 user roles with hierarchical permissions:

1. **STAFF** - Basic access to conversations and customers
2. **AGENT** - Can assign conversations and manage customer data
3. **MARKETING** - Access to broadcasts, segments, and analytics
4. **ADMIN** - Full access except user management
5. **OWNER** - Complete system access including user management

## Usage Examples

### Protecting Server Components

```typescript
import { requireAuth, requirePermission } from '@/lib/permissions'

export default async function MyPage() {
  // Require authentication
  const user = await requireAuth()

  // Or require specific permission
  const user = await requirePermission('viewAnalytics')

  return <div>Protected content</div>
}
```

### Protecting API Routes

```typescript
import { withAuth, withPermission, successResponse } from '@/lib/api-helpers'

export const GET = withAuth(async (user) => {
  // User is authenticated
  return successResponse({ data: 'protected data' })
})

export const POST = withPermission('manageTemplates', async (user) => {
  // User has manageTemplates permission
  return successResponse({ data: 'created' })
})
```

### Client-Side Permission Checks

```typescript
'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { Protected } from '@/components/auth/protected'

export function MyComponent() {
  const { hasPermission, role } = usePermissions()

  return (
    <div>
      {hasPermission('viewAnalytics') && <AnalyticsButton />}
      
      <Protected permission="manageUsers">
        <UserManagementPanel />
      </Protected>

      <Protected roles={['OWNER', 'ADMIN']}>
        <SettingsPanel />
      </Protected>
    </div>
  )
}
```

### Multi-Tenant Security

All database queries must filter by lineAccountId:

```typescript
import { requireAuth } from '@/lib/permissions'
import { validateLineAccountOwnership } from '@/lib/api-helpers'
import prisma from '@/lib/prisma'

export const GET = withAuth(async (user) => {
  // Get conversations for user's line account only
  const conversations = await prisma.conversation.findMany({
    where: {
      lineAccountId: user.lineAccountId,
    },
  })

  return successResponse({ conversations })
})

export const PATCH = withAuth(async (user, request) => {
  const { conversationId } = await request.json()

  // Verify ownership before update
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    return errorResponse('Not found', 404)
  }

  validateLineAccountOwnership(user.lineAccountId, conversation.lineAccountId)

  // Safe to update
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { /* ... */ },
  })

  return successResponse({ conversation: updated })
})
```

## Environment Variables

Required environment variables for authentication:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

Generate a secret with:
```bash
openssl rand -base64 32
```

## Database Schema

The authentication system uses the following Prisma models:

- `User` - User accounts with role and lineAccountId
- `Account` - OAuth accounts (for future providers)
- `Session` - User sessions (currently using JWT, but schema supports database sessions)
- `VerificationToken` - Email verification tokens (for future use)

Note: A `password` field was added to the User model for credentials authentication.

## Security Features

1. **Password Hashing** - bcrypt with 12 rounds
2. **JWT Tokens** - Signed and encrypted session tokens
3. **HTTP-Only Cookies** - Session cookies not accessible via JavaScript
4. **CSRF Protection** - Built into NextAuth.js
5. **Multi-Tenant Isolation** - All queries filtered by lineAccountId
6. **Role-Based Access Control** - Fine-grained permissions per feature
7. **Session Expiration** - 8-hour session timeout with automatic refresh

## Testing

To test the authentication system:

1. Create a test user in the database with a hashed password
2. Navigate to `/auth/signin`
3. Enter credentials and sign in
4. Verify redirect to `/dashboard`
5. Test protected routes and API endpoints
6. Test role-based access control
7. Test sign out functionality

## Future Enhancements

- Email/password registration flow
- Email verification
- Password reset functionality
- OAuth providers (Google, LINE, etc.)
- Two-factor authentication (2FA)
- Session management UI (view/revoke sessions)
- Audit logging for authentication events
- Rate limiting on login attempts
- Account lockout after failed attempts

## Migration Notes

To apply the password field migration:

```bash
npx prisma migrate dev --name add_user_password
```

Or manually create the migration SQL:

```sql
ALTER TABLE "User" ADD COLUMN "password" TEXT;
```

## Troubleshooting

### "Unauthorized" errors
- Check that NEXTAUTH_SECRET is set
- Verify session cookie is being sent
- Check middleware matcher configuration

### "Forbidden" errors
- Verify user role in database
- Check permission definitions in `lib/permissions.ts`
- Ensure role-based routes are configured correctly

### Session not persisting
- Check NEXTAUTH_URL matches your domain
- Verify cookies are enabled in browser
- Check for CORS issues in production

### Cross-tenant access
- Always filter queries by lineAccountId
- Use validateLineAccountOwnership helper
- Test with multiple line accounts
