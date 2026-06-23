import apiClient from '@/lib/api/apiClient'

export interface AirportResolveResponse {
    city: string
    country: string | null
    iata: string | null
}

/**
 * Resolve a city name (with optional country) to a primary IATA airport/metro code.
 * Returns null when the resolver is not confident — caller treats that as
 * "leg not auto-populatable" and surfaces a manual-input affordance.
 */
export const resolveIataFromCity = async (
    city: string,
    country?: string | null
): Promise<string | null> => {
    const params: Record<string, string> = { city }
    if (country) params.country = country
    const { data } = await apiClient.get<{ data: AirportResolveResponse }>(
        '/api/airports/resolve/',
        { params }
    )
    return data?.data?.iata ?? null
}
