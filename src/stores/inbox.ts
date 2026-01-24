import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface ConversationFilters {
  status?: 'all' | 'active' | 'pending' | 'resolved'
  tagId?: string
  assignedTo?: string
  search?: string
  unreadOnly?: boolean
}

interface InboxState {
  // Selected conversation
  selectedConversationId: string | null
  
  // Filters
  filters: ConversationFilters
  
  // UI State
  isSidebarOpen: boolean
  isProfileOpen: boolean
  
  // Actions
  setSelectedConversation: (id: string | null) => void
  setFilters: (filters: Partial<ConversationFilters>) => void
  resetFilters: () => void
  toggleSidebar: () => void
  toggleProfile: () => void
  setSidebarOpen: (open: boolean) => void
  setProfileOpen: (open: boolean) => void
}

const defaultFilters: ConversationFilters = {
  status: 'all',
  tagId: undefined,
  assignedTo: undefined,
  search: '',
  unreadOnly: false,
}

export const useInboxStore = create<InboxState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        selectedConversationId: null,
        filters: defaultFilters,
        isSidebarOpen: true,
        isProfileOpen: true,

        // Actions
        setSelectedConversation: (id) =>
          set({ selectedConversationId: id }, false, 'setSelectedConversation'),

        setFilters: (newFilters) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'setFilters'
          ),

        resetFilters: () =>
          set({ filters: defaultFilters }, false, 'resetFilters'),

        toggleSidebar: () =>
          set(
            (state) => ({ isSidebarOpen: !state.isSidebarOpen }),
            false,
            'toggleSidebar'
          ),

        toggleProfile: () =>
          set(
            (state) => ({ isProfileOpen: !state.isProfileOpen }),
            false,
            'toggleProfile'
          ),

        setSidebarOpen: (open) =>
          set({ isSidebarOpen: open }, false, 'setSidebarOpen'),

        setProfileOpen: (open) =>
          set({ isProfileOpen: open }, false, 'setProfileOpen'),
      }),
      {
        name: 'inbox-store',
        partialize: (state) => ({
          filters: state.filters,
          isSidebarOpen: state.isSidebarOpen,
          isProfileOpen: state.isProfileOpen,
        }),
      }
    ),
    { name: 'InboxStore' }
  )
)
