import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: th })
}

export function formatMessageTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(d)) {
    return format(d, 'HH:mm')
  }
  
  if (isYesterday(d)) {
    return `เมื่อวาน ${format(d, 'HH:mm')}`
  }
  
  return format(d, 'd MMM HH:mm', { locale: th })
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMMM yyyy', { locale: th })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getInitials(name: string): string {
  if (name === null || name === undefined) return '?'
  const safeName = String(name).trim()
  if (!safeName) return '?'
  const parts = safeName.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0]
  const second = parts[1]?.[0]
  if (first && second) {
    return `${first}${second}`.toUpperCase()
  }
  return safeName.slice(0, 2).toUpperCase()
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getMessageTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    text: '💬',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    file: '📎',
    location: '📍',
    sticker: '😊',
    flex: '📋',
  }
  return icons[type] || '💬'
}
