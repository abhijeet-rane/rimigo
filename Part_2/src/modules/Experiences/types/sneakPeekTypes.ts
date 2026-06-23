import { SeasonalInformationType } from './experienceDetailTypes'

export interface SneakPeekResponse {
    experience_id: string
    experience_name: string
    seasonal_information: SeasonalInformationType | null
    constraints: {
        age: {
            minimum: number | null
            maximum: number | null
            description: string
        }
        mobility: {
            is_wheelchair_accessible: boolean
            walking_required: boolean
            stairs_present: boolean
            seating_available: boolean
            flat_terrain: boolean
            hiking_required: boolean
            elevator_available: boolean
            mobility_scooter_friendly: boolean
            ramps_available: boolean
            description: string
        }
        pregnancy?: {
            is_suitable: boolean
            is_allowed: boolean
            description: string
        }
        pets?: {
            are_suitable: boolean
            are_allowed: boolean
            description: string
        }
        driving_constraints?: {
            driving_license_required: boolean
            idp_required: boolean
            description: string
        }
    }
    duration_spent: {
        unit: string
        min: number
        max: number
        avg_min: number
        avg_max: number
        tour_count: number
        all_units: {
            [key: string]: {
                min: number
                max: number
                avg_min: number
                avg_max: number
                tour_count: number
            }
        }
    } | null
    traveler_reviews: {
        generated_at: string
        is_reviews_generated?: boolean
        group_reviews: {
            [key: string]: {
                positive_reviews: Array<{
                    tag: string
                    description: string
                }>
                negative_reviews: Array<{
                    tag: string
                    description: string
                }>
                is_value_for_money:
                    | boolean
                    | {
                          value: 'low' | 'medium' | 'high'
                          reason: string
                      }
            }
        }
    }
    shorts?: Array<{
        id: string
        url: string
        description?: string
        created_at?: string
        updated_at?: string
    }>
    landscape_image?: string
    verified_photos?: Array<{
        id: string
        url: string
        description?: string
        created_at?: string
        updated_at?: string
    }>
    short_description?: string
    city_name?: string
    country_name?: string
    operating_hours?: string
}
