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

async function addMediaUrlColumn() {
  console.log('🚀 Adding media_url column to messages table...\n')

  try {
    // ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่
    const result = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'media_url'
    `

    if (result.length > 0) {
      console.log('✅ Column media_url already exists in messages table')
      return
    }

    // เพิ่มคอลัมน์ media_url
    console.log('📝 Adding media_url column...')
    await prisma.$executeRaw`
      ALTER TABLE \`messages\` ADD COLUMN \`media_url\` TEXT NULL
    `

    console.log('✅ Successfully added media_url column to messages table')
  } catch (error) {
    console.error('❌ Error adding media_url column:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addMediaUrlColumn()
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
