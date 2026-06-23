import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

// Types based on API documentation
export interface TravelContent {
    id: string
    content_type: 'youtube' | 'instagram'
    content_link: string
    content_media_id: string
    content_category: string // Legacy single category
    content_categories?: string[] // Array of AI-extracted categories
    is_information_extracted: boolean
    content_language: string
    processing_status?: 'pending' | 'in_progress' | 'completed' | 'failed' // For async processing
    country: {
        id: string
        name: string
        code: string
    }
    city: {
        id: string
        name: string
    } | null
    is_translated: boolean
    is_curated: boolean
    meta_data: {
        video_id: string
        title: string
        description: string
        channel_title: string
        channel_id?: string
        view_count: number
        like_count: number
        duration: string // ISO 8601 duration format (e.g., "PT15M30S")
        thumbnail_url: string
        tags?: string[] // Tags for search functionality
        channel_thumbnails?: {
            default?: string
            medium?: string
            high?: string
        }
    }
    created_at: string
    updated_at: string
}

export interface ExperienceMapping {
    id: string
    content: {
        id: string
        content_link: string
    }
    experience: {
        id: string
        name: string
        identifier: string
        city: {
            name: string
            country: string
        }
        display_props: {
            name: string
            landscape_image: string
            portrait_image: string
            description: string
        }
        price: {
            currency: string
            lower_bound: number
            upper_bound: number
        }
    }
    timestamp: string // MM:SS format
    meta_data: {
        extracted_activity: string
        timestamp_seconds: number
        snippet_text: string
        match_confidence: 'high' | 'medium' | 'low'
        match_reason: string
    }
    tips: {
        raw_text: string[]
        converted_text: string[]
    }
    created_at: string
    updated_at: string
}

export interface CuratedVideosResponse {
    success: boolean
    count: number
    country: string
    data: TravelContent[]
}

export interface ExperienceMappingsResponse {
    success: boolean
    count: number
    content_id: string
    data: ExperienceMapping[]
}

export interface ProcessVideoRequest {
    youtube_url: string
    country_id?: string
    city_id?: string
    traveler_id?: string
}

export interface ActivityMapping {
    extracted_activity: string
    matched_experiences: Array<{
        id: string
        name: string
        identifier: string
        display_props: {
            name: string
            landscape_image: string
            portrait_image: string
            description: string
        }
        price: {
            currency: string
            lower_bound: number
            upper_bound: number
        }
    }>
    match_confidence: 'high' | 'medium' | 'low'
    match_reason: string
    timestamp: number // seconds
    timestamp_formatted: string // MM:SS
    snippet_text: string
}

export interface ProcessVideoResponse {
    success: boolean
    processing_status?: 'pending' | 'in_progress' | 'completed' | 'failed'
    travel_content_id?: string // For async processing - use this to poll status
    data?: {
        youtube_url: string
        video_metadata: {
            video_id: string
            title: string
            description: string
            channel_title: string
            view_count: number
            like_count: number
            duration: string
            thumbnail_url: string
        }
        video_title: string
        country_id: string | null
        city_id: string | null
        extracted_country: string
        activity_mappings: ActivityMapping[]
        database_save_result?: {
            travel_content_id: string
            mappings_count: number
            mapping_ids: string[]
        }
        processing_status: string
        from_cache: boolean
    }
    // For async responses (202), data will be a TravelContent-like object
    message: string
}

/**
 * Get curated videos by country (Rimigo curated only)
 */
