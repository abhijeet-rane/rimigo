import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData, useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'

import CustomShimmer from '@/components/shared/Shimmer'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { useUserInfo } from '@/hooks/useUserInfo'
import { ApiResponse, ContentCollection, ContentCollectionViewModel, Section } from '../../types/contentCollection'
import { projectStaySectionsForDedupe } from '../../utils/staysShortlistDedupe'
import { adaptCollectionSectionToExperienceCard, resolveExperienceCardData } from '../../adapter/experienceCardAdapter'
import { useExperiencesEnrichment } from '../../hooks/useExperiencesEnrichment'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { AccommodationMetadataItem, getAccommodationMetadata } from '@/pages/Stays/Apis'
import { useCollectionMapMarkers } from '../../hooks/useCollectionMapMarkers'
import { adaptCollectionToOverviewData } from '../../adapter/overviewAdapter'
import ViewContentCollectionLoading from '../../components/ViewContentCollectionLoading'
import SectionTypesError from '../../components/SectionTypesError'
import SearchHeader from '@/components/common/SearchHeader'
import CollectionTabs from '../../components/CollectionTabs'
import Typography from '@/components/shared/Typography'
import CollectionNotFound from '../../components/CollectionNotFound'
import { adaptContentCollectionToViewModel } from '../../adapter/contentCollectionAdapter'
import OverviewTabContent from '../../components/OverviewTabContent'
import ExperienceTab from '../../components/ExperienceTab'
import StaysTab from '../../components/StaysTab'
import MustHaveTabContent from '../../components/MustHaveTabContent'
import { collapseMustHave } from '@/modules/Tripboard/utils/tabArrangement'
import ItineraryTabContent from '../../components/ItineraryTabContent'
import { useItineraryCompletedData, useItineraryRouteSummary, type IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import TripDailyHighlightsSection from '@/modules/Tripboard/components/TripDailyHighlightsSection'
import { resetWindowScrollAfterItineraryTabMobile, scrollTripboardToTopOnMobile } from '@/modules/Tripboard/utils/scrollForItineraryTabMobile'
import { useIsMobile } from '@/hooks/use-mobile'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeekModal'
import AddToCollectionModal from '../../components/AddToCollectionModal'
import { GenericMap, MapMarker } from '@/components/shared/Map'
import { travelerCollectionApi } from '../../api/travelerCollectionApi'
import { TripCollectionRecommendationsProvider, PersonalTourRecommendation } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import { shouldShowMapForTab, shouldAllowDateUpdateForTab, getSectionTypesVisibleInTabs, shouldAllowDeleteSection } from '../../lib/collectionConfig'
import FoodTabContent from '../../components/FoodTabContent'
import { itineraryHasMealSlots } from '../../utils/itineraryFoodAdapter'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useStaysGuestsData } from '@/modules/ContentCollection/hooks/useStaysGuestsData'
import { useStayPrices } from '@/modules/ContentCollection/hooks/useStayPrices'
import { formatDateStringToYMD, formatDateToYMD, isPastDate, getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

interface SectionType {
    section_type: string
    name: string
}

const TravelerCollectionDetailsPage: React.FC = () => {
    const { identifier } = useParams<{ identifier: string }>()
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
    // Track if user has ever switched to map tab — defer Mapbox init on mobile until needed (saves Mapbox credits)
    const [hasEverOpenedMobileMap, setHasEverOpenedMobileMap] = useState(false)
    useEffect(() => {
        if (mobileActiveTab === 'map') setHasEverOpenedMobileMap(true)
    }, [mobileActiveTab])

    // Mobile content scroller; reset on tab change so sticky sub-headers don't clip.
    const tabScrollContainerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!activeTab) return
        scrollTripboardToTopOnMobile(tabScrollContainerRef.current)
    }, [activeTab])
    // Reset mobile tab to list when switching main tabs (prevents map hiding list content on other tabs)
    useEffect(() => {
        setMobileActiveTab('list')
    }, [activeTab])
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const { isRimigoInternal, isPremium } = useUserInfo()
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const travelerTripsContext = useOptionalTravelerTrips()
    const tripId = travelerTripsContext?.activeTrip?.trip_id ?? null
    const [isStaysFilterOpen, setIsStaysFilterOpen] = useState(false)
    const [isStaysSortOpen, setIsStaysSortOpen] = useState(false)

    // Fetch section types
    const {
        data: sectionTypesResponse,
        isLoading: isSectionTypesLoading,
        isError: isSectionTypesError
    } = useQuery({
        queryKey: ['traveler-collection-section-types', identifier],
        queryFn: async () => {
            return await travelerCollectionApi.getSectionTypes(identifier)
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
    // `baseAllTabs` is purely from `/section-types`. The final `allTabs`
    // (defined later, once itineraryData is in scope) optionally appends a
    // synthetic `restaurant` entry when the itinerary has meals.
    const baseAllTabs: SectionType[] = useMemo(() => {
        const visibleSectionTypes = getSectionTypesVisibleInTabs('traveler_collections', sectionTypes)
        const withDisplayNames = visibleSectionTypes.map((t) => {
            if (t.section_type === 'restaurant') return { ...t, name: 'Food' }
            if (t.section_type === 'experience') return { ...t, name: 'Activities' }
            return t
        })
        return collapseMustHave(withDisplayNames)
    }, [sectionTypes])

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
        queryKey: ['traveler-collection', identifier, 'itinerary'],
        queryFn: async () => {
            if (!identifier) return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            return await travelerCollectionApi.getByIdentifier(identifier, 'itinerary')
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
    // Sleep-city-driven chip windows for the StaysTab — matches tripboard
    // and public collection semantics so return-trip cities aren't dropped
    // and day-trip-only cities don't surface a spurious chip.
    const { data: routeSummary } = useItineraryRouteSummary(itineraryEntityId ?? '')

    // Synthesize a Food tab when the collection has no restaurant sections
    // but the itinerary has `kind: 'meal'` slots. FoodTabContent's fallback
    // path then renders directly from itinerary data.
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
        return { stayMetadataMap: metadataMap, staySectionMap: sectionMap, staySectionMetadataMap: sectionMetadataMap }
    }, [activeCollectionResponse, activeTab])

    // Shortlist dedupe input — kept separate from `staySectionMap` (which
    // collapses entity_id -> sectionId and would hide duplicates).
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

    // Union of section-derived + itinerary-slot-derived experience ids — see
    // TripboardPage for rationale.
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

    // Bulk-fetch experience card data. Gated to the two tabs that render
    // experiences — Activities (list + map) and Stays (activity markers on
    // the stays map alongside hotels).
    const experienceEnrichmentEnabled = activeTab === 'experience' || activeTab === 'stays'
    const { enrichedExperiencesMap, isEnrichmentLoading: isExperiencesEnrichmentLoading } = useExperiencesEnrichment({
        experienceIds: experienceIdsForEnrichment,
        enabled: experienceEnrichmentEnabled
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
        // Wait on enrichment; slim section metadata can't render alone.
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

    // Slot-derived list for the "In your itinerary" view — see TripboardPage.
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
        const map = new Map<string, import('../../types/contentCollection').ExperienceComment[]>()
        const raw = (
            activeCollectionResponse?.data?.metadata as
                | { experience_comments?: import('../../types/contentCollection').ExperienceComment[] }
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

    // Build a map of section ID → blocks (for comments rendering in tabs)
    const sectionBlocksMap = useMemo(() => {
        const map = new Map<string, import('../../types/contentCollection').Block[]>()
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
                check_in_date: staysDates.checkIn,
                check_out_date: staysDates.checkOut,
                property_types: filterParams.propertyTypes.length > 0 ? filterParams.propertyTypes : undefined,
                amenities: filterParams.amenities.length > 0 ? filterParams.amenities : undefined
            })
        },
        enabled: activeTab === 'stays' && entityIds.length > 0,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes - stays metadata can change with dates
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

                // zentrum_hub_id is separate from entity_id; use only metadata.zentrum_hub_id
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
            // If no city selected, return empty array to prevent queries for all stays
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

        const addDaysYMD = (ymd: string, days: number): string => {
            const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
            const dt = new Date(y, (m || 1) - 1, d || 1)
            dt.setDate(dt.getDate() + days)
            return formatDateToYMD(dt) || defaultCheckOut
        }

        filteredStaysDataForPrices.forEach((stay) => {
            const stayKey = stay.zentrum_hub_id || stay.id
            const sectionId = staySectionMap?.get(stayKey)
            const sectionMetadata = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
            const metadata = sectionMetadata as { start_date?: string | null; end_date?: string | null } | undefined

            const rawStart = metadata?.start_date ? formatDateStringToYMD(metadata.start_date) : null
            const rawEnd = metadata?.end_date ? formatDateStringToYMD(metadata.end_date) : null

            let checkIn = rawStart || defaultCheckIn
            if (checkIn && isPastDate(checkIn)) checkIn = defaultCheckIn

            let checkOut = rawEnd || ''
            if (!checkOut || isPastDate(checkOut)) {
                checkOut = addDaysYMD(checkIn, 1)
            }
            if (checkOut <= checkIn) {
                checkOut = addDaysYMD(checkIn, 1)
            }

            datesMap.set(stayKey, { checkIn, checkOut })
        })

        return datesMap
    }, [filteredStaysDataForPrices, staySectionMap, staySectionMetadataMap])

    // Priority: trip.group_setup (persisted from wizard) > trip_preference > tripProfile
    const tripData = travelerTripsContext?.activeTrip
    const guestsDataForPrices = useStaysGuestsData(
        tripData?.group_setup ?? tripData?.trip_preference?.group_setup ?? tripData?.tripProfile?.group_setup
    )
    const roomsForPrices = useMemo(() => parseInt(searchParams.get('rooms') || '1', 10) || 1, [searchParams])

    const { stayPricesMap, isAnyPriceLoading } = useStayPrices({
        stays: filteredStaysDataForPrices,
        stayMetadataMap,
        staysDatesMap,
        staysDates,
        guestsData: guestsDataForPrices,
        roomsCount: roomsForPrices,
        rimigoPrice: isRimigoInternal,
        tripId: tripId ?? undefined,
        enabled: activeTab === 'stays',
        collectionId: collectionMetadataResponse?.data?.id ?? null
    })

    // Loading state: use experience collection loading for collection metadata, active tab loading for sections
    const isLoading = isExperienceCollectionLoading || isCollectionLoading
    const isError = isCollectionError

    // Get publisher ID from collection response
    // Must be done before conditional returns to maintain hooks order
    const publisherId = useMemo(() => {
        if (!collectionMetadataResponse?.data) return null
        return collectionMetadataResponse.data.publisher?.publisher_id || null
    }, [collectionMetadataResponse?.data?.publisher?.publisher_id])

    // Fetch trip source for "Tagged to creator" state (internal users)
    // Get cityId from collection context or from first stay section
    const cityIdForFilters = useMemo(() => {
        if (!activeCollectionResponse?.data) return undefined

        // Try collection context first
        const contextCityId = activeCollectionResponse.data.context?.city_id
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
    const isStaysCollectionLoadingForMap = isStaysCollectionLoading

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
    const sectionResponsesReadyForMap = !isExperienceCollectionLoading && !isStaysCollectionLoadingForMap && !isRestaurantCollectionLoadingForMap

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
    const { data: staysMetadataResponseForMap, isLoading: isStaysMetadataLoadingForMap } = useQuery({
        queryKey: ['traveler-collection-stays-map', staysEntityIdsForMap, defaultDatesForMap.checkIn, defaultDatesForMap.checkOut],
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

    // Calculate map loading state from all map-related queries
    const isMapLoading = useMemo(() => {
        return isStaysCollectionLoadingForMap || isStaysMetadataLoadingForMap || isAnyPriceLoading
    }, [isStaysCollectionLoadingForMap, isStaysMetadataLoadingForMap, isAnyPriceLoading])

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

    // Log map loading state for debugging (can be removed in production)
    useEffect(() => {
        if (isMapLoading) {
            // Map data is still loading
        }
    }, [isMapLoading])

    // Check if the active tab should show the map based on config.
    // Experience tab additionally hides the map column when the user is
    // on the "Explore" subtab OR has explicitly clicked Hide Map
    // (`act_map=hidden`). Default = Shortlist subtab with map visible.
    const shouldShowMap = useMemo(() => {
        const base = shouldShowMapForTab('traveler_collections', activeTab)
        if (!base) return false
        if (activeTab === 'experience') {
            // Mobile bypass: when the user has explicitly tapped the
            // mobile "Map" button (`mobileActiveTab === 'map'`), always
            // render the map column. The subtab + Hide Map gating below
            // is desktop-only.
            if (mobileActiveTab === 'map') return true
            const activitiesView = searchParams.get('activities_view')
            if (activitiesView === 'in_itinerary') return false
            if (searchParams.get('act_map') === 'hidden') return false
        }
        return true
    }, [activeTab, searchParams, mobileActiveTab])

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
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier] })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types', identifier] })
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
        return shouldAllowDeleteSection('traveler_collections', activeTab, isRimigoInternal)
    }, [activeTab, isRimigoInternal])

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
                      }
                    | undefined

                // Include all parameters that are passed when clicking on cards in StaysTab
                // Use defaults matching StaysCard.tsx behavior
                const hotelSearchParams = new URLSearchParams({
                    hotel_name: marker.name,
                    zentrum_hub_id: marker.zentrum_hub_id,
                    accommodation_id: String(marker.id),
                    check_in: onClickData?.checkIn || staysDates.checkIn,
                    check_out: onClickData?.checkOut || staysDates.checkOut,
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

                // Add children_age only if it exists
                if (guestsDataForPrices.children_age.length > 0) {
                    hotelSearchParams.set('children_age', guestsDataForPrices.children_age.join(','))
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
        [mapMarkers, searchParams, staysDates.checkIn, staysDates.checkOut, guestsDataForPrices, trackButtonClickCustom]
    )

    const handlePopupButtonClick = useCallback(
        (action: 'view_deal' | 'view_details' | 'directions' | 'instagram', marker: MapMarker) => {
            const eventMap = {
                view_deal: POSTHOG_EVENTS.STAYS_VIEW_DEAL_MAP_CLICKED,
                view_details: POSTHOG_EVENTS.EXPERIENCE_VIEW_DETAILS_MAP_CLICKED,
                directions: POSTHOG_EVENTS.RESTAURANT_DIRECTIONS_MAP_CLICKED,
                instagram: POSTHOG_EVENTS.RESTAURANT_INSTAGRAM_MAP_CLICKED
            }
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                buttonName: eventMap[action],
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    marker_id: marker.id,
                    marker_name: marker.name,
                    marker_type: marker.type,
                    ...(marker.zentrum_hub_id && { zentrum_hub_id: marker.zentrum_hub_id }),
                    ...(marker.experience_id && { experience_id: marker.experience_id })
                }
            })
        },
        [trackButtonClickCustom]
    )

    // Show loading state for section types and experience collection (needed for collection metadata)
    if (isSectionTypesLoading || isExperienceCollectionLoading) {
        return <ViewContentCollectionLoading isRimigoInternal={isRimigoInternal} />
    }

    // Show error state for section types
    if (isSectionTypesError) {
        return <SectionTypesError isRimigoInternal={isRimigoInternal} />
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
                            {isError ? 'Failed to load collection. Please try again later.' : 'Collection not found'}
                        </Typography>
                    </div>
                </div>
            </div>
        )
    }

    // Allow Overview tab to render even without API data
    if (!response?.data && activeTab !== 'overview') {
        return <CollectionNotFound />
    }

    // For Overview tab, we can render even without collection data (uses dummy data)
    const collection: ContentCollectionViewModel | null = response?.data ? adaptContentCollectionToViewModel(response.data) : null

    const personalTourRecommendations =
        (experienceCollectionResponse?.data as { metadata?: { tour_recommendations?: PersonalTourRecommendation[] } } | undefined)?.metadata
            ?.tour_recommendations ?? null

    // First name of the trip owner — derived from the slug identifier (no extra request, no backend change).
    // Drops the trailing `-tripboard` suffix the backend appends, then takes the first segment as the
    // traveler's first name. Falls back to null when the slug isn't available.
    const tripOwnerFirstName = identifier
        ? (identifier
              .replace(/-tripboard$/i, '')
              .split('-')
              .filter(Boolean)[0]
              ?.replace(/^(.)(.*)$/, (_m, h, t) => h.toUpperCase() + t.toLowerCase()) ?? null)
        : null

    return (
        <TripCollectionRecommendationsProvider
            recommendations={personalTourRecommendations}
            collectionIdentifier={identifier ?? null}
            collectionId={response?.data?.id ?? null}
            tripOwnerName={tripOwnerFirstName}>
            {/* Mobile: fixed-height shell, header/tabs pinned. Desktop (lg:)
                keeps the original min-h-screen flow. */}
            <div className="bg-white max-lg:h-full max-lg:min-w-0 max-lg:flex max-lg:flex-col max-lg:overflow-hidden lg:min-h-screen">
                <SearchHeader
                    pageName="Tripboards"
                    mobileBrandAsLogo
                    centerTitle={collection?.name || ''}
                    centerTitleClassName="max-md:flex!"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    breadcrumbsConfig={{ enabled: false, className: 'my-3' }}
                    containerClass="drop-shadow-sm md:drop-shadow-2 max-lg:shrink-0"
                />
                <div className="w-full mx-auto max-lg:flex-1 max-lg:min-h-0 max-lg:min-w-0 max-lg:flex max-lg:flex-col">
                    <div className="max-lg:shrink-0 max-lg:min-w-0 lg:contents">
                        <CollectionTabs
                            sectionTypes={allTabs}
                            activeTab={activeTab}
                            onTabClick={setActiveTab}
                            sticky={true}
                            isRimigoInternal={isRimigoInternal}
                            collectionIdentifier={identifier}
                            onSectionAdded={() => {
                                // Invalidate queries to refetch section types and collection data
                                queryClient.invalidateQueries({ queryKey: ['content-collection-section-types', identifier] })
                                queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
                            }}
                        />
                    </div>
                    {/* Single mobile scroller; content is block flow (not a flex-1
                        chain) so content sizing isn't distorted. */}
                    <div
                        ref={tabScrollContainerRef}
                        className="max-lg:flex-1 max-lg:min-h-0 max-lg:min-w-0 max-lg:overflow-y-auto max-lg:overflow-x-clip max-lg:overscroll-contain">
                    <div className={cn('flex flex-col lg:flex-row mx-auto lg:gap-3')}>
                        {activeTab === 'stays' && (
                            <div className="sticky top-0 z-50 bg-white md:hidden max-lg:shrink-0">
                                <div className="flex items-center gap-2 px-3 py-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => setIsStaysFilterOpen(true)}
                                        className="flex items-center gap-1 px-2 py-2 rounded-lg border border-primary-default bg-white hover:bg-grey-5">
                                        <SlidersHorizontal className="w-4 h-4 text-primary-default" />
                                        <span className="text-sm font-semibold text-grey-0">Filter</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsStaysSortOpen(true)}
                                        className="flex items-center gap-1 px-2 py-2 rounded-lg border border-primary-default bg-white hover:bg-grey-5">
                                        <ArrowUpDown className="w-4 h-4 text-primary-default" />
                                        <span className="text-sm font-semibold text-grey-0">Sort</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Left Side: Header, Tabs, and Content */}
                        <div
                            className={`[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] transition-[width] duration-300 ease-out max-lg:min-w-0 max-lg:overflow-x-clip ${
                                mapMarkers.length > 0 && shouldShowMap ? 'w-full lg:w-[640px] xl:w-[720px] shrink-0 bg-grey-5' : 'w-full'
                            } ${mobileActiveTab === 'map' ? 'max-lg:hidden' : ''}`}
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
                            {/* List Content */}
                            <div className={`${mobileActiveTab === 'map' ? 'max-md:hidden' : ''}`}>
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
                                                    countryId={countryId}
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
                                                    api={travelerCollectionApi}
                                                    allowDateEdit={allowDateEdit}
                                                    onDeleteSection={showDeleteButton ? handleDeleteSection : undefined}
                                                    isDeleting={deleteSectionMutation.isPending}
                                                    sectionBlocksMap={sectionBlocksMap}
                                                    collectionType="traveler"
                                                    queryKeyPrefix="traveler-collection"
                                                    fallbackMode="traveler"
                                                    exploreCountryId={countryId}
                                                    tripId={tripId ?? undefined}
                                                    itineraryId={itineraryEntityId || undefined}
                                                    itineraryDays={itineraryData?.days as Parameters<typeof ExperienceTab>[0]['itineraryDays']}
                                                    showShortlistToggle
                                                    readOnlyShortlist
                                                    defaultActivitiesView="shortlisted"
                                                    countryId={countryId}
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
                                                        queryClient.invalidateQueries({ queryKey: ['traveler-collection-stay-price'] })
                                                    }}
                                                    collectionIdentifier={identifier}
                                                    staySectionMap={staySectionMap}
                                                    staySectionMetadataMap={staySectionMetadataMap}
                                                    api={travelerCollectionApi}
                                                    allowDateEdit={allowDateEdit}
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
                                                    collectionType="traveler"
                                                    queryKeyPrefix="traveler-collection"
                                                    fallbackMode="traveler"
                                                    showExploreToggle={false}
                                                    itineraryDays={itineraryData?.days as Parameters<typeof StaysTab>[0]['itineraryDays']}
                                                    routeSummary={routeSummary}
                                                    onMapViewClick={
                                                        mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined
                                                    }
                                                    hideSelectItineraryButton={true}
                                                    shortlistSections={shortlistSectionsForDedupe}
                                                    isReadOnly={!showDeleteButton}
                                                />
                                            )}

                                            {/* Must Have tab — wraps Tips, Useful Links, Visa,
                                            SIM & Connectivity as subtabs. The four section
                                            types collapse into a single `must_have` tab via
                                            baseAllTabs above. */}
                                            {sectionTypeValue === 'must_have' && identifier ? (
                                                <MustHaveTabContent
                                                    isRimigoInternal={isRimigoInternal}
                                                    collectionIdentifier={identifier}
                                                    isActive={activeTab === 'must_have'}
                                                    api={travelerCollectionApi}
                                                    stickyTop={{ mobile: 0, desktop: 120 }}
                                                />
                                            ) : null}

                                            {/* Itinerary tab content */}
                                            {sectionTypeValue === 'itinerary' && identifier && (
                                                <div>
                                                    <ItineraryTabContent
                                                        isRimigoInternal={isRimigoInternal}
                                                        collectionIdentifier={identifier}
                                                        isActive={activeTab === 'itinerary'}
                                                        onItineraryLinked={() => {
                                                            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
                                                            queryClient.invalidateQueries({
                                                                queryKey: ['content-collection-section-types', identifier]
                                                            })
                                                            queryClient.invalidateQueries({
                                                                queryKey: ['content-collection', identifier, 'itinerary']
                                                            })
                                                        }}
                                                        api={travelerCollectionApi}
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
                                                        queryClient.invalidateQueries({ queryKey: ['content-collection', identifier, 'restaurant'] })
                                                    }}
                                                    api={travelerCollectionApi}
                                                    hoveredCardId={hoveredCardId}
                                                    setHoveredCardId={setHoveredCardId}
                                                    countryId={countryId}
                                                    onDeleteSection={showDeleteButton ? handleDeleteSection : undefined}
                                                    isDeleting={deleteSectionMutation.isPending}
                                                    onMapViewClick={
                                                        mapMarkers.length > 0 && shouldShowMap ? () => setMobileActiveTab('map') : undefined
                                                    }
                                                    itineraryData={itineraryData}
                                                />
                                            ) : null}

                                            {/* Handle other section types (not experience, stays, must_have, itinerary, or restaurant) */}
                                            {sectionTypeValue !== 'experience' &&
                                                sectionTypeValue !== 'stays' &&
                                                sectionTypeValue !== 'overview' &&
                                                sectionTypeValue !== 'must_have' &&
                                                sectionTypeValue !== 'itinerary' &&
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

                        {/* Right Side: Map - Sticky (mobile: deferred until user switches to map tab to save Mapbox credits) */}
                    <AnimatePresence initial={false}>
                        {mapMarkers.length > 0 && shouldShowMap && (
                            <motion.div
                            key="traveler-collection-map-col"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                                className={`relative flex-1 lg:sticky lg:self-start ${mobileActiveTab === 'list' ? 'max-md:hidden' : 'md:hidden lg:block'}`}>
                                {hasEverOpenedMobileMap || window.innerWidth >= 1024 ? (
                                    <GenericMap
                                        cityName={mapCityName}
                                        cityCenter={mapCityCenter}
                                        centerMode="city"
                                        markers={mapMarkers}
                                        hoveredMarkerId={hoveredCardId}
                                        onMarkerClick={handleMarkerClick}
                                        onPopupButtonClick={handlePopupButtonClick}
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
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
                </div>
            </div>
        </TripCollectionRecommendationsProvider>
    )
}

export default TravelerCollectionDetailsPage
