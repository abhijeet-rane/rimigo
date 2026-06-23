// Accommodation Types

export interface BaseCityInfo {
    id: string
    name: string
}

export interface PlatformReview {
    platform: string
    review_count: number
    rating: number
    url: string
    logo_url: string | null
}

export interface Suitability {
    [key: string]: number | null
}

export interface ReviewData {
    zentrum_hub_id: string
    overall_score: number
    platform_reviews: PlatformReview[]
    location_tags: string[]
    suitability: Suitability
    review_status: string
}

export interface CuratedLabel {
    label: string
    value: string | null
}

export interface ScoreMap {
    station_nearby?: number
    city_center?: number
    nightlife?: number
    [key: string]: number | undefined
}

export interface GeoLocation {
    lat: string
    long: string
}

export interface Accommodation {
    id: string
    name: string
    zentrum_hub_id: string
    serp_search_name: string
    serp_property_token: string
    base_city_info: BaseCityInfo
    category: string | null
    month_wise_pricing: Record<string, unknown>
    review_data: ReviewData
    content: string[]
    score_map: ScoreMap
    rate_per_night: number
    curated_labels: CuratedLabel[]
    geo_location: GeoLocation
    overall_rating: number
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    is_available_on_airbnb?: boolean
    star_rating?: number | string
}

export interface BudgetCategory {
    label: string
    min_value: number
    max_value: number | null
}

export interface Pagination {
    page: number
    limit: number
    total_count: number
    total_pages: number
}

export interface AccommodationsData {
    data: Accommodation[]
    budget_categories: BudgetCategory[]
    pagination: Pagination
}

export interface AccommodationsResponse {
    message: string
    response_code: string
    data: AccommodationsData
}

// Request Parameters Types

export interface BudgetRange {
    min: number
    max: number
}

export interface OrderBy {
    relevance?: number
    price?: number
    rating?: number
    [key: string]: number | undefined
}

export interface ViewportBounds {
    north: number
    south: number
    east: number
    west: number
}

export interface GetAccommodationsParams {
    cityId: string
    travel_purpose: string
    group_type: string
    check_in_date: string // Format: YYYY-MM-DD
    check_out_date: string // Format: YYYY-MM-DD
    city_preferences: string[]
    include_hot_picks?: boolean // Always true, but optional in type
    page?: number
    limit?: number
    budget_range?: BudgetRange
    property_types?: string[]
    amenities?: string[]
    /** Star-rating tiers (3, 4, 5). Backend floors metadata.star_rating into the requested bucket. */
    star_ratings?: number[]
    order_by?: OrderBy
    min_match_score?: number
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    zentrum_hub_ids?: string[]
    viewport?: ViewportBounds
    /** When true, backend omits accommodations with no resolved nightly rate. */
    exclude_unpriced?: boolean
}
