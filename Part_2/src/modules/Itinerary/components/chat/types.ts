/**
 * Types for itinerary chat interactive components.
 * Maps to backend output_types from itinerary_update_schemas.py
 */

// ============================================================================
// Shared Primitives
// ============================================================================

export interface SlotRef {
    day_index: number
    slot_index: number
    title?: string
    kind?: string
}

// ============================================================================
// Alternatives (output_type: 'alternatives')
// ============================================================================

export interface ExperienceAlternativeItem {
    id: string
    title: string
    city_name: string
    city_id: string
    image: string
    images: string[]
    price_lower?: number
    price_upper?: number
    currency: string
    short_description?: string
    category?: string
    categories: string[]
}

export interface PlaceAlternativeItem {
    name: string
    map_link?: string
    image_url?: string
    address?: string
    latitude?: number
    longitude?: number
}

export interface AlternativesData {
    output_type: 'alternatives'
    response: string
    slot_ref: SlotRef
    current_title: string
    slot_kind: string
    action?: 'replace' | 'add'
    add_to_day_index?: number
    relative_to?: string
    position?: 'before' | 'after'
    experience_alternatives: ExperienceAlternativeItem[]
    place_alternatives: PlaceAlternativeItem[]
}

// ============================================================================
// Discovery (output_type: 'discovery')
// ============================================================================

export interface DiscoveryResultItem {
    name: string
    category?: string
    address?: string
    latitude?: number
    longitude?: number
    rating?: number
    review_count?: number
    distance_text?: string
    image_url?: string
    google_maps_url?: string
    source: string
    entity_id?: string
}

export interface DiscoveryData {
    output_type: 'discovery'
    response: string
    query: string
    results: DiscoveryResultItem[]
    map_center?: { lat: number; lng: number }
    anchor_slot_ref?: SlotRef
}

// ============================================================================
// Navigation (output_type: 'navigation')
// ============================================================================

export interface NavigationData {
    output_type: 'navigation'
    response: string
    found: boolean
    slot_ref?: SlotRef
    day_date?: string
}

// ============================================================================
// Cost Estimate (output_type: 'cost_estimate')
// ============================================================================

export interface CostItem {
    title: string
    cost: number
    currency: string
    day_index?: number
}

export interface CostEstimateData {
    output_type: 'cost_estimate'
    response: string
    scope: 'day' | 'trip'
    items: CostItem[]
    total: number
    currency: string
}

// ============================================================================
// Explanation (output_type: 'explanation')
// ============================================================================

export interface ExplanationData {
    output_type: 'explanation'
    response: string
    subject: string
    reasoning: string
    related_slots: SlotRef[]
}

// ============================================================================
// Date Shift (output_type: 'date_shift')
// ============================================================================

export interface DateShiftDay {
    day_index: number
    old_date: string
    new_date: string
}

export interface DateShiftData {
    output_type: 'date_shift'
    response: string
    days_shifted: number
    shifted_days: DateShiftDay[]
    applied: boolean
}

// ============================================================================
// Trip Meta Update (output_type: 'trip_meta_update')
// ============================================================================

export interface TripMetaUpdateData {
    output_type: 'trip_meta_update'
    response: string
    field_changed: string
    old_value?: string
    new_value: string
    side_effects: string[]
}

// ============================================================================
// Travel Info (output_type: 'travel_info')
// ============================================================================

export interface KeyFact {
    label: string
    value: string
}

export interface TravelInfoData {
    output_type: 'travel_info'
    response: string
    subject: string
    key_facts: KeyFact[]
}

// ============================================================================
// Transport Logistics (output_type: 'transport_logistics')
// ============================================================================

export interface TransportSegment {
    from_location: string
    to_location: string
    mode: string
    duration_text?: string
    estimated_cost?: string
    notes?: string
}

export interface TransportLogisticsData {
    output_type: 'transport_logistics'
    response: string
    segments: TransportSegment[]
}

// ============================================================================
// Dynamic Form (output_type: 'dynamic_form')
// ============================================================================

export interface DynamicFormData {
    output_type: 'dynamic_form'
    response: string
    form_schema_json: string
    ui_schema_json: string
    form_context: string
    step_count: number
}

// ============================================================================
// Hotel Search Results (output_type: 'hotel_search_results')
// ============================================================================

export interface HotelResultItem {
    zentrum_hub_id?: string
    name: string
    image_url?: string
    rating?: number
    price_range?: string
    city: string
    address?: string
    short_description?: string
}

export interface HotelSearchResultsData {
    output_type: 'hotel_search_results'
    response: string
    hotels: HotelResultItem[]
    city_name: string
    dates?: string
}

