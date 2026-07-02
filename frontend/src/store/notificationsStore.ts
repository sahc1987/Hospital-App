import { create } from 'zustand'

export type NotifType = 'success' | 'error' | 'info' | 'warning'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  message?: string
  timestamp: Date
  read: boolean
}

interface NotificationsState {
  items: AppNotification[]
  add: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],

  add: (n) =>
    set((s) => ({
      items: [
        {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
          read: false,
        },
        // keep only the last 30 notifications
        ...s.items.slice(0, 29),
      ],
    })),

  markRead: (id) =>
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllRead: () =>
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),

  clear: () => set({ items: [] }),
}))
