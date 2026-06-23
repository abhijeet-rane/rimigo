import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCitiesByIdsForMap } from '@/hooks/useCitiesByIdsForMap'
import { getAccommodationFilters } from './Apis'
import { LandingOverlay, StaysCard, StaysCardSkeleton, StaysMap, CityPromptsChips, type SearchParams } from './Components'
import SearchHeader from '@/components/common/SearchHeader'
import type { WhereDimensionConfig, WhereDimensionItem } from '@/components/common/SearchHeader'
import ProgressStepsLoader from '@/components/common/ProgressStepsLoader'
import type { LocationPreference } from '@/components/common/SearchBar'
import { ENABLE_HOTEL_PRICE_COMPARE_DEALS, HOTEL_IMAGES } from './Constants'
import { LANDING_DUMMY_CARDS } from './Constants/landingDummyCards'
import type { RatesHistogramResponse } from './Services'
import {
    fetchAccommodations,
    fetchRatesHistogram,
    getCityDetails,
    searchHotelSuggestions,
    type CityDetails,
    type HotelSuggestion
} from './Services'
import { searchCitiesForActivities as searchCitiesGlobal } from '@/modules/Acitvities/api/activitiesSearchAPI'
import { ActivitiesSearchDropdown } from '@/modules/Acitvities/components/ActivitiesSearchDropdown'
import { getCountryByCityId } from './Apis/citiesAPI'
import { triggerAssistantPrompt } from './Components/assistantController'
import { updateTripItineraryRoute } from '@/api/itineraryApi'
import { updateTripPartial, updateCityStayPreferences } from '@/api/trip/tripAPI'
import type { UpdateTripProfileData } from '@/api/tripProfileAPI/tripProfileAPI'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { HOURS_12, HOURS_24 } from '@/constants/commons/tanstackConstants'
import type { Amenities, PropertyType } from './Types/accommodationFiltersTypes'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { fetchCityPrompts, type CityPromptRequestBody, type CityPromptResponse } from './Apis/promptsAPI'
import { getViewportAccommodations } from './Apis/accommodationsAPI'
import { useStaysCheckAvailibilityPrices } from './hooks/useStaysCheckAvailibilityPrices'
import { toast } from 'sonner'
import {
    buildRoomsFromFlat,
    fetchHotelPriceCompare,
    type HotelPriceCompareRequest,
    type PlatformPrice,
} from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { decodeOccupancies } from '@/types/occupancy'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { ChevronLeft, ChevronUp, Info } from 'lucide-react'
import GuideTipperInlineModal from '@/modules/UserGuideModal/components/GuideTipperInlineModal'
import { useOnboardingGuideContext } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import MobileStaysTabHeader from './Components/MobileStaysTabHeader'
import { useIsMobile } from '@/hooks/use-mobile'
import StaysZeroState from './Components/StaysZeroState'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useCountryLiveStatus } from '@/hooks/useCountryLiveStatus'
import { NotLiveCountryMessage } from '../Landing/Components/NotLiveCountryMessage'
import GuideTipperModal from '@/modules/UserGuideModal/components/GuideTipperModal'

const normalizeDateInput = (value?: Date | string | null) => {
    if (!value) return undefined
    const date = typeof value === 'string' ? new Date(value) : new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    date.setHours(0, 0, 0, 0)
    return date
}

const sanitizeDateInput = (value: Date | string | null | undefined, todayStart: Date) => {
    const normalized = normalizeDateInput(value)
    if (!normalized) return undefined
    return normalized.getTime() < todayStart.getTime() ? undefined : normalized
}

const getTodayStart = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

const formatDateYMD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Define location preferences specific to Stays screen
const STAYS_LOCATION_PREFERENCES: LocationPreference[] = [
    { key: 'station_nearby', value: 'station_nearby', label: 'Near Station', icon: '🚇' },
    { key: 'city_center', value: 'city_center', label: 'City Center', icon: '🏙️' },
    { key: 'nightlife', value: 'nightlife', label: 'Nightlife', icon: '🌃' },
    { key: 'restaurant_nearby', value: 'restaurant_nearby', label: 'Restaurants', icon: '🍽️' },
    { key: 'indian_restaurant_nearby', value: 'indian_restaurant_nearby', label: 'Indian Food', icon: '🍛' },
    { key: 'perfect_area', value: 'perfect_area', label: 'Perfect Area', icon: '⭐' },
    { key: 'near_domestic_airport', value: 'near_domestic_airport', label: 'Near Domestic Airport', icon: '✈️' },
    { key: 'near_international_airport', value: 'near_international_airport', label: 'Near International Airport', icon: '🛫' },
    { key: 'supermarkets_nearby', value: 'supermarkets_nearby', label: 'Supermarkets', icon: '🛒' },
    { key: 'check_in_window', value: 'check_in_window', label: 'Check-in Window', icon: '🕐' },
    { key: 'shuttle_service', value: 'shuttle_service', label: 'Shuttle Service', icon: '🚐' },
    { key: 'parking_available', value: 'parking_available', label: 'Parking', icon: '🅿️' },
    { key: 'great_view', value: 'great_view', label: 'Great View', icon: '🌅' }
]

const PROMPT_LOCATION_PREFERENCE_MAP: Record<string, string> = {
    station_nearby: 'near_station',
    city_center: 'city_center',
    nightlife: 'nightlife',
    restaurant_nearby: 'restaurant_nearby',
    indian_restaurant_nearby: 'indian_restaurant_nearby',
    perfect_area: 'perfect_area',
    near_domestic_airport: 'near_domestic_airport',
    near_international_airport: 'near_international_airport',
    supermarkets_nearby: 'supermarkets_nearby',
    check_in_window: 'check_in_window',
    shuttle_service: 'shuttle_service',
    parking_available: 'parking_available',
    great_view: 'great_view'
}

const PROMPT_GROUP_TYPE_MAP: Record<string, string> = {
    solo_traveler: 'solo_traveler',
    couple: 'couple',
    couple_with_children: 'family_with_kids',
    friends_group: 'friends_group',
    immediate_family: 'family_group'
}

const PROMPT_PURPOSE_TYPE_MAP: Record<string, string> = {
    leisure_relaxation: 'leisure',
    family_vacation: 'family_vacation',
    honeymoon: 'honeymoon',
    anniversary_trip: 'anniversary',
    birthday_celebration: 'celebration',
    solo_escape: 'solo_escape'
}

// ATA Agent Space constant
const ATA_AGENT_SPACE = 'stays_list'

