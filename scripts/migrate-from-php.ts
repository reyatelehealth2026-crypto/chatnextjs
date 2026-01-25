import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

// ใช้ DATABASE_URL เดียวกัน (เพราะใช้ database เดียวกัน)
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

async function migrateData() {
  console.log('🚀 Starting data migration from PHP system...\n')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const dbConfig = parseDatabaseUrl(dbUrl)
  const phpDb = await mysql.createConnection(dbConfig)

  try {
    // 1. Migrate LINE Accounts
    console.log('📱 Migrating LINE Accounts...')
    const [lineAccounts] = await phpDb.query<any[]>(
      'SELECT * FROM line_accounts WHERE is_active = 1'
    )

    for (const account of lineAccounts) {
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
    }
    console.log(`✅ Migrated ${lineAccounts.length} LINE accounts\n`)

    // 2. Migrate Admin Users
    console.log('👤 Migrating Admin Users...')
    const [adminUsers] = await phpDb.query<any[]>(
      'SELECT * FROM admin_users WHERE is_active = 1'
    )

    for (const admin of adminUsers) {
      await prisma.adminUser.upsert({
        where: { username: admin.username },
        update: {
          email: admin.email,
          displayName: admin.display_name,
          avatarUrl: admin.avatar_url,
          role: admin.role,
          lineAccountId: admin.line_account_id,
          isActive: admin.is_active === 1,
        },
        create: {
          username: admin.username,
          email: admin.email,
          password: admin.password, // Keep existing password hash
          displayName: admin.display_name,
          avatarUrl: admin.avatar_url,
          role: admin.role,
          lineAccountId: admin.line_account_id,
          isActive: admin.is_active === 1,
        },
      })
    }
    console.log(`✅ Migrated ${adminUsers.length} admin users\n`)

    // 3. Migrate LINE Users (Customers)
    console.log('👥 Migrating LINE Users...')
    const [lineUsers] = await phpDb.query<any[]>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 1000'
    )

    let userCount = 0
    for (const user of lineUsers) {
      try {
        await prisma.lineUser.upsert({
          where: {
            lineAccountId_lineUserId: {
              lineAccountId: user.line_account_id,
              lineUserId: user.line_user_id,
            },
          },
          update: {
            displayName: user.display_name,
            pictureUrl: null, // Skip picture_url to avoid length issues - will be synced from new messages
            statusMessage: null, // Skip status_message to avoid length issues
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            email: user.email,
            birthDate: user.birth_date,
            gender: user.gender,
            weight: user.weight ? parseFloat(user.weight) : null,
            height: user.height ? parseFloat(user.height) : null,
            address: user.address,
            district: user.district,
            province: user.province,
            postalCode: user.postal_code,
            memberId: user.member_id,
            isRegistered: user.is_registered === 1,
            registeredAt: user.registered_at,
            isBlocked: user.is_blocked === 1,
            membershipLevel: user.membership_level || 'bronze',
            tier: user.tier || 'silver',
            points: user.points || 0,
            totalPoints: user.total_points || 0,
            availablePoints: user.available_points || 0,
            usedPoints: user.used_points || 0,
            loyaltyPoints: user.loyalty_points || 0,
            totalSpent: parseFloat(user.total_spent) || 0,
            orderCount: user.order_count || 0,
            lastInteraction: user.last_interaction,
            chatStatus: user.chat_status,
          },
          create: {
            lineAccountId: user.line_account_id,
            lineUserId: user.line_user_id,
            displayName: user.display_name,
            pictureUrl: null, // Skip picture_url to avoid length issues - will be synced from new messages
            statusMessage: null, // Skip status_message to avoid length issues
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            email: user.email,
            birthDate: user.birth_date,
            gender: user.gender,
            weight: user.weight ? parseFloat(user.weight) : null,
            height: user.height ? parseFloat(user.height) : null,
            address: user.address,
            district: user.district,
            province: user.province,
            postalCode: user.postal_code,
            memberId: user.member_id,
            isRegistered: user.is_registered === 1,
            registeredAt: user.registered_at,
            isBlocked: user.is_blocked === 1,
            membershipLevel: user.membership_level || 'bronze',
            tier: user.tier || 'silver',
            points: user.points || 0,
            totalPoints: user.total_points || 0,
            availablePoints: user.available_points || 0,
            usedPoints: user.used_points || 0,
            loyaltyPoints: user.loyalty_points || 0,
            totalSpent: parseFloat(user.total_spent) || 0,
            orderCount: user.order_count || 0,
            lastInteraction: user.last_interaction,
            chatStatus: user.chat_status,
          },
        })
        userCount++
        if (userCount % 100 === 0) {
          console.log(`   Processed ${userCount} users...`)
        }
      } catch (error) {
        console.error(`   Error migrating user ${user.line_user_id}:`, error)
      }
    }
    console.log(`✅ Migrated ${userCount} LINE users\n`)

    // 4. Migrate User Tags
    console.log('🏷️  Migrating User Tags...')
    const [tags] = await phpDb.query<any[]>(
      'SELECT * FROM user_tags ORDER BY id'
    )

    for (const tag of tags) {
      await prisma.userTag.upsert({
        where: {
          lineAccountId_name: {
            lineAccountId: tag.line_account_id,
            name: tag.name,
          },
        },
        update: {
          color: tag.color,
          description: tag.description,
          isAuto: tag.is_auto === 1,
          sortOrder: tag.sort_order,
        },
        create: {
          lineAccountId: tag.line_account_id,
          name: tag.name,
          color: tag.color,
          description: tag.description,
          isAuto: tag.is_auto === 1,
          sortOrder: tag.sort_order,
        },
      })
    }
    console.log(`✅ Migrated ${tags.length} tags\n`)

    // 5. Migrate Messages (recent only)
    console.log('💬 Migrating Recent Messages...')
    const [messages] = await phpDb.query<any[]>(
      `SELECT m.*, u.line_user_id, u.line_account_id
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY m.created_at DESC
       LIMIT 10000`
    )

    let messageCount = 0
    for (const msg of messages) {
      try {
        // Get the UUID of the user from our new database
        const user = await prisma.lineUser.findFirst({
          where: {
            lineUserId: msg.line_user_id,
            lineAccountId: msg.line_account_id,
          },
        })

        if (user) {
          await prisma.message.create({
            data: {
              userId: user.id,
              lineAccountId: msg.line_account_id,
              direction: msg.direction,
              messageType: msg.message_type,
              content: msg.content,
              mediaUrl: msg.media_url,
              metadata: msg.metadata,
              replyToken: msg.reply_token,
              isRead: msg.is_read === 1,
              sentBy: msg.sent_by,
              createdAt: msg.created_at,
              updatedAt: msg.updated_at,
            },
          })
          messageCount++
          if (messageCount % 500 === 0) {
            console.log(`   Processed ${messageCount} messages...`)
          }
        }
      } catch (error) {
        // Skip duplicate messages
      }
    }
    console.log(`✅ Migrated ${messageCount} messages\n`)

    console.log('🎉 Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await phpDb.end()
    await prisma.$disconnect()
  }
}

// Run migration
migrateData()
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })
