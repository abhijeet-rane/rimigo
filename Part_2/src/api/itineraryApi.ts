import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface TripItineraryRouteSegment {
    start_date: string
    end_date: string
}

export interface TripItinerary {
    id: string
    created_at: string
    updated_at: string
    status: string
    route: Record<string, TripItineraryRouteSegment> // May be empty, route data moved to details.route
    details: {
        route?: Record<string, { days: number; nights: number }> // Route data is now here with days/nights
        [key: string]: unknown
    }
    updated_by_traveler_at: string | null
    updated_by_internal_user_at: string | null
    updated_by_ai_at: string | null
    trip: {
        id: string
        name: string | null
        trip_sequence_id: string | null
        status?: string
        start_date?: string | null
        end_date?: string | null
    }
    updated_by_traveler: unknown
    updated_by_internal_user: unknown
    route_summary: {
        total_cities: number
        cities: string[]
    }
    title?: string
    days?: Array<{
        date: string
        base_city?: { id: string; name: string; country: string } | null
        destination_city?: { id: string; name: string; country: string } | null
        notes?: string | null
        type: string
        is_checkout_day: boolean
        is_checkin_day: boolean
        overnight_transit: boolean
        accommodation?: unknown
        slots?: unknown[]
    }>
    stays?: ItineraryStay[]
    summary?: Record<string, unknown>
}

export interface ItineraryStay {
    stay_id: string
    accommodation_id: string | null
    zentrum_hub_id: string
    hotel_name: string
    hotel_image_url: string | null
    city_id: string | null
    /** 1-based ordinal among stays for the same city. Only meaningful
     *  when a city has 2+ stays (different hotels for different legs).
     *  For single-hotel cities, always 1. */
    sequence: number
    /** Number of city-days this stay covers. For single-stay cities
     *  this is always = total city-day count (auto-managed by
     *  reconcile). For multi-stay cities it is user-managed. */
    duration: number | null
    /** Denormalized hotel location for map rendering. */
    latitude: number | null
    longitude: number | null
    /** Derived by reconcile from covered days — not a source of truth. */
    check_in_date: string | null
    check_out_date: string | null
    nights: number | null
    room_type: string | null
    check_in_time: string | null
    check_out_time: string | null
    total_cost: number | null
    currency: string | null
    notes: string | null
}

/** @deprecated Day attachments are now derived client-side via deriveDayStayMap. */
export interface ItineraryStayDayAttachment {
    date: string | null
    base_city_id: string | null
}

export interface AddItineraryStayPayload {
    zentrum_hub_id: string
    city_id: string
    check_in_date: string // ISO date or YYYY-MM-DD
    check_out_date: string // exclusive — morning after the last night
    room_type?: string
    check_in_time?: string
    check_out_time?: string
    total_cost?: number
    currency?: string
    notes?: string
}

export interface AddItineraryStayResponse {
    itinerary_id: string
    stays: ItineraryStay[]
    day_attachments: ItineraryStayDayAttachment[]
}

export interface TripItineraryResponse {
    message: string
    response_code: string
    data: TripItinerary[]
}

export interface TripItinerarySingleResponse {
    message: string
    response_code: string
    data: TripItinerary
}

export interface CreateTripItineraryPayload {
    trip_id: string
    status?: string
}

export interface UpdateTripItineraryRoutePayload {
    route: Record<string, TripItineraryRouteSegment>
}

export const getTripItinerariesByTrip = async (tripId: string, page = 1, limit = 10): Promise<TripItinerary[]> => {
    const params = new URLSearchParams()
    params.set('trip_id', tripId)
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    const url = `${API_CONFIG.BASE_URL}/api/trip-itineraries/by_trip/?${params.toString()}`
    const response = await apiClient.get<TripItinerary[]>(url)
    return response.data
}

/**
 * Fetch the **complete** itinerary for a trip — including ``days`` with
 * ``base_city`` references — via ``/api/trip-itineraries/complete_by_trip/``.
 *
 * The trip context's cached payload comes from the list serializer, which
 * omits ``days``. Anything that needs the full day-by-day shape (the
 * Add-to-itinerary modal's candidate-block detection, for example) should
 * call this endpoint directly. The endpoint returns the serializer payload
 * unwrapped (no StupaResponse envelope).
 */
