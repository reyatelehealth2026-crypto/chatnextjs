"use client"

import { useState } from 'react'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Star,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Pin,
  Trash2
} from 'lucide-react'
import { useCustomerProfile } from '@/hooks/use-customer-profile'
import { useAssignConversation, useUnassignConversation } from '@/hooks/use-conversations'
import { useAdmins } from '@/hooks/use-admins'
import { useTags, useAssignTag, useRemoveTag } from '@/hooks/use-tags'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-notes'
import { useInboxStore } from '@/stores/inbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { LineUser, UserTag, CustomerNote, AdminUser } from '@/types'

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

function AssigneeSelector({
  userId,
  assignees,
}: {
  userId: string
  assignees: AdminUser[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: admins = [] } = useAdmins()
  const assignConversation = useAssignConversation()
  const unassignConversation = useUnassignConversation()

  const assignedIds = new Set(assignees.map((admin) => admin.id))
  const availableAdmins = admins.filter((admin) => !assignedIds.has(admin.id))

  const handleAssign = async (adminId: string) => {
    await assignConversation.mutateAsync({ userId, adminId })
    setIsOpen(false)
  }

  const handleRemove = async (adminId: string) => {
    await unassignConversation.mutateAsync({ userId, adminId })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {assignees.map((admin) => (
          <Badge key={admin.id} variant="secondary" className="gap-1 pr-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={admin.avatarUrl || undefined} />
              <AvatarFallback className="text-[9px]">
                {getInitials(admin.displayName || admin.username)}
              </AvatarFallback>
            </Avatar>
            {admin.displayName || admin.username}
            <button
              onClick={() => handleRemove(admin.id)}
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
          onClick={() => setIsOpen((open) => !open)}
        >
          <Plus className="h-3 w-3 mr-1" />
          เพิ่มผู้ดูแล
          {isOpen ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </div>

      {isOpen && availableAdmins.length > 0 && (
        <div className="border rounded-md p-2 space-y-1 bg-card">
          {availableAdmins.map((admin) => (
            <button
              key={admin.id}
              onClick={() => handleAssign(admin.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={admin.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(admin.displayName || admin.username)}
                </AvatarFallback>
              </Avatar>
              <span>{admin.displayName || admin.username}</span>
            </button>
          ))}
          {availableAdmins.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">ไม่มีผู้ดูแลเพิ่มเติม</p>
          )}
        </div>
      )}
    </div>
  )
}

function NotesSection({ userId }: { userId: string }) {
  const { data: notes, isLoading } = useNotes(userId)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const [newNote, setNewNote] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleCreate = async () => {
    if (!newNote.trim()) return
    await createNote.mutateAsync({ userId, content: newNote })
    setNewNote('')
    setIsAdding(false)
  }

  return (
    <div className="space-y-3">
      {/* Add Note Button */}
      {!isAdding && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-2" />
          เพิ่มโน้ต
        </Button>
      )}

      {/* New Note Form */}
      {isAdding && (
        <div className="space-y-2">
          <Textarea 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="เขียนโน้ต..."
            className="text-sm min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(false)}>ยกเลิก</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newNote.trim()}>บันทึก</Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2">
        {notes?.map((note) => (
          <div key={note.id} className="bg-muted/50 p-2 rounded-md text-sm group relative">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                   <AvatarImage src={note.admin?.avatarUrl || undefined} />
                   <AvatarFallback className="text-[9px]">{getInitials(note.admin?.displayName || 'A')}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-muted-foreground">
                  {note.admin?.displayName || 'Admin'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                   • {formatDate(note.createdAt)}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-muted/50 rounded p-0.5">
                <button 
                  onClick={() => updateNote.mutateAsync({ id: note.id, userId, isPinned: !note.isPinned })}
                  className={cn("p-1 hover:bg-muted rounded", note.isPinned && "text-primary")}
                  title={note.isPinned ? "เลิกปักหมุด" : "ปักหมุด"}
                >
                  <Pin className="h-3 w-3" fill={note.isPinned ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => deleteNote.mutateAsync({ id: note.id, userId })}
                  className="p-1 hover:bg-destructive/10 text-destructive rounded"
                  title="ลบ"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-xs">{note.content}</p>
            {note.isPinned && (
              <Badge variant="secondary" className="mt-2 text-[10px] h-4 gap-1 px-1.5">
                <Pin className="h-2 w-2" fill="currentColor" /> Pinned
              </Badge>
            )}
          </div>
        ))}
      </div>
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
  const { data: profile, isLoading } = useCustomerProfile(selectedConversationId)

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

  const user = profile?.user as LineUser | undefined
  const tags = profile?.tags || []
  const assignees = profile?.assignees || []
  const points = profile?.points
  const tierLabel = user?.tier ? user.tier.toUpperCase() : 'STANDARD'

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
            {tierLabel}
          </Badge>
          <Badge variant="outline">{user.points} คะแนน</Badge>
        </div>
      </div>

      {/* Tags section */}
      <ProfileSection title="แท็ก">
        <TagSelector userId={user.id} currentTags={tags} />
      </ProfileSection>

      {/* Assignees section */}
      <ProfileSection title="ผู้ดูแล">
        <AssigneeSelector userId={user.id} assignees={assignees} />
      </ProfileSection>

      {/* Notes section */}
      <ProfileSection title="โน้ต">
        <NotesSection userId={user.id} />
      </ProfileSection>

      {/* Contact info */}
      <ProfileSection title="ข้อมูลติดต่อ">
        <div className="space-y-1">
          <InfoRow icon={Phone} label="เบอร์โทร" value={user.phone} />
          <InfoRow icon={Mail} label="อีเมล" value={user.email} />
          <InfoRow 
            icon={MapPin} 
            label="ที่อยู่" 
            value={
              user.address
                ? `${user.address}${user.district ? `, ${user.district}` : ''}${
                    user.province ? `, ${user.province}` : ''
                  }${user.postalCode ? ` ${user.postalCode}` : ''}`
                : null
            } 
          />
          <InfoRow 
            icon={Calendar} 
            label="วันเกิด" 
            value={user.birthDate ? formatDate(user.birthDate) : null} 
          />
        </div>
      </ProfileSection>

      {/* Membership */}
      <ProfileSection title="สมาชิก">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">รหัสสมาชิก</span>
            <span>{user.memberId || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ระดับสมาชิก</span>
            <span>{user.membershipLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">สถานะการลงทะเบียน</span>
            <span>{user.isRegistered ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</span>
          </div>
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

      {/* Points */}
      <ProfileSection title="คะแนนสะสม">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">
              {points?.available ?? user.points}
            </div>
            <div className="text-xs text-muted-foreground">ใช้ได้</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">{points?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">สะสมทั้งหมด</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">{points?.used ?? 0}</div>
            <div className="text-xs text-muted-foreground">ใช้ไปแล้ว</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-primary">{points?.loyalty ?? 0}</div>
            <div className="text-xs text-muted-foreground">Loyalty</div>
          </Card>
        </div>
      </ProfileSection>

      {/* Health profile */}
      <ProfileSection title="ข้อมูลสุขภาพ" defaultOpen={false}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">น้ำหนัก</span>
            <span>{user.weight ? `${user.weight} กก.` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ส่วนสูง</span>
            <span>{user.height ? `${user.height} ซม.` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">BMI</span>
            <span>
              {user.weight && user.height
                ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(1)
                : '-'}
            </span>
          </div>
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
