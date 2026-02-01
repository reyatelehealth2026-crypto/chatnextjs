import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/debug/line-account
 * 
 * Debug endpoint to check LineAccount configuration
 */
export async function GET() {
    try {
        const lineAccounts = await prisma.lineAccount.findMany({
            select: {
                id: true,
                name: true,
                lineChannelId: true,
                createdAt: true,
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        conversations: true,
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            count: lineAccounts.length,
            lineAccounts,
            expectedChannelId: process.env.LINE_CHANNEL_ID || 'NOT_SET',
        })
    } catch (error: any) {
        console.error('Debug error:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 })
    }
}

/**
 * POST /api/debug/line-account
 * 
 * Update LineAccount with correct Channel ID from environment
 */
export async function POST(request: NextRequest) {
    try {
        const channelId = process.env.LINE_CHANNEL_ID
        const channelSecret = process.env.LINE_CHANNEL_SECRET
        const accessToken = process.env.LINE_ACCESS_TOKEN

        if (!channelId || !channelSecret || !accessToken) {
            return NextResponse.json({
                success: false,
                error: 'LINE environment variables not set',
                missing: {
                    LINE_CHANNEL_ID: !channelId,
                    LINE_CHANNEL_SECRET: !channelSecret,
                    LINE_ACCESS_TOKEN: !accessToken,
                }
            }, { status: 400 })
        }

        // Find first LineAccount and update it
        const existing = await prisma.lineAccount.findFirst()

        if (!existing) {
            // Create new LineAccount
            const newAccount = await prisma.lineAccount.create({
                data: {
                    name: 'Default Account',
                    lineChannelId: channelId,
                    lineChannelSecret: channelSecret,
                    lineAccessToken: accessToken,
                }
            })
            return NextResponse.json({
                success: true,
                action: 'created',
                lineAccount: {
                    id: newAccount.id,
                    name: newAccount.name,
                    lineChannelId: newAccount.lineChannelId,
                }
            })
        }

        // Update existing LineAccount
        const updated = await prisma.lineAccount.update({
            where: { id: existing.id },
            data: {
                lineChannelId: channelId,
                lineChannelSecret: channelSecret,
                lineAccessToken: accessToken,
            }
        })

        return NextResponse.json({
            success: true,
            action: 'updated',
            previous: {
                lineChannelId: existing.lineChannelId,
            },
            current: {
                id: updated.id,
                name: updated.name,
                lineChannelId: updated.lineChannelId,
            }
        })
    } catch (error: any) {
        console.error('Debug error:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 })
    }
}
