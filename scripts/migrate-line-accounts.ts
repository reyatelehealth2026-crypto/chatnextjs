import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

// ใช้ DATABASE_URL เดียวกัน
function parseDatabaseUrl(url: string) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!match) throw new Error('Invalid DATABASE_URL format')
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  }
}

async function migrateLineAccounts() {
  console.log('🚀 Starting LINE Accounts migration...\n')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const dbConfig = parseDatabaseUrl(dbUrl)
  const phpDb = await mysql.createConnection(dbConfig)

  try {
    // Migrate LINE Accounts
    console.log('📱 Migrating LINE Accounts...')
    const [lineAccounts] = await phpDb.query<any[]>(
      'SELECT * FROM line_accounts WHERE is_active = 1 ORDER BY is_default DESC, id ASC'
    )

    if (lineAccounts.length === 0) {
      console.log('⚠️  No active LINE accounts found in old system')
      return
    }

    for (const account of lineAccounts) {
      try {
        await prisma.lineAccount.upsert({
          where: { channelSecret: account.channel_secret },
          update: {
            name: account.name,
            channelId: account.channel_id,
            channelAccessToken: account.channel_access_token,
            webhookUrl: account.webhook_url,
            basicId: account.basic_id,
            pictureUrl: account.picture_url,
            liffId: account.liff_id,
            isActive: account.is_active === 1,
            isDefault: account.is_default === 1,
          },
          create: {
            name: account.name,
            channelId: account.channel_id,
            channelSecret: account.channel_secret,
            channelAccessToken: account.channel_access_token,
            webhookUrl: account.webhook_url,
            basicId: account.basic_id,
            pictureUrl: account.picture_url,
            liffId: account.liff_id,
            isActive: account.is_active === 1,
            isDefault: account.is_default === 1,
          },
        })
        console.log(`✅ Migrated LINE Account: ${account.name} (ID: ${account.id})`)
      } catch (error: any) {
        console.error(`❌ Error migrating account ${account.name}:`, error.message)
      }
    }

    // Ensure at least one account is marked as default
    const defaultAccount = await prisma.lineAccount.findFirst({
      where: { isDefault: true }
    })

    if (!defaultAccount) {
      const firstAccount = await prisma.lineAccount.findFirst({
        where: { isActive: true }
      })
      if (firstAccount) {
        await prisma.lineAccount.update({
          where: { id: firstAccount.id },
          data: { isDefault: true }
        })
        console.log(`✅ Set ${firstAccount.name} as default account`)
      }
    }

    console.log(`\n🎉 Migration completed! Migrated ${lineAccounts.length} LINE accounts`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await phpDb.end()
    await prisma.$disconnect()
  }
}

// Run migration
migrateLineAccounts()
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })
