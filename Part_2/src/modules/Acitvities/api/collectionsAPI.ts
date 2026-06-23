import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface CollectionExperience {
    experience_id: string | null
    name?: string
    categories?: string[]
    display_props: {
        landscape_image?: string
    }
}

export interface CollectionSource {
    id: string
    name: string
    entity_name: string
    is_account_created: boolean
    media: {
        thumbnail_url: string
        instagram_profile_url: string
    }
}

export interface SourceMetadata {
    last_visited_month?: string
    last_visited_year?: string
}

export interface CollectionExperienceResponse {
    id: string
    name: string
    experiences: CollectionExperience[]
    source?: CollectionSource // Optional source field for creator collections
    source_metadata: SourceMetadata | null // Can be null or object with last visited info
}

export type CollectionExperiencesResponse = {
    data: CollectionExperienceResponse[]
    message: string
    response_code: string
}

/**
 * Full experience object from the experiences-mappings endpoint
 */
export interface CollectionExperienceMapping {
    id: string
    name: string
    suggestion_priority: number
    categories: string[]
    identifier: string
    display_props: {
        landscape_image: string
        short: string | null
    }
    price: {
        currency: string
        lower_bound: number
        upper_bound: number
    }
    city_name: string
    city_id: string
    short_description: string
    verified_photos: Array<{
        id: string
        url: string
        description: string
        created_at: string
        updated_at: string
    }>
    youtube_shorts: Array<{
        id: string
        url: string
        description: string
        created_at: string
        updated_at: string
    }>
    mapping: {
        id: string
        created_at: string
        updated_at: string
    }
}

/**
 * Collection object from the experiences-mappings endpoint
 */
export interface CollectionInfo {
    id: string
    name: string
    description: string
    image_url: string
    created_at: string
    updated_at: string
    source: CollectionSource | null
    source_metadata: SourceMetadata | null
}

/**
 * Response type for experiences-mappings endpoint
 */
export interface CollectionExperiencesMappingsResponse {
    collection: CollectionInfo
    total_experiences: number
    experiences: CollectionExperienceMapping[]
}

/**
 * Fetch collection experiences by location (city or source)
 * @param params - Object containing cityId and/or sourceId
 * @returns Promise with collections data
 */
export const getCollectionExperiences = async ({
    cityId,
    sourceId
}: {
    cityId?: string | null
    sourceId?: string | null
}): Promise<CollectionExperiencesResponse> => {
    try {
        const queryParams = new URLSearchParams()

        if (cityId) {
            queryParams.append('city_id', cityId)
        }

        if (sourceId) {
            queryParams.append('source_id', sourceId)
        }

        const url = `${API_CONFIG.BASE_URL}/curation/collection-experiences/by-location/?${queryParams.toString()}`
        const response = await apiClient.get<CollectionExperiencesResponse>(url)
        return response.data
    } catch (error) {
        console.error('Error fetching collection experiences:', error)
        throw error
    }
}

/**
 * Fetch experience mappings for a collection by collection ID
 * @param collectionId - The ID of the collection to fetch
 * @returns Promise with collection experiences data
 */
export const getCollectionById = async (collectionId: string): Promise<CollectionExperiencesMappingsResponse> => {
    try {
        const url = `${API_CONFIG.BASE_URL}/curation/collection-experiences/${collectionId}/experiences-mappings/`
        const response = await apiClient.get<{ message: string; response_code: string; data: CollectionExperiencesMappingsResponse }>(url)
        return response.data.data
    } catch (error) {
        console.error('Error fetching collection by ID:', error)
        throw error
    }
}
