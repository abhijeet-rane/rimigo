import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { ENTITY_TYPE_EXPERIENCE, ENTITY_TYPE_KAYAK_STAYS, ENTITY_TYPE_STAYS } from '@/modules/ContentCollection/lib/collectionConfig'
import type { ContentCollection, ApiResponse, ExperienceComment } from '../types/contentCollection'

/** Country in collection-list item (name + optional flag image URL) */
export interface CollectionListCountry {
    name: string
    /** Flag image URL (preferred). Legacy: country_flag still supported. */
    flag_icon_url?: string
    country_flag?: string
}

/** Source (creator) details; may be null for some collections */
export interface CollectionListSourceDetails {
    name: string
    username: string
    number_of_followers: number
    image: string
}

/** Single item from GET /api/content-collections/collection-list/ */
export interface CollectionListItem {
    identifier: string
    source_details: CollectionListSourceDetails | null
    overview_images: string[]
    name: string
    countries: CollectionListCountry[]
    number_of_days: number | null
    trip_overview: {
        number_of_stays: number
        number_of_activities: number
        number_of_food_places: number
        stay_image_links: string[]
        experience_image_links: string[]
        number_of_cities_visited?: number
        number_of_tips?: number
    }
    number_of_people_who_bought: number | string | null
    /** When present, amount 0 = free, else paid */
    pricing?: { amount: number; currency: string }
}

/** Response from GET /api/content-collections/collection-list/ */
export interface CollectionListResponse {
    message: string
    response_code: string
    data: CollectionListItem[]
}

/** Response from POST /api/content-collections/purchase/ */
export interface ContentCollectionPurchaseResponse {
    message?: string
    response_code?: string
    data: {
        cf_order_id: string
        order_id: string
        payment_session_id: string
        customer_payment_id?: string
        customer_payment_reference?: string
        order_reference?: string
        rimigo_booking_id?: string
        collection_identifier?: string
        collection_id?: string
    }
}

