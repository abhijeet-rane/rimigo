/**
 * AI Assistant Types and Configurations
 */

// Assistant types that can be used across the app
export type AssistantType = 'HotelSmartSearch' | 'ExperienceExpertChat' | 'HotelExpertChat' | 'BurjKhalifaExpertChat' | 'ItineraryExpertChat' // Add more types as needed: | 'ExperienceSearch' | 'RestaurantSearch'

/**
 * Input data interface for Hotel Smart Search
 */
export interface HotelSearchInputData {
    cityName?: string
    selectedCityId?: string
    groupType?: string
    travelPurpose?: string
    checkIn?: string
    checkOut?: string
    cityPreferences?: string[]
    budgetRange?: {
        min?: number
        max?: number
    }
    adults?: number
    children?: number
    infants?: number
    children_age?: number[]
}

export interface ExperienceExpertChatInputData {
    experienceId?: string
    experienceName?: string
}

export interface HotelExpertChatInputData {
    zentrumHubId?: string
    hotelName?: string
}

/**
 * Add more input data interfaces for other assistant types here
 *
 * Example:
 * export interface ExperienceSearchInputData {
 *     cityId?: string
 *     date?: string
 *     interests?: string[]
 *     priceRange?: { min: number; max: number }
 * }
 */

export interface BurjKhalifaExpertChatInputData {
    burj_khalifa_deck_level?: string
    burj_khalifa_timing?: string
}

// itinerary expert chat input data
export interface ItineraryExpertChatInputData {
    trip_id?: string
}

/**
 * Map assistant types to their input data interfaces
 */
export type AssistantInputDataMap = {
    HotelSmartSearch: HotelSearchInputData
    ExperienceExpertChat: ExperienceExpertChatInputData
    HotelExpertChat: HotelExpertChatInputData
    BurjKhalifaExpertChat: BurjKhalifaExpertChatInputData
    ItineraryExpertChat: ItineraryExpertChatInputData
    // Add more mappings as you add assistant types:
    // ExperienceSearch: ExperienceSearchInputData
    // RestaurantSearch: RestaurantSearchInputData
}

/**
 * Configuration for each assistant type
 */
export interface AssistantTypeConfig {
    space: string // API space identifier
    placeholder?: string
    examples?: string[]
    title?: string
    subtitle?: string
    /** When true, full-generation progress shows an inline ContextLoader instead of PollingInteractionLoader */
    useInlineLoader?: boolean
    /** Page source for unified agent routing (e.g. stay_listing, stay_details, experience_details) */
    source?: string
}

/**
 * Map assistant types to their configurations
 */
export const ASSISTANT_CONFIG_MAP: Record<AssistantType, AssistantTypeConfig> = {
    HotelSmartSearch: {
        space: 'stays_list_paris',
        source: 'stay_listing',
        placeholder: 'Describe your ideal stay',
        title: 'Describe your stay the\nway you want',
        subtitle: 'Try something like:',
        examples: [
            'Show me a boutique hotel in the Old Town with river views, tram access, and nearby historic cathedrals for my perfect stay',
            'I need an adults-only rooftop hotel in the Arts District with skyline views, cocktail bar, and walking distance to galleries',
            'Recommend a family-friendly lakeside hotel in the Green Belt with playground, boat rentals, and scenic bike trail access',
            'I want a boutique vineyard hotel in the Wine Valley with vineyard tours, on-site winery, and beautiful sunset terrace views'
        ]
    },
    ExperienceExpertChat: {
        space: 'experiences_details',
        source: 'experience_details',
        placeholder: 'Ask anything about this experience',
        title: 'Ask anything about this experience',
        subtitle: 'Try something like:',
        examples: ['What is the best time to visit?', 'Is it suitable for families with children?', 'Tips for visiting?']
    },
    HotelExpertChat: {
        space: 'stays_details',
        source: 'stay_details',
        placeholder: 'Ask anything about this hotel',
        title: 'Ask anything about this hotel',
        subtitle: 'Try something like:',
        examples: ['Is the area safe and walkable at night?', 'How far is the metro from this hotel?', 'Do higher floors have better views?']
    },
    BurjKhalifaExpertChat: {
        space: 'burj_khalifa_details',
        placeholder: 'Ask anything about this experience',
        title: 'Ask anything about this experience',
        subtitle: 'Try something like:',
        examples: ['What is the best time to visit?', 'Is it suitable for families with children?', 'Tips for visiting?']
    },
    ItineraryExpertChat: {
        space: 'itinerary_details',
        placeholder: 'Edit anything in your itinerary',
        title: 'Your Itinerary Expert',
        subtitle: 'Try something like:',
        useInlineLoader: true,
        examples: [
            'Suggest alternatives for the temple visit on day 2',
            'Day 3 looks too hectic, can you recreate it?',
            'Are there Indian restaurants near my hotel in Kyoto?',
            'When is Disneyland scheduled in my trip?'
        ]
    }
    // Add more configs as you add assistant types
}

