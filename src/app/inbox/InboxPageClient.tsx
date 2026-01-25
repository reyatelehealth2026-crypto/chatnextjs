"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Menu, ArrowLeft } from 'lucide-react'
import { ConversationList } from '@/components/inbox/ConversationList'
import { ChatPanel } from '@/components/inbox/ChatPanel'
import { useRealtime } from '@/hooks/use-realtime'
import { useInboxFilterSync } from '@/hooks/use-inbox-filter-sync'
import { useInboxStore } from '@/stores/inbox'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CustomerProfile = dynamic(
  () => import('@/components/inbox/CustomerProfile').then((mod) => mod.CustomerProfile),
  {
    ssr: false,
    loading: () => (
      <div className="w-80 border-l bg-card p-4 space-y-4">
        <div className="h-20 w-20 rounded-full bg-muted mx-auto" />
        <div className="h-5 w-32 bg-muted mx-auto rounded" />
        <div className="h-4 w-24 bg-muted mx-auto rounded" />
        <div className="h-24 w-full bg-muted rounded" />
      </div>
    ),
  }
)

export default function InboxPageClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const {
    isSidebarOpen,
    isProfileOpen,
    selectedConversationId,
    setSelectedConversation,
    setProfileOpen,
  } = useInboxStore()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'profile'>('list')

  useInboxFilterSync()

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle mobile view changes when conversation is selected
  useEffect(() => {
    if (isMobile && selectedConversationId) {
      setMobileView('chat')
    }
  }, [isMobile, selectedConversationId])

  // Set up real-time connection
  const { error } = useRealtime({
    enabled: status === 'authenticated',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const handleBackToList = () => {
    setMobileView('list')
    setSelectedConversation(null)
  }

  const handleShowProfile = () => {
    if (isMobile) {
      setMobileView('profile')
    } else {
      setProfileOpen(!isProfileOpen)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b bg-card">
          {mobileView === 'list' ? (
            <>
              <h1 className="font-semibold text-lg">แชท</h1>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </>
          ) : mobileView === 'chat' ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleBackToList}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium">แชท</span>
              <Button variant="ghost" size="icon" onClick={handleShowProfile}>
                <Menu className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => setMobileView('chat')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium">ข้อมูลลูกค้า</span>
              <div className="w-10" />
            </>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'list' && <ConversationList />}
          {mobileView === 'chat' && <ChatPanel />}
          {mobileView === 'profile' && <CustomerProfile />}
        </div>

        {/* Connection indicator */}
        {error && (
          <div className="fixed bottom-4 left-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg text-center text-sm">
            การเชื่อมต่อขาดหาย กำลังเชื่อมต่อใหม่...
          </div>
        )}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Conversation List */}
      <div
        className={cn(
          'flex-shrink-0 border-r transition-all duration-300',
          isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        )}
      >
        <ConversationList />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 min-w-0">
        <ChatPanel />
      </div>

      {/* Customer Profile */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-300 hidden lg:block',
          isProfileOpen ? 'w-80' : 'w-0 overflow-hidden'
        )}
      >
        <CustomerProfile />
      </div>

      {/* Real-time connection indicator */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg">
          การเชื่อมต่อขาดหาย กำลังเชื่อมต่อใหม่...
        </div>
      )}
    </div>
  )
}
