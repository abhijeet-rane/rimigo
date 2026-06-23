import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export const searchCities = async (query: string) => {
    // TODO: Implement API call
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/?search=${query}`)
    return response.data
}

export interface CountryRegion {
    id: string
    name: string
    created_at: string
    updated_at: string
}

export interface CountryData {
    id: string
    name: string
    created_at: string
    updated_at: string
    region: CountryRegion
}

export interface CityCountryApiResponse {
    message: string
    response_code: string
    data: CountryData
}

export const getCountryByCityId = async (cityId: string): Promise<CountryData> => {
    // curl -X GET 'http://localhost:8000/curation/cities/67a31eca3a326523de0232c8/country/'
    const response = await apiClient.get<CityCountryApiResponse>(`${API_CONFIG.BASE_URL}/curation/cities/${cityId}/country/`)
    return response.data.data
}

export interface CountryByNameApiResponse {
    message: string
    response_code: string
    data: {
        country_id: string
    }
}

/**
 * Get country ID by name from /curation/countries/name/?name={countryName}
 * Returns the country_id from the response
 */
export const getCountryByName = async (countryName: string): Promise<string | null> => {
    const response = await apiClient.get<CountryByNameApiResponse>(
        `${API_CONFIG.BASE_URL}/curation/countries/name/?name=${encodeURIComponent(countryName)}`
    )
    return response.data.data?.country_id || null
}

export interface CityByNameApiResponse {
    message: string
    response_code: string
    data: {
        city_id: string
    }
}

/**
 * Get city ID by name from /curation/cities/name/?name={cityName}
 * Returns the city_id from the response
 */
export const getCityByName = async (cityName: string): Promise<string | null> => {
    const response = await apiClient.get<CityByNameApiResponse>(
        `${API_CONFIG.BASE_URL}/curation/cities/name/?name=${encodeURIComponent(cityName)}`
    )
    return response.data.data?.city_id || null
}
