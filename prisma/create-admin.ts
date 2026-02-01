/**
 * Simple Prisma Client for scripts (works with Prisma Accelerate)
 */
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// For Prisma Accelerate, use PrismaClient without adapter
const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2] || 'admin@example.com'
    const password = process.argv[3] || 'admin123'
    const name = process.argv[4] || 'Admin User'

    console.log('Creating admin user...')
    console.log(`Email: ${email}`)
    console.log(`Name: ${name}`)

    // Hash the password
    const hashedPassword = await hash(password, 12)

    // Create or update user
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            password: hashedPassword,
            role: 'ADMIN',
        },
        create: {
            email,
            name,
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log('\n✅ Admin user created successfully!')
    console.log('-----------------------------------')
    console.log(`ID: ${user.id}`)
    console.log(`Email: ${user.email}`)
    console.log(`Name: ${user.name}`)
    console.log(`Role: ${user.role}`)
    console.log('-----------------------------------')
    console.log(`\nYou can now login at http://localhost:3000/auth/signin`)
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
}

main()
    .catch((e) => {
        console.error('Error creating user:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
