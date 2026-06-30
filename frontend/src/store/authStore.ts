import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user) => set({ user, token: user.accessToken, refreshToken: user.refreshToken, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'hms-auth' },
  ),
)
