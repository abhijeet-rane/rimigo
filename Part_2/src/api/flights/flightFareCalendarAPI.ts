import apiClient from '@/lib/api/apiClient'

export interface FlightFareCalendarRequest {
    origin: string
    destination: string
    departure_date?: string
    year?: number
    month?: number
    journey_type?: 1 | 2
    return_nights?: number
    adults?: number
    children?: number
    infants?: number
    cabin_class?: 1 | 2 | 3 | 4
    direct_only?: boolean
    currency?: string
}

export interface FlightFareCalendarDay {
    date: string
    min_price: number | null
    currency: string
    provider: string | null
    offers_count: number
}

export interface FlightFareCalendarResponse {
    origin: string
    destination: string
    year: number
    month: number
    currency: string
    journey_type: number
    return_nights: number
    days: FlightFareCalendarDay[]
    best_day?: {
        date: string
        min_price: number
        currency: string
        provider?: string | null
    } | null
    source?: string
}

export const getFlightFareCalendar = async (payload: FlightFareCalendarRequest): Promise<FlightFareCalendarResponse> => {
    const response = await apiClient.post('/api/flights/fare-calendar/', payload)
    const body = response.data
    return (body?.data || body) as FlightFareCalendarResponse
}
