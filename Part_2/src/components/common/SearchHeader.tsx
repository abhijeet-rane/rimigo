import TripPreferencesModal from '@/components/common/TripPreferencesModal'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { FilterDialog } from '@/pages/Stays/Components/FilterDialog'
import type { FilterType } from '@/pages/Stays/Components/Filters/registry'
import { SortModal } from '@/pages/Stays/Components/SortModal'
import type { SortType } from '@/pages/Stays/Components/Sorts/registry'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import SearchBar, {
    type SearchParams,
    type SegmentConfig,
    type WhereSegmentConfig,
    type WhereDimensionConfig,
    type WhereDimensionItem,
    type WhenSegmentConfig,
    type GuestsSegmentConfig,
    type RoomsSegmentConfig,
    type PreferencesSegmentConfig,
    type LocationPreference,
    type WhenModalType,
    type CityListItem,
    type CountryListItem,
    type GuestsData
} from './SearchBar'
import TripSummaryBadge from './TripSummaryBadge'
import CTAButton from '../shared/CTAButton'
import { addOpenTripCreationModalListener } from '@/lib/events/tripCreationModalEvents'
import AIAssistantWindow from '@/pages/Stays/Components/AIAssistantWindow'
import type { AssistantType, AssistantInputDataMap } from '@/pages/Stays/Components/types/assistantTypes'
import type { ItineraryHooksConfig } from '@/modules/Itinerary/components/chat/types'
import {
    registerAssistantOpener,
    unregisterAssistantOpener,
    registerAssistantCloser,
    unregisterAssistantCloser,
    triggerAssistantPrompt
} from '@/pages/Stays/Components/assistantController'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useIsMobile } from '@/hooks/use-mobile'
import { Heart } from 'lucide-react'
import FloatingAssistantChip from '@/components/common/FloatingAssistantChip/FloatingAssistantChip'
import {
    getSuggestionsForAssistantType,
    getHeadingForAssistantType,
    getCtaVerbForAssistantType,
    getMobilePlaceholderForAssistantType,
} from '@/components/common/FloatingAssistantChip/constants'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import CenterTitle from './CenterTitle'
import { POSTHOG_ACTIONS } from '@/modules/amplitude/components/posthogEventDetails'

// Re-export types for convenience
export type {
    SearchParams,
    SegmentConfig,
    WhereSegmentConfig,
    WhereDimensionConfig,
    WhereDimensionItem,
    WhenSegmentConfig,
    GuestsSegmentConfig,
    RoomsSegmentConfig,
    PreferencesSegmentConfig,
    LocationPreference,
    WhenModalType,
    CityListItem,
    CountryListItem,
    GuestsData
}

export interface AssistantConfig<T extends AssistantType = AssistantType> {
    enabled: boolean
    // AI Assistant Window props
    ataId?: string
    tripId?: string
    assistantType?: T
    entityType?: string
    entityId?: string
    inputData?: AssistantInputDataMap[T]
    isOpen?: boolean
    onOpenChange?: (isOpen: boolean) => void
    text?: string
    className?: string
    iconUrl?: string
    hooksConfig?: ItineraryHooksConfig
}

export interface FilterConfig {
    enabled: boolean
    type?: FilterType
    metadata?: any
    initialData?: any
    onChange?: (result: any) => void
    onApply?: (result: any) => void
    onClear?: () => void
}

export interface SortConfig {
    enabled: boolean
    type?: SortType
    metadata?: any
    initialData?: any
    onChange?: (result: any) => void
    onApply?: (result: any) => void
}

export interface CtaConfig {
    enabled: boolean
    onCTAClick?: () => void
    text?: string
    icon?: React.ElementType
    textColor?: string
    backgroundColor?: string
    borderColor?: string
    className?: string
    disabled?: boolean
    isOpen?: boolean
    posthog?: {
        buttonPage: string
        buttonName: string
        extra?: Record<string, any>
    }
}

export interface WishlistConfig {
    enabled: boolean
    onClick?: () => void
    shortlistCount?: number | null
}

