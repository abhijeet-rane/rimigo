export interface IExploreExperiencesParams {
    country_id: string
    page?: number
    limit?: number
    city_ids?: string
    search_query?: string
}

export interface ExperiencesApiResponse {
    total: number
    page: number
    limit: number
    has_more: boolean
    results: ExperienceApiItem[]
}

export interface ExperienceApiItem {
    id: string
    name: string
    identifier: string
    alternate_name?: string
    base_city: {
        id: string
        name: string
        province: string | null
        country: {
            id: string
            name: string
            region: {
                id: string
                name: string
                created_at: string
                updated_at: string
            }
            created_at: string
            updated_at: string
        }
        experience_count: number
        created_at: string
        updated_at: string
    }
    alternate_base_city: null | Record<string, unknown>
    categories: string[]
    location: {
        address: string
        latitude: number
        longitude: number
        location_summary: string
        zipcode: string
    }
    display_props: {
        name: string
        landscape_image: string
        portrait_image: string
        reel?: string
        video?: string
        short: string
        description: string
    }
    price: {
        currency: string
        upper_bound: number
        lower_bound: number
        description: string | null
    }
    tags: {
        must_do: boolean
        hidden_gem: boolean
        luxury: boolean
        budget: boolean
        touristy: boolean
        off_beat: boolean
    }
    [key: string]: unknown // For other fields we might not need
}

export interface CategoryListResponse {
    [key: string]: ExperienceApiItem[] // suggestion_priority_0, suggestion_priority_2, etc.
}

export interface VerifiedPhoto {
    id: string
    url: string
    description?: string | null
    created_at?: string
    updated_at?: string
}

export interface CountryExploreExperience {
    id: string
    name: string
    city_name: string
    identifier: string
    city_id: string
    suggestion_priority?: number | null
    price?: {
        currency?: string | null
        upper_bound?: number | null
        lower_bound?: number | null
    }
    display_props?: {
        landscape_image?: string | null
    }
    short_description: string | null
    categories: string[] | null
    verified_photos?: VerifiedPhoto[] | null
}

export interface CategoryExperienceItem {
    id: string
    name?: string
    display_props?: {
        name?: string
        landscape_image?: string | null
        portrait_image?: string | null
    }
    price?: {
        lower_bound?: number | null
    }
    display_image?: string | null
}

export interface CategorySection {
    priority: string
    experiences: ExperienceApiItem[]
    title: string
    subtitle: string
}
