/**
 * Stays Filter Types
 * Demonstrates the metadata vs initialData pattern
 */

// ============ Metadata Types (UI Structure) ============

export interface PriceBucket {
    min: number
    max: number
    count: number
}

export interface PriceMetadata {
    bucket_size: number
    buckets: PriceBucket[]
    total_hotels: number
    min_rate: number
    max_rate: number
    check_in_date: string
    check_out_date: string
    status: 'processing' | 'completed' | 'failed'
}

export interface PropertyType {
    id: string
    label: string
    icon_url: string
}

export interface Amenity {
    unique_id: string
    label: string
}

export interface AmenitiesMetadata {
    primary: Amenity[]
    essentials: Amenity[]
    features: Amenity[]
    location: Amenity[]
    services: Amenity[]
}

export interface City {
    id: string
    name: string
}

export interface StaysFilterMetadata {
    propertyTypes: PropertyType[]
    amenities: AmenitiesMetadata
    cities?: City[]
    showVerificationFilters?: boolean // Show verification toggles (internal users)
    showStarRatings?: boolean // Show star-rating section (3/4/5 stars)
    /** Price histogram payload for the budget slider. Pass-through `any` so the
     *  filter package stays decoupled from the rates-histogram service shape. */
    priceHistogram?: any
    /** True while the rates histogram is still being fetched — slider shows shimmer. */
    priceHistogramLoading?: boolean
}

// ============ Initial Data Types (Preselected Values) ============

export interface StaysFilterInitialData {
    selectedPropertyTypes?: string[]
    selectedAmenities?: string[]
    selectedCities?: string[]
    selectedStarRatings?: number[]
    isVerified?: boolean | null
    isB2bDealAvailable?: boolean | null
    budgetRange?: { min: number; max: number }
}

// ============ Result Type (Output) ============

export interface StaysFilterResult {
    propertyTypes: string[]
    amenities: string[]
    cities?: string[]
    starRatings?: number[]
    isVerified?: boolean | null
    isB2bDealAvailable?: boolean | null
    budgetRange?: { min: number; max: number }
}