export const getCompleteItineraryByTrip = async (tripId: string): Promise<TripItinerary | null> => {
    const url = `${API_CONFIG.BASE_URL}/api/trip-itineraries/complete_by_trip/?trip_id=${encodeURIComponent(tripId)}`
    const response = await apiClient.get<TripItinerary>(url)
    return response.data ?? null
}

export const createTripItinerary = async (payload: CreateTripItineraryPayload): Promise<TripItinerary> => {
    const url = `${API_CONFIG.BASE_URL}/api/trip-itineraries/`
    const response = await apiClient.post<TripItinerary>(url, payload)
    return response.data
}

export const updateTripItineraryRoute = async (itineraryId: string, payload: UpdateTripItineraryRoutePayload): Promise<TripItinerary> => {
    const url = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/update_route/`
    const response = await apiClient.post<TripItinerary>(url, payload)
    return response.data
}

// Itinerary Prompts API
export interface ItineraryPromptRequestBody {
    cities: string[]
    countries: string[]
    start_date: string
    end_date: string
    group_type: string
    purpose_type: string
}

export interface ItineraryPromptResult {
    floating_prompt_questions?: string[]
}

export type ItineraryPromptStatus = 'queued' | 'processing' | 'in_progress' | 'completed' | 'failed' | string

export interface ItineraryPromptResponse {
    request_id: string
    status: ItineraryPromptStatus
    result?: ItineraryPromptResult
}

export interface ItineraryPromptAPIResponse {
    message: string
    response_code: string
    data: ItineraryPromptResponse
}

export const fetchItineraryPrompts = async (payload: ItineraryPromptRequestBody): Promise<ItineraryPromptResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/v1/destinations/itinerary/prompts/`
    const response = await apiClient.post<ItineraryPromptAPIResponse>(endpoint, payload)
    return response.data.data
}

// Trip Cities API
export interface TripCityInformation {
    known_for: string[]
    summary: string
}

export interface TripCityItem {
    city_name: string
    city_id: string
    city_thumbnail_url: string
    suggestion_priority: number
    city_information: TripCityInformation
}

export interface TripCitiesResponse {
    message: string
    response_code: string
    data: {
        country_id: string
        country_name: string
        top_cities: TripCityItem[]
        other_cities: TripCityItem[]
    }
}

// Country Itinerary Status API
export interface CountryItineraryStatusResponse {
    status: string
    data: Record<string, boolean> // country_id -> boolean
}

export const getCountryItineraryStatus = async (countryIds: string[]): Promise<CountryItineraryStatusResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/countries-itinerary-status/`
    const response = await apiClient.get<CountryItineraryStatusResponse>(endpoint, {
        params: {
            country_ids: countryIds.join(',')
        }
    })
    return response.data
}

// Itinerary Day CRUD API
export interface BaseCity {
    id: string
    name: string
    country: string
}

export interface AddItineraryDayPayload {
    date: string // YYYY-MM-DD format
    base_city: BaseCity | null
    type?: string // e.g., "stay", "travel"
    is_checkout_day?: boolean
    is_checkin_day?: boolean
    overnight_transit?: boolean
}

export interface UpdateItineraryDayPayload {
    base_city?: BaseCity | null
    type?: string
    is_checkout_day?: boolean
    is_checkin_day?: boolean
    overnight_transit?: boolean
    /**
     * Day-level stay hint. Used by the reorder flow to tell the backend
     * which stay should follow the moved content; reconcile's pre-pass
     * expands the referenced stay's date range to cover this day.
     */
    stay_id?: string | null
}

export interface SwitchItineraryDayPayload {
    from_day_id: string
    to_day_id: string
}

/**
 * Add a day to an itinerary
 * @param itineraryId - ID of the itinerary
 * @param payload - Day data to add
 * @returns Updated itinerary data
 */
export const addItineraryDay = async (itineraryId: string, payload: AddItineraryDayPayload): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/days/`
    const response = await apiClient.post<TripItinerarySingleResponse>(endpoint, payload)
    return response.data.data
}

