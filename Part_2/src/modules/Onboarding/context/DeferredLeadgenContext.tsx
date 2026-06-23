import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PreferredTravelTime {
    is_fixed: boolean
    startDate: Date | null
    endDate: Date | null
    year: number | null
    months: string[] | null
}

export interface TravelerIntent {
    planning_start_preference: string | null
    booked_items: string[] | null
}

export interface DeferredLeadgenData {
    destinations: SearchDestinationCardData[]
    destinationFinalized: boolean
    groupType: string | null
    travelPurpose: string | null
    preferredTravelTime: PreferredTravelTime | null
    travelerIntent: TravelerIntent | null
    utmSource: string
    utmMedium: string
}

export type DeferredLeadgenStep =
    | 'destination'
    | 'group-type'
    | 'purpose'
    | 'intent'
    | 'loading'
    | 'login'
    | 'profile-update'
    | 'trip-selection'

const STEP_ORDER: DeferredLeadgenStep[] = ['destination', 'group-type', 'purpose', 'intent', 'loading', 'login', 'profile-update', 'trip-selection']

interface DeferredLeadgenContextType {
    data: DeferredLeadgenData
    currentStep: DeferredLeadgenStep
    setDestinations: (destinations: SearchDestinationCardData[], finalized: boolean) => void
    setGroupType: (groupType: string) => void
    setTravelPurpose: (purpose: string, time: PreferredTravelTime) => void
    setTravelerIntent: (intent: TravelerIntent) => void
    goToStep: (step: DeferredLeadgenStep) => void
    goBack: () => void
}

const DeferredLeadgenContext = createContext<DeferredLeadgenContextType | null>(null)

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useDeferredLeadgen = (): DeferredLeadgenContextType => {
    const ctx = useContext(DeferredLeadgenContext)
    if (!ctx) {
        throw new Error('useDeferredLeadgen must be used within DeferredLeadgenProvider')
    }
    return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface DeferredLeadgenProviderProps {
    children: React.ReactNode
    utmSource: string
    utmMedium: string
    /** Called when user navigates back past the first step */
    onExit?: () => void
}

export const DeferredLeadgenProvider: React.FC<DeferredLeadgenProviderProps> = ({ children, utmSource, utmMedium, onExit }) => {
    const [currentStep, setCurrentStep] = useState<DeferredLeadgenStep>('destination')

    const [data, setData] = useState<DeferredLeadgenData>({
        destinations: [],
        destinationFinalized: false,
        groupType: null,
        travelPurpose: null,
        preferredTravelTime: null,
        travelerIntent: null,
        utmSource,
        utmMedium
    })

    // Replace initial history state with destination step
    useEffect(() => {
        window.history.replaceState({ step: 'destination' }, '')
    }, [])

    // Listen for browser back/forward navigation
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const step = event.state?.step as DeferredLeadgenStep
            if (step && STEP_ORDER.includes(step)) {
                setCurrentStep(step)
            } else {
                // User went back past the wizard
                onExit?.()
            }
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [onExit])

    const goToStep = useCallback((step: DeferredLeadgenStep) => {
        setCurrentStep(step)
        window.history.pushState({ step }, '')
    }, [])

    const goBack = useCallback(() => {
        window.history.back()
    }, [])

    const setDestinations = useCallback(
        (destinations: SearchDestinationCardData[], finalized: boolean) => {
            setData((prev) => ({ ...prev, destinations, destinationFinalized: finalized }))
        },
        []
    )

    const setGroupType = useCallback((groupType: string) => {
        setData((prev) => ({ ...prev, groupType }))
    }, [])

    const setTravelPurpose = useCallback((travelPurpose: string, preferredTravelTime: PreferredTravelTime) => {
        setData((prev) => ({ ...prev, travelPurpose, preferredTravelTime }))
    }, [])

    const setTravelerIntent = useCallback((travelerIntent: TravelerIntent) => {
        setData((prev) => ({ ...prev, travelerIntent }))
    }, [])

    const value = useMemo(
        () => ({
            data,
            currentStep,
            setDestinations,
            setGroupType,
            setTravelPurpose,
            setTravelerIntent,
            goToStep,
            goBack
        }),
        [data, currentStep, setDestinations, setGroupType, setTravelPurpose, setTravelerIntent, goToStep, goBack]
    )

    return <DeferredLeadgenContext.Provider value={value}>{children}</DeferredLeadgenContext.Provider>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getPreviousStep = (step: DeferredLeadgenStep): DeferredLeadgenStep | null => {
    const idx = STEP_ORDER.indexOf(step)
    return idx > 0 ? STEP_ORDER[idx - 1] : null
}

export const getNextStep = (step: DeferredLeadgenStep): DeferredLeadgenStep | null => {
    const idx = STEP_ORDER.indexOf(step)
    return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null
}
