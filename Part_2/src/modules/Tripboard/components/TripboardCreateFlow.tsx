import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
// import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
// import { fetchItineraryPrompts } from '@/api/itineraryApi'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Check, Copy, Link, X, ArrowLeft, Sparkles } from 'lucide-react'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import { vacationPurposeOptions } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { createBasicTrip } from '@/modules/Onboarding/api/onboardingAPI'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { toast } from 'sonner'
import { WizardState, INITIAL_WIZARD_STATE, type CityRouteItem } from '@/modules/Itinerary/components/CreateItineraryWizard/types'
import type { Airport } from '@/api/flights/airportSearchAPI'
import type { ActivitiesCityCardData } from '@/modules/Acitvities/adapters/activitiesCitiesAdapter'
import { useCountries } from '@/hooks/useCountries'
import {
    getPrioritizedCountriesToSearchDestinationCardData,
    liveCountryToLocationResponse
} from '@/modules/Onboarding/adapters/getPrioritizedCountriesAdapter'
import { TRIPBOARD_POST_CREATE_URL, POST_CREATE_EXPAND_ASSISTANT_KEY } from '../constants/tripboardConfig'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useIsMobile } from '@/hooks/use-mobile'
import { GROUP_TYPE_OPTIONS } from '@/components/common/trip-preferences-steps/constants'
import { cloneTripboard } from '@/api/tripboardApi'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import { WizardShell } from './createFlow/WizardShell'
import { WhereStep } from './createFlow/WhereStep'
import { JourneyStrip } from './createFlow/JourneyStrip'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { YesFlowFrame } from './createFlow/YesFlowFrame'
import { WhoFrame, type TravelerKey } from './createFlow/WhoFrame'
import { HowFrame, type PaceId, type DietId } from './createFlow/HowFrame'
import type { SelectedCity, SelectedCountry, WhereSubTab, WizardStep } from './createFlow/types'
import type { DepartureCityConfig } from './createFlow/popularDepartureCities'
import { WIZARD_RESUME_KEY, clearShellState } from './createFlow/sessionState'
import { markAwaitingPostLoginReload } from '../utils/createFlowHandoff'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/** Forward-geocode a city name via Mapbox so the route's cities carry
 *  coordinates for the legacy itinerary payload (Step 1 route distance /
 *  transport_brief). Best-effort: returns null on any failure. */
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
    if (!MAPBOX_TOKEN || !cityName) return null
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`
        )
        const data = await res.json()
        const feature = data?.features?.[0]
        if (feature?.center) return { lat: feature.center[1], lng: feature.center[0] }
    } catch {
        // Geocoding failed — silently ignore.
    }
    return null
}

/** Ordered tuple of the new wizard step ids (Who → When → Where → How). */
const STEP_SEQUENCE: readonly WizardStep[] = ['who', 'when', 'where', 'how'] as const

/** Index of a step in STEP_SEQUENCE — used to drive scroll anchoring and the legacy onStepChange contract. */
function stepIndex(step: WizardStep): number {
    return STEP_SEQUENCE.indexOf(step)
}

interface TripboardCreateFlowProps {
    /** If a trip already exists but no tripboard, pass the trip ID to show a simplified CTA */
    existingTripId?: string | null
    /** Pre-populate the destination (used when trip already exists so user doesn't re-pick) */
    defaultDestination?: SearchDestinationCardData | null
    /** Traveler trips context for setting active trip after creation */
    travelerTripsContext?: {
        updateActiveTrip?: (tripId: string, options?: { force?: boolean; replaceOnly?: boolean }) => Promise<void>
    }
    /** When provided, called instead of createTripAndNavigate (unified flow).
     *  The new wizard mirrors all of its collected primitives (cities + nights
     *  → route, nodal city → departure/return airport, group setup, dates,
     *  preferences) into the legacy `WizardState`, so the orchestration's
     *  existing `buildItineraryPayload(wizardState)` pipeline is used verbatim
     *  — the new design rides entirely on the current (old) create payload. */
    onSubmit?: (data: {
        destinations: SearchDestinationCardData[]
        groupType: string
        purpose: string
        wizardState: WizardState
        tripSource?: string
        utmMedium?: string
        utmCampaign?: string
    }) => Promise<void>
    /** Called when user selects destinations (for parent to react, e.g. unlock tabs) */
    onDestinationSelected?: (destinations: SearchDestinationCardData[]) => void
    /** Cross-button handler. Parent owns this because closing the wizard
     *  means making the parent's render-condition for the wizard false:
     *    - `?create=true` overlay → strip the query param.
     *    - `/tripboard/new` / embedded → navigate away from the URL.
     *  Callers MUST pass a stable function (useCallback) — the wizard does
     *  NOT add this to any useEffect dep array, but stable refs keep prop
     *  comparisons predictable and avoid prop-ref churn cascading into
     *  effects elsewhere that depend on the wizard's render. */
    onClose?: () => void
    /** When true, hides the gradient background and full-height wrapper (for embedding inside tabs) */
    embedded?: boolean
    /**
     * Legacy prop — kept for backward compatibility but no longer affects step ordering.
     * The wizard now always uses the Who → When → Where → How ordering.
     */
    stepOrder?: 'default' | 'new'
    /**
     * Called when the wizard step changes. We pass the numeric index of the new step
     * (0..3 for who/when/where/how) so existing consumers that compare against numeric
     * step ids continue to behave the same way.
     */
    onStepChange?: (step: number) => void
}

/** Derive group_type for the trip profile based on the group setup counters */
function deriveGroupTypeFromSetup(setup: { adults: number; children: number; infants: number }): string {
    const { adults, children, infants } = setup
    const hasKids = children > 0 || infants > 0

    if (adults <= 1 && !hasKids) return 'solo_traveler'
    if (adults === 2 && !hasKids) return 'couple'
    if (adults <= 2 && hasKids) return 'couple_with_children'
    if (hasKids) return 'immediate_family'
    if (adults >= 6) return 'large_group'
    return 'friends_group'
}

const TripboardCreateFlow: React.FC<TripboardCreateFlowProps> = ({
    defaultDestination,
    travelerTripsContext,
    onSubmit,
    onDestinationSelected,
    onClose,
    embedded = false,
    onStepChange
}) => {
    const { trackButtonClickCustom, refreshUserInfo } = usePostHog()
    const { isRimigoInternal } = useUserInfo()
    const travelerTrips = useOptionalTravelerTrips()
    const [searchParams] = useSearchParams()
    const utmSource = searchParams.get('utm_source') || ''
    const utmMedium = searchParams.get('utm_medium') || ''
    const utmCampaign = searchParams.get('utm_campaign') || ''

    // ── Clone mode (internal users only) ────────────────────────────────
    const [mode, setMode] = useState<'create' | 'clone'>('create')
    const [cloneUrl, setCloneUrl] = useState('')
    const [cloneGroupType, setCloneGroupType] = useState('')
    const [clonePurpose, setClonePurpose] = useState('')
    const [cloneStartDate, setCloneStartDate] = useState('')
    const [cloneEndDate, setCloneEndDate] = useState('')
    const [isCloning, setIsCloning] = useState(false)
    const [cloneTarget, setCloneTarget] = useState<'active_trip' | 'new_trip'>('active_trip')

    /** Extract tripboard identifier and collection type from a Rimigo URL */
    const extractCloneInfo = (url: string): { identifier: string; collectionType: string } | null => {
        try {
            const parsed = new URL(url)
            const segments = parsed.pathname.split('/').filter(Boolean)
            // /rimigo-collection/hong-kong/hong-kong-trip-tripboard
            if (segments.length >= 2 && segments[0] === 'rimigo-collection') {
                return { identifier: segments[segments.length - 1], collectionType: 'content_collection' }
            }
            // /traveler_collection/some-identifier
            if (segments.length >= 2 && segments[0] === 'traveler_collection') {
                return { identifier: segments[segments.length - 1], collectionType: 'traveler_collection' }
            }
            // /tripboard/<trip_id> — backend resolves trip_id to the active traveler_collection.
            if (segments.length >= 2 && segments[0] === 'tripboard') {
                const last = segments[segments.length - 1]
                if (last === 'new' || last === 'create') return null
                return { identifier: last, collectionType: 'traveler_collection' }
            }
            return null
        } catch {
            return null
        }
    }

    const handleCloneSubmit = async () => {
        const cloneInfo = extractCloneInfo(cloneUrl)
        if (!cloneInfo) {
            toast.error('Invalid URL. Paste a rimigo-collection or traveler_collection link.')
            return
        }

        const useActiveTrip = cloneTarget === 'active_trip' && !!travelerTrips?.activeTripId

        if (!cloneStartDate) {
            toast.error('Please select a start date.')
            return
        }

        if (!useActiveTrip) {
            if (!cloneGroupType) {
                toast.error('Please select a group type.')
                return
            }
            if (!clonePurpose) {
                toast.error('Please select the occasion.')
                return
            }
            if (!cloneEndDate) {
                toast.error('Please select an end date.')
                return
            }
            if (cloneEndDate < cloneStartDate) {
                toast.error('End date must be after the start date.')
                return
            }
        }

        setIsCloning(true)
        try {
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }

            await cloneTripboard(cloneInfo.identifier, {
                traveler_id: userInfo.traveler_id,
                collection_type: cloneInfo.collectionType,
                start_date: cloneStartDate,
                ...(useActiveTrip
                    ? { trip_id: travelerTrips!.activeTripId! }
                    : {
                          end_date: cloneEndDate,
                          travel_purpose: clonePurpose,
                          group_type: cloneGroupType
                      })
            })

            toast.success('Tripboard cloned successfully!')
            try {
                sessionStorage.setItem(POST_CREATE_EXPAND_ASSISTANT_KEY, '1')
            } catch {
                /* non-fatal */
            }
            window.location.href = TRIPBOARD_POST_CREATE_URL
        } catch (error) {
            console.error('Clone failed:', error)
            toast.error('Failed to clone tripboard. Please check the URL and try again.')
        } finally {
            setIsCloning(false)
        }
    }

    // Logged-in viewers see the SAME global sidebar as the rest of the site
    // (desktop rail / mobile floating hamburger) for consistency — we no longer
    // render a wizard-specific hamburger. Logged-out viewers get a clean flow
    // with a Login CTA instead. Synchronous read so nothing flashes on first
    // paint.
    const isLoggedIn = TokenStorage.isLoggedInSync()

    // The Where step's route splits onto its own screen on mobile (select-route
    // sub-tab) — picked via the footer Next from the cities screen. On desktop
    // the route stays inline in the Select-Cities frame's right column, so the
    // cities screen advances straight to How.
    const isMobile = useIsMobile()

    // ── Sidebar visibility for this immersive flow ───────────────────────
    // Logged in → show the global hamburger + sidebar (same as everywhere).
    // Logged out → hide both (no sidebar exists for guests anyway). Restored
    // on unmount so other pages keep their rail.
    const { setHideHamburger, setHideSidebar } = useSidebarContext()
    useEffect(() => {
        setHideHamburger(!isLoggedIn)
        setHideSidebar(!isLoggedIn)
        return () => {
            setHideHamburger(false)
            setHideSidebar(false)
        }
    }, [setHideHamburger, setHideSidebar, isLoggedIn])

    // ── New shell-level state (Who → When → Where → How) ──────────────────
    /** Footer-height tracking. The wizard's footer (chips + Back/Next +
     *  optional confirmation banner) is `position: fixed`, so the scrollable
     *  content needs bottom padding equal to its height. The chip row wraps
     *  with the number of selected countries, so a static padding (e.g. pb-32)
     *  can be too small. Measured via ResizeObserver on the footer ref. */
    const footerRef = useRef<HTMLDivElement>(null)
    const [footerHeight, setFooterHeight] = useState(140)
    const [currentStep, setCurrentStep] = useState<WizardStep>('who')
    const [currentSubTab, setCurrentSubTab] = useState<WhereSubTab>('destination')
    const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
    const [selectedCountries, setSelectedCountries] = useState<SelectedCountry[]>([])
    /** Nodal city — the user's home base airport for this trip. Used as
     *  both the departure and return airport (the new wizard collapses
     *  the two into a single value). Picked from the inline departure-city
     *  dropdown in the journey strip on the Select-Cities frame. */
    const [nodalCity, setNodalCity] = useState<{
        city_name: string
        country_name: string
        iata: string
    } | null>(null)
    /** Cities picked on the Select-Cities frame ("Yes, let me choose" path).
     *  Each entry carries a per-city `nights` count, defaulted to 1 when the
     *  city is added so the route preview always has a value to render.
     *  `geoLocation` is populated asynchronously after geocoding resolves —
     *  mirrors the legacy `CityRouteItem.geoLocation` field that downstream
     *  pipelines (Step 1 route distance / transport_brief) consume. */
    const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([])
    /** Footer country-chip carousel: collapsed shows the first 3 + a "+N" pill;
     *  expanded swipes through all of them with a "View less" at the end. */
    const [chipsExpanded, setChipsExpanded] = useState(false)

    // ── When step state ──────────────────────────────────────────────────
    // The When step is now a single frame: an exact check-in / check-out
    // date picker (YesFlowFrame). The earlier "Do you know your travel
    // dates?" question and its flexible duration/month branch have been
    // removed — the user always picks concrete dates. Selected dates live
    // on `wizardState.startDate` / `wizardState.endDate`.

    // ── Who step state ───────────────────────────────────────────────────
    /** Elder traveler count. Tracked separately from `wizardState.groupSetup`
     *  because the legacy `GuestsData` schema (which the trip creation payload
     *  uses) only has adults / children / infants. We fold elders into the
     *  adults count when submitting so the backend sees an unchanged shape. */
    const [eldersCount, setEldersCount] = useState(0)

    // ── How step state ───────────────────────────────────────────────────
    /** Selected stay type (server value, e.g. 'hotel'). Picking one reveals
     *  the budget slider. */
    const [stayType, setStayType] = useState<string | null>(null)
    /** Trip pace — drives the Relaxed / Balanced / Fully-packed tiles. */
    const [pace, setPace] = useState<PaceId | null>(null)
    /** Dietary preferences — multi-select (Non-veg / Veg / Egg). */
    const [diet, setDiet] = useState<Set<DietId>>(new Set())

    // Ref on the step-content (lives INSIDE the active scroll container — the
    // wizard's own `main` when logged out, the overlay inner when logged in), so
    // we can reset its scroll to the top on every step / sub-step change.
    const stepContentRef = useRef<HTMLDivElement>(null)
    const [direction, setDirection] = useState<'forward' | 'back'>('forward')

    // ── Processing state (orchestration-style submission) ────────────────
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingMessage, setProcessingMessage] = useState('')
    /** Set when Next / Plan-my-trip is tapped with a required section unfilled —
     *  drives the scroll-to + inline red helper inside the step frames. `nonce`
     *  re-triggers on repeat taps. One monotonic counter feeds all of them. */
    const [howInvalid, setHowInvalid] = useState<{ section: 'stay' | 'pace' | 'diet'; nonce: number } | null>(null)
    const [whoInvalid, setWhoInvalid] = useState<{ section: 'travelers' | 'occasion'; nonce: number } | null>(null)
    const [whenInvalid, setWhenInvalid] = useState<{ nonce: number } | null>(null)
    const [destInvalid, setDestInvalid] = useState<{ nonce: number } | null>(null)
    const [citiesInvalid, setCitiesInvalid] = useState<{ section: 'cities' | 'departure'; nonce: number } | null>(null)
    const validationNonceRef = useRef(0)
    const nextNonce = () => {
        validationNonceRef.current += 1
        return validationNonceRef.current
    }

    // Notify parent of step changes (numeric index, for backward compat with consumers).
    useEffect(() => {
        onStepChange?.(stepIndex(currentStep))
    }, [currentStep, onStepChange])

    // After changing step OR sub-step (Where: destination/cities/route), reset the
    // active scroll container to the top so the new screen starts fresh — instead
    // of inheriting the previous screen's scroll position. The scroller differs by
    // context (the wizard's own `main` when logged out, the overlay inner when
    // logged in), so we walk up from the step content to whichever ancestor
    // actually scrolls. Falls back to the window.
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            let node: HTMLElement | null = stepContentRef.current?.parentElement ?? null
            while (node) {
                const oy = getComputedStyle(node).overflowY
                if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
                    node.scrollTo({ top: 0, behavior: 'auto' })
                    return
                }
                node = node.parentElement
            }
            window.scrollTo({ top: 0, behavior: 'auto' })
        })
        return () => cancelAnimationFrame(id)
    }, [currentStep, currentSubTab])


    // ── Destination state (the payload-bound source of truth) ────────────
    // selectedCountries (new shell) is mirrored into selectedDestinations
    // (SearchDestinationCardData[]), which is what the trip-creation pipeline
    // expects today. Keeping selectedDestinations as the canonical sink means
    // createBasicTrip and onSubmit see byte-identical input for the same
    // user choices.
    const [selectedDestinations, setSelectedDestinations] = useState<SearchDestinationCardData[]>([])

    // ── Wizard state (dates / cities / preferences / group setup) ────────
    // Default adults=0 so the Who step always asks the user explicitly.
    const [wizardState, setWizardState] = useState<WizardState>(() => ({
        ...INITIAL_WIZARD_STATE,
        groupSetup: { ...INITIAL_WIZARD_STATE.groupSetup, adults: 0 }
    }))

    // ── Trip setup (occasion / travel purpose) ───────────────────────────
    const [selectedPurpose, setSelectedPurpose] = useState<string>('')

    // Geocode any picked city that doesn't yet have coordinates, so the legacy
    // itinerary payload (`wizardState.cities[].geoLocation`) carries lat/lng for
    // the Step-1 route distance / transport_brief pipeline — same parity the old
    // Cities & Route step had. Best-effort; in-flight ids are tracked so we never
    // double-fetch. Once every city has geo, `missing` is empty and this no-ops.
    const geocodingInFlightRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        const missing = selectedCities.filter((c) => !c.geoLocation && !geocodingInFlightRef.current.has(c.id))
        if (missing.length === 0) return
        let cancelled = false
        ;(async () => {
            for (const city of missing) {
                geocodingInFlightRef.current.add(city.id)
                const geo = await geocodeCity(city.name)
                if (cancelled) return
                if (geo) {
                    setSelectedCities((prev) => prev.map((x) => (x.id === city.id ? { ...x, geoLocation: geo } : x)))
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [selectedCities])

    // Measure the fixed footer so the scrollable content reserves exactly its
    // height as bottom padding (otherwise the last section hides behind it on
    // mobile). Re-runs whenever the footer remounts / changes shape — the
    // footer is conditionally rendered (hidden during route planning, taller on
    // the route frame), so a one-shot observer would go stale and under-reserve.
    // Uses the full border-box height (getBoundingClientRect), not contentRect.
    useEffect(() => {
        const el = footerRef.current
        if (!el) return
        const measure = () => setFooterHeight(el.getBoundingClientRect().height)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [currentStep, currentSubTab])

    // ── Login modal ──────────────────────────────────────────────────────
    const { openLoginModal } = useLoginModal()

    // ── Pre-selected destination IDs from URL params + defaultDestination ──
    const initialSelectedIds = useMemo(() => {
        const ids: string[] = []
        const params = new URLSearchParams(window.location.search)
        for (const [key, value] of params.entries()) {
            if (/^country_id_\d+$/.test(key) && value) {
                ids.push(value)
            }
        }
        // Also include defaultDestination if provided and not already in list
        if (defaultDestination && !ids.includes(defaultDestination.id)) {
            ids.unshift(defaultDestination.id)
        }
        return ids.length > 0 ? ids : undefined
    }, [defaultDestination])

    // ── Country data (used both for the WhereStep and for hydrating selectedDestinations) ──
    // Source: /curation/location-personalization/live-countries/. The wizard
    // surfaces only live (bookable) countries, so there's no comingSoon split
    // — `liveCountries` is the full list adapted to LocationResponse shape so
    // downstream code stays uniform.
    const { allCountries: liveCountriesRaw } = useCountries({ shouldUsePrioritized: false })
    const liveCountries = useMemo<LocationResponse[]>(() => liveCountriesRaw.map(liveCountryToLocationResponse), [liveCountriesRaw])

    // ── Always start fresh on mount ──────────────────────────────────────
    // A page refresh must restart the wizard from step 1 (Who). Previously the
    // shell state (current step + selected countries) was persisted to
    // sessionStorage and rehydrated, which dropped the user onto a LATER step
    // (e.g. the route page) with only the countries restored and every other
    // step's data missing — an inconsistent, half-filled flow. We no longer
    // persist or restore that state; we just wipe any stale copy on mount.
    // (The pre-login resume flow uses its own WIZARD_RESUME_KEY and is
    // unaffected.)
    useEffect(() => {
        clearShellState()
    }, [])

    // ── Sync selectedCountries → selectedDestinations (payload sink) ─────
    // The list of countries available for lookup, keyed by country_id.
    const allCountryLookup = useMemo<Map<string, LocationResponse>>(() => {
        const map = new Map<string, LocationResponse>()
        for (const c of liveCountries) map.set(c.country_id, c)
        return map
    }, [liveCountries])

    useEffect(() => {
        // Map SelectedCountry[] back to SearchDestinationCardData[] for the trip
        // creation payload path. Preserves id, title, imageUrl (icon_url), isLive,
        // region — same shape `createBasicTrip` has always received from the old
        // destination picker. bannerImageUrl is the new self-hosted hero
        // (media.rimigo.com); icon_url stays as the small avatar.
        const next: SearchDestinationCardData[] = selectedCountries.map((sc) => {
            const loc = allCountryLookup.get(sc.id)
            if (loc) {
                return {
                    id: loc.country_id,
                    title: loc.country_name,
                    imageUrl: loc.icon_url,
                    bannerImageUrl: loc.banner_img_url,
                    isLive: loc.is_live,
                    region: loc.region
                }
            }
            // Fallback: use whatever data is in selectedCountries. This only kicks in
            // before country data has loaded (e.g. after sessionStorage hydration
            // but before useCountries resolves).
            return {
                id: sc.id,
                title: sc.name,
                imageUrl: sc.flag,
                isLive: undefined,
                region: undefined
            }
        })
        setSelectedDestinations(next)
    }, [selectedCountries, allCountryLookup])

    // Whenever the payload destinations change, notify the parent. Mirrors the
    // pre-rewrite contract: parent receives the canonical SearchDestinationCardData[].
    const lastNotifiedDestinationsRef = useRef<string>('')
    useEffect(() => {
        const sig = selectedDestinations.map((d) => d.id).join(',')
        if (sig === lastNotifiedDestinationsRef.current) return
        lastNotifiedDestinationsRef.current = sig
        onDestinationSelected?.(selectedDestinations)
    }, [selectedDestinations, onDestinationSelected])

    // ── Resolve pre-selected destinations (URL params / defaultDestination) ──
    const hasAutoHydratedRef = useRef(false)
    useEffect(() => {
        if (!initialSelectedIds?.length || hasAutoHydratedRef.current) return
        const allDest = getPrioritizedCountriesToSearchDestinationCardData(liveCountries)
        if (allDest.length === 0) return
        const matched = allDest.filter((d) => initialSelectedIds.includes(d.id))
        if (matched.length === 0) return
        hasAutoHydratedRef.current = true
        // Only hydrate selectedCountries if it isn't already populated (e.g. from sessionStorage).
        setSelectedCountries((prev) => {
            if (prev.length > 0) return prev
            return matched.map((d) => {
                const loc = allCountryLookup.get(d.id)
                return {
                    id: d.id,
                    name: d.title,
                    flag: loc?.flag_icon_url || loc?.icon_url || d.imageUrl,
                    source: 'search' as const
                }
            })
        })
    }, [initialSelectedIds, liveCountries, allCountryLookup])

    // ── Wizard state management ──────────────────────────────────────────
    const handleWizardChange = useCallback((partial: Partial<WizardState>) => {
        setWizardState((prev) => ({ ...prev, ...partial }))
    }, [])

    // ── Toggle a country selection (the Where step's onToggle handler) ───
    const handleToggleCountry = useCallback(
        (country: LocationResponse, source: 'popular' | 'regional' | 'search') => {
            setSelectedCountries((prev) => {
                const exists = prev.some((c) => c.id === country.country_id)
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: exists ? 'country_deselect' : 'country_select',
                    buttonAction: 'click',
                    extra: { country_id: country.country_id, country_name: country.country_name, source }
                })
                if (exists) return prev.filter((c) => c.id !== country.country_id)
                return [
                    ...prev,
                    {
                        id: country.country_id,
                        name: country.country_name,
                        flag: country.flag_icon_url || country.icon_url,
                        source
                    }
                ]
            })
        },
        [trackButtonClickCustom]
    )

    const selectedIds = useMemo(() => new Set(selectedCountries.map((c) => c.id)), [selectedCountries])

    // ── Step navigation helpers ──────────────────────────────────────────
    const advanceTo = useCallback(
        (next: WizardStep) => {
            setDirection('forward')
            setCurrentStep((prev) => {
                if (prev === next) return prev
                setCompletedSteps((set) => {
                    if (set.has(prev)) return set
                    const updated = new Set(set)
                    updated.add(prev)
                    return updated
                })
                // buttonName uses the step INDEX (step0_next, step1_next, …) — the
                // PostHog lead-gen funnel matches `tripboard_v1:step_advance:step{N}_next`.
                // The named step rides along in `extra` for readability.
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: `step${stepIndex(prev)}_next`,
                    buttonAction: 'step_advance',
                    extra: { from_step: prev, to_step: next }
                })
                return next
            })
        },
        [trackButtonClickCustom]
    )

    const goBackTo = useCallback(
        (prev: WizardStep) => {
            setDirection('back')
            setCurrentStep((current) => {
                if (current === prev) return current
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: `step${stepIndex(current)}_back`,
                    buttonAction: 'step_back',
                    extra: { from_step: current, to_step: prev }
                })
                return prev
            })
        },
        [trackButtonClickCustom]
    )

    /** Total travelers across all four UI categories. Elders are tracked as a
     *  separate UI count but fold into adults for the backend group_setup. */
    const totalTravelers = eldersCount + wizardState.groupSetup.adults + wizardState.groupSetup.children + wizardState.groupSetup.infants

    const handleNext = useCallback(() => {
        if (currentStep === 'who') {
            // Travelers ≥ 1 is required. The occasion is OPTIONAL — when none is
            // picked the submission defaults to `leisure_relaxation` (see
            // `effectivePurpose` below), so the user can advance without one.
            if (totalTravelers < 1) {
                setWhoInvalid({ section: 'travelers', nonce: nextNonce() })
                return
            }
            advanceTo('when')
            return
        }
        if (currentStep === 'when') {
            if (!wizardState.startDate || !wizardState.endDate) {
                setWhenInvalid({ nonce: nextNonce() })
                return
            }
            advanceTo('where')
            return
        }
        if (currentStep === 'where') {
            // Where has two frames: the country picker (destination) and the
            // Select-Cities frame (which now also hosts the live route + nights).
            // Departure city is picked inline from the journey strip there.
            if (currentSubTab === 'destination') {
                if (selectedCountries.length === 0) {
                    setDestInvalid({ nonce: nextNonce() })
                    return
                }
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'destination_next',
                    buttonAction: 'destination_submit',
                    extra: { destinations: selectedCountries.map((c) => c.name) }
                })
                setDirection('forward')
                setCurrentSubTab('select-cities')
                return
            }
            if (currentSubTab === 'select-cities') {
                // At least one city is required to continue. (Desktop also needs
                // a departure city here, since its route is edited inline on this
                // same frame; mobile defers that to the route screen below.)
                if (selectedCities.length === 0) {
                    setCitiesInvalid({ section: 'cities', nonce: nextNonce() })
                    return
                }
                // Mobile: the route + departure live on their own screen — go
                // there next instead of straight to How.
                if (isMobile) {
                    trackButtonClickCustom({
                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                        buttonName: 'cities_next',
                        buttonAction: 'cities_submit',
                        extra: { city_count: selectedCities.length }
                    })
                    setDirection('forward')
                    setCurrentSubTab('select-route')
                    return
                }
                // Desktop: route is inline — a departure city is required before
                // advancing to How.
                if (!nodalCity) {
                    setCitiesInvalid({ section: 'departure', nonce: nextNonce() })
                    return
                }
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'cities_next',
                    buttonAction: 'cities_submit',
                    extra: { city_count: selectedCities.length }
                })
                advanceTo('how')
                return
            }
            // currentSubTab === 'select-route' (mobile only) — a departure city
            // is required to complete the route before advancing to How.
            if (!nodalCity) {
                setCitiesInvalid({ section: 'departure', nonce: nextNonce() })
                return
            }
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'route_next',
                buttonAction: 'route_submit',
                extra: { city_count: selectedCities.length }
            })
            advanceTo('how')
            return
        }
        // 'how' has its own submit button wired below — never reached.
    }, [
        currentStep,
        currentSubTab,
        isMobile,
        selectedCountries,
        selectedCities,
        nodalCity,
        totalTravelers,
        selectedPurpose,
        wizardState.startDate,
        wizardState.endDate,
        advanceTo,
        trackButtonClickCustom
    ])

    const handleBack = useCallback(() => {
        // Mobile route screen → back to the cities screen.
        if (currentStep === 'where' && currentSubTab === 'select-route') {
            setDirection('back')
            setCurrentSubTab('select-cities')
            return
        }
        if (currentStep === 'where' && currentSubTab === 'select-cities') {
            setDirection('back')
            setCurrentSubTab('destination')
            return
        }
        // 'where' + 'destination' is the first Where frame — step back to When.
        if (currentStep === 'where') return goBackTo('when')
        if (currentStep === 'when') return goBackTo('who')
        if (currentStep === 'how') return goBackTo('where')
        // 'who' is the very first step — no back nav.
    }, [currentStep, currentSubTab, goBackTo])

    /** User picked a departure city from the inline dropdown in the journey
     *  strip (Select-Cities frame). Persists it as the nodal city. */
    const handleDepartureCitySelect = useCallback(
        (c: DepartureCityConfig) => {
            setNodalCity(c)
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'departure_city_select',
                buttonAction: 'click',
                extra: { iata: c.iata, city_name: c.city_name }
            })
        },
        [trackButtonClickCustom]
    )

    /** Toggle a city in the Select-Cities frame selection. New cities start
     *  with `nights: null` — the route preview's "+" button commits the
     *  first count (1) and increments from there. */
    const handleToggleCity = useCallback(
        (cityId: string, cityName: string) => {
            setSelectedCities((prev) => {
                const exists = prev.some((c) => c.id === cityId)
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: exists ? 'city_deselect' : 'city_select',
                    buttonAction: 'click',
                    extra: { city_id: cityId, city_name: cityName }
                })
                if (exists) return prev.filter((c) => c.id !== cityId)
                return [...prev, { id: cityId, name: cityName, nights: null }]
            })
        },
        [trackButtonClickCustom]
    )

    const selectedCityIds = useMemo(() => new Set(selectedCities.map((c) => c.id)), [selectedCities])

    // ── Route handlers (operate directly on the picked cities) ───────────
    // The route lives on the Select-Cities frame now — order + nights are edits
    // to `selectedCities`, which is mirrored into the legacy `wizardState.cities`
    // (CityRouteItem[]) on submit. `null` nights = "auto" (AI decides), matching
    // the old Cities & Route step's default.
    /** Bump a city's nights by a delta. Effective floor of 0 collapses back to
     *  `null` (auto) so the legacy payload sees `nights: 'auto'`. */
    const handleCityAdjustNights = useCallback(
        (id: string, delta: number) => {
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: delta > 0 ? 'route_nights_increment' : 'route_nights_decrement',
                buttonAction: 'click',
                extra: { city_id: id }
            })
            setSelectedCities((prev) =>
                prev.map((c) => {
                    if (c.id !== id) return c
                    const next = (c.nights ?? 0) + delta
                    return { ...c, nights: next <= 0 ? null : next }
                })
            )
        },
        [trackButtonClickCustom]
    )

    /** Reorder the route (drag handle on the Select-Cities route panel). */
    const handleCityReorder = useCallback(
        (fromIndex: number, toIndex: number) => {
            setSelectedCities((prev) => {
                if (fromIndex < 0 || fromIndex >= prev.length) return prev
                if (toIndex < 0 || toIndex >= prev.length) return prev
                if (fromIndex === toIndex) return prev
                const next = [...prev]
                const [moved] = next.splice(fromIndex, 1)
                next.splice(toIndex, 0, moved)
                return next
            })
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'route_reorder',
                buttonAction: 'drag',
                extra: { from_index: fromIndex, to_index: toIndex }
            })
        },
        [trackButtonClickCustom]
    )

    /** Remove a city from the route (trash button) — drops it from the selection. */
    const handleRemoveCity = useCallback(
        (id: string) => {
            setSelectedCities((prev) => {
                const removed = prev.find((c) => c.id === id)
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'route_remove_city',
                    buttonAction: 'click',
                    extra: { city_id: id, city_name: removed?.name }
                })
                return prev.filter((c) => c.id !== id)
            })
        },
        [trackButtonClickCustom]
    )

    /** Toggle the legacy AI route-order optimization flag. */
    const handleToggleAiOptimize = useCallback(() => {
        setWizardState((prev) => {
            const next = !prev.aiRouteOptimize
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'ai_route_optimize_toggle',
                buttonAction: 'click',
                extra: { enabled: next }
            })
            return { ...prev, aiRouteOptimize: next }
        })
    }, [trackButtonClickCustom])

    // ── Animation variants ─────────────────────────────────────────────
    const slideVariants = {
        enter: (dir: 'forward' | 'back') => ({
            x: dir === 'forward' ? 80 : -80,
            opacity: 0
        }),
        center: { x: 0, opacity: 1 },
        exit: (dir: 'forward' | 'back') => ({
            x: dir === 'forward' ? -80 : 80,
            opacity: 0
        })
    }

    // ── Trip creation pipeline ─────────────────────────────────────────
    const createTripAndNavigate = async (
        destinations: SearchDestinationCardData[],
        groupType: string,
        purpose: string,
        savedWizardState?: WizardState
    ) => {
        setIsProcessing(true)

        try {
            setProcessingMessage('Creating your trip...')
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }

            const destIds = destinations.map((d) => d.id)
            // `ws` is the mirrored snapshot built in `handleSubmit` — it
            // already has elders folded into adults, nodalCity → departure /
            // returnCity, selectedCities → cities, etc. Use it verbatim.
            const ws = savedWizardState || wizardState
            const tripPayload: Parameters<typeof createBasicTrip>[1] = {
                interested_destinations: destIds,
                final_destination_countries: destIds,
                destination_finalized: true,
                group_type: groupType,
                travel_purpose: purpose,
                group_setup: ws.groupSetup
            }

            if (ws.startDate && ws.endDate) {
                const start = ws.startDate instanceof Date ? ws.startDate : new Date(ws.startDate)
                const end = ws.endDate instanceof Date ? ws.endDate : new Date(ws.endDate)
                tripPayload.preferred_travel_time = {
                    // Yes-flow → dates are exact (is_fixed: true).
                    // No-flow → dates are derived from a month + duration
                    //   bucket so they're indicative only (is_fixed: false).
                    is_fixed: ws.dateMode === 'exact',
                    startDate: start,
                    endDate: end,
                    year: start.getFullYear(),
                    months: [start.toLocaleString('default', { month: 'long' })]
                }
            }

            const tripResponse = await createBasicTrip(userInfo.traveler_id, tripPayload)

            const newTripId = tripResponse.data.trip_id

            setProcessingMessage('Preparing your tripboard...')
            if (travelerTripsContext?.updateActiveTrip) {
                await travelerTripsContext.updateActiveTrip(newTripId, {
                    force: true,
                    replaceOnly: true
                })
            }

            try {
                sessionStorage.setItem(POST_CREATE_EXPAND_ASSISTANT_KEY, '1')
            } catch {
                /* non-fatal */
            }
            window.location.href = TRIPBOARD_POST_CREATE_URL
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Trip creation failed:', error)
            toast.error('Something went wrong. Please try again.')
            setIsProcessing(false)
        }
    }

    const handleSubmit = async () => {
        if (selectedDestinations.length === 0) return
        // Validate the How sections; scroll to + flash the first unfilled one.
        const missing: 'stay' | 'pace' | 'diet' | null = !stayType ? 'stay' : !pace ? 'pace' : diet.size === 0 ? 'diet' : null
        if (missing) {
            setHowInvalid({ section: missing, nonce: nextNonce() })
            return
        }
        const effectivePurpose = selectedPurpose || 'leisure_relaxation'
        if (!selectedPurpose) setSelectedPurpose(effectivePurpose)

        // ── Mirror every new-wizard primitive into the legacy `WizardState`
        //    shape. The ENTIRE create pipeline (trip creation + itinerary
        //    generation via the old `buildItineraryPayload`) consumes this
        //    mirror, so the redesigned flow rides on the current/old payload
        //    with no new-wizard-specific contract.
        //
        // The When step always yields exact dates — the user picks a concrete
        // check-in / check-out range on the calendar. `selectedCities` (order +
        // nights) becomes `wizardState.cities` (CityRouteItem[]); `null` nights
        // map onto the legacy `'auto'` sentinel.
        const mirroredCities: CityRouteItem[] = selectedCities.map((sc) => ({
            city: {
                cityId: sc.id,
                cityName: sc.name
            } as ActivitiesCityCardData,
            // Legacy mirror accepts `'auto'` for "user hasn't committed yet"
            // — map `null` (new nights default) onto that sentinel.
            nights: sc.nights ?? 'auto',
            geoLocation: sc.geoLocation
        }))

        const nodalAirport: Airport | null = nodalCity
            ? {
                  name: nodalCity.city_name,
                  code: nodalCity.iata,
                  city_code: nodalCity.iata,
                  city_name: nodalCity.city_name,
                  country_name: nodalCity.country_name
              }
            : null

        // Fold elders into adults for the trip API (legacy `GuestsData` has
        // no elders slot).
        const mirroredGroupSetup = {
            ...wizardState.groupSetup,
            adults: wizardState.groupSetup.adults + eldersCount
        }

        const submittedWizardState: WizardState = {
            ...wizardState,
            departureCity: nodalAirport,
            returnCity: nodalAirport,
            cities: mirroredCities.length > 0 ? mirroredCities : wizardState.cities,
            groupSetup: mirroredGroupSetup
        }

        const derivedGroupType = deriveGroupTypeFromSetup(submittedWizardState.groupSetup)

        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'create_tripboard',
            buttonAction: 'creation_submit',
            extra: {
                date_mode: submittedWizardState.dateMode,
                cities_count: submittedWizardState.cities.length,
                budget_tier: submittedWizardState.budgetTier,
                group_size:
                    submittedWizardState.groupSetup.adults + submittedWizardState.groupSetup.children + submittedWizardState.groupSetup.infants
            }
        })

        const isLoggedIn = await TokenStorage.isLoggedIn()

        if (!isLoggedIn) {
            // Stash the pending submission across the login redirect. The
            // resume payload (WIZARD_RESUME_KEY) is single-use and authoritative,
            // so we also drop the wizard scratch state — when the user lands
            // back post-login, hydration should follow the resume payload, not
            // the half-completed shell snapshot.
            clearShellState()
            sessionStorage.setItem(
                WIZARD_RESUME_KEY,
                JSON.stringify({
                    destinations: selectedDestinations,
                    groupType: derivedGroupType,
                    purpose: effectivePurpose,
                    wizardState: submittedWizardState,
                    tripSource: utmSource || undefined,
                    utmMedium: utmMedium || undefined,
                    utmCampaign: utmCampaign || undefined
                })
            )
            // Mark that we're now awaiting the post-login reload. The post-login
            // remount (same document) must NOT auto-create the trip before the
            // name modal is submitted — see createFlowHandoff. Resets on reload.
            markAwaitingPostLoginReload()

            openLoginModal({
                onLoginSuccess: async () => {
                    await refreshUserInfo()
                    const posthog = (await import('posthog-js')).default
                    posthog._handle_unload()
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    window.location.href = '/tripboard/new?create=true'
                },
                redirectAfterLogin: false,
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE
            })
            return
        }

        // Hand-off to orchestration / legacy submit. The user is no longer
        // "in the wizard" — their scratch state is stale. Clearing here makes
        // sure that if `TripboardPage` falls into its `!identifier` fallback
        // post-create reload (and re-mounts the wizard), the wizard opens
        // fresh on the Where step instead of rehydrating to How.
        clearShellState()

        if (onSubmit) {
            await onSubmit({
                destinations: selectedDestinations,
                groupType: derivedGroupType,
                purpose: effectivePurpose,
                wizardState: submittedWizardState,
                tripSource: utmSource || undefined,
                utmMedium: utmMedium || undefined,
                utmCampaign: utmCampaign || undefined
            })
        } else {
            await createTripAndNavigate(selectedDestinations, derivedGroupType, effectivePurpose, submittedWizardState)
        }
    }

    // ── Render: processing state ───────────────────────────────────────
    if (isProcessing) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center px-4">
                    <Loader2 className="w-12 h-12 text-primary-default animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">Setting things up</h2>
                    <p className="text-grey-2 font-manrope text-sm">{processingMessage || 'Please wait...'}</p>
                </div>
            </div>
        )
    }

    // ── Render: clone progress ─────────────────────────────────────────
    if (isCloning) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center px-4">
                    <Loader2 className="w-12 h-12 text-primary-default animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">Cloning tripboard</h2>
                    <p className="text-grey-2 font-manrope text-sm">Please wait...</p>
                </div>
            </div>
        )
    }

    /** Compact label rendered under the When step indicator once that step
     *  has been completed — e.g. "24 Sep - 12 Oct" (no year, it sits on a
     *  tiny step-indicator chip). */
    const whenLabel: string | undefined = (() => {
        const startRaw = wizardState.startDate
        const endRaw = wizardState.endDate
        const start = startRaw ? (startRaw instanceof Date ? startRaw : new Date(startRaw)) : null
        const end = endRaw ? (endRaw instanceof Date ? endRaw : new Date(endRaw)) : null
        if (start && end) {
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
            return `${fmt(start)} - ${fmt(end)}`
        }
        return undefined
    })()

    /** Compact label rendered under the Who step indicator once that step is
     *  completed — "3 people", "1 person". Counts every category. */
    const whoLabel: string | undefined =
        completedSteps.has('who') && totalTravelers > 0 ? `${totalTravelers} ${totalTravelers === 1 ? 'person' : 'people'}` : undefined

    /** Header strip on the Select-Cities frame: a JourneyStrip whose departure
     *  side is an inline searchable dropdown (so the user picks their flying-
     *  from city right here) and whose destination side shows the picked
     *  countries. */
    // The JourneyStrip header hosts the inline departure-city picker (+ ✈ +
    // destination). Desktop: it sits above the Select-Cities frame. Mobile: the
    // cities screen stays clean and the strip moves to the dedicated route
    // screen instead.
    const showJourneyStrip =
        currentStep === 'where' && ((!isMobile && currentSubTab === 'select-cities') || (isMobile && currentSubTab === 'select-route'))
    const departureMissing = citiesInvalid?.section === 'departure' && !nodalCity
    const whereHeaderStrip = showJourneyStrip ? (
        <JourneyStrip
            departureCity={nodalCity}
            onSelectDeparture={handleDepartureCitySelect}
            destinations={selectedCountries}
            departureError={departureMissing}
            // Mobile route screen: tapping Next without a departure opens the
            // strip's picker directly (rather than only flagging the error).
            departureOpenNonce={isMobile && departureMissing ? citiesInvalid?.nonce : undefined}
        />
    ) : undefined

    // Total trip length (inclusive) derived from the picked When dates, and the
    // nights to spread across the route (date gap). The route panel on the
    // Select-Cities frame shows an assigned/total hint off `totalTripNights`.
    const tripDays = (() => {
        const s = wizardState.startDate ? new Date(wizardState.startDate) : null
        const e = wizardState.endDate ? new Date(wizardState.endDate) : null
        if (!s || !e) return 0
        return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1)
    })()
    const totalTripNights: number | null = tripDays > 0 ? tripDays - 1 : null

    // Whether the Next / Plan-my-trip CTA should LOOK disabled (dimmed) for the
    // current step. It stays clickable so a tap scrolls to + flags the first
    // unfilled section.
    const nextLooksDisabled =
        // Occasion is optional (defaults to leisure), so the CTA enables on
        // travelers ≥ 1 alone — no longer gated on a picked occasion.
        (currentStep === 'who' && totalTravelers < 1) ||
        (currentStep === 'when' && (!wizardState.startDate || !wizardState.endDate)) ||
        (currentStep === 'where' && currentSubTab === 'destination' && selectedCountries.length === 0) ||
        // Cities screen: mobile only needs ≥1 city (departure is asked on the
        // route screen next); desktop also needs the departure city inline.
        (currentStep === 'where' &&
            currentSubTab === 'select-cities' &&
            (selectedCities.length === 0 || (!isMobile && !nodalCity))) ||
        // Mobile route screen: needs a departure city to complete the route.
        (currentStep === 'where' && currentSubTab === 'select-route' && !nodalCity) ||
        (currentStep === 'how' && (!stayType || !pace || diet.size === 0))

    // ── How-step prompt suggestions — fetched from the itinerary-prompts API
    //    (same source as the legacy wizard's Step 3) instead of a hardcoded set.
    //    The endpoint is async: it returns `queued/processing` then `completed`,
    //    so we poll every 2s until it settles. Enabled once cities + dates exist
    //    (i.e. by the time the user is on / approaching the How step).
    // const itineraryPromptPayload = useMemo(() => {
    //     const cities = selectedCities.map((c) => c.name).filter(Boolean)
    //     const countries = selectedCountries.map((c) => c.name).filter(Boolean)
    //     const s = wizardState.startDate ? (wizardState.startDate instanceof Date ? wizardState.startDate : new Date(wizardState.startDate)) : null
    //     const e = wizardState.endDate ? (wizardState.endDate instanceof Date ? wizardState.endDate : new Date(wizardState.endDate)) : null
    //     if (!s || !e || cities.length === 0) return null
    //     const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    //     return {
    //         cities,
    //         countries: countries.length > 0 ? countries : [''],
    //         start_date: ymd(s),
    //         end_date: ymd(e),
    //         group_type: deriveGroupTypeFromSetup(wizardState.groupSetup),
    //         purpose_type: selectedPurpose || 'itinerary'
    //     }
    // }, [selectedCities, selectedCountries, wizardState.startDate, wizardState.endDate, wizardState.groupSetup, selectedPurpose])

    // const { data: promptResponse } = useQuery({
    //     queryKey: [
    //         'createFlowItineraryPrompts',
    //         itineraryPromptPayload?.cities,
    //         itineraryPromptPayload?.start_date,
    //         itineraryPromptPayload?.end_date,
    //         itineraryPromptPayload?.group_type,
    //         itineraryPromptPayload?.purpose_type
    //     ],
    //     queryFn: () => fetchItineraryPrompts(itineraryPromptPayload!),
    //     enabled: !!itineraryPromptPayload && itineraryPromptPayload.cities.length > 0,
    //     refetchInterval: (query) => {
    //         const d = query.state.data
    //         if (!d) return 2000
    //         return d.status === 'completed' || d.status === 'failed' ? false : 2000
    //     },
    //     refetchIntervalInBackground: true,
    //     staleTime: 0,
    //     gcTime: 0
    // })
    // const itineraryPromptSuggestions = promptResponse?.result?.floating_prompt_questions

    // ── Step indicator click — only allow navigation to completed steps ──
    const handleStepIndicatorClick = (step: WizardStep) => {
        if (step === currentStep) return
        if (!completedSteps.has(step)) return
        const fromIdx = stepIndex(currentStep)
        const toIdx = stepIndex(step)
        setDirection(toIdx < fromIdx ? 'back' : 'forward')
        setCurrentStep(step)
    }

    // ── Clone Tripboard view (internal users only — preserved verbatim) ──
    if (mode === 'clone' && isRimigoInternal) {
        // We're in the clone branch, so the toggle's "Clone" button is the
        // active one. Hard-coded class strings (rather than `mode === '…'`
        // conditionals) because TypeScript has narrowed `mode` to 'clone' here.
        return (
            <div className={embedded ? 'flex flex-col' : 'min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex flex-col'}>
                {/* Mode toggle */}
                <div className="flex justify-center pt-6 pb-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('create')}
                        className="px-4 py-2 rounded-full text-sm font-manrope font-medium transition-all cursor-pointer bg-grey-5 text-grey-1 hover:bg-grey-4">
                        Create New
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('clone')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-manrope font-medium transition-all cursor-pointer bg-primary-default text-white">
                        <Copy size={14} />
                        Clone Tripboard
                    </button>
                </div>

                <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
                    <h1 className="text-[26px] md:text-2xl font-bold font-red-hat-display text-grey-0 mb-6 text-center">
                        Clone an existing Tripboard
                    </h1>

                    {/* Tripboard URL input */}
                    <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                        <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">Tripboard URL</label>
                        <p className="text-grey-2 font-manrope text-sm mb-3">Paste a rimigo-collection or traveler_collection link</p>
                        <div className="relative">
                            <Link
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-3"
                            />
                            <input
                                type="url"
                                value={cloneUrl}
                                onChange={(e) => setCloneUrl(e.target.value)}
                                placeholder="https://rimigo.com/rimigo-collection/..."
                                className="w-full pl-9 pr-4 py-3 rounded-xl border border-grey-4 text-sm font-manrope text-grey-0 placeholder:text-grey-3 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default"
                            />
                        </div>
                        {cloneUrl && extractCloneInfo(cloneUrl) && (
                            <p className="text-xs text-grey-2 font-manrope mt-2">
                                Identifier: <span className="font-medium text-grey-0">{extractCloneInfo(cloneUrl)!.identifier}</span>
                                <span className="ml-2 text-grey-3">({extractCloneInfo(cloneUrl)!.collectionType})</span>
                            </p>
                        )}
                    </div>

                    {/* Clone target selector — only show when user has an active trip */}
                    {travelerTrips?.activeTripId && (
                        <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                            <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-3 block">Clone into</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCloneTarget('active_trip')}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-manrope font-medium transition-all duration-200 cursor-pointer ${
                                        cloneTarget === 'active_trip'
                                            ? 'bg-primary-default-80 border-[2px] border-primary-default text-primary-default'
                                            : 'bg-white text-grey-0 hover:bg-grey-4 border-[1px] border-grey-4'
                                    }`}>
                                    Current trip{travelerTrips.activeTrip?.name ? ` (${travelerTrips.activeTrip.name})` : ''}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCloneTarget('new_trip')}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-manrope font-medium transition-all duration-200 cursor-pointer ${
                                        cloneTarget === 'new_trip'
                                            ? 'bg-primary-default-80 border-[2px] border-primary-default text-primary-default'
                                            : 'bg-white text-grey-0 hover:bg-grey-4 border-[1px] border-grey-4'
                                    }`}>
                                    New trip
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Start Date — always required */}
                    <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                        <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">Start Date</label>
                        <input
                            type="date"
                            value={cloneStartDate}
                            onChange={(e) => setCloneStartDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-grey-4 text-sm font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default"
                        />
                    </div>

                    {/* End Date, Group Type, Purpose — only needed for new trip */}
                    {(cloneTarget === 'new_trip' || !travelerTrips?.activeTripId) && (
                        <>
                            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                                <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">End Date</label>
                                <input
                                    type="date"
                                    value={cloneEndDate}
                                    min={cloneStartDate || undefined}
                                    onChange={(e) => setCloneEndDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-grey-4 text-sm font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default"
                                />
                            </div>

                            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                                <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">Who&apos;s traveling?</label>
                                <div className="flex flex-wrap gap-2">
                                    {GROUP_TYPE_OPTIONS.map((option) => {
                                        const isSelected = cloneGroupType === option.backendValue
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setCloneGroupType(isSelected ? '' : option.backendValue)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-manrope font-medium transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-primary-default-80 border-[2px] border-primary-default text-primary-default'
                                                        : 'bg-white text-grey-0 hover:bg-grey-4 border-[1px] border-grey-4'
                                                }`}>
                                                <img
                                                    src={option.image}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                                {isSelected && (
                                                    <Check
                                                        size={14}
                                                        strokeWidth={2.5}
                                                    />
                                                )}
                                                {option.labelUi}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                                <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">
                                    What&apos;s the occasion?
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {vacationPurposeOptions.map((option) => {
                                        const isSelected = clonePurpose === option.backendValue
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setClonePurpose(isSelected ? '' : option.backendValue)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-manrope font-medium transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-primary-default-80 border-[2px] border-primary-default text-primary-default'
                                                        : 'bg-white text-grey-0 hover:bg-grey-4 border-[1px] border-grey-4'
                                                }`}>
                                                <img
                                                    src={option.imageSrc}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                                {isSelected && (
                                                    <Check
                                                        size={14}
                                                        strokeWidth={2.5}
                                                    />
                                                )}
                                                {option.labelUi}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={handleCloneSubmit}
                        className="w-full py-3 rounded-xl bg-primary-default text-white font-manrope font-semibold text-base hover:bg-primary-default/90 transition-all cursor-pointer">
                        Clone Tripboard
                    </button>
                </div>
            </div>
        )
    }

    // ── Render: main wizard (Who → When → Where → How) ───────────────────
    return (
        <div
            /* `embedded` (in-app create flow): part of the flex-height chain so the
               logged-out wizard's inner scroller sizes exactly (min-h-0 + flex-1).
               Inert for logged-in (its parent isn't a flex scroller). */
            className={embedded ? 'relative flex min-h-0 flex-1 flex-col' : 'relative min-h-screen flex flex-col'}>
            {/* Internal-user mode toggle (Create vs Clone) — kept intentionally
                small/subtle so it doesn't break the redesigned wizard frame for
                internal users. Non-internal users never see it. The clone branch
                above early-returns, so `mode` is narrowed to 'create' here. */}
            <WizardShell
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepIndicatorClick}
                // Where step no longer uses the two-tab SubTabBar; the country picker
                // stands alone and Select-Cities shows a JourneyStrip with an inline
                // departure-city dropdown instead.
                subTabs={null}
                headerStrip={whereHeaderStrip}
                onMobileClose={() => {
                    trackButtonClickCustom({
                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                        buttonName: 'close_create_flow',
                        buttonAction: 'click',
                        extra: { step: currentStep, sub_tab: currentSubTab }
                    })
                    if (onClose) onClose()
                    else window.history.back()
                }}
                onBack={handleBack}
                isLoggedIn={isLoggedIn}
                headerRightExtra={
                    isRimigoInternal ? (
                        /* Internal-only Create/Clone toggle, sat to the left of
                           the close (X) in the header's top-right cluster. */
                        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setMode('create')}
                                className="rounded-full bg-primary-default px-2.5 py-1 font-manrope text-[11px] font-medium text-white">
                                Create
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('clone')}
                                className="inline-flex items-center gap-1 rounded-full bg-grey-5 px-2.5 py-1 font-manrope text-[11px] font-medium text-grey-1 hover:bg-grey-4">
                                <Copy size={11} />
                                Clone
                            </button>
                        </div>
                    ) : undefined
                }
                onLogin={() =>
                    openLoginModal({
                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                        redirectAfterLogin: false,
                        // Reload after login so the route re-mounts INSIDE the
                        // sidebar layout — otherwise the header flips to the
                        // hamburger but the sidebar context is still the no-op
                        // (logged-out renders the flow outside SideBarLayout),
                        // so the hamburger wouldn't open anything until a manual
                        // refresh.
                        onLoginSuccess: async () => {
                            await refreshUserInfo()
                            window.location.reload()
                        }
                    })
                }
                whereFlags={selectedCountries.map((c) => c.flag).filter(Boolean)}
                whenLabel={whenLabel}
                whoLabel={whoLabel}>
                <div
                    ref={stepContentRef}
                    className="relative flex-1 w-full max-w-7xl mx-auto px-6"
                    style={{ paddingBottom: footerHeight + 24 }}>
                    {/* Mobile step-back lives INLINE at the start of each step
                        heading (see WizardBackButton) so it aligns with the
                        heading's first line — the footer has no Back on mobile.
                        Desktop uses the footer's Back button. */}
                    <AnimatePresence
                        mode="wait"
                        custom={direction}>
                        {/* WHERE */}
                        {currentStep === 'where' && (
                            <motion.div
                                key="step-where"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}>
                                <WhereStep
                                    onBack={isLoggedIn ? handleBack : undefined}
                                    destInvalid={destInvalid}
                                    citiesInvalid={citiesInvalid}
                                    currentSubTab={currentSubTab}
                                    direction={direction}
                                    selectedIds={selectedIds}
                                    onToggle={handleToggleCountry}
                                    selectedCountries={selectedCountries}
                                    selectedCityIds={selectedCityIds}
                                    onToggleCity={handleToggleCity}
                                    selectedCities={selectedCities}
                                    departureName={nodalCity?.city_name ?? 'Departure'}
                                    departureCity={nodalCity}
                                    onSelectDeparture={handleDepartureCitySelect}
                                    onAdjustNights={handleCityAdjustNights}
                                    onReorder={handleCityReorder}
                                    onRemoveCity={handleRemoveCity}
                                    aiRouteOptimize={wizardState.aiRouteOptimize}
                                    onToggleAiOptimize={handleToggleAiOptimize}
                                    totalTripNights={totalTripNights}
                                />
                            </motion.div>
                        )}

                        {/* WHEN — single frame: exact check-in / check-out date picker. */}
                        {currentStep === 'when' && (
                            <motion.div
                                key="step-when"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}>
                                <YesFlowFrame
                                    onBack={isLoggedIn ? handleBack : undefined}
                                    invalidSection={whenInvalid}
                                    checkIn={
                                        wizardState.startDate
                                            ? wizardState.startDate instanceof Date
                                                ? wizardState.startDate
                                                : new Date(wizardState.startDate)
                                            : null
                                    }
                                    checkOut={
                                        wizardState.endDate
                                            ? wizardState.endDate instanceof Date
                                                ? wizardState.endDate
                                                : new Date(wizardState.endDate)
                                            : null
                                    }
                                    onChange={({ checkIn, checkOut }) => {
                                        handleWizardChange({
                                            startDate: checkIn ?? undefined,
                                            endDate: checkOut ?? undefined,
                                            dateMode: 'exact'
                                        })
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: checkIn && checkOut ? 'date_range_complete' : 'date_pick',
                                            buttonAction: 'click',
                                            extra: {
                                                check_in: checkIn ? checkIn.toISOString().slice(0, 10) : null,
                                                check_out: checkOut ? checkOut.toISOString().slice(0, 10) : null
                                            }
                                        })
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* WHO — traveler counters + special-occasion picker. */}
                        {currentStep === 'who' && (
                            <motion.div
                                key="step-who"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}>
                                <WhoFrame
                                    invalidSection={whoInvalid}
                                    counts={{
                                        elders: eldersCount,
                                        adults: wizardState.groupSetup.adults,
                                        children: wizardState.groupSetup.children,
                                        infants: wizardState.groupSetup.infants
                                    }}
                                    occasion={(selectedPurpose || null) as Parameters<typeof WhoFrame>[0]['occasion']}
                                    onChangeCount={(key: TravelerKey, next: number) => {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'traveler_count_change',
                                            buttonAction: 'click',
                                            extra: { category: key, count: next }
                                        })
                                        if (key === 'elders') {
                                            setEldersCount(next)
                                        } else {
                                            // Changing traveler counts must NOT wipe the chosen
                                            // occasion — the occasions here are free-choice, not
                                            // gated by the derived group type.
                                            handleWizardChange({
                                                groupSetup: {
                                                    ...wizardState.groupSetup,
                                                    [key]: next
                                                }
                                            })
                                        }
                                    }}
                                    onChangeOccasion={(next) => {
                                        if (next) {
                                            trackButtonClickCustom({
                                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                buttonName: 'purpose_select',
                                                buttonAction: 'click',
                                                extra: { purpose: next }
                                            })
                                        }
                                        setSelectedPurpose(next ?? '')
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* HOW — stay type, budget, pace, dietary, free-text notes. */}
                        {currentStep === 'how' && (
                            <motion.div
                                key="step-how"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}>
                                <HowFrame
                                    onBack={isLoggedIn ? handleBack : undefined}
                                    // promptSuggestions={itineraryPromptSuggestions}
                                    invalidSection={howInvalid}
                                    stayType={stayType}
                                    budgetRange={wizardState.stayBudgetRange}
                                    pace={pace}
                                    diet={diet}
                                    notes={wizardState.preferences}
                                    onChangeStayType={(v) => {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'stay_type_select',
                                            buttonAction: 'click',
                                            extra: { stay_type: v }
                                        })
                                        setStayType(v)
                                    }}
                                    onChangeBudgetRange={(r) => handleWizardChange({ stayBudgetRange: r })}
                                    onChangePace={(p) => {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'pace_select',
                                            buttonAction: 'click',
                                            extra: { pace: p }
                                        })
                                        setPace(p)
                                    }}
                                    onToggleDiet={(d) => {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'diet_toggle',
                                            buttonAction: 'click',
                                            extra: { diet: d }
                                        })
                                        setDiet((prev) => {
                                            const next = new Set(prev)
                                            if (next.has(d)) next.delete(d)
                                            else next.add(d)
                                            // Mirror selection into the canonical
                                            // dietaryRestrictions array consumed downstream.
                                            const labelMap: Record<DietId, string> = {
                                                veg: 'Vegetarian',
                                                egg: 'Eggetarian',
                                                non_veg: 'Non-vegetarian'
                                            }
                                            const labels = Array.from(next).map((id) => labelMap[id])
                                            handleWizardChange({ dietaryRestrictions: labels })
                                            return next
                                        })
                                    }}
                                    onChangeNotes={(n) => handleWizardChange({ preferences: n })}
                                    // onPromptSelect={(text) =>
                                    //     trackButtonClickCustom({
                                    //         buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    //         buttonName: 'prompt_suggestion_select',
                                    //         buttonAction: 'click',
                                    //         extra: { prompt: text }
                                    //     })
                                    // }
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed bottom bar — pinned to the viewport bottom regardless of
                    content height. Full width. On the destination frame the
                    selected-country chips render above Back + Next; on the
                    Select-Cities frame the selected-city chips + the
                    too-many-cities warning render there instead. */}
                {(currentStep === 'where' || currentStep === 'when' || currentStep === 'who' || currentStep === 'how') && (
                    <div
                        ref={footerRef}
                        className="fixed bottom-0 left-0 right-0 z-20 w-full">
                        <div className="w-full border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                            <div className="mx-auto flex w-full max-w-[690px] flex-col gap-3 px-5 py-2.5">
                                {currentStep === 'where' && currentSubTab === 'destination' && selectedCountries.length > 0 && (
                                        /* Single-row, swipeable country chips. Collapsed: first 3 +
                                           a "+N" pill. Expanded: all of them with a "View less" at
                                           the end. Reuses GenericCarousel for the horizontal swipe
                                           + edge fades (desktop arrows/gradients; native swipe on
                                           mobile). pt-2 leaves room for each chip's overlapping X. */
                                        <GenericCarousel
                                            gap={12}
                                            containerClassName="pt-2 pb-1"
                                            gradientEndColor="rgba(255,255,255,0)"
                                            gradientLeftEndColor="rgba(255,255,255,0)">
                                            {(chipsExpanded ? selectedCountries : selectedCountries.slice(0, 3)).map((c) => (
                                                <motion.span
                                                    key={c.id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                                    className="relative inline-block shrink-0">
                                                    <span className="inline-flex items-center gap-3 rounded-[8px] border border-[var(--color-grey-4)] bg-[#F5F4F7] px-3 py-2">
                                                        {c.flag && c.flag.startsWith('http') ? (
                                                            <img
                                                                src={c.flag}
                                                                alt=""
                                                                className="h-5 w-5 shrink-0"
                                                            />
                                                        ) : null}
                                                        <span
                                                            className="wf-body-m max-w-[140px] truncate"
                                                            style={{ color: 'var(--text-primary)' }}>
                                                            {c.name}
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove ${c.name}`}
                                                        onClick={() => setSelectedCountries((prev) => prev.filter((p) => p.id !== c.id))}
                                                        /* 20x20 circle button with ~70% overlap into the chip's
                                                   top-right corner. With X = 20px and 70% overlap, only
                                                   6px (30%) sticks out — so right/top offset is -6px. */
                                                        className="absolute right-[-6px] top-[-6px] flex h-5 w-5 items-center justify-center rounded-full border border-[#ACAAAE] bg-[var(--fill-neutral)]">
                                                        <X
                                                            size={12}
                                                            strokeWidth={1.667}
                                                        />
                                                    </button>
                                                </motion.span>
                                            ))}
                                            {selectedCountries.length > 3 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setChipsExpanded((v) => !v)}
                                                    className="inline-flex shrink-0 items-center self-center whitespace-nowrap rounded-[8px] border border-[var(--color-grey-4)] bg-white px-3 py-2 font-manrope text-[14px] font-semibold leading-[18px] tracking-[-0.28px]"
                                                    style={{ color: 'var(--text-brand, #7011F6)' }}>
                                                    {chipsExpanded
                                                        ? 'View less'
                                                        : `+${selectedCountries.length - 3} ${selectedCountries.length - 3 === 1 ? 'country' : 'countries'}`}
                                                </button>
                                            )}
                                        </GenericCarousel>
                                    )}
                                {/* Select-Cities frame: picked cities in a horizontal
                                    carousel above Back/Next. */}
                                {currentStep === 'where' && currentSubTab === 'select-cities' && selectedCities.length > 0 && (
                                    <div className="flex min-w-0 items-center gap-3 overflow-x-auto overscroll-x-contain scroll-smooth py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        <AnimatePresence initial={false}>
                                            {selectedCities.map((c) => (
                                                <motion.span
                                                    key={c.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                                    className="relative inline-block shrink-0">
                                                    <span className="inline-flex items-center gap-3 whitespace-nowrap rounded-[8px] border border-[var(--color-grey-4)] bg-[#F5F4F7] px-3 py-2">
                                                        <span
                                                            className="wf-body-m"
                                                            style={{ color: 'var(--text-primary)' }}>
                                                            {c.name}
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove ${c.name}`}
                                                        onClick={() => handleToggleCity(c.id, c.name)}
                                                        className="absolute right-[-6px] top-[-6px] flex h-5 w-5 items-center justify-center rounded-full border border-[#ACAAAE] bg-[var(--fill-neutral)]">
                                                        <X
                                                            size={12}
                                                            strokeWidth={1.667}
                                                        />
                                                    </button>
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    {/* Back hidden on the first step (Who) and on How
                                        (How shows only the full-width "Plan my trip").
                                        Desktop only — on mobile the step-back lives as a
                                        small arrow at the top of the section. */}
                                    {currentStep !== 'who' && currentStep !== 'how' && (
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            /* Figma typography: Red Hat Display 18px / 550 / 20 LH /
                                       letter-spacing -0.36px; text-primary on the white Back. */
                                            className="hidden items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-3 font-red-hat-display text-[18px] leading-[20px] tracking-[-0.36px] text-[var(--text-primary)] md:inline-flex"
                                            style={{ fontWeight: 550 }}>
                                            <ArrowLeft
                                                size={16}
                                                strokeWidth={1.667}
                                            />
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={currentStep === 'how' ? handleSubmit : handleNext}
                                        /* Per-frame gating:
                                       Who               : ≥1 traveler.
                                       When              : both check-in + check-out set.
                                       Where→Destination : ≥1 country selected.
                                       Where→SelectCities: ≥1 city + departure (route edited inline).
                                       How               : stay type + pace + diet picked. */
                                        /* Only How-while-processing is HARD disabled. Every other
                                           step stays clickable but LOOKS disabled (see
                                           nextLooksDisabled) so a tap scrolls to + flags the
                                           first unfilled section. */
                                        disabled={currentStep === 'how' && isProcessing}
                                        /* On the How step the CTA changes from a black "Next" pill
                                       to an indigo "Plan my trip" with the sparkles icon. */
                                        className={
                                            currentStep === 'how'
                                                ? 'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-red-hat-display text-[18px] leading-[20px] tracking-[-0.36px] text-white disabled:opacity-40 disabled:cursor-not-allowed'
                                                : 'flex-1 rounded-xl bg-black py-3 font-red-hat-display text-[18px] leading-[20px] tracking-[-0.36px] text-white disabled:opacity-40 disabled:cursor-not-allowed'
                                        }
                                        style={{
                                            fontWeight: 550,
                                            ...(currentStep === 'how' ? { background: 'var(--primary-indigo, #7011F6)' } : {}),
                                            // Dimmed when the step's required fields aren't filled yet
                                            // (still clickable — see nextLooksDisabled).
                                            opacity: nextLooksDisabled ? 0.4 : 1
                                        }}>
                                        {currentStep === 'how' ? (
                                            <>
                                                <Sparkles
                                                    size={18}
                                                    strokeWidth={1.667}
                                                />
                                                Plan my trip
                                            </>
                                        ) : (
                                            'Next'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </WizardShell>
        </div>
    )
}

export default TripboardCreateFlow
