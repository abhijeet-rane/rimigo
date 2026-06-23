/**
 * Example Usage of Generic AIAssistantWindow Component
 *
 * This file demonstrates how to use the refactored AIAssistantWindow
 * component with different assistant types.
 */

import { useState } from 'react'
import AIAssistantWindow from './AIAssistantWindow'
import { HotelSearchInputData } from './types/assistantTypes'

// ============================================
// EXAMPLE 1: Hotel Smart Search (Current Implementation)
// ============================================

export function StaysPage() {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false)

    // Prepare hotel search input data
    const hotelInputData: HotelSearchInputData = {
        cityName: 'Paris',
        selectedCityId: '67a31eca3a326523de0232c8',
        groupType: 'family',
        travelPurpose: 'leisure',
        checkIn: '2025-03-15',
        checkOut: '2025-03-20',
        cityPreferences: ['Eiffel Tower', 'Louvre']
    }

    const handleSendMessage = (message: string) => {
        console.debug('Message sent:', message)
        // Optional: Handle any custom logic after message is sent
    }

    return (
        <div>
            <button onClick={() => setIsAssistantOpen(true)}>Open AI Assistant</button>

            <AIAssistantWindow
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                ataId="68fb4e6115945877470c1d0e"
                tripId="trip_123"
                assistantType="HotelSmartSearch"
                entityType="city_id"
                entityId="67a31eca3a326523de0232c8"
                inputData={hotelInputData}
                onSendMessage={handleSendMessage}
            />
        </div>
    )
}

// ============================================
// EXAMPLE 2: Future - Experience Search
// ============================================

/*
// First, add ExperienceSearchInputData to assistantTypes.ts:

export interface ExperienceSearchInputData {
    cityId: string
    date: string
    interests: string[]
    priceRange?: { min: number; max: number }
    duration?: string
}

// Add to AssistantInputDataMap:
export type AssistantInputDataMap = {
    HotelSmartSearch: HotelSearchInputData
    ExperienceSearch: ExperienceSearchInputData  // <-- Add this
}

// Add to ASSISTANT_CONFIG_MAP:
ExperienceSearch: {
    space: 'experiences_list_paris',
    placeholder: 'Describe your ideal experience',
    title: 'Find experiences\nthat excite you',
    subtitle: 'Try something like:',
    examples: [
        'Show me food tours with wine tasting in historic districts',
        'I want outdoor adventures like kayaking and hiking',
        'Find art workshops and cultural experiences'
    ]
}

// Add to transformInputDataToAPIPayload switch:
case 'ExperienceSearch': {
    const expData = inputData as ExperienceSearchInputData
    return {
        city_id: expData.cityId,
        date: expData.date,
        interests: expData.interests,
        user_text_input: userTextInput,
        price_range: expData.priceRange,
        duration: expData.duration
    }
}

// Then use it like this:

function ExperiencesPage() {
    const experienceInputData: ExperienceSearchInputData = {
        cityId: '67a31eca3a326523de0232c8',
        date: '2025-03-15',
        interests: ['food', 'culture', 'adventure'],
        priceRange: { min: 50, max: 200 },
        duration: 'half_day'
    }

    return (
        <AIAssistantWindow
            isOpen={true}
            onClose={() => {}}
            ataId="experience_ata_id"
            tripId="trip_123"
            assistantType="ExperienceSearch"  // <-- Different type
            inputData={experienceInputData}   // <-- Different data structure
            onSendMessage={(msg) => console.log(msg)}
        />
    )
}
*/

// ============================================
// EXAMPLE 3: Future - Restaurant Search
// ============================================

/*
export interface RestaurantSearchInputData {
    cityId: string
    date: string
    time: string
    cuisine: string[]
    dietaryRestrictions?: string[]
    priceLevel?: 'budget' | 'moderate' | 'upscale' | 'fine_dining'
}

// Add configuration and transformer, then use:

function RestaurantsPage() {
    const restaurantInputData: RestaurantSearchInputData = {
        cityId: '67a31eca3a326523de0232c8',
        date: '2025-03-15',
        time: '19:00',
        cuisine: ['French', 'Italian'],
        dietaryRestrictions: ['vegetarian'],
        priceLevel: 'moderate'
    }

    return (
        <AIAssistantWindow
            isOpen={true}
            onClose={() => {}}
            ataId="restaurant_ata_id"
            tripId="trip_123"
            assistantType="RestaurantSearch"
            inputData={restaurantInputData}
            onSendMessage={(msg) => console.log(msg)}
        />
    )
}
*/

export {}