/*
Get assistant type from identifier
*/
export function getAssistantTypeFromIdentifier(identifier: string): AssistantType {
    switch (identifier) {
        case 'burj_khalifa_recommendation':
            return 'BurjKhalifaExpertChat'
        default:
            throw new Error(`Unknown assistant type identifier: ${identifier}`)
    }
}

/**
 * Transform input data to API payload based on assistant type
 */
export function transformInputDataToAPIPayload(
    assistantType: AssistantType,
    inputData: AssistantInputDataMap[AssistantType],
    userTextInput: string,
    featureToUse: string | null
): Record<string, any> {
    switch (assistantType) {
        case 'HotelSmartSearch': {
            const hotelData = inputData as HotelSearchInputData
            return {
                city_id: hotelData.selectedCityId,
                city_name: hotelData.cityName,
                check_in: hotelData.checkIn,
                check_out: hotelData.checkOut,
                group_type: hotelData.groupType,
                purpose_type: hotelData.travelPurpose,
                user_text_input: userTextInput,
                location_preference: hotelData.cityPreferences && hotelData.cityPreferences.length > 0 ? hotelData.cityPreferences[0] : undefined,
                budget_range: hotelData.budgetRange
            }
        }
        case 'ExperienceExpertChat': {
            const experienceData = inputData as ExperienceExpertChatInputData
            return {
                experience_id: experienceData.experienceId,
                question: userTextInput
            }
        }
        case 'HotelExpertChat': {
            const data = inputData as HotelExpertChatInputData
            return {
                zentrum_hub_id: data.zentrumHubId,
                question: userTextInput
            }
        }
        case 'BurjKhalifaExpertChat': {
            const data = inputData as BurjKhalifaExpertChatInputData
            switch (featureToUse) {
                case 'burj_khalifa_recommendation': {
                    return {
                        user_text_input: userTextInput,
                        feature_identifier: 'burj_khalifa_recommendation',
                        data: {
                            preferences: {
                                burj_khalifa_deck_level: data.burj_khalifa_deck_level,
                                burj_khalifa_timing: data.burj_khalifa_timing
                            }
                        }
                    }
                }
                default:
                    throw new Error(`Unknown feature identifier: ${featureToUse ?? 'null'}`)
            }
        }
        case 'ItineraryExpertChat': {
            const data = inputData as ItineraryExpertChatInputData
            return {
                trip_id: data.trip_id,
                user_text_input: userTextInput
            }
        }
        // Add more cases as you add assistant types
        default:
            throw new Error(`Unknown assistant type: ${assistantType}`)
    }
}

/**
 * Validate input data based on assistant type
 */
export function validateInputData(assistantType: AssistantType, inputData: AssistantInputDataMap[AssistantType]): { valid: boolean; error?: string } {
    switch (assistantType) {
        case 'HotelSmartSearch': {
            const hotelData = inputData as HotelSearchInputData

            if (!hotelData.selectedCityId) {
                return { valid: false, error: 'Please select a city' }
            }
            if (!hotelData.groupType) {
                return { valid: false, error: 'Please select group type' }
            }
            if (!hotelData.travelPurpose) {
                return { valid: false, error: 'Please select travel purpose' }
            }
            if (!hotelData.checkIn || !hotelData.checkOut) {
                return { valid: false, error: 'Please select check-in and check-out dates' }
            }

            return { valid: true }
        }
        case 'ExperienceExpertChat': {
            const data = inputData as ExperienceExpertChatInputData
            if (!data.experienceId) {
                return { valid: false, error: 'Missing experience id' }
            }
            return { valid: true }
        }
        case 'HotelExpertChat': {
            const data = inputData as HotelExpertChatInputData
            if (!data.zentrumHubId) {
                return { valid: false, error: 'Missing hotel id' }
            }
            return { valid: true }
        }
        case 'ItineraryExpertChat': {
            const data = inputData as ItineraryExpertChatInputData
            if (!data.trip_id) {
                return { valid: false, error: 'Missing trip id' }
            }
            return { valid: true }
        }
        // Add more cases as you add assistant types
        default:
            return { valid: false, error: `Unknown assistant type: ${assistantType}` }
    }
}
