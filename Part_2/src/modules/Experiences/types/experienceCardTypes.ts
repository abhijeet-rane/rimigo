/**
 * Price information for an experience
 */
export interface ExperiencePrice {
    lower_bound: number | null
    upper_bound: number | null
    currency: string | null
}

/**
 * Main Experience Card Data interface
 * This is the UI-friendly format used across the application
 */
export interface ExperienceCardData {
    id: string
    title: string // Formatted title for display
    name?: string // Original name from API (for list pages)
    identifier?: string // Original identifier from API (for top activities)
    city_name: string
    city_id: string
    price: ExperiencePrice
    image: string // Deprecated: use images array instead
    images?: string[] // Array of image URLs for carousel (includes verified_photos + landscape_image)
    suggestion_priority: number | null
    experience_recommended?: boolean | null
    reason_of_suggestion?: string[]
    short_description: string | null
    category?: string | null
    categoryBackendValue?: string | null // Original category backend value for mapping to preferences
    categories?: string[] | null // All category backend values (for tags in listing section)
    categoryIcon?: string | null // Icon URL for the category (set in adapter)
    start_date?: string | null // Start date for the experience (YYYY-MM-DD format, from collection metadata)
    end_date?: string | null // End date for the experience (YYYY-MM-DD format, from collection metadata)
}

/**
 * Extract only the fields needed for ListCard component
 */
export type ListCardExperienceData = Pick<
    ExperienceCardData,
    'id' | 'title' | 'name' | 'identifier' | 'city_name' | 'price' | 'image' | 'images' | 'short_description' | 'category' | 'categoryIcon'
>

/**
 * Extract only the fields needed for ExperienceCard component
 */
export type ExperienceCardComponentData = Pick<
    ExperienceCardData,
    | 'id'
    | 'title'
    | 'city_name'
    | 'city_id'
    | 'price'
    | 'image'
    | 'images'
    | 'suggestion_priority'
    | 'short_description'
    | 'category'
    | 'categoryBackendValue'
    | 'categoryIcon'
>

/**
 * Extract only the fields needed for Top Activities
 */
export type TopActivityData = Pick<
    ExperienceCardData,
    'id' | 'title' | 'identifier' | 'city_name' | 'image' | 'images' | 'short_description' | 'category' | 'categoryIcon' | 'categoryBackendValue'
>

/**
 * Extract only the fields needed for List Section
 */
export type ListSectionExperienceData = Pick<
    ExperienceCardData,
    | 'id'
    | 'title'
    | 'name'
    | 'city_name'
    | 'price'
    | 'image'
    | 'images'
    | 'suggestion_priority'
    | 'category'
    | 'categoryIcon'
    | 'categoryBackendValue'
>
