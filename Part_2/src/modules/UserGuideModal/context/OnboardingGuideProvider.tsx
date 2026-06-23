import React, { createContext, useContext } from 'react'
import { useOnboardingGuide } from '../hooks/useOnboardingGuide'
import { OnboardingGuideStructure } from '../types/OnboardingType'

interface OnboardingGuideContextType {
    guide: OnboardingGuideStructure | null
    isLoading: boolean
    updateGuide: (data: OnboardingGuideStructure) => void
    isUpdating: boolean
    isLoggedIn: boolean
}

export const OnboardingGuideCtx = createContext<OnboardingGuideContextType | null>(null)

export const OnboardingGuideProvider: React.FC<{ children: React.ReactNode; isLoggedIn: boolean }> = ({ children, isLoggedIn }) => {
    const guideState = useOnboardingGuide(isLoggedIn)

    const contextValue: OnboardingGuideContextType = {
        ...guideState,
        isLoggedIn: isLoggedIn
    }

    return <OnboardingGuideCtx.Provider value={contextValue}>{children}</OnboardingGuideCtx.Provider>
}

export const useOnboardingGuideContext = () => {
    const ctx = useContext(OnboardingGuideCtx)
    if (!ctx) throw new Error('useOnboardingGuideContext must be used inside OnboardingGuideProvider')
    return ctx
}