export interface BreadcrumbsConfig {
    enabled: boolean
    className?: string
    separator?: React.ReactNode
    showLoadingSkeleton?: boolean
}

export interface SearchHeaderProps {
    pageName?: string
    /** Optional badge shown beside page name (e.g. "Beta") on both mobile and desktop */
    pageNameBadge?: React.ReactNode
    centerTitle?: string
    /** When true, centers pageName in the header on mobile (absolute positioning) */
    centerTitleOnMobile?: boolean
    /** When true (and authenticated), show Rimigo logo in the brand slot on mobile instead of pageName text */
    mobileBrandAsLogo?: boolean
    centerTitleClassName?: string
    onSearch?: (params: SearchParams) => void
    iconSrc?: string
    initialActiveSegment?: 'where' | 'country' | 'when' | 'guests' | 'preferences' | null
    // Configuration for segments (now includes initial values and onChange callbacks)
    countryConfig?: SegmentConfig
    whereConfig?: WhereSegmentConfig
    whenConfig?: WhenSegmentConfig
    guestsConfig?: GuestsSegmentConfig
    roomsConfig?: RoomsSegmentConfig
    preferencesConfig?: PreferencesSegmentConfig
    // Location preferences for different screens
    locationPreferences?: LocationPreference[]
    // Assistant configuration
    assistantConfig?: AssistantConfig
    // Filter configuration
    filterConfig?: FilterConfig
    // Sort configuration
    sortConfig?: SortConfig
    ctaConfig?: CtaConfig
    /** Optional slot rendered before the CTA in the right-hand action area (e.g. share button). */
    headerExtraActions?: React.ReactNode
    /** When true, suppresses the default desktop Login button for unauthenticated users
     *  (caller is responsible for providing an alternative action via headerExtraActions). */
    hideDefaultLoginButton?: boolean
    /** When true, hides the TripSummaryBadge (active-trip pencil chip) for authenticated users. */
    hideTripSummaryBadge?: boolean
    setCriteriaModalClosed?: (closed: boolean) => void

    // Wishlist configuration
    wishlistConfig?: WishlistConfig
    // Breadcrumbs configuration
    breadcrumbsConfig?: BreadcrumbsConfig
    showOverlay?: boolean
    ishidden?: boolean
    containerClass?: string
    logodivClassname?:string
    loginButtonText?: string
}

