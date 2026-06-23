export interface ExperienceDetails {
    id: string
    name: string
    location: {
        address: string
        city: string
        country: string
    }
    price: {
        currency: string
        lower_bound: number
        upper_bound: number
    }
    description: string
    short_description: string
    highlights: Array<{
        order: number
        text: string
    }>
    categories: string[]
    group_type_suitability: {
        families: { is_suitable: boolean; description: string }
        couples: { is_suitable: boolean; description: string }
        solo_travelers: { is_suitable: boolean; description: string }
        groups: { is_suitable: boolean; description: string }
    }
    seasonal_information: {
        [key: string]: {
            is_recommended: boolean
            weather: {
                minimum_temperature: number
                maximum_temperature: number
                average_temperature: number
                temperature_unit: string
                precipitation_chance: number
                description: string
            }
            crowd_levels: {
                level: string
                description: string
            }
            is_peak_season: boolean
            description: string
        }
    }
    content: {
        verified_photos: Array<{
            id: string
            url: string
            description: string
        }>
        instagram_reels: Array<{
            id: string
            url: string
            description: string
        }>
        youtube_videos: Array<{
            id: string
            url: string
            description: string
        }>
    }
    transport_options: {
        description: string
        recommended_option: string[]
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
}
