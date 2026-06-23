export interface SeasonalInformationType {
    [key: string]: {
        is_recommended: boolean | null
        crowd_levels: {
            level: string
            description: string
        }
        is_peak_season: boolean | null
        is_price_higher_than_usual: boolean | null
        availability: {
            is_available: boolean | null
            restrictions: string | null
        }
        description: string | null
        created_at: string
        updated_at: string
        weather: {
            minimum_temperature: number | null
            maximum_temperature: number | null
            average_temperature: number | null
            temperature_unit: string | null
            precipitation_chance: number | null
            description: string | null
        }
    }
}
export type RecommendedMode = 'guided_tour' | 'self_explore'
export type BookingWindow = 'prebook' | 'few_days_in_advance' | 'on_the_spot'

export type ValueForMoney = {
    value: 'low' | 'medium' | 'high'
    reason: string // ≤ 10 words, third-person justification
}

export type ReviewSnippet = {
    tag: string // exactly two words
    description: string // ≤ 100 chars, third-person tone
}

export type ModelAttempt = {
    status?: 'success' | 'error' | 'fallback'
    duration_seconds?: number // generation time for this attempt
    error?: string // populated when status indicates failure
}

export type GroupTravelerReview = {
    positive_reviews: ReviewSnippet[]
    negative_reviews: ReviewSnippet[]
    is_value_for_money: ValueForMoney
}

export type TravelerReviews = {
    generated_at?: string // ISO timestamp for the whole batch
    group_reviews: Record<string, GroupTravelerReview>
}

/*

 "is_recommended": false,
            "weather": {
                "minimum_temperature": 0.0,
                "maximum_temperature": 0.0,
                "average_temperature": 0.0,
                "temperature_unit": "celsius",
                "precipitation_chance": 0.0,
                "description": ""
            },
            "crowd_levels": {
                "level": "low",
                "description": ""
            },
            "is_peak_season": false,
            "is_price_higher_than_usual": false,
            "availability": {
                "is_available": true,
                "restrictions": ""
            },
            "description": "",
            "created_at": "2025-07-11T05:21:15.163000",
            "updated_at": "2025-07-11T05:21:15.163000"
*/
export interface ExperienceDetailsType {
    id: string
    suggestion_priority?: number | null
    name: string
    identifier: string
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
    location: {
        address: string
    }
    price: {
        currency: string | null
        lower_bound: number | null
        upper_bound: number | null
    }
    display_props: {
        name: string
        landscape_image: string
        portrait_image: string
        reel: string
        video: string
        description: string
    }
    short_description: string

    categories: string[]
    group_type_suitability: {
        families: { is_suitable: boolean; description: string }
        couples: { is_suitable: boolean; description: string }
        solo_travelers: { is_suitable: boolean; description: string }
        groups: { is_suitable: boolean; description: string }
    }
    seasonal_information: SeasonalInformationType
    content: {
        verified_photos?: Array<{
            id: string
            url: string
            description: string
        }>
        // optional
        instagram_reels?: Array<{
            id: string
            url: string
            description: string
            created_at: string
            updated_at: string
            _cls: string
        }>
        // optional
        youtube_videos?: Array<{
            id: string
            url: string
            description: string
        }>
        verified_videos?: Array<{
            id: string
            url: string
            description: string
            created_at: string
            updated_at: string
            _cls: string
        }>
        highlights?: Array<{
            order: number
            text: string
        }>
        youtube_shorts?: Array<{
            id: string
            url: string
            description: string
        }>
    }
    transport_options: {
        bus: boolean
        metro: boolean
        train: boolean
        taxi: boolean
        car: boolean
        bike: boolean
        cable_car: boolean
        walking: boolean
        shuttle_service: boolean
        boat_service: boolean
        ferry_service: boolean
        description: string
        recommended_option: string[]
        transport_option_description?: Array<{
            key: string
            description: string
        }>
    }
    timing_guide: {
        recommended_time_slots: string[]
        [key: string]:
            | {
                  start_time: string
                  end_time: string
                  description: string
                  is_closed: boolean
              }
            | string[]
    }
    constraints: {
        age: {
            minimum: number
            maximum: number
            description: string
        }
        mobility: {
            wheelchair_accessible: boolean
            walking_required: boolean
            description: string
        }
    }
    is_ticket_required: boolean | null
    recommended_mode: RecommendedMode | null
    booking_window: BookingWindow | null
    ata_agent: {
        id: string
        name: string
        identifier: string
        icon_url: string | null
    }
    traveler_reviews?: TravelerReviews
}

export type AdaptedExperienceDetailsType = Omit<ExperienceDetailsType, 'location'> & {
    location: {
        address: string
        city: {
            id: string
            name: string
        }
        country: {
            id: string
            name: string
        }
    }
    suggestion_priority?: number | null
    traveler_reviews?: TravelerReviews
}
