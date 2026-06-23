export interface User {
    id: string
    email: string | null
    displayName: string | null
    phone: string | null
    photoURL: string | null
    emailVerified: boolean
    provider: AuthProvider
    createdAt: Date
    idToken: string | null
    expiresIn: string | null
}

export type AuthProvider = 'email' | 'google' | 'apple'

export interface AuthState {
    user: User | null
    isLoading: boolean
    isInitialized: boolean
    actionLoading: boolean
    error: string | null
}

export interface SignInCredentials {
    email: string
    password: string
}

export interface AuthError {
    code: string
    message: string
    userMessage: string
}
export interface BaseUser {
    name: string // maps to traveler_id
    travelerId: string // maps to name
}
