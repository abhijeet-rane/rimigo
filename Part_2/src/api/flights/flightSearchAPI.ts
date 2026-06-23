import apiClient from '@/lib/api/apiClient'
import { buildAttributionParamsObject } from '@/lib/api/attributionParams'

export interface FlightSearchPayload {
    origin?: string[]
    destination?: string[]
    preferredDepartureTime?: string[]
    preferredReturnDepartureTime?: string[]
    adultCount?: string | number
    childCount?: string | number
    infantCount?: string | number
    journeyType?: number
    flightCabinClass?: number
    directFlight?: boolean
    preferred_airlines?: string[]
    budget_max?: number
    max_layovers?: number
    user_text_input?: string
    group_type?: string
    purpose_type?: string
}

export interface FlightSearchResponse {
    session_id: string
    total_flights: number
    search_dates?: string[]
    source?: string
    comparison_source?: string
    platform_prices?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
        source?: string
    }>
    top_flights: unknown[]
    all_flights?: unknown[]
}

const FLIGHT_SEARCH_TIMEOUT_MS = 120000

export interface SearchFlightsOptions {
    /** Collection (TravelerCollection or ContentCollection) ObjectId in scope.
     *  Forwarded as `?traveler_collection_id=…` query param so BE captures the
     *  surface on the minted AttributionContext. */
    travelerCollectionId?: string | null
    /** Trip ObjectId in scope. Forwarded as `?trip_id=…` so the minted
     *  AttributionContext is bucketed against the trip — same flight search
     *  outside a trip context mints a separate code. */
    tripId?: string | null
}

export const searchFlights = async (
    payload: FlightSearchPayload,
    options?: SearchFlightsOptions
): Promise<FlightSearchResponse> => {
    // Attribution query params land on the URL even though this is a POST —
    // BE's _mint_flight_p_value reads `request.query_params`.
    const params = buildAttributionParamsObject(options?.travelerCollectionId, options?.tripId)
    const { data } = await apiClient.post<FlightSearchResponse>('/api/flights/search/', payload, {
        timeout: FLIGHT_SEARCH_TIMEOUT_MS,
        params: Object.keys(params).length > 0 ? params : undefined
    })
    return data
}
