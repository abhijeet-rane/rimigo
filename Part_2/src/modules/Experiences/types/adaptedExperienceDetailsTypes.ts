import { UITransportOptions } from '../components/ExperienceDetails/components/HowToGetThere/TransportInformationCard'
import { BookingWindow, RecommendedMode, SeasonalInformationType } from './experienceDetailTypes'

export interface ExperienceDetailsType {
    id: string
    suggestion_priority?: number | null
    name: string
    location: {
        address: string
        city: {
            city_id: string
            city_name: string
        }
        country: {
            country_id: string
            country_name: string
        }
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
    transport_options: UITransportOptions
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
}

import { TravelerReviews } from './experienceDetailTypes'

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

export interface ExperienceDetailsResponse {
    data: {
        experience: ExperienceDetailsType
        floating_questions_cache_key?: string | null
    }
}