export const getCuratedVideosByCountry = async (countryId: string, categories?: string[]): Promise<CuratedVideosResponse> => {
    const params: Record<string, string> = {}
    if (categories && categories.length > 0) {
        params.content_categories = categories.join(',')
    }
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/travel-contents/by-country/${countryId}/`, { params })
    return response.data
}

/**
 * Get traveler videos for a country
 */
export const getTravelerVideosByCountry = async (travelerId: string, countryName?: string, categories?: string[]): Promise<CuratedVideosResponse> => {
    const params: Record<string, string | boolean> = {
        content_type: 'youtube',
        is_information_extracted: true,
        traveler_id: travelerId
    }

    // Try to filter by country - backend should handle country_name or country_id
    // Using country_name as per API documentation
    if (countryName) {
        // Decode URL-encoded country name if needed
        const decodedCountryName = countryName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        params.country_name = decodedCountryName
    }

    // Add category filtering if provided
    if (categories && categories.length > 0) {
        params.content_categories = categories.join(',')
    }

    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/travel-contents/`, { params })
    return response.data
}

/**
 * Get experience mappings for a video
 */
export const getExperienceMappingsByContent = async (contentId: string): Promise<ExperienceMappingsResponse> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/travel-content-experience-mappings/by-content/${contentId}/`)
    return response.data
}

/**
 * Process a YouTube video URL
 * Returns 202 Accepted for new videos (async processing) or 200 OK for cached videos
 */
export const processYouTubeVideo = async (request: ProcessVideoRequest): Promise<ProcessVideoResponse> => {
    const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/youtube/process-video/`, request)
    return response.data
}

/**
 * Get a single TravelContent by ID (for status polling)
 */
export const getTravelContentById = async (travelContentId: string): Promise<{ success: boolean; data: TravelContent }> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/travel-contents/${travelContentId}/`)
    return response.data
}

/**
 * Format ISO 8601 duration to readable format (e.g., "PT15M30S" -> "15:30")
 */
export const formatDuration = (isoDuration: string): string => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'

    const hours = parseInt(match[1] || '0', 10)
    const minutes = parseInt(match[2] || '0', 10)
    const seconds = parseInt(match[3] || '0', 10)

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format view count (e.g., 150000 -> "150K")
 */
export const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
}

// Types for YouTube Shorts Explore API
export interface YouTubeShort {
    id: string
    url: string
    description: string
    created_at: string
    updated_at: string
}

export interface ExperienceWithShort {
    id: string
    name: string
    suggestion_priority: number
    display_props: {
        landscape_image: string
    }
    price: {
        currency?: string
        lower_bound: number
        upper_bound: number
    }
    city_name: string
    city_id: string
    youtube_short: YouTubeShort
    short_description: string | null
    category_backend_value: string | null
    category_icon: string | null
    category: string | null
}

export interface ShortsExploreResponse {
    country_id: string
    country_name: string
    total_experiences: number
    page: number
    limit: number
    data: ExperienceWithShort[]
}

/**
 * Get experiences with YouTube Shorts for a country
 */
export const getExperiencesWithShorts = async (
    countryId: string,
    page: number = 1,
    limit: number = 20,
    sortByPriority: boolean = true,
    baseCityIds?: string[],
    suggestionPriority?: string
): Promise<ShortsExploreResponse> => {
    const params: Record<string, string | number | boolean> = {
        page,
        limit,
        sort_by_priority: sortByPriority
    }

    // Add city filters if provided
    if (baseCityIds && baseCityIds.length > 0) {
        params.city_ids = baseCityIds.join(',')
    }

    //  append suggestion_priority filter if sortByPriority is true
    params.suggestion_priority = suggestionPriority || '0'

    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experiences/country/${countryId}/explore-with-shorts/`, { params })
    return response.data
}

/**
 * Get experiences with YouTube Shorts for a city
 * Used when country_id is not present
 */
export const getExperiencesWithShortsByCity = async (
    cityId: string,
    page: number = 1,
    limit: number = 20,
    sortByPriority: boolean = true,
    suggestionPriority?: string
): Promise<ShortsExploreResponse> => {
    const params: Record<string, string | number | boolean> = {
        page,
        limit,
        sort_by_priority: sortByPriority
    }

    //  append suggestion_priority filter if sortByPriority is true
    params.suggestion_priority = suggestionPriority || '0'

    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experiences/city/${cityId}/explore-with-shorts/`, { params })
    return response.data
}
