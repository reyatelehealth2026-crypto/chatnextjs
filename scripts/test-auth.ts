import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuth() {
  console.log('Testing authentication...')
  
  const username = 'admin'
  const password = 'password123'
  
  const adminUser = await prisma.adminUser.findUnique({
    where: { username },
  })
  
  if (!adminUser) {
    console.log('❌ User not found')
    return
  }
  
  console.log('✅ User found:', adminUser.username)
  console.log('   Email:', adminUser.email)
  console.log('   Is Active:', adminUser.isActive)
  console.log('   Password hash:', adminUser.password.substring(0, 20) + '...')
  
  // Test password comparison
  const isValid = await bcrypt.compare(password, adminUser.password)
  console.log('   Password valid:', isValid)
  
  // Test with new hash
  if (!isValid) {
    console.log('\n⚠️  Password hash mismatch. Creating new hash...')
    const newHash = await bcrypt.hash(password, 10)
    console.log('   New hash:', newHash.substring(0, 20) + '...')
    
    // Update password
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { password: newHash },
    })
    console.log('✅ Password updated')
    
    // Test again
    const isValidAfter = await bcrypt.compare(password, newHash)
    console.log('   Password valid after update:', isValidAfter)
  }
}

testAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
