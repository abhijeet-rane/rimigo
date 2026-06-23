import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query'
import { useItineraryAgentId } from '../hooks/useItineraryAgentId'
import { useSwitcherCountries, useDefaultDestination } from '../hooks/useTripDestinationData'
import Itenerary from "@/modules/Itinerary/pages/Itenerary"
import CustomShimmer from '@/components/shared/Shimmer'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getTripboardPreview } from '@/api/curation/tripboardPreviewAPI'
import { useUserInfo } from '@/hooks/useUserInfo'
import { isAwaitingPostLoginReload } from '@/modules/Tripboard/utils/createFlowHandoff'
import { getTravelerDetails } from '@/api/travelerAPI/travelerAPI'
import { ApiResponse, ContentCollection, ContentCollectionViewModel, Section } from '@/modules/ContentCollection/types/contentCollection'
import { projectStaySectionsForDedupe } from '@/modules/ContentCollection/utils/staysShortlistDedupe'
import { adaptCollectionSectionToExperienceCard, resolveExperienceCardData } from '@/modules/ContentCollection/adapter/experienceCardAdapter'
import { useExperiencesEnrichment } from '@/modules/ContentCollection/hooks/useExperiencesEnrichment'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { AccommodationMetadataItem } from '@/pages/Stays/Apis'
import { useCollectionMapMarkers } from '@/modules/ContentCollection/hooks/useCollectionMapMarkers'
import { useFlightsCollection } from '@/modules/ContentCollection/hooks/useFlightsCollection'
import { useStaysViewportMarkers } from '@/modules/Tripboard/hooks/useStaysViewportMarkers'
import { adaptCollectionToOverviewData } from '@/modules/ContentCollection/adapter/overviewAdapter'
import ViewContentCollectionLoading from '@/modules/ContentCollection/components/ViewContentCollectionLoading'
import LogoLoadingScreen from '@/components/shared/LogoLoadingScreen'
import SectionTypesError from '@/modules/ContentCollection/components/SectionTypesError'
import CollectionTabs from '@/modules/ContentCollection/components/CollectionTabs'
import Typography from '@/components/shared/Typography'
import CollectionNotFound from '@/modules/ContentCollection/components/CollectionNotFound'
import { adaptContentCollectionToViewModel } from '@/modules/ContentCollection/adapter/contentCollectionAdapter'
import SocialMeta from '@/components/shared/React-Helmet/SocialMeta'
import {
    TripCollectionRecommendationsProvider,
    PersonalTourRecommendation,
    PersonalTourPriceOverride
} from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import OverviewTabContent from '@/modules/ContentCollection/components/OverviewTabContent'
import ExperienceTab from '@/modules/ContentCollection/components/ExperienceTab'
import StaysTab from '@/modules/ContentCollection/components/StaysTab'
import MustHaveTabContent from '@/modules/ContentCollection/components/MustHaveTabContent'
import ItineraryTabContent from '@/modules/ContentCollection/components/ItineraryTabContent'
import FlightsTab from '@/modules/ContentCollection/components/FlightsTab'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeekModal'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import { GenericMap } from '@/components/shared/Map'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import {
    shouldShowMapForTab,
    shouldAllowDateUpdateForTab,
    shouldAllowDeleteSection
} from '@/modules/ContentCollection/lib/collectionConfig'
import { useStaysEnrichment } from '@/modules/ContentCollection/hooks/useStaysEnrichment'
import { resolveEffectiveStaysDates, STAYS_EXP_PARAMS } from '@/modules/ContentCollection/utils/cityDateFilter'
import FoodTabContent from '@/modules/ContentCollection/components/FoodTabContent'
import { buildBaseAllTabs, appendSyntheticFoodTab, appendSyntheticVouchersTab, type SectionType } from '@/modules/Tripboard/utils/tabArrangement'
import { useTripVouchers } from '@/hooks/useTripVouchers'
import VouchersTab from '@/modules/Tripboard/components/Vouchers/VouchersTab'
import { SHOW_TRIPBOARD_OVERVIEW_TAB } from '@/modules/Tripboard/constants/tripboardConfig'
import { useTravelerCollectionSectionTypes } from '@/modules/Tripboard/hooks/useTravelerCollectionSectionTypes'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { dispatchForceShowHeaders } from '@/lib/events/forceShowHeadersEvents'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useStaysGuestsData } from '@/modules/ContentCollection/hooks/useStaysGuestsData'
import { useStaysOccupancies } from '@/modules/ContentCollection/hooks/useStaysOccupancies'
import { useStayPrices } from '@/modules/ContentCollection/hooks/useStayPrices'
import { encodeOccupancies } from '@/types/occupancy'
import { FIVE_MINUTES } from '@/constants/commons/tanstackConstants'
import { formatDateStringToYMD, formatDateToYMD, isPastDate, getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'
import { buildCorrectedDatesMap } from '@/modules/ContentCollection/utils/staysDateGrouping'
import { computeItineraryWindows, type ItineraryCityWindow } from '@/modules/ContentCollection/utils/itineraryWindows'
import { toast } from 'sonner'
import { tripboardApi } from '../api/tripboardApi'
import { startTripboardCreation, pollTripboardStatus } from '@/api/tripboardApi'
import { TokenStorage } from '@/lib/api/tokenStorage'
import TripboardCreateFlow from '../components/TripboardCreateFlow'
import PastDatesTakeover from '../components/PastDatesTakeover'
import {
    isItineraryStartedOrPast,
    isItineraryFullyPast,
    computePastDatesFallbackWindow,
    daysBetweenYmd,
    writeStaysExpFallbackParams,
    shiftItineraryCitiesToFuture,
} from '../utils/pastDatesUtils'
import { resolveTripboardDisplayName } from '../utils/tripboardDisplayName'
import { cloneItinerary } from '@/api/itineraryApi'
import { useTripboardIds } from '@/modules/Tripboard/hooks/useTripboardIds'
import TripSelectionModal, { type PendingWizardData } from '../components/TripSelectionModal'
import { INITIAL_WIZARD_STATE } from '@/modules/Itinerary/components/CreateItineraryWizard/types'
import { useTripboardOrchestration } from '../hooks/useTripboardOrchestration'
import TripboardOrchestrationView from '../components/TripboardOrchestrationView'
import CreateFlowTabContent, { type CreateFlowTab } from '../components/CreateFlowTabContent'
import TripboardHeader from '../components/TripboardHeader'
import type { TripboardHeaderTab } from '../components/TripboardHeader'

import { resolveStaysViewMode } from '@/modules/ContentCollection/utils/tripboardStaysUtils'
import { useTripboardStaleness } from '@/modules/ContentCollection/hooks/useTripboardStaleness'
import { useTripboardSync } from '@/modules/ContentCollection/hooks/useTripboardSync'
import TripDailyHighlightsSection from '../components/TripDailyHighlightsSection'
import TopCitiesSection from '@/modules/Acitvities/sections/TopCitiesSection'
import { DiscoverWatchAlongPanel } from '@/pages/Landing/Components/DiscoverWatchAlongPanel'
import { useExperiencesWithShorts } from '@/modules/Experiences/hooks/useExperiencesWithShorts'
import ShortsModal from '@/modules/WatchAlong/components/ShortsModal'
import { useItineraryCompletedData, useItineraryRouteSummary, type IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import { useItineraryMapData } from '@/modules/Itinerary/hooks/useItineraryMapData'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import MobileStickyCTA from '@/modules/Premium/components/MobileStickyCTA'
import { resetWindowScrollAfterItineraryTabMobile, scrollTripboardToTopOnMobile } from '@/modules/Tripboard/utils/scrollForItineraryTabMobile'
import type { CollectionBulkSelectionConfig } from '@/components/Collection'
import { BookingsTab } from '../components/BookingsTab'
import { useTripBudget } from '../hooks/useTripBudget'
import { budgetApi } from '../api/budgetApi'
import { useSetCreatorAttribution, type CreatorAttribution } from '@/modules/amplitude/components/creatorAttributionHooks'

const TripboardPageInner: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const { tripId: tripIdFromParams } = useParams<{ tripId: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    // `/tripboard/new` is a literal path segment, NOT a :tripId param — useParams() returns
    // undefined for `tripId` on that route. Detect the pre-trip route via pathname instead.
    const isPreTripPath = location.pathname === '/tripboard/new' || location.pathname === '/tripboard/new/'

    // NOTE: debug logs left in while the routing bug is being shaken out; remove once stable.
    const activeTab = useMemo(() => searchParams.get('tab') ?? null, [searchParams])
    const setActiveTab = useCallback((tab: string | null) => {
        const next = new URLSearchParams(searchParams)
        if (tab) {
            next.set('tab', tab)
        } else {
            next.delete('tab')
        }
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams])


    const [isItineraryMapActive, setIsItineraryMapActive] = useState(false)

    // Anchor for the tab-content scroller (window or inner map container).
    const tabScrollContainerRef = useRef<HTMLDivElement>(null)

    // On tab change, reset scroll (mobile) so the new tab's sticky sub-header
    // isn't clipped. In an effect so it runs after the tab actually renders.
    useEffect(() => {
        if (!activeTab) return
        scrollTripboardToTopOnMobile(tabScrollContainerRef.current)
    }, [activeTab])

    const navigateToItineraryTab = useCallback(
        (dayIndex?: number, opts?: { view?: 'board' }) => {
            const next = new URLSearchParams()
            const tripIdVal = searchParams.get('trip_id')
            if (tripIdVal) next.set('trip_id', tripIdVal)
            next.set('tab', 'itinerary')
            next.delete('itineraryMap')
            next.delete('itineraryBoard')
            if (opts?.view === 'board') {
                next.set('itineraryBoard', '1')
                next.delete('itineraryDay')
            } else if (dayIndex !== undefined && Number.isFinite(dayIndex)) {
                next.set('itineraryDay', String(dayIndex))
                next.set('itineraryMap', '1')
            } else {
                next.delete('itineraryDay')
            }
            setSearchParams(next)
            resetWindowScrollAfterItineraryTabMobile()
        },
        [searchParams, setSearchParams]
    )
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const [isItineraryRecreateMode, setIsItineraryRecreateMode] = useState(false)
    // Itinerary-tab overflow actions are registered from inside Itinerary /
    // ItineraryTabContent via callback refs — the underlying handlers
    // manipulate local component state so they can't be hoisted. The
    // header invokes the latest via ref; `can*` state mirrors registration
    // so menu rows only appear when the owning component is mounted.
    const itineraryRecreateHandlerRef = useRef<(() => void) | null>(null)
    const [canRecreateItinerary, setCanRecreateItinerary] = useState(false)
    const registerItineraryRecreateHandler = useCallback((handler: (() => void) | null) => {
        itineraryRecreateHandlerRef.current = handler
        setCanRecreateItinerary(!!handler)
    }, [])
    // `handleRecreateFromHeader` needs `tripId` for the pre-recreate auto-backup,
    // but `tripId` is declared further down in this component. Defining it here as a
    // forwarding ref keeps the recreate registration co-located with the other
    // itinerary-handler refs above; the actual handler with `tripId` access is
    // assigned later (search for `// handleRecreateFromHeader assignment`).
    const handleRecreateFromHeaderRef = useRef<() => Promise<void> | void>(() => {
        itineraryRecreateHandlerRef.current?.()
    })
    const handleRecreateFromHeader = useCallback(() => {
        return handleRecreateFromHeaderRef.current()
    }, [])

    const itineraryShareHandlerRef = useRef<(() => void) | null>(null)
    const [canShareItinerary, setCanShareItinerary] = useState(false)
    const registerItineraryShareHandler = useCallback((handler: (() => void) | null) => {
        itineraryShareHandlerRef.current = handler
        setCanShareItinerary(!!handler)
    }, [])
    const handleShareItineraryFromHeader = useCallback(() => {
        itineraryShareHandlerRef.current?.()
    }, [])

    const [addToCollectionModalOpen, setAddToCollectionModalOpen] = useState<string | null>(null)
    const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false)
    const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'map'>('list')
    const staysHeaderPortalRef = useRef<HTMLDivElement>(null)
    // Mobile-only: collapse the sub-header (chip carousel + secondary controls)
    // on scroll-down so the list area uses the whole viewport. Restores on
    // scroll-up. Desktop is unaffected. The trip-name row hide lives in
    // TripboardHeader (which calls the hook itself); this drives the sub-header.
    const isMobileViewport = useIsMobile()
    const hideMobileSubHeader = useHideOnScrollDown()

    // When the user switches tabs, reset every useHideOnScrollDown listener to
    // the "visible" state. Without this, scrolling down on tab A would leave the
    // sub-header hidden when the user lands on tab B (which is at scrollTop=0).
    useEffect(() => {
        if (activeTab === null) return
        dispatchForceShowHeaders()
    }, [activeTab])
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false)
    const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set())
    // Track if user has ever switched to map tab — defer Mapbox init on mobile until needed (saves Mapbox credits)
    const [hasEverOpenedMobileMap, setHasEverOpenedMobileMap] = useState(false)
    useEffect(() => {
        if (mobileActiveTab === 'map') setHasEverOpenedMobileMap(true)
    }, [mobileActiveTab])
    // Reset mobile tab to list when switching main tabs (prevents map hiding list content on other tabs)
    useEffect(() => {
        setMobileActiveTab('list')
    }, [activeTab])
    useEffect(() => {
        setIsBulkSelectMode(false)
        setSelectedSectionIds(new Set())
    }, [activeTab])

    // Cross-page "View Changes": when arriving with ?tab=itinerary&view_changes=1,
    // read full changes payload from sessionStorage and dispatch to the Itinerary component
    // for scroll + highlight with real slot data.
    useEffect(() => {
        if (activeTab !== 'itinerary') return
        if (searchParams.get('view_changes') !== '1') return

        // Clean up URL flag so it doesn't re-trigger
        const next = new URLSearchParams(searchParams)
        next.delete('view_changes')
        setSearchParams(next, { replace: true })

        // Read and consume the stored changes
        let changes: Record<string, unknown> | null = null
        try {
            const raw = sessionStorage.getItem('rimigo:pendingViewChanges')
            if (raw) {
                changes = JSON.parse(raw)
                sessionStorage.removeItem('rimigo:pendingViewChanges')
            }
        } catch { /* ignore parse errors */ }

        if (!changes) return

        // Delay to let the Itinerary component mount and register its event listener
        const timer = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('rimigo:viewChanges', { detail: changes }))
        }, 800)
        return () => clearTimeout(timer)
    }, [activeTab, searchParams, setSearchParams])

    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)

    // ── Create flow: tab state ────
    const [createFlowActiveTab, setCreateFlowActiveTab] = useState<string>('itinerary')
    const [createFlowHasDestination, setCreateFlowHasDestination] = useState(false)
    const [createFlowCountryIds, setCreateFlowCountryIds] = useState<string[]>([])
    // Fetch preview data to check if tips/links exist for the selected country
    const { data: createFlowPreviewData } = useQuery({
        queryKey: ['create-flow-preview', ...createFlowCountryIds],
        queryFn: () => getTripboardPreview(createFlowCountryIds),
        enabled: createFlowCountryIds.length > 0,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
    })

    // Must Have now consolidates tips/dos/donts + links/visa/sim — show the
    // tab whenever ANY of those has content (matches MustHaveTabContent on
    // the post-create tripboard).
    const createFlowHasMustHave = useMemo(() => {
        if (!createFlowPreviewData) return false
        return Object.values(createFlowPreviewData).some(
            country =>
                (country.tips?.length > 0
               ) || (country.dos?.length > 0
               ) || (country.donts?.length > 0)
                || Object.values(country.links ?? {}).some((catLinks) => catLinks.length > 0)
        )
    }, [createFlowPreviewData])

    // Tabs appear after destination is selected via createFlowHasDestination
    // Must Have and Tips only show if the country has data for them
    const createFlowTabs: TripboardHeaderTab[] = useMemo(() => {
        const tabs: TripboardHeaderTab[] = [
            ...(SHOW_TRIPBOARD_OVERVIEW_TAB
                ? [{ key: 'overview', label: 'Overview', isLocked: !createFlowHasDestination } as TripboardHeaderTab]
                : []),
            { key: 'itinerary', label: 'Itinerary' },
            { key: 'stays', label: 'Stays', isLocked: true },
            { key: 'experience', label: 'Activities', isLocked: true },
            { key: 'restaurant', label: 'Restaurants', isLocked: true },
        ]
        if (createFlowHasMustHave) {
            tabs.push({ key: 'must_have', label: 'Must Have', isLocked: !createFlowHasDestination })
        }
        return tabs
    }, [createFlowHasDestination, createFlowHasMustHave])
    const { isRimigoInternal, isPremium } = useUserInfo()
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const travelerTripsContext = useOptionalTravelerTrips()
    const [isStaysFilterOpen, setIsStaysFilterOpen] = useState(false)
    const [isStaysSortOpen, setIsStaysSortOpen] = useState(false)
    const [selectedCountrySwitcherId, setSelectedCountrySwitcherId] = useState<string | null>(
        travelerTripsContext?.activeTrip?.final_destination_countries?.[0]?.id ?? null
    )

    // ── Fetch itinerary agent ID for assistant ─────────────────────
    const itineraryAgentId = useItineraryAgentId()

    const { countries } = useLocationPersonalization()

    const switcherCountries = useSwitcherCountries(travelerTripsContext?.activeTrip, countries)

    // Derive default destination from active trip (for existing-trip-no-collection case)
    const defaultDestinationFromTrip = useDefaultDestination(travelerTripsContext?.activeTrip)

    // ── Unified tripboard creation orchestration ──────────────────────
    const orchestration = useTripboardOrchestration(travelerTripsContext)

    // ── ?create=true overlay ──────────────────────────────────────────
    const isCreateOverlayOpen = searchParams.get('create') === 'true'
    const closeCreateOverlay = useCallback(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('create')
        setSearchParams(next, { replace: true })
        // Reset create flow state
        setCreateFlowHasDestination(false)
        setCreateFlowCountryIds([])
        setCreateFlowActiveTab('itinerary')
    }, [searchParams, setSearchParams])

    // Auto-remove ?create=true when orchestration kicks in
    useEffect(() => {
        if (orchestration.state.phase !== 'idle' && isCreateOverlayOpen) {
            closeCreateOverlay()
        }
    }, [orchestration.state.phase, isCreateOverlayOpen, closeCreateOverlay])

    // ── URL sync: when orchestration acquires a trip id, move the URL to `/tripboard/<tripId>` ──
    // Only hijacks when the URL is a *pre-trip placeholder* (no tripId yet):
    //   • `/tripboard/new` — the create flow's literal path.
    //   • bare `/tripboard` — rendered transiently via `TripboardIndexRedirect`.
    // Never hijacks `/tripboard/<someOtherTripId>` — the user may have deliberately switched
    // to a different trip mid-create (e.g. via the sidebar) and expects that trip to load
    // while the creation continues in the background (the mini indicator surfaces the
    // in-flight trip so they can jump back).
    // Preserves the existing query string so deep links (tab, stays_city, etc.) survive.
    useEffect(() => {
        const orchTripId = orchestration.state.tripId
        const isOnPreTripPlaceholder =
            location.pathname === '/tripboard/new'
            || location.pathname === '/tripboard/new/'
            || location.pathname === '/tripboard'
            || location.pathname === '/tripboard/'
        const willNavigate = !!orchTripId && isOnPreTripPlaceholder
        if (!willNavigate) return
        const qs = searchParams.toString()
        const suffix = qs ? `?${qs}` : ''
        // eslint-disable-next-line no-console
        navigate(`/tripboard/${orchTripId}${suffix}`, { replace: true })
    }, [orchestration.state.tripId, tripIdFromParams, location.pathname, navigate, searchParams, orchestration.state.phase])

    // ── Post-login wizard recovery (from sessionStorage) ─────────────
    const [showTripSelectionModal, setShowTripSelectionModal] = useState(false)
    const [pendingWizardData, setPendingWizardData] = useState<PendingWizardData | null>(null)
    const [pendingWizardDataForAutoStart, setPendingWizardDataForAutoStart] = useState<PendingWizardData | null>(null)
    // Past-dates modal dismissal — local-state only so the prompt comes
    // back on every reload until the user actually updates dates.
    const [pastDatesModalDismissed, setPastDatesModalDismissed] = useState(false)
    const hasRecoveredWizard = useRef(false)
    const hasAutoStarted = useRef(false)

    useEffect(() => {
        if (hasRecoveredWizard.current) return
        hasRecoveredWizard.current = true

        const stored = sessionStorage.getItem('tripboard_create_wizard')
        if (!stored) return

        // NOTE: do NOT remove the key here. Right after login, mounting
        // TravelerTripsProvider remounts TripboardPage. If a transient instance
        // reads + removes the key, then unmounts before the auto-start effect
        // fires, the resume payload is lost and the user lands back on the empty
        // wizard. We consume the key in the auto-start effect instead (once
        // we've actually handed off to orchestration / the modal). Double-create
        // is prevented by the module-level `pipelineRunning` guard.
        try {
            const data = JSON.parse(stored) as PendingWizardData
            if (data.destinations?.length > 0 && data.groupType && data.purpose) {
                if (data.wizardState?.startDate) {
                    data.wizardState.startDate = new Date(data.wizardState.startDate)
                }
                if (data.wizardState?.endDate) {
                    data.wizardState.endDate = new Date(data.wizardState.endDate)
                }
                setPendingWizardData(data)
                setPendingWizardDataForAutoStart(data)
            } else {
                // Malformed / incomplete payload — drop it so it can't wedge.
                sessionStorage.removeItem('tripboard_create_wizard')
            }
        } catch {
            sessionStorage.removeItem('tripboard_create_wizard')
        }
    }, [])

    // Auto-start for first-time users (0 trips) or show modal for returning users
    useEffect(() => {
        if (!pendingWizardDataForAutoStart || hasAutoStarted.current) return
        if (travelerTripsContext?.isLoading) return // Wait for trips to load

        const trips = travelerTripsContext?.tripsData?.trips ?? []

        if (trips.length === 0) {
            // First-time user — but DON'T create on the post-login remount that
            // fires before the name modal is submitted (the create flow set this
            // flag at submit; it survives that same-document remount and resets on
            // the post-name reload). Skipping here leaves the resume key intact so
            // the reload — where the name is already saved — does the create.
            if (isAwaitingPostLoginReload()) return

            hasAutoStarted.current = true
            // Consume the resume key now (not at read time) — see the read effect's
            // note. startFromWizard sets the orchestration phase synchronously, so a
            // remount immediately after this sees the in-flight pipeline rather than
            // re-hydrating a fresh wizard.
            sessionStorage.removeItem('tripboard_create_wizard')
            const data = pendingWizardDataForAutoStart
            setPendingWizardDataForAutoStart(null)
            orchestration.startFromWizard({
                destinations: data.destinations,
                groupType: data.groupType,
                purpose: data.purpose,
                wizardState: data.wizardState || INITIAL_WIZARD_STATE,
                tripSource: data.tripSource,
                utmMedium: data.utmMedium,
                utmCampaign: data.utmCampaign,
                travelerTripsContext: travelerTripsContext ?? undefined
            })
        } else {
            // Returning user — show trip selection modal
            hasAutoStarted.current = true
            sessionStorage.removeItem('tripboard_create_wizard')
            setPendingWizardData(pendingWizardDataForAutoStart)
            setPendingWizardDataForAutoStart(null)
            setShowTripSelectionModal(true)
        }
    }, [pendingWizardDataForAutoStart, travelerTripsContext?.isLoading, travelerTripsContext?.tripsData?.trips, orchestration])

    // Sync createFlowCountryIds from orchestration wizard data (e.g., after page reload)
    useEffect(() => {
        if (createFlowCountryIds.length === 0 && orchestration.state.phase !== 'idle') {
            const wizardDestinations = orchestration.state.wizardData?.destinations
            if (wizardDestinations && wizardDestinations.length > 0) {
                setCreateFlowCountryIds(wizardDestinations.map(d => d.id))
            }
        }
    }, [orchestration.state.phase, orchestration.state.wizardData?.destinations, createFlowCountryIds.length])

    // Single source of truth for tripId + itineraryId resolution. Lives in
    // `@/modules/Tripboard/hooks/useTripboardIds` so any "which trip is this
    // page actually rendering?" debugging starts in one file. NEVER read
    // either id from another source on this page — that's how non-owner URL
    // viewers previously inherited the viewer's active trip itinerary.
    const { tripId, tripName, itineraryId, isViewingActiveTrip } = useTripboardIds()

    // handleRecreateFromHeader assignment — now that `tripId` is in scope, wire
    // the auto-save-before-recreate flow. Stored in the forwarding ref defined
    // above so the stable `handleRecreateFromHeader` callback always sees the
    // latest tripId without depending on render order.
    handleRecreateFromHeaderRef.current = async () => {
        if (tripId) {
            try {
                const { saveTripboardVersion } = await import('@/api/tripboardVersionsApi')
                const stamp = new Date().toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })
                await saveTripboardVersion(tripId, {
                    name: `Backup · before recreate · ${stamp}`,
                    note: 'Saved automatically before regenerating the itinerary.',
                })
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('[Versioning] auto-save before recreate failed', e)
            }
        }
        itineraryRecreateHandlerRef.current?.()
    }


    // Resolve the *current URL's* trip from the user's trips list, not just the context-active trip.
    // With URL-based routing, a user can visit a tripboard that isn't their active one (e.g. a shared
    // link from an invitee, or a stranger's trip opened read-only).
    const tripsList = travelerTripsContext?.tripsData?.trips
    const tripFromList = useMemo(() => {
        if (!tripId || !tripsList) return undefined
        return tripsList.find((t) => t.trip_id === tripId)
    }, [tripId, tripsList])

    // Access mode: 'owner' | 'invitee' | 'readOnly'. Viewers who are neither owner nor invitee
    // (logged-out, or logged-in non-member) get read-only.
    const isAuthenticated = !!travelerTripsContext // provider only mounts when authed
    const isOwner = !!tripFromList && tripFromList.role !== 'invited' && tripFromList.role !== 'co_traveler'
    const isInvitee = !!tripFromList && (tripFromList.role === 'invited' || tripFromList.role === 'co_traveler')
    const accessMode: 'owner' | 'invitee' | 'readOnly' =
        isAuthenticated && isOwner ? 'owner' : isAuthenticated && isInvitee ? 'invitee' : 'readOnly'
    const isReadOnly = accessMode === 'readOnly'

    // Back-compat local used throughout the page. `activeTrip` is semantically "the trip
    // this page is showing". With URL-based routing, that is the URL's trip — never the
    // context's `activeTrip` (which reflects the user's last choice and may differ from the
    // URL, e.g. on /tripboard/new or a read-only stranger's link). Falling back to context
    // caused the previous active trip's content to bleed onto the wrong URL. Downstream
    // uses are already null-safe via optional chaining.
    const activeTrip = tripFromList
    const isInvitedTrip = isInvitee

    // For invitee views, the collection lookup needs the *owner's* traveler id
    // (see tripboardApi.getCollectionByTripId param ordering).
    const tripOwnerId = isInvitee ? tripFromList?.owner_id : undefined

    // Real trip-owner traveler id, used to fetch the owner's actual first name for
    // the "Recommend for {name}" copy. Falls back to undefined when the trip isn't
    // in the user's tripsList yet (read-only/anon views).
    const tripOwnerTravelerId = tripFromList?.owner_id ?? undefined
    const { data: tripOwnerTravelerData } = useQuery({
        queryKey: ['traveler-by-id', tripOwnerTravelerId],
        queryFn: () => (tripOwnerTravelerId ? getTravelerDetails(tripOwnerTravelerId) : Promise.resolve(null)),
        enabled: !!tripOwnerTravelerId,
        staleTime: 5 * 60 * 1000
    })
    const tripOwnerFirstName = useMemo(() => {
        const fullName = tripOwnerTravelerData?.name?.trim()
        if (!fullName) return null
        return fullName.split(/\s+/)[0] || null
    }, [tripOwnerTravelerData])

    // ── Sync URL's tripId to active trip ONLY when the user owns it ───────
    // Persists the user's last opened trip server-side via
    // `PUT /api/travelers/trip/active/` so other pages reflect the choice.
    //
    // Crucially: do NOT mutate `activeTrip` when the user is viewing a trip
    // they don't own ( public/shared paste, stranger's URL).
    // Their personally-chosen active trip must be preserved — otherwise simply
    // visiting someone else's tripboard would clobber it. Non-owner views
    // render directly off the URL's `tripId`; they don't need the active-trip
    // context to be in sync.
    // when invited, then also it will be set to active trip
    useEffect(() => {
        if (accessMode == 'readOnly') return
        if (!tripId) return
        if (travelerTripsContext?.activeTripId === tripId) return
        travelerTripsContext?.updateActiveTrip?.(tripId, { replaceOnly: true })
    }, [accessMode, tripId, travelerTripsContext])

    // Fetch collection by trip_id to resolve the identifier
    const {
        data: tripCollectionResponse,
        isLoading: isTripCollectionLoading,
        isError: isTripCollectionError
    } = useQuery({
        queryKey: ['tripboard-collection', tripId, tripOwnerId],
        queryFn: async () => {
            if (!tripId) {
                return { data: [] } as ApiResponse<ContentCollection[]>
            }
            return await tripboardApi.getCollectionByTripId(tripId, tripOwnerId)
        },
        // Only disable while orchestration is running *for this specific trip*. This way,
        // a user who starts creating trip A and then switches to trip B can still load B's data.
        enabled: !!tripId && !orchestration.isOrchestrationFor(tripId),
        // Cache the resolved identifier. Every downstream query is `enabled: !!identifier`,
        // so when this was gcTime:0/staleTime:0 it cold-started the ENTIRE chain on every
        // mount — the dominant cause of the full loading skeleton on revisits. The
        // identifier is stable for a trip, and the places where it can actually change
        // already refetch this key explicitly (orchestration in useTripboardOrchestration,
        // version restore in VersionsPanel / VersionPreviewPage), so caching is safe.
        // Returning to a previously-opened trip now renders from cache instantly while a
        // background refetch keeps it fresh.
        staleTime: FIVE_MINUTES,
        gcTime: HOURS_24
    })

    // Collection key threaded through every tripboard collection API call + query key.
    // We now use the collection's `id` (Mongo ObjectId) instead of the slug `identifier`
    // — the backend collection lookups accept either (get_by_id_or_identifier), so this is
    // non-breaking. Falls back to `identifier` if `id` is ever absent. (Variable name kept
    // as `identifier` to avoid churning the 30+ downstream consumers — Approach A.)
    const identifier = useMemo(() => {
        const collections = tripCollectionResponse?.data
        if (Array.isArray(collections) && collections.length > 0) {
            return collections[0].id ?? collections[0].identifier
        }
        return undefined
    }, [tripCollectionResponse])

    const tripboardStaleness = useTripboardStaleness(identifier, 'traveler')
    const tripboardPageSync = useTripboardSync(identifier, 'traveler')

    useEffect(() => {
        if (tripboardPageSync.isSuccess) {
            tripboardStaleness.markSynced()
        }
    }, [tripboardPageSync.isSuccess, tripboardStaleness.markSynced])

    // Read-only viewers (non-members / incognito) can't sync — hide the Stays/Activities
    // in-tab sync banner for them, same as the Sync button in the header.
    const showItinerarySyncTabCta = !isReadOnly &&
        !!identifier &&
        tripboardStaleness.hasItinerary &&
        (tripboardStaleness.isStale || tripboardPageSync.isPending)

    const tripboardSyncFromPage = useMemo(
        () => ({
            canSync: showItinerarySyncTabCta,
            isPending: tripboardPageSync.isPending,
            sync: tripboardPageSync.sync
        }),
        [showItinerarySyncTabCta, tripboardPageSync.isPending, tripboardPageSync.sync]
    )

    // Budget data — only fetched once the user is on the Budget tab so the
    // Overview (and other non-budget tabs) don't trigger an eager network call.
    // The Budget tab's own BookingsTab also calls useTripBudget; react-query
    // dedupes via queryKey so there's still only one request.
    useTripBudget(identifier, false, activeTab === 'budget')

    const {
        sectionTypes,
        isLoading: isSectionTypesLoading,
        isError: isSectionTypesError,
        isFetched: isSectionTypesFetched
    } = useTravelerCollectionSectionTypes(identifier)

    // Hold the loading shell until section types have actually settled for this
    // identifier. Without this, the tick where `isSectionTypesLoading` is false but the
    // fetch hasn't started leaks through to the main render with an empty `headerTabs`,
    // flashing a header with no tab bar.
    const isSectionTypesPending = !!identifier && !isSectionTypesFetched

    // Filter out section types hidden from tabs (e.g. dos_donts shown inside Tips)
    // Overview tab will be included if it comes in the sectionTypes response
    const baseAllTabs: SectionType[] = useMemo(() => buildBaseAllTabs(sectionTypes), [sectionTypes])

    // Fetch collection data for experiences - always fetch (contains context, name, etc.)
    const {
        data: experienceCollectionResponse,
        isLoading: isExperienceCollectionLoading,
        isError: isExperienceCollectionError
    } = useQuery({
        queryKey: ['traveler-collection', identifier, 'experience'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await travelerCollectionApi.getByIdentifier(identifier, 'experience')
        },
        enabled: !!identifier && !!activeTab,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        placeholderData: keepPreviousData
    })

    // Per-collection tour recommendations live in metadata. Hoisted here (above all conditional
    // early returns later in the component) to avoid a rules-of-hooks violation.
    const personalTourRecommendations = useMemo(() => {
        const md =
            (experienceCollectionResponse?.data as { metadata?: { tour_recommendations?: PersonalTourRecommendation[] } } | undefined)?.metadata
        return md?.tour_recommendations ?? null
    }, [experienceCollectionResponse])

    // Per-collection tour price overrides — same metadata source as recommendations, hoisted
    // above conditional returns for the same rules-of-hooks reason.
    const personalTourPriceOverrides = useMemo(() => {
        const md =
            (experienceCollectionResponse?.data as { metadata?: { tour_price_overrides?: PersonalTourPriceOverride[] } } | undefined)?.metadata
        return md?.tour_price_overrides ?? null
    }, [experienceCollectionResponse])

    // Fetch collection data for stays - always fetch
    const {
        data: staysCollectionResponse,
        isLoading: isStaysCollectionLoading,
        isError: isStaysCollectionError
    } = useQuery({
        queryKey: ['traveler-collection', identifier, 'stays'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await travelerCollectionApi.getByIdentifier(identifier, 'stays')
        },
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Flights collection — backs the Flights tab's legs. The hook also bridges off
    // `itineraryCompleted` writes to invalidate this query, so the BE-derived legs
    // refresh the moment a flight is added (no reload). See useFlightsCollection.
    const { data: flightsCollectionResponse, isLoading: isFlightsCollectionLoading } = useFlightsCollection(identifier, itineraryId)

    // Warm the itinerary-section collection as soon as the identifier resolves, in
    // parallel with the experience/stays/flights fetches above. ItineraryTabContent
    // (the default tab) fetches this same key only once it mounts, AFTER the page gates
    // pass — a serial hop that flashed its own two-shimmer-block loader. Prefetching it
    // here means the cache is warm by the time the tab renders. The key + queryFn match
    // ItineraryTabContent exactly so React Query dedupes to a single request.
    useQuery({
        queryKey: ['content-collection', identifier, 'itinerary'],
        queryFn: async () => travelerCollectionApi.getByIdentifier(identifier!, 'itinerary'),
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const flightSections = useMemo(() => {
        const collection = flightsCollectionResponse?.data
        if (!collection) return []
        const raw = Array.isArray(collection) ? collection[0] : collection
        const sections = raw?.sections
        return (sections || []).filter((s: Section) => s.section_type === 'flights')
    }, [flightsCollectionResponse])

    const flightMetadata = useMemo<{
        home_airport_iata: string | null
        flight_legs: import('@/modules/ContentCollection/api/travelerCollectionApi').FlightLeg[]
    }>(() => {
        const collection = flightsCollectionResponse?.data
        if (!collection) return { home_airport_iata: null, flight_legs: [] }
        const raw = (Array.isArray(collection) ? collection[0] : collection) as Record<string, unknown> | undefined
        const meta = (raw?.metadata as Record<string, unknown> | undefined) || {}
        return {
            home_airport_iata: (meta.home_airport_iata as string | null) ?? null,
            flight_legs:
                (meta.flight_legs as import('@/modules/ContentCollection/api/travelerCollectionApi').FlightLeg[]) || []
        }
    }, [flightsCollectionResponse])

    // Select the appropriate collection response based on activeTab
    // Use experience response for collection metadata (context, name, etc.) since it's always available
    const activeCollectionResponse = useMemo(() => {
        if (activeTab === 'stays') {
            return staysCollectionResponse
        }
        // For experience tab or other tabs (overview, tips, etc.), use experience response
        return experienceCollectionResponse
    }, [activeTab, experienceCollectionResponse, staysCollectionResponse])

    // Build a map of section ID → blocks (for comments rendering in tabs)
    const sectionBlocksMap = useMemo(() => {
        const map = new Map<string, import('@/modules/ContentCollection/types/contentCollection').Block[]>()
        activeCollectionResponse?.data?.sections?.forEach((section: Section) => {
            if (section.id && section.blocks?.length) {
                map.set(section.id, section.blocks)
            }
        })
        return map
    }, [activeCollectionResponse])

    // Use experience response for collection metadata (context, name, etc.)
    const collectionMetadataResponse = experienceCollectionResponse

    const isCollectionLoading = activeTab === 'stays' ? isStaysCollectionLoading : isExperienceCollectionLoading
    const isCollectionError = activeTab === 'stays' ? isStaysCollectionError : isExperienceCollectionError

    // TODO: Remove it, plural countryIds should be used 
    const countryId = useMemo(() => {
        if (!collectionMetadataResponse?.data?.context) return undefined

        const contextCountryId = collectionMetadataResponse.data.context?.country_id
        if (contextCountryId) {
            if (Array.isArray(contextCountryId) && contextCountryId.length > 0) {
                return contextCountryId[0]
            }
            if (typeof contextCountryId === 'string') {
                return contextCountryId
            }
        }

        return undefined
    }, [collectionMetadataResponse])

    // All country IDs for multi-destination trips (used by AddExternalStaysModal)
    const countryIds = useMemo(() => {
        return travelerTripsContext?.activeTrip?.final_destination_countries?.map((c) => c.id).filter(Boolean) ?? []
    }, [travelerTripsContext?.activeTrip?.final_destination_countries])

    const exploreCountryIdForActivities = selectedCountrySwitcherId ?? countryId
    const exploreCountryNameForActivities = useMemo(() => {
        const id = selectedCountrySwitcherId ?? countryId
        if (!id) {
            return travelerTripsContext?.activeTrip?.final_destination_countries?.[0]?.name
        }
        const fromSwitcher = switcherCountries.find((c) => c.country_id === id)?.country_name
        return fromSwitcher ?? travelerTripsContext?.activeTrip?.final_destination_countries?.[0]?.name
    }, [
        selectedCountrySwitcherId,
        countryId,
        switcherCountries,
        travelerTripsContext?.activeTrip?.final_destination_countries
    ])

    // ── Itinerary map data (for day-wise pins on map) ───────────────
    const itineraryCompletedQuery = useItineraryCompletedData(itineraryId)
    const itineraryData = itineraryCompletedQuery.data as IItineraryCompletedResponse | undefined
    const isItineraryLoading = itineraryCompletedQuery.isLoading

    // ── Itinerary tab loader ─────────────────────────────────────────────────
    // compass (page shell, while the collection/sections resolve) → kanban skeleton
    // (here, while the `complete/` itinerary data is still loading) → content. No forced
    // timer: the skeleton is shown exactly while the itinerary data is pending.
    const isItineraryDataPending = !itineraryData
    const { dayMapData: itineraryDayMapData } = useItineraryMapData(itineraryData?.days ?? [])
    // Derived per-stay windows + bookend home-city hops live in the
    // route-summary endpoint. Drives StaysTab carousel; falls back to
    // computeItineraryWindows(itineraryDays) while this is in flight.
    const { data: routeSummary } = useItineraryRouteSummary(itineraryId ?? '')

    // ── Past-dates rates fallback ─────────────────────────────────────────
    // Past itineraries: write stays_exp_* params so explore rates and the
    // ExploringDatesBanner use a future window. Carousel chips stay on
    // original dates (StaysTab re-derives from unshifted itineraryDays).
    // Skipped if the user already has a stays_exp_* override.
    useEffect(() => {
        const days = itineraryData?.days
        if (!days || days.length === 0) return
        const expIn = searchParams.get(STAYS_EXP_PARAMS.checkIn)
        const expOut = searchParams.get(STAYS_EXP_PARAMS.checkOut)
        const isPast = isItineraryStartedOrPast(days)

        // Itinerary is no longer past (e.g., user just shifted dates via
        // PastDatesTakeover) but stays_exp_* fallback params are still in
        // the URL from a prior past-itinerary load. Clear them so rates and
        // the banner follow the new city windows instead of stale dates.
        if (!isPast) {
            const firstYmd = days[0]?.date ? formatDateStringToYMD(days[0].date) : null
            const todayYmd = formatDateToYMD(new Date()) ?? ''
            // Detect "stale fallback": exp checkIn is in the future and
            // strictly after the itinerary's first day. A user-set exp
            // window on a not-past trip is left alone if it precedes /
            // matches the itinerary (the StaysTab self-clear handles the
            // matching case).
            const looksLikeStaleFallback =
                !!expIn && !!firstYmd && !!todayYmd && expIn > todayYmd && expIn > firstYmd
            if (expIn && expOut && looksLikeStaleFallback) {
                const next = new URLSearchParams(searchParams)
                next.delete(STAYS_EXP_PARAMS.checkIn)
                next.delete(STAYS_EXP_PARAMS.checkOut)
                next.delete(STAYS_EXP_PARAMS.window)
                setSearchParams(next, { replace: true })
            }
            return
        }

        if (expIn && expOut) return
        const firstYmd = days[0]?.date ? formatDateStringToYMD(days[0].date) : null
        const lastYmd = days[days.length - 1]?.date ? formatDateStringToYMD(days[days.length - 1].date) : null
        const tripLen = firstYmd && lastYmd ? daysBetweenYmd(firstYmd, lastYmd) : 0
        const fallback = computePastDatesFallbackWindow(tripLen)
        const next = new URLSearchParams(searchParams)
        writeStaysExpFallbackParams(next, fallback)
        setSearchParams(next, { replace: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itineraryData?.days])

    // Vouchers — synthetic tab driven by the count of vouchers attached to
    // the trip. The "Add Vouchers" header entry bootstraps the tab on first
    // click by setting `?tab=vouchers`; we pass `force` whenever that's the
    // active tab so the tab strip resolves correctly even pre-upload.
    //
    // Auth-gated: vouchers are personal trip data. Logged-out viewers and
    // read-only (shared-link) viewers don't fetch or see them at all.
    const canAccessVouchers = isAuthenticated && !isReadOnly
    const { vouchers: tripVouchers } = useTripVouchers(
        tripId ?? undefined,
        canAccessVouchers && !!tripId,
    )
    const voucherCount = canAccessVouchers ? tripVouchers.length : 0

    const allTabs: SectionType[] = useMemo(() => {
        const withFood = appendSyntheticFoodTab(baseAllTabs, itineraryData)
        if (!canAccessVouchers) return withFood
        return appendSyntheticVouchersTab(withFood, {
            voucherCount,
            force: activeTab === 'vouchers',
        })
    }, [baseAllTabs, itineraryData, voucherCount, activeTab, canAccessVouchers])

    // ── PDF export handler ─────────────────────────────────────────────
    // Builds a `PdfData` object from the already-loaded itinerary / trip
    // / voucher data, then triggers `downloadItineraryPdf` (which dynamic-
    // imports the heavy react-pdf module). The handler is gated to "have
    // everything we need" — when it's `undefined`, the header hides the
    // Download PDF menu entry.
    //
    // We narrow `activeTrip` (a wide union of legacy shapes) to the
    // subset of fields the PDF actually reads — cleaner than scattering
    // `(activeTrip as any)?.foo` accesses through the handler.
    const canDownloadPDF = !!itineraryData && !!activeTrip && !!tripId
    const handleDownloadPDF = useCallback(async () => {
        if (!itineraryData || !activeTrip || !tripId) return
        const [
            { downloadItineraryPdf },
            { extractMustHaveForPdf },
            { adaptToursToUI },
        ] = await Promise.all([
            import('@/modules/Itinerary/pdf/downloadItineraryPdf'),
            import('@/modules/ContentCollection/utils/extractMustHaveForPdf'),
            import('@/modules/Experiences/adapters/toursAdapter'),
        ])
        type ToursRes = import('@/modules/Experiences/types/toursResponseTypes').ToursResponseType
        // Pull deals from the React Query cache rather than the API.
        // The Activities tab (and the batch SSE inside it) warms
        // `['tours', experienceId, checkIn]` for every experience the
        // trip has — same key the website's TourCard reads. When the
        // user has opened Activities at least once, those deals are
        // already in memory; the PDF just snapshots them.
        //
        // If the cache is cold (user hasn't visited Activities), an
        // experience gets no inline deal cards and falls back to the
        // "View deals on Rimigo →" link. No more 400 API spam during
        // export — that was the staging API rejecting check_in for
        // certain experiences regardless of fallback strategy.
        const readCachedDeals = (
            experienceId: string,
            checkIn: string | null,
        ): ToursRes | null => {
            // Match the exact cache key the hook writes — try with
            // checkIn, then null, then undefined (the hook's enabled
            // gate sometimes resolves to undefined when checkIn is
            // missing). First hit wins.
            const candidates: unknown[] = [
                ['tours', experienceId, checkIn],
                ['tours', experienceId, null],
                ['tours', experienceId, undefined],
            ]
            for (const key of candidates) {
                const data = queryClient.getQueryData<ToursRes>(
                    key as readonly unknown[],
                )
                if (data?.tours?.length) return data
            }
            return null
        }

        // Fetch the four Must Have section types in parallel. queryClient
        // reuses the cache if the user already opened the Must Have tab;
        // 24h staleTime mirrors the sub-tab queries (LinksTabContent etc.).
        const HOURS_24 = 24 * 60 * 60 * 1000
        const mustHaveTypes = ['links', 'tips', 'visa', 'sim'] as const
        const mustHaveResponses = identifier
            ? await Promise.all(
                  mustHaveTypes.map((type) =>
                      queryClient
                          .fetchQuery({
                              queryKey: ['content-collection', identifier, type],
                              queryFn: () => travelerCollectionApi.getByIdentifier(identifier, type),
                              staleTime: HOURS_24,
                              gcTime: HOURS_24,
                          })
                          .catch(() => null),
                  ),
              )
            : []
        const mustHaveSections = mustHaveResponses.flatMap(
            (r) => r?.data?.sections ?? [],
        )
        const mustHave = extractMustHaveForPdf(mustHaveSections)

        // Walk every experience slot, look its tours up in the
        // React Query cache, and snapshot the top 3 into PdfData.deals.
        // Cap at 3 deals per experience to keep the PDF compact.
        const deals: Record<string, import('@/modules/Itinerary/pdf/types').PdfTourDeal[]> = {}
        const seenExpIds = new Set<string>()
        for (const day of (itineraryData.days ?? []) as Array<{
            date?: string | null
            slots?: Array<{ kind?: string | null; entity_id?: string | null }>
        }>) {
            for (const slot of day.slots ?? []) {
                if ((slot.kind || '').toLowerCase() !== 'experience') continue
                if (!slot.entity_id) continue
                if (seenExpIds.has(slot.entity_id)) continue
                seenExpIds.add(slot.entity_id)
                const checkIn = day.date ? String(day.date).slice(0, 10) : null
                const cached = readCachedDeals(slot.entity_id, checkIn)
                if (!cached) continue
                const adapted = adaptToursToUI(cached).slice(0, 3)
                if (!adapted.length) continue
                deals[slot.entity_id] = adapted.map((tour) => ({
                    id: tour.id,
                    platform_name: tour.platform_name,
                    name: tour.name,
                    rating: tour.rating,
                    duration_minutes:
                        typeof tour.duration?.min_duration === 'number'
                            ? tour.duration.min_duration
                            : null,
                    cancellation_policy: tour.cancellation_policy,
                    price: tour.price
                        ? {
                              min_price: tour.price.min_price,
                              currency: tour.price.currency,
                              price_type: tour.price.price_type,
                          }
                        : null,
                    link: tour.link,
                    is_recommended:
                        !!tour.is_recommended || !!tour.is_personally_recommended,
                }))
            }
        }

        type TripShape = {
            name?: string | null
            final_destination_cities?: Array<{ name?: string | null }> | null
            preferred_travel_time?: { startDate?: string | null; endDate?: string | null } | null
            tripProfile?: {
                travel_purpose?: string | null
                group_type?: string | null
                group_setup?: { adults?: number; children?: number; infants?: number } | null
            } | null
            group_setup?: { adults?: number; children?: number; infants?: number } | null
            trip_preference?: {
                group_setup?: { adults?: number; children?: number; infants?: number } | null
            } | null
        }
        const t = activeTrip as unknown as TripShape

        const destinations: string[] = Array.isArray(t.final_destination_cities)
            ? t.final_destination_cities
                  .map((c) => c?.name)
                  .filter((n): n is string => !!n)
            : []

        const tripProfile = t.tripProfile ?? null
        const groupSetup =
            t.group_setup
            ?? t.trip_preference?.group_setup
            ?? tripProfile?.group_setup
            ?? null

        const tripName = t.name || itineraryData.trip?.name || 'Trip'
        // Derive dates from the actual itinerary days first — they're
        // the ground truth. `preferred_travel_time` can be stale (e.g.
        // user changed their travel window but the trip metadata was
        // never re-saved, leaving start === end on the cover).
        const days = (itineraryData.days ?? []) as Array<{ date?: string | null }>
        const firstDayDate = days[0]?.date ?? null
        const lastDayDate = days[days.length - 1]?.date ?? null
        const startDate =
            firstDayDate
            || t.preferred_travel_time?.startDate
            || itineraryData.trip?.start_date
            || null
        const endDate =
            lastDayDate
            || t.preferred_travel_time?.endDate
            || itineraryData.trip?.end_date
            || null

        await downloadItineraryPdf({
            trip: {
                trip_id: tripId,
                name: tripName,
                trip_sequence_id: itineraryData.trip?.trip_sequence_id ?? null,
                start_date: startDate,
                end_date: endDate,
                destinations,
                travel_purpose: tripProfile?.travel_purpose ?? null,
                group_type: tripProfile?.group_type ?? null,
                adults: groupSetup?.adults ?? null,
                children: groupSetup?.children ?? null,
                infants: groupSetup?.infants ?? null,
            },
            days: (itineraryData.days ?? []) as never,
            stays: (itineraryData.stays ?? []) as never,
            vouchers: canAccessVouchers ? tripVouchers : [],
            mustHave,
            deals,
            origin: window.location.origin,
            mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN,
        })
    }, [itineraryData, activeTrip, tripId, tripVouchers, canAccessVouchers, identifier, queryClient])
    const onDownloadPDF = canDownloadPDF ? handleDownloadPDF : undefined

    // Default tab is always `itinerary` when no `?tab=` is in the URL.
    // Fires immediately on mount — independent of `allTabs` / section-types
    useEffect(() => {
        if (!activeTab) {
            setActiveTab('itinerary')
        }
    }, [activeTab, setActiveTab])

    // Extract all experiences from experience collection (for overview discover section)
    // Fetch activity shorts for overview tab (by country)
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)

    const {
        experiences: watchAlongShorts,
        isLoading: isLoadingWatchAlong,
        hasMore: hasMoreWatchAlong,
        isLoadingMore: isLoadingMoreWatchAlong,
        loadMore: loadMoreWatchAlong
    } = useExperiencesWithShorts({
        countryId: selectedCountrySwitcherId ?? countryId ?? null,
        limit: 12,
        enabled: !!countryId,
        suggestionPriority: '0'
    })

    // Use collectionMetadataResponse (experience) for collection-level data
    const collectionResponseForActiveTab = collectionMetadataResponse

    // Extract stay metadata map from sections. Runs regardless of the
    // active tab so the Itinerary tab's inline hotel picker can filter
    // the curated Stays-tab list by city without waiting for a tab
    // switch. Reads from ``staysCollectionResponse`` directly (not
    // ``activeCollectionResponse``) because the latter swaps to the
    // experiences collection on other tabs.
    const { stayMetadataMap, staySectionMap, staySectionMetadataMap } = useMemo(() => {
        if (!staysCollectionResponse?.data?.sections) {
            return {
                stayMetadataMap: new Map<
                    string,
                    {
                        location_tag?: string
                        zentrum_hub_id?: string
                        banner_img?: string
                        category?: string
                        city_id?: string
                        city_name?: string
                        curated_labels?: Array<{ label: string; value: string | null }>
                        kayak_hotel_id?: string
                        is_available_on_airbnb?: boolean
                    }
                >(),
                staySectionMap: new Map<string, string>(),
                staySectionMetadataMap: new Map<string, Section['metadata']>()
            }
        }
        const metadataMap = new Map<
            string,
            {
                location_tag?: string
                zentrum_hub_id?: string
                banner_img?: string
                category?: string
                city_id?: string
                city_name?: string
                curated_labels?: Array<{ label: string; value: string | null }>
                kayak_hotel_id?: string
                is_available_on_airbnb?: boolean
            }
        >()
        const sectionMap = new Map<string, string>()
        const sectionMetadataMap = new Map<string, Section['metadata']>()

        staysCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'stays' && section.entity_id)
            .forEach((section: Section) => {
                if (section.entity_id && section.metadata) {
                    const metadata = section.metadata as {
                        location_tag?: string
                        zentrum_hub_id?: string
                        banner_img?: string
                        category?: string
                        city_id?: string
                        city_name?: string
                        start_date?: string | null
                        end_date?: string | null
                        curated_labels?: Array<{ label: string; value: string | null }>
                        kayak_images?: Array<{ large?: string; small?: string }>
                        kayak_hotel_id?: string
                        latitude?: number
                        longitude?: number
                        [key: string]: unknown
                    }
                    const entityType = (section as Section & { entity_type?: string }).entity_type
                    const isKayakStay = entityType === 'kayak_stay'
                    const firstKayakImage = isKayakStay && Array.isArray(metadata.kayak_images) ? metadata.kayak_images[0] : undefined
                    const bannerImg =
                        isKayakStay && firstKayakImage?.large
                            ? firstKayakImage.large
                            : typeof metadata.banner_img === 'string'
                              ? metadata.banner_img
                              : undefined
                    const metadataEntry = {
                        location_tag: isKayakStay ? undefined : typeof metadata.location_tag === 'string' ? metadata.location_tag : undefined,
                        zentrum_hub_id: typeof metadata.zentrum_hub_id === 'string' ? metadata.zentrum_hub_id : undefined,
                        banner_img: bannerImg,
                        category: typeof metadata.category === 'string' ? metadata.category : undefined,
                        city_id: typeof metadata.city_id === 'string' ? metadata.city_id : undefined,
                        city_name: typeof metadata.city_name === 'string' ? metadata.city_name : undefined,
                        curated_labels: Array.isArray(metadata.curated_labels) ? metadata.curated_labels : undefined,
                        kayak_hotel_id: typeof metadata.kayak_hotel_id === 'string' ? metadata.kayak_hotel_id : undefined,
                        is_available_on_airbnb: metadata.is_available_on_airbnb === true
                    }
                    // Key by entity_id (accommodation doc ID)
                    metadataMap.set(section.entity_id, metadataEntry)
                    // Also key by zentrum_hub_id so lookups via stay.zentrum_hub_id work
                    if (metadataEntry.zentrum_hub_id && metadataEntry.zentrum_hub_id !== section.entity_id) {
                        metadataMap.set(metadataEntry.zentrum_hub_id, metadataEntry)
                    }
                    // Map stay ID to section ID for date editing
                    if (section.id && section.entity_id) {
                        sectionMap.set(section.entity_id, section.id)
                        // Store full section metadata for preserving all fields
                        if (section.metadata) {
                            sectionMetadataMap.set(section.id, section.metadata)
                        }
                    }
                }
            })

        // Itinerary stays are the source of truth on the tripboard. When a
        // hotel was unshortlisted but still has an ItineraryStay, the Stays
        // tab still needs metadata for it so the chip + card render under
        // the right city/window. ItineraryStay carries city_id but not
        // city_name — pull names from the days list.
        const cityNameById = new Map<string, string>()
        for (const day of (itineraryData?.days || [])) {
            const c = day.base_city
            if (c?.id && c?.name) cityNameById.set(String(c.id), c.name)
        }
        for (const s of (itineraryData?.stays || [])) {
            const hub = s.zentrum_hub_id
            if (!hub || metadataMap.has(hub)) continue
            const cityId = s.city_id ? String(s.city_id) : undefined
            metadataMap.set(hub, {
                zentrum_hub_id: hub,
                city_id: cityId,
                city_name: cityId ? cityNameById.get(cityId) : undefined,
                banner_img: s.hotel_image_url || undefined,
            })
        }

        return { stayMetadataMap: metadataMap, staySectionMap: sectionMap, staySectionMetadataMap: sectionMetadataMap }
    }, [staysCollectionResponse, itineraryData?.stays, itineraryData?.days])

    // Raw shortlist sections — projected into the lite shape StaysTab needs
    // to dedupe by (zentrumHubId, normalizedCheckIn, normalizedCheckOut).
    // Note: `staySectionMap` above collapses entity_id -> sectionId (last write
    // wins), so it can't surface duplicates. The dedupe needs the full
    // per-section list.
    const shortlistSectionsForDedupe = useMemo(
        () => projectStaySectionsForDedupe(staysCollectionResponse?.data?.sections),
        [staysCollectionResponse?.data?.sections]
    )

    // Per-city itinerary windows. Override saved section dates inside
    // buildCorrectedDatesMap so map-popup "View deal" matches StaysCard.
    // For past itineraries, shift forward to `today + 30d` so per-stay
    // rates (useStayPrices) hit a valid future window. StaysTab's chips
    // stay on the original dates (it re-derives from itineraryDays).
    const itineraryCities = useMemo<ItineraryCityWindow[] | null>(() => {
        // Prefer the route-summary endpoint's stays — RLE'd by sleep_city,
        // origin/destination bookends already excluded (0-night hops live in
        // route_chain, not in stays). Falls back to FE-derived windows while
        // the route-summary fetch is in flight or absent.
        const summaryStays = routeSummary?.stays
        let windows: ItineraryCityWindow[] | null = null
        if (summaryStays && summaryStays.length > 0) {
            windows = summaryStays.map((s) => ({
                id: s.city.id,
                name: s.city.name,
                checkIn: s.from_date,
                checkOut: s.to_date,
            }))
        } else {
            const days = itineraryData?.days
            if (!days || days.length === 0) return null
            const fallback = computeItineraryWindows(days)
            windows = fallback.length === 0 ? null : fallback
        }
        if (!windows) return null
        if (!isItineraryStartedOrPast(itineraryData?.days)) return windows
        return shiftItineraryCitiesToFuture(windows) ?? windows
    }, [routeSummary?.stays, itineraryData?.days])

    // Page-wide fallback dates (local YYYY-MM-DD). Used by hooks/components
    // that don't have per-stay context. Derivation order:
    //   1. Trip's preferred_travel_time (firm dates set in wizard)
    //   2. First itinerary window's checkIn/checkOut (handles flexible-date
    //      trips where preferred_travel_time is empty but the itinerary has
    //      concrete dates)
    //   3. Hardcoded "tomorrow" placeholder (last resort)
    const staysDates = useMemo(() => {
        const tripStart = activeTrip?.preferred_travel_time?.startDate
            ? formatDateStringToYMD(activeTrip.preferred_travel_time.startDate)
            : null
        const tripEnd = activeTrip?.preferred_travel_time?.endDate
            ? formatDateStringToYMD(activeTrip.preferred_travel_time.endDate)
            : null

        const tripStartUsable = tripStart && !isPastDate(tripStart) ? tripStart : null
        const tripEndUsable = tripEnd && !isPastDate(tripEnd) ? tripEnd : null

        const firstWindow = itineraryCities && itineraryCities.length > 0 ? itineraryCities[0] : null

        const checkIn = tripStartUsable || firstWindow?.checkIn || getTomorrowDate()
        const checkOutCandidate = tripEndUsable || firstWindow?.checkOut || getDayAfterTomorrowDate()
        const checkOut = checkOutCandidate > checkIn ? checkOutCandidate : getDayAfterTomorrowDate()

        return { checkIn, checkOut }
    }, [activeTrip?.preferred_travel_time?.startDate, activeTrip?.preferred_travel_time?.endDate, itineraryCities])

    // Fetch enriched accommodation data (images, reviews, is_verified, geo)
    // for saved stays. This now replaces the `/accommodations/metadata/list/`
    // calls — one endpoint, fresh data, shared with the For You flow.
    // Enabled whenever the collection is available (not tab-gated) so map
    // markers on other tabs still get stay data.
    const { enrichedStaysMap, isEnrichmentLoading } = useStaysEnrichment({
        sections: activeCollectionResponse?.data?.sections ?? [],
        stayMetadataMap,
        checkIn: staysDates.checkIn,
        checkOut: staysDates.checkOut,
        travelPurpose: activeTrip?.tripProfile?.travel_purpose ?? 'leisure_relaxation',
        groupType: activeTrip?.tripProfile?.group_type ?? 'couple',
        enabled: !!activeCollectionResponse,
    })

    // Explore section accommodations for map markers
    const [exploreAccommodations, setExploreAccommodations] = useState<import('@/pages/Stays/Types/accommodationTypes').Accommodation[]>([])
    const handleExploreAccommodationsLoaded = useCallback((accommodations: import('@/pages/Stays/Types/accommodationTypes').Accommodation[]) => {
        setExploreAccommodations(accommodations)
    }, [])

    // ── Map viewport marker loader — gated to Stays tab + For You sub-view ──
    // `staysViewFromUrl` is derived later (after `staysData` is available) so
    // it can mirror StaysTab's city-aware default.

    // Union of experience ids the page might render — section-derived (for
    // the Shortlisted view + Stays-tab activity-distance badge) plus
    // itinerary-slot-derived (for "In your itinerary"). The agent can place
    // a slot without writing a section, so slot-only ids must be enriched
    // too or those cards go blank.
    const experienceIdsForEnrichment = useMemo(() => {
        const ids = new Set<string>()
        for (const section of experienceCollectionResponse?.data?.sections ?? []) {
            if (section.section_type === 'experience' && section.entity_id) ids.add(section.entity_id)
        }
        for (const day of itineraryData?.days ?? []) {
            for (const slot of day.slots ?? []) {
                if (slot?.entity_model === 'experiences' && slot.entity_id) ids.add(slot.entity_id)
            }
        }
        return Array.from(ids)
    }, [experienceCollectionResponse, itineraryData])

    const { enrichedExperiencesMap, isEnrichmentLoading: isExperiencesEnrichmentLoading } = useExperiencesEnrichment({
        experienceIds: experienceIdsForEnrichment,
        enabled: !!experienceCollectionResponse,
    })

    // Extract experiences from collection sections (no API call needed)
    // Deduplicate by entity_id to handle duplicate sections with same entity_id
    // Use section.id as unique identifier to prevent React key conflicts
    // Also create a map of experience ID to section ID for date editing
    // And a map of section ID to full section metadata for preserving all metadata fields
    const { experiences, experienceSectionMap, sectionMetadataMap: expSectionMetadataMap } = useMemo(() => {
        if (activeTab !== 'experience' || !activeCollectionResponse?.data?.sections) {
            return {
                experiences: [],
                experienceSectionMap: new Map<string, string>(),
                sectionMetadataMap: new Map<string, Section['metadata']>()
            }
        }
        // Wait for the batch enrichment to settle before building cards.
        // Section metadata is slim (dates only) under the new writer, so
        // rendering during the loading window would produce blank cards.
        if (isExperiencesEnrichmentLoading) {
            return {
                experiences: [],
                experienceSectionMap: new Map<string, string>(),
                sectionMetadataMap: new Map<string, Section['metadata']>()
            }
        }
        const seenEntityIds = new Set<string>()
        const sectionMap = new Map<string, string>()
        const metadataMap = new Map<string, Section['metadata']>()
        const exps = activeCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'experience')
            .map((section: Section) => {
                // Resolve card data from bulk enrichment (dynamic source of
                // truth). Legacy sections with full metadata still resolve
                // via the old adapter as a fallback — avoids blank cards
                // during the writer migration.
                const exp = resolveExperienceCardData(section, enrichedExperiencesMap)
                    ?? adaptCollectionSectionToExperienceCard(section)
                if (!exp) return null
                // Only include first occurrence of each entity_id
                if (seenEntityIds.has(exp.id)) return null
                seenEntityIds.add(exp.id)
                // Map experience ID to section ID for date editing
                if (section.id && exp.id) {
                    sectionMap.set(exp.id, section.id)
                    // Store full section metadata for preserving all fields
                    if (section.metadata) {
                        metadataMap.set(section.id, section.metadata)
                    }
                }
                // Add section.id as a unique identifier for React keys
                return { ...exp, _sectionId: section.id || exp.id } as ExperienceCardData & { _sectionId: string }
            })
            .filter((exp): exp is ExperienceCardData & { _sectionId: string } => exp !== null)
        return { experiences: exps, experienceSectionMap: sectionMap, sectionMetadataMap: metadataMap }
    }, [activeCollectionResponse, activeTab, enrichedExperiencesMap, isExperiencesEnrichmentLoading])

    // Slot-derived list for the "In your itinerary" view — itinerary is the
    // source of truth here, not collection.sections. Deduped by entity_id;
    // card fields come from `enrichedExperiencesMap` (slots don't carry
    // city/image data on their own).
    const { inItineraryExperiences, experienceSlotMap, experienceDayMap } = useMemo(() => {
        const list: ExperienceCardData[] = []
        const slotMap = new Map<string, string>()
        const dayMap = new Map<string, string>()
        if (activeTab !== 'experience' || !itineraryData?.days) {
            return { inItineraryExperiences: list, experienceSlotMap: slotMap, experienceDayMap: dayMap }
        }
        const seen = new Set<string>()
        for (const day of itineraryData.days) {
            const dayDate = typeof day.date === 'string' ? day.date.split('T')[0] : new Date(day.date).toISOString().split('T')[0]
            const dayIdRaw = (day as { day_id?: string; id?: string }).day_id ?? (day as { id?: string }).id ?? ''
            for (const slot of day.slots ?? []) {
                if (slot?.entity_model !== 'experiences') continue
                const expId: string | undefined = slot.entity_id
                if (!expId || seen.has(expId)) continue
                seen.add(expId)
                const slotId: string | undefined = slot.slot_id ?? slot.id
                if (slotId) slotMap.set(expId, slotId)
                if (dayIdRaw) dayMap.set(expId, dayIdRaw)
                const enriched = enrichedExperiencesMap.get(expId)
                // Enrichment can be missing (Experience doc deleted, never
                // persisted, or absent on stage after a partial dump). Slot
                // carries authoritative city info — fall back to it before
                // the day's base_city so the chip lands in the right group
                // instead of "Unknown".
                const slotData = slot.slot_data as { city_id?: string; city_name?: string } | undefined
                const slotCity = slot.city as { _id?: string; id?: string; name?: string } | undefined
                list.push({
                    id: expId,
                    title: enriched?.name ?? slot.title ?? '',
                    name: enriched?.name ?? slot.title ?? '',
                    city_id:
                        enriched?.city_id
                        ?? slotData?.city_id
                        ?? slotCity?._id
                        ?? slotCity?.id
                        ?? day.base_city?.id
                        ?? '',
                    city_name:
                        enriched?.city_name
                        ?? slotData?.city_name
                        ?? slotCity?.name
                        ?? day.base_city?.name
                        ?? '',
                    image: enriched?.display_props?.landscape_image ?? '',
                    images: [
                        enriched?.display_props?.landscape_image ?? '',
                        ...(enriched?.content?.verified_photos ?? []).map((p) => p?.url ?? '')
                    ].filter(Boolean),
                    price: {
                        lower_bound: enriched?.price?.lower_bound ?? null,
                        upper_bound: enriched?.price?.upper_bound ?? null,
                        currency: enriched?.price?.currency ?? null
                    },
                    suggestion_priority: enriched?.suggestion_priority ?? null,
                    short_description: enriched?.short_description ?? null,
                    category: enriched?.categories?.[0] ?? null,
                    categoryBackendValue: enriched?.categories?.[0] ?? null,
                    categories: enriched?.categories ?? null,
                    categoryIcon: null,
                    identifier: enriched?.identifier ?? undefined,
                    start_date: dayDate
                } as ExperienceCardData)
            }
        }
        return { inItineraryExperiences: list, experienceSlotMap: slotMap, experienceDayMap: dayMap }
    }, [activeTab, itineraryData, enrichedExperiencesMap])

    // `collection.metadata.experience_comments` is a flat list (each entry
    // carries its own `experience_id`); group it into a Map for O(1) lookup
    // by experience id at render time.
    const experienceCommentsByExpId = useMemo(() => {
        const map = new Map<string, import('@/modules/ContentCollection/types/contentCollection').ExperienceComment[]>()
        const raw = (
            activeCollectionResponse?.data?.metadata as
                | { experience_comments?: import('@/modules/ContentCollection/types/contentCollection').ExperienceComment[] }
                | undefined
        )?.experience_comments
        if (!Array.isArray(raw)) return map
        for (const comment of raw) {
            const expId = comment?.experience_id
            if (!expId) continue
            const existing = map.get(expId)
            if (existing) {
                existing.push(comment)
            } else {
                map.set(expId, [comment])
            }
        }
        return map
    }, [activeCollectionResponse])

    // Skeleton the Activities tab while the initial enrichment is in flight.
    const isExperiencesLoading = isExperiencesEnrichmentLoading

    // Extract filters from URL params
    const filterParams = useMemo(() => {
        const pts = searchParams.getAll('pt')
        const ptsCsv = (searchParams.get('pt') ?? searchParams.get('property_types') ?? '').split(',').filter(Boolean)
        const propertyTypes = pts.length > 0 ? pts : ptsCsv

        const ams = searchParams.getAll('am')
        const amsCsv = (searchParams.get('am') ?? searchParams.get('amenities') ?? '').split(',').filter(Boolean)
        const amenities = ams.length > 0 ? ams : amsCsv

        return { propertyTypes, amenities }
    }, [searchParams])

    // Stay entity IDs from the stays collection. Reads from
    // ``staysCollectionResponse`` directly (always fetched) so the
    // inline hotel picker's data pipeline fires regardless of the
    // currently-active tab.
    const stayEntityIds = useMemo(() => {
        if (!staysCollectionResponse?.data?.sections) return [] as string[]
        return staysCollectionResponse.data.sections
            .filter(
                (section: Section) =>
                    section.section_type === 'stays' && section.entity_id
            )
            .map((section: Section) => section.entity_id!)
            .filter(Boolean)
    }, [staysCollectionResponse])

    // Derive the metadata-shaped list from the enrichment hook's output.
    // Previously this fired `/accommodations/metadata/list/` — redundant since
    // `useStaysEnrichment` already calls `/accommodations/?zentrum_hub_ids=[...]`
    // (richer superset). Applies URL property/amenity filters client-side so
    // behavior matches the old server-filtered response.
    const isStaysLoading = isEnrichmentLoading
    const staysDataFromApi: AccommodationMetadataItem[] = useMemo(() => {
        if (stayEntityIds.length === 0) return []
        const items: AccommodationMetadataItem[] = []
        for (const hubId of stayEntityIds) {
            const enriched = enrichedStaysMap.get(hubId)
            if (!enriched) continue
            const rawLat = enriched.geo_location?.lat
            const rawLng = enriched.geo_location?.long
            const hasLatLng =
                typeof rawLat === 'string' && rawLat !== '' &&
                typeof rawLng === 'string' && rawLng !== ''
            // Client-side property_types / amenities filter. Property type maps
            // to `category` on the accommodation record.
            if (filterParams.propertyTypes.length > 0) {
                const cat = (enriched.category || '').toLowerCase()
                const matchesType = filterParams.propertyTypes.some((t) => t.toLowerCase() === cat)
                if (!matchesType) continue
            }
            items.push({
                id: enriched.id,
                name: enriched.name,
                zentrum_hub_id: enriched.zentrum_hub_id,
                geo_location: hasLatLng
                    ? { lat: rawLat as string, long: rawLng as string }
                    : { lat: '0', long: '0' },
                rate_per_night: enriched.rate_per_night ?? null,
                banner_img: enriched.content?.[0] ?? '',
                content: enriched.content,
                is_verified: enriched.is_verified === true,
                is_b2b_deal_available: enriched.is_b2b_deal_available === true,
                is_available_on_airbnb: enriched.is_available_on_airbnb === true,
            })
        }
        return items
    }, [stayEntityIds, enrichedStaysMap, filterParams.propertyTypes])

    // Merge stays from sections with metadata API data to ensure all stays
    // are shown. Reads from ``staysCollectionResponse`` directly so the
    // merge runs on every tab (the inline hotel picker on the itinerary
    // tab needs this list).
    const staysData = useMemo(() => {
        if (!staysCollectionResponse?.data?.sections) {
            return staysDataFromApi
        }

        const mergedStays: AccommodationMetadataItem[] = []
        const seenIds = new Set<string>()

        // First, add all stays from API (use collection section metadata lat/long for kayak_stay when available)
        staysDataFromApi.forEach((stay) => {
            const lookupKey = stay.zentrum_hub_id || stay.id
            const section = staysCollectionResponse.data.sections?.find((s: Section) => s.section_type === 'stays' && s.entity_id === lookupKey)
            const sectionMeta = section?.metadata as { latitude?: number; longitude?: number } | undefined
            const entityType = section ? (section as Section & { entity_type?: string }).entity_type : undefined
            const isKayakStay = entityType === 'kayak_stay'
            const hasSectionLatLong = isKayakStay && typeof sectionMeta?.latitude === 'number' && typeof sectionMeta?.longitude === 'number'

            const stayToAdd: AccommodationMetadataItem = hasSectionLatLong
                ? {
                      ...stay,
                      geo_location: {
                          lat: String(sectionMeta!.latitude),
                          long: String(sectionMeta!.longitude)
                      }
                  }
                : stay

            mergedStays.push(stayToAdd)
            if (stay.zentrum_hub_id) seenIds.add(stay.zentrum_hub_id)
            if (stay.id) seenIds.add(stay.id)
        })

        // Then, add stays from sections that aren't in API response
        staysCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'stays' && section.entity_id && section.metadata)
            .forEach((section: Section) => {
                const metadata = section.metadata as {
                    zentrum_hub_id?: string
                    city_id?: string
                    city_name?: string
                    banner_img?: string
                    latitude?: number
                    longitude?: number
                    kayak_images?: Array<{ large?: string }>
                    [key: string]: unknown
                }
                const entityId = section.entity_id
                if (!entityId) return

                const zentrumHubId = metadata.zentrum_hub_id
                const alreadyIncluded = (zentrumHubId && seenIds.has(zentrumHubId)) || seenIds.has(entityId)

                if (!alreadyIncluded) {
                    const sectionMetadata = stayMetadataMap.get(entityId)
                    const entityType = (section as Section & { entity_type?: string }).entity_type
                    const isKayakStay = entityType === 'kayak_stay'
                    const lat = isKayakStay && typeof metadata.latitude === 'number' ? String(metadata.latitude) : '0'
                    const long = isKayakStay && typeof metadata.longitude === 'number' ? String(metadata.longitude) : '0'
                    const stayFromSection: AccommodationMetadataItem = {
                        id: entityId,
                        name: section.title || 'Unknown Stay',
                        geo_location: { lat, long },
                        rate_per_night: null,
                        banner_img:
                            sectionMetadata?.banner_img ||
                            (typeof metadata.banner_img === 'string' ? metadata.banner_img : '') ||
                            (isKayakStay && metadata.kayak_images?.[0]?.large) ||
                            '',
                        zentrum_hub_id: zentrumHubId ?? '',
                        is_verified: metadata.is_verified === true,
                        is_b2b_deal_available: metadata.is_b2b_deal_available === true,
                        is_available_on_airbnb: metadata.is_available_on_airbnb === true
                    }
                    mergedStays.push(stayFromSection)
                    if (zentrumHubId) seenIds.add(zentrumHubId)
                    seenIds.add(entityId)
                }
            })

        // Itinerary-only stays: still in itinerary but unshortlisted from
        // the collection. Synthesize a card so the Stays tab keeps the
        // itinerary as the source of truth.
        for (const s of (itineraryData?.stays || [])) {
            const hub = s.zentrum_hub_id
            if (!hub || seenIds.has(hub)) continue
            mergedStays.push({
                id: s.stay_id || hub,
                name: s.hotel_name || 'Hotel',
                geo_location: {
                    lat: s.latitude != null ? String(s.latitude) : '0',
                    long: s.longitude != null ? String(s.longitude) : '0',
                },
                rate_per_night: null,
                banner_img: s.hotel_image_url || '',
                zentrum_hub_id: hub,
            })
            seenIds.add(hub)
        }

        return mergedStays
    }, [staysDataFromApi, staysCollectionResponse, stayMetadataMap, itineraryData?.stays])

    // Flat hotel list for the itinerary-tab inline picker: each hotel
    // drawerHotels removed — StayPickerModal fetches its own hotel list.

    // selectedCityId is derived from the active tab's city param (stays_city for stays, act_city for activities, city_id for restaurant/food).
    const selectedCityId = useMemo(() => {
        if (activeTab === 'stays') return searchParams.get('stays_city') || searchParams.get('city_id') || null
        if (activeTab === 'experience') return searchParams.get('act_city') || searchParams.get('city_id') || null
        if (activeTab === 'restaurant') return searchParams.get('city_id') || null
        return searchParams.get('stays_city') || searchParams.get('act_city') || searchParams.get('city_id') || null
    }, [searchParams, activeTab])

    const filteredStaysDataForPrices = useMemo(() => {
        if (!selectedCityId) {
            return []
        }
        return staysData.filter((stay) => {
            const zentrumHubId = stay.zentrum_hub_id || stay.id
            const sectionMetadata = stayMetadataMap.get(zentrumHubId)
            const cityId = sectionMetadata?.city_id
            return cityId === selectedCityId
        })
    }, [staysData, selectedCityId, stayMetadataMap])

    
    // Resolve dates the same way StaysTab does so map viewport, prices, and
    // shortlist queries all track the exploration overlay (stays_exp_*) when
    // set, otherwise the itinerary window for stays_city. Reading raw
    // stays_checkin/stays_checkout here would reintroduce the drift the
    // overlay was built to fix.
    const itineraryWindowsForViewport = useMemo(
        () => (itineraryData?.days ? computeItineraryWindows(itineraryData.days) : null),
        [itineraryData?.days]
    )
    const effectiveStaysDatesForViewport = useMemo(
        () => resolveEffectiveStaysDates(searchParams, itineraryWindowsForViewport),
        [searchParams, itineraryWindowsForViewport]
    )
    
    // Per-stay corrected dates. Single source of truth shared with StaysTab
    // (StaysCard "View deal" button) so map-popup "View deal" opens with the
    // SAME dates as the card. When `itineraryCities` is provided, itinerary
    // windows override saved section dates inside `buildCorrectedDatesMap`.
    const staysDatesMap = useMemo(() => {
        const base = buildCorrectedDatesMap(filteredStaysDataForPrices, staySectionMap, staySectionMetadataMap, 'tripboard', stayMetadataMap, itineraryCities, itineraryData?.stays)
        // Repeat-visit city (same city in 2+ itinerary windows, e.g. Kuala
        // Lumpur on the way out AND back): buildCorrectedDatesMap snaps each
        // stay to a single window by its section start_date, so every visit's
        // tab would fetch rates/links for the first window. The active tab IS
        // the window context, so override the selected city's stays to the
        // selected window's dates — this drives useStayPrices below and the
        // map "View deal" popups, keeping both aligned with the tab in view.
        // Mirrors the override in StaysTab's staysWithCorrectedDatesMap.
        if (!selectedCityId || !itineraryCities) return base
        const windowsForCity = itineraryCities.filter((c) => c.id === selectedCityId)
        if (windowsForCity.length <= 1) return base
        // Resolve the selected window from itineraryCities — the same list that
        // drives the tabs and StaysTab's override. NOT effectiveStaysDatesForViewport,
        // which is derived from computeItineraryWindows and can index to a
        // different (and same-day) window for return trips.
        const { checkIn, checkOut } = resolveEffectiveStaysDates(searchParams, itineraryCities)
        // Guard: the rates API rejects check_in >= check_out. A 0-night window
        // (same-day connection on the departure leg) has no stay to price —
        // keep the snapped base dates rather than firing an invalid query.
        if (!checkIn || !checkOut || checkIn >= checkOut) return base
        for (const stay of filteredStaysDataForPrices) {
            base.set(stay.zentrum_hub_id || stay.id, { checkIn, checkOut, isFallback: false })
        }
        return base
    }, [filteredStaysDataForPrices, staySectionMap, staySectionMetadataMap, stayMetadataMap, itineraryCities, itineraryData?.stays, selectedCityId, searchParams])

    // Priority: trip.group_setup (persisted from wizard) > trip_preference > tripProfile
    const guestsDataForPrices = useStaysGuestsData(
        activeTrip?.group_setup ?? activeTrip?.trip_preference?.group_setup ?? activeTrip?.tripProfile?.group_setup
    )
    const occupanciesForPrices = useStaysOccupancies(
        activeTrip?.group_setup ?? activeTrip?.trip_preference?.group_setup ?? activeTrip?.tripProfile?.group_setup
    )
    const roomsForPrices = occupanciesForPrices.length
    const roomsPayloadForPrices = useMemo(
        () => occupanciesForPrices.map((r) => ({ adults: r.numOfAdults, child_ages: r.childAges })),
        [occupanciesForPrices]
    )
    const { stayPricesMap, isAnyPriceLoading } = useStayPrices({
        stays: filteredStaysDataForPrices,
        stayMetadataMap,
        staysDatesMap,
        staysDates,
        guestsData: guestsDataForPrices,
        roomsPayload: roomsPayloadForPrices,
        roomsCount: roomsForPrices,
        rimigoPrice: isRimigoInternal,
        tripId: tripId ?? undefined,
        enabled: activeTab === 'stays',
        collectionId: tripCollectionResponse?.data?.[0]?.id ?? null,
    })

    // Loading state
    const isLoading = isExperienceCollectionLoading || isCollectionLoading
    const isError = isCollectionError

    // Get publisher ID from collection response
    const publisherId = useMemo(() => {
        if (!collectionMetadataResponse?.data) return null
        return collectionMetadataResponse.data.publisher?.publisher_id || null
    }, [collectionMetadataResponse?.data?.publisher?.publisher_id])


    // Get cityId from collection context or from first stay section
    const cityIdForFilters = useMemo(() => {
        if (!activeCollectionResponse?.data) return undefined

        const contextCityId = activeCollectionResponse.data.context?.city_id
        if (contextCityId) {
            if (Array.isArray(contextCityId) && contextCityId.length > 0) {
                return contextCityId[0]
            }
            if (typeof contextCityId === 'string') {
                return contextCityId
            }
        }

        const firstStaySection = staysCollectionResponse?.data?.sections?.find((s: Section) => s.section_type === 'stays' && s.metadata?.city_id)
        if (firstStaySection?.metadata) {
            const metadata = firstStaySection.metadata as { city_id?: string; [key: string]: unknown }
            if (typeof metadata.city_id === 'string') {
                return metadata.city_id
            }
        }

        return undefined
    }, [collectionMetadataResponse, staysCollectionResponse])

    // Reuse experience and stays responses for map (already fetched above)
    const experienceCollectionResponseForMap = experienceCollectionResponse
    const staysCollectionResponseForMap = staysCollectionResponse
    const isStaysCollectionLoadingForMap = isStaysCollectionLoading

    // ── Activity points for the current stays city + initial map bbox ──
    // Used to (a) anchor the Stays For You map on mount and (b) compute
    // "distance from nearest activity" badges on stay cards.
    const staysCityFromUrlForBounds = searchParams.get('stays_city') || ''
    const exploreActivities = useMemo(() => {
        const out: Array<{ id: string; lat: number; lng: number; name?: string; identifier?: string; experienceId?: string }> = []
        const sections = experienceCollectionResponseForMap?.data?.sections
        if (!sections) return out
        for (const s of sections) {
            if (s.section_type !== 'experience' || !s.entity_id) continue
            // All display + geo fields come strictly from the batch API
            // response — section metadata no longer carries them.
            const enriched = enrichedExperiencesMap.get(s.entity_id)
            if (!enriched) continue
            const lat = enriched.location?.latitude
            const lng = enriched.location?.longitude
            if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
            if (lat === 0 && lng === 0) continue
            out.push({
                id: s.id || s.entity_id || '',
                lat,
                lng,
                name: enriched.name || undefined,
                identifier: enriched.identifier || undefined,
                experienceId: s.entity_id || undefined,
            })
        }
        return out
    }, [experienceCollectionResponseForMap, enrichedExperiencesMap])
    void staysCityFromUrlForBounds // kept for initial-bbox compute below



    // Fetch collection data for restaurants (for map) - always fetch regardless of active tab
    const { data: restaurantCollectionResponseForMap, isLoading: isRestaurantCollectionLoadingForMap } = useQuery({
        queryKey: ['traveler-collection', identifier, 'restaurant', 'map'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await travelerCollectionApi.getByIdentifier(identifier, 'restaurant')
        },
        enabled: !!identifier,
        staleTime: 5 * 60 * 1000,
        gcTime: HOURS_24
    })

    // Only call map cities API after experience, stays, and food section responses have completed
    const sectionResponsesReadyForMap =
        !isExperienceCollectionLoading && !isStaysCollectionLoadingForMap && !isRestaurantCollectionLoadingForMap

    // Extract stays entity IDs for map
    const staysEntityIdsForMap = useMemo(() => {
        if (!staysCollectionResponseForMap?.data?.sections) return []
        return (
            staysCollectionResponseForMap.data.sections
                .filter((section: Section) => section.section_type === 'stays' && section.entity_id)
                .map((section: Section) => section.entity_id!)
                .filter(Boolean) || []
        )
    }, [staysCollectionResponseForMap])

    // Map stay markers now derive from the same `enrichedStaysMap` used
    // above — one call serves both the list and the map. No separate
    // `/accommodations/metadata/list/` fetch.
    const staysMetadataResponseForMap = useMemo(() => {
        const items: AccommodationMetadataItem[] = []
        for (const hubId of staysEntityIdsForMap) {
            const enriched = enrichedStaysMap.get(hubId)
            if (!enriched) continue
            const rawLat = enriched.geo_location?.lat
            const rawLng = enriched.geo_location?.long
            const hasLatLng =
                typeof rawLat === 'string' && rawLat !== '' &&
                typeof rawLng === 'string' && rawLng !== ''
            items.push({
                id: enriched.id,
                name: enriched.name,
                zentrum_hub_id: enriched.zentrum_hub_id,
                geo_location: hasLatLng
                    ? { lat: rawLat as string, long: rawLng as string }
                    : { lat: '0', long: '0' },
                rate_per_night: enriched.rate_per_night ?? null,
                banner_img: enriched.content?.[0] ?? '',
                content: enriched.content,
                is_verified: enriched.is_verified === true,
                is_b2b_deal_available: enriched.is_b2b_deal_available === true,
                is_available_on_airbnb: enriched.is_available_on_airbnb === true,
            })
        }
        return { data: { data: items } }
    }, [staysEntityIdsForMap, enrichedStaysMap])
    const isStaysMetadataLoadingForMap = isEnrichmentLoading

    // Calculate map loading state from all map-related queries
    const isMapLoading = useMemo(() => {
        return isStaysCollectionLoadingForMap || isStaysMetadataLoadingForMap || isAnyPriceLoading
    }, [isStaysCollectionLoadingForMap, isStaysMetadataLoadingForMap, isAnyPriceLoading])

    // Must mirror StaysTab's `staysViewMode` so the map's viewport API stays
    // gated to the actually-rendered view (see `resolveStaysViewMode`).
    const staysViewFromUrl = useMemo(
        () => resolveStaysViewMode(
            searchParams.get('stays_view'),
            searchParams.get('stays_city'),
            staysData,
            stayMetadataMap,
        ),
        [searchParams, staysData, stayMetadataMap],
    )

    // For Stays "For You": list + map come from the viewport-accommodations
    // query (single source of truth). Suppress saved-stay markers so the map
    // doesn't duplicate/conflict with the explore markers.
    const isStaysForYou = activeTab === 'stays' && staysViewFromUrl === 'for_you'

    // Pan-driven "discovery" pill markers on the map — extras beyond the list's
    // top 12. Fetched from `/accommodations/viewport/` on each debounced
    // moveend. `exclude_ids` keeps the list hotels from coming back as pills.
    const listHubIds = useMemo(
        () =>
            exploreAccommodations
                .map((a) => a.zentrum_hub_id)
                .filter((id): id is string => Boolean(id)),
        [exploreAccommodations]
    )
    // For You filter state mirrors StaysTab — both read from the same URL params,
    // so the map's viewport query stays in lockstep with the list without lifting state.
    const forYouPropertyTypes = useMemo(() => searchParams.getAll('pt'), [searchParams])
    const forYouAmenities = useMemo(() => searchParams.getAll('am'), [searchParams])
    const forYouStarRatings = useMemo(
        () => searchParams.getAll('star').map((s) => Number(s)).filter((n) => !Number.isNaN(n)),
        [searchParams]
    )
    const forYouIsVerified = searchParams.get('is_verified') === 'true' ? true : null
    const forYouIsB2bDealAvailable = searchParams.get('is_b2b_deal_available') === 'true' ? true : null

    const { fetchViewportStays, viewportMarkersEnabled } = useStaysViewportMarkers({
        cityId: searchParams.get('stays_city'),
        checkIn: effectiveStaysDatesForViewport.checkIn || null,
        checkOut: effectiveStaysDatesForViewport.checkOut || null,
        excludeHubIds: listHubIds,
        budgetRange: activeTrip?.stay_budget_range ?? null,
        guestsData: guestsDataForPrices ?? null,
        propertyTypes: forYouPropertyTypes,
        amenities: forYouAmenities,
        starRatings: forYouStarRatings,
        isVerified: forYouIsVerified,
        isB2bDealAvailable: forYouIsB2bDealAvailable,
        enabled: isStaysForYou,
    })

    // Use map markers hook to handle all map-related logic
    const { mapMarkers: allMapMarkers, mapCityName, mapCityCenter, mapCities } = useCollectionMapMarkers({
        experienceCollectionResponse: experienceCollectionResponseForMap,
        staysCollectionResponse: staysCollectionResponseForMap,
        staysMetadataResponse: staysMetadataResponseForMap,
        stayPricesMap: stayPricesMap,
        cityIdForFilters,
        restaurantCollectionResponse: restaurantCollectionResponseForMap,
        includeCityMarkers: false,
        enableMapCitiesApi: sectionResponsesReadyForMap,
        exploreAccommodations,
        omitSavedStayMarkers: isStaysForYou,
        enrichedExperiencesMap,
        isExperiencesEnrichmentLoading,
        itineraryData,
        tripFallbackDates: staysDates,
    })

    const CITY_BBOX_HALF_SPAN = 0.15

    // Separate bbox for the map CAMERA (visual anchor). Always city center,
    // not activity-centroid-shifted — keeps the stays map framed on the
    // city the user selected, independent of where their activities sit.
    const cityCenterBounds = useMemo(() => {
        if (!mapCityCenter) return null
        return {
            north: mapCityCenter.lat + CITY_BBOX_HALF_SPAN,
            south: mapCityCenter.lat - CITY_BBOX_HALF_SPAN,
            east: mapCityCenter.lon + CITY_BBOX_HALF_SPAN,
            west: mapCityCenter.lon - CITY_BBOX_HALF_SPAN,
        }
    }, [mapCityCenter])

    // On the Stays tab, show only the markers relevant to the current view:
    //   For You  → explore recommendations + activity markers (single source of truth)
    //   Shortlist → shortlisted stays only (no explore markers)
    // Other tabs show all markers unchanged.
    const mapMarkers = useMemo(() => {
        if (activeTab !== 'stays') return allMapMarkers
        if (staysViewFromUrl === 'for_you') {
            // Activity markers (type='experience') are kept alongside explore accommodations
            return allMapMarkers.filter((m) => m.type !== 'accommodation')
        }
        return allMapMarkers.filter((m) => m.type !== 'explore_accommodation')
    }, [allMapMarkers, activeTab, staysViewFromUrl])

    useEffect(() => {
        if (isMapLoading) {
            // Map data is still loading
        }
    }, [isMapLoading])

    // Whether the active tab should show the map at all.
    // For Activities, only the URL-driven `act_map=hidden` toggle (set
    // by the Shortlist subview's "Hide Map" pill) suppresses the map.
    // Explore-vs-Shortlist gating is applied separately and only on
    // desktop — mobile still needs the map DOM mounted so tapping the
    // Map button in the mobile bar (which sets mobileActiveTab='map')
    // has something to swap in.
    const shouldShowMap = useMemo(() => {
        const baseAllowed = shouldShowMapForTab('traveler_collections', activeTab)
        if (!baseAllowed) return false
        if (activeTab === 'experience' && searchParams.get('act_map') === 'hidden') return false
        return true
    }, [activeTab, searchParams])

    // On desktop, the Activities Explore subview hides the side-by-side
    // map column entirely (the experience is video-first; map adds no
    // value there). Mobile is unaffected — when the user taps the Map
    // pill we still want the map to render fullscreen.
    // Desktop map column visibility for the Activities tab: the map is
    // hidden ONLY on the Explore subview (cards take the full width while
    // browsing). Shortlist + In-Your-Itinerary both restore the map column.
    // ("Hide" in the variable name is literal — true means the map is
    // suppressed for this subview.)
    const isActivitiesExploreDesktopHide =
        activeTab === 'experience' &&
        searchParams.get('activities_view') !== 'shortlisted' &&
        searchParams.get('activities_view') !== 'my_itinerary'

    // Check if date editing is allowed for the active tab based on config
    const allowDateEdit = useMemo(() => {
        return shouldAllowDateUpdateForTab('traveler_collections', activeTab, isRimigoInternal, isPremium)
    }, [activeTab, isRimigoInternal, isPremium])

    // Delete section mutation
    const deleteSectionMutation = useMutation({
        mutationFn: async (sectionId: string) => {
            if (!identifier) throw new Error('Identifier is required')
            return await travelerCollectionApi.deleteSection(identifier, sectionId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier] })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types', identifier] })
            queryClient.invalidateQueries({ queryKey: ['tripBudget', identifier] })
            toast.success(' Removed from tripboard!')
        },
        onError: (error: unknown) => {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to delete section. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Handle delete section
    const handleDeleteSection = useCallback(
        (sectionId: string) => {
            deleteSectionMutation.mutate(sectionId)
        },
        [deleteSectionMutation]
    )
    // Targeted delete for explore-section un-shortlist — only invalidates stays
    // queries, not the broad ['traveler-collection', identifier] prefix that
    // would cause every section type (itinerary, restaurant, etc.) to refetch.
    const handleDeleteExploreStay = useCallback(
        async (sectionId: string) => {
            if (!identifier) return
            await travelerCollectionApi.deleteSection(identifier, sectionId)
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier, 'stays'] })
            queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
        },
        [identifier, queryClient]
    )

    const handleToggleSectionSelection = useCallback((sectionId: string) => {
        setSelectedSectionIds((prev) => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            return next
        })
    }, [])
    const handleToggleBulkSelectMode = useCallback(() => {
        setIsBulkSelectMode((prev) => !prev)
        setSelectedSectionIds(new Set())
    }, [])
    const handleBulkSelectAllSections = useCallback((visibleSectionIds: string[]) => {
        setSelectedSectionIds((prev) => {
            const allVisibleSelected =
                visibleSectionIds.length > 0 &&
                visibleSectionIds.every((id) => prev.has(id))
            if (allVisibleSelected) {
                const next = new Set(prev)
                visibleSectionIds.forEach((id) => next.delete(id))
                return next
            }
            return new Set(visibleSectionIds)
        })
    }, [])
    const handleBulkDeleteSelected = useCallback(async () => {
        const sectionIds = Array.from(selectedSectionIds)
        if (!identifier || sectionIds.length === 0) return
        if (!window.confirm(`Are you sure you want to delete ${sectionIds.length} selected card(s)?`)) return
        try {
            let successCount = 0
            for (const sectionId of sectionIds) {
                try {
                    await travelerCollectionApi.deleteSection(identifier, sectionId)
                    successCount += 1
                } catch {
                    // Continue deleting remaining selected sections even if one fails
                }
            }
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier] })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types', identifier] })
            queryClient.invalidateQueries({ queryKey: ['tripBudget', identifier] })
            if (successCount === sectionIds.length) {
                toast.success(`${successCount} card(s) deleted successfully!`)
                setSelectedSectionIds(new Set())
                setIsBulkSelectMode(false)
            } else if (successCount > 0) {
                toast.warning(`${successCount} of ${sectionIds.length} selected card(s) were deleted.`)
                setSelectedSectionIds(new Set())
                setIsBulkSelectMode(false)
            } else {
                toast.error('Failed to delete selected cards. Please try again.')
            }
        } catch (error: unknown) {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to delete selected cards. Please try again.'
            toast.error(errorMessage)
        }
    }, [identifier, selectedSectionIds, queryClient])

    // Handle tripboard update after itinerary recreate (upserts existing tripboard via backend)
    // Runs in background — no UI takeover, just toast on completion
    const tripboardUpdatePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Cleanup poll on unmount
    useEffect(() => {
        return () => {
            if (tripboardUpdatePollRef.current) {
                clearInterval(tripboardUpdatePollRef.current)
                tripboardUpdatePollRef.current = null
            }
        }
    }, [])

    const handleTripboardUpdateAfterRecreate = useCallback(async () => {
        const activeTrip = travelerTripsContext?.activeTrip
        if (!activeTrip) return

        const itineraryId = activeTrip.tripItinerary?.id
        if (!itineraryId) return

        const tripRole = activeTrip.role
        const isInvitedUser = tripRole === 'invited' || tripRole === 'co_traveler'
        const travelerId = isInvitedUser ? activeTrip.owner_id : (await TokenStorage.getUserInfo())?.traveler_id
        if (!travelerId) return

        const countries = activeTrip.final_destination_countries || []
        const startDate = activeTrip.preferred_travel_time?.startDate
            ? new Date(activeTrip.preferred_travel_time.startDate).toISOString().split('T')[0]
            : ''
        const endDate = activeTrip.preferred_travel_time?.endDate
            ? new Date(activeTrip.preferred_travel_time.endDate).toISOString().split('T')[0]
            : ''
        const tripPref = activeTrip.trip_preference

        try {
            const { task_id } = await startTripboardCreation({
                itinerary_id: itineraryId,
                trip_id: activeTrip.trip_id,
                traveler_id: travelerId,
                trip_name: activeTrip.name || countries.map(c => c.name).join(', ') + ' Trip',
                country_ids: countries.map(c => c.id),
                country_name: countries.map(c => c.name).join(', '),
                wizard_data: {
                    start_date: startDate,
                    end_date: endDate,
                    group_setup: {
                        adults: tripPref?.group_setup?.adults || 2,
                        children: tripPref?.group_setup?.children || 0,
                        infants: tripPref?.group_setup?.infants || 0
                    }
                }
            })

            // Poll for completion in background
            if (tripboardUpdatePollRef.current) clearInterval(tripboardUpdatePollRef.current)

            tripboardUpdatePollRef.current = setInterval(async () => {
                try {
                    const status = await pollTripboardStatus(task_id)
                    if (status.status === 'completed') {
                        if (tripboardUpdatePollRef.current) {
                            clearInterval(tripboardUpdatePollRef.current)
                            tripboardUpdatePollRef.current = null
                        }
                        toast.success('Tripboard updated with new itinerary!')
                        // Invalidate all tripboard-related queries to refresh the UI
                        queryClient.invalidateQueries({ queryKey: ['tripboard-collection', activeTrip.trip_id] })
                        queryClient.invalidateQueries({ queryKey: ['traveler-collection'] })
                        queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types'] })
                    } else if (status.status === 'failed') {
                        if (tripboardUpdatePollRef.current) {
                            clearInterval(tripboardUpdatePollRef.current)
                            tripboardUpdatePollRef.current = null
                        }
                        toast.error('Failed to update tripboard. You can try creating it manually.')
                    }
                } catch {
                    // Transient error — keep polling
                }
            }, 4000)
        } catch {
            toast.error('Failed to start tripboard update.')
        }
    }, [travelerTripsContext?.activeTrip, queryClient])

    // Check if delete button should be shown for current tab
    // On tripboard page, all users can remove sections (isTripboard = true)
    const showDeleteButton = useMemo(() => {
        return shouldAllowDeleteSection('traveler_collections', activeTab, isRimigoInternal, true)
    }, [activeTab, isRimigoInternal])
    const isBulkSelectableTab =
        activeTab === 'stays' || activeTab === 'experience' || activeTab === 'restaurant' || activeTab === 'must_have'
    const showBulkSelectionControls = showDeleteButton && isBulkSelectableTab && isRimigoInternal

    const collectionBulkSelection = useMemo((): CollectionBulkSelectionConfig | undefined => {
        if (!showBulkSelectionControls) return undefined
        return {
            mode: isBulkSelectMode,
            selectedSectionIds,
            onToggleSectionSelect: handleToggleSectionSelection,
            onToggleMode: handleToggleBulkSelectMode,
            onDeleteSelected: handleBulkDeleteSelected,
            onSelectAllVisible: handleBulkSelectAllSections
        }
    }, [
        showBulkSelectionControls,
        isBulkSelectMode,
        selectedSectionIds,
        handleToggleSectionSelection,
        handleToggleBulkSelectMode,
        handleBulkDeleteSelected,
        handleBulkSelectAllSections
    ])

    // Get overview data using adapter
    const response = collectionResponseForActiveTab as ApiResponse<ContentCollection> | undefined
    const overviewData = useMemo(() => {
        if (!response?.data) {
            return null
        }
        return adaptCollectionToOverviewData(response.data)
    }, [response?.data])

    // Handle experience click
    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                buttonName: POSTHOG_EVENTS.EXPERIENCE_VIEW_DETAILS_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    experienceId
                }
            })

            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url, '_blank')
        },
        [searchParams]
    )

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])

    // Handle close sneak peek modal
    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    // Handle marker click
    const handleMarkerClick = useCallback(
        (markerId: string | number, extras?: { name?: string }) => {
            // Resolve check-in / check-out as a PAIR — never mix sources, otherwise
            // a partial source (only checkIn or only checkOut) leaks the placeholder
            // for the other field.
            const pickDates = (
                sources: Array<{ checkIn?: string; checkOut?: string } | undefined>,
            ): { checkIn: string; checkOut: string } => {
                for (const s of sources) {
                    if (s?.checkIn && s?.checkOut) return { checkIn: s.checkIn, checkOut: s.checkOut }
                }
                return { checkIn: staysDates.checkIn, checkOut: staysDates.checkOut }
            }
            const marker = mapMarkers.find((m) => m.id === markerId)
            if (!marker) {
                // Viewport pill markers — markerId is zentrum_hub_id directly
                const hubId = String(markerId)
                if (hubId) {
                    // If we have section metadata for this hub_id, prefer those dates
                    // over the page-wide fallback (matches accommodation/explore_accommodation).
                    const dates = pickDates([staysDatesMap.get(hubId)])
                    const hotelSearchParams = new URLSearchParams({
                        hotel_name: extras?.name || '',
                        zentrum_hub_id: hubId,
                        check_in: dates.checkIn,
                        check_out: dates.checkOut,
                        city_id: searchParams.get('stays_city') || '',
                        travel_purpose: searchParams.get('travel_purpose') || 'leisure_relaxation',
                        group_type: searchParams.get('group_type') || 'couple',
                        review_type: 'complete',
                        adults: String(guestsDataForPrices.adults),
                        children: String(guestsDataForPrices.children),
                        infants: String(guestsDataForPrices.infants)
                    })
                    if (guestsDataForPrices.children_age.length > 0) {
                        hotelSearchParams.set('children_age', guestsDataForPrices.children_age.join(','))
                    }
                    if (occupanciesForPrices.length > 0) {
                        hotelSearchParams.set('rooms', String(occupanciesForPrices.length))
                        hotelSearchParams.set('occupancies', encodeOccupancies(occupanciesForPrices))
                    }
                    window.open(`/stays/${hubId}?${hotelSearchParams.toString()}`, '_blank')
                }
                return
            }

            if (marker.type === 'experience' && marker.experience_id) {
                const searchParamsString = marker.onClickData?.searchParams as string | undefined
                const url = `/experiences/${marker.experience_id}/?${searchParamsString || searchParams.toString()}`
                window.open(url, '_blank')
            } else if (marker.type === 'accommodation' && marker.zentrum_hub_id) {
                const onClickData = marker.onClickData as
                    | {
                          zentrum_hub_id?: string
                          accommodation_id?: string
                          cityId?: string
                          checkIn?: string
                          checkOut?: string
                          cityName?: string
                      }
                    | undefined

                const stayKey = marker.zentrum_hub_id || String(marker.id)
                const dates = pickDates([onClickData, staysDatesMap.get(stayKey)])

                const hotelSearchParams = new URLSearchParams({
                    hotel_name: marker.name,
                    zentrum_hub_id: marker.zentrum_hub_id,
                    accommodation_id: String(marker.id),
                    check_in: dates.checkIn,
                    check_out: dates.checkOut,
                    city_id: onClickData?.cityId || '',
                    city_name: onClickData?.cityName || '',
                    travel_purpose: searchParams.get('travel_purpose') || 'leisure_relaxation',
                    group_type: searchParams.get('group_type') || 'couple',
                    city_prefs: searchParams.get('city_prefs') || '',
                    review_type: 'complete',
                    adults: String(guestsDataForPrices.adults),
                    children: String(guestsDataForPrices.children),
                    infants: String(guestsDataForPrices.infants)
                })

                if (guestsDataForPrices.children_age.length > 0) {
                    hotelSearchParams.set('children_age', guestsDataForPrices.children_age.join(','))
                }
                if (occupanciesForPrices.length > 0) {
                    hotelSearchParams.set('rooms', String(occupanciesForPrices.length))
                    hotelSearchParams.set('occupancies', encodeOccupancies(occupanciesForPrices))
                }

                const url = `/stays/${marker.zentrum_hub_id}?${hotelSearchParams.toString()}`
                window.open(url, '_blank')
            } else if (marker.type === 'explore_accommodation' && marker.zentrum_hub_id) {
                const onClickData = marker.onClickData as
                    | {
                          zentrum_hub_id?: string
                          accommodation_id?: string
                          cityId?: string
                          checkIn?: string
                          checkOut?: string
                          cityName?: string
                      }
                    | undefined

                const stayKey = marker.zentrum_hub_id || String(marker.id)
                const dates = pickDates([onClickData, staysDatesMap.get(stayKey)])

                const hotelSearchParams = new URLSearchParams({
                    hotel_name: marker.name,
                    zentrum_hub_id: marker.zentrum_hub_id,
                    accommodation_id: String(marker.accommodation_id ?? marker.id),
                    check_in: dates.checkIn,
                    check_out: dates.checkOut,
                    city_id: onClickData?.cityId || '',
                    city_name: onClickData?.cityName || '',
                    travel_purpose: searchParams.get('travel_purpose') || 'leisure_relaxation',
                    group_type: searchParams.get('group_type') || 'couple',
                    city_prefs: searchParams.get('city_prefs') || '',
                    review_type: 'complete',
                    adults: String(guestsDataForPrices.adults),
                    children: String(guestsDataForPrices.children),
                    infants: String(guestsDataForPrices.infants)
                })
                if (guestsDataForPrices.children_age.length > 0) {
                    hotelSearchParams.set('children_age', guestsDataForPrices.children_age.join(','))
                }
                if (occupanciesForPrices.length > 0) {
                    hotelSearchParams.set('rooms', String(occupanciesForPrices.length))
                    hotelSearchParams.set('occupancies', encodeOccupancies(occupanciesForPrices))
                }
                const url = `/stays/${marker.zentrum_hub_id}?${hotelSearchParams.toString()}`
                window.open(url, '_blank')
            } else if (marker.type === 'restaurant') {
                const mapsUrl = marker.onClickData?.maps_url as string | undefined
                if (mapsUrl) {
                    window.open(mapsUrl, '_blank')
                }
            }
        },
        [mapMarkers, searchParams, staysDates.checkIn, staysDates.checkOut, staysDatesMap, guestsDataForPrices, occupanciesForPrices]
    )

    // ── Publish as content collection (internal users only) ─────────
    const { data: publishedCollectionsData, refetch: refetchPublished } = useQuery({
        queryKey: ['published-collections', identifier],
        queryFn: () => travelerCollectionApi.getPublishedCollections(identifier!),
        enabled: !!identifier && isRimigoInternal,
        staleTime: FIVE_MINUTES,
    })

    const publishMutation = useMutation({
        mutationFn: () => travelerCollectionApi.publishAsContentCollection(identifier!),
        onSuccess: (response) => {
            const data = response?.data
            if (data?.identifier) {
                toast.success(`Published as "${data.name}"`)
                refetchPublished()
            }
        },
        onError: () => {
            toast.error('Failed to publish collection')
        }
    })

    const syncToPublicCollectionMutation = useMutation({
        mutationFn: (contentCollectionIdentifier: string) =>
            travelerCollectionApi.syncToPublicCollection(identifier!, contentCollectionIdentifier),
        onSuccess: () => {
            toast.success('Synced sections to published collection')
        },
        onError: () => {
            toast.error('Failed to sync to published collection')
        }
    })

    const handleViewPublished = useCallback((countryName: string, publishedIdentifier: string) => {
        const path = countryName
            ? `/rimigo-collection/${countryName}/${publishedIdentifier}`
            : `/rimigo-collection/${publishedIdentifier}`
        window.open(path, '_blank')
    }, [])

    // Map section types to TripboardHeader tabs
    const headerTabs: TripboardHeaderTab[] = useMemo(() => {
        return allTabs
            .filter((tab) => SHOW_TRIPBOARD_OVERVIEW_TAB || tab.section_type !== 'overview')
            .map((tab) => {
                const base: TripboardHeaderTab = {
                    key: tab.section_type,
                    label: tab.name ? tab.name.charAt(0).toUpperCase() + tab.name.slice(1) : ''
                }
                return base
            })
    }, [allTabs])

    // ── Post-login trip selection modal ─────────────────────────────────
    const tripSelectionModalElement = showTripSelectionModal && pendingWizardData ? (
        <TripSelectionModal
            isOpen={showTripSelectionModal}
            onClose={() => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
                // Navigate to clean /tripboard URL
                setSearchParams({}, { replace: true })
            }}
            trips={travelerTripsContext?.tripsData?.trips ?? []}
            isTripsLoading={travelerTripsContext?.isLoading ?? false}
            pendingWizardData={pendingWizardData}
            onSelectExistingTrip={async (selectedTripId) => {
                if (travelerTripsContext?.updateActiveTrip) {
                    await travelerTripsContext.updateActiveTrip(selectedTripId, { force: true, replaceOnly: true })
                }
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
                closeCreateOverlay()
                queryClient.invalidateQueries({ queryKey: ['travelerTrips'] })
                queryClient.invalidateQueries({ queryKey: ['tripboard-collection'] })
            }}
            onNewTripCreated={() => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
            }}
            travelerTripsContext={travelerTripsContext ?? undefined}
            onCreateNewTrip={async (data) => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
                closeCreateOverlay()
                await orchestration.startFromWizard({
                    destinations: data.destinations,
                    groupType: data.groupType,
                    purpose: data.purpose,
                    wizardState: data.wizardState || INITIAL_WIZARD_STATE,
                    tripSource: data.tripSource,
                    utmMedium: data.utmMedium,
                    utmCampaign: data.utmCampaign,
                    travelerTripsContext: travelerTripsContext ?? undefined
                })
            }}
        />
    ) : null

    // ── ?create=true overlay (full-screen wizard with X to dismiss) ──
    // Hide when trip selection modal is open (post-login flow — modal takes priority)
    const createOverlayElement = (isCreateOverlayOpen && orchestration.state.phase === 'idle' && !showTripSelectionModal) ? (
        // Fixed full-screen flex column (definite viewport height) for both. The
        // inner div is the scroll container when logged in; for guests it's a
        // transparent flex passthrough so the `flex-1 min-h-0` height chain flows
        // down to the wizard's OWN `main` scroller. The wizard shell owns the
        // close (X) and the whole top region (logo + steps), so the overlay-level
        // X and TripboardHeader are intentionally not rendered here (they'd
        // duplicate the wizard chrome). The shell's X calls window.history.back(),
        // which pops ?create=true — same dismissal as closeCreateOverlay.
        <div className="fixed inset-0 z-80 flex flex-col bg-white">
            <div className={`min-h-0 flex-1 bg-white ${!isAuthenticated ? 'flex flex-col' : 'overflow-y-auto overscroll-contain'}`}>
                <TripboardCreateFlow
                    travelerTripsContext={travelerTripsContext ?? undefined}
                    onSubmit={async (data) => {
                        closeCreateOverlay()
                        // Move the URL to the pre-trip placeholder BEFORE starting orchestration.
                        // Otherwise URL-sync won't hijack (it only fires on pre-trip paths) and the
                        // user's current trip URL will keep rendering the OLD trip while the new
                        // trip is being created in the background.
                        navigate('/tripboard/new?create=true', { replace: true })
                        await orchestration.startFromWizard({
                            ...data,
                            travelerTripsContext: travelerTripsContext ?? undefined
                        })
                    }}
                    embedded
                    stepOrder="new"
                    onDestinationSelected={(destinations) => setCreateFlowHasDestination(destinations.length > 0)}
                />
            </div>
        </div>
    ) : null

    // ── /tripboard/new (orchestration idle) — render the wizard and return. This URL is
    // exclusively for starting a new trip, so never fall through to the main tripboard
    // render below; many downstream components read `travelerTripsContext.activeTrip`
    // directly (itinerary id, trip preferences, destinations) and that stale context would
    // bleed the previously-active trip's data onto the /new URL.
    if (isPreTripPath && !orchestration.isOrchestrationActive()) {
        // eslint-disable-next-line no-console
        console.log('[TripboardPage] branch → /new wizard (orch idle)')
        return (
            <>
                {tripSelectionModalElement}
                {createOverlayElement ?? (
                    // Guest → fixed full-height flex column so the wizard's
                    // `flex-1 min-h-0` scroller resolves (see comment in the
                    // bare-/tripboard create branch). Logged-in keeps min-h-screen.
                    <div className={!isAuthenticated ? 'fixed inset-0 z-40 flex flex-col bg-white' : 'min-h-screen bg-white'}>
                        <TripboardCreateFlow
                            travelerTripsContext={travelerTripsContext ?? undefined}
                            onSubmit={async (data) => {
                                await orchestration.startFromWizard({
                                    ...data,
                                    travelerTripsContext: travelerTripsContext ?? undefined
                                })
                            }}
                            embedded
                            stepOrder="new"
                            onDestinationSelected={(destinations) => setCreateFlowHasDestination(destinations.length > 0)}
                        />
                    </div>
                )}
            </>
        )
    }

    // ── Orchestration in progress — show header + tabs + orchestration in itinerary tab ────
    // Scope the orchestration view to the tripId it belongs to. If the user has navigated
    // to a different tripboard (tripId ≠ orchestration.state.tripId), fall through to the
    // normal render path so the other trip loads. On /tripboard/new, ALWAYS show the
    // orchestration view while the pipeline is active — the URL-sync effect will move us
    // to `/tripboard/<newTripId>` once the backend assigns an id, bridging the brief gap
    // where state.tripId has been set but the URL hasn't caught up.
    // Show the orchestration view when:
    //   • orchestration is running AND it's for this URL's tripId, OR
    //   • orchestration is running AND the URL is the /tripboard/new placeholder, OR
    //   • orchestration is running AND the URL is bare /tripboard (the index redirect fallback
    //     rendered TripboardPage directly — we sit here until URL-sync lands us on the new trip).
    // This prevents the "flash of old trip" between startFromWizard firing and URL-sync navigating.
    const isOnBareTripboard = location.pathname === '/tripboard' || location.pathname === '/tripboard/'
    if (
        orchestration.isOrchestrationFor(tripId ?? undefined)
        || (isPreTripPath && orchestration.isOrchestrationActive())
        || (isOnBareTripboard && orchestration.isOrchestrationActive())
    ) {
        // eslint-disable-next-line no-console
        console.log('[TripboardPage] branch → orchestration view', {
            isOrchestrationFor: orchestration.isOrchestrationFor(tripId ?? undefined),
            isPreTripPathAndActive: isPreTripPath && orchestration.isOrchestrationActive(),
            isOnBareTripboardAndActive: isOnBareTripboard && orchestration.isOrchestrationActive()
        })
        // Get country IDs from create flow state or from orchestration wizard data
        const orchCountryIds = createFlowCountryIds.length > 0
            ? createFlowCountryIds
            : (orchestration.state.wizardData?.destinations?.map(d => d.id) ?? [])
        const hasCountryData = orchCountryIds.length > 0
        const orchPhase = orchestration.state.phase
        // All orchestration phases show generating state in stays/activities/food
        const isOrchestrating = orchPhase !== 'error'

        // Build trip name from selected destinations (not activeTrip)
        const destinations = orchestration.state.wizardData?.destinations ?? []
        const orchTripName = destinations.length > 1
            ? 'Multidestination Trip'
            : destinations.length === 1
                ? `${destinations[0].title} Trip`
                : (orchestration.state.tripName ?? undefined)

        // Get flag URL from the first destination's country
        const orchFlagUrl = destinations.length > 0
            ? countries?.find(c => c.country_id === destinations[0].id)?.flag_icon_url ?? undefined
            : undefined

        const handleOrchTabClick = (tabKey: string) => {
            if (tabKey === 'itinerary') {
                setCreateFlowActiveTab('itinerary')
            } else if (hasCountryData) {
                setCreateFlowActiveTab(tabKey)
            }
        }

        // During orchestration, stays/activities/food show generating shimmer (no lock)
        // Only show Must Have / Tips if the country has data for them
        const orchTabs: TripboardHeaderTab[] = [
            ...(SHOW_TRIPBOARD_OVERVIEW_TAB
                ? [{ key: 'overview', label: 'Overview', isLocked: !hasCountryData } as TripboardHeaderTab]
                : []),
            { key: 'itinerary', label: 'Itinerary', isLoading: isOrchestrating },
            { key: 'stays', label: 'Stays', isLoading: isOrchestrating },
            { key: 'experience', label: 'Activities', isLoading: isOrchestrating },
            { key: 'restaurant', label: 'Restaurants', isLoading: isOrchestrating },
            ...(createFlowHasMustHave ? [{ key: 'must_have', label: 'Must Have', isLocked: !hasCountryData }] : []),
        ]

        return (
            <>
                {tripSelectionModalElement}
                <div className="min-h-screen bg-white">
                    <TripboardHeader
                        tabs={orchTabs}
                        activeTab={createFlowActiveTab}
                        onTabClick={handleOrchTabClick}
                        className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                        assistantConfig={{ enabled: false }}
                        fallbackTripName={orchTripName}
                        fallbackFlagUrl={orchFlagUrl}
                        hideTalkToExpert
                    />
                    {/* Orchestration view (itinerary tab) — always mounted */}
                    <div style={{ display: createFlowActiveTab === 'itinerary' ? 'block' : 'none' }}>
                        <TripboardOrchestrationView orchestration={orchestration} />
                    </div>
                    {/* Tab content during generation */}
                    {hasCountryData && createFlowActiveTab !== 'itinerary' && (
                        <CreateFlowTabContent
                            tab={createFlowActiveTab as CreateFlowTab}
                            countryIds={orchCountryIds}
                            onGoToItinerary={() => setCreateFlowActiveTab('itinerary')}
                            generatingState={isOrchestrating ? 'generating' : undefined}
                        />
                    )}
                </div>
            </>
        )
    }

    // Show ONLY the trip selection modal when it's open (post-login wizard recovery)
    // This prevents the modal from re-mounting when the page transitions between loading → loaded branches
    if (showTripSelectionModal && pendingWizardData) {
        return <>{tripSelectionModalElement}</>
    }

    // Persistent loading shell — one header + content-skeleton tree shared by every
    // "still loading" branch below. Reusing a single element keeps the header MOUNTED
    // across the resolve-identifier → resolve-section-types phases (instead of mounting,
    // unmounting, then remounting it), and `tabsLoading` renders skeleton tab chips so
    // it no longer pops from "logo only" to "logo + tabs".
    const tripboardLoadingShell = (
        // Mirror the main render's outer structure EXACTLY — same provider root, same child
        // order (SocialMeta, modals, past-dates slot, wrapper div), same wrapper div, and the
        // <TripboardHeader> at the same position. React then PRESERVES the header instance
        // across the loading → loaded transition: it just updates props (skeleton chips →
        // real tabs) instead of tearing the header down and rebuilding it. That removes the
        // header blink that showed right before the itinerary/compass. Only the content slot
        // (the last child of the wrapper div) swaps from skeleton to real content.
        <TripCollectionRecommendationsProvider
            recommendations={personalTourRecommendations}
            priceOverrides={personalTourPriceOverrides}
            collectionIdentifier={identifier ?? null}
            collectionId={tripCollectionResponse?.data?.[0]?.id ?? null}
            tripOwnerName={tripOwnerFirstName}
        >
            <SocialMeta title={travelerTripsContext?.activeTrip?.name || 'Rimigo Tripboard'} />
            {tripSelectionModalElement}
            {createOverlayElement}
            {null /* past-dates modal slot — keeps child indices aligned with the main render */}
            <div className="bg-white max-lg:h-full max-lg:flex max-lg:flex-col max-lg:overflow-hidden lg:min-h-screen">
                <TripboardHeader
                    tabs={[]}
                    tabsLoading
                    activeTab={activeTab}
                    onTabClick={setActiveTab}
                    className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                    assistantConfig={{ enabled: false }}
                />
                {(activeTab ?? 'itinerary') === 'itinerary' ? (
                    // Itinerary tab: branded compass first. A viewport-centred fixed overlay
                    // (z-50 — below the sticky header z-70 and the sidebar rail z-1000, both of
                    // which stay visible on top). Matches the pre-header loader exactly (also
                    // fixed/viewport-centred), so the compass is visually centred on the screen
                    // and never shifts — vertically or horizontally — when the header mounts.
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F9F7FF]">
                        <LogoLoadingScreen />
                    </div>
                ) : (
                    <ViewContentCollectionLoading isRimigoInternal={isRimigoInternal} hideTabBar activeTab={activeTab} />
                )}
            </div>
        </TripCollectionRecommendationsProvider>
    )

    // Show loading state while resolving trip_id to identifier
    if (isTripCollectionLoading) {
        return tripboardLoadingShell
    }

    // Show create flow if no trip exists (logged out or no active trip)
    if (!tripId && !isCreateOverlayOpen) {
        const handleCreateFlowTabClick = (tabKey: string) => {
            if (tabKey === 'itinerary') { setCreateFlowActiveTab(tabKey); return }
            if (createFlowHasDestination) {
                setCreateFlowActiveTab(tabKey)
            }
        }

        return (
            <>
                {tripSelectionModalElement}
                {createOverlayElement}
                {/* Guests get a fixed full-height flex column so the new wizard's
                    own `flex-1 min-h-0` scroller resolves (a plain `min-h-screen`
                    block parent collapses it → locked scroll). Logged-in keeps
                    `min-h-screen` + the document scroll under SideBarLayout. */}
                <div className={!isAuthenticated ? 'fixed inset-0 z-40 flex flex-col bg-white' : 'min-h-screen bg-white'}>
                    {/* Outer TripboardHeader is suppressed for logged-out viewers —
                        the WizardShell already owns the entire top region (logo +
                        steps + login), so rendering it here would double-chrome. */}
                    {isAuthenticated && (
                        <TripboardHeader
                            tabs={createFlowHasDestination ? createFlowTabs : []}
                            activeTab={createFlowHasDestination ? createFlowActiveTab : null}
                            onTabClick={handleCreateFlowTabClick}
                            className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                            assistantConfig={{ enabled: false }}
                            hideTalkToExpert
                        />
                    )}
                    {/* Wizard — always mounted, hidden when other tabs active
                        (preserves step state). For guests the wrapper is a flex
                        column (no inline display:block, which would break the
                        height chain); they only ever see the itinerary tab. */}
                    <div
                        className={!isAuthenticated ? 'flex min-h-0 flex-1 flex-col' : undefined}
                        style={isAuthenticated ? { display: createFlowActiveTab === 'itinerary' ? 'block' : 'none' } : undefined}>
                        <TripboardCreateFlow
                            travelerTripsContext={travelerTripsContext ?? undefined}
                            onSubmit={async (data) => {
                                await orchestration.startFromWizard({
                                    ...data,
                                    travelerTripsContext: travelerTripsContext ?? undefined
                                })
                            }}
                            embedded
                            stepOrder="new"
                            onDestinationSelected={(destinations) => {
                                setCreateFlowHasDestination(destinations.length > 0)
                                setCreateFlowCountryIds(destinations.map(d => d.id))
                            }}
                        />
                    </div>
                    {/* Tab content — overview/must_have/tips show data; stays/experience/restaurant show locked dummy */}
                    {createFlowHasDestination && createFlowActiveTab !== 'itinerary' && (
                        <CreateFlowTabContent
                            tab={createFlowActiveTab as CreateFlowTab}
                            countryIds={createFlowCountryIds}
                            onGoToItinerary={() => setCreateFlowActiveTab('itinerary')}
                        />
                    )}
                </div>
            </>
        )
    }

    // Show error if trip collection fetch failed.
    // Belt-and-suspenders: when an orchestration pipeline is mid-flight (for any
    // tripId), do NOT render the not-found screen. The collection genuinely doesn't
    // exist yet — the backend will create it as part of the pipeline. Falling
    // through to the loading shell below keeps the create-flow UX smooth instead
    // of flashing "Collection not found" during the normal new-user creation
    // window or any brief query/orchestration timing gap.
    if (isTripCollectionError && !orchestration.isOrchestrationActive()) {
        return <>{tripSelectionModalElement}{createOverlayElement}<CollectionNotFound /></>
    }

    // Show loading state for section types and experience collection — reuse the same
    // shell so the header from the previous phase stays mounted (no flash between the
    // two skeleton states).
    if (isSectionTypesLoading || isExperienceCollectionLoading || isSectionTypesPending) {
        return tripboardLoadingShell
    }

    // Show error state for section types
    if (isSectionTypesError) {
        return <>{tripSelectionModalElement}{createOverlayElement}<SectionTypesError isRimigoInternal={isRimigoInternal} /></>
    }

    // If no collection found for this trip_id, check if itinerary exists.
    //
    // IMPORTANT: gate this branch on `isViewingActiveTrip`. Otherwise a
    // non-owner pasted URL (where the BE returns no collection) falls through
    // to a fallback that reads the *viewer's* context activeTrip and renders
    // the wrong trip's data on top of the URL trip's itinerary. The
    // "Create Tripboard from existing itinerary" flow is only meaningful for
    // the viewer's own trip.
    if (!identifier && isViewingActiveTrip) {
        const fallbackActiveTrip = travelerTripsContext?.activeTrip
        const fallbackItineraryId = fallbackActiveTrip?.tripItinerary?.id

        // Check if itinerary exists AND has days (status !== 'draft' means it has generated content)
        const itineraryHasDays = itineraryData?.days && itineraryData.days.length > 0

        // If itinerary exists with days, show itinerary + "Create Tripboard" button beside recreate
        if (fallbackItineraryId && fallbackActiveTrip && itineraryHasDays) {
            const activeTrip = fallbackActiveTrip
            const itineraryId = fallbackItineraryId
            const handleCreateTripboard = async () => {
                const countries = activeTrip.final_destination_countries || []
                const startDate = activeTrip.preferred_travel_time?.startDate
                    ? new Date(activeTrip.preferred_travel_time.startDate).toISOString().split('T')[0]
                    : ''
                const endDate = activeTrip.preferred_travel_time?.endDate
                    ? new Date(activeTrip.preferred_travel_time.endDate).toISOString().split('T')[0]
                    : ''
                const tripPref = activeTrip.trip_preference

                const tripRole = activeTrip.role
                const isInvitedUser = tripRole === 'invited' || tripRole === 'co_traveler'

                await orchestration.startFromExistingTrip({
                    tripId: activeTrip.trip_id,
                    itineraryId,
                    tripName: activeTrip.name || countries.map(c => c.name).join(', ') + ' Trip',
                    countryIds: countries.map(c => c.id),
                    countryName: countries.map(c => c.name).join(', '),
                    startDate,
                    endDate,
                    groupSetup: {
                        adults: tripPref?.group_setup?.adults || 2,
                        children: tripPref?.group_setup?.children || 0,
                        infants: tripPref?.group_setup?.infants || 0
                    },
                    dietaryRestrictions: tripPref?.diet_preferences,
                    ownerTravelerId: isInvitedUser ? activeTrip.owner_id : undefined
                })
            }

            return (
                <>
                    {tripSelectionModalElement}
                    {createOverlayElement}
                    <div className="min-h-screen bg-white">
                        <TripboardHeader
                            tabs={[{ key: 'itinerary', label: 'Itinerary' }]}
                            activeTab="itinerary"
                            onTabClick={() => { }}
                            hideTabSection
                            tripId={tripId ?? undefined}
                            isOwner={!isInvitedTrip}
                            className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                            assistantConfig={{
                                enabled: false,
                                ataId: itineraryAgentId,
                                tripId: tripId ?? undefined,
                                assistantType: 'ItineraryExpertChat',
                                entityType: 'trip_id',
                                entityId: tripId ?? '',
                                inputData: {
                                    trip_id: tripId ?? ''
                                }
                            }}
                        />
                        {/* Itinerary view with "Create Tripboard" button beside recreate */}
                        <Itenerary
                            itineraryIdOverride={itineraryId}
                            activeTrip={activeTrip}
                            onCreateTripboardOverride={handleCreateTripboard}
                            embedded={true}
                            agentIdOverride={itineraryAgentId}
                            onMobileViewChange={(view) => setIsItineraryMapActive(view === 'map')}
                        />

                        {/* Mobile sticky CTA — only visible on mobile (md:hidden handled inside component) */}
                        <MobileStickyCTA
                            showOnScroll={false}
                            buttons={[
                                {
                                    title: 'Create Tripboard',
                                    onClick: handleCreateTripboard,
                                    variant: 'primary',
                                    flex: 'w-full',
                                }
                            ]}
                        />
                    </div>
                </>
            )
        }

        // No itinerary — show wizard with existing trip
        return (
            <>
                {tripSelectionModalElement}
                {createOverlayElement}
                <div className="min-h-screen bg-white">
                    <TripboardHeader
                        tabs={createFlowTabs}
                        activeTab={null}
                        onTabClick={() => {}}
                        className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                        assistantConfig={{ enabled: false }}
                    />
                    <TripboardCreateFlow
                        existingTripId={tripId}
                        defaultDestination={defaultDestinationFromTrip}
                        travelerTripsContext={travelerTripsContext ?? undefined}
                        onSubmit={async (data) => {
                            await orchestration.startFromExistingTripWithItinerary({
                                tripId: tripId!,
                                ...data,
                            })
                        }}
                        embedded
                        stepOrder="new"
                        onDestinationSelected={(destinations) => setCreateFlowHasDestination(destinations.length > 0)}
                    />
                </div>
            </>
        )
    }

    // Show loading state for collection data — route through the shared shell so the
    // persistent header stays mounted. This branch previously rendered a header-less
    // skeleton (with its own internal tab bar), which caused a third flash during the
    // brief `!activeTab` window on a fresh load and again while the stays collection
    // resolves. The shell already renders the real tabs once section types are known.
    if (isLoading || !activeTab) {
        return tripboardLoadingShell
    }

    // Show error state for collection data
    if (isError || !collectionResponseForActiveTab) {
        return (
            <><div className="min-h-screen bg-white">
                <div className="w-full max-w-[1380px] py-8 mx-auto px-4">
                    <CollectionTabs
                        sectionTypes={allTabs}
                        activeTab={activeTab}
                        onTabClick={setActiveTab}
                    />
                    <div className="text-center py-12">
                        <Typography
                            size="16"
                            weight="medium"
                            color="grey-1">
                            {isError ? 'Failed to load collection. Please try again later.' : 'Collection not found'}
                        </Typography>
                    </div>
                </div>
            </div></>
        )
    }

    // Allow Overview and Bookings tabs to render even without collection API data
    // (Bookings uses its own /budget endpoint, not the collection API)
    if (!response?.data && activeTab !== 'overview' && activeTab !== 'budget') {
        return (
            <>
                <CollectionNotFound />
            </>
        )
    }

    const collection: ContentCollectionViewModel | null = response?.data ? adaptContentCollectionToViewModel(response.data) : null

    // Social / SEO meta — drives WhatsApp, Facebook, Twitter, LinkedIn preview cards.
    // Prefer the collection's own name + cover image; fall back to the identifier-derived
    // display name so the share preview is meaningful even before the collection loads.
    const tripboardDisplayName = resolveTripboardDisplayName({
        tripName,
        activeTripName: activeTrip?.name,
        collectionTripName: response?.data?.trip_name,
        collectionName: collection?.name,
        identifier,
    })
    const socialTitle = tripboardDisplayName || 'Rimigo Tripboard'
    const socialDescription =
        collection?.description
        || (tripboardDisplayName ? `Explore ${tripboardDisplayName} on Rimigo — itinerary, stays, activities, and more.` : undefined)
    const socialImage = collection?.imageUrl || undefined

    // ── Past-dates modal ─────────────────────────────────────────────────────
    // Shown to trip owners only once the itinerary's LAST day is before today
    // (whole trip is over). A trip mid-flight keeps its dates; the rates
    // fallback above still uses isItineraryStartedOrPast so past city dates
    // don't error on lookups.
    // Confirm → cloneItinerary shifts days in-place + updateTripDates
    // patches preferred_travel_time. Dismiss is local-state only, so the
    // modal returns on every reload until the user actually updates.
    //
    // Trigger reads itinerary days, NOT preferred_travel_time, because the
    // latter can lag a freshly-cloned itinerary on the next page load.
    const tripDatesArePast = isItineraryFullyPast(itineraryData?.days)
    const shouldShowPastDatesModal =
        !!tripId
        && !isReadOnly
        && tripDatesArePast
        && !pastDatesModalDismissed
        && orchestration.state.phase === 'idle'

    // Plain function (not useCallback): this block lives below conditional
    // early returns, so adding hooks here would break the rules of hooks.
    // Children don't memo on identity, so re-creating per render is fine.
    const handleUpdatePastDates = async (newStartDate: Date) => {
        if (!tripId) {
            toast.error('Could not update dates — no trip loaded.')
            return
        }
        const itineraryIdForClone = itineraryId
        if (!itineraryIdForClone) {
            toast.error('Could not update dates — itinerary not loaded yet.')
            return
        }

        // Anchor at noon UTC so the calendar date survives timezone
        // conversion. `.toISOString()` on a local-midnight Date slips one
        // day back in any positive UTC offset (IST: 2026-05-10 → 2026-05-09T18:30Z),
        // and the backend reads `.date()` from this string.
        const toNoonUtcIso = (d: Date) => {
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd}T12:00:00Z`
        }
        const newStartIso = toNoonUtcIso(newStartDate)

        try {
            // 1) Shift itinerary in-place. Backend replaces the existing
            //    record (same id, new days/route/stays, status='draft').
            await cloneItinerary(itineraryIdForClone, {
                trip_id: tripId,
                start_date: newStartIso,
            })

            // 2) PATCH preferred_travel_time. End date = new start + trip
            //    length. Prefer original prefs length; fall back to itinerary
            //    day count so we never send end == start.
            const origStartYmd = activeTrip?.preferred_travel_time?.startDate
                ? formatDateStringToYMD(activeTrip.preferred_travel_time.startDate)
                : null
            const origEndYmd = activeTrip?.preferred_travel_time?.endDate
                ? formatDateStringToYMD(activeTrip.preferred_travel_time.endDate)
                : null
            const tripLenFromPrefs = origStartYmd && origEndYmd ? daysBetweenYmd(origStartYmd, origEndYmd) : 0
            const itinDayCount = itineraryData?.days?.length ?? 0
            const tripLenDays = tripLenFromPrefs > 0
                ? tripLenFromPrefs
                : Math.max(itinDayCount - 1, 1)
            const newEndDate = new Date(newStartDate)
            newEndDate.setDate(newEndDate.getDate() + tripLenDays)

            if (travelerTripsContext?.updateTripDates) {
                await travelerTripsContext.updateTripDates({
                    preferred_travel_time: {
                        is_fixed: true,
                        startDate: newStartIso,
                        endDate: toNoonUtcIso(newEndDate),
                        year: null,
                        months: null,
                    },
                })
            }

            // 3) Strip the stays_exp_* fallback the eager useEffect wrote
            //    when the trip was past. The reload below preserves
            //    window.location, so without this the post-shift page
            //    would keep reading the old future-window dates and the
            //    ExploringDatesBanner would show e.g. "Jun 10 - Jun 22"
            //    even though every city is now on or after today.
            const cleanUrl = new URL(window.location.href)
            cleanUrl.searchParams.delete(STAYS_EXP_PARAMS.checkIn)
            cleanUrl.searchParams.delete(STAYS_EXP_PARAMS.checkOut)
            cleanUrl.searchParams.delete(STAYS_EXP_PARAMS.window)
            window.history.replaceState(window.history.state, '', cleanUrl.toString())

            // 4) Force a budget recompute. The budget snapshot pins each
            //    day's date server-side, so it won't follow the cloned
            //    itinerary on its own. Flight legs also need shifting but
            //    are handled by the reconciliation effect on reload, so we
            //    don't duplicate that work here.
            if (identifier) {
                try {
                    await budgetApi.getBudget(identifier, true)
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[PastDatesModal] Failed to force budget recalc:', e)
                }
            }

            // 5) Invalidate caches and reload so every consumer (itinerary,
            //    stays, flights, rates) refetches with the new dates.
            queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryIdForClone] })
            queryClient.invalidateQueries({ queryKey: ['traveler-trips'] })
            if (identifier) {
                queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier] })
                queryClient.invalidateQueries({ queryKey: ['tripBudget', identifier] })
            }
            toast.success('Trip dates updated')
            setTimeout(() => window.location.reload(), 250)
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[PastDatesModal] Failed to update dates:', err)
            toast.error('Could not update dates. Please try again.')
        }
    }

    // Local-only dismiss — modal returns on reload. The stays_exp_*
    // fallback is already written by the eager useEffect above.
    const handleDismissPastDates = () => setPastDatesModalDismissed(true)

    const pastDatesModalElement = shouldShowPastDatesModal ? (
        <PastDatesTakeover
            tripId={tripId ?? null}
            originalStartDate={activeTrip?.preferred_travel_time?.startDate ?? null}
            originalEndDate={activeTrip?.preferred_travel_time?.endDate ?? null}
            userRole={isInvitedTrip ? 'invited' : 'owner'}
            onUpdate={handleUpdatePastDates}
            onDismiss={handleDismissPastDates}
        />
    ) : null

    return (
        <TripCollectionRecommendationsProvider
            recommendations={personalTourRecommendations}
            priceOverrides={personalTourPriceOverrides}
            collectionIdentifier={identifier ?? null}
            collectionId={tripCollectionResponse?.data?.[0]?.id ?? null}
            tripOwnerName={tripOwnerFirstName}
        >
            <SocialMeta
                title={socialTitle}
                description={socialDescription}
                image={socialImage}
            />
            {tripSelectionModalElement}
            {createOverlayElement}
            {pastDatesModalElement}
            {/* Mobile: fixed-height shell — header pinned, only content scrolls.
                Desktop (lg:) keeps the original min-h-screen flow. */}
            <div className="bg-white max-lg:h-full max-lg:flex max-lg:flex-col max-lg:overflow-hidden lg:min-h-screen">
                <TripboardHeader
                    forceCompressed={isMobileViewport && hideMobileSubHeader}
                    tabs={headerTabs}
                    activeTab={activeTab}
                    onTabClick={setActiveTab}
                    tripId={tripId ?? undefined}
                    collectionIdentifier={identifier}
                    isOwner={!isInvitedTrip}
                    isReadOnly={isReadOnly}
                    ownerName={tripboardDisplayName}
                    className="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                    hideDesktopAssistantUI={activeTab === 'itinerary' && isItineraryRecreateMode}
                    hideFloatingAssistant={
                        (isItineraryMapActive && activeTab === 'itinerary') || mobileActiveTab === 'map' || activeTab === 'experience'
                    }
                    assistantConfig={{
                        enabled: !!itineraryAgentId && !!tripId && !isReadOnly,
                        ataId: itineraryAgentId,
                        tripId: tripId ?? undefined,
                        assistantType: 'ItineraryExpertChat',
                        entityType: 'trip_id',
                        entityId: tripId ?? '',
                        inputData: {
                            trip_id: tripId ?? ''
                        }
                    }}
                    publishConfig={{
                        isVisible: isRimigoInternal && !!identifier && !isReadOnly,
                        isPublishing: publishMutation.isPending,
                        publishedCollections: publishedCollectionsData?.data ?? [],
                        onPublish: () => publishMutation.mutate(),
                        onViewPublished: handleViewPublished,
                        onSyncToPublicCollection: (ccIdentifier: string) => syncToPublicCollectionMutation.mutate(ccIdentifier),
                        syncingIdentifier: syncToPublicCollectionMutation.isPending ? (syncToPublicCollectionMutation.variables ?? null) : null
                    }}
                    tripboardSyncFromPage={tripboardSyncFromPage}
                    onRecreate={
                        activeTab === 'itinerary' && canRecreateItinerary && !isReadOnly
                            ? handleRecreateFromHeader
                            : undefined
                    }
                    onShareItinerary={
                        activeTab === 'itinerary' && canShareItinerary && isRimigoInternal && !isReadOnly
                            ? handleShareItineraryFromHeader
                            : undefined
                    }
                    versioningConfig={{
                        enabled: !!tripId && !isReadOnly,
                        // Delete available to anyone with edit access — pinned
                        // versions remain protected by the unpin-first rule
                        // enforced by the backend.
                        canDelete: !isReadOnly,
                    }}
                    onDownloadPDF={onDownloadPDF}
                />
                <div className="w-full mx-auto lg:min-h-[calc(100vh-72px)] max-lg:flex-1 max-lg:min-h-0 max-lg:flex max-lg:flex-col">
                    <div className="flex flex-col lg:flex-row lg:gap-0 max-lg:flex-1 max-lg:min-h-0">
                        {/* Left Side: Header, Tabs, and Content - Scrollable */}
                        <div
                            ref={tabScrollContainerRef}
                            className={`lg:transition-[width] lg:duration-300 lg:ease-out [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] overflow-x-clip max-lg:min-w-0 max-lg:overflow-x-hidden ${
                                mapMarkers.length > 0 && shouldShowMap && activeTab !== 'budget' && !isActivitiesExploreDesktopHide
                                    ? 'w-full lg:w-[640px] xl:w-[720px] shrink-0 bg-grey-5'
                                    : 'w-full bg-grey-5 max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-y-auto max-lg:overscroll-none'
                            } ${mobileActiveTab === 'map' ? 'max-lg:hidden' : ''}`}
                            style={{
                                scrollbarWidth: 'none',
                                // Disable scroll-anchoring so the browser doesn't fight the
                                // chrome collapse above (the trip-name row changes height),
                                // and kill the rubber-band bounce into empty space.
                                overflowAnchor: 'none',
                                overscrollBehavior: 'none',
                                // Fixed-height, flex-pinned scroll container so the trip-name
                                // collapse never RESIZES the scroller mid-momentum (that resize
                                // is what makes the Activities carousels overshoot on a fast
                                // flick). Applies to the Activities tab on mobile AND to any
                                // map-showing tab (Stays) — the map tab's className gives only
                                // `shrink-0`, so the inline height + overflowY are what make it
                                // scroll. Pinning flex-grow/shrink/basis is required because the
                                // container's `flex-1` would otherwise override the height.
                                ...((isMobileViewport && activeTab === 'experience') || (mapMarkers.length > 0 && shouldShowMap)
                                    ? {
                                          height: 'calc(100vh - 72px)',
                                          overflowY: 'auto',
                                          flexGrow: 0,
                                          flexShrink: 0,
                                          flexBasis: 'auto'
                                      }
                                    : {})
                            }}>
                        {/* Sticky header portal — inside scroll container so map stays aligned at top.
                            z-40 sits above the card overlays inside
                            HorizontalListCard (carousel arrows go up to
                            z-30; the sneak-peek + heart chips sit at
                            z-20). At z-20 the sticky header tied with
                            those chips and DOM-order made the chips
                            paint on top as cards scrolled under the
                            header. */}
                        {/* Sticky portal target. Hides via `transform: translateY(-100%)`
                            on mobile scroll-down — CRITICALLY, the element's HEIGHT in
                            the document flow never changes. Only the visual position
                            transforms. That means:
                              • the list never reflows
                              • scroll-anchoring never fires
                              • the user is never auto-scrolled
                            The sub-header simply slides up behind the main
                            TripboardHeader (z-70) when hidden, and slides back down
                            when shown. The list sits in place the entire time. */}
                        <div
                            className={cn(
                                'sticky top-0 z-40',
                                activeTab !== 'stays' && activeTab !== 'experience' && activeTab !== 'restaurant' && 'hidden'
                            )}>
                            <div
                                style={{
                                    // Asymmetric durations — the slide-up close is
                                    // visibly longer than the slide-down reveal so
                                    // the user perceives the sub-header "easing out
                                    // of the way" instead of snapping shut. A pure
                                    // 500ms symmetric pair felt rigid on hide.
                                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                    transitionDuration:
                                        isMobileViewport && hideMobileSubHeader ? '700ms' : '450ms',
                                    transitionProperty: 'transform, opacity'
                                }}
                                // Mobile-only: outer wrapper hides the WHOLE
                                // sub-header (chip carousel + secondary
                                // controls) on scroll-down. Desktop keeps
                                // the chip carousel pinned at all times —
                                // only the inner Explore/Shortlist toggle
                                // row collapses (handled inside the
                                // ExperienceTab's renderStickyHeader).
                                className={cn(
                                    'will-change-transform',
                                    isMobileViewport && hideMobileSubHeader
                                        ? '-translate-y-full opacity-0 pointer-events-none'
                                        : 'translate-y-0 opacity-100'
                                )}>
                                <div
                                    ref={staysHeaderPortalRef}
                                    className="bg-white shadow-[0px_2px_4px_rgba(0,0,0,0.08)]"
                                />
                            </div>
                        </div>
                            {/* List Content */}
                            <div className={`${mobileActiveTab === 'map' ? 'max-md:hidden' : ''}`}>
                                {allTabs.map((sectionType) => {
                                    const isActive = activeTab === sectionType.section_type
                                    const sectionTypeValue = sectionType.section_type

                                    return (
                                        <div
                                            key={sectionTypeValue}
                                            style={{ display: isActive ? 'block' : 'none' }}>
                                            {/* Overview tab */}
                                            {sectionTypeValue === 'overview' && (
                                                <OverviewTabContent
                                                    overviewData={overviewData}
                                                    collectionIdentifier={identifier}
                                                    collectionName={tripboardDisplayName}
                                                    contentCollectionMetadataId={response?.data?.content_collection_metadata || null}
                                                    publisherId={publisherId}
                                                    countryId={countryId}
                                                    tripRouteTitle="Cities covered"
                                                    hideInfoCards
                                                    hideDescription
                                                    highlightsTitleLine1="Trip"
                                                    highlightsTitleLine2="Highlights"
                                                    dailyHighlightsContent={
                                                        itineraryId ? (
                                                            <TripDailyHighlightsSection
                                                                days={itineraryData?.days ?? []}
                                                                isLoading={isItineraryLoading && (itineraryData?.days?.length ?? 0) === 0}
                                                                onDayClick={(dayIdx) => navigateToItineraryTab(dayIdx)}
                                                                onViewFullItinerary={() => navigateToItineraryTab(undefined, { view: 'board' })}
                                                            />
                                                        ) : null
                                                    }
                                                    extraContentAfterHighlights={
                                                        <>
                                                            {(isLoadingWatchAlong || watchAlongShorts.length > 0) && (
                                                                <div className="mb-12">
                                                                    <DiscoverWatchAlongPanel
                                                                        shorts={watchAlongShorts}
                                                                        isLoading={isLoadingWatchAlong}
                                                                        hasMore={hasMoreWatchAlong}
                                                                        onLoadMore={loadMoreWatchAlong}
                                                                        isLoadingMore={isLoadingMoreWatchAlong}
                                                                        onShortClick={(index) => {
                                                                            setSelectedShortIndex(index)
                                                                            setIsShortsModalOpen(true)
                                                                        }}
                                                                        PageName="tripboard_overview"
                                                                    />
                                                                </div>
                                                            )}
                                                            {(selectedCountrySwitcherId || countryId) && (
                                                                <div className="mb-12">
                                                                    <TopCitiesSection
                                                                        countryId={selectedCountrySwitcherId || countryId!}
                                                                        onSeeAllClick={() => {
                                                                            const params = new URLSearchParams()
                                                                            const activeCountryId = selectedCountrySwitcherId || countryId!
                                                                            params.set('country_id', activeCountryId)

                                                                            // Get country name for the selected country
                                                                            const countryName =
                                                                                switcherCountries.find((c) => c.country_id === activeCountryId)
                                                                                    ?.country_name ??
                                                                                travelerTripsContext?.activeTrip?.final_destination_countries?.[0]
                                                                                    ?.name
                                                                            if (countryName) params.set('country_name', countryName)

                                                                            const groupType =
                                                                                travelerTripsContext?.activeTrip?.tripProfile?.group_type
                                                                            if (groupType) params.set('groupType', groupType)
                                                                            const travelPurpose =
                                                                                travelerTripsContext?.activeTrip?.tripProfile?.travel_purpose
                                                                            if (travelPurpose) params.set('travelPurpose', travelPurpose)
                                                                            const startDate =
                                                                                travelerTripsContext?.activeTrip?.preferred_travel_time?.startDate
                                                                            if (startDate) {
                                                                                const d = new Date(startDate)
                                                                                if (!isNaN(d.getTime())) {
                                                                                    params.set('month', String(d.getMonth() + 1))
                                                                                    params.set('year', String(d.getFullYear()))
                                                                                }
                                                                            }
                                                                            window.open(`/experiences?${params.toString()}`, '_blank')
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </>
                                                    }
                                                    showCountrySwitcher={switcherCountries.length > 1}
                                                    countriesForSwitcher={switcherCountries}
                                                    selectedCountrySwitcherId={selectedCountrySwitcherId}
                                                    onCountrySwitcherSelect={(id) => setSelectedCountrySwitcherId(id)}
                                                />
                                            )}

                                        {/* Experience tab */}
                                        {sectionTypeValue === 'experience' && (
                                            <>
                                            <ExperienceTab
                                                experiences={experiences}
                                                inItineraryExperiences={inItineraryExperiences}
                                                experienceSlotMap={experienceSlotMap}
                                                experienceDayMap={experienceDayMap}
                                                experienceCommentsByExpId={experienceCommentsByExpId}
                                                isExperiencesLoading={isExperiencesLoading}
                                                onExperienceClick={handleExperienceClick}
                                                onSneakPeekClick={handleSneakPeekClick}
                                                hoveredCardId={hoveredCardId}
                                                setHoveredCardId={setHoveredCardId}
                                                onSwitchToMapTab={() => setMobileActiveTab('map')}
                                                collectionIdentifier={identifier}
                                                experienceSectionMap={experienceSectionMap}
                                                sectionMetadataMap={expSectionMetadataMap}
                                                api={travelerCollectionApi}
                                                allowDateEdit={!isReadOnly && allowDateEdit}
                                                onDeleteSection={!isReadOnly && showDeleteButton && !isBulkSelectMode ? handleDeleteSection : undefined}
                                                isDeleting={deleteSectionMutation.isPending}
                                                bulkSelection={isReadOnly ? undefined : collectionBulkSelection}
                                                canAddExperience={!isReadOnly}
                                                collectionType="traveler"
                                                queryKeyPrefix="traveler-collection"
                                                fallbackMode="tripboard"
                                                exploreCountryId={exploreCountryIdForActivities}
                                                exploreCountryName={exploreCountryNameForActivities}
                                                headerPortalRef={staysHeaderPortalRef}
                                                isActive={activeTab === 'experience'}
                                                showShortlistToggle
                                                tripId={tripId ?? undefined}
                                                itineraryId={itineraryId ?? undefined}
                                                countryId={exploreCountryIdForActivities ?? countryId ?? null}
                                                itineraryDays={itineraryData?.days as Parameters<typeof ExperienceTab>[0]['itineraryDays']}
                                            />
                                            </>
                                        )}

                                        {/* Stays tab */}
                                        {sectionTypeValue === 'stays' && (
                                            <>
                                            <StaysTab
                                                isStaysLoading={isStaysLoading}
                                                staysData={staysData}
                                                stayMetadataMap={stayMetadataMap}
                                                cityId={cityIdForFilters}
                                                onDatesChange={isReadOnly ? undefined : () => {
                                                    queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                                                    queryClient.invalidateQueries({ queryKey: ['traveler-collection-stay-price'] })
                                                }}
                                                collectionIdentifier={identifier}
                                                staySectionMap={staySectionMap}
                                                staySectionMetadataMap={staySectionMetadataMap}
                                                api={travelerCollectionApi}
                                                allowDateEdit={!isReadOnly && allowDateEdit}
                                                buttonPage={POSTHOG_PAGES.COLLECTION_PAGE}
                                                stayPricesMap={stayPricesMap}
                                                isFilterOpen={isStaysFilterOpen}
                                                isSortOpen={isStaysSortOpen}
                                                onFilterOpenChange={setIsStaysFilterOpen}
                                                onSortOpenChange={setIsStaysSortOpen}
                                                countryIds={countryIds}
                                                onDeleteSection={!isReadOnly && showDeleteButton && !isBulkSelectMode ? handleDeleteSection : undefined}
                                                onDeleteExploreStay={handleDeleteExploreStay}
                                                isDeleting={deleteSectionMutation.isPending}
                                                bulkSelection={isReadOnly ? undefined : collectionBulkSelection}
                                                hideShortlist
                                                sectionBlocksMap={sectionBlocksMap}
                                                collectionType="traveler"
                                                queryKeyPrefix="traveler-collection"
                                                fallbackMode="tripboard"
                                                onMapViewClick={mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined}
                                                itineraryDays={itineraryData?.days as any}
                                                itineraryStays={itineraryData?.stays}
                                                routeSummary={routeSummary}
                                                tripBudgetRange={activeTrip?.stay_budget_range ?? undefined}
                                                tripGroupSetup={activeTrip?.group_setup ?? activeTrip?.trip_preference?.group_setup ?? activeTrip?.tripProfile?.group_setup ?? undefined}
                                                tripTravelPurpose={activeTrip?.tripProfile?.travel_purpose ?? undefined}
                                                tripId={tripId ?? undefined}
                                                enrichedStaysMap={enrichedStaysMap}
                                                onExploreAccommodationsLoaded={handleExploreAccommodationsLoaded}
                                                headerPortalRef={staysHeaderPortalRef}
                                                hasMapPanel={true}
                                                isActive={activeTab === 'stays'}
                                                exploreActivities={exploreActivities}
                                                exploreActivitiesLoading={isExperiencesEnrichmentLoading}
                                                shortlistSections={shortlistSectionsForDedupe}
                                                isReadOnly={isReadOnly}
                                            />
                                            </>
                                        )}

                                            {/* Flights tab */}
                                            {sectionTypeValue === 'flights' && (
                                                <FlightsTab
                                                    collectionIdentifier={identifier}
                                                    flightSections={flightSections as any}
                                                    isLoading={isFlightsCollectionLoading}
                                                    onDeleteSection={!isReadOnly && showDeleteButton && !isBulkSelectMode ? handleDeleteSection : undefined}
                                                    isDeleting={deleteSectionMutation.isPending}
                                                    isRimigoInternal={isRimigoInternal}
                                                    flightLegs={flightMetadata.flight_legs}
                                                    isReadOnly={isReadOnly}
                                                    tripId={tripId}
                                                    itineraryId={itineraryId || undefined}
                                                    itineraryDays={itineraryData?.days as unknown as Parameters<typeof FlightsTab>[0]['itineraryDays']}
                                                />
                                            )}

                                            {/* Must Have tab (merged: Tips, Useful Links, Visa) */}
                                            {sectionTypeValue === 'must_have' && identifier && (
                                                <MustHaveTabContent
                                                    isRimigoInternal={isRimigoInternal}
                                                    collectionIdentifier={identifier}
                                                    isActive={activeTab === 'must_have'}
                                                    api={travelerCollectionApi}
                                                    stickyTop={{ mobile: 0, desktop: 72 }}
                                                    bottomPaddingClassName="pb-32"
                                                />
                                            )}

                                            {/* Itinerary tab content */}
                                            {sectionTypeValue === 'itinerary' && identifier && (
                                                <div>
                                                    {isItineraryDataPending ? (
                                                        // While the `complete/` itinerary data is still loading, show the
                                                        // kanban skeleton (the compass already showed during the collection
                                                        // phase in the page shell). No forced timer.
                                                        <ViewContentCollectionLoading isRimigoInternal={isRimigoInternal} activeTab="itinerary" hideTabBar />
                                                    ) : (
                                                    <div className="animate-itinerary-fade-in">
                                                    <ItineraryTabContent
                                                        isRimigoInternal={isRimigoInternal}
                                                        collectionIdentifier={identifier}
                                                        isActive={activeTab === 'itinerary'}
                                                        onItineraryLinked={() => {
                                                            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier] })
                                                            queryClient.invalidateQueries({
                                                                queryKey: ['traveler-collection-section-types', identifier]
                                                            })
                                                            // ItineraryTabContent keys the itinerary-section query under
                                                            // 'content-collection' (not 'traveler-collection') regardless of the
                                                            // api passed, so invalidate that exact key — the previous
                                                            // 'traveler-collection' key matched nothing and was a silent no-op.
                                                            queryClient.invalidateQueries({
                                                                queryKey: ['content-collection', identifier, 'itinerary']
                                                            })
                                                            // Invalidate staleness hook's collection query so it picks up the new itinerary link
                                                            queryClient.invalidateQueries({ queryKey: ['traveler-collection-itinerary', identifier] })
                                                        }}
                                                        api={travelerCollectionApi}
                                                        readOnly={isReadOnly}
                                                        activeTrip={travelerTripsContext?.activeTrip ?? undefined}
                                                        onCreateTripboardOverride={handleTripboardUpdateAfterRecreate}
                                                        onRecreateModeChange={setIsItineraryRecreateMode}
                                                        onRegisterRecreate={registerItineraryRecreateHandler}
                                                        onRegisterShareItinerary={registerItineraryShareHandler}
                                                        showCreateTripboardBtn={false}
                                                        onMobileViewChange={(view) => setIsItineraryMapActive(view === 'map')}
                                                    />
                                                    </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Food tab content (section_type restaurant) */}
                                            {sectionTypeValue === 'budget' && identifier && (
                                                <BookingsTab
                                                    identifier={identifier}
                                                    fromCity={
                                                        travelerTripsContext?.activeTrip?.trip_preference?.flight_departure_city_preference?.[0]
                                                    }
                                                    toCity={travelerTripsContext?.activeTrip?.final_destination_cities?.[0]?.name}
                                                    readOnly={isReadOnly}
                                                    isActive={activeTab === 'budget'}
                                                />
                                            )}

                                            {sectionTypeValue === 'restaurant' && identifier ? (
                                                <FoodTabContent
                                                    activeCollectionResponse={restaurantCollectionResponseForMap}
                                                    activeTab={activeTab}
                                                    isCollectionLoading={isCollectionLoading}
                                                    isRimigoInternal={isRimigoInternal}
                                                    isActive={activeTab === 'restaurant'}
                                                    collectionIdentifier={identifier}
                                                    onFoodItemAdded={() => {
                                                        queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier, 'restaurant'] })
                                                    }}
                                                    api={travelerCollectionApi}
                                                    hoveredCardId={hoveredCardId}
                                                    setHoveredCardId={setHoveredCardId}
                                                    countryId={countryId}
                                                    canAddFood={!isReadOnly}
                                                    onDeleteSection={!isReadOnly && showDeleteButton && !isBulkSelectMode ? handleDeleteSection : undefined}
                                                    isDeleting={deleteSectionMutation.isPending}
                                                    bulkSelection={isReadOnly ? undefined : collectionBulkSelection}
                                                    onMapViewClick={
                                                        mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined
                                                    }
                                                headerPortalRef={staysHeaderPortalRef}
                                                itineraryData={itineraryData}
                                                />
                                            ) : null}

                                            {/* Vouchers tab — uploader + AI-extracted booking-doc timeline.
                                                Only mounted when the viewer is authed + non-readonly;
                                                `canEdit` is forwarded as a belt-and-suspenders guard. */}
                                            {sectionTypeValue === 'vouchers' && tripId && canAccessVouchers && (
                                                <VouchersTab
                                                    tripId={tripId}
                                                    isActive={activeTab === 'vouchers'}
                                                    canEdit={canAccessVouchers}
                                                />
                                            )}

                                            {/* Handle other section types */}
                                            {sectionTypeValue !== 'experience' &&
                                                sectionTypeValue !== 'stays' &&
                                                sectionTypeValue !== 'overview' &&
                                                sectionTypeValue !== 'must_have' &&
                                                sectionTypeValue !== 'itinerary' &&
                                                sectionTypeValue !== 'restaurant' &&
                                                sectionTypeValue !== 'budget' &&
                                                sectionTypeValue !== 'vouchers' &&
                                                sectionTypeValue !== 'flights' && (
                                                    <>
                                                        {isCollectionLoading ? (
                                                            <div className="flex flex-col gap-10">
                                                                <CustomShimmer
                                                                    height={400}
                                                                    radius={16}
                                                                    className="w-full"
                                                                />
                                                                <CustomShimmer
                                                                    height={400}
                                                                    radius={16}
                                                                    className="w-full"
                                                                />
                                                                <CustomShimmer
                                                                    height={400}
                                                                    radius={16}
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-12">
                                                                <Typography
                                                                    size="16"
                                                                    weight="medium"
                                                                    color="grey-1">
                                                                    No content found for this section type.
                                                                </Typography>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right Side: Map - Sticky.
                            On Activities Explore we still mount the map
                            so mobile's "Map" button has something to
                            show, but we hide it on desktop via
                            `lg:hidden` (the Explore subview is video-
                            first there). */}
                        <AnimatePresence initial={false}>
                        {mapMarkers.length > 0 && shouldShowMap && activeTab !== 'budget' && (
                            <motion.div
                                key="tripboard-map-col"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className={`relative flex-1 w-full lg:sticky lg:top-[72px] lg:self-start max-lg:h-[calc(100vh-72px)] ${mobileActiveTab === 'list' ? 'max-md:hidden' : 'md:hidden lg:block'} ${isActivitiesExploreDesktopHide ? 'lg:hidden!' : ''}`}>
                                {hasEverOpenedMobileMap || window.innerWidth >= 1024 ? (
                                    <GenericMap
                                        cityName={mapCityName}
                                        cityCenter={mapCityCenter}
                                        centerMode="city"
                                        markers={mapMarkers}
                                        hoveredMarkerId={hoveredCardId}
                                        onMarkerClick={handleMarkerClick}
                                        isExpanded={isMapExpanded}
                                        onExpandChange={setIsMapExpanded}
                                        expandbtnClassName="hidden"
                                        height="calc(100vh - 72px)"
                                        className="h-[70vh] md:h-[60vh] lg:h-auto"
                                        cityId={selectedCityId ?? undefined}
                                        showMarkerTypeFilters
                                        activeTab={activeTab}
                                        itineraryDayMapData={itineraryDayMapData.length > 0 ? itineraryDayMapData : undefined}
                                        onListViewClick={() => setMobileActiveTab('list')}
                                        citySwitcherConfig={
                                            mapCities.length > 1
                                                ? {
                                                      cities: mapCities,
                                                      selectedCityId,
                                                      onCityChange: (cityId) => {
                                                          const next = new URLSearchParams(searchParams)
                                                          if (activeTab === 'stays') {
                                                              next.set('stays_city', cityId)
                                                          } else if (activeTab === 'experience') {
                                                              next.set('act_city', cityId)
                                                          } else {
                                                              next.set('city_id', cityId)
                                                          }
                                                          setSearchParams(next, { replace: true })
                                                      }
                                                  }
                                                : undefined
                                        }
                                    fetchViewportStays={fetchViewportStays}
                                    viewportMarkersEnabled={viewportMarkersEnabled}
                                    // On Stays tab + For You view, zoom the
                                    // camera to the **city center** (not the
                                    // activity centroid — the query bbox
                                    // handles that). Fixed-zoom via
                                    // GenericMap, re-fires on city switch.
                                    initialBounds={isStaysForYou ? cityCenterBounds : null}
                                    disableMarkerFit={isStaysForYou}
                                    />
                                ) : null}
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    {/* Add to Collection Modal */}
                    {addToCollectionModalOpen && (
                        <AddToCollectionModal
                            isOpen={!!addToCollectionModalOpen}
                            onClose={() => setAddToCollectionModalOpen(null)}
                            experienceId={addToCollectionModalOpen}
                            experienceName={experiences.find((e: { id: string; title?: string }) => e.id === addToCollectionModalOpen)?.title || ''}
                        />
                    )}

                    {/* Sneak Peek Modal. `stackedAboveReels` raises the
                        mobile sheet to z-[10001/10002] so it stacks ABOVE
                        any reels feed that's still mounted underneath
                        (Watch & Discover / Watch Reel from the Shortlist
                        tab both leave their reels at z-9999 when "View
                        Details" is tapped). Without this, the sheet was
                        opening but hidden behind the reels. The elevated
                        z-index is harmless for cases where no reels are
                        open — it still just paints over the page. */}
                    {sneakPeekExperienceId && (
                        <SneakPeekModal
                            isOpen={!!sneakPeekExperienceId}
                            onClose={handleCloseSneakPeek}
                            experienceId={sneakPeekExperienceId}
                            stackedAboveReels
                        />
                    )}

                    {/* Shorts Modal */}
                    <ShortsModal
                        isOpen={isShortsModalOpen}
                        onClose={() => setIsShortsModalOpen(false)}
                        experiences={watchAlongShorts}
                        initialIndex={selectedShortIndex}
                        hasMore={hasMoreWatchAlong}
                        onLoadMore={loadMoreWatchAlong}
                        isLoadingMore={isLoadingMoreWatchAlong}
                    />
                </div>
            </div>
        </TripCollectionRecommendationsProvider>
    )
}

// Outer wrapper: derive creator_handle from `?utm_source=...` so existing wizard / tab events
// (`tripboard_v1:*`, etc.) auto-pick up creator attribution via the trackEvent wrapper.
// No creator_id here — we don't fetch the trip-source by handle on the tripboard route.
const TripboardPage: React.FC = () => {
    const [searchParams] = useSearchParams()
    const utmSource = searchParams.get('utm_source')
    const setCreatorAttribution = useSetCreatorAttribution()

    const creatorAttributionValue: CreatorAttribution | null = useMemo(() => {
        const handle = utmSource?.trim()
        if (!handle) return null
        return { creator_handle: handle, creator_id: null }
    }, [utmSource])

    useEffect(() => {
        setCreatorAttribution(creatorAttributionValue)
        return () => setCreatorAttribution(null)
    }, [creatorAttributionValue, setCreatorAttribution])

    return <TripboardPageInner />
}

export default TripboardPage
