import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  console.log('🧹 Removing duplicate messages...')

  const duplicates = await prisma.$queryRaw<
    Array<{ duplicate_count: bigint }>
  >`
    SELECT COUNT(*) AS duplicate_count
    FROM inbox_messages m1
    JOIN inbox_messages m2
      ON m1.user_id = m2.user_id
     AND IFNULL(m1.line_account_id, 0) = IFNULL(m2.line_account_id, 0)
     AND m1.direction = m2.direction
     AND m1.message_type = m2.message_type
     AND IFNULL(m1.content, '') = IFNULL(m2.content, '')
     AND IFNULL(m1.media_url, '') = IFNULL(m2.media_url, '')
     AND m1.created_at = m2.created_at
     AND m1.id > m2.id
  `

  const duplicateCount = Number(duplicates[0]?.duplicate_count || 0)
  console.log(`Found ${duplicateCount} duplicate rows`)

  if (duplicateCount === 0) {
    return
  }

  const deleted = await prisma.$executeRaw`
    DELETE m1
    FROM inbox_messages m1
    JOIN inbox_messages m2
      ON m1.user_id = m2.user_id
     AND IFNULL(m1.line_account_id, 0) = IFNULL(m2.line_account_id, 0)
     AND m1.direction = m2.direction
     AND m1.message_type = m2.message_type
     AND IFNULL(m1.content, '') = IFNULL(m2.content, '')
     AND IFNULL(m1.media_url, '') = IFNULL(m2.media_url, '')
     AND m1.created_at = m2.created_at
     AND m1.id > m2.id
  `

  console.log(`✅ Deleted ${Number(deleted)} duplicate rows`)
}

run()
  .catch((error) => {
    console.error('Failed to remove duplicates:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
