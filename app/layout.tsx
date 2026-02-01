import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import { Toaster } from '@/components/ui/toaster'
import { SessionExpiryWarning } from '@/components/providers/session-expiry-warning'
import { OfflineProvider } from '@/components/providers/offline-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AccessibilityProvider } from '@/components/providers/accessibility-provider'
import { ShortcutsModal } from '@/components/ui/shortcuts-modal'
import { PerformancePrefetch } from '@/components/inbox/performance-prefetch'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Standalone Inbox System',
  description: 'Modern customer communication management platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AccessibilityProvider>
            <OfflineProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              <PerformancePrefetch />
              <ShortcutsModal />
              <SessionExpiryWarning />
              <Toaster />
            </OfflineProvider>
          </AccessibilityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