const StaysExplore = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const city_name = searchParams.get('city')
    const [forcedActiveSegment, setForcedActiveSegment] = useState<'where' | 'when' | 'guests' | 'preferences' | null>(null)
    const [cityDetails, setCityDetails] = useState<CityDetails | null>(null)
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const isTripsLoading = travelerTripsContext?.isLoading ?? false
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([])
    const [allAmenities, setAllAmenities] = useState<Amenities | undefined>(undefined)
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([])
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
    const [ratesLoading, setRatesLoading] = useState<boolean>(false)
    const [ratesData, setRatesData] = useState<RatesHistogramResponse['data'] | undefined>(undefined)
    // Tracks the current SSE step so the loader can show "discovering hotels"
    // when a brand-new city is being seeded by the backend (empty-city flow).
    const [ratesProgressStep, setRatesProgressStep] = useState<string | null>(null)
    // Set when the SSE stream terminates with `failed`. Lets the UI render a
    // dedicated empty-city state instead of the generic timeout illustration.
    const [ratesNoHotelsFound, setRatesNoHotelsFound] = useState<boolean>(false)
    const [hoveredAccommodationId, setHoveredAccommodationId] = useState<string | null>(null)
    const [smartSearchModal, setSmartSearchModal] = useState(false)
    const [, setShortListModal] = useState(false)
    // Get sidebar state from context
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const handpickedCardRefs = useRef<(HTMLDivElement | null)[]>([])
    const listContainerRef = useRef<HTMLDivElement>(null)
    const mainPageRef = useRef<HTMLDivElement>(null)
    const activeTripId = activeTrip?.trip_id ?? null
    const selectedCityId = searchParams.get('city_id') || cityDetails?.id || ''

    // City center for map — fetched from LocationPersonalizationCity via the
    // /location-personalization-cities/map/ endpoint. Same hook GenericMap uses,
    // so every map in the app gets city position from one authoritative source.
    // Map init waits for the backend response; if the city has no valid location
    // in LPC, StaysMap falls back to Mapbox geocoding — but only after backend settles.
    const cityIdsForMap = useMemo(() => (selectedCityId ? [selectedCityId] : []), [selectedCityId])
    const { data: citiesWithLocation, isLoading: cityCenterLoading } = useCitiesByIdsForMap(cityIdsForMap)
    const mapCityCenter = useMemo(() => {
        if (!selectedCityId) return null
        const match = citiesWithLocation.find((c) => c.city_id === selectedCityId)
        const lat = match?.latitude
        const lon = match?.longitude
        if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null
        return { lon, lat }
    }, [selectedCityId, citiesWithLocation])

    const { isSidebarOpen } = useSidebarContext()
    const [, setShowSearchHeaderOverlay] = useState(false)
    const handpickedScrollRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'map'>('list')
    // Track if user has ever switched to map tab — defer Mapbox init on mobile until needed (saves Mapbox credits)
    const [hasEverOpenedMobileMap, setHasEverOpenedMobileMap] = useState(false)
    useEffect(() => {
        if (mobileActiveTab === 'map') setHasEverOpenedMobileMap(true)
    }, [mobileActiveTab])
    const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false)
    const [hotelDeals, setHotelDeals] = useState<Record<string, PlatformPrice[]>>({})
    const [dealsLoading, setDealsLoading] = useState<Record<string, boolean>>({})
    const handpickedDealsFetchInFlightRef = useRef(false)
    const lastHandpickedDealsKeyRef = useRef<string>('')
    const [showScrollTop, setShowScrollTop] = useState(false)
    const [addToCollectionModalOpen, setAddToCollectionModalOpen] = useState<string | null>(null)
    const [addToCollectionMapExtras, setAddToCollectionMapExtras] = useState<{
        name?: string
        zentrumHubId?: string
        imageUrl?: string
        isVerified?: boolean
        isB2bDealAvailable?: boolean
    } | null>(null)

    const { isAuthenticated } = useAuth()
    const { guide, updateGuide } = useOnboardingGuideContext()
    const [showMobileSearch, setShowMobileSearch] = useState(true)
    const lastScrollY = useRef(0)
    const isMobile = useIsMobile()
    const { isPremium, isRimigoInternal } = useUserInfo()

    const isTripPlanned = Boolean(activeTrip?.final_destination_countries && activeTrip.final_destination_countries.length > 0)
    const shouldUsePrioritized = isAuthenticated && isTripPlanned
    const [showGuide, setShowGuide] = useState(Boolean(!activeTrip?.trip_id))

    // Add this useEffect to track scroll behavior

    // Fetch agent ID by space (only when logged in)
    const { data: agentId, isLoading: isAgentIdLoading } = useQuery({
        queryKey: ['agentBySpace', ATA_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ATA_AGENT_SPACE),
        enabled: Boolean(isAuthenticated),
        staleTime: HOURS_24 // Cache for 24 hours since agent IDs don't change frequently
    })

    // Fetch country by city_id and update URL params
    const { data: countryData } = useQuery({
        queryKey: ['city-country', selectedCityId],
        queryFn: () => getCountryByCityId(selectedCityId),
        enabled: !!selectedCityId,
        staleTime: HOURS_24 // Cache for 24 hours since city-country relationship doesn't change frequently
    })

    // Update URL params with country_id when country data is fetched
    useEffect(() => {
        if (countryData?.id) {
            const currentCountryId = searchParams.get('country_id')
            // Only update if country_id is different or not present
            if (currentCountryId !== countryData.id) {
                const next = new URLSearchParams(searchParams)
                next.set('country_id', countryData.id)
                setSearchParams(next, { replace: true })
            }
        }
    }, [countryData, searchParams, setSearchParams])

    // useEffect(() => {
    //     const shouldShowGuide = guide?.stays && guide.stays.set_criteria_guide === true && guide.stays.smart_search_guide === false

    //     if (shouldShowGuide) {
    //         // Show overlay after 1 second delay
    //         const timer = setTimeout(() => {
    //             setShowSearchHeaderOverlay(true)
    //         }, 1000)

    //         return () => clearTimeout(timer)
    //     } else {
    //         // Hide immediately when conditions are not met
    //         setShowSearchHeaderOverlay(false)
    //     }
    // }, [smartSearchModal, guide])

    useEffect(() => {
        const checkInParam = searchParams.get('check_in')
        const checkOutParam = searchParams.get('check_out')
        if (!checkInParam && !checkOutParam) return

        const todayStart = getTodayStart()
        const sanitizedCheckIn = sanitizeDateInput(checkInParam, todayStart)
        let sanitizedCheckOut = sanitizeDateInput(checkOutParam, todayStart)

        if (sanitizedCheckIn && sanitizedCheckOut && sanitizedCheckOut.getTime() < sanitizedCheckIn.getTime()) {
            sanitizedCheckOut = undefined
        }

        const hasInvalid = (checkInParam && !sanitizedCheckIn) || (checkOutParam && !sanitizedCheckOut)

        if (!hasInvalid) {
            return
        }

        const next = new URLSearchParams(searchParams)
        next.delete('check_in')
        next.delete('check_out')
        setSearchParams(next, { replace: true })
        setForcedActiveSegment('when')
    }, [searchParams, setSearchParams])

    const handleHandpickedScroll = () => {
        const el = handpickedScrollRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el

        if (scrollWidth <= clientWidth) {
            setScrollProgress(1)
            return
        }

        const progress = (scrollLeft + clientWidth) / scrollWidth
        setScrollProgress(Math.min(progress, 1))
    }

    const handleCloseGuide = () => {
        setShowGuide(false)
    }
    // Derive current sort from URL
    const currentOrderBy = (() => {
        const ob = searchParams.get('order_by')
        if (!ob) return { relevance: -1 } as Record<string, number>
        try {
            return JSON.parse(ob)
        } catch {
            return { relevance: -1 } as Record<string, number>
        }
    })()

    // Helper: build accommodations params from current URL
    const buildListParamsFromURL = useCallback(
        (page = 1, options?: { minMatchScore?: number; limit?: number }) => {
            const cityId = searchParams.get('city_id') || cityDetails?.id || ''
            const checkIn = searchParams.get('check_in') || ''
            const checkOut = searchParams.get('check_out') || ''
            const groupType = searchParams.get('group_type') || 'solo_traveler'
            const travelPurpose = searchParams.get('travel_purpose') || 'leisure_relaxation'
            const prefsCsv = (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean)
            const allowedPrefs = new Set(STAYS_LOCATION_PREFERENCES.map((p) => p.value))
            const prefs = prefsCsv.filter((p) => allowedPrefs.has(p))
            let types = searchParams.getAll('pt')
            if (!types.length) {
                const csv = searchParams.get('pt') ?? searchParams.get('property_types') ?? ''
                types = csv.split(',').filter(Boolean)
            }
            let amns = searchParams.getAll('am')
            if (!amns.length) {
                const csvA = searchParams.get('am') ?? searchParams.get('amenities') ?? ''
                amns = csvA.split(',').filter(Boolean)
            }
            const bMin = searchParams.get('budget_min')
            const bMax = searchParams.get('budget_max')
            const budget = bMin !== null && bMax !== null ? { min: Number(bMin) || 0, max: Number(bMax) || 9999999 } : { min: 0, max: 9999999 }

            // Only include budget_range if it's not the default range
            const shouldIncludeBudgetRange = true //budget.min !== 0 && budget.max !== 9999999

            // order_by from URL (JSON string) with default
            let orderBy: any = { relevance: -1 as const }
            const ob = searchParams.get('order_by')
            if (ob) {
                try {
                    orderBy = JSON.parse(ob)
                } catch {
                    orderBy = { relevance: -1 as const }
                }
            }

            const minMatchScore = options?.minMatchScore ?? 1
            const limit = options?.limit ?? 12

            return {
                cityId,
                travel_purpose: travelPurpose,
                group_type: groupType,
                check_in_date: checkIn,
                check_out_date: checkOut,
                city_preferences: prefs.length ? prefs : ['station_nearby', 'city_center', 'nightlife'],
                budget_range: shouldIncludeBudgetRange ? budget : undefined,
                property_types: types,
                amenities: amns,
                include_hot_picks: true as const,
                page,
                limit,
                order_by: orderBy,
                min_match_score: minMatchScore,
                is_verified: isRimigoInternal && searchParams.get('is_verified') === 'true' ? true : undefined,
                is_b2b_deal_available: isRimigoInternal && searchParams.get('is_b2b_deal_available') === 'true' ? true : undefined
            }
        },
        [searchParams]
    )
    const shouldShowHandPickedHotelsGuide = guide?.stays && !guide.stays.hand_picked_hotels_guide && guide.stays.smart_search_guide === true
    const getAccommodationKey = useCallback((acc: any, fallback?: number | string) => {
        if (!acc) return fallback != null ? String(fallback) : ''
        const raw = acc.zentrum_hub_id ?? acc.id ?? acc.accommodation_id ?? acc.serp_property_token ?? acc.serp_search_name ?? null
        if (raw != null && raw !== '') {
            return String(raw)
        }
        if (fallback != null) {
            return String(fallback)
        }
        return ''
    }, [])

    // ── Stays list: TanStack Query (handpicked + paginated regular) ──
    // Key spans every URL param that should trigger a refetch. ratesReady gates
    // enablement so neither query fires until rates_histogram has at least an
    // estimated histogram. On the `estimated → completed` transition the
    // refetch effect below re-runs both queries so cards upgrade from
    // per-hotel-cache rates to real Zentrum rates.
    const ratesReady = ratesData?.status === 'completed' || ratesData?.status === 'estimated'
    const listKeyParams = useMemo(() => {
        const p = buildListParamsFromURL(1)
        const { page: _page, limit: _limit, min_match_score: _mms, ...rest } = p
        return rest
    }, [buildListParamsFromURL])
    const hasCore = !!listKeyParams.cityId && !!listKeyParams.check_in_date && !!listKeyParams.check_out_date
    const listEnabled = hasCore && ratesReady

    const handpickedQuery = useQuery({
        queryKey: ['stays-handpicked', listKeyParams],
        queryFn: () => fetchAccommodations(buildListParamsFromURL(1, { minMatchScore: 7, limit: 6 })),
        enabled: listEnabled,
        staleTime: HOURS_12,
        gcTime: HOURS_12,
    })

    const regularQuery = useInfiniteQuery({
        queryKey: ['stays-regular', listKeyParams],
        queryFn: ({ pageParam }) => fetchAccommodations(buildListParamsFromURL(pageParam as number, { minMatchScore: 0, limit: 18 })),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const pg = lastPage.data.pagination
            if (!pg) return undefined
            return pg.page < pg.total_pages ? pg.page + 1 : undefined
        },
        enabled: listEnabled,
        staleTime: HOURS_12,
        gcTime: HOURS_12,
    })

    const handpickedAccommodations = useMemo<any[]>(
        () => handpickedQuery.data?.data.data ?? [],
        [handpickedQuery.data]
    )
    const accommodations = useMemo<any[]>(() => {
        const seen = new Set<string>()
        handpickedAccommodations.forEach((acc, i) => {
            const k = getAccommodationKey(acc, `handpicked-${i}`)
            if (k) seen.add(k)
        })
        const out: any[] = []
        regularQuery.data?.pages.forEach((page) => {
            (page.data.data ?? []).forEach((acc: any, i: number) => {
                const k = getAccommodationKey(acc, `regular-${i}`)
                if (!k || seen.has(k)) return
                seen.add(k)
                out.push(acc)
            })
        })
        return out
    }, [handpickedAccommodations, regularQuery.data, getAccommodationKey])

    // Shimmer covers two phases: (1) waiting for rates_histogram before the
    // list queries can fire, and (2) the queries themselves loading. The
    // `!query.data` gate suppresses shimmer when cached data is already
    // painted (warm revisit via gcTime), so the user sees the cache instantly
    // instead of cache-then-flash-to-skeleton-then-cache.
    const isWaitingForRates = hasCore && !ratesReady
    const isLoadingHandpicked = !handpickedQuery.data && (isWaitingForRates || handpickedQuery.isLoading)
    const isLoadingAccommodations = !regularQuery.data && (isWaitingForRates || regularQuery.isLoading)
    const totalCount = regularQuery.data?.pages[0]?.data.pagination?.total_count ?? 0
    const hasMore = !!regularQuery.hasNextPage
    const isLoadingMore = regularQuery.isFetchingNextPage

    // Cards painted on `estimated` use per-hotel-cache rates (date-agnostic,
    // possibly slightly stale). When the SSE upgrades to `completed`, refetch
    // both lists so the cards show real Zentrum rates for the user's dates.
    // queryKey stays the same → TanStack reuses the cache slot, data merges in
    // place, no scroll jump, no skeleton flash.
    const prevRatesStatusRef = useRef<string | undefined>(undefined)
    useEffect(() => {
        const prev = prevRatesStatusRef.current
        const curr = ratesData?.status
        prevRatesStatusRef.current = curr
        if (prev === 'estimated' && curr === 'completed' && listEnabled) {
            void handpickedQuery.refetch()
            void regularQuery.refetch()
        }
    }, [ratesData?.status, listEnabled, handpickedQuery, regularQuery])

    // checkAvailibility top-up: when filters are active and some stays in the
    // visible set lack rates from the bulk rates_task, fire a targeted
    // checkAvailability batch for just those hub_ids. Cards display the
    // returned price when it lands, or "Price unavailable" if the backend
    // confirms no rate.
    const hasActiveFilters = useMemo(() => {
        return !!(
            searchParams.get('budget_min') ||
            searchParams.get('budget_max') ||
            searchParams.getAll('pt').length ||
            searchParams.get('property_types') ||
            searchParams.getAll('am').length ||
            searchParams.get('amenities') ||
            searchParams.get('star_ratings')
        )
    }, [searchParams])

    const checkAvailibilityChildAges = useMemo(() => {
        const raw = searchParams.get('children_age')
        return raw
            ? raw.split(',').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
            : []
    }, [searchParams])

    const visibleAccommodations = useMemo(
        () => [...handpickedAccommodations, ...accommodations],
        [handpickedAccommodations, accommodations]
    )

    const { checkAvailibilityPrices, isFetchingCheckAvailibilityPrices } = useStaysCheckAvailibilityPrices({
        accommodations: visibleAccommodations,
        enabled: hasActiveFilters,
        cityId: searchParams.get('city_id') || cityDetails?.id || undefined,
        checkIn: searchParams.get('check_in') || undefined,
        checkOut: searchParams.get('check_out') || undefined,
        adults: parseInt(searchParams.get('adults') || '2', 10),
        childAges: checkAvailibilityChildAges,
        tripId: activeTripId ?? undefined,
    })

    // Viewport stays: returns data for StaysMap to inject markers directly (no state updates)
    // Use ref to keep the function stable and avoid re-renders
    const buildParamsRef = useRef(buildListParamsFromURL)
    buildParamsRef.current = buildListParamsFromURL

    const fetchViewportStays = useCallback(
        async (bounds: { north: number; south: number; east: number; west: number }) => {
            const params = buildParamsRef.current(1, { minMatchScore: 0, limit: 50 })
            if (!params.cityId) return []
            try {
                const response = await getViewportAccommodations({
                    cityId: params.cityId,
                    north: bounds.north,
                    south: bounds.south,
                    east: bounds.east,
                    west: bounds.west,
                    check_in_date: params.check_in_date,
                    check_out_date: params.check_out_date,
                    limit: 50,
                })
                return response.data || []
            } catch {
                return []
            }
        },
        [] // Stable reference — uses ref internally
    )

    // Fetch deals for handpicked hotels (requestKey: only apply results if still the active request, so stale SSE completions don't overwrite)
    const fetchDealsForHandpickedHotels = useCallback(
        async (requestKey?: string) => {
            if (!ENABLE_HOTEL_PRICE_COMPARE_DEALS) return
            if (!activeTripId || handpickedAccommodations.length === 0) {
                return
            }

            const checkIn = searchParams.get('check_in')
            const checkOut = searchParams.get('check_out')
            if (!checkIn || !checkOut) {
                return
            }

            const adults = parseInt(searchParams.get('adults') || '2', 10)
            const children = parseInt(searchParams.get('children') || '0', 10)
            const childrenAgeParam = searchParams.get('children_age')
            const childAges = childrenAgeParam
                ? childrenAgeParam
                      .split(',')
                      .map((age) => parseInt(age, 10))
                      .filter((age) => !isNaN(age))
                : []
            // Derive city name from searchParams or cityDetails
            const cityNameFromParams = searchParams.get('city') || searchParams.get('city_name') || ''
            const cityName = cityNameFromParams
                ? cityNameFromParams
                      .split('-')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                : cityDetails?.name || ''

            // Helper to clamp children ages
            const clampChildrenAges = (count: number, ages: number[]): number[] => {
                const next = ages.slice(0, count)
                while (next.length < count) next.push(5)
                return next
            }

            // Filter hotels that have zentrum_hub_id (deduplication is handled by the effect's key check, not by hotelDeals state which may be stale in closure)
            const hotelsToFetch = handpickedAccommodations.filter((acc) => {
                const zentrumHubId = acc.zentrum_hub_id || (typeof acc.id === 'string' ? acc.id : acc.id?.toString()) || ''
                return !!zentrumHubId
            })

            if (hotelsToFetch.length === 0) {
                return
            }

            // Set all hotels to loading state
            const initialLoadingState: Record<string, boolean> = {}
            hotelsToFetch.forEach((acc) => {
                const zentrumHubId = acc.zentrum_hub_id || (typeof acc.id === 'string' ? acc.id : acc.id?.toString()) || ''
                if (zentrumHubId) {
                    initialLoadingState[zentrumHubId] = true
                }
            })
            setDealsLoading((prev) => ({ ...prev, ...initialLoadingState }))

            // Fetch deals for all handpicked hotels in parallel (GET + JSON or SSE, no polling)
            const dealPromises = hotelsToFetch.map(async (acc) => {
                const zentrumHubId = acc.zentrum_hub_id || (typeof acc.id === 'string' ? acc.id : acc.id?.toString()) || ''
                if (!zentrumHubId) {
                    return { zentrumHubId: '', platforms: [] as PlatformPrice[] }
                }

                const clampedAges = clampChildrenAges(children, childAges)
                const baseRequest: HotelPriceCompareRequest = {
                    zentrum_hub_id: zentrumHubId,
                    hotel_name: acc.name || 'Hotel',
                    city: cityName,
                    check_in: checkIn,
                    check_out: checkOut,
                    currency: 'INR',
                    trip_id: activeTripId,
                    rimigo_price: false,
                    rooms: buildRoomsFromFlat(adults, clampedAges, 1),
                }

                const doFetch = async (): Promise<PlatformPrice[]> => {
                    // No collection context on this standalone /stays page; BE
                    // captures only traveler+trip in the AttributionContext.
                    // utm_* still flow through from window.location automatically.
                    const result = await fetchHotelPriceCompare(baseRequest)
                    if (result.type === 'error') throw result.error
                    return result.data
                }

                try {
                    const platforms = await doFetch()
                    return { zentrumHubId, platforms }
                } catch (error) {
                    const isTimeout = error instanceof Error && error.message.includes('Timeout: No progress in 20 seconds')
                    if (isTimeout) {
                        try {
                            const platforms = await doFetch()
                            return { zentrumHubId, platforms }
                        } catch (retryError) {
                            console.error('Retry failed for hotel', zentrumHubId, retryError)
                        }
                    } else {
                        console.error('Failed to fetch deals for hotel', zentrumHubId, error)
                    }
                    return { zentrumHubId, platforms: [] as PlatformPrice[] }
                }
            })

            // Wait for all requests to complete
            const results = await Promise.all(dealPromises)

            // Only apply results if this request is still the active one (avoids stale SSE completions overwriting after params/list change)
            if (requestKey != null && lastHandpickedDealsKeyRef.current !== requestKey) {
                return
            }

            // Update deals state for all hotels
            const newDeals: Record<string, PlatformPrice[]> = {}
            results.forEach(({ zentrumHubId, platforms }) => {
                if (zentrumHubId && platforms.length > 0) {
                    newDeals[zentrumHubId] = platforms
                }
            })
            setHotelDeals((prev) => ({ ...prev, ...newDeals }))

            // Clear loading states
            setDealsLoading((prev) => {
                const next = { ...prev }
                hotelsToFetch.forEach((acc) => {
                    const zentrumHubId = acc.zentrum_hub_id || (typeof acc.id === 'string' ? acc.id : acc.id?.toString()) || ''
                    if (zentrumHubId) {
                        delete next[zentrumHubId]
                    }
                })
                return next
            })
        },
        [activeTripId, handpickedAccommodations, searchParams, cityDetails?.name]
    )

    // Helper: trigger histogram + filters based on URL
    const triggerBackgroundFromURL = () => {
        const cityId = searchParams.get('city_id') || cityDetails?.id
        const checkIn = searchParams.get('check_in') || ''
        const checkOut = searchParams.get('check_out') || ''
        if (!cityId || !checkIn || !checkOut) return

        // Only set loading if we don't have ready data yet
        if (!ratesData || (ratesData.status !== 'completed' && ratesData.status !== 'estimated')) {
            setRatesLoading(true)
        }

        // Reset progress step on each new trigger so a stale "discovering_hotels"
        // doesn't bleed into the next request.
        setRatesProgressStep(null)
        setRatesNoHotelsFound(false)

        fetchRatesHistogram({
            cityId,
            check_in: checkIn,
            check_out: checkOut,
            num_adults: parseInt(searchParams.get('adults') || '2', 10),
            child_ages: (searchParams.get('children_age') || '0').split(',').map((age) => parseInt(age, 10)),
            num_infants: parseInt(searchParams.get('infants') || '0', 10)
        }, {
            onProgress: (event) => {
                // event.step ∈ {fetching_accommodations, discovering_hotels,
                //   discovering_hotels_in_progress, saving_hotels, fetching_rates}
                if (event.status === 'in_progress' && event.step) {
                    setRatesProgressStep(event.step)
                }
            }
        })
            .then((res) => {
                // Update ratesData regardless of status to track processing state
                // Accept both 'completed' (fresh rates) and 'estimated' (per-hotel cached rates)
                const status = res.data?.status
                setRatesData(res.data)
                // Set loading to false when request completes
                setRatesLoading(false)
                setRatesProgressStep(null)

                // If estimated, trigger SSE to get fresh rates in background
                if (status === 'estimated') {
                    const cityId = searchParams.get('city_id') || cityDetails?.id
                    const checkIn = searchParams.get('check_in') || ''
                    const checkOut = searchParams.get('check_out') || ''
                    if (cityId && checkIn && checkOut) {
                        fetchRatesHistogram({
                            cityId,
                            check_in: checkIn,
                            check_out: checkOut,
                            num_adults: parseInt(searchParams.get('adults') || '2', 10),
                            child_ages: (searchParams.get('children_age') || '0').split(',').map((age) => parseInt(age, 10)),
                            num_infants: parseInt(searchParams.get('infants') || '0', 10)
                        }).then((freshRes) => {
                            if (freshRes.data?.status === 'completed') {
                                setRatesData(freshRes.data)
                            }
                        }).catch(() => {})
                    }
                }
            })
            .catch((error: Error) => {
                console.error('[RatesHistogram] Error:', error)
                setRatesLoading(false)
                setRatesProgressStep(null)
                // The backend emits a `failed` SSE event with message
                // `"No accommodations found for city ... (discovery returned nothing)"`
                // when even after discovery a city has no priceable hotels.
                // Surface that as a dedicated empty-city UI instead of a generic timeout.
                const msg = (error && error.message) || ''
                if (/no accommodations found/i.test(msg) || /discovery returned nothing/i.test(msg)) {
                    setRatesNoHotelsFound(true)
                }
                // Clear ratesData on error so loader can show again on retry
                setRatesData(undefined)
            })

        getAccommodationFilters(cityId)
            .then((filtersResponse) => {
                setPropertyTypes(filtersResponse.data.property_types)
                setAllAmenities(filtersResponse.data.amenities)
            })
            .catch(() => {})
    }

    // Fetch city details when component mounts or city_name changes
    useEffect(() => {
        const fetchCityDetails = async () => {
            if (city_name) {
                // Extract and format city name from URL
                const formattedName = city_name
                    .split('-')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                const details = await getCityDetails(formattedName)
                setCityDetails(details)
            }
        }

        fetchCityDetails()
    }, [city_name])

    // Populate search params from active trip when user lands without URL parameters (only on initial mount)
    const hasInitializedFromTrip = useRef(false)
    useEffect(() => {
        // Wait for trip data to be loaded
        if (isTripsLoading) return

        const hasCityId = searchParams.get('city_id')

        // Only run once on mount if no city_id exists
        if (hasInitializedFromTrip.current) {
            return
        }

        if (hasCityId || !activeTrip) {
            return
        }

        hasInitializedFromTrip.current = true

        // Build URL params from active trip data
        const next = new URLSearchParams(searchParams)

        const firstCity = activeTrip.final_destination_cities?.[0]

        if (firstCity) {
            // Set city info
            const formattedCityName = firstCity.name.toLowerCase().split(' ').join('-')
            next.set('city', formattedCityName)
            next.set('city_id', firstCity.id)

            // Set city_prefs (location preferences for stays) from city_wise_preferences
            if (activeTrip.trip_preference?.city_wise_preferences) {
                const cityWisePrefs = activeTrip.trip_preference.city_wise_preferences[firstCity.id]
                if (cityWisePrefs?.stays && cityWisePrefs.stays.length > 0) {
                    next.set('city_prefs', cityWisePrefs.stays.join(','))
                }
            }

            // Set check-in/check-out from itinerary route if available
            const itinerarySegment = activeTrip.itineraryRoute?.[firstCity.id]
            if (itinerarySegment) {
                const todayStart = getTodayStart()
                const itineraryCheckIn = sanitizeDateInput(itinerarySegment.start_date, todayStart)
                let itineraryCheckOut = sanitizeDateInput(itinerarySegment.end_date, todayStart)
                if (itineraryCheckIn && itineraryCheckOut && itineraryCheckOut.getTime() < itineraryCheckIn.getTime()) {
                    itineraryCheckOut = undefined
                }
                if (itineraryCheckIn && itineraryCheckOut) {
                    next.set('check_in', formatDateYMD(itineraryCheckIn))
                    next.set('check_out', formatDateYMD(itineraryCheckOut))
                }
            }
        }

        // Set group_type from trip profile (even if city data is missing)
        if (activeTrip.tripProfile?.group_type) {
            next.set('group_type', activeTrip.tripProfile.group_type)
        }

        // Set travel_purpose from trip profile
        if (activeTrip.tripProfile?.travel_purpose) {
            next.set('travel_purpose', activeTrip.tripProfile.travel_purpose)
        }

        // Set guests data - priority: group_setup > derive from group_type
        const tripGroupSetup = activeTrip.trip_preference?.group_setup
        if (tripGroupSetup && !(tripGroupSetup.adults === 0 && tripGroupSetup.children === 0 && tripGroupSetup.infants === 0)) {
            // Use group_setup if available and not all zeros
            next.set('adults', String(tripGroupSetup.adults || 1))
            next.set('children', String(tripGroupSetup.children || 0))
            next.set('infants', String(tripGroupSetup.infants || 0))
            if (tripGroupSetup.children_age && tripGroupSetup.children_age.length > 0) {
                next.set('children_age', tripGroupSetup.children_age.join(','))
            }
        } else {
            // Derive from group_type if group_setup is missing or all zeros
            const groupType = activeTrip.tripProfile?.group_type
            if (groupType) {
                if (groupType === 'solo_traveler') {
                    next.set('adults', '1')
                    next.set('children', '0')
                    next.set('infants', '0')
                } else if (groupType === 'couple') {
                    next.set('adults', '2')
                    next.set('children', '0')
                    next.set('infants', '0')
                } else if (groupType === 'couple_with_children') {
                    next.set('adults', '2')
                    next.set('children', '1')
                    next.set('infants', '0')
                }
            }
        }

        setSearchParams(next, { replace: true })
    }, [isTripsLoading, activeTrip])

    // Respond to action param to open modals
    useEffect(() => {
        const action = searchParams.get('action')
        if (!action) return
        if (action === 'preferences') {
            setForcedActiveSegment('preferences')
        }
        // Note: filters are now managed inside StaysHeader
        const next = new URLSearchParams(searchParams)
        next.delete('action')
        setSearchParams(next, { replace: true })
    }, [searchParams.get('action')])

    // Sync guest URL params when missing or defaults, but trip data is available
    // Use a ref to track if we've already synced to prevent multiple updates
    const hasSyncedGuests = useRef(false)
    useEffect(() => {
        // Wait for trip data to be loaded
        if (isTripsLoading) return

        // If no active trip, don't set defaults - let them be set elsewhere if needed
        if (!activeTrip) return

        // Only sync once on mount or when trip data first loads
        // Don't sync on every trip data change to prevent navigation throttling
        if (hasSyncedGuests.current) return

        const urlAdults = searchParams.get('adults')
        const urlChildren = searchParams.get('children')
        const urlInfants = searchParams.get('infants')

        // Only attempt to sync guests if we already have some core trip params in the URL
        const hasCoreParams =
            Boolean(searchParams.get('city_id')) ||
            Boolean(searchParams.get('group_type')) ||
            Boolean(searchParams.get('travel_purpose')) ||
            Boolean(searchParams.get('check_in')) ||
            Boolean(searchParams.get('check_out'))

        if (!hasCoreParams) return

        // Check if URL params are defaults (1, 0, 0) - these should be replaced with trip data
        const areDefaults = urlAdults === '1' && urlChildren === '0' && urlInfants === '0'
        const hasUrlGuests = urlAdults || urlChildren || urlInfants

        // If URL params exist and are not defaults, don't override
        if (hasUrlGuests && !areDefaults) {
            hasSyncedGuests.current = true
            return
        }

        const tripGroupSetup = activeTrip.trip_preference?.group_setup
        const groupType = activeTrip.tripProfile?.group_type

        // Only set if we have either group_setup or group_type
        if (!tripGroupSetup && !groupType) return

        const next = new URLSearchParams(searchParams)

        if (tripGroupSetup && !(tripGroupSetup.adults === 0 && tripGroupSetup.children === 0 && tripGroupSetup.infants === 0)) {
            // Use group_setup if available and not all zeros
            next.set('adults', String(tripGroupSetup.adults || 1))
            next.set('children', String(tripGroupSetup.children || 0))
            next.set('infants', String(tripGroupSetup.infants || 0))
            if (tripGroupSetup.children_age && tripGroupSetup.children_age.length > 0) {
                next.set('children_age', tripGroupSetup.children_age.join(','))
            }
        } else if (groupType) {
            // Derive from group_type if group_setup is missing or all zeros
            if (groupType === 'solo_traveler') {
                next.set('adults', '1')
                next.set('children', '0')
                next.set('infants', '0')
            } else if (groupType === 'couple') {
                next.set('adults', '2')
                next.set('children', '0')
                next.set('infants', '0')
            } else if (groupType === 'couple_with_children') {
                next.set('adults', '2')
                next.set('children', '1')
                next.set('infants', '0')
            }
        }

        // Mark as synced before updating URL to prevent re-triggering
        hasSyncedGuests.current = true
        setSearchParams(next, { replace: true })
    }, [isTripsLoading, activeTrip?.trip_id])

    // Prefill filter selections from URL on mount
    useEffect(() => {
        const pts = searchParams.getAll('pt')
        const ptsCsv = (searchParams.get('pt') ?? searchParams.get('property_types') ?? '').split(',').filter(Boolean)
        const initPts = pts.length ? pts : ptsCsv
        if (initPts.length) setSelectedPropertyTypes(initPts)

        const ams = searchParams.getAll('am')
        const amsCsv = (searchParams.get('am') ?? searchParams.get('amenities') ?? '').split(',').filter(Boolean)
        const initAms = ams.length ? ams : amsCsv
        if (initAms.length) setSelectedAmenities(initAms)
    }, [])

    // Effect: react to core search param changes → trigger rates histogram.
    // List queries auto-fire via their queryKey + `enabled: listEnabled` gate
    // once rates complete; no manual refetch / state reset needed.
    useEffect(() => {
        const coreKeys = ['city_id', 'check_in', 'check_out', 'group_type', 'travel_purpose', 'city_prefs']
        const hasCore = coreKeys.every((k) => !!searchParams.get(k))
        if (!hasCore) return
        setRatesData(undefined)
        setRatesLoading(true)
        triggerBackgroundFromURL()
    }, [
        searchParams.get('city_id'),
        searchParams.get('check_in'),
        searchParams.get('check_out'),
        searchParams.get('group_type'),
        searchParams.get('travel_purpose'),
        searchParams.get('city_prefs')
    ])

    // When compare-relevant search params change, clear deals so we re-fetch for new params (not skipped as "already have deals")
    const prevCompareParamsRef = useRef({ checkIn: '', checkOut: '', adults: '', children: '', childrenAge: '' })
    useEffect(() => {
        const checkIn = searchParams.get('check_in') ?? ''
        const checkOut = searchParams.get('check_out') ?? ''
        const adults = searchParams.get('adults') ?? ''
        const children = searchParams.get('children') ?? ''
        const childrenAge = searchParams.get('children_age') ?? ''
        const prev = prevCompareParamsRef.current
        const paramsChanged =
            prev.checkIn !== checkIn ||
            prev.checkOut !== checkOut ||
            prev.adults !== adults ||
            prev.children !== children ||
            prev.childrenAge !== childrenAge
        prevCompareParamsRef.current = { checkIn, checkOut, adults, children, childrenAge }
        if (!checkIn || !checkOut) return
        if (!paramsChanged) return
        setHotelDeals((prev) => (Object.keys(prev).length === 0 ? prev : {}))
        setDealsLoading((prev) => (Object.keys(prev).length === 0 ? prev : {}))
        lastHandpickedDealsKeyRef.current = ''
        handpickedDealsFetchInFlightRef.current = false // Invalidate any in-flight calls from old params
    }, [
        searchParams.get('check_in'),
        searchParams.get('check_out'),
        searchParams.get('adults'),
        searchParams.get('children'),
        searchParams.get('children_age')
    ])

    // Auto-fetch deals for handpicked hotels once per trip/dates/hotel set; no polling or duplicate runs
    useEffect(() => {
        if (!ENABLE_HOTEL_PRICE_COMPARE_DEALS) return
        const checkIn = searchParams.get('check_in')
        const checkOut = searchParams.get('check_out')
        if (handpickedAccommodations.length === 0 || !activeTripId || !checkIn || !checkOut) {
            return
        }
        const ids = handpickedAccommodations
            .map((acc) => acc.zentrum_hub_id || (typeof acc.id === 'string' ? acc.id : acc.id?.toString()) || '')
            .filter(Boolean)
            .sort()
        const adults = searchParams.get('adults') ?? '2'
        const children = searchParams.get('children') ?? '0'
        const childrenAge = searchParams.get('children_age') ?? ''
        const key = `${activeTripId}|${checkIn}|${checkOut}|${adults}|${children}|${childrenAge}|${ids.join(',')}`
        if (handpickedDealsFetchInFlightRef.current) return
        if (lastHandpickedDealsKeyRef.current === key) return
        lastHandpickedDealsKeyRef.current = key
        handpickedDealsFetchInFlightRef.current = true
        void fetchDealsForHandpickedHotels(key).finally(() => {
            handpickedDealsFetchInFlightRef.current = false
        })
    }, [
        handpickedAccommodations,
        activeTripId,
        searchParams.get('check_in'),
        searchParams.get('check_out'),
        searchParams.get('adults'),
        searchParams.get('children'),
        searchParams.get('children_age')
        // fetchDealsForHandpickedHotels
    ])

    // Memoize formattedCityName to prevent unnecessary re-renders
    const formattedCityName = useMemo(
        () =>
            city_name
                ? city_name
                      .split('-')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                : undefined,
        [city_name]
    )
    const scrollToTop = () => {
        const container = mainPageRef.current
        if (!container) return

        container.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    // Infinite scroll: delegate to TanStack's fetchNextPage (stable across renders).
    // TanStack guards against double-fetch and no-next-page internally.
    const { fetchNextPage: fetchNextRegularPage } = regularQuery
    const loadMoreAccommodations = useCallback(async () => {
        try {
            await fetchNextRegularPage()
        } catch (error) {
            toast.error(`Error loading more accommodations: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }, [fetchNextRegularPage])

    // Check visibility of last 3 cards to trigger infinite scroll
    useEffect(() => {
        const container = listContainerRef.current
        if (!container) {
            return
        }
        if (!hasMore) {
            return
        }
        if (isLoadingMore || isLoadingAccommodations) {
            return
        }
        if (accommodations.length === 0) {
            return
        }

        let checkTimeout: NodeJS.Timeout | null = null

        const checkVisibility = () => {
            // Debounce rapid checks
            if (checkTimeout) return

            checkTimeout = setTimeout(() => {
                checkTimeout = null

                const totalCards = cardRefs.current.filter((c) => c !== null).length

                if (totalCards < 3) {
                    return
                }

                // Don't check if already loading a page
                if (regularQuery.isFetchingNextPage) {
                    return
                }

                // Check last 3 cards
                const validCards = cardRefs.current.filter((c) => c !== null)
                const lastThreeCards = validCards.slice(-3)
                const anyVisible = lastThreeCards.some((card) => {
                    if (!card) return false

                    // Simple viewport check
                    const rect = card.getBoundingClientRect()
                    const windowHeight = window.innerHeight
                    const visible = rect.top < windowHeight && rect.bottom > 0

                    return visible
                })

                if (anyVisible) {
                    loadMoreAccommodations()
                }
            }, 100) // 100ms debounce
        }

        // Initial check after a short delay to let DOM settle
        const timeout = setTimeout(() => {
            checkVisibility()
        }, 500)

        // Check on scroll of the list container
        const handleScroll = () => {
            checkVisibility()
        }

        container.addEventListener('scroll', handleScroll)
        window.addEventListener('scroll', handleScroll) // Also listen to window scroll

        return () => {
            clearTimeout(timeout)
            if (checkTimeout) clearTimeout(checkTimeout)
            container.removeEventListener('scroll', handleScroll)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [accommodations.length, hasMore, isLoadingMore, isLoadingAccommodations, loadMoreAccommodations])

    // Handle city selection changes - ONLY updates local state, NOT URL
    const handleCityChange = useCallback((cities: any[]) => {
        if (cities.length > 0) {
            setCityDetails({
                id: cities[0].id,
                name: cities[0].name
            })
        }
    }, [])

    const handleHotelSuggestionSelect = useCallback(
        (item: WhereDimensionItem) => {
            const suggestion = item.raw as HotelSuggestion | undefined
            const referenceId = suggestion?.referenceId || (typeof suggestion?.id === 'string' ? suggestion.id : item.id)
            if (!referenceId) {
                return
            }

            const params = new URLSearchParams(searchParams.toString())
            params.set('hotel_name', suggestion?.name || item.title || '')
            params.set('zentrum_hub_id', referenceId)

            // Set city info if available from suggestion
            if (suggestion?.city) {
                params.set('city_name', suggestion.city)
                params.set('city', suggestion.city)
                params.set('city_id', '')
                // Only clear city_id if we're setting a new city from suggestion
            }

            // Set review type (default to 'complete' if not set)
            if (!params.get('review_type')) {
                params.set('review_type', 'complete')
            }

            // Pass preferences (group_type, travel_purpose, city_prefs)
            const groupType = searchParams.get('group_type')
            if (groupType) {
                params.set('group_type', groupType)
            } else if (!params.get('group_type')) {
                params.set('group_type', 'solo_traveler')
            }

            const travelPurpose = searchParams.get('travel_purpose')
            if (travelPurpose) {
                params.set('travel_purpose', travelPurpose)
            } else if (!params.get('travel_purpose')) {
                params.set('travel_purpose', 'leisure_relaxation')
            }

            const cityPrefs = searchParams.get('city_prefs')
            if (cityPrefs) {
                params.set('city_prefs', cityPrefs)
            }

            // Pass group setup (adults, children, infants, children_age)
            const adults = searchParams.get('adults')
            if (adults) {
                params.set('adults', adults)
            }

            const children = searchParams.get('children')
            if (children) {
                params.set('children', children)
            }

            const infants = searchParams.get('infants')
            if (infants) {
                params.set('infants', infants)
            }

            const childrenAge = searchParams.get('children_age')
            if (childrenAge) {
                params.set('children_age', childrenAge)
            }

            // Pass budget (budget_min, budget_max)
            const budgetMin = searchParams.get('budget_min')
            if (budgetMin) {
                params.set('budget_min', budgetMin)
            }

            const budgetMax = searchParams.get('budget_max')
            if (budgetMax) {
                params.set('budget_max', budgetMax)
            }

            // Pass check-in/check-out dates
            const checkIn = searchParams.get('check_in')
            if (checkIn) {
                params.set('check_in', checkIn)
            }

            const checkOut = searchParams.get('check_out')
            if (checkOut) {
                params.set('check_out', checkOut)
            }

            const detailUrl = `/stays/${referenceId}?${params.toString()}`
            window.open(detailUrl, '_blank')
        },
        [searchParams]
    )

    const hotelAutosuggestDimension = useMemo<WhereDimensionConfig<HotelSuggestion>>(
        () => ({
            id: 'hotel',
            label: 'Hotels',
            type: 'hotel',
            limit: 5,
            closeOnSelect: false,
            search: async ({ query }) => searchHotelSuggestions(query),
            mapItem: (suggestion) => {
                const referenceId = suggestion.referenceId || suggestion.id
                if (!referenceId) {
                    return null
                }
                return {
                    id: referenceId,
                    title: suggestion.name,
                    subtitle: suggestion.fullName,
                    type: 'hotel',
                    meta: {
                        referenceId,
                        city: suggestion.city,
                        country: suggestion.country
                    },
                    raw: suggestion
                }
            },
            onSelect: (item, { closeModal }) => {
                handleHotelSuggestionSelect(item)
                closeModal()
            }
        }),
        [handleHotelSuggestionSelect]
    )

    const toSlug = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

    const promptCitySlug = useMemo(() => {
        const cityFromParams = searchParams.get('city')
        if (cityFromParams && cityFromParams.trim().length > 0) {
            return toSlug(cityFromParams)
        }

        if (formattedCityName && formattedCityName.trim().length > 0) {
            return toSlug(formattedCityName)
        }

        if (cityDetails?.name && cityDetails.name.trim().length > 0) {
            return toSlug(cityDetails.name)
        }

        return null
    }, [searchParams, formattedCityName, cityDetails?.name])

    const promptRequestPayload = useMemo<CityPromptRequestBody | null>(() => {
        if (!promptCitySlug) return null

        const startDate = searchParams.get('check_in')
        const endDate = searchParams.get('check_out')
        if (!startDate || !endDate) return null

        const parseNumber = (value: string | null, fallback: number) => {
            if (!value) return fallback
            const parsed = Number(value)
            return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed
        }

        const adults = parseNumber(searchParams.get('adults'), 1)
        const children = parseNumber(searchParams.get('children'), 0)
        const infants = parseNumber(searchParams.get('infants'), 0)

        const childAges =
            (searchParams.get('children_age') || '')
                .split(',')
                .map((age) => Number(age))
                .filter((age) => !Number.isNaN(age) && age >= 0) || []

        const groupTypeRaw = searchParams.get('group_type')
        const purposeTypeRaw = searchParams.get('travel_purpose')

        const locationPrefsRaw = (searchParams.get('city_prefs') || '').split(',').filter(Boolean)
        const mappedLocationPrefs = locationPrefsRaw.map((pref) => PROMPT_LOCATION_PREFERENCE_MAP[pref] ?? pref).filter(Boolean)

        const payload: CityPromptRequestBody = {
            start_date: startDate,
            end_date: endDate,
            group_setup: {
                adults,
                children,
                infants,
                child_ages: childAges
            }
        }

        const mappedGroupType = groupTypeRaw ? (PROMPT_GROUP_TYPE_MAP[groupTypeRaw] ?? groupTypeRaw) : undefined
        if (mappedGroupType) {
            payload.group_type = mappedGroupType
        }

        const mappedPurposeType = purposeTypeRaw ? (PROMPT_PURPOSE_TYPE_MAP[purposeTypeRaw] ?? purposeTypeRaw) : undefined
        if (mappedPurposeType) {
            payload.purpose_type = mappedPurposeType
        }

        if (mappedLocationPrefs.length) {
            payload.location_preferences = mappedLocationPrefs
        }

        return payload
    }, [promptCitySlug, searchParams])

    const promptPayloadSignature = useMemo(() => (promptRequestPayload ? JSON.stringify(promptRequestPayload) : null), [promptRequestPayload])
    const promptQueryEnabled = Boolean(promptCitySlug && promptRequestPayload)

    const promptQuery = useQuery<CityPromptResponse, Error>({
        queryKey: ['cityPrompts', 'stays', promptCitySlug, promptPayloadSignature],
        queryFn: () => fetchCityPrompts(promptCitySlug!, 'stays', promptRequestPayload!),
        enabled: promptQueryEnabled,
        refetchInterval: (query) => {
            const currentData = query.state.data
            if (!currentData) return 2000
            return currentData.status === 'completed' || currentData.status === 'failed' ? false : 2000
        },
        refetchIntervalInBackground: true,
        staleTime: 0,
        gcTime: 0
    })

    const promptResponse = promptQuery.data
    const isPromptLoading = promptQuery.isLoading
    const promptError = promptQuery.error

    const promptQuestions = promptResponse?.result?.floating_prompt_questions ?? []
    const promptStatus = promptResponse?.status
    const promptErrorMessage =
        promptStatus === 'failed'
            ? 'Could not fetch smart prompts. Please try searching again.'
            : promptError
              ? 'Something went wrong while fetching smart prompts.'
              : null
    const isPromptPolling = promptQueryEnabled && promptStatus !== 'completed' && promptStatus !== 'failed'

    // Handle search button click - fetch accommodations
    const deriveGuestsDefaults = useCallback(() => {
        const tripGroupSetup = travelerTripsContext?.activeTrip?.trip_preference?.group_setup
        if (tripGroupSetup && !(tripGroupSetup.adults == 0 && tripGroupSetup.children == 0 && tripGroupSetup.infants == 0)) {
            return {
                adults: tripGroupSetup.adults ?? 1,
                children: tripGroupSetup.children ?? 0,
                infants: tripGroupSetup.infants ?? 0,
                children_age: tripGroupSetup.children_age ?? []
            }
        }

        const groupType = travelerTripsContext?.activeTrip?.tripProfile?.group_type

        if (!groupType) {
            return null
        }

        if (groupType === 'solo_traveler') {
            return { adults: 1, children: 0, infants: 0, children_age: [] }
        }
        if (groupType === 'couple') {
            return { adults: 2, children: 0, infants: 0, children_age: [] }
        }
        if (groupType === 'couple_with_children') {
            return { adults: 2, children: 1, infants: 0, children_age: [] }
        }

        return null
    }, [travelerTripsContext?.activeTrip?.trip_preference?.group_setup, travelerTripsContext?.activeTrip?.tripProfile?.group_type])

    const handleSearch = useCallback(
        async (params: SearchParams) => {
            const todayStart = getTodayStart()
            const tomorrowStart = new Date(todayStart)
            tomorrowStart.setDate(tomorrowStart.getDate() + 1)

            const userProvidedDateRange = Boolean(params.checkIn || params.checkOut)
            const sanitizedCheckIn = sanitizeDateInput(params.checkIn, todayStart)
            let sanitizedCheckOut = sanitizeDateInput(params.checkOut, todayStart)

            if (sanitizedCheckIn && sanitizedCheckOut && sanitizedCheckOut.getTime() < sanitizedCheckIn.getTime()) {
                sanitizedCheckOut = undefined
            }

            const hasValidDateRange = Boolean(sanitizedCheckIn && sanitizedCheckOut)
            const shouldUseDefaultDates = !userProvidedDateRange

            const checkInDate = hasValidDateRange ? formatDateYMD(sanitizedCheckIn!) : shouldUseDefaultDates ? formatDateYMD(todayStart) : undefined
            const checkOutDate = hasValidDateRange
                ? formatDateYMD(sanitizedCheckOut!)
                : shouldUseDefaultDates
                  ? formatDateYMD(tomorrowStart)
                  : undefined

            // Use defaults if not provided
            const travelPurpose = params.travelPurpose || 'leisure_relaxation'
            const groupType = params.groupType || 'solo_traveler'
            const cityPreferences =
                params.cityPreferences && params.cityPreferences.length > 0 ? params.cityPreferences : ['station_nearby', 'city_center', 'nightlife']
            const guestsData = params.guestsData || deriveGuestsDefaults()
            if (activeTrip && params.cityId && params.cityName) {
                // Check if city exists in final_destination_cities
                const cityExistsInTrip = activeTrip.final_destination_cities?.some((city) => city.id === params.cityId)

                // If city doesn't exist in trip, add it
                if (!cityExistsInTrip && activeTrip.trip_id) {
                    try {
                        const existingCityIds = activeTrip.final_destination_cities?.map((city) => city.id) || []
                        await updateTripPartial(activeTrip.trip_id, {
                            final_destination_cities: [...existingCityIds, params.cityId]
                        })
                    } catch (err) {
                        console.error('Failed to add city to trip destinations', err)
                    }
                }

                // Update city stay preferences if changed
                if (activeTrip.trip_id && cityPreferences.length > 0) {
                    const existingPreferences = activeTrip.trip_preference?.city_wise_preferences?.[params.cityId]?.stays || []
                    const preferencesChanged =
                        existingPreferences.length !== cityPreferences.length || !cityPreferences.every((pref) => existingPreferences.includes(pref))

                    if (preferencesChanged) {
                        try {
                            await updateCityStayPreferences(activeTrip.trip_id, params.cityId, cityPreferences)

                            // Invalidate trips query to refresh trip context with updated preferences
                            // This ensures preferences are reflected when user navigates back to stays
                            try {
                                const userInfo = await TokenStorage.getUserInfo()
                                const travelerId = userInfo?.traveler_id
                                if (travelerId) {
                                    await queryClient.invalidateQueries({ queryKey: ['travelerTrips', travelerId] })
                                }
                            } catch (err) {
                                console.error('Failed to invalidate trips query', err)
                            }
                        } catch (err) {
                            console.error('Failed to update city stay preferences', err)
                        }
                    }
                }

                // Update group_type / travel_purpose if they've changed (not just when missing)
                if (travelerTripsContext?.updateTripPurpose && activeTrip.trip_id) {
                    const profileUpdates: Partial<UpdateTripProfileData> = {}
                    const currentGroupType = activeTrip.tripProfile?.group_type
                    const currentTravelPurpose = activeTrip.tripProfile?.travel_purpose

                    // Update if missing or if changed
                    if (groupType && (!currentGroupType || currentGroupType !== groupType)) {
                        profileUpdates.group_type = groupType
                    }
                    if (travelPurpose && (!currentTravelPurpose || currentTravelPurpose !== travelPurpose)) {
                        profileUpdates.travel_purpose = travelPurpose
                    }

                    if (Object.keys(profileUpdates).length > 0) {
                        try {
                            await travelerTripsContext.updateTripPurpose(profileUpdates as UpdateTripProfileData)
                        } catch (err) {
                            console.error('Failed to update trip profile', err)
                        }
                    }
                }

                // Update group setup if changed
                if (guestsData && travelerTripsContext && activeTrip.trip_id) {
                    const existingSetup = activeTrip.trip_preference?.group_setup
                    const setupChanged =
                        !existingSetup ||
                        existingSetup.adults !== guestsData.adults ||
                        existingSetup.children !== guestsData.children ||
                        existingSetup.infants !== guestsData.infants

                    if (setupChanged) {
                        try {
                            await travelerTripsContext.updateGroupSetup(guestsData)
                        } catch (err) {
                            console.error('Failed to update group setup', err)
                        }
                    }
                }

                // Update itinerary route with dates
                if (activeTrip.tripItinerary?.id && checkInDate && checkOutDate) {
                    const existingRoute = { ...(activeTrip.itineraryRoute || {}) }
                    const existingSegment = existingRoute[params.cityId]
                    const updatedRoute = {
                        ...existingRoute,
                        [params.cityId]: {
                            start_date: checkInDate,
                            end_date: checkOutDate
                        }
                    }

                    const needsUpdate = !existingSegment || existingSegment.start_date !== checkInDate || existingSegment.end_date !== checkOutDate

                    if (needsUpdate) {
                        try {
                            await updateTripItineraryRoute(activeTrip.tripItinerary.id, { route: updatedRoute })
                        } catch (err) {
                            console.error('Failed to update trip itinerary route', err)
                        }
                    }
                }
            }

            // 1) Persist search parameters to URL before kicking off network calls
            const next = new URLSearchParams(searchParams)
            next.set('city', params.cityName || formattedCityName || '')
            if (params.cityId) {
                next.set('city_id', params.cityId)
            }
            if (checkInDate && checkOutDate) {
                next.set('check_in', checkInDate)
                next.set('check_out', checkOutDate)
            } else {
                next.delete('check_in')
                next.delete('check_out')
            }
            next.set('group_type', groupType)
            next.set('travel_purpose', travelPurpose)
            next.set('city_prefs', cityPreferences.join(','))
            // Add guests data to URL
            if (guestsData) {
                next.set('adults', String(guestsData.adults))
                next.set('children', String(guestsData.children))
                next.set('infants', String(guestsData.infants))
                if (guestsData.children_age && guestsData.children_age.length > 0) {
                    next.set('children_age', guestsData.children_age.join(','))
                }
            }
            // Add budget/price range to URL if provided
            if (params.priceRange) {
                next.set('budget_min', String(Math.floor(params.priceRange.min)))
                next.set('budget_max', String(Math.ceil(params.priceRange.max)))
            }
            // default order_by to relevance if not set
            if (!next.get('order_by')) next.set('order_by', JSON.stringify({ relevance: -1 }))
            // also persist property types & amenities if already present on URL (from filters)
            if (searchParams.get('pt')) next.set('pt', searchParams.get('pt')!)
            if (searchParams.get('property_types')) next.set('property_types', searchParams.get('property_types')!)
            if (searchParams.get('am')) next.set('am', searchParams.get('am')!)
            if (searchParams.get('amenities')) next.set('amenities', searchParams.get('amenities')!)
            setSearchParams(next, { replace: true })
        },
        [activeTrip, formattedCityName, searchParams, setSearchParams, queryClient, travelerTripsContext]
    )

    const mapToCardData = useCallback(
        (acc: any, index: number, source: 'handpicked' | 'regular') => {
            const key = getAccommodationKey(acc, `${source}-${index}`)
            const zentrumHubId = key
            const accommodationId = typeof acc.id === 'string' ? acc.id : acc.id?.toString() || ''

            const backendRate = acc.rate_per_night ?? acc.estimated_rate ?? null
            const backendHasPrice = typeof backendRate === 'number' && backendRate > 0
            // checkAvailibility top-up: when filters are active, unpriced cards
            // fall back to the checkAvailability batch. `undefined` = not yet
            // fetched (still loading); `null` = backend confirmed no rate.
            const checkAvailibilityPrice = zentrumHubId ? checkAvailibilityPrices[zentrumHubId] : undefined
            const ratePerNight = backendHasPrice
                ? backendRate
                : (typeof checkAvailibilityPrice === 'number' ? checkAvailibilityPrice : null)
            const hasValidPrice = typeof ratePerNight === 'number' && ratePerNight > 0
            const isPriceLoading = !backendHasPrice && hasActiveFilters && !!zentrumHubId
                && !(zentrumHubId in checkAvailibilityPrices) && isFetchingCheckAvailibilityPrices
            const isPriceUnavailable = !hasValidPrice && !isPriceLoading

            const guestsDataFromParams = (() => {
                const adultsParam = searchParams.get('adults')
                const childrenParam = searchParams.get('children')
                const infantsParam = searchParams.get('infants')
                const childrenAgeParam = searchParams.get('children_age')

                if (!adultsParam && !childrenParam && !infantsParam && !childrenAgeParam) {
                    return undefined
                }

                const parseCount = (value: string | null, fallback: number) => {
                    if (value === null || value === '') return fallback
                    const parsed = parseInt(value, 10)
                    return Number.isFinite(parsed) ? parsed : fallback
                }

                const childAges =
                    childrenAgeParam
                        ?.split(',')
                        .map((age) => parseInt(age, 10))
                        .filter((age) => !Number.isNaN(age)) ?? []

                return {
                    adults: parseCount(adultsParam, 1),
                    children: parseCount(childrenParam, 0),
                    infants: parseCount(infantsParam, 0),
                    children_age: childAges
                }
            })()

            const onAddToCollection: (() => void) | false =
                 accommodationId
                    ? () => {
                          setAddToCollectionModalOpen(accommodationId)
                      }
                    : false

            return {
                id: index + 1,
                title: acc.name || 'Hotel',
                price: Math.round(ratePerNight || 0),
                image: acc.content?.[0] || HOTEL_IMAGES[index % HOTEL_IMAGES.length],
                images: acc.content || [],
                platformReviews: acc.review_data?.platform_reviews || [],
                locationTag: acc.review_data?.location_tags?.[0] || '',
                curatedLabels: acc.curated_labels || [],
                overallRating: acc.overall_rating,
                zentrumHubId: zentrumHubId || undefined,
                mapKey: key,
                cityId: cityDetails?.id || searchParams.get('city_id') || undefined,
                cityName: formattedCityName,
                checkIn: searchParams.get('check_in') || '',
                checkOut: searchParams.get('check_out') || '',
                travelPurpose: searchParams.get('travel_purpose') || 'leisure_relaxation',
                groupType: searchParams.get('group_type') || 'solo_traveler',
                preferences: (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean),
                guestsData: guestsDataFromParams,
                occupancies: (() => {
                    const raw = searchParams.get('occupancies')
                    return raw ? decodeOccupancies(raw) : undefined
                })(),
                reviewType: 'complete',
                isPriceLoading,
                isPriceUnavailable,
                onAddToCollection,
                isVerified: acc.is_verified || false,
                isB2bDealAvailable: acc.is_b2b_deal_available || false,
                isAvailableOnAirbnb: acc.is_available_on_airbnb || false
            }
        },
        [
            cityDetails?.id,
            formattedCityName,
            searchParams,
            setAddToCollectionModalOpen,
            isRimigoInternal,
            checkAvailibilityPrices,
            hasActiveFilters,
            isFetchingCheckAvailibilityPrices,
        ]
    )

    // Map accommodations to card props
    const stays = useMemo(() => accommodations.map((acc, index) => mapToCardData(acc, index, 'regular')), [accommodations, mapToCardData])
    const handpickedStays = useMemo(
        () => handpickedAccommodations.map((acc, index) => mapToCardData(acc, index, 'handpicked')),
        [handpickedAccommodations, mapToCardData]
    )

    // Handler for when a marker is clicked on the map
    const handleMarkerClick = useCallback(
        (accommodationId: string | number) => {
            const key = String(accommodationId)
            const container = listContainerRef.current
            if (!container) {
                setHoveredAccommodationId(key)
                setTimeout(() => setHoveredAccommodationId(null), 2000)
                return
            }

            const findCardElement = () => {
                const handpickedIndex = handpickedAccommodations.findIndex((acc, idx) => getAccommodationKey(acc, `handpicked-${idx}`) === key)
                if (handpickedIndex !== -1 && handpickedCardRefs.current[handpickedIndex]) {
                    return handpickedCardRefs.current[handpickedIndex]
                }
                const regularIndex = accommodations.findIndex((acc, idx) => getAccommodationKey(acc, `regular-${idx}`) === key)
                if (regularIndex !== -1 && cardRefs.current[regularIndex]) {
                    return cardRefs.current[regularIndex]
                }
                return null
            }

            const card = findCardElement()
            if (!card) {
                setHoveredAccommodationId(key)
                setTimeout(() => setHoveredAccommodationId(null), 2000)
                return
            }

            const cardTop = card.offsetTop
            const containerHeight = container.clientHeight
            const cardHeight = card.clientHeight
            const headerOffset = 100
            const targetPosition = cardTop - headerOffset - (containerHeight - cardHeight) / 2

            container.scrollTo({ top: targetPosition, behavior: 'smooth' })

            setHoveredAccommodationId(key)
            setTimeout(() => setHoveredAccommodationId(null), 2000)
        },
        [accommodations, handpickedAccommodations, getAccommodationKey]
    )

    // Trigger map to focus/orbit specific accommodation and mimic marker click
    const handleCardView3D = useCallback(
        (key: string | undefined) => {
            if (!key) return
            setHoveredAccommodationId(key)
            try {
                const evt = new CustomEvent('stays:focusMarker', { detail: { id: key } as any })
                window.dispatchEvent(evt)
            } catch {
                // ignore
            }
            handleMarkerClick(key)
        },
        [handleMarkerClick]
    )
    useEffect(() => {
        handleHandpickedScroll()
    }, [handpickedStays.length])

    // Determine if landing overlay state should be shown (missing any core param)
    const hasRequiredParams = (() => {
        const cityIdOk = !!searchParams.get('city_id')
        const checkInOk = !!searchParams.get('check_in')
        const checkOutOk = !!searchParams.get('check_out')
        const groupTypeOk = !!searchParams.get('group_type')
        const travelPurposeOk = !!searchParams.get('travel_purpose')
        const prefs = (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean)
        const prefsOk = prefs.length > 0
        return cityIdOk && checkInOk && checkOutOk && groupTypeOk && travelPurposeOk && prefsOk
    })()
    const showLandingState = !hasRequiredParams

    // Show loader when rates are loading or not completed yet
    // Handle both 'processing' and 'in_progress' status values
    const isRatesReady = ratesData?.status === 'completed' || ratesData?.status === 'estimated'
    const isRatesTimeout = ratesData?.status === 'timeout'
    const histogramTimeoutImage = 'https://media.rimigo.com/1764317790574_e330b14ed6945192a56a1511edc03ad9.png'
    const showRatesLoader =
        hasRequiredParams && !isRatesTimeout && !ratesNoHotelsFound && (ratesLoading || !ratesData || !isRatesReady)

    const handlePromptSelect = useCallback((prompt: string) => {
        void triggerAssistantPrompt(prompt)
    }, [])

    const SCROLL_THRESHOLD = 50

    useEffect(() => {
        if (showRatesLoader) return

        const handleScroll = (e: Event) => {
            const container = e.target as HTMLElement
            if (!container) return

            const currentScrollY = container.scrollTop

            // Header visibility logic
            if (currentScrollY <= SCROLL_THRESHOLD) {
                setShowMobileSearch(true)
            } else {
                setShowMobileSearch(false)
            }

            // Scroll-to-top arrow visibility
            setShowScrollTop(currentScrollY > SCROLL_THRESHOLD)
        }

        const timer = setTimeout(() => {
            const container = mainPageRef.current
            if (container) {
                container.addEventListener('scroll', handleScroll, { passive: true })
            }
        }, 100)

        return () => {
            clearTimeout(timer)
            const container = mainPageRef.current
            if (container) {
                container.removeEventListener('scroll', handleScroll)
            }
        }
    }, [showRatesLoader]) // Re-run when loader state changes

    // Reset mobile search visibility when landing state changes or rates loader appears
    useEffect(() => {
        if (showLandingState || showRatesLoader) {
            setShowMobileSearch(true)
            lastScrollY.current = 0
        }
    }, [showLandingState, showRatesLoader])
    const parseDateSafe = (value?: string | null) => {
        if (!value) return undefined
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? undefined : parsed
    }

    // Determine first missing segment for the search bar
    const firstMissingSegment: 'where' | 'when' | 'guests' | 'preferences' | null = (() => {
        if (!searchParams.get('city_id')) return 'where'
        if (!searchParams.get('check_in') || !searchParams.get('check_out')) return 'when'
        if (!searchParams.get('adults')) return 'guests'
        const groupTypeOk = !!searchParams.get('group_type')
        const travelPurposeOk = !!searchParams.get('travel_purpose')
        const prefs = (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean)
        const prefsOk = prefs.length > 0
        if (!groupTypeOk || !travelPurposeOk || !prefsOk) return 'preferences'
        return null
    })()

    // Clear forced active segment when landing state is dismissed
    useEffect(() => {
        if (!showLandingState && forcedActiveSegment) {
            // Clear after a short delay to allow the segment to activate first
            const timeout = setTimeout(() => {
                setForcedActiveSegment(null)
            }, 300)
            return () => clearTimeout(timeout)
        }
    }, [showLandingState, forcedActiveSegment])


    // Compute initial values for SearchHeader configs based on cityDetails and activeTrip
    // This allows pre-filling without updating the URL
    const fallbackGuests = useMemo(() => deriveGuestsDefaults(), [deriveGuestsDefaults])

    const searchHeaderInitialValues = useMemo(() => {
        const defaults = {
            checkIn: parseDateSafe(searchParams.get('check_in')),
            checkOut: parseDateSafe(searchParams.get('check_out')),
            groupType: searchParams.get('group_type') || undefined,
            travelPurpose: searchParams.get('travel_purpose') || undefined,
            locationPreferences: (() => {
                const csv = (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean)
                const allowedPrefs = new Set(STAYS_LOCATION_PREFERENCES.map((p) => p.value))
                return csv.filter((p) => allowedPrefs.has(p))
            })(),
            guestsData: (() => {
                // Priority: URL params > fallbackGuests (trip group_setup > derive from group_type)
                const urlAdults = searchParams.get('adults')
                const urlChildren = searchParams.get('children')
                const urlInfants = searchParams.get('infants')

                if (urlAdults || urlChildren || urlInfants) {
                    // Use URL params if they exist
                    return {
                        adults: parseInt(urlAdults || '1', 10) || 1,
                        children: parseInt(urlChildren || '0', 10) || 0,
                        infants: parseInt(urlInfants || '0', 10) || 0,
                        children_age: (searchParams.get('children_age') ?? '')
                            .split(',')
                            .filter(Boolean)
                            .map((age) => parseInt(age, 10))
                    }
                }

                // Otherwise use fallbackGuests (trip group_setup > derive from group_type)
                return (
                    fallbackGuests || {
                        adults: 1,
                        children: 0,
                        infants: 0,
                        children_age: []
                    }
                )
            })()
        }

        if (!activeTrip) {
            return defaults
        }

        const cityIdFromParams = searchParams.get('city_id') || undefined
        const cityIdFromDetails = cityDetails?.id
        const cityNameFromDetails = cityDetails?.name
        const fallbackCityId = activeTrip.final_destination_cities?.[0]?.id

        let resolvedCityId = cityIdFromDetails || cityIdFromParams || fallbackCityId
        let resolvedCityName = cityNameFromDetails || formattedCityName || activeTrip.final_destination_cities?.[0]?.name

        if (!resolvedCityId && resolvedCityName) {
            const matchedByName = activeTrip.final_destination_cities?.find((city) => city.name.toLowerCase() === resolvedCityName?.toLowerCase())
            if (matchedByName) {
                resolvedCityId = matchedByName.id
                resolvedCityName = matchedByName.name
            }
        }

        let itinerarySegment = resolvedCityId ? activeTrip.itineraryRoute?.[resolvedCityId] : undefined

        if (!itinerarySegment && resolvedCityName) {
            const matchedCity = activeTrip.final_destination_cities?.find((city) => city.name.toLowerCase() === resolvedCityName?.toLowerCase())
            if (matchedCity) {
                resolvedCityId = matchedCity.id
                itinerarySegment = activeTrip.itineraryRoute?.[matchedCity.id]
            }
        }

        if (!itinerarySegment && activeTrip.itineraryRoute && cityIdFromDetails && activeTrip.itineraryRoute[cityIdFromDetails]) {
            resolvedCityId = cityIdFromDetails
            itinerarySegment = activeTrip.itineraryRoute[cityIdFromDetails]
        }

        const cityWisePrefs = resolvedCityId ? activeTrip.trip_preference?.city_wise_preferences?.[resolvedCityId] : undefined

        // Guests data: defaults.guestsData already has correct priority (URL params > trip group_setup > derive from group_type)
        const guestsData = defaults.guestsData

        const allowedPrefs = new Set(STAYS_LOCATION_PREFERENCES.map((p) => p.value))
        const urlLocationPrefs = defaults.locationPreferences.filter((p) => allowedPrefs.has(p))
        const tripLocationPrefs = Array.isArray(cityWisePrefs?.stays) ? cityWisePrefs.stays.filter((p) => allowedPrefs.has(p)) : []
        const cityIdFromUrl = cityIdFromParams || undefined
        const hasUrlCityMatch = Boolean(cityIdFromUrl && resolvedCityId && cityIdFromUrl === resolvedCityId)
        const shouldPreferTripPrefs = Boolean(resolvedCityId) && !hasUrlCityMatch
        const resolvedLocationPrefs = shouldPreferTripPrefs
            ? tripLocationPrefs.length > 0
                ? tripLocationPrefs
                : urlLocationPrefs
            : urlLocationPrefs.length > 0
              ? urlLocationPrefs
              : tripLocationPrefs

        return {
            checkIn: defaults.checkIn ?? (itinerarySegment?.start_date ? parseDateSafe(itinerarySegment.start_date) : undefined),
            checkOut: defaults.checkOut ?? (itinerarySegment?.end_date ? parseDateSafe(itinerarySegment.end_date) : undefined),
            groupType: activeTrip.tripProfile?.group_type || defaults.groupType,
            travelPurpose: activeTrip.tripProfile?.travel_purpose || defaults.travelPurpose,
            locationPreferences: resolvedLocationPrefs,
            guestsData
        }
    }, [activeTrip, cityDetails, formattedCityName, searchParams, fallbackGuests])

    // Memoize priceData to prevent unnecessary re-renders during polling
    const priceData = useMemo(() => {
        if (ratesData?.status === 'completed' || ratesData?.status === 'estimated') {
            return ratesData
        }
        return {
            bucket_size: 0,
            buckets: [],
            total_hotels: 0,
            min_rate: 0,
            max_rate: 0,
            check_in_date: '',
            check_out_date: '',
            status: ratesLoading ? 'processing' : (ratesData?.status ?? 'processing')
        }
    }, [ratesData, ratesLoading])

    // Map markers come from the loaded list pages (handpicked + paginated).
    // We dropped the bulk `/accommodations/metadata/list/` call — list response
    // already carries geo_location per hotel, so pins follow the loaded list
    // as the user scrolls/filters instead of pre-fetching up to 300 markers.
    const mapAccommodations = useMemo(() => {
        const seen = new Set<string>()
        const result: Array<{
            id: string; name: string; geo_location: any; overall_rating: number | undefined
            rate_per_night: number | undefined; content: any; review_data: any
            zentrum_hub_id?: string; accommodation_id?: string
            is_verified?: boolean; is_b2b_deal_available?: boolean; is_available_on_airbnb?: boolean
        }> = []

        const addItem = (item: any) => {
            if (!item) return
            const key = getAccommodationKey(item)
            if (!key || seen.has(key)) return
            const geo = item.geo_location
            const rawLat = geo?.lat ?? geo?.latitude ?? null
            const rawLng = geo?.long ?? geo?.lng ?? null
            const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat ?? '')
            const lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng ?? '')
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
            const rate = item.rate_per_night
            const ratePerNight = rate && rate > 0 ? rate : undefined

            seen.add(key)
            result.push({
                id: key, name: item.name,
                geo_location: { lat: String(lat), long: String(lng) },
                overall_rating: item.overall_rating,
                rate_per_night: ratePerNight,
                content: item.content,
                review_data: item.review_data,
                zentrum_hub_id: item.zentrum_hub_id,
                accommodation_id: item.accommodation?.id ?? item.accommodation_id,
                is_verified: item.is_verified || false,
                is_b2b_deal_available: item.is_b2b_deal_available || false,
                is_available_on_airbnb: item.is_available_on_airbnb || false
            })
        }

        handpickedAccommodations.forEach(addItem)
        accommodations.forEach(addItem)

        return result
    }, [handpickedAccommodations, accommodations, getAccommodationKey])

    const loaderPreferences = useMemo(() => {
        const adults = parseInt(searchParams.get('adults') || '0', 10)
        const children = parseInt(searchParams.get('children') || '0', 10)
        const infants = parseInt(searchParams.get('infants') || '0', 10)
        const childAges = (searchParams.get('children_age') || '')
            .split(',')
            .map((age) => parseInt(age, 10))
            .filter((age) => !Number.isNaN(age))

        const guestSummaryPieces: string[] = []
        if (adults > 0) {
            guestSummaryPieces.push(`${adults} adult${adults > 1 ? 's' : ''}`)
        }
        if (children > 0) {
            const agesLabel = childAges.length ? ` (ages ${childAges.join(', ')})` : ''
            guestSummaryPieces.push(`${children} child${children > 1 ? 'ren' : ''}${agesLabel}`)
        }
        if (infants > 0) {
            guestSummaryPieces.push(`${infants} infant${infants > 1 ? 's' : ''}`)
        }

        const formatCurrency = (value: number) =>
            value.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            })

        const budgetMin = searchParams.get('budget_min')
        const budgetMax = searchParams.get('budget_max')
        const minValue = budgetMin ? Number(budgetMin) : undefined
        const maxValue = budgetMax ? Number(budgetMax) : undefined

        let budgetSummary: string | undefined
        if (minValue && maxValue) {
            budgetSummary = `${formatCurrency(minValue)} - ${formatCurrency(maxValue)}`
        } else if (minValue) {
            budgetSummary = `Min ${formatCurrency(minValue)}`
        } else if (maxValue) {
            budgetSummary = `Up to ${formatCurrency(maxValue)}`
        }

        const locationPreferences = (searchParams.get('city_prefs') || '').split(',').filter(Boolean)

        return {
            guestSummary: guestSummaryPieces.join(' • ') || undefined,
            groupType: searchParams.get('group_type') || undefined,
            travelPurpose: searchParams.get('travel_purpose') || undefined,
            locationPreferences,
            budgetSummary
        }
    }, [searchParams])

    const countryId = activeTrip?.final_destination_countries?.[0]?.id
    const hasCountry = Boolean(countryId)
    const { isCountryLive, selectedCountry } = useCountryLiveStatus({ countryId: countryId, shouldUsePrioritized })

    if (isMobile && showLandingState) {
        return (
            <div>
                <StaysZeroState
                    iconSrc={showLandingState ? 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png' : ''}
                    wishlistConfig={{
                        enabled: false
                    }}
                    headerType="stays"
                    onSearch={handleSearch}
                    whereConfig={{
                        enabled: true,
                        required: true,
                        label: 'Where',
                        placeholder: 'Search cities',
                        multiselect: false,
                        initialData:
                            searchParams.get('city_id') && searchParams.get('city')
                                ? [
                                      {
                                          id: searchParams.get('city_id')!,
                                          name: formattedCityName || searchParams.get('city')!
                                      }
                                  ]
                                : undefined,
                        onChange: handleCityChange,
                        dimensions: [hotelAutosuggestDimension],
                        searchMatchesHeading: 'Cities',
                        customSearchCities: searchCitiesGlobal
                    }}
                    whenConfig={{
                        enabled: true,
                        required: true,
                        label: 'When',
                        placeholder: 'Add dates',
                        type: 'date_range',
                        initialCheckIn: searchHeaderInitialValues.checkIn,
                        initialCheckOut: searchHeaderInitialValues.checkOut
                    }}
                    preferencesConfig={{
                        enabled: true,
                        required: true,
                        label: 'Preferences',
                        placeholder: 'Add preferences',
                        initialGroupType: searchHeaderInitialValues.groupType,
                        initialTravelPurpose: searchHeaderInitialValues.travelPurpose,
                        initialLocationPreferences: searchHeaderInitialValues.locationPreferences,
                        budgetConfig: {
                            enabled: true,
                            metadata: priceData,
                            initialPriceRange: (() => {
                                const budgetMin = searchParams.get('budget_min')
                                const budgetMax = searchParams.get('budget_max')
                                if (budgetMin && budgetMax) {
                                    return {
                                        min: Number(budgetMin),
                                        max: Number(budgetMax)
                                    }
                                }
                                return undefined
                            })()
                        }
                    }}
                    guestsConfig={{
                        enabled: true,
                        required: true,
                        label: 'Guests',
                        placeholder: 'Add guests',
                        initialData: searchHeaderInitialValues.guestsData
                    }}
                    locationPreferences={STAYS_LOCATION_PREFERENCES}
                />
            </div>
        )
    }

    return (
        <>
            <ReactHelmet title={`${formattedCityName || 'Rimigo | '} Stays`} />

            <div
                className=" md:min-h-screen bg-natural-white relative max-md:overflow-y-auto"
                ref={mainPageRef}
                data-scroll-container>
                <div className="block md:hidden">
                    <MobileCompleteHeaderWithSearch
                        showSearchBar={showMobileSearch}
                        iconSrc={showLandingState ? 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png' : ''}
                        title="Stays"
                        wishlistConfig={{
                            enabled: false
                        }}
                        headerType="stays"
                        onSearch={handleSearch}
                        whereConfig={{
                            enabled: true,
                            required: true,
                            label: 'Where',
                            placeholder: 'Search cities',
                            multiselect: false,
                            initialData:
                                searchParams.get('city_id') && searchParams.get('city')
                                    ? [
                                          {
                                              id: searchParams.get('city_id')!,
                                              name: formattedCityName || searchParams.get('city')!
                                          }
                                      ]
                                    : undefined,
                            onChange: handleCityChange,
                            dimensions: [hotelAutosuggestDimension],
                            searchMatchesHeading: 'Cities',
                            customSearchCities: searchCitiesGlobal
                        }}
                        whenConfig={{
                            enabled: true,
                            required: true,
                            label: 'When',
                            placeholder: 'Add dates',
                            type: 'date_range',
                            initialCheckIn: searchHeaderInitialValues.checkIn,
                            initialCheckOut: searchHeaderInitialValues.checkOut
                        }}
                        preferencesConfig={{
                            enabled: true,
                            required: true,
                            label: 'Preferences',
                            placeholder: 'Add preferences',
                            initialGroupType: searchHeaderInitialValues.groupType,
                            initialTravelPurpose: searchHeaderInitialValues.travelPurpose,
                            initialLocationPreferences: searchHeaderInitialValues.locationPreferences,
                            budgetConfig: {
                                enabled: true,
                                metadata: priceData,
                                initialPriceRange: (() => {
                                    const budgetMin = searchParams.get('budget_min')
                                    const budgetMax = searchParams.get('budget_max')
                                    if (budgetMin && budgetMax) {
                                        return {
                                            min: Number(budgetMin),
                                            max: Number(budgetMax)
                                        }
                                    }
                                    return undefined
                                })()
                            }
                        }}
                        guestsConfig={{
                            enabled: true,
                            required: true,
                            label: 'Guests',
                            placeholder: 'Add guests',
                            initialData: searchHeaderInitialValues.guestsData
                        }}
                        locationPreferences={STAYS_LOCATION_PREFERENCES}
                    />
                </div>
                <div className="sticky top-0 z-50 bg-natural-white">
                    <MobileStaysTabHeader
                        activeTab={mobileActiveTab}
                        onTabChange={setMobileActiveTab}
                        filterConfig={{
                            enabled: true,
                            type: 'stays',
                            metadata: {
                                propertyTypes: propertyTypes,
                                amenities: allAmenities,
                                showVerificationFilters: isRimigoInternal
                            },
                            initialData: {
                                selectedPropertyTypes: selectedPropertyTypes,
                                selectedAmenities: selectedAmenities,
                                isVerified: searchParams.get('is_verified') === 'true' ? true : null,
                                isB2bDealAvailable: searchParams.get('is_b2b_deal_available') === 'true' ? true : null
                            },
                            onChange: () => {},
                            onApply: (result) => {
                                const next = new URLSearchParams(searchParams)
                                // Property types
                                setSelectedPropertyTypes(result.propertyTypes)
                                next.delete('pt')
                                next.delete('property_types')
                                if (result.propertyTypes.length) {
                                    result.propertyTypes.forEach((t: string) => next.append('pt', t))
                                    result.propertyTypes.forEach((t: string) => next.append('property_types', t))
                                }
                                // Amenities
                                setSelectedAmenities(result.amenities)
                                next.delete('am')
                                next.delete('amenities')
                                if (result.amenities.length) {
                                    result.amenities.forEach((a: string) => next.append('am', a))
                                    result.amenities.forEach((a: string) => next.append('amenities', a))
                                }
                                // Verification filters
                                next.delete('is_verified')
                                next.delete('is_b2b_deal_available')
                                if (result.isVerified === true) next.set('is_verified', 'true')
                                if (result.isB2bDealAvailable === true) next.set('is_b2b_deal_available', 'true')
                                setSearchParams(next, { replace: true })
                            },
                            onClear: () => {
                                const next = new URLSearchParams(searchParams)
                                next.delete('pt')
                                next.delete('property_types')
                                next.delete('am')
                                next.delete('amenities')
                                next.delete('is_verified')
                                next.delete('is_b2b_deal_available')
                                setSelectedPropertyTypes([])
                                setSelectedAmenities([])
                                setSearchParams(next, { replace: true })
                            }
                        }}
                        // Sort configuration
                        sortConfig={{
                            enabled: true,
                            type: 'stays',
                            metadata: {
                                sortOptions: [
                                    {
                                        id: 'relevance',
                                        label: 'Relevance',
                                        description: 'Best match for your search',
                                        orderBy: { relevance: -1 }
                                    },
                                    {
                                        id: 'price_low',
                                        label: 'Price: Low to High',
                                        description: 'Lowest price first',
                                        orderBy: { rate: 1 }
                                    },
                                    {
                                        id: 'price_high',
                                        label: 'Price: High to Low',
                                        description: 'Highest price first',
                                        orderBy: { rate: -1 }
                                    }
                                ]
                            },
                            initialData: {
                                currentOrderBy: currentOrderBy
                            },
                            onChange: () => {
                                // Optional: Real-time preview (not needed for sort)
                            },
                            onApply: (result) => {
                                // Commit sort change to URL when a sort option is selected
                                const next = new URLSearchParams(searchParams)
                                next.set('order_by', JSON.stringify(result.orderBy))
                                setSearchParams(next, { replace: true })
                            }
                        }}
                    />
                </div>

                {showLandingState && !hasCountry && (
                    <LandingOverlay
                        cards={LANDING_DUMMY_CARDS}
                        formattedCityName={formattedCityName}
                    />
                )}
                {showGuide && stays.length > 0 && (
                    <>
                        <div className={`absolute inset-0 z-50 ${showGuide ? 'bg-black/70' : 'bg-natural-white/70'}`} />

                        <div className="absolute top-24 right-0 z-50 w-[20%] pointer-events-auto">
                            <div className="relative flex justify-end">
                                <GuideTipperModal
                                    onClose={handleCloseGuide}
                                    position="bottom"
                                    title="No trips yet"
                                    subtitle="Create one to save stays and searches."
                                    highlight={['Create', 'save']}
                                    showTriangle={true}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Header */}
                <SearchHeader
                    showOverlay={false}
                    setCriteriaModalClosed={() => setSmartSearchModal(true)}
                    iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'}
                    pageName="Stays"
                    onSearch={handleSearch}
                    initialActiveSegment={forcedActiveSegment ?? (showLandingState ? firstMissingSegment : null)}
                    // Segment configurations with initial values and onChange callbacks
                    whereConfig={{
                        enabled: true,
                        required: true,
                        label: 'Where',
                        placeholder: 'Search cities',
                        multiselect: false,
                        // initialData should come from URL, not from cityDetails
                        // cityDetails is updated by onChange, creating a circular dependency
                        initialData:
                            searchParams.get('city_id') && searchParams.get('city')
                                ? [
                                      {
                                          id: searchParams.get('city_id')!,
                                          name: formattedCityName || searchParams.get('city')!
                                      }
                                  ]
                                : undefined,
                        onChange: handleCityChange,
                        dimensions: [hotelAutosuggestDimension],
                        searchMatchesHeading: 'Cities',
                        customSearchCities: searchCitiesGlobal,
                        renderDropdown: ActivitiesSearchDropdown
                    }}
                    whenConfig={{
                        enabled: true,
                        required: true,
                        label: 'When',
                        placeholder: 'Add dates',
                        type: 'date_range',
                        initialCheckIn: searchHeaderInitialValues.checkIn,
                        initialCheckOut: searchHeaderInitialValues.checkOut
                    }}
                    guestsConfig={{
                        enabled: true,
                        required: true,
                        label: 'Guests',
                        placeholder: 'Add guests',
                        initialData: searchHeaderInitialValues.guestsData
                    }}
                    preferencesConfig={{
                        enabled: true,
                        required: true,
                        label: 'Preferences',
                        placeholder: 'Add preferences',
                        initialGroupType: searchHeaderInitialValues.groupType,
                        initialTravelPurpose: searchHeaderInitialValues.travelPurpose,
                        initialLocationPreferences: searchHeaderInitialValues.locationPreferences,
                        budgetConfig: {
                            enabled: true,
                            metadata: priceData,
                            initialPriceRange: (() => {
                                const budgetMin = searchParams.get('budget_min')
                                const budgetMax = searchParams.get('budget_max')
                                if (budgetMin && budgetMax) {
                                    return {
                                        min: Number(budgetMin),
                                        max: Number(budgetMax)
                                    }
                                }
                                return undefined
                            })()
                        }
                        // Note: No onChange handler - ALL preferences (groupType, travelPurpose, locationPreferences, priceRange)
                        // are only applied on search click to prevent navigation blocking and URL update throttling
                    }}
                    locationPreferences={STAYS_LOCATION_PREFERENCES}
                    // Assistant configuration - only enable if agent ID is loaded and required fields are present
                    assistantConfig={{
                        enabled:
                            !isAgentIdLoading && !!agentId && !!cityDetails?.id && !!searchParams.get('check_in') && !!searchParams.get('check_out'),
                        ataId: agentId,
                        tripId: searchParams.get('trip_id') || undefined,
                        assistantType: 'HotelSmartSearch',
                        entityType: 'city_id',
                        entityId: cityDetails?.id || '',
                        inputData: {
                            cityName: city_name || undefined,
                            selectedCityId: cityDetails?.id,
                            groupType: searchParams.get('group_type') || undefined,
                            travelPurpose: searchParams.get('travel_purpose') || undefined,
                            checkIn: searchParams.get('check_in') || undefined,
                            checkOut: searchParams.get('check_out') || undefined,
                            cityPreferences: (searchParams.get('city_prefs') ?? '').split(',').filter(Boolean),
                            budgetRange:
                                searchParams.get('budget_min') || searchParams.get('budget_max')
                                    ? {
                                          min: searchParams.get('budget_min') ? Number(searchParams.get('budget_min')) : undefined,
                                          max: searchParams.get('budget_max') ? Number(searchParams.get('budget_max')) : undefined
                                      }
                                    : undefined,
                            adults: searchParams.get('adults') ? Number(searchParams.get('adults')) : undefined,
                            children: searchParams.get('children') ? Number(searchParams.get('children')) : undefined,
                            infants: searchParams.get('infants') ? Number(searchParams.get('infants')) : undefined,
                            children_age: (searchParams.get('children_age') ?? '')
                                .split(',')
                                .filter(Boolean)
                                .map((age) => Number(age))
                                .filter((age) => !Number.isNaN(age))
                        }
                    }}
                    wishlistConfig={{
                        enabled: false
                    }}
                    // Filter configuration
                    filterConfig={{
                        enabled: true,
                        type: 'stays',
                        metadata: {
                            propertyTypes: propertyTypes,
                            amenities: allAmenities,
                            showVerificationFilters: isRimigoInternal
                        },
                        initialData: {
                            selectedPropertyTypes: selectedPropertyTypes,
                            selectedAmenities: selectedAmenities,
                            isVerified: searchParams.get('is_verified') === 'true' ? true : null,
                            isB2bDealAvailable: searchParams.get('is_b2b_deal_available') === 'true' ? true : null
                        },
                        onChange: () => {},
                        onApply: (result) => {
                            const next = new URLSearchParams(searchParams)
                            setSelectedPropertyTypes(result.propertyTypes)
                            next.delete('pt')
                            next.delete('property_types')
                            if (result.propertyTypes.length) {
                                result.propertyTypes.forEach((t: string) => next.append('pt', t))
                                result.propertyTypes.forEach((t: string) => next.append('property_types', t))
                            }
                            setSelectedAmenities(result.amenities)
                            next.delete('am')
                            next.delete('amenities')
                            if (result.amenities.length) {
                                result.amenities.forEach((a: string) => next.append('am', a))
                                result.amenities.forEach((a: string) => next.append('amenities', a))
                            }
                            next.delete('is_verified')
                            next.delete('is_b2b_deal_available')
                            if (result.isVerified === true) next.set('is_verified', 'true')
                            if (result.isB2bDealAvailable === true) next.set('is_b2b_deal_available', 'true')
                            setSearchParams(next, { replace: true })
                        },
                        onClear: () => {
                            const next = new URLSearchParams(searchParams)
                            next.delete('pt')
                            next.delete('property_types')
                            next.delete('am')
                            next.delete('amenities')
                            next.delete('is_verified')
                            next.delete('is_b2b_deal_available')
                            setSelectedPropertyTypes([])
                            setSelectedAmenities([])
                            setSearchParams(next, { replace: true })
                        }
                    }}
                    // Sort configuration
                    sortConfig={{
                        enabled: true,
                        type: 'stays',
                        metadata: {
                            sortOptions: [
                                {
                                    id: 'relevance',
                                    label: 'Relevance',
                                    description: 'Best match for your search',
                                    orderBy: { relevance: -1 }
                                },
                                {
                                    id: 'price_low',
                                    label: 'Price: Low to High',
                                    description: 'Lowest price first',
                                    orderBy: { rate: 1 }
                                },
                                {
                                    id: 'price_high',
                                    label: 'Price: High to Low',
                                    description: 'Highest price first',
                                    orderBy: { rate: -1 }
                                }
                            ]
                        },
                        initialData: {
                            currentOrderBy: currentOrderBy
                        },
                        onChange: () => {
                            // Optional: Real-time preview (not needed for sort)
                        },
                        onApply: (result) => {
                            // Commit sort change to URL when a sort option is selected
                            const next = new URLSearchParams(searchParams)
                            next.set('order_by', JSON.stringify(result.orderBy))
                            setSearchParams(next, { replace: true })
                        }
                    }}
                    ishidden={true}
                />
                {hasCountry && isCountryLive === false && stays.length === 0 && !isLoadingAccommodations ? (
                    <div className="relative z-10 mt-8">
                        <NotLiveCountryMessage
                            countryName={selectedCountry?.country_name}
                            nonLiveClassName="mx-auto"
                            descriptionText="This destination isn’t live yet, you can still search and explore other live destinations using the search."
                        />
                    </div>
                ) : (
                    <>
                        {showScrollTop && mobileActiveTab === 'list' && (
                            <button
                                onClick={scrollToTop}
                                className="
                            fixed bottom-4 right-2 z-50
                            w-12 h-12 rounded-full
                            bg-grey-0 text-white
                            flex items-center justify-center
                            shadow-lg md:hidden
                        "
                                aria-label="Scroll to top">
                                <ChevronUp size={24} />
                            </button>
                        )}

                        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-160px)] relative">
                            <div className="flex-1 flex flex-col transition-all duration-300">
                                {/* Sticky selected chips below header */}
                                {/* {!showLandingState && (
                        <StickySelectedChips
                            searchParams={searchParams}
                            setSearchParams={setSearchParams}
                            propertyTypes={propertyTypes}
                            allAmenities={allAmenities}
                        />
                    )} */}
                                {(isPromptLoading || isPromptPolling || promptQuestions.length > 0) && (
                                    <div
                                        className={`max-md:hidden sticky top-22 z-20 ${isSidebarOpen ? 'w-full md:w-[80.6vw]' : 'w-full md:w-[94.8vw]'}`}>
                                        <CityPromptsChips
                                            onModalClose={() => {
                                                ;(setSmartSearchModal(false), setShortListModal(true))
                                                setShowSearchHeaderOverlay(false) // Hide overlay when guide closes
                                            }}
                                            isModalOpen={smartSearchModal}
                                            prompts={promptQuestions}
                                            isLoading={isPromptLoading}
                                            isPolling={isPromptPolling}
                                            errorMessage={promptErrorMessage}
                                            onPromptSelect={handlePromptSelect}
                                        />
                                    </div>
                                )}

                                {/* Main content: list + sticky map */}
                                <div className={`w-full flex flex-col xl:pl-5 lg:pl-6 md:pl-5 sm:pl-2  relative xl:pt-0 `}>
                                    {' '}
                                    <div
                                        className={`grid grid-cols-1 gap-5 lg:gap-5 xl:gap-5 transition-all duration-300  ${
                                            isMapExpanded ? 'lg:grid-cols-[45%_55%]' : 'lg:grid-cols-[68%_30%]'
                                        }`}>
                                        {' '}
                                        <div
                                            ref={showRatesLoader ? undefined : listContainerRef}
                                            className={`
                                        ${
                                            showRatesLoader
                                                ? 'lg:py-4 md:py-3 sm:py-2 px-0 md:px-1 sm:px-1 flex items-center justify-center h-full min-h-[480px]'
                                                : 'lg:py-4 md:py-3 sm:py-2 px-0 md:px-1 sm:px-1 pb-8 lg:pb-6 md:pb-5 overflow-y-auto overflow-x-visible max-h-[calc(100vh-120px)] scrollbar-hide'
                                        }
                                        ${mobileActiveTab === 'map' ? 'max-md:hidden' : ''}
                                    `}>
                                            {!showRatesLoader && stays.length > 0 && (
                                                <div className="max-md:hidden relative w-fit group pl-4 pb-4 max-md:py-4">
                                                    <div className="flex  items-center gap-1 cursor-help">
                                                        <span
                                                            className="text-xs font-medium"
                                                            style={{
                                                                fontFamily: 'Manrope',
                                                                color: '#747474'
                                                            }}>
                                                            Prices displayed are per room · per night{' '}
                                                        </span>
                                                        <Info className="w-4 h-4 text-grey-2" />
                                                    </div>
                                                    {/* Tooltip */}
                                                    <div className="absolute left-0 top-full w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                                        Prices are charged per room, per night. For group stays, verify total cost on the provider’s
                                                        site.{' '}
                                                    </div>
                                                </div>
                                            )}
                                            {showRatesLoader ? (
                                                <ProgressStepsLoader
                                                    cityName={formattedCityName}
                                                    preferences={loaderPreferences}
                                                    progressStep={ratesProgressStep}
                                                />
                                            ) : ratesNoHotelsFound ? (
                                                <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-6">
                                                    <img
                                                        src={histogramTimeoutImage}
                                                        alt="No hotels found"
                                                        className="w-60 max-w-sm opacity-40 select-none pointer-events-none"
                                                    />
                                                    <div className="max-w-xl flex flex-col gap-2">
                                                        <h3 className="text-xl font-semibold text-header-black">
                                                            No hotels found{formattedCityName ? ` in ${formattedCityName}` : ''}
                                                        </h3>
                                                        <p className="text-base text-grey-grey_2">
                                                            We could not find any hotels for this destination yet. Try a nearby city, or check
                                                            back later — we keep discovering new places every day.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : !showLandingState ? (
                                                isRatesTimeout ? (
                                                    <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-6">
                                                        <img
                                                            src={histogramTimeoutImage}
                                                            alt="No hotels found"
                                                            className="w-60 max-w-sm opacity-40 select-none pointer-events-none"
                                                        />
                                                        <div className="max-w-xl flex flex-col gap-2">
                                                            <h3 className="text-xl font-semibold text-header-black">No results for your search</h3>
                                                            <p className="text-base text-grey-grey_2">
                                                                Nothing seems to be available for those dates and guests. Try tweaking your dates or
                                                                guest setup to explore more stays.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {(isLoadingHandpicked || handpickedStays.length > 0) && (
                                                            <>
                                                                <section
                                                                    className={`mb-0 md:rounded-3xl bg-primary-default-12  lg:px-5  max-md:pl-3 lg:py-3 max-md:py-4 pb-6 lg:pb-5 
                                                              ${shouldShowHandPickedHotelsGuide ? 'pt-0 lg:pt-0 md:pt-0 sm:pt-0' : ''}`}>
                                                                    <div className="flex flex-col gap-2 sm:flex-row  sm:justify-between md:items-center md:text-center sm:text-left">
                                                                        <div className="flex flex-row md:items-center">
                                                                            <h2 className="text-[16px] md:text-base flex font-bold items-center gap-1 md:gap-1.5">
                                                                                <img
                                                                                    src="/illustrations/hanpicked.png"
                                                                                    className="h-8 md:h-7 sm:h-6"
                                                                                    alt=""
                                                                                />
                                                                                <i className="text-primary-default pr-1 font-bold">Handpicked </i>
                                                                                top hotels for you
                                                                            </h2>
                                                                            {shouldShowHandPickedHotelsGuide && (
                                                                                <GuideTipperInlineModal
                                                                                    onClose={() => {
                                                                                        setShortListModal(false)

                                                                                        if (!guide) return

                                                                                        updateGuide({
                                                                                            ...guide,
                                                                                            stays: {
                                                                                                ...guide.stays,
                                                                                                hand_picked_hotels_guide: true
                                                                                            }
                                                                                        })
                                                                                    }}
                                                                                    position="left"
                                                                                    subtitle="We’ve shortlisted hotels perfect for you!"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        ref={handpickedScrollRef}
                                                                        onScroll={handleHandpickedScroll}
                                                                        className="mt-3 md:grid gap-6 md:gap-4 max-md:pr-3  max-md:flex max-md:flex-row max-md:overflow-x-auto scrollbar-hide  lg:grid-cols-3">
                                                                        {isLoadingHandpicked
                                                                            ? Array.from({ length: 6 }).map((_, index) => (
                                                                                  <StaysCardSkeleton key={`handpicked-skeleton-${index}`} />
                                                                              ))
                                                                            : handpickedStays.map((stay, index) => {
                                                                                  const source = handpickedAccommodations[index]
                                                                                  const key = source
                                                                                      ? getAccommodationKey(source, `handpicked-${index}`)
                                                                                      : undefined
                                                                                  const isActive = key ? hoveredAccommodationId === key : false
                                                                                  const zentrumHubId = stay.zentrumHubId || key
                                                                                  const deals = ENABLE_HOTEL_PRICE_COMPARE_DEALS && zentrumHubId ? hotelDeals[zentrumHubId] : undefined
                                                                                  const isDealsLoading = ENABLE_HOTEL_PRICE_COMPARE_DEALS && zentrumHubId
                                                                                      ? Boolean(dealsLoading[zentrumHubId])
                                                                                      : false
                                                                                  return (
                                                                                      <div
                                                                                          key={`handpicked-${stay.id}-${index}`}
                                                                                          ref={(el) => {
                                                                                              handpickedCardRefs.current[index] = el
                                                                                          }}
                                                                                          className={`max-md:w-[342px] max-md:shrink-0  transition-shadow duration-300 rounded-2xl ${
                                                                                              isActive
                                                                                                  ? 'shadow-[0_8px_24px_rgba(112,17,246,0.18)]'
                                                                                                  : ''
                                                                                          }`}
                                                                                          style={
                                                                                              isActive
                                                                                                  ? {
                                                                                                        outline:
                                                                                                            '1.5px solid var(--primary-indigo, #7011F6)'
                                                                                                    }
                                                                                                  : undefined
                                                                                          }>
                                                                                          <StaysCard
                                                                                              {...stay}
                                                                                              accommodation_id={handpickedAccommodations[index].id}
                                                                                              onHoverStart={() =>
                                                                                                  key && setHoveredAccommodationId(key)
                                                                                              }
                                                                                              onHoverEnd={() => setHoveredAccommodationId(null)}
                                                                                              onView3D={() => handleCardView3D(key)}
                                                                                              deals={deals}
                                                                                              isPremium={isPremium}
                                                                                              isDealsLoading={isDealsLoading}
                                                                                              buttonPage="stay_explore_v1"
                                                                                          />
                                                                                      </div>
                                                                                  )
                                                                              })}
                                                                    </div>
                                                                    <div className="mt-4 w-20 mx-auto flex items-center  md:hidden  ">
                                                                        <div className="h-1 w-full rounded-full bg-primary-default/15 overflow-hidden">
                                                                            <div
                                                                                className="h-full rounded-full bg-primary-default transition-[width] duration-200 ease-out"
                                                                                style={{ width: `${scrollProgress * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </section>
                                                            </>
                                                        )}
                                                        {handpickedStays.length > 0 && (
                                                            <div className="w-full h-px bg-grey-4 mt-6 md:mt-5 sm:mt-4 mb-6 md:mb-5 sm:mb-4"></div>
                                                        )}
                                                        <div className="flex justify-between pb-4 md:pb-3 sm:pb-2 max-md:px-3">
                                                            <span className="text-[16px] md:text-xs ml-2 md:ml-0 font-bold font-manrope text-grey-0 md:text-primary-default lg:hidden">
                                                                {isLoadingAccommodations
                                                                    ? 'Searching stays...'
                                                                    : totalCount > 0
                                                                      ? `Found ${totalCount} stays`
                                                                      : 'No stays found for these filters'}
                                                            </span>
                                                            <div className="hidden lg:flex items-center gap-2 text-[16px] font-semibold text-grey-grey_2">
                                                                <span className="inline-flex items-center gap-1 text-primary-default">
                                                                    {isLoadingAccommodations
                                                                        ? 'Searching stays...'
                                                                        : totalCount > 0
                                                                          ? `Found ${totalCount} stays`
                                                                          : 'No stays found for these filters'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {isLoadingAccommodations ? (
                                                            <div
                                                                className={`grid gap-6 md:gap-4 grid-cols-1 sm:grid-cols-2 ${
                                                                    isMapExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                                                                }`}>
                                                                {Array.from({ length: 12 }).map((_, index) => (
                                                                    <StaysCardSkeleton key={`skeleton-${index}`} />
                                                                ))}
                                                            </div>
                                                        ) : stays.length > 0 ? (
                                                            <>
                                                                <motion.div
                                                                    layout
                                                                    className={`grid gap-6 grid-cols-1 max-md:px-[20px] sm:grid-cols-2 ${
                                                                        isMapExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                                                                    }`}>
                                                                    {stays.map((stay, index) => {
                                                                        const source = accommodations[index]
                                                                        const key = source
                                                                            ? getAccommodationKey(source, `regular-${index}`)
                                                                            : stay.mapKey
                                                                        const isActive = key ? hoveredAccommodationId === key : false
                                                                        return (
                                                                            <div
                                                                                key={stay.mapKey || stay.id}
                                                                                ref={(el) => {
                                                                                    cardRefs.current[index] = el
                                                                                }}
                                                                                className={`transition-shadow duration-300 rounded-2xl ${
                                                                                    isActive ? 'shadow-[0_8px_24px_rgba(112,17,246,0.18)]' : ''
                                                                                }`}
                                                                                style={
                                                                                    isActive
                                                                                        ? {
                                                                                              outline: '2px solid var(--primary-indigo, #7011F6)'
                                                                                          }
                                                                                        : undefined
                                                                                }>
                                                                                <StaysCard
                                                                                    {...stay}
                                                                                    formattedCityName={formattedCityName}
                                                                                    accommodation_id={accommodations[index].id}
                                                                                    onHoverStart={() => key && setHoveredAccommodationId(key)}
                                                                                    onHoverEnd={() => setHoveredAccommodationId(null)}
                                                                                    onView3D={() => handleCardView3D(key)}
                                                                                    buttonPage="stay_explore_v1"
                                                                                    isPremium={isPremium}
                                                                                />
                                                                                {/* Scroll Progress (md and below) */}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </motion.div>

                                                                {isLoadingMore && (
                                                                    <div
                                                                        className={`grid gap-6 md:gap-4 mt-6 grid-cols-1 sm:grid-cols-2 ${
                                                                            isMapExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                                                                        }`}>
                                                                        {Array.from({ length: 6 }).map((_, index) => (
                                                                            <StaysCardSkeleton key={`loading-more-${index}`} />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="text-center py-12 text-grey-grey_2">
                                                                No accommodations found. Try adjusting your filters.
                                                            </div>
                                                        )}
                                                    </>
                                                )
                                            ) : null}
                                        </div>
                                        {/* Right: sticky map (mobile: deferred until user switches to map tab to save Mapbox credits) */}
                                        {!showLandingState && (hasEverOpenedMobileMap || window.innerWidth >= 1024) && (
                                            <div
                                                className={`
                             relative lg:mt-0 lg:pt-2 lg:sticky lg:top-22
                            ${mobileActiveTab === 'list' ? 'max-md:hidden' : 'md:hidden'}
                        `}>
                                                {/* Floating List View button – mobile only, visible when map is active */}
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileActiveTab('list')}
                                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] font-medium font-manrope bg-white shadow-lg border border-primary-default cursor-pointer transition-colors md:hidden">
                                                    <ChevronLeft size={14} className="text-primary-default" />
                                                    <span className="text-primary-default">List View</span>
                                                </button>
                                                <StaysMap
                                                    cityName={formattedCityName}
                                                    cityCenter={mapCityCenter}
                                                    cityCenterLoading={cityCenterLoading}
                                                    accommodations={mapAccommodations}
                                                    hoveredAccommodationId={hoveredAccommodationId}
                                                    onMarkerClick={handleMarkerClick}
                                                    cityId={selectedCityId}
                                                    checkIn={searchParams.get('check_in') || undefined}
                                                    checkOut={searchParams.get('check_out') || undefined}
                                                    travelPurpose={searchParams.get('travel_purpose') || undefined}
                                                    groupType={searchParams.get('group_type') || undefined}
                                                    preferences={(searchParams.get('city_prefs') || '').split(',').filter(Boolean)}
                                                    guestsData={{
                                                        adults: parseInt(searchParams.get('adults') || '2', 10),
                                                        children: parseInt(searchParams.get('children') || '0', 10),
                                                        infants: parseInt(searchParams.get('infants') || '0', 10),
                                                        children_age: searchParams
                                                            .get('children_age')
                                                            ?.split(',')
                                                            .map(Number)
                                                            .filter((n) => !isNaN(n))
                                                    }}
                                                    reviewType={searchParams.get('review_type') || 'complete'}
                                                    isExpanded={isMapExpanded}
                                                    onExpandChange={setIsMapExpanded}
                                                    fetchViewportStays={fetchViewportStays}
                                                    buttonPage={'Stays_explore'}
                                                    onAddToCollection={(accId, extras) => {
                                                        setAddToCollectionMapExtras(extras ?? null)
                                                        setAddToCollectionModalOpen(accId)
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add to Collection Modal */}
            {addToCollectionModalOpen &&
                (() => {
                    const accommodation = [...handpickedAccommodations, ...accommodations].find((acc) => {
                        const accId = typeof acc.id === 'string' ? acc.id : acc.id?.toString() || ''
                        return accId === addToCollectionModalOpen
                    })

                    // Get zentrum_hub_id (fall back to map-provided extras for viewport stays
                    // that aren't in `accommodations` state)
                    const zentrumHubId =
                        accommodation?.zentrum_hub_id ||
                        addToCollectionMapExtras?.zentrumHubId ||
                        (typeof accommodation?.id === 'string' ? accommodation.id : accommodation?.id?.toString()) ||
                        undefined

                    // Get location tag from review_data
                    const locationTag = accommodation?.review_data?.location_tags?.[0] || undefined

                    // Get image URL
                    const imageUrl = accommodation?.content?.[0] || accommodation?.banner_img || addToCollectionMapExtras?.imageUrl || undefined

                    // Get city ID and name
                    const cityId = selectedCityId || cityDetails?.id || undefined
                    const cityName = formattedCityName || cityDetails?.name || undefined

                    // Get category
                    const category = accommodation?.category || undefined

                    // Get check-in/check-out from URL search params
                    const checkIn = searchParams.get('check_in') || undefined
                    const checkOut = searchParams.get('check_out') || undefined

                    return (
                        <AddToCollectionModal
                            isOpen={!!addToCollectionModalOpen}
                            onClose={() => { setAddToCollectionModalOpen(null); setAddToCollectionMapExtras(null) }}
                            experienceId={addToCollectionModalOpen}
                            experienceName={accommodation?.name || addToCollectionMapExtras?.name || 'Hotel'}
                            entityType="stays"
                            stayImageUrl={imageUrl}
                            zentrumHubId={zentrumHubId}
                            locationTag={locationTag}
                            cityId={cityId}
                            cityName={cityName}
                            category={category}
                            checkIn={checkIn}
                            checkOut={checkOut}
                            accommodationId={addToCollectionModalOpen}
                            isVerified={accommodation?.is_verified ?? addToCollectionMapExtras?.isVerified ?? false}
                            isB2bDealAvailable={accommodation?.is_b2b_deal_available ?? addToCollectionMapExtras?.isB2bDealAvailable ?? false}
                            onSuccess={(verificationUpdate) => {
                                if (verificationUpdate && addToCollectionModalOpen) {
                                    const targetId = addToCollectionModalOpen
                                    const matches = (a: any) => {
                                        const aid = typeof a.id === 'string' ? a.id : a.id?.toString() || ''
                                        return aid === targetId
                                    }
                                    queryClient.setQueryData(['stays-handpicked', listKeyParams], (old: any) => {
                                        if (!old?.data?.data) return old
                                        return { ...old, data: { ...old.data, data: old.data.data.map((a: any) => matches(a) ? { ...a, ...verificationUpdate } : a) } }
                                    })
                                    queryClient.setQueryData(['stays-regular', listKeyParams], (old: any) => {
                                        if (!old?.pages) return old
                                        return { ...old, pages: old.pages.map((p: any) => ({ ...p, data: { ...p.data, data: (p.data.data ?? []).map((a: any) => matches(a) ? { ...a, ...verificationUpdate } : a) } })) }
                                    })
                                }
                            }}
                        />
                    )
                })()}
        </>
    )
}

export default StaysExplore