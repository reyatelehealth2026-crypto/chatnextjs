# Database Migration Guide

This guide explains how to set up and manage database migrations for the Standalone Inbox System.

## Prerequisites

- PostgreSQL 15+ installed and running
- Database credentials configured in `.env` file
- Prisma CLI installed (included in project dependencies)

## Initial Setup

### 1. Configure Database Connection

Update your `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/inbox_system"
DATABASE_DIRECT_URL="postgresql://username:password@localhost:5432/inbox_system"
```

For production with connection pooling (e.g., PgBouncer):
- `DATABASE_URL`: Use the pooled connection URL
- `DATABASE_DIRECT_URL`: Use the direct connection URL (bypasses pooler)

### 2. Create Database

Create the database if it doesn't exist:

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE inbox_system;"

# Or using createdb
createdb -U postgres inbox_system
```

### 3. Run Initial Migration

Apply the initial migration to create all tables:

```bash
npx prisma migrate deploy
```

This command:
- Applies all pending migrations in the `prisma/migrations` directory
- Creates all tables, indexes, and foreign keys
- Sets up the database schema according to `prisma/schema.prisma`

### 4. Generate Prisma Client

Generate the Prisma Client to use in your application:

```bash
npx prisma generate
```

## Development Workflow

### Creating New Migrations

When you modify the Prisma schema:

1. Update `prisma/schema.prisma` with your changes
2. Create a new migration:

```bash
npx prisma migrate dev --name descriptive_migration_name
```

This command:
- Creates a new migration file in `prisma/migrations`
- Applies the migration to your development database
- Regenerates the Prisma Client

### Applying Migrations

To apply pending migrations without creating new ones:

```bash
npx prisma migrate deploy
```

Use this command in:
- Production deployments
- CI/CD pipelines
- When pulling changes from other developers

### Resetting the Database

To reset your development database (⚠️ **destroys all data**):

```bash
npx prisma migrate reset
```

This command:
- Drops the database
- Creates a new database
- Applies all migrations
- Runs seed scripts (if configured)

## Migration Files

### Initial Migration

The initial migration (`20260201000000_init`) creates:

**Enums:**
- `UserRole`: OWNER, ADMIN, AGENT, STAFF, MARKETING
- `ConversationStatus`: OPEN, PENDING, RESOLVED, CLOSED
- `MessageDirection`: INBOUND, OUTBOUND
- `MessageType`: TEXT, IMAGE, VIDEO, AUDIO, FILE, STICKER, LOCATION, FLEX
- `PointsTransactionType`: EARNED, REDEEMED, ADJUSTED, EXPIRED
- `TriggerType`: KEYWORD_EXACT, KEYWORD_CONTAINS, TIME_BASED, FIRST_MESSAGE
- `FieldType`: TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX
- `BroadcastTargetType`: ALL, SEGMENT, CUSTOM
- `BroadcastStatus`: DRAFT, SCHEDULED, SENDING, SENT, FAILED

**Core Tables:**
- `Account`, `Session`, `User`, `VerificationToken` (NextAuth.js)
- `LineAccount` (Multi-tenant)
- `Customer`, `CustomerTag`, `CustomerNote`, `PointsTransaction`
- `Conversation`, `ConversationAssignee`, `ConversationStatusHistory`
- `Message`, `FileAttachment`
- `Template`, `AutoReplyRule`
- `Segment`, `SegmentMember`
- `CustomField`, `CustomFieldValue`
- `Group`, `GroupMember`, `GroupMessage`
- `Broadcast`

**Indexes:**
All tables include appropriate indexes for:
- Foreign key relationships
- Multi-tenant filtering (`lineAccountId`)
- Common query patterns (status, dates, names)
- Unique constraints

## Multi-Tenant Data Isolation

All tenant-specific tables include a `lineAccountId` column with an index. This ensures:
- Fast filtering by tenant
- Data isolation at the application layer
- Efficient queries across large datasets

**Tables with `lineAccountId`:**
- LineAccount (primary tenant table)
- User
- Customer
- Conversation
- Template
- AutoReplyRule
- Segment
- CustomField
- Group
- Broadcast

## Production Deployment

### Vercel Deployment

1. Configure environment variables in Vercel dashboard
2. Migrations run automatically on deployment via build command
3. Use Vercel Postgres or external PostgreSQL provider

### Manual Deployment

1. Set up production database
2. Configure `DATABASE_URL` and `DATABASE_DIRECT_URL`
3. Run migrations:

```bash
npx prisma migrate deploy
```

4. Verify migration status:

```bash
npx prisma migrate status
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check the error message for details
2. Verify database connection
3. Check for conflicting data or constraints
4. Roll back if necessary (manual SQL required)

### Schema Drift

If your database schema doesn't match Prisma schema:

```bash
# Check for drift
npx prisma migrate status

# Generate a migration to fix drift
npx prisma migrate dev --name fix_schema_drift
```

### Connection Issues

Common connection problems:

- **Can't reach database**: Check host, port, and firewall
- **Authentication failed**: Verify username and password
- **Database doesn't exist**: Create the database first
- **SSL required**: Add `?sslmode=require` to connection string

## Best Practices

1. **Always backup production data** before running migrations
2. **Test migrations** in staging environment first
3. **Use descriptive migration names** (e.g., `add_customer_tags`)
4. **Review generated SQL** before applying to production
5. **Keep migrations small** and focused on single changes
6. **Never edit applied migrations** - create new ones instead
7. **Commit migration files** to version control
8. **Document breaking changes** in migration comments

## Useful Commands

```bash
# View migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Validate schema without applying
npx prisma validate

# Format schema file
npx prisma format

# View database schema
npx prisma db pull

# Push schema changes without migration (dev only)
npx prisma db push
```

## Support

For issues or questions:
- Check Prisma documentation: https://www.prisma.io/docs
- Review migration files in `prisma/migrations`
- Check application logs for database errors
