import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 15 * 60, // Refresh expiry at most every 15 minutes on activity
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
          include: {
            lineAccount: true,
          },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lineAccountId: user.lineAccountId,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    // JWT callback - persist user data in the token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.lineAccountId = (user as any).lineAccountId
      }
      return token
    },
    // For JWT sessions, NextAuth provides `token`
    async session({ session, token }) {
      if (session.user) {
        if (token?.id) session.user.id = String(token.id)
        if (token?.role) session.user.role = token.role as any
        if (token?.lineAccountId) session.user.lineAccountId = String(token.lineAccountId)
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful sign-in
      console.log(`User signed in: ${user.email}`)
    },
    async signOut() {
      // Log sign-out
      console.log(`User signed out`)
    },
  },
}

/**
 * Check if the user has the required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}
