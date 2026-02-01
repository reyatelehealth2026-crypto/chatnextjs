import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function GET() {
    try {
        // Check if any admin exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        })

        if (existingAdmin) {
            return NextResponse.json({
                success: false,
                message: 'Admin user already exists',
                email: existingAdmin.email,
            })
        }

        // First, check if LineAccount exists, if not create one
        let lineAccount = await prisma.lineAccount.findFirst()

        if (!lineAccount) {
            // Create a default LineAccount using the LINE credentials from env
            lineAccount = await prisma.lineAccount.create({
                data: {
                    name: 'Default Account',
                    lineChannelId: process.env.LINE_CHANNEL_ID || 'default-channel',
                    lineChannelSecret: process.env.LINE_CHANNEL_SECRET || 'secret',
                    lineAccessToken: process.env.LINE_ACCESS_TOKEN || 'token',
                }
            })
        }

        // Create admin user with lineAccountId
        const hashedPassword = await hash('admin123', 12)

        const admin = await prisma.user.create({
            data: {
                email: 'admin@inbox.local',
                name: 'Admin',
                password: hashedPassword,
                role: 'ADMIN',
                lineAccountId: lineAccount.id,
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Admin user created successfully!',
            credentials: {
                email: 'admin@inbox.local',
                password: 'admin123',
            },
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
            },
            lineAccount: {
                id: lineAccount.id,
                name: lineAccount.name,
            }
        })
    } catch (error: any) {
        console.error('Setup error:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 })
    }
}