// ============================================================================
// Flight Search Results (output_type: 'flight_search_results')
// ============================================================================

export interface FlightResultItem {
    airline: string
    airline_code?: string
    flight_number?: string
    departure_time?: string
    arrival_time?: string
    departure_date?: string

    /**
     * Human-formatted duration like "12h 30min". Optional — if only
     * ``duration_minutes`` is present the card formats it itself.
     */
    duration?: string
    /**
     * Raw duration in minutes. Emitted by the concierge
     * ``search_flights`` tool alongside the numeric ``price``. The
     * flight card will format this on-the-fly when ``duration`` is
     * absent.
     */
    duration_minutes?: number

    /**
     * Pre-formatted price string like "INR 78,500" (legacy backend).
     * OR a bare number when the concierge tool emits the compact shape.
     */
    price?: string | number
    /**
     * ISO 4217 currency code, e.g. ``"INR"``. Paired with a numeric
     * ``price`` so the card can format at render time.
     */
    currency?: string

    stops: number
    booking_url?: string

    /**
     * IATA airport codes. The legacy backend used ``origin_code`` /
     * ``destination_code``; the new concierge tool emits ``origin`` /
     * ``destination``. Both are accepted — the card prefers the
     * explicit ``_code`` fields when present.
     */
    origin?: string
    destination?: string
    origin_code?: string
    destination_code?: string

    /**
     * Direct CDN URL for the airline logo (e.g. Kayak's
     * ``content.r9cdn.net/rimg/provider-logos/airlines/v/KL.png``).
     * When provided, the card renders this URL directly instead of
     * deriving one from ``airline_code``.
     */
    airline_logo?: string

    /**
     * Short route summary for multi-stop flights, e.g.
     * ``"CMB → DOH → NRT"``. Omitted for direct flights.
     */
    segments_summary?: string

    layover_info?: string
    cheapest_provider?: string
    cheapest_price?: string
    cheapest_provider_logo?: string
    recommendation_reasons?: string[]
}

export interface FlightSearchResultsData {
    output_type: 'flight_search_results'
    response: string
    origin: string
    destination: string
    flights: FlightResultItem[]
    travel_date?: string
}

// ============================================================================
// Clarification (output_type: 'clarification')
// ============================================================================

export interface ClarificationData {
    output_type: 'clarification'
    response: string
    suggested_replies?: string[]
    context?: string
}

// ============================================================================
// Error With Guidance (output_type: 'error_with_guidance')
// ============================================================================

export interface ErrorWithGuidanceData {
    output_type: 'error_with_guidance'
    response: string
    error_type?: string
    suggested_actions?: string[]
}

// ============================================================================
// Delay Evaluation (output_type: 'delay_evaluation')
// ============================================================================

export interface SlotImpact {
    slot_title: string
    day_index: number
    impact_type: 'kept' | 'trimmed' | 'removed' | 'moved' | 'extended'
    original_duration_minutes?: number
    new_duration_minutes?: number
    note?: string
}

export interface DelayStrategy {
    option_id: string
    strategy_label: string
    strategy_description: string
    score: number
    scores_breakdown: {
        experience_preserved: number
        booking_safety: number
        disruption_minimized: number
        cost_impact: number
        feasibility: number
    }
    activities_kept: string
    cost_impact_text: string
    has_booking_conflicts: boolean
    slot_impacts: SlotImpact[]
}

export interface DelayEvaluationData {
    output_type: 'delay_evaluation'
    response: string
    strategies: DelayStrategy[]
    anchor: {
        day_index: number
        slot_title: string
    }
    delay_minutes: number
    suggested_replies: string[]
}

// ============================================================================
// Delay Confirmation (output_type: 'delay_confirmation')
// ============================================================================

export interface DelayConfirmationData {
    output_type: 'delay_confirmation'
    response: string
    strategy_name: string
    strategy_label: string
    before_schedule: Array<{
        slot_title: string
        start_time: string
        end_time: string
        duration_minutes: number
    }>
    after_schedule: Array<{
        slot_title: string
        start_time: string
        end_time: string
        duration_minutes: number
        changed: boolean
    }>
    slot_impacts: SlotImpact[]
}

// ============================================================================
// Change Preview (output_type: 'preview_changes')
// ============================================================================

export interface ChangeItem {
    type: 'added' | 'removed' | 'modified' | 'moved'
    before?: { day: number; time: string; title: string; duration_minutes?: number }
    after?: { day: number; time: string; title: string; duration_minutes?: number }
    reason?: string
}

