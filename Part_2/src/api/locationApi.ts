import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export const getAllCitiesByCountry = async (countryName: string) => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/?country_name=${countryName}&is_paginated=false`)
    return response.data
}

export interface CountryCitySearchResult {
    id: string
    name: string
}

interface CountryCitySearchResponse {
    results?: Array<{ id: string; name: string }>
}

// Global city search — searches the full curated city catalogue by name,
// not scoped to any country. Used by the inter-city transport picker so
// cross-border legs (e.g. Singapore → Kuala Lumpur) can be searched directly.
export const searchCities = async (
    query: string,
    signal?: AbortSignal,
): Promise<CountryCitySearchResult[]> => {
    const params = new URLSearchParams({ search: query })
    const response = await apiClient.get<CountryCitySearchResponse>(
        `${API_CONFIG.BASE_URL}/curation/cities/?${params.toString()}`,
        { signal },
    )
    const results = response.data?.results ?? []
    return results.map((c) => ({ id: c.id, name: c.name }))
}
