import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface ConversationFilters {
  status?: 'all' | 'active' | 'pending' | 'resolved'
  tagId?: string
  tagIds?: string[]
  assignedTo?: string
  assignedToIds?: string[]
  search?: string
  unreadOnly?: boolean
  startDate?: string
  endDate?: string
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
  setAllFilters: (filters: ConversationFilters) => void
  resetFilters: () => void
  toggleSidebar: () => void
  toggleProfile: () => void
  setSidebarOpen: (open: boolean) => void
  setProfileOpen: (open: boolean) => void
}

const defaultFilters: ConversationFilters = {
  status: 'all',
  tagId: undefined,
  tagIds: undefined,
  assignedTo: undefined,
  assignedToIds: undefined,
  search: '',
  unreadOnly: false,
  startDate: undefined,
  endDate: undefined,
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

        setAllFilters: (filters) =>
          set({ filters }, false, 'setAllFilters'),

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
