"use client"

import { useState } from 'react'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Tag, 
  ShoppingBag, 
  Star,
  Plus,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useConversation } from '@/hooks/use-conversations'
import { useTags, useAssignTag, useRemoveTag } from '@/hooks/use-tags'
import { useInboxStore } from '@/stores/inbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { LineUser, UserTag } from '@/types'

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  )
}

function TagSelector({ 
  userId, 
  currentTags 
}: { 
  userId: string
  currentTags: UserTag[] 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: allTags } = useTags()
  const assignTag = useAssignTag()
  const removeTag = useRemoveTag()

  const currentTagIds = new Set(currentTags.map((t) => t.id))
  const availableTags = allTags?.filter((t) => !currentTagIds.has(t.id)) || []

  const handleAssign = async (tagId: string) => {
    await assignTag.mutateAsync({ userId, tagId })
  }

  const handleRemove = async (tagId: string) => {
    await removeTag.mutateAsync({ userId, tagId })
  }

  return (
    <div className="space-y-2">
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-1 pr-1"
            style={{ borderColor: tag.color, color: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Plus className="h-3 w-3 mr-1" />
          เพิ่มแท็ก
          {isOpen ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </div>

      {/* Tag selector dropdown */}
      {isOpen && availableTags.length > 0 && (
        <div className="border rounded-md p-2 space-y-1 bg-card">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleAssign(tag.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileSection({ 
  title, 
  children,
  defaultOpen = true 
}: { 
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function CustomerProfile() {
  const { selectedConversationId, isProfileOpen } = useInboxStore()
  const { data: conversation, isLoading } = useConversation(selectedConversationId)

  if (!isProfileOpen || !selectedConversationId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="w-80 border-l bg-card p-4 space-y-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-5 w-32 mt-3" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const user = conversation?.user as LineUser | undefined

  if (!user) {
    return (
      <div className="w-80 border-l bg-card flex items-center justify-center">
        <p className="text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
      </div>
    )
  }

  return (
    <ScrollArea className="w-80 border-l bg-card">
      {/* Profile header */}
      <div className="p-4 border-b text-center">
        <Avatar className="h-20 w-20 mx-auto">
          <AvatarImage src={user.pictureUrl || undefined} />
          <AvatarFallback className="text-2xl">
            {getInitials(user.displayName || 'U')}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg mt-3">
          {user.displayName || user.firstName || 'ไม่ระบุชื่อ'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {user.statusMessage || 'ไม่มีสถานะ'}
        </p>
        
        {/* Membership badge */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant={user.tier === 'gold' ? 'default' : 'secondary'}>
            <Star className="h-3 w-3 mr-1" />
            {user.tier.toUpperCase()}
          </Badge>
          <Badge variant="outline">{user.points} คะแนน</Badge>
        </div>
      </div>

      {/* Tags section */}
      <ProfileSection title="แท็ก">
        <TagSelector userId={user.id} currentTags={conversation?.tags || []} />
      </ProfileSection>

      {/* Contact info */}
      <ProfileSection title="ข้อมูลติดต่อ">
        <div className="space-y-1">
          <InfoRow icon={Phone} label="เบอร์โทร" value={user.phone} />
          <InfoRow icon={Mail} label="อีเมล" value={user.email} />
          <InfoRow 
            icon={MapPin} 
            label="ที่อยู่" 
            value={user.address ? `${user.address}, ${user.province}` : null} 
          />
          <InfoRow 
            icon={Calendar} 
            label="วันเกิด" 
            value={user.birthDate ? formatDate(user.birthDate) : null} 
          />
        </div>
      </ProfileSection>

      {/* Purchase history */}
      <ProfileSection title="ประวัติการซื้อ">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">
              {user.orderCount}
            </div>
            <div className="text-xs text-muted-foreground">ออเดอร์</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">
              ฿{user.totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">ยอดรวม</div>
          </Card>
        </div>
      </ProfileSection>

      {/* Activity */}
      <ProfileSection title="กิจกรรม" defaultOpen={false}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">สมัครสมาชิก</span>
            <span>{user.isRegistered ? 'ใช่' : 'ไม่'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ติดตามครั้งแรก</span>
            <span>{formatDate(user.createdAt)}</span>
          </div>
          {user.lastInteraction && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ใช้งานล่าสุด</span>
              <span>{formatDate(user.lastInteraction)}</span>
            </div>
          )}
        </div>
      </ProfileSection>
    </ScrollArea>
  )
}
