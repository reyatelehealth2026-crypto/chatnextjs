'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AccessibilityState = {
  highContrast: boolean
  textScale: 'normal' | 'large'
  reduceMotion: boolean
  shortcutsOpen: boolean
}

type AccessibilityContextType = AccessibilityState & {
  setHighContrast: (v: boolean) => void
  setTextScale: (v: 'normal' | 'large') => void
  setReduceMotion: (v: boolean) => void
  openShortcuts: () => void
  closeShortcuts: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

const STORAGE_KEY = 'accessibility-settings'

function loadSettings(): AccessibilityState {
  if (typeof localStorage === 'undefined') {
    return { highContrast: false, textScale: 'normal', reduceMotion: false, shortcutsOpen: false }
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      highContrast: !!parsed.highContrast,
      textScale: parsed.textScale === 'large' ? 'large' : 'normal',
      reduceMotion: !!parsed.reduceMotion,
      shortcutsOpen: false,
    }
  } catch {
    return { highContrast: false, textScale: 'normal', reduceMotion: false, shortcutsOpen: false }
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => loadSettings())

  useEffect(() => {
    const body = document.body
    body.dataset.contrast = state.highContrast ? 'high' : 'normal'
    body.dataset.textScale = state.textScale
    body.dataset.reduceMotion = state.reduceMotion ? 'yes' : 'no'
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          highContrast: state.highContrast,
          textScale: state.textScale,
          reduceMotion: state.reduceMotion,
        })
      )
    }
  }, [state.highContrast, state.textScale, state.reduceMotion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.shiftKey && e.key === '?') || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setState((s) => ({ ...s, shortcutsOpen: true }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo<AccessibilityContextType>(
    () => ({
      ...state,
      setHighContrast: (v) => setState((s) => ({ ...s, highContrast: v })),
      setTextScale: (v) => setState((s) => ({ ...s, textScale: v })),
      setReduceMotion: (v) => setState((s) => ({ ...s, reduceMotion: v })),
      openShortcuts: () => setState((s) => ({ ...s, shortcutsOpen: true })),
      closeShortcuts: () => setState((s) => ({ ...s, shortcutsOpen: false })),
    }),
    [state]
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}

