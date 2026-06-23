// Types for Global Search API

export interface SearchResult {
    type: 'experience' | 'location_country' | 'location_city'
    id: string
    score: number
}

export interface ExperienceResult extends SearchResult {
    type: 'experience'
    name: string
    identifier: string
    landscape_image?: string
    portrait_image?: string
    city_name?: string
    city_id?: string
    country_name?: string
    country_id?: string
}

export interface LocationCountryResult extends SearchResult {
    type: 'location_country'
    country_name: string
    country_id: string
    image_url?: string
    is_live?: boolean
}

export interface LocationCityResult extends SearchResult {
    type: 'location_city'
    city_name: string
    city_id: string
    image_url?: string
    country_id: string
    country_name: string
    is_live?: boolean
}

export type SearchResultUnion = ExperienceResult | LocationCountryResult | LocationCityResult

export interface SearchData {
    query: string
    count: number
    results: SearchResultUnion[]
}

export interface SearchResponse {
    message: string
    response_code: string
    data: SearchData
}