/**
 * Update a day in an itinerary
 * @param itineraryId - ID of the itinerary
 * @param date - Date of the day to update (YYYY-MM-DD format)
 * @param payload - Partial day data to update
 * @returns Updated itinerary data
 */
export const updateItineraryDay = async (itineraryId: string, date: string, payload: UpdateItineraryDayPayload): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/days/${date}/`
    const response = await apiClient.patch<TripItinerarySingleResponse>(endpoint, payload)
    return response.data.data
}

/**
 * Delete a day from an itinerary
 * @param itineraryId - ID of the itinerary
 * @param date - Date of the day to delete (YYYY-MM-DD format)
 */
export const deleteItineraryDay = async (itineraryId: string, date: string): Promise<void> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/days/${date}/`
    await apiClient.delete(endpoint)
}

/**
 * Reset a day in an itinerary (clear slots/details, preserve date + base city)
 * @param itineraryId - ID of the itinerary
 * @param date - Date of the day to reset (YYYY-MM-DD format)
 * @returns Updated itinerary data
 */
export const resetItineraryDay = async (itineraryId: string, date: string): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/days/${date}/reset/`
    const response = await apiClient.post<TripItinerarySingleResponse>(endpoint)
    return response.data.data
}

/**
 * Switch day content positions in an itinerary.
 * @param itineraryId - ID of the itinerary
 * @param payload - Source and target day IDs (YYYY-MM-DD)
 * @returns Updated itinerary data
 */
export const switchItineraryDay = async (itineraryId: string, payload: SwitchItineraryDayPayload): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/days/switch/`
    const response = await apiClient.post<TripItinerarySingleResponse>(endpoint, payload)
    return response.data.data
}

/**
 * Clone an itinerary
 * @param itineraryId - ID of the itinerary to clone
 * @param payload - Clone payload with trip_id and start_date
 * @returns Cloned itinerary data
 */
export interface CloneItineraryPayload {
    trip_id: string
    start_date: string // ISO format: "2024-06-01T00:00:00Z"
}

export const cloneItinerary = async (itineraryId: string, payload: CloneItineraryPayload): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/clone/`
    const response = await apiClient.post<TripItinerarySingleResponse>(endpoint, payload)
    return response.data.data
}

/**
 * Attach a stay (hotel) to an itinerary. The backend reconciles stays against
 * the current city blocks on save, so the response carries the final stays
 * list and per-day attachments after reconciliation.
 */
export const addStayToItinerary = async (
    itineraryId: string,
    payload: AddItineraryStayPayload
): Promise<AddItineraryStayResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/stays/`
    const response = await apiClient.post<{
        message: string
        response_code: string
        data: AddItineraryStayResponse
    }>(endpoint, payload)
    return response.data.data
}

// Flights — add a flight (and optional return leg) to an itinerary as
// transport slots. Auto-shortlists into the trip's TravelerCollection so
// the Flights tab shortlist view stays in sync.

export interface AddItineraryFlightLegPayload {
    day_index: number
    start_time: string // ISO datetime
    end_time: string
    title?: string
}

export interface AddItineraryFlightSearchParams {
    origin?: string[]
    destination?: string[]
    departure_date?: string[]
    return_date?: string[] | null
    adult_count?: number
    child_count?: number
    infant_count?: number
    cabin_class?: number
    journey_type?: number
}

export interface AddItineraryFlightPayload {
    reference_id: string
    section_id?: string | null
    flight_metadata?: Record<string, unknown> | null
    title?: string
    search_params?: AddItineraryFlightSearchParams
    leg?: 'outbound' | 'internal' | 'return'
    outbound: AddItineraryFlightLegPayload
    return?: AddItineraryFlightLegPayload | null
}

