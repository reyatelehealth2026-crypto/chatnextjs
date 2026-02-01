'use client'

import { useAccessibility } from '@/components/providers/accessibility-provider'

const shortcuts = [
  { keys: 'Shift + ?', desc: 'Open shortcuts help' },
  { keys: 'Ctrl/Cmd + K', desc: 'Open shortcuts help' },
  { keys: 'g then c', desc: 'Go to Conversations' },
  { keys: 'g then a', desc: 'Go to Analytics' },
  { keys: '/', desc: 'Focus search field (when available)' },
]

export function ShortcutsModal() {
  const { shortcutsOpen, closeShortcuts } = useAccessibility()
  if (!shortcutsOpen) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={closeShortcuts}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            aria-label="Close shortcuts"
            className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            onClick={closeShortcuts}
          >
            Esc
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between rounded border px-3 py-2">
              <span className="text-sm text-gray-900">{s.desc}</span>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {s.keys}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

