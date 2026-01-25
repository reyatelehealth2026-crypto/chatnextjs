import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// โหลด .env file โดยตรง
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  const envLocalPath = resolve(process.cwd(), '.env.local')
  
  let envContent = ''
  let envLocalContent = ''
  
  try {
    envContent = readFileSync(envPath, 'utf-8')
  } catch (error) {
    // Ignore if .env doesn't exist
  }
  
  try {
    envLocalContent = readFileSync(envLocalPath, 'utf-8')
  } catch (error) {
    // Ignore if .env.local doesn't exist
  }
  
  const allEnv = envContent + '\n' + envLocalContent
  allEnv.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // ลบ quote marks (ทั้ง single และ double quotes) - ต้องลบทั้งคู่
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

loadEnv()

// Force ลบ quote marks จาก DATABASE_URL
if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL.trim()
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1)
  }
  process.env.DATABASE_URL = dbUrl
}

// Debug: ตรวจสอบว่า DATABASE_URL ถูกโหลดหรือไม่
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!')
  process.exit(1)
}
console.log('DATABASE_URL:', process.env.DATABASE_URL.substring(0, 30) + '...')

const prisma = new PrismaClient()

async function checkAndAddColumn(columnName: string, columnType: string) {
  try {
    // ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่
    const result = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = ${columnName}
    `

    if (result.length > 0) {
      console.log(`✅ Column ${columnName} already exists in messages table`)
      return false
    }

    // เพิ่มคอลัมน์
    console.log(`📝 Adding ${columnName} column...`)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`messages\` ADD COLUMN \`${columnName}\` ${columnType} NULL`
    )

    console.log(`✅ Successfully added ${columnName} column to messages table`)
    return true
  } catch (error) {
    console.error(`❌ Error adding ${columnName} column:`, error)
    throw error
  }
}

async function addMissingColumns() {
  console.log('🚀 Checking and adding missing columns to messages table...\n')

  try {
    const changes: boolean[] = []

    // กำหนดคอลัมน์ทั้งหมดที่ต้องเช็คและเพิ่ม (ตาม Prisma schema)
    const columnsToCheck = [
      { name: 'media_url', type: 'TEXT' },
      { name: 'metadata', type: 'LONGTEXT' },
      { name: 'reply_to_id', type: 'INT NULL' },
      { name: 'reply_token', type: 'VARCHAR(255) NULL' },
      { name: 'sent_by', type: 'VARCHAR(255) NULL' },
      { name: 'is_read', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'message_type', type: 'VARCHAR(50)' },
      { name: 'line_account_id', type: 'INT NULL' },
      { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    ]

    // เช็คและเพิ่มคอลัมน์ทั้งหมด
    for (const column of columnsToCheck) {
      const added = await checkAndAddColumn(column.name, column.type)
      changes.push(added)
    }

    if (changes.some(c => c)) {
      console.log('\n✨ Migration completed successfully!')
    } else {
      console.log('\n✨ All columns already exist, no changes needed.')
    }
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addMissingColumns()
  .then(() => {
    console.log('\n✨ Migration check completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    // ในกรณีที่เกิด error ให้ log แต่ไม่ exit ด้วย error code
    // เพื่อให้ build process ยังทำงานต่อได้
    console.error('\n⚠️  Migration check failed (non-blocking):', error)
    console.log('Continuing with build...')
    process.exit(0)
  })
