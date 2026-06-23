import type React from 'react'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import type { Accommodation } from '@/pages/Stays/Types/accommodationTypes'
import type { PropertyType } from '@/pages/Stays/Types/accommodationFiltersTypes'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import type { Block } from './contentCollection'
import type { CollectionBulkSelectionConfig } from '@/components/Collection'
import type { FallbackMode } from '../utils/cityDateFilter'
import type { ItineraryStay, RouteSummaryResponse } from '@/api/itineraryApi'
import type { ShortlistSectionLite } from '../utils/staysShortlistDedupe'

export type CollectionApi = {
    updateSectionMetadata: (identifier: string, sectionId: string, metadata: Record<string, unknown>) => Promise<unknown>
    bulkUpdateSectionMetadata?: (
        identifier: string,
        updates: Array<{ sectionId: string; metadata: Record<string, unknown> }>
    ) => Promise<unknown>
    addStayToCollection?: (
        collectionIdentifier: string,
        zentrumHubId: string,
        stayName: string,
        stayDescription?: string,
        sectionsOrder?: number,
        metadata?: {
            banner_img?: string
            location_tag?: string
            city_id?: string
            city_name?: string
            category?: string
            accommodation_id?: string
            start_date?: string
            end_date?: string
        }
    ) => Promise<unknown>
    addKayakStayToCollection?: (
        collectionIdentifier: string,
        payload: {
            title: string
            entity_id: string
            sections_order: number
            metadata: {
                city_id: string
                city_name: string
                latitude: number
                longitude: number
                category: string
                kayak_images: unknown[]
                kayak_hotel_id: string
                kayak_star_rating?: number
            }
        }
    ) => Promise<unknown>
}

