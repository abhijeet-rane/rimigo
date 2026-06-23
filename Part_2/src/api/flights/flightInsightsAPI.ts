import apiClient from '@/lib/api/apiClient'

export interface AirportSuggestion {
    code: string
    name: string
    reason: string
}

export interface AirportSuggestions {
    india_airports?: AirportSuggestion[]
    destination_airports?: AirportSuggestion[]
}

export interface AIInsight {
    type: 'forecast' | 'tip' | 'alert'
    text: string
}

export interface TravelContentMetaData {
    video_id?: string
    title: string
    description?: string
    channel_title?: string
    channel_id?: string
    published_at?: string
    view_count?: number
    like_count?: number
    comment_count?: number
    duration?: string
    thumbnail_url?: string
    tags?: string[]
    category_id?: string
}

export interface TravelContent {
    id: string
    content_type: 'youtube' | 'instagram'
    content_link: string
    content_category?: string
    content_categories?: string[]
    meta_data: TravelContentMetaData
    content_language?: string
    country?: {
        id: string
        name: string
    }
}

export interface FlightInsightsData {
    route: string
    average_round_trip_fare_inr: number
    average_one_way_fare_inr: number
    cheapest_month: string
    most_expensive_month: string
    price_trend: 'rising' | 'falling' | 'stable'
    best_booking_window: string
    best_days_to_fly: string[]
    airport_suggestions?: AirportSuggestions
    tips_and_hacks?: string[]
    ai_insights: AIInsight[]
    confidence_score: number
    generated_at?: string
    travel_content?: TravelContent[]
}

export interface FlightInsightsResponse {
    message: string
    response_code: string
    data: FlightInsightsData
}

export const getFlightInsights = async (countryId: string): Promise<FlightInsightsData> => {
    const response = await apiClient.get<FlightInsightsResponse>(`/api/flight-insights/`, {
        params: {
            country_id: countryId
        }
    })
    return response.data.data
}

