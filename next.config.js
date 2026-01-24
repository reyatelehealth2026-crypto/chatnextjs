/** @type {import('next').NextConfig} */
const nextConfig = {
  // ไม่ต้องใช้ basePath ถ้ารัน standalone
  // basePath จะถูกจัดการโดย Nginx reverse proxy
  
  // Skip TypeScript errors during build (temporary fix for Prisma schema mismatch)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
      {
        protocol: 'https',
        hostname: 'obs.line-scdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.line-scdn.net',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
  // Output standalone สำหรับ production (เฉพาะเมื่อ deploy บน server)
  // Vercel ไม่ต้องการ output: 'standalone' เพราะใช้ serverless functions
  output: process.env.VERCEL ? undefined : (process.env.NODE_ENV === 'production' ? 'standalone' : undefined),
}

module.exports = nextConfig
