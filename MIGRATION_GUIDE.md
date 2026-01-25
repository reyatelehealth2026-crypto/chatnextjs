# Database Migration Guide

## Running Migrations on Production (Vercel)

### Option 1: Automatic Migration Check (Recommended)
The build command in `vercel.json` has been configured to check and add missing columns automatically during deployment:
```json
"buildCommand": "npx tsx scripts/add-media-url-column.ts || true && npm run build"
```

This script will:
- Check if the `media_url` column exists
- Add it if missing
- Continue with build even if there's an error (non-blocking)

### Option 2: Manual Migration via Vercel CLI
If you need to run migrations manually:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Run migration:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### Option 3: Using the Migration Script
For the `media_url` column migration specifically, you can use the provided script:

```bash
npx tsx scripts/add-media-url-column.ts
```

## Current Migration Status

- ✅ `20260125121527_add_media_url_to_messages` - Adds `media_url` column to `messages` table

## Troubleshooting

If you see errors about missing columns:
1. Check that migrations have been run: `npx prisma migrate status`
2. Run pending migrations: `npx prisma migrate deploy`
3. Verify database connection in Vercel environment variables
