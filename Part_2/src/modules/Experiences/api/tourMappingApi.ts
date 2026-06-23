// PATCH /api/tours-experience-mapping/{mapping_id}/ — rimigo_internal only on backend.
// The backend overwrites updated_by + updated_at fields using the resolved InternalUser id;
// the client sends only the section(s) the user changed, optionally with a `description`.

import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface UpdateVisibilityPayload {
    is_published_on_rimigo: boolean
    description?: string | null
}

export interface UpdateRecommendationPayload {
    is_recommended: boolean
    description?: string | null
}

export interface MappingPatchResponse {
    id: string
    tour: string
    experience: string
    created_at?: string
    updated_at?: string
    visibility_info: {
        is_published_on_rimigo: boolean
        visibility_updated_by: string | null
        last_visibility_updated_at: string | null
        description?: string | null
    }
    recommendation_info: {
        is_recommended: boolean
        recommendation_updated_by: string | null
        last_recommendation_updated_at: string | null
        description?: string | null
    }
    tour_data?: unknown
    experience_data?: unknown
}

const buildUrl = (mappingId: string): string => `${API_CONFIG.BASE_URL}/api/tours-experience-mapping/${encodeURIComponent(mappingId)}/`

export const updateMappingVisibility = async (mappingId: string, payload: UpdateVisibilityPayload): Promise<MappingPatchResponse> => {
    const response = await apiClient.patch(buildUrl(mappingId), { visibility_info: payload })
    return response.data
}

export const updateMappingRecommendation = async (mappingId: string, payload: UpdateRecommendationPayload): Promise<MappingPatchResponse> => {
    const response = await apiClient.patch(buildUrl(mappingId), { recommendation_info: payload })
    return response.data
}

// Combined patch — used when toggling one flag must atomically cascade to the other to satisfy
// the bidirectional invariant `is_recommended ⇒ is_published_on_rimigo`. Sending both sections
// in a single PATCH lets the optimistic UI flip both toggles before the round-trip resolves.
export const updateMapping = async (
    mappingId: string,
    payload: { visibility_info?: UpdateVisibilityPayload; recommendation_info?: UpdateRecommendationPayload }
): Promise<MappingPatchResponse> => {
    const response = await apiClient.patch(buildUrl(mappingId), payload)
    return response.data
}

// POST /api/tours-experience-mapping/bulk_create_from_links/ — internal-only affordance.
// Backend resolves each link to a tour (creating it if unknown) and ensures a mapping
// exists between the tour and the supplied experience. Idempotent per-link.
export interface AddToursSummary {
    total_links_processed: number
    existing_tours_found: number
    new_tours_created: number
    existing_mappings_found: number
    new_mappings_created: number
    total_tour_ids_collected: number
}

export interface AddToursResponse {
    summary: AddToursSummary
    tour_ids: string[]
    errors: string[]
}

export const addToursToExperience = async (experienceId: string, links: string[]): Promise<AddToursResponse> => {
    const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/tours-experience-mapping/bulk_create_from_links/`, {
        experience_id: experienceId,
        links
    })
    return response.data
}

