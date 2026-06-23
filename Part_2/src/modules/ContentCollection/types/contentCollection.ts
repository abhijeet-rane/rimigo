export type CurationStatus = 'draft' | 'published' | 'archived'

export type BlockType = 'text' | 'text_list' | 'links' | 'notice' | 'comment'

export interface CommentBlockValue {
    text: string
    author_id: string
    author_name: string
    created_at: string
    updated_at: string
}

/**
 * Comment stored under `collection.metadata.experience_comments`, keyed by
 * `experience_id` rather than `section_id`. Lives outside `section.blocks`
 * because the "In your itinerary" view reads from itinerary slots (which have
 * no section), so comments must survive when no section exists.
 */
export interface ExperienceComment {
    id: string
    experience_id: string
    text: string
    author_id: string
    author_name: string
    created_at: string
    updated_at: string
}

export interface Publisher {
    type: string
    publisher_id: string
    name?: string
    metadata?: Record<string, unknown>
}

export interface CollectionContext {
    trip_id?: string | null
    country_id?: string[]
    city_id?: string[]
}

export interface Block {
    id?: string
    block_type: BlockType
    label?: string | null
    description?: string | null
    level?: string | null
    value: {
        content?: string // For text block
        // items?: string[] // For text_list block
        items?: Array<{
            // For links block
            url: string
            platform?: string
            tags?: string[]
        }>
        text?: string // For notice block
        message?: string // Alternative for notice
        button_label?: string // Dynamic button label (Book, Apply, Buy, etc.)
        [key: string]: unknown
    }
}

/**
 * source — set by the backend at read time:
 *   - "custom"                → real Section in TC.sections / CC.sections authored by an
 *                               internal user; can be edited/deleted
 *   - "location_personalised" → built fresh from LocationPersonalization master; read-only
 * Older API responses won't include this field; treat undefined as "custom" for back-compat.
 */
export type SectionSource = 'custom' | 'location_personalised'

export interface Section {
    id?: string
    section_type: string
    title: string
    description?: string | null
    sections_order?: number | null
    entity_id?: string | null
    source?: SectionSource
    blocks: Block[]
    metadata?: {
        display_props?: {
            landscape_image?: string
        }
        content?: {
            verified_photos?: Array<{ id: string; url: string }>
        }
        location?: {
            address?: string
            latitude?: number
            longitude?: number
            location_summary?: string
            zipcode?: string
        }
        city_id?: string
        city_name?: string
        [key: string]: unknown
    }
}

export interface Pricing {
    amount: number
    currency: string
}

/**
 * Flag bag for collection-level permissions/toggles.
 * Extend with new keys as more internal-controlled permissions are added.
 */
export interface CollectionPermissions {
    show_customise_trip_button?: boolean
    [key: string]: unknown
}

export interface ContentCollection {
    id?: string
    identifier: string
    name: string
    description?: string | null
    image_url?: string | null
    cover_image?: string | null
    trip_name?: string | null
    trip_id?: string | null
    publisher?: Publisher | null
    status?: CurationStatus
    curation_status?: CurationStatus
    sections?: Section[]
    context?: CollectionContext | null
    icon_url?: string | null
    flag_icon_url?: string | null
    is_active?: boolean
    created_at?: string | null
    updated_at?: string | null
    content_collection_metadata?: string | null
    pricing?: Pricing | null
    permissions?: CollectionPermissions | null
    metadata?: {
        source?: string
        itinerary_synced_at?: string
        wizard_data?: {
            group_type?: string
            budget_range?: { min: number; max: number }
            city_preferences?: string[]
            travel_purpose?: string
        }
        /** Comments keyed by `experience_id` — see `ExperienceComment`. */
        experience_comments?: ExperienceComment[]
        [key: string]: unknown
    } | null
}

// ViewModel types for UI
export interface BlockViewModel {
    id: string
    type: BlockType
    typeFormatted: string
    label: string | null
    description: string | null
    level: string | null
    value: Record<string, unknown>
}

export interface SectionViewModel {
    id: string
    type: string
    typeFormatted: string
    title: string
    description: string | null
    sectionsOrder: number | null
    entityId: string | null
    blocks: BlockViewModel[]
}

export interface ContentCollectionViewModel {
    id: string
    identifier: string
    name: string
    description: string
    imageUrl: string
    tripId: string | null
    publisherName: string | null
    publisherId: string | null
    publisherType: string | null
    publisherMetadata: Record<string, unknown> | null
    status: CurationStatus
    statusFormatted: string
    sections: SectionViewModel[]
    context: CollectionContext | null
    isActive: boolean
    createdAt: string | null
    updatedAt: string | null
    formattedPrice: string | null
}

// API Response types
export interface ApiResponse<T> {
    data: T
    message?: string
    response_code?: string
}
