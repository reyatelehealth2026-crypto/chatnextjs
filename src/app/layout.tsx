import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { WebVitals } from '@/components/WebVitals'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inbox - LINE CRM Pharmacy',
  description: 'Modern inbox system for LINE CRM Pharmacy',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#00B900',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={inter.className}>
        <WebVitals />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