const SearchHeader = ({
    pageName = 'Stays',
    pageNameBadge,
    centerTitle,
    centerTitleOnMobile = false,
    centerTitleClassName = '',
    mobileBrandAsLogo = false,
    iconSrc = '',
    onSearch,
    initialActiveSegment,
    countryConfig,
    ishidden,
    // showOverlay,
    whereConfig,
    whenConfig,
    guestsConfig,
    roomsConfig,
    setCriteriaModalClosed,
    preferencesConfig,
    locationPreferences,
    ctaConfig = { enabled: false },
    headerExtraActions,
    hideDefaultLoginButton = false,
    hideTripSummaryBadge = false,
    assistantConfig = { enabled: true },
    filterConfig = { enabled: true },
    sortConfig = { enabled: true },
    wishlistConfig = { enabled: false, shortlistCount: 0 },
    breadcrumbsConfig = { enabled: false },
    containerClass = '',
    logodivClassname='',
    loginButtonText
}: SearchHeaderProps) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const isMobile = useIsMobile()
    const { trackButtonClick , trackButtonClickCustom} = usePostHog()
    // Filter/Sort state managed in header
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isSortOpen, setIsSortOpen] = useState(false)
    const [isTripPreferencesOpen, setIsTripPreferencesOpen] = useState(false)
    const [isTripCreationOpen, setIsTripCreationOpen] = useState(false)
    const [tripPreferencesAnchor, setTripPreferencesAnchor] = useState<DOMRect | null>(null)
    const [confettiIteration, setConfettiIteration] = useState(0)

    // Floating AI assistant chip (wand + pill) staged animation state — mirrors TripboardHeader
    const [showFloatingAssistantWand, setShowFloatingAssistantWand] = useState(false)
    const [showFloatingAssistantInput, setShowFloatingAssistantInput] = useState(false)
    const [showFloatingAssistantPlaceholder, setShowFloatingAssistantPlaceholder] = useState(false)
    const [isFloatingAssistantClosing, setIsFloatingAssistantClosing] = useState(false)
    const [floatingPlaceholderIndex, setFloatingPlaceholderIndex] = useState(0)

    // Read isAssistantOpen from query params for initial state
    const isAssistantOpenFromQuery = searchParams.get('isAssistantOpen') === 'true'
    // Use external state if provided, otherwise use internal state
    const [internalAIAssistantOpen, setInternalAIAssistantOpen] = useState(isAssistantOpenFromQuery)
    const isAIAssistantOpen = assistantConfig.isOpen ?? internalAIAssistantOpen
    const prevShortlistCountRef = useRef<number | null | undefined>(undefined)
    const setIsAIAssistantOpen = assistantConfig.onOpenChange ?? setInternalAIAssistantOpen
    const shortlistCount = typeof wishlistConfig.shortlistCount === 'number' ? wishlistConfig.shortlistCount : 0
    const hasShortlist = shortlistCount > 0
    // Ref to track if state change is from query param sync (to avoid updating URL in that case)
    const isSyncingFromQueryRef = useRef(false)
    const floatingPromptShownTrackedRef = useRef(false)
    const hasAssistantWindowConfig = Boolean(
        assistantConfig.enabled &&
        assistantConfig.ataId &&
        assistantConfig.assistantType &&
        assistantConfig.entityType &&
        assistantConfig.entityId &&
        assistantConfig.inputData
    )
    const assistantInputData = assistantConfig.inputData as Record<string, unknown> | undefined
    const contextualAssistantPlaceholder = (() => {
        const hotelName = typeof assistantInputData?.hotelName === 'string' ? assistantInputData.hotelName : ''
        const cityName = typeof assistantInputData?.cityName === 'string' ? assistantInputData.cityName : ''
        const experienceName = typeof assistantInputData?.experienceName === 'string' ? assistantInputData.experienceName : ''

        switch (assistantConfig.assistantType) {
            case 'HotelExpertChat':
                return hotelName ? `Ask about ${hotelName}` : 'Ask about this stay'
            case 'HotelSmartSearch':
                return cityName ? `Ask for best stays in ${cityName}` : 'Ask for the best stays'
            case 'ExperienceExpertChat':
                return experienceName ? `Ask about ${experienceName}` : 'Ask about this experience'
            case 'ItineraryExpertChat':
                return 'Add lunch, swap activities, ask anything...'
            case 'BurjKhalifaExpertChat':
                return 'Ask for best Burj Khalifa options'
            default:
                return assistantConfig.text ?? `Ask ${pageName} expert`
        }
    })()

    const contextualPlaceholderCycle = (() => {
        const cityName = typeof assistantInputData?.cityName === 'string' ? assistantInputData.cityName : ''
        const hotelName = typeof assistantInputData?.hotelName === 'string' ? assistantInputData.hotelName : ''
        const experienceName = typeof assistantInputData?.experienceName === 'string' ? assistantInputData.experienceName : ''

        switch (assistantConfig.assistantType) {
            case 'ItineraryExpertChat':
                return [
                    '"Add a food tour on Day 2"',
                    '"Swap Day 1 and Day 3"',
                    '"Find cafes near the museum"',
                    '"Add 2 more days in Bali"',
                    '"What\'s the best time to visit?"',
                ]
            case 'HotelExpertChat':
                return [
                    `"Does ${hotelName || 'this hotel'} have a pool?"`,
                    '"Is breakfast included?"',
                    '"How far is it from the airport?"',
                    '"Are there rooms with a sea view?"',
                ]
            case 'HotelSmartSearch':
                return [
                    `"Best boutique hotels in ${cityName || 'the city'}"`,
                    '"Hotels with rooftop pool under $200"',
                    '"Family-friendly stays near the beach"',
                    '"Luxury stays with spa and breakfast"',
                ]
            case 'ExperienceExpertChat':
                return [
                    `"Is ${experienceName || 'this'} suitable for kids?"`,
                    '"What should I wear?"',
                    '"How long does it usually take?"',
                    '"Best time of day to visit?"',
                ]
            case 'BurjKhalifaExpertChat':
                return [
                    '"Which floor has the best view?"',
                    '"Is the sunset slot worth it?"',
                    '"Can I bring my camera?"',
                    '"Best time to avoid crowds?"',
                ]
            default:
                return [
                    '"Show me hidden gems nearby"',
                    '"What\'s the best experience here?"',
                    '"Help me plan my day"',
                    '"Find something unique to do"',
                ]
        }
    })()

    const handleOpenAssistant = useCallback(() => {
        if (!hasAssistantWindowConfig) return
        if (!isAuthenticated) {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set('isAssistantOpen', 'true')
            const redirectUrl = `${location.pathname}?${newSearchParams.toString()}`
            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
            return
        }
        setIsAIAssistantOpen(true)

        // Use history.replaceState instead of setSearchParams to update the URL without
        // triggering React Router's re-render cycle (which causes page data hooks to refetch).
        if (!isSyncingFromQueryRef.current && !assistantConfig.isOpen && !assistantConfig.onOpenChange) {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set('isAssistantOpen', 'true')
            window.history.replaceState(null, '', `${location.pathname}?${newSearchParams.toString()}`)
        }
    }, [
        hasAssistantWindowConfig,
        isAuthenticated,
        location.pathname,
        navigate,
        setIsAIAssistantOpen,
        searchParams,
        assistantConfig.isOpen,
        assistantConfig.onOpenChange
    ])

    const handleCloseAssistant = useCallback(() => {
        setIsAIAssistantOpen(false)

        // Use history.replaceState instead of setSearchParams — same reason as above.
        if (!isSyncingFromQueryRef.current && !assistantConfig.isOpen && !assistantConfig.onOpenChange) {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set('isAssistantOpen', 'false')
            window.history.replaceState(null, '', `${location.pathname}?${newSearchParams.toString()}`)
        }
    }, [setIsAIAssistantOpen, searchParams, assistantConfig.isOpen, assistantConfig.onOpenChange])

    const handleToggleAssistant = useCallback(() => {
        if (isAIAssistantOpen) {
            handleCloseAssistant()
        } else {
            handleOpenAssistant()
        }
    }, [isAIAssistantOpen, handleOpenAssistant, handleCloseAssistant])

    useEffect(() => {
        if (!hasAssistantWindowConfig || isAIAssistantOpen) return
        if (floatingPromptShownTrackedRef.current) return
        trackButtonClick({
            button_name: 'Assisstant Button',
            location: 'Bottom Floating Input',
            extra: { action: 'shown', device: isMobile ? 'mobile' : 'desktop' }
        })
        floatingPromptShownTrackedRef.current = true
    }, [hasAssistantWindowConfig, isAIAssistantOpen, isMobile, trackButtonClick])

    useEffect(() => {
        if (isAIAssistantOpen || !hasAssistantWindowConfig) {
            floatingPromptShownTrackedRef.current = false
        }
    }, [isAIAssistantOpen, hasAssistantWindowConfig])

    // Stage the floating assistant chip: short delay → wand → pill expansion → placeholder
    useEffect(() => {
        if (!hasAssistantWindowConfig || isAIAssistantOpen) {
            setShowFloatingAssistantWand(false)
            setShowFloatingAssistantInput(false)
            setShowFloatingAssistantPlaceholder(false)
            setIsFloatingAssistantClosing(false)
            return
        }
        const wandDelay = 300 + Math.floor(Math.random() * 200)
        const wandTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantWand(true)
        }, wandDelay)
        const inputTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantInput(true)
        }, wandDelay + 420)
        const placeholderTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantPlaceholder(true)
        }, wandDelay + 900)

        return () => {
            window.clearTimeout(wandTimeoutId)
            window.clearTimeout(inputTimeoutId)
            window.clearTimeout(placeholderTimeoutId)
        }
    }, [hasAssistantWindowConfig, isAIAssistantOpen])

    // Cycle through screen-specific placeholders, then collapse back to wand only
    useEffect(() => {
        if (!showFloatingAssistantInput || isAIAssistantOpen || !showFloatingAssistantPlaceholder) return
        const intervalMs = 3200
        const totalPlaceholders = contextualPlaceholderCycle.length
        if (totalPlaceholders === 0) return
        const intervalId = window.setInterval(() => {
            setFloatingPlaceholderIndex((idx) => {
                if (idx >= totalPlaceholders - 1) {
                    window.setTimeout(() => {
                        setIsFloatingAssistantClosing(true)
                        setShowFloatingAssistantInput(false)
                        setShowFloatingAssistantPlaceholder(false)
                        window.setTimeout(() => {
                            setFloatingPlaceholderIndex(0)
                            setIsFloatingAssistantClosing(false)
                        }, 650)
                    }, 350)
                    return idx
                }
                return idx + 1
            })
        }, intervalMs)
        return () => {
            window.clearInterval(intervalId)
        }
    }, [isAIAssistantOpen, showFloatingAssistantInput, showFloatingAssistantPlaceholder, contextualPlaceholderCycle.length])

    useEffect(() => {
        if (!wishlistConfig.enabled) return
        const currentCount = wishlistConfig.shortlistCount ?? 0
        const previousCount = prevShortlistCountRef.current ?? 0

        if (currentCount > previousCount && currentCount > 0) {
            setConfettiIteration((iteration) => iteration + 1)
        }

        prevShortlistCountRef.current = currentCount
    }, [wishlistConfig.shortlistCount, wishlistConfig.enabled])
    useEffect(() => {
        if (!hasAssistantWindowConfig) return
        registerAssistantOpener(handleOpenAssistant)
        registerAssistantCloser(handleCloseAssistant)
        return () => {
            unregisterAssistantOpener(handleOpenAssistant)
            unregisterAssistantCloser(handleCloseAssistant)
        }
    }, [hasAssistantWindowConfig, handleOpenAssistant, handleCloseAssistant])

    useEffect(() => {
        return addOpenTripCreationModalListener(() => {
            setTripPreferencesAnchor(null)
            setIsTripCreationOpen(true)
        })
    }, [])

    // Sync assistant state with query parameter (only if external state is not provided)
    useEffect(() => {
        // Only sync if external state management is not provided
        if (assistantConfig.isOpen !== undefined || assistantConfig.onOpenChange) return

        const isAssistantOpenFromQuery = searchParams.get('isAssistantOpen') === 'true'
        // Mark that we're syncing from query to prevent URL update on close
        isSyncingFromQueryRef.current = true
        setInternalAIAssistantOpen(isAssistantOpenFromQuery)
        // Reset the flag after state update completes
        requestAnimationFrame(() => {
            isSyncingFromQueryRef.current = false
        })
    }, [searchParams, assistantConfig.isOpen, assistantConfig.onOpenChange])

    // Check if any segment is enabled
    const hasAnySegmentEnabled =
        countryConfig?.enabled || whereConfig?.enabled || whenConfig?.enabled || guestsConfig?.enabled || roomsConfig?.enabled || preferencesConfig?.enabled
    return (
        <motion.div
            layout
            className={`sticky top-0 border-b ${containerClass} border-feature-card-border bg-natural-white w-full ${
                ishidden ? 'max-md:border-none max-md:bg-transparent' : ''
            } ${isAIAssistantOpen && isMobile ? 'z-[110]' : 'z-70'}`}>
            {/* {showOverlay && <div className="absolute inset-0 bg-[#10101052] z-1100 pointer-events-auto" />} */}

            <div className={`w-full px-4 sm:px-6 lg:px-8 ${ishidden ? 'max-md:hidden' : ''}`}>
                <div className={`relative flex max-md:gap-3 max-md:flex-col items-center justify-between max-md:pb-0 py-4 min-h-[72px] md:h-[72px] md:py-0 max-md:relative ${logodivClassname} ${centerTitleOnMobile && isMobile ? 'relative' : ''}`}>
                    {headerExtraActions && (
                        <div className="md:hidden absolute top-4 right-3 z-[5]">
                            {headerExtraActions}
                        </div>
                    )}
                    {/* Logo / Page Name */}
                    <div className=" flex items-center gap-2 max-md:w-full max-md:justify-center ">
                        {/* Centered title on mobile (absolute) when centerTitleOnMobile */}
                        {centerTitleOnMobile && isMobile && isAuthenticated && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 font-red-hat-display font-semibold text-xl text-grey-0 pointer-events-none">
                                {mobileBrandAsLogo ? (
                                    <>
                                        <img
                                            src="/icons/logo-transparent-indigo.png"
                                            alt="Rimigo"
                                            className="h-8 w-auto"
                                        />
                                        {pageNameBadge}
                                    </>
                                ) : (
                                    <>
                                        {pageName}
                                        {pageNameBadge}
                                    </>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col items-start gap-0">
                            {/* Breadcrumbs - Only show if enabled */}
                            {breadcrumbsConfig.enabled && (
                                <div className="w-full -mb-1">
                                    <Breadcrumbs
                                        className={breadcrumbsConfig.className}
                                        separator={breadcrumbsConfig.separator}
                                        showLoadingSkeleton={breadcrumbsConfig.showLoadingSkeleton}
                                        searchParams={searchParams}
                                    />
                                </div>
                            )}

                            {isAuthenticated ? (
                                <div
                                    className={`flex items-center gap-2 font-red-hat-display font-semibold text-xl max-md:mx-auto
                                ${wishlistConfig.enabled ? 'max-md:translate-x-full' : ''}
                                ${breadcrumbsConfig.enabled ? '-mt-1' : ''}
                                ${centerTitleOnMobile && isMobile ? 'max-md:invisible' : ''}
                                `}>
                                    {isMobile && mobileBrandAsLogo ? (
                                        <>
                                            <img
                                                src="/icons/logo-transparent-indigo.png"
                                                alt="Rimigo"
                                                className="h-8 w-auto"
                                            />
                                            {pageNameBadge}
                                        </>
                                    ) : (
                                        <>
                                            {pageName}
                                            {pageNameBadge}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <img
                                    src="/icons/logo-transparent-indigo.png"
                                    alt="Rimigo"
                                    className="h-8 w-auto"
                                />
                            )}
                        </div>
                        {wishlistConfig.enabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    wishlistConfig.onClick?.()
                                }}
                                className="ml-auto w-fit md:hidden border border-grey-4 rounded-[8px] flex items-center gap-[6px] py-0.5 px-[10px] hover:bg-grey-5 transition-all cursor-pointer relative">
                                <div className="relative flex items-center justify-center w-5 h-5 md:w-5.5 md:h-5.5 sm:w-5 sm:h-5">
                                    <div
                                        key={confettiIteration}
                                        className={`pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.6)_0%,rgba(255,255,255,0)_70%)] ${
                                            confettiIteration > 0 ? 'animate-searchbar-confetti' : ''
                                        }`}
                                        style={{ transform: 'scale(1.5)', opacity: 0 }}
                                    />
                                    <Heart
                                        className={`w-full h-full transition-colors duration-300 ${
                                            hasShortlist ? 'text-secondary-red' : 'text-header-black'
                                        }`}
                                        stroke="currentColor"
                                        fill={hasShortlist ? 'currentColor' : 'none'}
                                    />
                                </div>
                                {hasShortlist && (
                                    <span className="text-[19px] font-red-hat-display font-semibold transition-colors duration-300">
                                        {shortlistCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Center Title */}
                    {centerTitle && (
                        <CenterTitle
                            title={centerTitle}
                            className={centerTitleClassName}
                        />
                    )}

                    {/* Search Bar - Only show if at least one segment is enabled */}
                    {hasAnySegmentEnabled && (
                        <SearchBar
                            setCriteriaModalClosed={setCriteriaModalClosed}
                            iconSrc={iconSrc}
                            pageName={pageName}
                            onFilterClick={() => setIsFilterOpen(true)}
                            onSortClick={() => setIsSortOpen(true)}
                            currentOrderBy={sortConfig.initialData?.currentOrderBy}
                            onSearch={onSearch}
                            initialActiveSegment={initialActiveSegment}
                            countryConfig={countryConfig}
                            whereConfig={whereConfig}
                            whenConfig={whenConfig}
                            guestsConfig={guestsConfig}
                            roomsConfig={roomsConfig}
                            preferencesConfig={preferencesConfig}
                            locationPreferences={locationPreferences ?? []}
                            showFilters={filterConfig.enabled}
                            hasActiveFilters={
                                (filterConfig.initialData?.selectedPropertyTypes?.length ?? 0) > 0 ||
                                (filterConfig.initialData?.selectedAmenities?.length ?? 0) > 0 ||
                                filterConfig.initialData?.isVerified === true ||
                                filterConfig.initialData?.isB2bDealAvailable === true
                            }
                            showSort={sortConfig.enabled}
                            wishlistConfig={wishlistConfig}
                        />
                    )}

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        {/* Assistant Button — commented out; floating chip used instead */}
                        {/* {hasAssistantWindowConfig && !isMobile && (
                            <AssisstantButton
                                onAssistantClick={() => {
                                    trackButtonClick({ button_name: 'Assisstant Button', location: 'Search Bar' })
                                    if (!isAuthenticated) {
                                        const newSearchParams = new URLSearchParams(searchParams)
                                        newSearchParams.set('isAssistantOpen', 'true')
                                        const redirectUrl = `${location.pathname}?${newSearchParams.toString()}`
                                        navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                                        return
                                    }
                                    if (!hasAssistantWindowConfig) return
                                    handleToggleAssistant()
                                }}
                                isOpen={isAIAssistantOpen}
                                text={assistantConfig.text}
                                className={assistantConfig.className ?? ''}
                                iconUrl={assistantConfig.iconUrl ?? ''}
                            />
                        )} */}
                        {headerExtraActions && (
                            <div className="max-md:hidden flex items-center gap-3">{headerExtraActions}</div>
                        )}
                        {ctaConfig.enabled && (
                            <CTAButton
                                text={ctaConfig.text ?? ''}
                                Icon={ctaConfig.icon}
                                onCTAClick={() => {
                                    if (ctaConfig.posthog) {
                                        trackButtonClickCustom?.({
                                            buttonPage: ctaConfig.posthog.buttonPage,
                                            buttonName: ctaConfig.posthog.buttonName,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: {
                                                ...ctaConfig.posthog.extra,
                                                ctaText: ctaConfig.text,
                                            },
                                        })
                                    }
                                    ;(ctaConfig.onCTAClick ?? (() => {}))()
                                }}
                                className={ctaConfig.className ?? ''}
                                disabled={ctaConfig.disabled ?? false}
                                isOpen={ctaConfig.isOpen ?? false}
                            />
                        )}
                        {isAuthenticated ? (
                            hideTripSummaryBadge ? null : (
                                <TripSummaryBadge
                                    onEdit={(rect) => {
                                        setTripPreferencesAnchor(rect)
                                        setIsTripPreferencesOpen(true)
                                    }}
                                    onCreate={(rect) => {
                                        setTripPreferencesAnchor(rect)
                                        setIsTripCreationOpen(true)
                                    }}
                                />
                            )
                        ) : hideDefaultLoginButton ? null : (
                            <button
                                type="button"
                                onClick={() => {
                                    const redirectUrl = `${location.pathname}${location.search}`
                                    navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                                }}
                                className="hidden md:flex items-center gap-3 px-4 h-9.5 rounded-xl text-white cursor-pointer"
                                style={{
                                    borderRadius: 8,
                                    background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                }}>
                                <span className="text-sm font-semibold tracking-[-0.28px] font-['Red_Hat_Display']">{loginButtonText ?? 'Login'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {hasAssistantWindowConfig && !isAIAssistantOpen && (
                <FloatingAssistantChip
                    isMobile={isMobile}
                    showWand={showFloatingAssistantWand}
                    showInput={showFloatingAssistantInput}
                    showPlaceholder={showFloatingAssistantPlaceholder}
                    isClosing={isFloatingAssistantClosing}
                    currentPlaceholder={contextualPlaceholderCycle[floatingPlaceholderIndex] ?? contextualAssistantPlaceholder}
                    placeholderIndex={floatingPlaceholderIndex}
                    onClick={handleToggleAssistant}
                    onSubmit={(q, attachmentIds, attachmentsSummary) => {
                        const meta: Record<string, unknown> = {}
                        if (attachmentIds?.length) meta.attachment_ids = attachmentIds
                        if (attachmentsSummary?.length) meta.attachments_summary = attachmentsSummary
                        void triggerAssistantPrompt(q, Object.keys(meta).length ? meta : undefined)
                    }}
                    tripId={activeTrip?.trip_id ?? null}
                    suggestions={getSuggestionsForAssistantType(assistantConfig.assistantType)}
                    heading={getHeadingForAssistantType(assistantConfig.assistantType)}
                    ctaVerb={getCtaVerbForAssistantType(assistantConfig.assistantType)}
                    mobilePlaceholder={getMobilePlaceholderForAssistantType(assistantConfig.assistantType)}
                    trackButtonClick={trackButtonClick}
                    ariaLabel="Open trip expert assistant"
                />
            )}

            {/* Filter Dialog - Managed in header */}
            {filterConfig.enabled && filterConfig.type && (
                <FilterDialog
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    type={filterConfig.type}
                    metadata={filterConfig.metadata}
                    initialData={filterConfig.initialData}
                    onChange={(result) => {
                        filterConfig.onChange?.(result)
                    }}
                    onApply={(result) => {
                        filterConfig.onApply?.(result)
                    }}
                    onClear={() => {
                        filterConfig.onClear?.()
                    }}
                />
            )}

            {/* Sort Modal - Managed in header */}
            {sortConfig.enabled && sortConfig.type && (
                <SortModal
                    isOpen={isSortOpen}
                    onClose={() => setIsSortOpen(false)}
                    type={sortConfig.type}
                    metadata={sortConfig.metadata}
                    initialData={sortConfig.initialData}
                    onChange={(result) => {
                        sortConfig.onChange?.(result)
                    }}
                    onApply={(result) => {
                        sortConfig.onApply?.(result)
                    }}
                />
            )}

            <TripPreferencesModal
                isOpen={isTripPreferencesOpen}
                onClose={() => setIsTripPreferencesOpen(false)}
                trip={activeTrip}
                anchorRect={tripPreferencesAnchor}
            />

            <TripCreationFlow
                isOpen={isTripCreationOpen}
                onClose={() => setIsTripCreationOpen(false)}
                anchorRect={tripPreferencesAnchor}
                onSuccess={() => {
                    // Optionally show a success message or refresh data
                    setIsTripCreationOpen(false)
                }}
            />

            {/* AI Assistant Window — always mounted so overlay can fade out.
                headerHeight + MobileContainerClass match the Tripboard wiring so
                StayExplore / StayDetails render with the same tight top spacing. */}
            {hasAssistantWindowConfig && (
                <AIAssistantWindow
                    isOpen={isAIAssistantOpen}
                    onClose={handleCloseAssistant}
                    ataId={assistantConfig.ataId!}
                    tripId={assistantConfig.tripId}
                    assistantType={assistantConfig.assistantType!}
                    entityType={assistantConfig.entityType!}
                    entityId={assistantConfig.entityId!}
                    inputData={assistantConfig.inputData!}
                    hooksConfig={assistantConfig.hooksConfig}
                    headerHeight={72}
                    MobileContainerClass=""
                />
            )}
        </motion.div>
    )
}

export default SearchHeader
