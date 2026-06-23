import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '@/services/firebase/authService'
import { matchPath } from 'react-router-dom'

import { BaseUser, User } from '@/types/authTypes/authTypes'

import { TokenStorage } from '@/lib/api/tokenStorage'

import apiClient from '@/lib/api/apiClient'
import { routes } from '@/routes/routes'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface AuthState {
    user: User | null | BaseUser
    isLoading: boolean
    isInitialized: boolean
    actionLoading: boolean
    error: string | null
}

export interface OtpVerificationResult {
    success: boolean
    responseCode: OtpResponseCode
    message: string
    data: any | null
}

export enum OtpResponseCode {
    SUCCESS = 'SUCCESS',
    INVALID_CODE = 'INVALID_CODE',
    CODE_EXPIRED = 'CODE_EXPIRED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export const OtpResponseMessages: Record<OtpResponseCode, string> = {
    [OtpResponseCode.SUCCESS]: 'OTP verified successfully',
    [OtpResponseCode.INVALID_CODE]: 'Invalid OTP code. Please check and try again.',
    [OtpResponseCode.CODE_EXPIRED]: 'OTP code has expired. Please request a new code.',
    [OtpResponseCode.SESSION_EXPIRED]: 'Verification session has expired. Please start again.',
    [OtpResponseCode.INTERNAL_SERVER_ERROR]: 'Oops! Something went wrong.'
}

interface AuthContextType extends AuthState {
    signOut: () => Promise<void>
    clearError: () => void
    isAuthenticated: boolean
    redirectToLogin: () => void
    initRecaptcha: () => Promise<void>
    sendOtp: (phoneNumber: string) => Promise<{ success: boolean }>
    signInWithPhone: (otp: string, source?: string) => Promise<OtpVerificationResult>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isInitialized: false,
        actionLoading: false,
        error: null
    })
    const { refreshUserInfo } = usePostHog()

    useEffect(() => {
        const checkTokenStorageAuth = async () => {
            const currentPath = window.location.pathname
            const isPublicRoute =
                routes.public.some((route) => matchPath({ path: route.path, end: false }, currentPath) !== null) ||
                routes.semiProtected.some((route) => matchPath({ path: route.path, end: false }, currentPath) !== null)
            
            try {
                const isLoggedIn = await TokenStorage.isLoggedIn()

                if (!isLoggedIn && state.isInitialized) {
                    TokenStorage.clear()
                    if (!isPublicRoute) {
                        window.location.href = '/login'
                    }
                }
            } catch (error: any) {
                TokenStorage.clear()
                if (!isPublicRoute) {
                    window.location.href = '/login'
                }
            }
        }

        checkTokenStorageAuth()
    }, [state.isInitialized])

    useEffect(() => {
        const initializeAuth = async () => {
            const loggedIn = await TokenStorage.isLoggedIn()
            const storedUserInfo = await TokenStorage.getUserInfo() // <-- Load stored info

            let authenticatedUser: BaseUser | null = null

            if (loggedIn && storedUserInfo) {
                authenticatedUser = {
                    travelerId: storedUserInfo.traveler_id,
                    name: storedUserInfo.name
                } as BaseUser
            }

            setState((prev) => ({
                ...prev,
                user: authenticatedUser,
                isLoading: false,
                isInitialized: true
            }))
        }

        initializeAuth()
    }, [])
    const handleAsyncAction = async <T,>(action: () => Promise<T>): Promise<T> => {
        setState((prev) => ({ ...prev, actionLoading: true, error: null }))
        try {
            const result = await action()
            return result
        } catch (error: any) {
            const errorMessage = error.userMessage || error.message || 'An unexpected error occurred.'
            setState((prev) => ({ ...prev, error: errorMessage }))
            throw error
        } finally {
            setState((prev) => ({ ...prev, actionLoading: false }))
        }
    }

    const initRecaptcha = useCallback(async () => {
        await authService.initRecaptcha()
    }, [])

    const sendOtp = useCallback(async (phoneNumber: string) => {
        return await handleAsyncAction(async () => {
            await authService.sendOtp(phoneNumber)
            return {
                success: true
            }
        })
    }, [])

    const signOut = useCallback(async () => {
        await handleAsyncAction(async () => {
            await authService.signOut()
            TokenStorage.clear()
            localStorage.clear()
            sessionStorage.clear()
        })
    }, [])

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }))
    }, [])

    const redirectToLogin = useCallback(() => {
        TokenStorage.clear()
        window.location.href = '/login'
    }, [])

    const getBasicUserInfo = useCallback((user_info: any) => {
        const name = user_info.name
        const traveler_id = user_info.id

        const basicInfo = {
            name: name,
            traveler_id: traveler_id
        }
        return basicInfo
    }, [])

    const signInWithPhone = useCallback(
        async (code: string, source?: string): Promise<OtpVerificationResult> => {
            try {
                const result = await authService.verifyOtp(code)

                // If OTP verification failed, return the error result
                if (!result.success) {
                    return result
                }

                const data: Record<string, any> = {
                    // @ts-expect-error: need to fix this
                    access: result.data.idToken,
                    // @ts-expect-error: need to fix this
                    expires_in: parseInt(result.data.expiresIn),
                    // @ts-expect-error: need to fix this
                    phone: result.data.phone
                }

                // Add source field if provided
                if (source) {
                    data.source = source
                }

                const response = await apiClient.post(`/api/traveler/login`, data)

                const { access, refresh, user_info } = response.data.data

                await TokenStorage.setAccessToken(access)
                await TokenStorage.setRefreshToken(refresh)
                const { id, ...restUserInfo } = user_info

                const updatedUserInfo = {
                    traveler_id: id,
                    ...restUserInfo
                }

                await TokenStorage.setUserInfo(updatedUserInfo)

                await refreshUserInfo()

                setState((prev) => ({
                    ...prev,
                    user: {
                        travelerId: id,
                        name: restUserInfo.name
                    } as BaseUser
                }))

                return result
            } catch (error: any) {
                return {
                    success: false,
                    responseCode: OtpResponseCode.INTERNAL_SERVER_ERROR, // or define a new error code for general errors
                    message: OtpResponseMessages[OtpResponseCode.INTERNAL_SERVER_ERROR],
                    data: null
                }
            }
        },
        [getBasicUserInfo, refreshUserInfo]
    )

    const value: AuthContextType = {
        ...state,
        initRecaptcha,
        sendOtp,
        signInWithPhone,
        signOut,
        clearError,
        isAuthenticated: !!state.user && state.isInitialized,
        redirectToLogin
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Standalone Itinerary-Skeleton build: no AuthProvider is mounted (the demo has
// no login flow). Returning a stable logged-out context keeps every consumer
// working without the provider — and without the provider's redirect to /login.
const DEMO_AUTH_CONTEXT: AuthContextType = {
    user: null,
    isLoading: false,
    isInitialized: true,
    actionLoading: false,
    error: null,
    initRecaptcha: async () => {},
    sendOtp: async () => ({ success: false }),
    signInWithPhone: async () => ({
        success: false,
        responseCode: OtpResponseCode.INTERNAL_SERVER_ERROR,
        message: OtpResponseMessages[OtpResponseCode.INTERNAL_SERVER_ERROR],
        data: null
    }),
    signOut: async () => {},
    clearError: () => {},
    isAuthenticated: false,
    redirectToLogin: () => {}
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    return context ?? DEMO_AUTH_CONTEXT
}
