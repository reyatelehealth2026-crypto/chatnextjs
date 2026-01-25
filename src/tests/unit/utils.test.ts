import { describe, expect, it } from 'vitest'
import { formatFileSize, generateId, getInitials, truncate } from '@/lib/utils'

describe('utils', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
    expect(truncate('short', 10)).toBe('short')
  })

  it('generates uppercase initials from names', () => {
    expect(getInitials('Jane Doe')).toBe('JD')
    expect(getInitials('single')).toBe('SI')
    expect(getInitials('  ')).toBe('?')
  })

  it('formats file sizes in human readable units', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('generates non-empty ids', () => {
    const first = generateId()
    const second = generateId()
    expect(first).not.toEqual('')
    expect(second).not.toEqual('')
    expect(first).not.toEqual(second)
  })
})
