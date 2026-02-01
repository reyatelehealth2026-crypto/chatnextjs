# Prisma Database Setup

This directory contains the Prisma ORM configuration for the Standalone Inbox System.

## Overview

Prisma is configured with:
- **Database**: PostgreSQL 15+
- **Adapter**: @prisma/adapter-pg with native connection pooling
- **Connection Pooling**: Built-in via pg Pool
- **Migrations**: Version-controlled schema changes
- **Type Safety**: Auto-generated TypeScript types

## Configuration Files

### `schema.prisma`
Defines the database schema with models, relationships, and indexes.

### `prisma.config.ts`
Configures Prisma with connection URLs and migration settings.

### `lib/prisma.ts`
Singleton Prisma client with PostgreSQL adapter and connection pooling.

## Prisma 7 Architecture

Prisma 7 uses a new architecture with database adapters:
- **Adapter**: @prisma/adapter-pg provides PostgreSQL connectivity
- **Connection Pool**: pg Pool manages database connections
- **Type Safety**: Full TypeScript support with generated types

## Environment Variables

### Development
```env
DATABASE_URL="postgresql://user:password@localhost:5432/inbox_system"
DATABASE_DIRECT_URL="postgresql://user:password@localhost:5432/inbox_system"
```

### Production with Connection Pooling
```env
# Pooled connection for queries (e.g., via PgBouncer or Prisma Data Proxy)
DATABASE_URL="postgresql://user:password@pooler.example.com:6543/inbox_system?pgbouncer=true"

# Direct connection for migrations (bypasses pooler)
DATABASE_DIRECT_URL="postgresql://user:password@db.example.com:5432/inbox_system"
```

## Connection Pooling

### Built-in Connection Pool

The Prisma client is configured with a native PostgreSQL connection pool:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds
})
```

### Why Connection Pooling?

In serverless environments like Vercel, each function invocation can create a new database connection. Connection pooling helps:
- Reduce connection overhead
- Prevent exhausting database connection limits
- Improve query performance
- Enable horizontal scaling

### Recommended Poolers

1. **Built-in pg Pool** - Native Node.js PostgreSQL pooling (current setup)
2. **PgBouncer** - Popular PostgreSQL connection pooler
3. **Prisma Data Proxy** - Managed pooling service
4. **Vercel Postgres** - Built-in pooling support
5. **Supabase** - Includes connection pooling

### Configuration

The `DATABASE_URL` is used for queries and can point to a connection pooler.
The `DATABASE_DIRECT_URL` is used for migrations and should point directly to the database.

## Common Commands

### Generate Prisma Client
```bash
npm run prisma:generate
# or
npx prisma generate
```

### Create a Migration
```bash
npm run prisma:migrate
# or
npx prisma migrate dev --name migration_name
```

### Apply Migrations (Production)
```bash
npm run prisma:migrate:deploy
# or
npx prisma migrate deploy
```

### Push Schema (Development)
```bash
npm run prisma:push
# or
npx prisma db push
```

### Open Prisma Studio
```bash
npm run prisma:studio
# or
npx prisma studio
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

## Usage in Code

### Import Prisma Client
```typescript
import prisma from '@/lib/prisma'

// Query example
const users = await prisma.user.findMany()

// Create example
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
})
```

### Multi-Tenant Queries
Always filter by `lineAccountId` for multi-tenant data isolation:

```typescript
const conversations = await prisma.conversation.findMany({
  where: {
    lineAccountId: session.user.lineAccountId,
  },
})
```

## Best Practices

1. **Always use the singleton client** from `lib/prisma.ts`
2. **Filter by lineAccountId** for all tenant-specific queries
3. **Use transactions** for operations that must succeed or fail together
4. **Index frequently queried fields** for performance
5. **Use connection pooling** in production environments
6. **Run migrations** before deploying new code
7. **Test migrations** in staging before production
8. **Configure pool size** based on your database limits and expected load

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check database is running
- Ensure firewall allows connections
- Verify credentials are correct
- Check connection pool settings

### Migration Errors
- Check DATABASE_DIRECT_URL bypasses pooler
- Ensure database user has migration permissions
- Review migration SQL for conflicts

### Type Errors
- Run `npm run prisma:generate` after schema changes
- Restart TypeScript server in your IDE

### Pool Exhaustion
- Increase `max` pool size if needed
- Check for connection leaks
- Ensure proper error handling
- Monitor active connections

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma 7 Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [Connection Pooling Guide](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Prisma with Next.js](https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)
- [pg Pool Documentation](https://node-postgres.com/apis/pool)
