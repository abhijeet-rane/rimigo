import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useLocation } from 'react-router-dom'
import { createMergedQueryParams } from '../utils/queryParams'
import { projectStaySectionsForDedupe } from '../utils/staysShortlistDedupe'
import { useQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query'
import { adaptContentCollectionToViewModel } from '../adapter/contentCollectionAdapter'
import type { ContentCollectionViewModel, ApiResponse, ContentCollection } from '../types/contentCollection'
import { TripCollectionRecommendationsProvider } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import SearchHeader from '@/components/common/SearchHeader'
import ShareButton from '@/components/common/ShareButton'
import SocialMeta from '@/components/shared/React-Helmet/SocialMeta'
import { useStartPlanningCTA } from '@/pages/Home/hooks/useStartPlanningCTA'
import Typography from '@/components/shared/Typography'
import AddToCollectionModal from '../components/AddToCollectionModal'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import { getAccommodationMetadata } from '@/pages/Stays/Apis/accommodationsAPI'
import { adaptCollectionSectionToExperienceCard, resolveExperienceCardData } from '../adapter/experienceCardAdapter'
import { useExperiencesEnrichment } from '../hooks/useExperiencesEnrichment'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import MustHaveTabContent from '../components/MustHaveTabContent'
import { collapseMustHave, insertBudget } from '@/modules/Tripboard/utils/tabArrangement'
import { BookingsTab } from '@/modules/Tripboard/components/BookingsTab/BookingsTab'
import GenericMap from '@/components/shared/Map/GenericMap'
import { useCollectionMapMarkers } from '../hooks/useCollectionMapMarkers'
import { useContentCollectionPurchase } from '../hooks/useContentCollectionPurchase'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useNavigate } from 'react-router-dom'
import { RIMIGO_COLLECTION_ROUTE, TRIP_COLLECTION_ROUTE } from '@/routes/routes'
import { Edit, Plus, Loader2 } from 'lucide-react'
import { contentCollectionApi } from '../api/contentCollectionApi'
import type { Section } from '../types/contentCollection'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import CollectionTabs from '../components/CollectionTabs'
import ExperienceTab from '../components/ExperienceTab'
import StaysTab from '../components/StaysTab'
import { useStaysEnrichment } from '../hooks/useStaysEnrichment'
import AddToTripModal from '../components/AddToTripModal'
import TagToCreatorModal from '../components/TagToCreatorModal'
import TagToTravelerModal from '../components/TagToTravelerModal'
import ViewContentCollectionLoading from '../components/ViewContentCollectionLoading'
import CollectionNotFound from '../components/CollectionNotFound'
import SectionTypesError from '../components/SectionTypesError'
import OverviewTabContent from '../components/OverviewTabContent'
import ItineraryTabContent from '../components/ItineraryTabContent'
import FoodTabContent from '../components/FoodTabContent'
import { itineraryHasMealSlots } from '../utils/itineraryFoodAdapter'
import { adaptCollectionToOverviewData } from '../adapter/overviewAdapter'
import { useItineraryCompletedData, useItineraryRouteSummary, type IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import TripDailyHighlightsSection from '@/modules/Tripboard/components/TripDailyHighlightsSection'
import { resetWindowScrollAfterItineraryTabMobile, scrollTripboardToTopOnMobile } from '@/modules/Tripboard/utils/scrollForItineraryTabMobile'
import { useIsMobile } from '@/hooks/use-mobile'
import CustomShimmer from '@/components/shared/Shimmer'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import MobileStickyCTA from '@/modules/Premium/components/MobileStickyCTA'
import RimigoLockedOverlay from '../components/RimigoLockedOverlay'
import type { TripUnlockData } from '../components/TripUnlockSection'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useSetCreatorAttribution, type CreatorAttribution } from '@/modules/amplitude/components/creatorAttributionHooks'
import {
    shouldShowMapForTab,
    shouldShowLockedOverlayForTab,
    shouldAllowDateUpdateForTab,
    getSectionTypesVisibleInTabs,
    shouldAllowDeleteSection
} from '../lib/collectionConfig'
import { useStayPrices } from '../hooks/useStayPrices'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { formatDateStringToYMD, formatDateToYMD, isPastDate, getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { toast } from 'sonner'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import type { ContentCollectionPurchaseTrigger } from '../hooks/useContentCollectionPurchase'
import { checkEntityPayment } from '@/modules/Premium/api/premiumPageAPI'

interface SectionType {
    section_type: string
    name: string
}

const ViewContentCollection: React.FC = () => {
    const { identifier, countryName } = useParams<{ identifier: string; countryName: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const isRimigoCollection = location.pathname.startsWith(RIMIGO_COLLECTION_ROUTE)
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = useMemo(() => searchParams.get('tab') ?? null, [searchParams])
    const setActiveTab = useCallback(
        (tab: string | null) => {
            const next = new URLSearchParams(searchParams)
            if (tab) {
                next.set('tab', tab)
            } else {
                next.delete('tab')
            }
            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams]
    )
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const [addToCollectionModalOpen, setAddToCollectionModalOpen] = useState<string | null>(null)
    const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false)
    const isMobile = useIsMobile()
    const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'map'>('list')
    const staysHeaderPortalRef = useRef<HTMLDivElement>(null)
    // Mobile scroll wrapper (around RimigoLockedOverlay); reset on tab change.
    const tabScrollContainerRef = useRef<HTMLDivElement>(null)
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
        if (!activeTab) return
        scrollTripboardToTopOnMobile(tabScrollContainerRef.current)
    }, [activeTab])
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [isAddToTripModalOpen, setIsAddToTripModalOpen] = useState(false)
    const [isTagToCreatorModalOpen, setIsTagToCreatorModalOpen] = useState(false)
    const [isTagToTravelerModalOpen, setIsTagToTravelerModalOpen] = useState(false)
    const { isRimigoInternal, isPremium } = useUserInfo()
    const queryClient = useQueryClient()
    const { trackButtonClickCustom, trackEvent } = usePostHog()
    const setCreatorAttribution = useSetCreatorAttribution()
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()
    const [isStaysFilterOpen, setIsStaysFilterOpen] = useState(false)
    const [isStaysSortOpen, setIsStaysSortOpen] = useState(false)
    const [isCreatingActivitiesFromItinerary, setIsCreatingActivitiesFromItinerary] = useState(false)

    // Get active trip from context for price fetching
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Get guests data from URL params for price fetching
    const guestsDataForPrices = useMemo(() => {
        const adults = parseInt(searchParams.get('adults') || '2', 10) || 2
        const children = parseInt(searchParams.get('children') || '0', 10) || 0
        const infants = parseInt(searchParams.get('infants') || '0', 10) || 0
        const childrenAgeParam = searchParams.get('children_age')
        const children_age = childrenAgeParam
            ? childrenAgeParam
                  .split(',')
                  .map((age) => parseInt(age, 10))
                  .filter((age) => !isNaN(age))
            : []
        return { adults, children, infants, children_age }
    }, [searchParams])

    // Fetch section types
    const {
        data: sectionTypesResponse,
        isLoading: isSectionTypesLoading,
        isError: isSectionTypesError
    } = useQuery({
        queryKey: ['content-collection-section-types', identifier],
        queryFn: async () => {
            return await contentCollectionApi.getSectionTypes(identifier)
        },
        enabled: !!identifier,
        staleTime: HOURS_24, // Cache for 24 hours - section types don't change frequently
        gcTime: HOURS_24
    })

    // Use section types in the order they come from the API
    const sectionTypes: SectionType[] = useMemo(() => {
        return sectionTypesResponse?.data || []
    }, [sectionTypesResponse?.data])

    // Filter out section types hidden from tabs (e.g. dos_donts shown inside Tips).
    // Tips/Sim/Visa/Links are collapsed into a single "Must Have" tab whose
    // body is the MustHaveTabContent panel (Tips, Useful Links, Visa, SIM &
    // Connectivity). The collapse keeps the tab at the position of the first
    // matching section type so author-defined ordering is preserved.
    const baseAllTabs: SectionType[] = useMemo(() => {
        const visibleSectionTypes = getSectionTypesVisibleInTabs('public_collections', sectionTypes)
        const withDisplayNames = visibleSectionTypes.map((t) => {
            if (t.section_type === 'restaurant') return { ...t, name: 'Food' }
            if (t.section_type === 'experience') return { ...t, name: 'Activities' }
            return t
        })
        const collapsed = collapseMustHave(withDisplayNames)
        // Bookings (section_type 'budget') is shown on public collections too —
        // same tab as private, with the public budget rules (no flights, etc.).
        insertBudget(collapsed)
        return collapsed
    }, [sectionTypes])

    // Fetch collection data for experiences - always fetch (contains context, name, etc.)
    const {
        data: experienceCollectionResponse,
        isLoading: isExperienceCollectionLoading,
        isError: isExperienceCollectionError
    } = useQuery({
        queryKey: ['content-collection', identifier, 'experience'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await contentCollectionApi.getByIdentifier(identifier, 'experience')
        },
        enabled: !!identifier && !!activeTab,
        staleTime: HOURS_24, // Cache for 24 hours - collection data doesn't change frequently
        gcTime: HOURS_24,
        placeholderData: keepPreviousData
    })

    // Fetch collection data for stays - always fetch
    const {
        data: staysCollectionResponse,
        isLoading: isStaysCollectionLoading,
        isError: isStaysCollectionError
    } = useQuery({
        queryKey: ['content-collection', identifier, 'stays'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await contentCollectionApi.getByIdentifier(identifier, 'stays')
        },
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        refetchOnMount: false
    })

    // Select the appropriate collection response based on activeTab
    // Use experience response for collection metadata (context, name, etc.) since it's always available
    const activeCollectionResponse = useMemo(() => {
        if (activeTab === 'stays') {
            return staysCollectionResponse
        }
        // For experience tab or other tabs (overview, tips, etc.), use experience response
        return experienceCollectionResponse
    }, [activeTab, experienceCollectionResponse, staysCollectionResponse])

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

    // ── Itinerary data for Daily Highlights section in overview ──
    const { data: itineraryCollectionResponse } = useQuery({
        queryKey: ['content-collection', identifier, 'itinerary'],
        queryFn: async () => {
            if (!identifier) return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            return await contentCollectionApi.getByIdentifier(identifier, 'itinerary')
        },
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const itineraryEntityId = useMemo(() => {
        return itineraryCollectionResponse?.data?.sections?.find((s: Section) => s.section_type === 'itinerary' && s.entity_id)?.entity_id ?? ''
    }, [itineraryCollectionResponse?.data?.sections])

    const itineraryCompletedQuery = useItineraryCompletedData(itineraryEntityId)
    const itineraryData = itineraryCompletedQuery.data as IItineraryCompletedResponse | undefined
    const isItineraryLoading = itineraryCompletedQuery.isLoading
    // Drives StaysTab chip windows via sleep_city RLE — return-trip cities
    // (Auckland → Rotorua → Auckland) get their own chips and day-trip
    // cities (Mount Cook) drop out vs. the legacy base_city walk.
    const { data: routeSummary } = useItineraryRouteSummary(itineraryEntityId ?? '')

    // Synthesize a Food tab when the collection has no restaurant sections
    // but the linked itinerary has `kind: 'meal'` slots. The Food tab then
    // renders directly from itinerary data via FoodTabContent's fallback path.
    const allTabs: SectionType[] = useMemo(() => {
        const hasRestaurantTab = baseAllTabs.some((t) => t.section_type === 'restaurant')
        if (hasRestaurantTab || !itineraryHasMealSlots(itineraryData)) return baseAllTabs
        return [...baseAllTabs, { section_type: 'restaurant', name: 'Food' }]
    }, [baseAllTabs, itineraryData])

    // Set initial active tab once tabs are resolved (including the synthetic Food tab).
    useEffect(() => {
        if (!activeTab && allTabs.length > 0) {
            setActiveTab(allTabs[0].section_type)
        }
    }, [activeTab, allTabs, setActiveTab])

    const navigateToItineraryTab = useCallback(
        (dayIndex?: number, opts?: { view?: 'board' }) => {
            const next = new URLSearchParams(searchParams)
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

    // Use collectionMetadataResponse (experience) for collection-level data
    const collectionResponseForActiveTab = collectionMetadataResponse

    // handle purchase
    // const handlePurchase = useMemo(() => useContentCollectionPurchase(activeTab), [activeTab])
    const collectionId = useMemo(() => collectionMetadataResponse?.data?.id ?? undefined, [collectionMetadataResponse?.data?.id, identifier])

    // Check if user has paid for this collection (rimigo-collection); used to unlock overlay when backend says paid (only when logged in)
    const { data: entityPaymentData } = useQuery({
        queryKey: ['check-entity-payment', 'collection', collectionId],
        queryFn: () =>
            checkEntityPayment({
                entity_type: 'collection',
                entity_id: collectionId!
            }),
        enabled: !!collectionId && isAuthenticated
    })
    const hasPaidForCollection = entityPaymentData?.has_paid === true || entityPaymentData?.is_paid === true
    const travelerCollectionIdentifier = entityPaymentData?.fulfillment?.traveler_collection?.identifier

    const { handlePurchase, isProcessingPayment } = useContentCollectionPurchase(collectionId, trackButtonClickCustom)

    // When user has paid, redirect to their trip-collection (traveler collection) page
    useEffect(() => {
        if (hasPaidForCollection && travelerCollectionIdentifier) {
            navigate(`${TRIP_COLLECTION_ROUTE}/${travelerCollectionIdentifier}`, { replace: true })
        }
    }, [hasPaidForCollection, travelerCollectionIdentifier, navigate])

    // Refetch entity payment when user returns from successful payment
    useEffect(() => {
        if (searchParams.get('payment') === 'success' && collectionId) {
            queryClient.invalidateQueries({ queryKey: ['check-entity-payment', 'collection', collectionId] })
        }
    }, [searchParams, collectionId, queryClient])

    const handleBuyClick = useCallback(
        (context: { trigger?: ContentCollectionPurchaseTrigger | string; tab?: string }) => {
            if (!isAuthenticated) {
                openLoginModal({
                    redirectAfterLogin: false,
                    onLoginSuccess: () => {
                        handlePurchase?.(context)
                    }
                })
                return
            }
            void handlePurchase(context)
        },
        [isAuthenticated, openLoginModal, handlePurchase]
    )

    // Extract entity IDs from activeCollectionResponse based on active tab
    const entityIds = useMemo(() => {
        if (!activeCollectionResponse?.data?.sections) return []
        return (
            activeCollectionResponse.data.sections
                .filter((section: Section) => section.section_type === activeTab && section.entity_id)
                .map((section: Section) => section.entity_id!)
                .filter(Boolean) || []
        )
    }, [activeCollectionResponse, activeTab])

    // Extract stay metadata map from sections (for active tab display)
    // Also create maps for stay ID to section ID and section metadata (similar to experiences)
    const { stayMetadataMap, staySectionMap, staySectionMetadataMap } = useMemo(() => {
        if (activeTab !== 'stays' || !activeCollectionResponse?.data?.sections) {
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
                        kayak_hotel_id?: string
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
            }
        >()
        const sectionMap = new Map<string, string>()
        const sectionMetadataMap = new Map<string, Section['metadata']>()

        activeCollectionResponse.data.sections
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
                        kayak_hotel_id: typeof metadata.kayak_hotel_id === 'string' ? metadata.kayak_hotel_id : undefined
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
        return { stayMetadataMap: metadataMap, staySectionMap: sectionMap, staySectionMetadataMap: sectionMetadataMap }
    }, [activeCollectionResponse, activeTab])

    // Project raw sections for shortlist dedupe — preserves duplicates that
    // the entity-keyed staySectionMap above collapses away.
    const shortlistSectionsForDedupe = useMemo(() => {
        if (activeTab !== 'stays') return []
        return projectStaySectionsForDedupe(activeCollectionResponse?.data?.sections)
    }, [activeTab, activeCollectionResponse?.data?.sections])

    // Default fallback dates (local YYYY-MM-DD). Source of truth is section metadata dates.
    const staysDates = useMemo(() => {
        return {
            checkIn: getTomorrowDate(),
            checkOut: getDayAfterTomorrowDate()
        }
    }, [])

    // Union of section-derived + itinerary-slot-derived experience ids. Agent
    // can place slots without writing a section; without the union those
    // cards render blank in the "In your itinerary" view.
    const experienceIdsForEnrichment = useMemo(() => {
        const ids = new Set<string>()
        for (const section of activeCollectionResponse?.data?.sections ?? []) {
            if (section.section_type === 'experience' && section.entity_id) ids.add(section.entity_id)
        }
        for (const day of itineraryData?.days ?? []) {
            for (const slot of day.slots ?? []) {
                if (slot?.entity_model === 'experiences' && slot.entity_id) ids.add(slot.entity_id)
            }
        }
        return Array.from(ids)
    }, [activeCollectionResponse, itineraryData])

    // Bulk-fetch experience card data. Same two-tab gate as Tripboard —
    // Activities tab needs it for cards + map, Stays tab needs it for
    // activity markers on the stays map.
    const experienceEnrichmentEnabled = activeTab === 'experience' || activeTab === 'stays'
    const { enrichedExperiencesMap, isEnrichmentLoading: isExperiencesEnrichmentLoading } = useExperiencesEnrichment({
        experienceIds: experienceIdsForEnrichment,
        enabled: experienceEnrichmentEnabled
    })

    // Bulk-fetch enriched accommodation data (reviews, ratings, content)
    // for all stays in the collection. Same hook Tripboard uses — drives
    // `platformReviews` + `starRating` on stay cards via resolveStayCardData.
    const { enrichedStaysMap } = useStaysEnrichment({
        sections: activeCollectionResponse?.data?.sections ?? [],
        stayMetadataMap,
        checkIn: staysDates.checkIn,
        checkOut: staysDates.checkOut,
        travelPurpose: 'leisure_relaxation',
        groupType: 'couple',
        enabled: activeTab === 'stays'
    })

    // Extract experiences from collection sections.
    // Deduplicate by entity_id to handle duplicate sections with same entity_id
    // Use section.id as unique identifier to prevent React key conflicts
    // Also create a map of experience ID to section ID for date editing
    // And a map of section ID to full section metadata for preserving all metadata fields
    const { experiences, experienceSectionMap, sectionMetadataMap } = useMemo(() => {
        if (activeTab !== 'experience' || !activeCollectionResponse?.data?.sections) {
            return {
                experiences: [],
                experienceSectionMap: new Map<string, string>(),
                sectionMetadataMap: new Map<string, Section['metadata']>()
            }
        }
        // Hold rendering until the batch enrichment settles — section
        // metadata is slim (dates only) so cards would be blank otherwise.
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
                const exp = resolveExperienceCardData(section, enrichedExperiencesMap) ?? adaptCollectionSectionToExperienceCard(section)
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

    // Slot-derived list for "In your itinerary" view. Itinerary slots are the
    // source of truth for what's placed on a day; agent-placed slots without
    // matching sections still show up here.
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
                list.push({
                    id: expId,
                    title: enriched?.name ?? slot.title ?? '',
                    name: enriched?.name ?? slot.title ?? '',
                    city_id: enriched?.city_id ?? '',
                    city_name: enriched?.city_name ?? '',
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
        const map = new Map<string, import('../types/contentCollection').ExperienceComment[]>()
        const raw = (
            activeCollectionResponse?.data?.metadata as
                | { experience_comments?: import('../types/contentCollection').ExperienceComment[] }
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

    // Compute trip start date for "Day N" labels.
    // Primary: use the itinerary's first day date (matches what the Itinerary tab shows).
    // Fallback: earliest start_date across all sections (for collections without itinerary).
    const tripStartDate = useMemo(() => {
        // Prefer itinerary first day date — this is the authoritative "Day 1"
        if (itineraryData?.days && itineraryData.days.length > 0) {
            const firstDay = itineraryData.days[0]
            if (firstDay.date) {
                const d = typeof firstDay.date === 'string' ? firstDay.date : new Date(firstDay.date).toISOString()
                return d.split('T')[0]
            }
        }

        // Fallback: scan sections for earliest start_date
        let earliest: string | null = null
        const allSections = [...(experienceCollectionResponse?.data?.sections || []), ...(staysCollectionResponse?.data?.sections || [])]
        allSections.forEach((section: Section) => {
            const startDate = (section.metadata as { start_date?: string | null } | undefined)?.start_date
            if (startDate && typeof startDate === 'string') {
                const ymd = startDate.split('T')[0]
                if (!earliest || ymd < earliest) earliest = ymd
            }
        })
        return earliest
    }, [itineraryData?.days, experienceCollectionResponse?.data?.sections, staysCollectionResponse?.data?.sections])

    // Build a map of section ID → blocks (for comments rendering in tabs)
    const sectionBlocksMap = useMemo(() => {
        const map = new Map<string, import('../types/contentCollection').Block[]>()
        activeCollectionResponse?.data?.sections?.forEach((section: Section) => {
            if (section.id && section.blocks?.length) {
                map.set(section.id, section.blocks)
            }
        })
        return map
    }, [activeCollectionResponse])

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

    // Fetch stay/accommodation metadata for stays tab (for display)
    const { data: staysMetadataResponse, isLoading: isStaysLoading } = useQuery({
        queryKey: ['collection-stays', entityIds, staysDates.checkIn, staysDates.checkOut, filterParams.propertyTypes, filterParams.amenities],
        queryFn: async () => {
            if (activeTab !== 'stays' || entityIds.length === 0) {
                return { data: { data: [] } }
            }
            return await getAccommodationMetadata({
                stay_ids: entityIds,
                // Here fallback dates are being used, since now metadata api does not return rates
                check_in_date: staysDates.checkIn,
                check_out_date: staysDates.checkOut,
                property_types: filterParams.propertyTypes.length > 0 ? filterParams.propertyTypes : undefined,
                amenities: filterParams.amenities.length > 0 ? filterParams.amenities : undefined
            })
        },
        enabled: activeTab === 'stays' && entityIds.length > 0,
        staleTime: HOURS_24, // Cache for 24 hours - stays metadata can change with dates
        gcTime: HOURS_24 // Keep in cache for 24 hours
    })

    const staysDataFromApi: AccommodationMetadataItem[] = staysMetadataResponse?.data?.data || []

    // Merge stays from sections with metadata API data to ensure all stays are shown
    // Create stays from sections for any that aren't in the metadata API response
    const staysData = useMemo(() => {
        if (activeTab !== 'stays' || !activeCollectionResponse?.data?.sections) {
            return staysDataFromApi
        }

        const mergedStays: AccommodationMetadataItem[] = []
        const seenIds = new Set<string>()

        // First, add all stays from API (use collection section metadata lat/long for kayak_stay when available)
        staysDataFromApi.forEach((stay) => {
            const lookupKey = stay.zentrum_hub_id || stay.id
            const section = activeCollectionResponse.data.sections?.find((s: Section) => s.section_type === 'stays' && s.entity_id === lookupKey)
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
        activeCollectionResponse.data.sections
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
                if (!entityId) return // Skip if no entity_id

                const zentrumHubId = metadata.zentrum_hub_id

                // Check if this stay is already in the API response by checking both zentrum_hub_id and entity_id
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
                        zentrum_hub_id: zentrumHubId || '',
                        is_verified: metadata.is_verified === true,
                        is_b2b_deal_available: metadata.is_b2b_deal_available === true
                    }
                    mergedStays.push(stayFromSection)
                    // Track both IDs
                    seenIds.add(zentrumHubId || '')
                    seenIds.add(entityId)
                }
            })

        return mergedStays
    }, [staysDataFromApi, activeCollectionResponse, activeTab, stayMetadataMap])

    // selectedCityId is derived from the active tab's city param (stays_city for stays, act_city for activities, city_id for restaurant/food).
    const selectedCityId = useMemo(() => {
        if (activeTab === 'stays') return searchParams.get('stays_city') || searchParams.get('city_id') || null
        if (activeTab === 'experience') return searchParams.get('act_city') || searchParams.get('city_id') || null
        if (activeTab === 'restaurant') return searchParams.get('city_id') || null
        return searchParams.get('stays_city') || searchParams.get('act_city') || searchParams.get('city_id') || null
    }, [searchParams, activeTab])

    const filteredStaysDataForPrices = useMemo(() => {
        if (!selectedCityId) {
            // No city selected yet — return empty to avoid calling compare API for all stays.
            // StaysTab will set stays_group in URL on mount, which triggers re-render with correct city.
            return []
        }
        // Filter stays by selected city (same logic as StaysTab)
        return staysData.filter((stay) => {
            const zentrumHubId = stay.zentrum_hub_id || stay.id
            const sectionMetadata = stayMetadataMap.get(zentrumHubId)
            const cityId = sectionMetadata?.city_id
            return cityId === selectedCityId
        })
    }, [staysData, selectedCityId, stayMetadataMap])

    // Memoize corrected dates for all filtered stays to prevent duplicate API calls
    // This ensures dates are stable across renders and don't trigger unnecessary query key changes
    const staysDatesMap = useMemo(() => {
        const datesMap = new Map<string, { checkIn: string; checkOut: string }>()

        const defaultCheckIn = getTomorrowDate()
        const defaultCheckOut = getDayAfterTomorrowDate()

        // Helper: add days to YYYY-MM-DD in local time
        const addDaysYMD = (ymd: string, days: number): string => {
            const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
            const dt = new Date(y, (m || 1) - 1, d || 1)
            dt.setDate(dt.getDate() + days)
            return formatDateToYMD(dt) || defaultCheckOut
        }

        // Helper: parse YYYY-MM-DD to local Date
        const parseYMD = (s: string): Date => {
            const [y, m, d] = s.split('-').map(Number)
            return new Date(y, (m || 1) - 1, d || 1)
        }

        filteredStaysDataForPrices.forEach((stay) => {
            const stayKey = stay.zentrum_hub_id || stay.id
            const sectionId = staySectionMap?.get(stayKey)
            const sectionMetadata = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
            const metadata = sectionMetadata as { start_date?: string | null; end_date?: string | null } | undefined

            const rawStart = metadata?.start_date ? formatDateStringToYMD(metadata.start_date) : null
            const rawEnd = metadata?.end_date ? formatDateStringToYMD(metadata.end_date) : null

            if (isRimigoCollection && tripStartDate && rawStart) {
                // For rimigo-collection: use today + 30 days + day offset from trip start
                const baseDate = addDaysYMD(defaultCheckIn, 30)
                const tripStart = parseYMD(tripStartDate)
                const stayStart = parseYMD(rawStart)
                const dayOffset = Math.max(0, Math.floor((stayStart.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)))
                const checkIn = addDaysYMD(baseDate, dayOffset)

                let nightsCount = 1
                if (rawEnd) {
                    const stayEnd = parseYMD(rawEnd)
                    nightsCount = Math.max(1, Math.floor((stayEnd.getTime() - stayStart.getTime()) / (1000 * 60 * 60 * 24)))
                }
                const checkOut = addDaysYMD(checkIn, nightsCount)
                datesMap.set(stayKey, { checkIn, checkOut })
            } else {
                // Default behavior: use section metadata dates with fallback
                let checkIn = rawStart || defaultCheckIn
                if (checkIn && isPastDate(checkIn)) checkIn = defaultCheckIn

                let checkOut = rawEnd || ''
                if (!checkOut || isPastDate(checkOut)) {
                    checkOut = addDaysYMD(checkIn, 1)
                }

                // Safety: ensure checkOut is after checkIn
                if (checkOut <= checkIn) {
                    checkOut = addDaysYMD(checkIn, 1)
                }

                datesMap.set(stayKey, { checkIn, checkOut })
            }
        })

        return datesMap
    }, [filteredStaysDataForPrices, staySectionMap, staySectionMetadataMap, isRimigoCollection, tripStartDate])

    // Loading state: use experience collection loading for collection metadata, active tab loading for sections
    const isLoading = isExperienceCollectionLoading || isCollectionLoading
    const isError = isCollectionError

    // Get publisher ID from collection response
    // Must be done before conditional returns to maintain hooks order
    const publisherId = useMemo(() => {
        if (!collectionMetadataResponse?.data) return null
        return collectionMetadataResponse.data.publisher?.publisher_id || null
    }, [collectionMetadataResponse?.data?.publisher?.publisher_id])

    const publisherType = useMemo(() => {
        if (!collectionMetadataResponse?.data) return null
        return collectionMetadataResponse.data.publisher?.type || null
    }, [collectionMetadataResponse?.data?.publisher?.type])

    const { data: startPlanningTripSource } = useQuery({
        queryKey: ['trip-source-by-id', publisherId],
        queryFn: async () => {
            if (!publisherId) return null
            const response = await contentCollectionApi.getTripSourceById(publisherId)
            return response.data || null
        },
        enabled: !!publisherId && publisherType !== 'internal_user',
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Referrer attribution — `creator_handle` represents who drove the visit (utm_source),
    // not who owns the tripboard. Tripboard owner is exposed separately via the
    // `tripboard_owner` field on the page-view event below.
    const utmSource = useMemo(() => {
        const raw = searchParams.get('utm_source')?.trim()
        return raw ? raw : null
    }, [searchParams])

    const creatorAttributionValue: CreatorAttribution | null = useMemo(() => {
        if (!utmSource) return null
        return {
            creator_handle: utmSource,
            creator_id: null
        }
    }, [utmSource])

    // Push referrer attribution into the app-root context so descendant trackEvent calls
    // (button clicks, etc.) inherit creator_handle from utm_source. Cleared on unmount.
    useEffect(() => {
        setCreatorAttribution(creatorAttributionValue)
        return () => setCreatorAttribution(null)
    }, [creatorAttributionValue, setCreatorAttribution])

    // Tripboard owner — the publisher's trip-source. Surfaced on the page-view event only;
    // intentionally not pushed into CreatorAttributionContext since context carries
    // referrer scope, not ownership.
    const tripboardOwner = useMemo(() => {
        const name = startPlanningTripSource?.name?.trim()
        if (!name) return { name: null as string | null, id: null as string | null }
        return {
            name,
            id: startPlanningTripSource?.id ?? null
        }
    }, [startPlanningTripSource?.name, startPlanningTripSource?.id])

    // utm_source = creator slug (matches /trip-source/:slug pattern).
    // utm_medium = 'rimigo_website' so we know the click originated from
    // our site; when the same tripboard is embedded on a creator's own
    // site the medium flips there.
    // utm_campaign = the collection identifier (tripboard slug) so we can
    // attribute conversions back to the specific tripboard that drove them.
    const startPlanningUtmDefaults = useMemo(() => {
        const slug = startPlanningTripSource?.name?.trim() || ''
        const utm_source = slug ? slug.replace(/^@/, '').toLowerCase().replace(/\s+/g, '_') : 'rimigo_website'
        return {
            utm_source,
            utm_medium: 'rimigo_website',
            utm_campaign: identifier || undefined
        }
    }, [startPlanningTripSource?.name, identifier])

    const handleStartPlanningNavigate = useStartPlanningCTA('ViewContentCollection Header', startPlanningUtmDefaults)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const curationStatus = (collectionMetadataResponse?.data as any)?.curation_status as string | undefined

    // const isInternalPublisher = publisherType === 'internal_user'

    // Fetch trip source information if publisher ID exists (collection is already tagged)
    // Skip for internal_user publishers — they show Rimigo branding directly
    // const { data: taggedTripSourceResponse } = useQuery({
    //     queryKey: ['trip-source-by-id', publisherId],
    //     queryFn: async () => {
    //         if (!publisherId) return null
    //         const response = await contentCollectionApi.getTripSourceById(publisherId)
    //         return response.data || null
    //     },
    //     enabled: !!publisherId && !isInternalPublisher,
    //     staleTime: HOURS_24,
    //     gcTime: HOURS_24
    // })

    // const taggedTripSource = taggedTripSourceResponse || null
    // const isTaggedToCreator = !!publisherId && !!taggedTripSource
    // const taggedEntityName = taggedTripSource?.entity_name || taggedTripSource?.name || null

    // Get collection ViewModel for formatted price
    const collectionViewModel = useMemo(() => {
        if (!collectionMetadataResponse?.data) return null
        return adaptContentCollectionToViewModel(collectionMetadataResponse.data)
    }, [collectionMetadataResponse?.data])

    // Toggle lives in the collection's `permissions` flag bag — default true.
    const showCustomiseTripButton = useMemo(() => {
        const flag = collectionMetadataResponse?.data?.permissions?.show_customise_trip_button
        return flag !== false
    }, [collectionMetadataResponse?.data?.permissions?.show_customise_trip_button])

    // Unlock data for the overlay — formatted price + an optional loved-count
    // surfaced from the collection's freeform metadata. Accept number OR
    // numeric-string (Mongo DictField can round-trip either depending on how
    // it was written). Falls back to TripUnlockSection's default if missing.
    const unlockData: TripUnlockData | null = useMemo(() => {
        if (!collectionViewModel?.formattedPrice) return null
        const rawLoved = collectionMetadataResponse?.data?.metadata?.loved_count
        const parsed = typeof rawLoved === 'string' ? Number(rawLoved) : rawLoved
        const lovedCount = typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined
        return {
            price: collectionViewModel.formattedPrice,
            lovedCount
        }
    }, [collectionViewModel?.formattedPrice, collectionMetadataResponse?.data?.metadata])

    // Fire a typed Page Viewed event once the collection metadata resolves.
    // `creator_handle` carries the inbound utm_source (referrer); the tripboard's
    // publisher is surfaced separately via `tripboard_owner` / `tripboard_owner_id`.
    useEffect(() => {
        if (!collectionMetadataResponse?.data) return
        trackEvent('Collection Detail Page Viewed', {
            creator_handle: utmSource,
            tripboard_owner: tripboardOwner.name,
            tripboard_owner_id: tripboardOwner.id,
            collection_id: collectionMetadataResponse.data.id ?? null,
            collection_title: collectionMetadataResponse.data.name ?? null,
            collection_slug: identifier ?? null,
            country_name: countryName ?? null
        })
    }, [
        collectionMetadataResponse?.data,
        utmSource,
        tripboardOwner.name,
        tripboardOwner.id,
        identifier,
        countryName,
        trackEvent
    ])

    // Determine if current tab should be locked based on config, user type, payment check, and presence of unlock data
    // If there's no unlockData (eg. free collection with no price), never treat the tab as locked
    const isTabLocked = useMemo(() => {
        if (!unlockData) return false
        if (hasPaidForCollection) return false
        return shouldShowLockedOverlayForTab('public_collections', activeTab, isRimigoInternal, isPremium)
    }, [unlockData, hasPaidForCollection, activeTab, isRimigoInternal, isPremium])

    // Delete section mutation
    const deleteSectionMutation = useMutation({
        mutationFn: async (sectionId: string) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.deleteSection(identifier, sectionId)
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            queryClient.invalidateQueries({ queryKey: ['content-collection-section-types', identifier] })
            toast.success('Section deleted successfully!')
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
            if (window.confirm('Are you sure you want to delete this section?')) {
                deleteSectionMutation.mutate(sectionId)
            }
        },
        [deleteSectionMutation]
    )

    // Check if delete button should be shown for current tab
    const showDeleteButton = useMemo(() => {
        return shouldAllowDeleteSection('public_collections', activeTab, isRimigoInternal)
    }, [activeTab, isRimigoInternal])

    // Get cityId from collection context or from first stay section
    const cityIdForFilters = useMemo(() => {
        if (!collectionMetadataResponse?.data) return undefined

        // Try collection context first
        const contextCityId = collectionMetadataResponse.data.context?.city_id
        if (contextCityId) {
            if (Array.isArray(contextCityId) && contextCityId.length > 0) {
                return contextCityId[0]
            }
            if (typeof contextCityId === 'string') {
                return contextCityId
            }
        }

        // Try to get from first stay section metadata
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

    // Fetch collection data for restaurants (for map) - always fetch regardless of active tab
    const { data: restaurantCollectionResponseForMap, isLoading: isRestaurantCollectionLoadingForMap } = useQuery({
        queryKey: ['content-collection', identifier, 'restaurant', 'map'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await contentCollectionApi.getByIdentifier(identifier, 'restaurant')
        },
        enabled: !!identifier,
        staleTime: 5 * 60 * 1000,
        gcTime: HOURS_24
    })

    // Only call map cities API after experience, stays, and food section responses have completed
    const sectionResponsesReadyForMap = !isExperienceCollectionLoading && !isStaysCollectionLoading && !isRestaurantCollectionLoadingForMap

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

    // Get default dates for map markers
    const defaultDatesForMap = useMemo(() => {
        const today = new Date()
        const checkIn = new Date(today)
        checkIn.setDate(today.getDate() + 1)
        const checkOut = new Date(today)
        checkOut.setDate(today.getDate() + 2)
        return {
            checkIn: checkIn.toISOString().split('T')[0],
            checkOut: checkOut.toISOString().split('T')[0]
        }
    }, [])

    // Fetch stay/accommodation metadata for map markers
    const { data: staysMetadataResponseForMap } = useQuery({
        queryKey: ['collection-stays-map', staysEntityIdsForMap, defaultDatesForMap.checkIn, defaultDatesForMap.checkOut],
        queryFn: async () => {
            if (staysEntityIdsForMap.length === 0) {
                return { data: { data: [] } }
            }
            return await getAccommodationMetadata({
                stay_ids: staysEntityIdsForMap,
                check_in_date: defaultDatesForMap.checkIn,
                check_out_date: defaultDatesForMap.checkOut
            })
        },
        enabled: staysEntityIdsForMap.length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: HOURS_24
    })

    const { stayPricesMap } = useStayPrices({
        stays: filteredStaysDataForPrices,
        stayMetadataMap,
        staysDatesMap,
        staysDates,
        guestsData: guestsDataForPrices,
        rimigoPrice: isRimigoInternal,
        tripId: activeTripId ?? undefined,
        enabled: activeTab === 'stays',
        collectionId: collectionId ?? null,
        // If a stay belongs to a section, wait for that section's metadata to be
        // checked before firing the query — prevents a wasted call with fallback dates.
        isStayReady: (stay) => {
            const stayKey = stay.zentrum_hub_id || stay.id
            const sectionId = staySectionMap?.get(stayKey)
            if (!sectionId) return true
            return staySectionMetadataMap?.has(sectionId) ?? false
        }
    })

    // Use map markers hook to handle all map-related logic (map cities API runs only after section responses are ready)
    const { mapMarkers, mapCityName, mapCityCenter, mapCities } = useCollectionMapMarkers({
        experienceCollectionResponse: experienceCollectionResponseForMap,
        staysCollectionResponse: staysCollectionResponseForMap,
        staysMetadataResponse: staysMetadataResponseForMap,
        stayPricesMap: stayPricesMap,
        cityIdForFilters,
        restaurantCollectionResponse: restaurantCollectionResponseForMap,
        includeCityMarkers: false,
        enableMapCitiesApi: sectionResponsesReadyForMap,
        enrichedExperiencesMap,
        isExperiencesEnrichmentLoading,
        itineraryData
    })

    // Check if the active tab should show the map based on config
    const shouldShowMap = useMemo(() => {
        return shouldShowMapForTab('public_collections', activeTab)
    }, [activeTab])

    // Check if date editing is allowed for the active tab based on config
    const allowDateEdit = useMemo(() => {
        return shouldAllowDateUpdateForTab('public_collections', activeTab, isRimigoInternal, isPremium)
    }, [activeTab, isRimigoInternal, isPremium])

    // Get overview data using adapter (must be before conditional returns to maintain hooks order)
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
        (markerId: string | number) => {
            const marker = mapMarkers.find((m) => m.id === markerId)
            if (!marker) return

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
                          groupType?: string
                          travel_purpose?: string
                      }
                    | undefined

                // Merge new params with existing params to preserve all query params
                // Include all parameters that are passed when clicking on cards in StaysTab
                const hotelSearchParams = createMergedQueryParams(searchParams, {
                    hotel_name: marker.name,
                    zentrum_hub_id: marker.zentrum_hub_id,
                    accommodation_id: String(marker.id),
                    check_in: onClickData?.checkIn || staysDates.checkIn,
                    check_out: onClickData?.checkOut || staysDates.checkOut,
                    city_id: onClickData?.cityId,
                    city_name: onClickData?.cityName,
                    travel_purpose: onClickData?.travel_purpose || searchParams.get('travel_purpose') || 'leisure_relaxation',
                    group_type: onClickData?.groupType || searchParams.get('group_type') || 'couple',
                    city_prefs: searchParams.get('city_prefs') || '',
                    review_type: 'complete',
                    adults: String(guestsDataForPrices.adults),
                    children: String(guestsDataForPrices.children),
                    infants: String(guestsDataForPrices.infants),
                    children_age: guestsDataForPrices.children_age.length > 0 ? guestsDataForPrices.children_age.join(',') : undefined
                })

                const url = `/stays/${marker.zentrum_hub_id}?${hotelSearchParams.toString()}`
                window.open(url, '_blank')
            } else if (marker.type === 'restaurant') {
                const mapsUrl = marker.onClickData?.maps_url as string | undefined
                if (mapsUrl) {
                    window.open(mapsUrl, '_blank')
                }
            }
        },
        [mapMarkers, searchParams, staysDates.checkIn, staysDates.checkOut, guestsDataForPrices]
    )

    // Show loading state for section types and experience collection (needed for collection metadata)
    if (isSectionTypesLoading || isExperienceCollectionLoading) {
        return <ViewContentCollectionLoading isRimigoInternal={isRimigoInternal} />
    }

    // Show error state for section types
    if (isSectionTypesError) {
        return <SectionTypesError isRimigoInternal={isRimigoInternal} />
    }

    // Show "no sections found" message when API returns successfully but with no section types
    if (!isSectionTypesLoading && !isSectionTypesError && sectionTypes.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName=""
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'my-3' }}
                />
                <div className="w-full max-w-[1380px] py-8 mx-auto px-4">
                    <div className="text-center py-12">
                        <Typography
                            size="16"
                            weight="medium"
                            color="grey-1">
                            No sections found. Try adding data in collections.
                        </Typography>
                    </div>
                </div>
            </div>
        )
    }

    // Show loading state for collection data
    if (isLoading || !activeTab) {
        return (
            <ViewContentCollectionLoading
                isRimigoInternal={isRimigoInternal}
                sectionTypes={allTabs}
                activeTab={activeTab}
                onTabClick={setActiveTab}
                showTabs={allTabs.length > 0 && !!activeTab}
            />
        )
    }

    // Show error state for collection data
    if (isError || !collectionResponseForActiveTab) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName=""
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'my-3' }}
                />
                <div className="w-full max-w-[1380px] py-8 mx-auto px-4">
                    {/* Show tabs if section types are loaded */}
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
                            {isError ? ERROR_MESSAGES.FAILED_TO_LOAD : 'Collection not found'}
                        </Typography>
                    </div>
                </div>
            </div>
        )
    }

    // Allow Overview tab to render even without collection API data
    if (!response?.data && activeTab !== 'overview') {
        return <CollectionNotFound />
    }

    // For Overview tab, we can render even without collection data (uses dummy data)
    const collection: ContentCollectionViewModel | null = response?.data ? adaptContentCollectionToViewModel(response.data) : null

    // Social / SEO meta — drives WhatsApp, Facebook, Twitter, LinkedIn preview cards.
    // Pulled from the collection's own fields so shared links render with the trip/
    // collection name + cover image instead of the generic Rimigo defaults.
    const socialTitle = collection?.name || 'Rimigo Collection'
    const socialDescription = collection?.description || undefined
    const socialImage = collection?.imageUrl || undefined

    return (
        // Provider mount: makes useCollectionId() return the actual CC ObjectId
        // (not the slug) for everything below. Sneak-peek modals + any descendant
        // that calls useToursForExperience (or any hook reading the context)
        // get the unambiguous id → BE resolves via the ObjectId path → content_collection
        // is captured on the minted AttributionContext.
        <TripCollectionRecommendationsProvider
            recommendations={null}
            collectionIdentifier={identifier ?? null}
            collectionId={collectionId ?? null}>
        <div className={!isAuthenticated ? 'h-screen overflow-y-auto overflow-x-hidden w-full' : 'max-lg:h-full'}>
            <SocialMeta
                title={socialTitle}
                description={socialDescription}
                image={socialImage}
            />
            {/* Mobile: fixed-height shell, header/tabs pinned. Scroll wrapper is
                OUTSIDE RimigoLockedOverlay so locked/unlocked behave the same. */}
            <div className="bg-white max-lg:h-full max-lg:min-w-0 max-lg:flex max-lg:flex-col max-lg:overflow-hidden lg:min-h-screen">
                <SearchHeader
                    pageName="Tripboards"
                    mobileBrandAsLogo
                    centerTitle={collection?.name || ''}
                    centerTitleClassName="max-md:flex!"
                    hideTripSummaryBadge
                    pageNameBadge={
                        isRimigoInternal && curationStatus ? (
                            <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    curationStatus === 'published'
                                        ? 'bg-green-100 text-green-700'
                                        : curationStatus === 'draft'
                                          ? 'bg-amber-100 text-amber-700'
                                          : curationStatus === 'archived'
                                            ? 'bg-grey-4 text-grey-2'
                                            : 'bg-blue-100 text-blue-700'
                                }`}>
                                {curationStatus}
                            </span>
                        ) : undefined
                    }
                    assistantConfig={{ enabled: false }}
                    headerExtraActions={
                        <>
                            <ShareButton
                                shareLink={typeof window !== 'undefined' ? window.location.href : ''}
                                location="ViewContentCollection Header"
                                useNativeShare
                                className="max-md:hidden!"
                                trackingData={{
                                    collectionId: collection?.id,
                                    collectionIdentifier: identifier,
                                    activeTab
                                }}
                            />
                            {collectionViewModel?.formattedPrice && showCustomiseTripButton ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        trackButtonClickCustom({
                                            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                            buttonName: POSTHOG_EVENTS.COLLECTION_CUSTOMIZE_TRIP_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: {
                                                collectionId: collection?.id,
                                                collectionIdentifier: identifier,
                                                collectionName: collection?.name,
                                                price: collectionViewModel?.formattedPrice,
                                                isPaid: true,
                                                isAuthenticated,
                                                activeTab
                                            }
                                        })
                                        handleStartPlanningNavigate()
                                    }}
                                    className="hidden md:flex items-center gap-2 border border-primary-default bg-white text-primary-default rounded-[8px] px-3 py-2 text-sm font-bold font-red-hat-display hover:bg-primary-default/5 transition-colors cursor-pointer">
                                    PLAN MY TRIP
                                </button>
                            ) : !collectionViewModel?.formattedPrice && !isAuthenticated ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        trackButtonClickCustom({
                                            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                            buttonName: POSTHOG_EVENTS.COLLECTION_START_PLANNING_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: {
                                                collectionId: collection?.id,
                                                collectionIdentifier: identifier,
                                                collectionName: collection?.name,
                                                isPaid: false,
                                                isAuthenticated,
                                                activeTab
                                            }
                                        })
                                        handleStartPlanningNavigate()
                                    }}
                                    className="hidden md:flex items-center gap-3 px-4 h-9.5 rounded-xl text-white cursor-pointer text-sm font-semibold tracking-[-0.28px] font-red-hat-display"
                                    style={{
                                        borderRadius: 8,
                                        background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                    }}>
                                    Start planning
                                </button>
                            ) : null}
                        </>
                    }
                    hideDefaultLoginButton
                    ctaConfig={{
                        enabled: !!collectionViewModel?.formattedPrice,
                        text: isProcessingPayment
                            ? 'Processing...'
                            : collectionViewModel?.formattedPrice
                              ? `Unlock for ${collectionViewModel.formattedPrice}`
                              : 'Buy',
                        icon: () => <></>,
                        disabled: false,
                        onCTAClick: () => {
                            handleBuyClick({ trigger: 'header_cta', tab: activeTab ?? undefined })
                        },
                        posthog: {
                            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                            buttonName: POSTHOG_EVENTS.HEADER_BUY_NOW_CLICK,
                            extra: {
                                collectionId: collection?.id,
                                price: collectionViewModel?.formattedPrice
                            }
                        },
                        className:
                            'hidden! md:flex! items-center! border-none! font-red-hat-display! font-semibold! text-white! hover:opacity-90! py-2.5! px-4! rounded-[8px]! bg-[linear-gradient(90deg,var(--primary-indigo,#7011F6)_0%,var(--primary-dark,#4D1D91)_100%)]! text-sm!'
                    }}
                    containerClass="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                    breadcrumbsConfig={{ enabled: false, className: '' }}
                    logodivClassname="pt-2! md:py-4!"
                />
                <div className="w-full mx-auto max-lg:flex-1 max-lg:min-h-0 max-lg:min-w-0 max-lg:flex max-lg:flex-col">
                    <div className="max-lg:shrink-0 lg:contents">
                        <CollectionTabs
                            sectionTypes={allTabs}
                            activeTab={activeTab}
                            onTabClick={setActiveTab}
                            sticky={true}
                            stickyZClassName={isTabLocked ? 'z-[100]' : 'z-60'}
                            isRimigoInternal={isRimigoInternal}
                            collectionIdentifier={identifier}
                            onSectionAdded={() => {
                                // Invalidate queries to refetch section types and collection data
                                queryClient.invalidateQueries({ queryKey: ['content-collection-section-types', identifier] })
                                queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
                            }}
                        />
                    </div>
                    {/* Single mobile scroller, wrapping RimigoLockedOverlay from outside. */}
                    <div
                        ref={tabScrollContainerRef}
                        className="max-lg:flex-1 max-lg:min-h-0 max-lg:min-w-0 max-lg:overflow-y-auto max-lg:overflow-x-hidden max-lg:overscroll-contain">
                    <RimigoLockedOverlay
                        isLocked={isTabLocked}
                        unlockData={unlockData}
                        enabled={!!unlockData}
                        countryId={countryId}
                        containerClassName="top-[calc(87px+57px)] md:top-0"
                        onBuyClick={() => {
                            handleBuyClick({ trigger: 'header_cta', tab: activeTab ?? undefined })
                        }}
                        isProcessingPayment={isProcessingPayment}
                        className="w-full md:min-h-[calc(100vh-87px-50px)]">
                        <div className={cn(`flex flex-col lg:flex-row mx-auto lg:gap-0`)}>
                            <div
                                className={`[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] max-lg:min-w-0 max-lg:overflow-x-clip ${
                                    mapMarkers.length > 0 && shouldShowMap ? 'w-full lg:w-[640px] xl:w-[720px] shrink-0 bg-grey-5' : 'w-full'
                                }`}
                                style={{
                                    scrollbarWidth: 'none',
                                    // Desktop-only own scroller (map alignment); on
                                    // mobile a nested scroller here breaks scrolling.
                                    ...(mapMarkers.length > 0 && shouldShowMap && !isMobile
                                        ? {
                                              height: 'calc(100vh - 87px - 57px)',
                                              overflowY: 'auto'
                                          }
                                        : {})
                                }}>
                                {/* Sticky header portal — inside scroll container so map stays aligned at top */}
                                <div
                                    ref={staysHeaderPortalRef}
                                    className={cn(
                                        'sticky top-0 z-20 bg-white shadow-[0px_2px_4px_rgba(0,0,0,0.08)]',
                                        activeTab !== 'stays' && activeTab !== 'experience' && 'hidden'
                                    )}
                                />
                                {/* Header Section - Title and Description */}

                                <div className="flex flex-col gap-3 ">
                                    <div className="flex flex-col items-between justify-start gap-4  ">
                                        <div className="flex flex-row items-start justify-end gap-3 flex-1 ">
                                            {/* Creator Info Box */}
                                            {/* <CreatorInfoBox publisherId={publisherId} /> */}
                                        </div>
                                        {isRimigoInternal && identifier && activeTab !== 'restaurant' && (
                                            <div className="flex items-center gap-2">
                                                {/* Create activities from itinerary button - only show when itinerary tab is active */}
                                                {activeTab === 'itinerary' && (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!identifier) return
                                                            setIsCreatingActivitiesFromItinerary(true)
                                                            try {
                                                                await contentCollectionApi.addExperiencesFromItinerary(identifier)
                                                                toast.success('Activities created from itinerary successfully')
                                                                // Invalidate queries to refresh the experience tab
                                                                queryClient.invalidateQueries({
                                                                    queryKey: ['content-collection', identifier, 'experience']
                                                                })
                                                                queryClient.invalidateQueries({
                                                                    queryKey: ['content-collection-section-types', identifier]
                                                                })
                                                            } catch (error) {
                                                                console.error('Error creating activities from itinerary:', error)
                                                                toast.error('Failed to create activities from itinerary. Please try again.')
                                                            } finally {
                                                                setIsCreatingActivitiesFromItinerary(false)
                                                            }
                                                        }}
                                                        disabled={isCreatingActivitiesFromItinerary}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {isCreatingActivitiesFromItinerary ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-4 h-4" />
                                                                Create activities from itinerary
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                {/* Add to trip - moved to edit page */}
                                                {/* <button
                                                    type="button"
                                                    onClick={() => setIsAddToTripModalOpen(true)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm">
                                                    <Plus className="w-4 h-4" />
                                                    Add to trip
                                                </button> */}
                                                {/* Tag to Creator - moved to edit page Features tab */}
                                                {/* {isTaggedToCreator ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 bg-grey-5 text-grey-2 font-red-hat-display font-semibold text-sm cursor-not-allowed">
                                                        Tagged to {taggedEntityName}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsTagToCreatorModalOpen(true)}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm">
                                                        Tag to Creator
                                                    </button>
                                                )} */}
                                                {/* Tag to traveler - commented out for now */}
                                                {/* <button
                                                    type="button"
                                                    onClick={() => setIsTagToTravelerModalOpen(true)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm">
                                                    Tag to traveler
                                                </button> */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigate(`${RIMIGO_COLLECTION_ROUTE}/${countryName}/${identifier}/edit`)
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm">
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* List Content */}
                                <div className={`relative ${mobileActiveTab === 'map' ? 'max-md:hidden' : ''}`}>
                                    {/* Render all tab content, hide inactive tabs with CSS */}
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
                                                        collectionName={collection?.name}
                                                        contentCollectionMetadataId={response?.data?.content_collection_metadata || null}
                                                        publisherId={publisherId}
                                                        publisherType={publisherType}
                                                        countryId={countryId}
                                                        onBuyClick={() => {
                                                            handleBuyClick({ trigger: 'header_cta', tab: activeTab ?? undefined })
                                                        }}
                                                        hideDescription={true}
                                                        isProcessingPayment={isProcessingPayment}
                                                        showCreatorAndUnlockSection={true}
                                                        dailyHighlightsContent={
                                                            itineraryEntityId ? (
                                                                <TripDailyHighlightsSection
                                                                    days={itineraryData?.days ?? []}
                                                                    isLoading={isItineraryLoading && (itineraryData?.days?.length ?? 0) === 0}
                                                                    onDayClick={(dayIdx) => navigateToItineraryTab(dayIdx)}
                                                                    onViewFullItinerary={() => navigateToItineraryTab(undefined, { view: 'board' })}
                                                                />
                                                            ) : null
                                                        }
                                                    />
                                                )}

                                                {/* Experience tab */}
                                                {sectionTypeValue === 'experience' && (
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
                                                        sectionMetadataMap={sectionMetadataMap}
                                                        allowDateEdit={isRimigoCollection ? false : allowDateEdit}
                                                        onDeleteSection={showDeleteButton ? handleDeleteSection : undefined}
                                                        isDeleting={deleteSectionMutation.isPending}
                                                        collectionType="content"
                                                        queryKeyPrefix="content-collection"
                                                        fallbackMode="public"
                                                        exploreCountryId={countryId}
                                                        hideExactDates={isRimigoCollection}
                                                        tripStartDate={tripStartDate}
                                                        itineraryDays={itineraryData?.days}
                                                    />
                                                )}

                                                {/* Stays tab */}
                                                {sectionTypeValue === 'stays' && (
                                                    <StaysTab
                                                        isStaysLoading={isStaysLoading}
                                                        staysData={staysData}
                                                        stayMetadataMap={stayMetadataMap}
                                                        cityId={cityIdForFilters}
                                                        onDatesChange={() => {
                                                            // Invalidate stays query to refetch with new dates
                                                            queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                                                            queryClient.invalidateQueries({ queryKey: ['collection-stay-price'] })
                                                        }}
                                                        collectionIdentifier={identifier}
                                                        staySectionMap={staySectionMap}
                                                        staySectionMetadataMap={staySectionMetadataMap}
                                                        allowDateEdit={isRimigoCollection ? false : allowDateEdit}
                                                        buttonPage={POSTHOG_PAGES.COLLECTION_PAGE}
                                                        stayPricesMap={stayPricesMap}
                                                        isFilterOpen={isStaysFilterOpen}
                                                        isSortOpen={isStaysSortOpen}
                                                        onFilterOpenChange={setIsStaysFilterOpen}
                                                        onSortOpenChange={setIsStaysSortOpen}
                                                        countryIds={countryId ? [countryId] : undefined}
                                                        onDeleteSection={showDeleteButton ? handleDeleteSection : undefined}
                                                        isDeleting={deleteSectionMutation.isPending}
                                                        sectionBlocksMap={sectionBlocksMap}
                                                        collectionType="content"
                                                        queryKeyPrefix="content-collection"
                                                        fallbackMode="public"
                                                        showExploreToggle={false}
                                                        hideExactDates={isRimigoCollection}
                                                        tripStartDate={tripStartDate}
                                                        itineraryDays={itineraryData?.days}
                                                        routeSummary={routeSummary}
                                                        onMapViewClick={
                                                            mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined
                                                        }
                                                        headerPortalRef={staysHeaderPortalRef}
                                                        isActive={activeTab === 'stays'}
                                                        hideSelectItineraryButton={true}
                                                        hideGuestFilterAndExplore={true}
                                                        enrichedStaysMap={enrichedStaysMap}
                                                        shortlistSections={shortlistSectionsForDedupe}
                                                        isReadOnly={!showDeleteButton}
                                                    />
                                                )}

                                                {/* Must Have tab — wraps Tips, Useful Links, Visa,
                                                    SIM & Connectivity as subtabs. The four section
                                                    types collapse into a single `must_have` tab
                                                    via baseAllTabs above. */}
                                                {sectionTypeValue === 'must_have' && identifier && (
                                                    <MustHaveTabContent
                                                        isRimigoInternal={isRimigoInternal}
                                                        collectionIdentifier={identifier}
                                                        isActive={activeTab === 'must_have'}
                                                        api={contentCollectionApi}
                                                        stickyTop={{ mobile: 0, desktop: 120 }}
                                                    />
                                                )}

                                                {/* Itinerary tab content */}
                                                {sectionTypeValue === 'itinerary' && identifier && (
                                                    <div>
                                                        <ItineraryTabContent
                                                            isRimigoInternal={isRimigoInternal}
                                                            collectionIdentifier={identifier}
                                                            isActive={activeTab === 'itinerary'}
                                                            hideExactDates={isRimigoCollection}
                                                            onItineraryLinked={() => {
                                                                queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
                                                                queryClient.invalidateQueries({
                                                                    queryKey: ['content-collection-section-types', identifier]
                                                                })
                                                                queryClient.invalidateQueries({
                                                                    queryKey: ['content-collection', identifier, 'itinerary']
                                                                })
                                                            }}
                                                            showCloneButton={false}
                                                            api={contentCollectionApi}
                                                        />
                                                    </div>
                                                )}

                                                {/* Food tab content (section_type restaurant) */}
                                                {sectionTypeValue === 'restaurant' && identifier ? (
                                                    <FoodTabContent
                                                        activeCollectionResponse={restaurantCollectionResponseForMap}
                                                        activeTab={activeTab}
                                                        isCollectionLoading={isCollectionLoading}
                                                        isRimigoInternal={isRimigoInternal}
                                                        isActive={activeTab === 'restaurant'}
                                                        collectionIdentifier={identifier}
                                                        onFoodItemAdded={() => {
                                                            queryClient.invalidateQueries({
                                                                queryKey: ['content-collection', identifier, 'restaurant']
                                                            })
                                                        }}
                                                        api={contentCollectionApi}
                                                        hoveredCardId={hoveredCardId}
                                                        setHoveredCardId={setHoveredCardId}
                                                        countryId={countryId}
                                                        onMapViewClick={
                                                            mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined
                                                        }
                                                        itineraryData={itineraryData}
                                                    />
                                                ) : null}

                                                {/* Bookings (budget) tab — public collection view. isPublic
                                                    drives the public rules (flights excluded, etc.). */}
                                                {sectionTypeValue === 'budget' && identifier && (
                                                    <BookingsTab
                                                        identifier={identifier}
                                                        isPublic={true}
                                                        // Internal users can recalculate + manage the public
                                                        // budget (provider selection, curated bookings).
                                                        // Regular public viewers are read-only. (The budget
                                                        // tab isn't a deletable section, so showDeleteButton
                                                        // would be false even for internal users.)
                                                        readOnly={!isRimigoInternal}
                                                        isActive={activeTab === 'budget'}
                                                    />
                                                )}

                                                {/* Handle other section types */}
                                                {sectionTypeValue !== 'experience' &&
                                                    sectionTypeValue !== 'stays' &&
                                                    sectionTypeValue !== 'overview' &&
                                                    sectionTypeValue !== 'must_have' &&
                                                    sectionTypeValue !== 'itinerary' &&
                                                    sectionTypeValue !== 'dos_donts' &&
                                                    sectionTypeValue !== 'budget' &&
                                                    sectionTypeValue !== 'restaurant' && (
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
                                                                        className="w-full border"
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

                            {/* Right Side: Map - Sticky (skip entirely when locked behind paywall; mobile: deferred until user switches to map tab) */}
                            {mapMarkers.length > 0 && shouldShowMap && !isTabLocked && (
                                <div
                                    className={`relative flex-1 lg:sticky lg:self-start w-full ${mobileActiveTab === 'list' ? 'max-md:hidden' : 'md:hidden lg:block'}`}>
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
                                            height="calc(100vh - 87px - 57px)"
                                            className="h-[70vh] md:h-[60vh] lg:h-auto"
                                            cityId={selectedCityId ?? undefined}
                                            showMarkerTypeFilters
                                            activeTab={activeTab}
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
                                        />
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </RimigoLockedOverlay>
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

                    {/* Sneak Peek Modal */}
                    {sneakPeekExperienceId && (
                        <SneakPeekModal
                            isOpen={!!sneakPeekExperienceId}
                            onClose={handleCloseSneakPeek}
                            experienceId={sneakPeekExperienceId}
                        />
                    )}

                    {/* Add to Trip Modal */}
                    {isRimigoInternal && identifier && collection && (
                        <AddToTripModal
                            isOpen={isAddToTripModalOpen}
                            onClose={() => setIsAddToTripModalOpen(false)}
                            collectionIdentifier={identifier}
                            collectionName={collection?.name || ''}
                            onSuccess={() => {
                                // Optionally refresh data or show success message
                            }}
                        />
                    )}

                    {/* Tag to Creator Modal */}
                    {isRimigoInternal && identifier && collection && (
                        <TagToCreatorModal
                            isOpen={isTagToCreatorModalOpen}
                            onClose={() => setIsTagToCreatorModalOpen(false)}
                            collectionIdentifier={identifier}
                            collectionName={collection?.name || ''}
                            onSuccess={() => {
                                // Optionally refresh data or show success message
                            }}
                        />
                    )}

                    {/* Tag to Traveler Modal */}
                    {isRimigoInternal && identifier && collection && (
                        <TagToTravelerModal
                            isOpen={isTagToTravelerModalOpen}
                            onClose={() => setIsTagToTravelerModalOpen(false)}
                            collectionIdentifier={identifier}
                            collectionName={collection?.name || ''}
                            onSuccess={() => {
                                // Optionally refresh data or show success message
                            }}
                        />
                    )}
                </div>
                {activeTab === 'overview' && (!isAuthenticated || collectionViewModel?.formattedPrice) && (
                    <MobileStickyCTA
                        leadingShareButton={{
                            label: 'Share',
                            ariaLabel: 'Share collection',
                            onClick: async () => {
                                const shareLink = typeof window !== 'undefined' ? window.location.href : ''
                                trackButtonClickCustom({
                                    buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                    buttonName: 'mobile_sticky_share_click',
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: {
                                        collectionId: collection?.id,
                                        collectionIdentifier: identifier,
                                        share_link: shareLink,
                                        activeTab
                                    }
                                })
                                if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                                    try {
                                        await navigator.share({ url: shareLink })
                                        return
                                    } catch (error) {
                                        if ((error as DOMException)?.name === 'AbortError') return
                                    }
                                }
                                try {
                                    if (navigator.clipboard && window.isSecureContext) {
                                        await navigator.clipboard.writeText(shareLink)
                                        toast.success('Link copied to clipboard')
                                        return
                                    }
                                } catch {
                                    toast.error('Failed to copy link')
                                }
                            }
                        }}
                        buttons={[
                            {
                                title: isProcessingPayment
                                    ? 'PROCESSING...'
                                    : collectionViewModel?.formattedPrice
                                      ? `UNLOCK FOR ${collectionViewModel.formattedPrice}`
                                      : 'START PLANNING',
                                onClick: () => {
                                    if (collectionViewModel?.formattedPrice) {
                                        handleBuyClick({ trigger: 'header_cta', tab: activeTab ?? undefined })
                                    } else {
                                        trackButtonClickCustom({
                                            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                            buttonName: POSTHOG_EVENTS.COLLECTION_START_PLANNING_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: {
                                                collectionId: collection?.id,
                                                collectionIdentifier: identifier,
                                                collectionName: collection?.name,
                                                isPaid: false,
                                                isAuthenticated,
                                                activeTab
                                            }
                                        })
                                        handleStartPlanningNavigate()
                                    }
                                },
                                textStyle:
                                    'border-primary-default font-red-hat-display font-extrabold bg-primary-default text-white hover:bg-primary-default/90 text-[15px]'
                            }
                        ]}
                        secondaryLink={
                            collectionViewModel?.formattedPrice && showCustomiseTripButton
                                ? {
                                      text: 'Plan my trip',
                                      onClick: () => {
                                          trackButtonClickCustom({
                                              buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                              buttonName: POSTHOG_EVENTS.COLLECTION_CUSTOMIZE_TRIP_CLICK,
                                              buttonAction: POSTHOG_ACTIONS.CLICK,
                                              extra: {
                                                  collectionId: collection?.id,
                                                  collectionIdentifier: identifier,
                                                  collectionName: collection?.name,
                                                  price: collectionViewModel?.formattedPrice,
                                                  isPaid: true,
                                                  isAuthenticated,
                                                  activeTab
                                              }
                                          })
                                          handleStartPlanningNavigate()
                                      }
                                  }
                                : undefined
                        }
                        showOnScroll={false}
                        subtext={
                            collectionViewModel?.formattedPrice && showCustomiseTripButton
                                ? undefined
                                : {
                                      text: 'Unlock and customise your trip',
                                      icon: 'https://media.rimigo.com/1770392437640_lock_thiings.webp',
                                      className: 'text-gray-600'
                                  }
                        }
                        backgroundClassName="shadow-[0_-10px_60px_rgba(0,0,0,0.15)]"
                        buttonsContainerClassName="flex-col"
                    />
                )}
            </div>
        </div>
        </TripCollectionRecommendationsProvider>
    )
}

export default ViewContentCollection
