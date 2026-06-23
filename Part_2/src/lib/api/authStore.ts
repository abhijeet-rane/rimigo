import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
    id: string
    phone_number: string
    country_code: string
}

export interface AuthState {
    isAuthenticated: boolean
    user: User | null
    token: string | null
    setAuth: (user: User, token: string) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            token: null,
            setAuth: (user: User, token: string) => set({ isAuthenticated: true, user, token }),
            clearAuth: () => set({ isAuthenticated: false, user: null, token: null })
        }),
        {
            name: 'auth-storage'
        }
    )
)