export interface ChangeDiff {
    summary: string
    changes: ChangeItem[]
    net_effect: {
        activities_delta: number
        duration_delta_minutes: number
    }
}

export interface PreviewData {
    output_type: 'preview_changes'
    response: string
    diff: ChangeDiff
    noted_preferences?: string[]
    deferred_items?: string[]
}

// ============================================================================
// Union type for all itinerary output types
// ============================================================================

export type ItineraryOutputData =
    | AlternativesData
    | DiscoveryData
    | NavigationData
    | CostEstimateData
    | ExplanationData
    | DateShiftData
    | TripMetaUpdateData
    | TravelInfoData
    | TransportLogisticsData
    | DynamicFormData
    | HotelSearchResultsData
    | FlightSearchResultsData
    | ClarificationData
    | ErrorWithGuidanceData
    | RouteChangePlanData
    | DelayEvaluationData
    | DelayConfirmationData
    | PreviewData

// ============================================================================
// Extended Hooks Config for Itinerary Chat
// ============================================================================

export interface ItineraryHooksConfig {
    /** Navigate itinerary view to a specific slot */
    onNavigateToSlot?: (dayIndex: number, slotIndex: number) => void
    /** Send a structured message through the agent (e.g. "Replace X with Y on day N") */
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    /** Refresh the itinerary data after modifications */
    onRefreshItinerary?: () => void
    /** Existing: view update changes */
    onViewChangeClick?: (changes?: {
        days_updated?: number
        summaries?: string[]
        updated_slots_count?: number
        updated_slot_paths?: Array<{
            day_index: number
            slot_index: number
            path: string
            title?: string
            kind?: string
            change_type?: string
        }>
    }) => void
}

// ============================================================================
// Navigation Action Protocol (cross-page navigation from chat responses)
// ============================================================================

export interface ScrollTarget {
    type: 'slot' | 'day' | 'section'
    day_index?: number
    slot_index?: number
    section_id?: string
}

export interface HighlightAction {
    type: 'pulse' | 'glow' | 'badge' | 'none'
    targets: SlotRef[]
    message?: string
    duration_ms: number
}

export interface NavigationAction {
    target_page:
        | 'itinerary'
        | 'hotel_detail'
        | 'experience_detail'
        | 'stays_search'
        | 'experiences_search'
        | 'flights'
        | 'current'
    target_params?: Record<string, string>
    scroll_to?: ScrollTarget
    highlight?: HighlightAction
    keep_chat_open: boolean
    transition: 'push' | 'replace' | 'modal' | 'sheet'
}

/** Any output_data response may optionally include navigation_action */
export interface OutputDataWithNavigation {
    navigation_action?: NavigationAction
}

// ============================================================================
// Route Change Plan (output_type: 'route_change_plan')
// ============================================================================

export interface RouteSegment {
    city_name: string
    nights?: number
    days?: number  // backend sends 'days', normalize to nights
    day_range?: string
    is_arrival?: boolean
    is_departure?: boolean
    has_airport?: boolean
}

export interface TransportChange {
    from_city: string
    to_city: string
    before_mode?: string | null
    before_duration?: string | null
    before_cost_per_person?: number | null
    after_mode: string
    after_duration: string
    after_cost_per_person?: number | null
    duration_delta_minutes?: number | null
    is_new_segment?: boolean
    is_removed_segment?: boolean
}

export interface RouteWarning {
    severity: 'info' | 'warning' | 'blocker'
    category?: string
    message: string
    affected_segment?: string
}

export interface RouteAlternative {
    label: string
    message: string
    reasoning?: string
}

export interface RouteChangePlanData {
    output_type: 'route_change_plan'
    // Backend sends feasibility_status, not feasibility
    feasibility?: 'feasible' | 'feasible_with_caveats' | 'not_feasible'
    feasibility_status?: 'feasible' | 'feasible_with_caveats' | 'not_feasible'
    // Backend sends route_before/route_after, not current_route/proposed_route
    current_route?: RouteSegment[]
    proposed_route?: RouteSegment[]
    route_before?: RouteSegment[]
    route_after?: RouteSegment[]
    transport_changes: TransportChange[]
    warnings: RouteWarning[]
    // Backend sends flat fields, not nested impact object
    total_duration_delta_minutes?: number | null
    total_cost_delta_per_person?: number | null
    cost_currency?: string
    // Route structure changes (compound plans)
    cities_added?: string[]
    cities_removed?: string[]
    night_changes?: string[]
    activities_affected?: string[]
    alternatives?: RouteAlternative[]
    response: string
    suggested_replies: string[]
}