export const addFlightToItinerary = async (
    itineraryId: string,
    payload: AddItineraryFlightPayload
): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/flights/`
    const response = await apiClient.post<{
        message: string
        response_code: string
        data: TripItinerary
    }>(endpoint, payload)
    return response.data.data
}

/**
 * Remove every flight slot on the itinerary that's tied to the given
 * shortlist Section. Round-trip flights have two slots (outbound +
 * return) sharing one ``section_id`` — both are removed in one call.
 * The Section in TravelerCollection is left intact so the Flights tab
 * keeps it shortlisted.
 */
export const removeFlightFromItinerary = async (
    itineraryId: string,
    sectionId: string
): Promise<TripItinerary> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/flights/${sectionId}/`
    const response = await apiClient.delete<{
        message: string
        response_code: string
        data: TripItinerary
    }>(endpoint)
    return response.data.data
}

/**
 * Remove a stay from an itinerary by its ``stay_id``. Returns the post-delete
 * stays list so the client can update its cache without a separate refetch.
 */
export const deleteStayFromItinerary = async (
    itineraryId: string,
    stayId: string
): Promise<AddItineraryStayResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trip-itineraries/${itineraryId}/stays/${stayId}/`
    const response = await apiClient.delete<{
        message: string
        response_code: string
        data: AddItineraryStayResponse
    }>(endpoint)
    return response.data.data
}

/**
 * Compute candidate day-runs for a city in an itinerary. Used by the
 * Add-to-itinerary modal to show users which city blocks they can attach
 * a hotel to.
 *
 * The trip context caches itineraries via the **list** serializer, which
 * does NOT return the ``days`` array — only ``route``. So this helper
 * prefers ``route[cityId]`` (always present, single block per city) and
 * only falls back to scanning ``days`` when the complete serializer is in
 * play (e.g. on the itinerary page). Multi-block-per-city — same city
 * visited twice in the trip — only resolves correctly via the days path
 * and is treated as a single span by the route path. Acceptable in v1.
 */
export interface ItineraryCityBlock {
    city_id: string
    start_date: string
    end_date: string
    nights: number
}

const candidateBlocksFromDays = (
    days: NonNullable<TripItinerary['days']>,
    cityId: string
): ItineraryCityBlock[] => {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
    const blocks: ItineraryCityBlock[] = []
    let current: ItineraryCityBlock | null = null

    for (const day of sorted) {
        const dayCityId = day.base_city?.id ?? null
        if (dayCityId === cityId) {
            if (current === null) {
                current = { city_id: cityId, start_date: day.date, end_date: day.date, nights: 1 }
            } else {
                current.end_date = day.date
                current.nights += 1
            }
        } else if (current !== null) {
            blocks.push(current)
            current = null
        }
    }
    if (current !== null) {
        blocks.push(current)
    }
    return blocks
}

const candidateBlockFromRoute = (
    route: TripItinerary['route'],
    cityId: string
): ItineraryCityBlock | null => {
    const segment = route?.[cityId]
    if (!segment || !segment.start_date || !segment.end_date) return null

    // Route stores YYYY-MM-DD inclusive day strings. Nights = inclusive day
    // count, which is (end - start) days + 1 because both endpoints are
    // base-city days the user spends in the city.
    const start = new Date(`${segment.start_date}T00:00:00Z`).getTime()
    const end = new Date(`${segment.end_date}T00:00:00Z`).getTime()
    const dayDelta = Math.round((end - start) / (1000 * 60 * 60 * 24))
    const nights = Math.max(1, dayDelta + 1)

    return {
        city_id: cityId,
        start_date: segment.start_date,
        end_date: segment.end_date,
        nights
    }
}

// Route-summary stays carry sleep_city semantics (RLE'd by where the
// traveller actually slept), so the arrival day with a transit-out-of-
// origin shows up under the destination city. ``stays[i].to_date`` is the
// exclusive checkout morning; ``ItineraryCityBlock.end_date`` is the
// LAST NIGHT (inclusive), so we subtract one day on the boundary.
const candidateBlocksFromRouteSummary = (
    stays: RouteSummaryStay[],
    cityId: string,
): ItineraryCityBlock[] => {
    const out: ItineraryCityBlock[] = []
    for (const s of stays) {
        if (s.city?.id !== cityId || !s.from_date || !s.to_date) continue
        const lastNight = new Date(`${s.to_date}T00:00:00Z`)
        lastNight.setUTCDate(lastNight.getUTCDate() - 1)
        out.push({
            city_id: cityId,
            start_date: s.from_date,
            end_date: lastNight.toISOString().slice(0, 10),
            nights: s.nights,
        })
    }
    return out
}

export const getCandidateBlocksForCity = (
    itinerary: TripItinerary,
    cityId: string,
    routeSummary?: RouteSummaryResponse | null,
): ItineraryCityBlock[] => {
    // Prefer route-summary: matches the Day Header city semantics and counts
    // arrival/transit days against the city the traveller sleeps in.
    if (routeSummary?.stays && routeSummary.stays.length > 0) {
        const fromSummary = candidateBlocksFromRouteSummary(routeSummary.stays, cityId)
        if (fromSummary.length > 0) return fromSummary
    }
    if (itinerary.days && itinerary.days.length > 0) {
        const fromDays = candidateBlocksFromDays(itinerary.days, cityId)
        if (fromDays.length > 0) return fromDays
        // Days payload present but no match — fall through to route in case
        // the days array is partial.
    }

    const fromRoute = candidateBlockFromRoute(itinerary.route, cityId)
    return fromRoute ? [fromRoute] : []
}

// ---------- Route Summary ----------
//
// Trip is modeled as a directed walk on a graph of cities. The
// response carries four orthogonal views of that walk:
//
//   * ``route_chain`` — city-level walk for the header pill strip.
//     Origin → each stay → final destination. Day-trip cities are
//     NOT here (they're in ``transits`` and ``days[].trajectory``).
//     Each non-origin hop carries the transit that brought the
//     traveller there.
//
//   * ``stays`` — nights per trip-internal city.
//
//   * ``transits`` — every transport leg incl. day-trip moves.
//
//   * ``days`` — per-day detail: ``day_segment`` (e.g. "Tokyo -> Kyoto"),
//     ``day_type``, ``trajectory``, ``sleep_city``, ``hotel``.

export interface RouteSummaryCityRef {
    id: string
    name: string
    /** Present only on a flight transit's from/to endpoints when the slot is
     *  enriched (the backend stamps the departure/arrival IATA code there). */
    airport_code?: string | null
}

export interface RouteSummaryTransitLink {
    mode: string
    duration_minutes: number | null
    start_time: string | null
    end_time: string | null
}

export interface RouteSummaryHop {
    city: RouteSummaryCityRef
    nights: number // 0 for origin / final destination
    from_date: string | null // null for origin/destination
    to_date: string | null
    arrived_via: RouteSummaryTransitLink | null // null only on the origin hop
}

export interface RouteSummaryStay {
    city: RouteSummaryCityRef
    from_date: string
    to_date: string
    nights: number
}

export interface RouteSummaryTransit {
    mode: string
    from_city: RouteSummaryCityRef | null
    to_city: RouteSummaryCityRef | null
    start_time: string | null
    end_time: string | null
    duration_minutes: number | null
    day_number: number
}

export interface RouteSummaryHotel {
    stay_id: string
    hotel_name: string
    city: RouteSummaryCityRef
    check_in_date: string
    check_out_date: string
    nights: number
}

export interface RouteSummaryDay {
    date: string
    day_number: number
    day_segment: string
    day_type: 'arrival' | 'stay' | 'day_trip' | 'transit' | 'departure'
    trajectory: RouteSummaryCityRef[]
    sleep_city: RouteSummaryCityRef | null
    base_city: RouteSummaryCityRef | null
    transits: RouteSummaryTransit[]
    hotel: RouteSummaryHotel | null
}

export interface RouteSummaryResponse {
    itinerary_id: string
    trip_id: string
    route_chain: RouteSummaryHop[]
    stays: RouteSummaryStay[]
    transits: RouteSummaryTransit[]
    days: RouteSummaryDay[]
}

export const fetchRouteSummary = async (
    itineraryId: string,
): Promise<RouteSummaryResponse> => {
    if (!itineraryId) throw new Error('Invalid itinerary ID')
    const response = await apiClient.get(
        `/api/trip-itineraries/${itineraryId}/route-summary/`,
    )
    // StupaResponse envelope: { message, response_code, data }
    return response.data?.data ?? response.data
}
