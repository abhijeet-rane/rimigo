/*
    "experience_id": "6815a302e8ab27cae1a48ea1",
    "tours": [
        {
            "id": "686672b5315ba05eb53b0c28",
            "name": "Tokyo Disneyland Ticket",
            "platform": "headout",
            "link": "https://www.headout.com/tokyo-disney-resort/tokyo-disneyland-ticket-e-21913/",
            "platform_product_details": {
                "platform_product_id": "21913",
                "is_guided_tour": true,
                "is_private_tour": false,
                "highlights": [
                    "Step into a magical world at Tokyo Disneyland, where you can explore themed lands like Fantasyland and Tomorrowland.",
                    "Experience the magic of fun and interactive worlds like Pooh's Hunny Hunt, the exciting Monsters, Inc. Ride & Go Seek, and more.",
                    "Get up close with beloved Disney characters, enjoy vibrant parades, and be wowed by incredible fireworks shows that light up the night sky."
                ],
                "includes": [],
                "not_includes": [],
                "description": "Witness the magic of Disney comes to life in the heart of Japan at Tokyo Disneyland! The park is modeled after the original Disneyland in California but features unique attractions and shows specific to Japanese culture. Take a journey through classic Disney stories, from the thrilling Pirates of the Caribbean to the enchanting world of Beauty and the Beast. Meet beloved characters like Mickey Mouse and Cinderella, and make unforgettable memories with your friends and family. Explore the whimsical lands of Fantasyland, Adventureland, Tomorrowland, and more. Fly high on Dumbo The Flying Elephant, spin around on the Happy Ride with Baymax, and embark on a jungle safari in Adventureland. But the fun doesn't stop there - Tokyo Disneyland also offers a wide range of delicious dining options, from mouth-watering Mickey-shaped snacks to exquisite sit-down meals. And don't forget to catch a spectacular nighttime parade or fireworks show before you leave!",
                "provider_tags": null,
                "price": {
                    "min_price": 5194.0,
                    "max_price": 5194.0,
                    "currency": "INR",
                    "price_type": "per_person"
                },
                "duration": {
                    "min_duration": 4200000.0,
                    "max_duration": 4200000.0,
                    "unit": "milliseconds"
                },
                "cancellation_policy": null,
                "rating": {
                    "rating": 4.1,
                    "no_of_reviews": 89
                },
                "pickup_info": null,
                "meal_info": null
            },

            */

export interface PlatformProductDetails {
    platform_product_id: string
    is_guided_tour: boolean
    is_private_tour: boolean
    highlights: string[]
    includes: string[]
    price?: {
        min_price: number
        max_price: number
        currency: string
        price_type: string
    } | null
    duration?: {
        min_duration: number
        max_duration: number
        unit: string
    } | null
    cancellation_policy: {
        is_refundable: boolean
        description: string
    } | null
    rating?: {
        rating: number
        no_of_reviews: number
    } | null
    pickup_info: string | null
    meal_info: string | null
    not_includes: string[]
    description: string
    provider_tags: string | null
}

export interface MappingVisibilityInfo {
    is_published_on_rimigo: boolean
    updated_by_name?: string | null
    updated_by_email?: string | null
    updated_at?: string | null
    description?: string | null
}

export interface MappingRecommendationInfo {
    is_recommended: boolean
    updated_by_name?: string | null
    updated_by_email?: string | null
    updated_at?: string | null
    description?: string | null
}

export interface Tour {
    id: string
    name: string
    platform: string
    link: string
    platform_product_details: PlatformProductDetails
    is_recommended: boolean | null
    is_personally_recommended?: boolean | null
    personal_recommendation_reason?: string | null
    // Internal-only enrichment from /experience/{id}/tours/ for rimigo_internal callers.
    mapping_id?: string | null
    visibility_info?: MappingVisibilityInfo | null
    recommendation_info?: MappingRecommendationInfo | null
}

export interface ToursResponseType {
    experience_id: string
    tours: Tour[]
    total: number
    cache_key?: string | null
    live_data_status?: string | null
}

export interface AdaptedTourResponseType {
    id: string
    name: string | null
    platform_name: string
    is_recommended: boolean | null
    is_personally_recommended: boolean | null
    personal_recommendation_reason: string | null
    duration: {
        min_duration: number | string
        max_duration: number | string
        unit: string | null
    }
    rating: number | null
    link: string | null
    price: {
        min_price: number | null
        max_price: number | null
        currency: string | null
        price_type: string | null
    }
    cancellation_policy: string | null
    // Internal-only mapping metadata. Pass-through from API; absent for non-rimigo_internal callers.
    mapping_id?: string | null
    visibility_info?: MappingVisibilityInfo | null
    recommendation_info?: MappingRecommendationInfo | null
}

// Types for tour data status polling
export interface TourLiveDataPrice {
    status?: 'not_available'
    min_price?: number
    max_price?: number
    currency?: string
}

export interface TourLiveDataDuration {
    start_duration: number
    end_duration: number
    unit: string
}

export interface TourLiveDataRating {
    rating: number
    reviews: number
}

export interface TourLiveDataItem {
    price: TourLiveDataPrice | null
    duration: TourLiveDataDuration | null
    rating: TourLiveDataRating | null
}

export interface TourDataStatusResponse {
    status: 'queued' | 'completed' | 'failed' | 'in_progress'
    cache_key: string
    data: Record<string, TourLiveDataItem>
}