export interface StaysTabProps {
    isStaysLoading: boolean
    staysData: AccommodationMetadataItem[]
    stayMetadataMap: Map<
        string,
        {
            location_tag?: string
            zentrum_hub_id?: string
            banner_img?: string
            category?: string
            city_id?: string
            city_name?: string
            curated_labels?: Array<{ label: string; value: string | null }>
            is_verified?: boolean
            is_b2b_deal_available?: boolean
        }
    >
    onDatesChange?: (checkIn: string, checkOut: string) => void
    cityId?: string
    collectionIdentifier?: string
    staySectionMap?: Map<string, string>
    staySectionMetadataMap?: Map<string, { [key: string]: unknown } | undefined>
    api?: CollectionApi
    showAddToCollection?: boolean
    allowDateEdit?: boolean
    buttonPage?: string
    stayPricesMap?: Map<string, { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean }>
    isFilterOpen?: boolean
    isSortOpen?: boolean
    onFilterOpenChange: (open: boolean) => void
    onSortOpenChange: (open: boolean) => void
    countryIds?: string[]
    onDeleteSection?: (sectionId: string) => void
    /** Targeted delete for the For You explore section — only refetches stays queries, not all section types. */
    onDeleteExploreStay?: (sectionId: string) => Promise<void>
    /**
     * When false: hides the For You/Shortlist toggle, locks to Shortlist view,
     * and shows the guests chip in the toggle row. Use for non-tripboard contexts
     * (ViewContentCollection, TravelerCollectionDetailsPage). Default: true.
     */
    showExploreToggle?: boolean
    isDeleting?: boolean
    hideShortlist?: boolean
    sectionBlocksMap?: Map<string, Block[]>
    collectionType?: 'content' | 'traveler'
    queryKeyPrefix?: string
    fallbackMode?: FallbackMode
    bulkSelection?: CollectionBulkSelectionConfig
    hideExactDates?: boolean
    tripStartDate?: string | null
    itineraryDays?: Array<{
        date: string | Date
        base_city?: { id: string; name: string } | null
        destination_city?: { id: string; name: string } | null
        type?: string
        overnight_transit?: boolean
    }>
    /**
     * Tripboard-only. Per-stay sub-ranges saved in the itinerary. When a card's
     * zentrum_hub_id matches an entry, its `check_in_date`/`check_out_date`
     * override the city window. Collection-only cards in a partially-covered
     * window fall back to the largest uncovered gap.
     */
    itineraryStays?: ItineraryStay[]
    /**
     * Tripboard-only. Derived per-stay windows from `/route-summary/`. When
     * present, drives the carousel cities + dates (origin/destination bookends
     * are absent from `stays[]` by construction). Falls back to `itineraryDays`
     * + `computeItineraryWindows` while this is loading or absent.
     */
    routeSummary?: RouteSummaryResponse
    onMapViewClick?: () => void
    /** True when a map panel is present in the layout (e.g. tripboard desktop). Used to show the Map button on stay cards. */
    hasMapPanel?: boolean
    tripBudgetRange?: { min: number; max: number }
    tripGroupSetup?: { adults: number; children: number; infants: number; children_age?: number[] }
    tripTravelPurpose?: string
    tripId?: string
    enrichedStaysMap?: Map<string, Accommodation>
    onExploreAccommodationsLoaded?: (accommodations: Accommodation[]) => void
    /** Map component to render in the right panel. When provided, StaysTab renders a two-column layout. */
    mapElement?: React.ReactNode
    /** When provided, the sticky header (filters/actions) is portaled into this container instead of rendering inline. */
    headerPortalRef?: React.RefObject<HTMLDivElement | null>
    /** Whether this tab is the currently visible tab. When false and headerPortalRef is set,
     *  the portal is suppressed so multiple mounted tabs don't all write into the same portal div. */
    isActive?: boolean
    /** Activities in the current explore city — used to compute nearest-activity distance on cards. */
    exploreActivities?: Array<{ id: string; lat: number; lng: number; name?: string; identifier?: string; experienceId?: string }>
    /** Forwards to StaysExploreSection — shimmer distance badges while true. */
    exploreActivitiesLoading?: boolean
    /** Suppress the "+ Select" (add-to-itinerary) button on stay list cards.
     *  Used on collection detail pages where the stay is already inside the
     *  collection and the Select affordance is redundant. */
    hideSelectItineraryButton?: boolean
    /** Suppress the guests filter chip row and "Explore more stays" link.
     *  Used on ViewContentCollection (rimigo-internal collection preview)
     *  where those affordances aren't relevant. */
    hideGuestFilterAndExplore?: boolean
    /**
     * Raw shortlisted stay sections (one entry per saved record — duplicates
     * intact) projected from `staysCollectionResponse.data.sections`. When
     * provided, the Shortlisted view collapses entries by
     * (zentrumHubId, normalizedCheckIn, normalizedCheckOut) and routes
     * deletes through the full cluster so every underlying record is removed.
     * Falls back to one-card-per-staysData entry when undefined (legacy).
     */
    shortlistSections?: ShortlistSectionLite[]
    /**
     * Read-only mode signal — when true, StaysCardListView hides the
     * Shortlist heart and the Add-to-itinerary button. The existing
     * `onDeleteSection`/`bulkSelection` gates already strip the matching
     * mutation surface, so this flag is purely the visual/interactive
     * counterpart for external viewers.
     */
    isReadOnly?: boolean
}

export const PROPERTY_TYPE_FILTER_LABELS: Record<string, PropertyType> = {
    hotel: { id: 'hotel', label: 'Hotels', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/hotel.png' },
    Unknown: { id: 'hotel', label: 'Hotels', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/hotel.png' },
    apartment: { id: 'apartment', label: 'Apartments', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/apartment.png' },
    home: { id: 'home', label: 'Entire Home', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/image-6F0Oea8suMLdEi6BoluXYbqXxnWEdt-min.png' },
    resort: { id: 'resort', label: 'Resorts', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/resort.png' },
    guesthouse: { id: 'guesthouse', label: 'Guest House', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/guesthouse.png' },
    hostel: { id: 'hostel', label: 'Hostels', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/hostel.png' },
    unique_stay: { id: 'unique_stay', label: 'Unique Stays', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/unique.png' },
    outdoor: { id: 'outdoor', label: 'Outdoor', icon_url: 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/outdoor.png' },
}

export function parseOrderBy(searchParams: URLSearchParams): Record<string, number> {
    const ob = searchParams.get('order_by')
    if (!ob) return { relevance: -1 }
    try {
        return JSON.parse(ob)
    } catch {
        return { relevance: -1 }
    }
}
