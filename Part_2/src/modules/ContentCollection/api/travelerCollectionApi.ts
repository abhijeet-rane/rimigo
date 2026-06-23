import apiClient from '@/lib/api/apiClient'
import {
    ENTITY_TYPE_KAYAK_STAYS,
    ENTITY_TYPE_STAYS,
    ENTITY_TYPE_FLIGHT,
    ENTITY_TYPE_EXPERIENCE
} from '@/modules/ContentCollection/lib/collectionConfig'
import { ContentCollection, ExperienceComment } from '../types/contentCollection'
import { ApiResponse } from '../types/contentCollection'

export const travelerCollectionApi = {
    /**
     * Check if traveler collections exist
     */
    checkTravelerCollectionsExists: async (
        travelerId?: string,
        isInvitedUser?: boolean
    ): Promise<{ status: string; data: { is_exists: boolean } }> => {
        let url = '/api/traveler-collections/check-exists/'
        if (travelerId && isInvitedUser) {
            url += `?traveler_id=${travelerId}&is_invited=${isInvitedUser}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    getTravelerCollections: async (
        travelerId?: string,
        isInvitedUser?: boolean,
        purchasedOnly?: boolean
    ): Promise<ApiResponse<ContentCollection[]>> => {
        let url = '/api/traveler-collections/'
        const params: string[] = []
        if (isInvitedUser) {
            params.push(`is_invited=${isInvitedUser}`, `traveler_id=${travelerId}`)
        }
        if (purchasedOnly) {
            params.push('purchased_only=true')
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    /**
     * Get traveler collections for list (e.g. add-to-collection modal) with list_name and is_invited params.
     */
    getTravelerCollectionsForList: async (travelerId?: string, tripId?: string): Promise<ApiResponse<ContentCollection[]>> => {
        let url = '/api/traveler-collections/?list_name=true&is_invited=true'
        if (travelerId) {
            url += `&traveler_id=${travelerId}`
        }
        if (tripId) {
            url += `&trip_id=${tripId}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    /**
     * Get section types for content collections
     */
    getSectionTypes: async (
        identifier?: string
    ): Promise<{
        success: boolean
        data: Array<{
            section_type: string
            name: string
        }>
    }> => {
        let url = '/api/traveler-collections/section-types/'
        if (identifier) {
            url += `?collection=${encodeURIComponent(identifier)}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    /**
     * Get content collection by identifier
     */
    getByIdentifier: async (identifier: string, sectionType?: string): Promise<ApiResponse<ContentCollection>> => {
        let url = `/api/traveler-collections/${identifier}/`
        if (sectionType) {
            url += `?section_type=${sectionType}`
        }
        const response = await apiClient.get(url)

        // Handle different API response structures
        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        // Fallback for direct object response
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Update section metadata
     */
    updateSectionMetadata: async (identifier: string, sectionId: string, metadata: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${identifier}/sections/${sectionId}/`, {
            metadata
        })
        return response.data
    },

    /**
     * Bulk update metadata for multiple sections in a single request.
     * Avoids N sequential DB reads/writes when updating a date group.
     */
    bulkUpdateSectionMetadata: async (
        identifier: string,
        updates: Array<{ sectionId: string; metadata: Record<string, unknown> }>
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${identifier}/sections/bulk/`, {
            updates: updates.map((u) => ({ section_id: u.sectionId, data: { metadata: u.metadata } }))
        })
        return response.data
    },

    /**
     * Update section fields (e.g. entity_id)
     */
    updateSection: async (
        identifier: string,
        sectionId: string,
        payload: Partial<{
            title: string
            description: string | null
            sections_order: number | null
            entity_id: string | null
            metadata: Record<string, unknown>
        }>
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${identifier}/sections/${sectionId}/`, payload)
        return response.data
    },

    /**
     * Add a section to content collection
     */
    addSection: async (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
            entity_type?: string
            metadata?: Record<string, unknown>
        }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add stay to traveler collection as a section (same contract as contentCollectionApi.addStayToCollection)
     */
    addStayToCollection: async (
        collectionIdentifier: string,
        zentrumHubId: string,
        stayName: string,
        stayDescription?: string,
        sectionsOrder?: number,
        metadata?: {
            banner_img?: string
            location_tag?: string
            city_id?: string
            city_name?: string
            category?: string
            accommodation_id?: string
            start_date?: string
            end_date?: string
        }
    ): Promise<ApiResponse<unknown>> => {
        const payload = {
            section_type: 'stays',
            title: stayName,
            description: stayDescription || null,
            sections_order: sectionsOrder ?? null,
            entity_id: zentrumHubId,
            entity_type: ENTITY_TYPE_STAYS,
            blocks: [],
            ...(metadata ? { metadata } : {})
        }
        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add Kayak stay to traveler collection (same contract as contentCollectionApi.addKayakStayToCollection)
     */
    addKayakStayToCollection: async (
        collectionIdentifier: string,
        payload: {
            title: string
            entity_id: string
            sections_order: number
            metadata: {
                city_id: string
                city_name: string
                latitude: number
                longitude: number
                category: string
                kayak_images: unknown[]
                kayak_hotel_id: string
                kayak_star_rating?: number
            }
        }
    ): Promise<ApiResponse<unknown>> => {
        const sectionPayload = {
            section_type: 'stays',
            title: payload.title,
            description: null,
            sections_order: payload.sections_order,
            entity_id: payload.entity_id,
            entity_type: ENTITY_TYPE_KAYAK_STAYS,
            metadata: payload.metadata,
            blocks: []
        }
        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/`, sectionPayload)
        return response.data
    },

    /**
     * Add experience to collection as a section (same contract as contentCollectionApi)
     */
    addExperienceToCollection: async (
        collectionIdentifier: string,
        experienceId: string,
        experienceName: string,
        experienceDescription?: string,
        sectionsOrder?: number,
        metadata?: {
            content?: { verified_photos?: Array<{ id: string; url: string }> }
            display_props?: { landscape_image?: string }
            city_id?: string
            city_name?: string
            location?: { latitude?: number; longitude?: number; address?: string }
            start_date?: string
            end_date?: string
        }
    ): Promise<ApiResponse<unknown>> => {
        void experienceDescription // accepted for backwards compat; no longer persisted

        const slimMetadata: { start_date?: string; end_date?: string } = {}
        if (metadata?.start_date) slimMetadata.start_date = metadata.start_date
        if (metadata?.end_date) slimMetadata.end_date = metadata.end_date

        const payload: {
            section_type: string
            title: string
            sections_order: number | null
            entity_id: string
            entity_type: string
            metadata?: { start_date?: string; end_date?: string }
        } = {
            section_type: 'experience',
            title: experienceName,
            sections_order: sectionsOrder ?? null,
            entity_id: experienceId,
            entity_type: ENTITY_TYPE_EXPERIENCE
        }
        if (Object.keys(slimMetadata).length > 0) {
            payload.metadata = slimMetadata
        }

        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add flight to traveler collection as a section
     */
    addFlightToCollection: async (
        collectionIdentifier: string,
        flight: {
            reference_id: string
            title: string
            metadata: {
                reference_id: string
                segments: Array<{
                    airline: { code: string; name: string; flight_number: string }
                    origin: { airport_code: string; airport_name: string; city_code: string; city_name: string; departure_time: string }
                    destination: { airport_code: string; airport_name: string; city_code: string; city_name: string; arrival_time: string }
                    duration: { minutes: number; formatted: string }
                }>
                total_price: string
                stop_count: number
                total_duration: number
                formatted_duration: string
                departure_date: string
                return_date: string | null
                is_refundable: boolean
                journey_type: number
                best_offer?: {
                    provider: string
                    price: number
                    currency?: string
                    affiliate_url?: string | null
                    provider_logo_url?: string | null
                }
                search_params: {
                    origin: string[]
                    destination: string[]
                    departure_date: string[]
                    return_date: string[] | null
                    adult_count: number
                    child_count: number
                    infant_count: number
                    cabin_class: number
                    journey_type: number
                }
                /** Tags this flight to a specific leg so per-leg Shortlisted views filter correctly. */
                leg_id?: string
            }
        },
        sectionsOrder?: number
    ): Promise<ApiResponse<unknown>> => {
        const payload = {
            section_type: 'flights',
            title: flight.title,
            description: null,
            sections_order: sectionsOrder ?? null,
            entity_id: flight.reference_id,
            entity_type: ENTITY_TYPE_FLIGHT,
            metadata: flight.metadata,
            blocks: []
        }
        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Fetch live Kayak prices for flights in a traveler collection
     */
    getFlightPrices: async (
        collectionIdentifier: string
    ): Promise<
        ApiResponse<
            Record<
                string,
                {
                    total_price: string
                    best_offer?: {
                        provider: string
                        price: number
                        currency?: string
                        affiliate_url?: string | null
                        provider_logo_url?: string | null
                    }
                    price_comparison?: Array<{
                        provider: string
                        price: number
                        currency?: string
                        affiliate_url?: string | null
                        provider_logo_url?: string | null
                    }>
                }
            >
        >
    > => {
        const response = await apiClient.get(`/api/traveler-collections/${collectionIdentifier}/flights/prices/`)
        return response.data
    },

    /**
     * Attach a manual Skyscanner booking link (+ optional approx price) to a flight section.
     * Backend whitelists provider == "skyscanner" and requires https URL.
     */
    setFlightManualOffer: async (
        collectionIdentifier: string,
        sectionId: string,
        payload: { provider: 'skyscanner'; url: string; price?: number | null }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${collectionIdentifier}/sections/${sectionId}/manual-offer/`, payload)
        return response.data
    },

    /**
     * Remove the manual booking link from a flight section.
     */
    clearFlightManualOffer: async (collectionIdentifier: string, sectionId: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.delete(`/api/traveler-collections/${collectionIdentifier}/sections/${sectionId}/manual-offer/`)
        return response.data
    },

    /**
     * Update a single block (label, description, value, block_type, etc.).
     * PATCH .../sections/{section_id}/blocks/{block_id}/
     * Prefer this over updateSectionBlocks when changing one block — smaller payload, no accidental overwrites.
     */
    updateBlock: async (
        identifier: string,
        sectionId: string,
        blockId: string,
        payload: Partial<{
            block_type: string
            label: string | null
            description: string | null
            value: Record<string, unknown>
        }>
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${identifier}/sections/${sectionId}/blocks/${blockId}/`, payload)
        return response.data
    },

    /**
     * Update section blocks (replace or reorder all blocks in a section).
     * Use when intentionally setting the full blocks list. Prefer updateBlock for changing one block.
     */
    updateSectionBlocks: async (
        identifier: string,
        sectionId: string,
        blocks: Array<{
            block_type: string
            label?: string | null
            description?: string | null
            value: Record<string, unknown>
        }>
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${identifier}/sections/${sectionId}/`, {
            blocks
        })
        return response.data
    },

    /**
     * Add a block to a section (generic – e.g. comment block)
     */
    addBlockToSection: async (
        collectionIdentifier: string,
        sectionId: string,
        block: {
            block_type: string
            label?: string | null
            value: Record<string, unknown>
        }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/traveler-collections/${collectionIdentifier}/sections/${sectionId}/blocks/`, block)
        return response.data
    },

    /**
     * Delete a section from traveler collection
     */
    deleteSection: async (identifier: string, sectionId: string): Promise<void> => {
        await apiClient.delete(`/api/traveler-collections/${identifier}/sections/${sectionId}/`)
    },

    /**
     * Sync a traveler collection with its linked itinerary.
     * POST /api/traveler-collections/{identifier}/sync-from-itinerary/
     */
    syncFromItinerary: async (
        identifier: string
    ): Promise<
        ApiResponse<{
            task_id: string
        }>
    > => {
        const response = await apiClient.post(`/api/traveler-collections/${identifier}/sync-from-itinerary/`)
        return response.data
    },

    /**
     * Publish a traveler collection as a content collection.
     * POST /api/traveler-collections/{identifier}/publish/
     */
    publishAsContentCollection: async (
        identifier: string
    ): Promise<
        ApiResponse<{
            identifier: string
            name: string
            id: string
            curation_status: string
        }>
    > => {
        const response = await apiClient.post(`/api/traveler-collections/${identifier}/publish/`)
        return response.data
    },

    /**
     * Get all content collections published from this traveler collection.
     * GET /api/traveler-collections/{identifier}/published-status/
     */
    getPublishedCollections: async (
        identifier: string
    ): Promise<
        ApiResponse<
            Array<{
                id: string
                identifier: string
                name: string
                curation_status: string
                country_name: string
                created_at: string | null
            }>
        >
    > => {
        const response = await apiClient.get(`/api/traveler-collections/${identifier}/published-status/`)
        return response.data
    },

    /**
     * Sync sections from traveler collection to a specific published content collection.
     * POST /api/traveler-collections/{identifier}/sync-to-public-collection/
     */
    syncToPublicCollection: async (
        identifier: string,
        contentCollectionIdentifier: string
    ): Promise<
        ApiResponse<{
            identifier: string
            synced: boolean
        }>
    > => {
        const response = await apiClient.post(`/api/traveler-collections/${identifier}/sync-to-public-collection/`, {
            content_collection_identifier: contentCollectionIdentifier
        })
        return response.data
    },

    /**
     * Add or replace a per-collection tour recommendation. rimigo_internal only on backend.
     */
    addTourRecommendation: async (
        identifier: string,
        payload: { tour_id: string; experience_id: string; reason?: string | null }
    ): Promise<ApiResponse<{ tour_id: string; experience_id: string; recommended_by: string; recommended_at: string; reason?: string | null }>> => {
        const response = await apiClient.post(`/api/traveler-collections/${encodeURIComponent(identifier)}/tour-recommendations/`, payload)
        return response.data
    },

    /**
     * Hard-delete a per-collection tour recommendation. rimigo_internal only on backend.
     */
    removeTourRecommendation: async (identifier: string, tourId: string, experienceId: string): Promise<ApiResponse<{ deleted: boolean }>> => {
        const response = await apiClient.delete(
            `/api/traveler-collections/${encodeURIComponent(identifier)}/tour-recommendations/${encodeURIComponent(tourId)}/?experience_id=${encodeURIComponent(experienceId)}`
        )
        return response.data
    },

    /**
     * Set or replace a per-collection tour price override. rimigo_internal only on backend.
     * Re-prices the selected tour on the budget; does not change tour selection.
     */
    setTourPriceOverride: async (
        identifier: string,
        payload: { tour_id: string; experience_id: string; price: number; currency?: string | null }
    ): Promise<ApiResponse<{ tour_id: string; experience_id: string; price: number; currency: string | null; set_by: string; set_at: string }>> => {
        const response = await apiClient.post(`/api/traveler-collections/${encodeURIComponent(identifier)}/tour-price-overrides/`, payload)
        return response.data
    },

    /**
     * Hard-delete a per-collection tour price override. rimigo_internal only on backend.
     */
    removeTourPriceOverride: async (identifier: string, tourId: string, experienceId: string): Promise<ApiResponse<{ deleted: boolean }>> => {
        const response = await apiClient.delete(
            `/api/traveler-collections/${encodeURIComponent(identifier)}/tour-price-overrides/${encodeURIComponent(tourId)}/?experience_id=${encodeURIComponent(experienceId)}`
        )
        return response.data
    },

    /**
     * Add a comment on an experience. Comments are keyed by `experience_id`
     * (not section_id) under `collection.metadata.experience_comments`.
     */
    addExperienceComment: async (identifier: string, payload: { experience_id: string; text: string }): Promise<ApiResponse<ExperienceComment>> => {
        const response = await apiClient.post(`/api/traveler-collections/${encodeURIComponent(identifier)}/experience-comments/`, payload)
        return response.data
    },

    updateExperienceComment: async (identifier: string, commentId: string, payload: { text: string }): Promise<ApiResponse<ExperienceComment>> => {
        const response = await apiClient.patch(
            `/api/traveler-collections/${encodeURIComponent(identifier)}/experience-comments/${encodeURIComponent(commentId)}/`,
            payload
        )
        return response.data
    },

    deleteExperienceComment: async (identifier: string, commentId: string): Promise<void> => {
        await apiClient.delete(`/api/traveler-collections/${encodeURIComponent(identifier)}/experience-comments/${encodeURIComponent(commentId)}/`)
    },

    /**
     * Set the home airport IATA code on the traveler collection.
     */
    setHomeAirport: async (identifier: string, iata: string | null): Promise<ApiResponse<FlightsMetadata>> => {
        const response = await apiClient.patch(`/api/traveler-collections/${encodeURIComponent(identifier)}/flights/home-airport/`, { iata })
        return response.data
    }
}

export type FlightLegKind = 'outbound' | 'inter_city' | 'return' | 'round_trip'
export type FlightLegSource = 'auto' | 'user'

export interface FlightLegPayload {
    id?: string
    kind: FlightLegKind
    from?: string | null
    to?: string | null
    /** City names for nicer assistant prompts. Best-effort — fall back
     *  to the IATA code when absent. Not persisted server-side. */
    from_city?: string | null
    to_city?: string | null
    date?: string | null
    return_date?: string | null
    pinned?: boolean
    source?: FlightLegSource
}

export interface FlightLeg extends FlightLegPayload {
    id: string
    pinned: boolean
    source: FlightLegSource
    created_at?: string
    updated_at?: string
}

export interface FlightsMetadata {
    identifier: string
    home_airport_iata: string | null
    flight_legs: FlightLeg[]
}
