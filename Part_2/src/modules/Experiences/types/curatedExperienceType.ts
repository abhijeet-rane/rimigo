export interface VerifiedPhoto {
    id: string
    url: string
    description: string
    created_at?: string
    updated_at?: string
}

export interface YoutubeShort {
    id: string
    url: string
    description: string
    created_at: string
    updated_at: string
}

export interface CuratedExperienceItem {
    id: string
    name: string
    identifier?: string | null
    suggestion_priority: number
    display_props: {
        landscape_image?: string | null
        short?: string | null
    }
    price?: {
        currency: string | null
        lower_bound: number | null
        upper_bound: number | null
    }
    city_name: string
    city_id: string
    categories: string[]
    experience_recommended?: boolean | null
    reason_of_suggestion?: string[]
    short_description: string | null
    verified_photos?: VerifiedPhoto[]
    youtube_shorts?: YoutubeShort[]
}

/**
 * Raw API response from city-based curated experiences endpoint
 */
export interface CityCuratedExperiencesApiResponse {
    city_id: string
    city_name: string
    total_experiences: number
    page: number
    limit: number
    total_pages: number
    data: CuratedExperienceItem[]
}

/**
 * Raw API response from country-based curated experiences endpoint
 */
export interface CountryCuratedExperiencesApiResponse {
    country_id: string
    country_name: string
    total_experiences: number
    page: number
    limit: number
    total_pages: number
    experiences: CuratedExperienceItem[]
}

/**
 * Normalized response format used by the UI
 * Supports both country and city-based responses
 */
export interface CuratedExperiencesResponse {
    country_id?: string | null
    country_name?: string | null
    city_id?: string | null
    city_name?: string | null
    total_experiences: number
    page: number
    limit: number
    total_pages: number
    experiences: CuratedExperienceItem[]
}
