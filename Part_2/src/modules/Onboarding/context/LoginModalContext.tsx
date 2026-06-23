import React, { createContext, useContext, useState, useCallback } from 'react'

export interface LoginModalParams {
    redirectTo?: string
    redirect?: string
    utm_source?: string
    onLoginSuccess?: () => void // Callback called after successful login - parent can decide to refresh, redirect, etc.
    redirectAfterLogin?: boolean
    buttonPage?: string // Override PostHog buttonPage for tracking (e.g. 'tripboard_v1' when login is triggered from tripboard)
}

interface LoginModalContextType {
    isOpen: boolean
    params: LoginModalParams | null
    openLoginModal: (params?: LoginModalParams) => void
    closeLoginModal: () => void
    isProfileUpdateModalOpen: boolean
    profileUpdateModalParams: { redirectTo?: string; onSuccess?: () => void } | null
    openProfileUpdateModal: (params?: { redirectTo?: string; onSuccess?: () => void }) => void
    closeProfileUpdateModal: () => void
}

const LoginModalContext = createContext<LoginModalContextType | null>(null)

export const LoginModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [params, setParams] = useState<LoginModalParams | null>(null)
    const [isProfileUpdateModalOpen, setIsProfileUpdateModalOpen] = useState(false)
    const [profileUpdateModalParams, setProfileUpdateModalParams] = useState<{ redirectTo?: string; onSuccess?: () => void } | null>(null)

    const openLoginModal = useCallback((modalParams?: LoginModalParams) => {
        setParams(modalParams || null)
        setIsOpen(true)
    }, [])

    const closeLoginModal = useCallback(() => {
        setIsOpen(false)
        // Clear params after a short delay to allow modal close animation
        setTimeout(() => {
            setParams(null)
        }, 300)
    }, [])

    const openProfileUpdateModal = useCallback((modalParams?: { redirectTo?: string; onSuccess?: () => void }) => {
        setProfileUpdateModalParams(modalParams || null)
        setIsProfileUpdateModalOpen(true)
    }, [])

    const closeProfileUpdateModal = useCallback(() => {
        setIsProfileUpdateModalOpen(false)
        // Clear params after a short delay to allow modal close animation
        setTimeout(() => {
            setProfileUpdateModalParams(null)
        }, 300)
    }, [])

    return (
        <LoginModalContext.Provider
            value={{
                isOpen,
                params,
                openLoginModal,
                closeLoginModal,
                isProfileUpdateModalOpen,
                profileUpdateModalParams,
                openProfileUpdateModal,
                closeProfileUpdateModal
            }}>
            {children}
        </LoginModalContext.Provider>
    )
}

export const useLoginModal = () => {
    const context = useContext(LoginModalContext)
    if (!context) {
        throw new Error('useLoginModal must be used within LoginModalProvider')
    }
    return context
}
