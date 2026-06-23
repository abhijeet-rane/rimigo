import apiClient from '@/lib/api/apiClient'

export interface BudgetSlotItem {
    slot_id: string
    kind: string
    entity_id?: string
    title: string
    cost: number
    per_person_cost: number
    currency: string
    booking_link: string | null
    platform: string | null
    price_source: string
    landscape_image?: string
    swapped_from_entity_id?: string
    swapped_to_entity_id?: string
    selected_tour_id?: string | null
    is_excluded?: boolean
}

export interface BudgetDay {
    day_number: number
    date: string
    city_name: string
    day_total: number
    day_per_person: number
    items: BudgetSlotItem[]
}

export interface AvailableHotel {
    zentrum_hub_id: string
    name: string
    rate_per_night: number
    price_source: string
    image?: string
    city_id?: string | null
}

export interface BudgetStayPlatformReview {
    platform: string
    review_count: number
    rating: number
    url: string
    logo_url: string | null
}

export interface BudgetStayCuratedLabel {
    label: string
    value: string | null
}

export interface BudgetStaySpan {
    /** ItineraryStay.stay_id — used for delete-then-add when swapping hotels from budget tab. */
    stay_id?: string | null
    city_id: string
    zentrum_hub_id: string
    city_name: string
    hotel_name: string
    check_in: string
    check_out: string
    nights: number
    rate_per_night: number
    total: number
    per_person: number
    currency: string
    booking_link: string | null
    platform: string | null
    price_source: string
    available_hotels: AvailableHotel[]
    // Display fields (populated via backend enrichment)
    image?: string
    images?: string[]
    platform_reviews?: BudgetStayPlatformReview[]
    curated_labels?: BudgetStayCuratedLabel[]
    location_tag?: string
    kayak_star_rating?: number
    selected_provider?: string | null
}

export interface BudgetFlightSegment {
    airline: {
        code: string
        name: string
        flight_number?: string
    }
    origin: {
        airport_code: string
        airport_name?: string
        city_code?: string
        city_name?: string
        departure_time: string
    }
    destination: {
        airport_code: string
        airport_name?: string
        city_code?: string
        city_name?: string
        arrival_time: string
    }
    duration: {
        minutes: number
        formatted: string
    }
}

export interface BudgetFlightBestOffer {
    provider: string
    price: number
    currency: string
    affiliate_url: string | null
    provider_logo_url: string | null
}

export interface BudgetFlightManualOffer {
    provider: string | null
    url: string
}

export interface BudgetFlight {
    section_id: string
    reference_id: string
    title: string
    segments: BudgetFlightSegment[]
    total_price: number
    currency: string
    best_offer: BudgetFlightBestOffer | null
    price_comparison: BudgetFlightBestOffer[]
    selected_provider?: string | null
    departure_date: string
    return_date: string | null
    journey_type: number // 1=one-way, 2=round-trip
    stop_count: number
    formatted_duration: string
    is_refundable: boolean
    is_excluded?: boolean
    manual_offer?: BudgetFlightManualOffer | null
}

export interface SelectedStayEntry {
    zentrum_hub_id: string
    provider?: string | null
}

export type RecalculationTrigger = TripBudget['recalculation_trigger']

export interface TripBudget {
    calculated_at: string
    is_stale: boolean
    currency: string
    total: number
    per_person: number
    group_size: number
    category_totals: {
        stays: number
        activities: number
        flights: number
    }
    stays: BudgetStaySpan[]
    flights: BudgetFlight[]
    days: BudgetDay[]
    selected_stays: Record<string, string | SelectedStayEntry>
    excluded_activities: string[]
    activity_swaps: Record<string, string>
    selected_activity_tours: Record<string, { tour_id: string }>
    selected_flight_providers: Record<string, { provider: string }>
    calculation_status?: 'idle' | 'in_progress'
    recalculation_trigger?: {
        type: 'full_recalculate' | 'flight_provider' | 'stay_provider' | 'stay_swap' | 'activity_tour' | 'activity_override'
        section_id?: string
        city_id?: string
        slot_id?: string
        provider?: string | null
        tour_id?: string | null
        zentrum_hub_id?: string | null
        action?: string
        day_number?: number
    } | null
}

export const budgetApi = {
    getBudget: async (identifier: string, force?: boolean): Promise<TripBudget> => {
        const url = `/api/tripboards/${encodeURIComponent(identifier)}/budget/${force ? '?force=true' : ''}`
        const response = await apiClient.get(url)
        return response.data.data
    },

    getPublicBudget: async (identifier: string, force?: boolean): Promise<TripBudget> => {
        const url = `/api/content-collections/${encodeURIComponent(identifier)}/budget/${force ? '?force=true' : ''}`
        const response = await apiClient.get(url)
        return response.data.data
    },

    patchStayProvider: async (identifier: string, cityId: string, provider: string | null): Promise<TripBudget> => {
        const url = `/api/tripboards/${encodeURIComponent(identifier)}/budget/stays/provider/`
        const response = await apiClient.patch(url, {
            city_id: cityId,
            provider
        })
        return response.data.data
    },

    patchActivity: async (identifier: string, action: 'exclude' | 'include' | 'swap', slotId: string, newEntityId?: string): Promise<TripBudget> => {
        const url = `/api/tripboards/${encodeURIComponent(identifier)}/budget/activities/`
        const response = await apiClient.patch(url, {
            action,
            slot_id: slotId,
            ...(newEntityId && { new_entity_id: newEntityId })
        })
        return response.data.data
    },

    patchActivityTour: async (identifier: string, slotId: string, tourId: string | null): Promise<TripBudget> => {
        const url = `/api/tripboards/${encodeURIComponent(identifier)}/budget/activities/tour/`
        const response = await apiClient.patch(url, {
            slot_id: slotId,
            tour_id: tourId
        })
        return response.data.data
    },

    patchFlightProvider: async (identifier: string, sectionId: string, provider: string | null): Promise<TripBudget> => {
        const url = `/api/tripboards/${encodeURIComponent(identifier)}/budget/flights/provider/`
        const response = await apiClient.patch(url, {
            section_id: sectionId,
            provider
        })
        return response.data.data
    },

    // ── Public Collection Overrides ──

    patchPublicStayProvider: async (identifier: string, cityId: string, provider: string | null): Promise<TripBudget> => {
        const url = `/api/content-collections/${encodeURIComponent(identifier)}/budget/stays/provider/`
        const response = await apiClient.patch(url, { city_id: cityId, provider })
        return response.data.data
    },

    patchPublicFlightProvider: async (identifier: string, sectionId: string, provider: string | null): Promise<TripBudget> => {
        const url = `/api/content-collections/${encodeURIComponent(identifier)}/budget/flights/provider/`
        const response = await apiClient.patch(url, { section_id: sectionId, provider })
        return response.data.data
    },

    patchPublicActivityTour: async (identifier: string, slotId: string, tourId: string | null): Promise<TripBudget> => {
        const url = `/api/content-collections/${encodeURIComponent(identifier)}/budget/activities/tour/`
        const response = await apiClient.patch(url, { slot_id: slotId, tour_id: tourId })
        return response.data.data
    }
}
