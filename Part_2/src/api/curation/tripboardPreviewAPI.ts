import apiClient from '@/lib/api/apiClient'

// ── Types ──────────────────────────────────────────────────────────

export interface TipItem {
    label: string
    text: string
}

export interface LinkItem {
    ui_label: string
    provider: string
    url: string
    description: string
    button_label: string
}

export interface TripboardPreviewCountryData {
    tips: TipItem[]
    dos: string[]
    donts: string[]
    links: Record<string, LinkItem[]>
}

export type TripboardPreviewResponse = Record<string, TripboardPreviewCountryData>

export interface CountryBasicInfo {
    country_name: string
    seasonal_information: Record<string, unknown>
    descriptions: string[] | Record<string, string>
}

// ── API Functions ──────────────────────────────────────────────────

/**
 * Fetch tips, dos/donts, and links for multiple countries.
 * Uses the existing tripboard-preview endpoint.
 */
export const getTripboardPreview = async (countryIds: string[]): Promise<TripboardPreviewResponse> => {
    const response = await apiClient.get('/curation/location-personalization/countries/tripboard-preview/', {
        params: { country_ids: countryIds.join(',') }
    })
    return response.data?.data ?? response.data
}

/**
 * Fetch basic country information (name, seasonal info, descriptions).
 */
export const getCountryBasicInfo = async (countryId: string): Promise<CountryBasicInfo> => {
    const response = await apiClient.get(`/curation/location-personalization/countries/${countryId}/basic/`)
    return response.data?.data ?? response.data
}
