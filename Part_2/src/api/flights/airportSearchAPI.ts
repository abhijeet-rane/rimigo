import apiClient from '@/lib/api/apiClient'

export interface Airport {
    name: string
    code: string
    city_code: string
    city_name: string
    country_name: string
    region_name?: string
    is_metro?: boolean
    full_name?: string
}

export interface AirportSearchResponse {
    status: string
    data: {
        query?: string
        codes?: string[]
        count: number
        airports: Airport[]
    }
}

/**
 * Search airports by query string. Backed by Kayak's flight autocomplete on
 * the BE.
 *
 * @param query  Search term (airport name, city, or IATA code).
 * @param limit  Accepted for back-compat; the BE caps to Kayak's max of 6.
 */
export const searchAirports = async (query: string, limit: number = 10): Promise<AirportSearchResponse> => {
    try {
        const response = await apiClient.get<AirportSearchResponse>('/api/airports/search/', {
            params: {
                query,
                limit
            }
        })
        return response.data
    } catch (error: any) {
        console.error('Airport search error:', error)
        throw error
    }
}

/**
 * Get airports by codes
 * @param codes - Array of airport codes
 * @returns Promise with airport details
 */
export const getAirportsByCodes = async (codes: string[]): Promise<AirportSearchResponse> => {
    try {
        const response = await apiClient.post<AirportSearchResponse>('/api/airports/search/', {
            codes
        })
        return response.data
    } catch (error: any) {
        console.error('Get airports by codes error:', error)
        throw error
    }
}

