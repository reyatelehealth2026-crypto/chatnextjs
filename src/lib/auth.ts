import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "./prisma"

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
if (!authSecret) {
  throw new Error(
    "Missing AUTH_SECRET (recommended) or NEXTAUTH_SECRET environment variable"
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const adminUser = await prisma.adminUser.findUnique({
            where: { username: credentials.username as string },
            include: {
              lineAccount: true,
            },
          })

          if (!adminUser || !adminUser.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            adminUser.password
          )

          if (!isPasswordValid) {
            return null
          }

          // Update last login
          await prisma.adminUser.update({
            where: { id: adminUser.id },
            data: { lastLogin: new Date() },
          })

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.displayName || adminUser.username,
            image: adminUser.avatarUrl,
            role: adminUser.role,
            lineAccountId: adminUser.lineAccountId,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.lineAccountId = (user as any).lineAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.lineAccountId = token.lineAccountId as number | null
      }
      return session
    },
  },
})

// Type augmentation for next-auth
declare module "next-auth" {
  interface User {
    role?: string
    lineAccountId?: number | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: string
      lineAccountId: number | null
    }
  }
}
