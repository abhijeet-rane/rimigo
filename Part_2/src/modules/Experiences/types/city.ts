// API Response Types
export interface CityApiResponse {
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
    created_at: string | null
    updated_at: string | null
}

export interface CitiesApiResponse {
    results: CityApiResponse[]
    pagination: {
        total_count: number
        total_pages: number
        current_page: number
        limit: number
        has_next: boolean
        has_previous: boolean
    }
}

// UI Types
export interface CityFilter {
    id: string
    name: string
    isSelected: boolean
    experienceCount?: number
}