export const contentCollectionApi = {
    /**
     * Get content collection by identifier
     */
    getByIdentifier: async (identifier: string, sectionType?: string): Promise<ApiResponse<ContentCollection>> => {
        let url = `/api/content-collections/${identifier}/`
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
     * Get collection list for landing CTA.
     * Query by source (traveler trip source id) and/or country_id (comma-separated ids from active trip).
     */
    getCollectionList: async (params: {
        source?: string
        sourceName?: string
        country_ids?: string[]
        /** @deprecated use country_ids */
        country_id?: string[]
    }): Promise<CollectionListResponse> => {
        const search = new URLSearchParams()

        const sourceName = params.sourceName?.trim().toLowerCase()
        const shouldSkipSource = !!sourceName && sourceName.startsWith('rimigo')

        if (params.source && !shouldSkipSource) {
            search.set('source', params.source)
        }

        const countryIds = params.country_ids ?? params.country_id
        if (countryIds?.length) {
            search.set('country_ids', countryIds.join(','))
        }
        const query = search.toString()
        const url = `/api/content-collections/collection-list/${query ? `?${query}` : ''}`
        const response = await apiClient.get<CollectionListResponse>(url)
        return response.data
    },

    /**
     * Get content collection by trip ID (single collection)
     * Uses /by-trip/ endpoint for single collection lookup
     */
    getByTripId: async (tripId: string, curationStatus?: string): Promise<ApiResponse<ContentCollection | ContentCollection[]>> => {
        let url = `${API_CONFIG.BASE_URL}/api/content-collections/by-trip/?trip_id=${tripId}`
        if (curationStatus) {
            url += `&curation_status=${curationStatus}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    /**
     * Get content collections by country ID
     */
    getByCountryId: async (countryId: string, curationStatus?: string, tripDetails?: boolean): Promise<ApiResponse<ContentCollection[]>> => {
        let url = `/api/content-collections/?country_id=${countryId}&list_name=true`
        if (curationStatus) {
            url += `&curation_status=${curationStatus}`
        }
        if (tripDetails) {
            url += `&trip_details=true`
        }
        const response = await apiClient.get(url)

        // Handle different API response structures
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (Array.isArray(response.data)) {
            return { data: response.data }
        }
        return { data: [] }
    },

    /**
     * Get content collections by country name
     */
    getByCountryName: async (countryName: string, curationStatus?: string): Promise<ApiResponse<ContentCollection[]>> => {
        let url = `/api/content-collections/?country_name=${encodeURIComponent(countryName)}`
        if (curationStatus) {
            url += `&curation_status=${curationStatus}`
        }
        const response = await apiClient.get(url)

        // Handle different API response structures
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (Array.isArray(response.data)) {
            return { data: response.data }
        }
        return { data: [] }
    },

    /**
     * Get content collections by trip ID (list of collections)
     * Uses /api/content-collections/?trip_id= endpoint for listing collections
     */
    getCollectionsByTripId: async (tripId: string, curationStatus?: string): Promise<ApiResponse<ContentCollection[]>> => {
        let url = `/api/content-collections/?trip_id=${tripId}`
        if (curationStatus) {
            url += `&curation_status=${curationStatus}`
        }
        const response = await apiClient.get(url)

        // Handle different API response structures
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (Array.isArray(response.data)) {
            return { data: response.data }
        }
        return { data: [] }
    },

    /**
     * Add experience to collection as a section.
     *
     * Payload is intentionally minimal — only the persistent per-collection
     * state (entity_id, title, start/end dates, ordering) is stored. Every
     * other card/map field (city, images, location, price, description,
     * categories) is hydrated at read time via `/curation/experiences/batch/`
     * so edits to the underlying experience propagate automatically.
     *
     * Legacy callers may still pass the old `metadata` bag + `experienceDescription`;
     * those extra fields are accepted for backwards compatibility but only
     * `start_date` / `end_date` are forwarded to the backend.
     */
    addExperienceToCollection: async (
        collectionIdentifier: string,
        experienceId: string,
        experienceName: string,
        experienceDescription?: string,
        sectionsOrder?: number,
        metadata?: {
            content?: {
                verified_photos?: Array<{
                    id: string
                    url: string
                }>
            }
            display_props?: {
                landscape_image?: string
            }
            city_id?: string
            city_name?: string
            location?: {
                latitude?: number
                longitude?: number
                address?: string
            }
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
            sections_order: sectionsOrder || null,
            entity_id: experienceId,
            entity_type: ENTITY_TYPE_EXPERIENCE
        }
        if (Object.keys(slimMetadata).length > 0) {
            payload.metadata = slimMetadata
        }

        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add stay to collection as a section
     */
    addStayToCollection: async (
        collectionIdentifier: string,
        zentrumHubId: string, // This should be zentrum_hub_id (used as entity_id)
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
        const payload: {
            section_type: string
            title: string
            description: string | null
            sections_order: number | null
            entity_id: string
            entity_type: string
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
        } = {
            section_type: 'stays',
            title: stayName,
            description: stayDescription || null,
            sections_order: sectionsOrder || null,
            entity_id: zentrumHubId, // This should be zentrum_hub_id
            entity_type: ENTITY_TYPE_STAYS
        }

        if (metadata) {
            payload.metadata = metadata
        }

        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add Kayak stay to collection as a section (entity_type: kayak_stay, metadata with kayak_images, etc.)
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
        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/`, sectionPayload)
        return response.data
    },

    /**
     * Create a new content collection
     */
    createCollection: async (
        name: string,
        description: string | null,
        countryIds: string[],
        tripId?: string | null
    ): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.post(`/api/content-collections/`, {
            name,
            description: description || null,
            context: {
                country_id: countryIds,
                city_id: [],
                trip_id: tripId ?? null
            }
        })

        // Handle different API response structures
        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Update content collection by identifier
     */
    updateCollection: async (identifier: string, name: string, description: string | null): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, {
            name,
            description: description || null
        })

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
     * Update collection pricing
     */
    updateCollectionPricing: async (identifier: string, pricing: { amount: number; currency: string }): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, { pricing })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Update collection publisher (type, publisher_id, metadata)
     */
    updateCollectionPublisher: async (
        identifier: string,
        publisher: { type: string; publisher_id: string; metadata?: Record<string, unknown> }
    ): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, { publisher })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Update collection context (country_id, city_id, trip_id)
     */
    /**
     * Update collection permission flags (DictField on the collection model).
     * Server merges the partial `permissions` payload into existing permissions,
     * so callers only need to send the keys they are changing.
     *
     * Example: updateCollectionPermissions(id, { show_customise_trip_button: false })
     */
    updateCollectionPermissions: async (identifier: string, permissions: Record<string, unknown>): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, { permissions })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Update collection curation status (draft, in_progress, published, archived)
     */
    updateCollectionCurationStatus: async (identifier: string, curationStatus: string): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, {
            curation_status: curationStatus
        })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    updateCollectionContext: async (
        identifier: string,
        context: { country_id?: string[]; city_id?: string[]; trip_id?: string | null }
    ): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, { context })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Delete a section from content collection
     */
    deleteSection: async (identifier: string, sectionId: string): Promise<void> => {
        await apiClient.delete(`/api/content-collections/${identifier}/sections/${sectionId}/`)
    },

    /**
     * Delete sections by type from content collection
     */
    deleteSectionsByType: async (identifier: string, sectionType: string): Promise<void> => {
        await apiClient.delete(`/api/content-collections/${identifier}/sections-by-type/?section_type=${encodeURIComponent(sectionType)}`)
    },

    /**
     * Update section metadata
     */
    updateSectionMetadata: async (identifier: string, sectionId: string, metadata: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/sections/${sectionId}/`, {
            metadata
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
        const response = await apiClient.patch(`/api/content-collections/${identifier}/sections/${sectionId}/`, payload)
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
        const response = await apiClient.patch(`/api/content-collections/${identifier}/sections/${sectionId}/`, {
            blocks
        })
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
        const response = await apiClient.patch(`/api/content-collections/${identifier}/sections/${sectionId}/blocks/${blockId}/`, payload)
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
        let url = '/api/content-collections/section-types/'
        if (identifier) {
            url += `?collection=${encodeURIComponent(identifier)}`
        }
        const response = await apiClient.get(url)
        return response.data
    },

    /**
     * Get countries with content collections
     */
    getCountriesWithCollections: async (): Promise<{
        message: string
        response_code: string
        data: Array<{
            country_id: string
            country_name: string
            icon_url: string | null
        }>
    }> => {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/content-collections/countries/with-collections/`)
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
            metadata?: Record<string, unknown>
            entity_type?: string
        }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/`, payload)
        return response.data
    },

    /**
     * Add a link to a section (adds a link item to the links block)
     */
    addLinkToSection: async (
        collectionIdentifier: string,
        sectionId: string,
        linkData: {
            url: string
            description?: string | null
            label?: string | null
            platform?: string | null
        }
    ): Promise<ApiResponse<unknown>> => {
        const payload: {
            block_type: string
            label?: string | null
            description?: string | null
            value: {
                text?: string | null
                items: Array<{
                    url: string
                    platform?: string | null
                }>
            }
        } = {
            block_type: 'links',
            value: {
                items: [
                    {
                        url: linkData.url,
                        platform: linkData.platform || null
                    }
                ]
            }
        }

        // Add optional fields if provided
        if (linkData.label) {
            payload.label = linkData.label
        }
        if (linkData.description) {
            payload.description = linkData.description
            // Also add description as value.text if needed
            payload.value.text = linkData.description
        }

        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/${sectionId}/blocks/`, payload)
        return response.data
    },

    /**
     * Add a block to a section (generic – e.g. text block for tips)
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
        const response = await apiClient.post(`/api/content-collections/${collectionIdentifier}/sections/${sectionId}/blocks/`, block)
        return response.data
    },

    /**
     * Add a comment on an experience. Comments are keyed by `experience_id`
     * (not section_id) under `collection.metadata.experience_comments`. The
     * content-collection variant is rendered for symmetry with the traveler
     * collection — backend gating still applies (rimigo_internal only writes).
     */
    addExperienceComment: async (identifier: string, payload: { experience_id: string; text: string }): Promise<ApiResponse<ExperienceComment>> => {
        const response = await apiClient.post(`/api/content-collections/${encodeURIComponent(identifier)}/experience-comments/`, payload)
        return response.data
    },

    updateExperienceComment: async (identifier: string, commentId: string, payload: { text: string }): Promise<ApiResponse<ExperienceComment>> => {
        const response = await apiClient.patch(
            `/api/content-collections/${encodeURIComponent(identifier)}/experience-comments/${encodeURIComponent(commentId)}/`,
            payload
        )
        return response.data
    },

    deleteExperienceComment: async (identifier: string, commentId: string): Promise<void> => {
        await apiClient.delete(`/api/content-collections/${encodeURIComponent(identifier)}/experience-comments/${encodeURIComponent(commentId)}/`)
    },

    /**
     * Add experiences from itinerary
     * POST /api/content-collections/add-experiences-from-itinerary/
     */
    addExperiencesFromItinerary: async (collectionIdentifier: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post('/api/content-collections/add-experiences-from-itinerary/', {
            content_collection_identifier: collectionIdentifier
        })
        return response.data
    },

    /**
     * Get trips with pagination
     */
    getTrips: async (
        page: number = 1,
        pageSize: number = 30,
        status?: string,
        search?: string,
        tripDetails?: boolean
    ): Promise<{
        count: number
        next: string | null
        previous: string | null
        results: Array<{
            id: string
            trip_sequence_id: string
            name: string
            description: string | null
            start_date: string | null
            end_date: string | null
            status: string
            created_at: string
            updated_at: string
            [key: string]: unknown
        }>
    }> => {
        const url = `${API_CONFIG.BASE_URL}/api/trips/`
        const params: Record<string, string | number> = {
            page,
            page_size: pageSize
        }
        if (status) {
            params.status = status
        }
        if (search && search.trim()) {
            params.search = search.trim()
        }
        if (tripDetails) {
            params.trip_details = 'true'
        }
        const response = await apiClient.get(url, { params })
        return response.data
    },

    /**
     * Add collection to trip
     */
    addCollectionToTrip: async (identifier: string, tripId: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/content-collections/add-to-trip/`, {
            identifier,
            trip_id: tripId
        })
        return response.data
    },

    /**
     * Get all trip sources
     */
    getTripSources: async (): Promise<
        ApiResponse<
            Array<{
                id: string
                name: string
                is_account_created: boolean
                entity_name?: string
                media?: {
                    thumbnail_url?: string
                    instagram_profile_url?: string
                    youtube_profile_url?: string
                }
            }>
        >
    > => {
        const response = await apiClient.get('/api/trip-sources/')
        // API returns array directly
        // Handle both direct array response and wrapped response
        if (Array.isArray(response.data)) {
            return { data: response.data }
        }

        // If response.data has a data property (already wrapped)
        if (response.data?.data && Array.isArray(response.data.data)) {
            return response.data
        }
        // Fallback: return empty array
        return { data: [] }
    },

    /**
     * Add collection to source
     */
    addToSource: async (
        collectionIdentifier: string,
        sourceId: string,
        entityName: string,
        type: string = 'creator'
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/content-collections/add-to-source/`, {
            identifier: collectionIdentifier,
            source_id: sourceId,
            entity_name: entityName,
            type
        })
        return response.data
    },

    /**
     * Get trip source by ID
     */
    getTripSourceById: async (
        id: string
    ): Promise<
        ApiResponse<{
            id: string
            name: string
            is_account_created: boolean
            entity_name?: string
            media?: {
                thumbnail_url?: string
                instagram_profile_url?: string
                youtube_profile_url?: string
            }
            metadata?: {
                follower_count?: string
                total_trips?: string
                countries_visited: string
            }
        }>
    > => {
        const response = await apiClient.get(`/api/trip-sources/${id}/?view=compact`)
        // Handle both direct object response and wrapped response
        if (response.data && response.data.id) {
            return { data: response.data }
        }
        if (response.data?.data && response.data.data.id) {
            return response.data
        }
        return response.data
    },

    /**
     * Clone content collection to traveler (tag collection to traveler)
     * POST /api/content-collections/clone-to-traveler-collection/
     */
    cloneToTravelerCollection: async (identifier: string, travelerId: string, tripId?: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post('/api/content-collections/clone-to-traveler-collection/', {
            identifier,
            traveler_id: travelerId,
            ...(tripId ? { trip_id: tripId } : {})
        })
        return response.data
    },

    /**
     * Get place preview (Google-hosted photo URL + place name, optional lat/long for map) by address.
     */
    getPlacePreview: async (
        name: string,
        address?: string
    ): Promise<{
        official_name: string
        preview_url: string
        google_maps_url: string
        latitude?: number
        longitude?: number
    }> => {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/places/preview/`, {
            name,
            ...(address ? { address } : {})
        })
        return response.data?.data ?? response.data
    },

    /**
     * Get content collection metadata by ID
     */
    getContentCollectionMetadata: async (
        id: string
    ): Promise<{
        message: string
        response_code: string
        data: {
            id: string
            metadata: {
                source?: string
                trip_route?: Array<{
                    id: string
                    name: string
                    nights: number
                }>
                seasonal_info?: Array<{
                    label: string
                    description: string
                }>
                trip_highlights?: Array<{
                    label: string
                    description: string
                }>
                [key: string]: unknown
            }
            portrait_images: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            landscape_images: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            reels: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            rimigo_videos: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            youtube_shorts: Array<{
                id: string
                url: string
                video_id?: string
                title?: string
                metadata?: Record<string, unknown>
            }>
            youtube_videos: Array<{
                id: string
                url: string
                video_id?: string
                title?: string
                metadata?: Record<string, unknown>
            }>
            created_at: string
            updated_at: string
        }
    }> => {
        const response = await apiClient.get(`/api/content-collection-metadata/${id}/`)
        return response.data
    },

    /**
     * Create a payment session for purchasing a content collection.
     * Returns Cashfree payment_session_id for checkout.
     * @param utmParams - Optional UTM params from URL (utm_source as source, utm_medium, utm_campaign, utm_term); source defaults to "rimigo" when not provided
     */
    purchaseContentCollection: async (
        collectionId: string,
        travelerId: string,
        utmParams?: { source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string }
    ): Promise<ContentCollectionPurchaseResponse> => {
        try {
            const body: Record<string, string> = {
                collection_id: collectionId,
                traveler_id: travelerId,
                source: utmParams?.source ?? 'rimigo'
            }
            if (utmParams?.utm_medium != null) body.utm_medium = utmParams.utm_medium
            if (utmParams?.utm_campaign != null) body.utm_campaign = utmParams.utm_campaign
            if (utmParams?.utm_term != null) body.utm_term = utmParams.utm_term

            const response = await apiClient.post<ContentCollectionPurchaseResponse>(`${API_CONFIG.BASE_URL}/api/content-collections/purchase/`, body)
            return response.data
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
            throw new Error(errorMessage)
        }
    },

    /**
     * Create content collection metadata
     */
    createContentCollectionMetadata: async (
        identifier: string,
        metadata: {
            metadata?: {
                trip_route?: Array<{
                    id: string
                    name: string
                    nights: number
                }>
                seasonal_info?: Array<{
                    label: string
                    description: string
                }>
                trip_highlights?: Array<{
                    label: string
                    description: string
                }>
                [key: string]: unknown
            }
            portrait_images?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            landscape_images?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            reels?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            rimigo_videos?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            youtube_shorts?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            youtube_videos?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
        }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.post(`/api/content-collections/${identifier}/metadata/`, metadata)
        return response.data
    },

    /**
     * Update content collection metadata
     */
    updateContentCollectionMetadata: async (
        metadataId: string,
        metadata: {
            metadata?: {
                trip_route?: Array<{
                    id: string
                    name: string
                    nights: number
                }>
                seasonal_info?: Array<{
                    label: string
                    description: string
                }>
                trip_highlights?: Array<{
                    label: string
                    description: string
                }>
                [key: string]: unknown
            }
            portrait_images?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            landscape_images?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            reels?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            rimigo_videos?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            youtube_shorts?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
            youtube_videos?: Array<{
                id: string
                url: string
                metadata?: Record<string, unknown>
            }>
        }
    ): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/api/content-collection-metadata/${metadataId}/`, metadata)
        return response.data
    },

    /**
     * Update collection-level metadata (DictField on the collection model).
     * PATCH /api/content-collections/{identifier}/ with { metadata: {...} }
     */
    updateCollectionMetadata: async (identifier: string, metadata: Record<string, unknown>): Promise<ApiResponse<ContentCollection>> => {
        const response = await apiClient.patch(`/api/content-collections/${identifier}/`, { metadata })

        if (response.data && response.data.data && !Array.isArray(response.data.data)) {
            return { data: response.data.data }
        }
        if (response.data && !Array.isArray(response.data) && response.data.id) {
            return { data: response.data }
        }
        return response.data
    },

    /**
     * Sync a content collection with its linked itinerary.
     * POST /api/content-collections/{identifier}/sync-from-itinerary/
     */
    syncFromItinerary: async (
        identifier: string
    ): Promise<
        ApiResponse<{
            task_id: string
        }>
    > => {
        const response = await apiClient.post(`/api/content-collections/${identifier}/sync-from-itinerary/`)
        return response.data
    }
}
