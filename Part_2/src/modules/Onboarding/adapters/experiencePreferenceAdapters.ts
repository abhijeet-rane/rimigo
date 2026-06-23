// API Response Type
export type ExperiencePreferenceAPIResponse = {
    id: number
    backendValue: string
    image: string
    title: string
    description: string
    country: string
}

// UI Type
export type ExperiencePreferenceUI = {
    id: number
    labelUi: string
    backendValue: string
    description: string
    imageSrc: string
    type: 'day' | 'month'
}

// Adapter function to transform API response to UI format
export const adaptExperiencePreferenceToUI = (apiResponse: ExperiencePreferenceAPIResponse[]): ExperiencePreferenceUI[] => {
    return apiResponse.map((item) => ({
        id: item.id,
        labelUi: item.title,
        backendValue: item.backendValue,
        description: item.description,
        imageSrc: item.image,
        type: 'day' as const // Default to 'day' type, can be customized based on business logic
    }))
}

// Fallback constants when API fails or returns empty
export const FALLBACK_EXPERIENCE_PREFERENCES: ExperiencePreferenceUI[] = [
    {
        id: 2,
        labelUi: 'Cultural Venues',
        backendValue: 'cultural',
        description: 'Explore artistic expressions that capture the essence of our community',
        imageSrc: 'https://media.rimigo.com/1764777642405_d1e91040bf995ddfb46afff11e149b10.png',
        type: 'day'
    },
    {
        id: 3,
        labelUi: 'Nature & Wildlife',
        backendValue: 'nature',
        description: 'Connect with the natural world through immersive outdoor experiences',
        imageSrc: 'https://media.rimigo.com/1764777646424_dc1fe036afb55bd0a0015154a5833276.png',
        type: 'day'
    },
    {
        id: 4,
        labelUi: 'Food Tours',
        backendValue: 'food_tour',
        description: 'Savor the flavors of local cuisine through guided culinary adventures',
        imageSrc: 'https://media.rimigo.com/1764777643833_f83d4d9436a65fb79f8a1676deb3d394.png',
        type: 'day'
    },
    {
        id: 5,
        labelUi: 'Scenic Adventures',
        backendValue: 'scenic_adventure',
        description: 'Embark on breathtaking journeys through stunning landscapes and vistas',
        imageSrc: 'https://media.rimigo.com/1764777647705_6a5b2538bbde5c3fa4dab53b136c9af9.png',
        type: 'day'
    },
    // ---- New additions below ----
    {
        id: 6,
        labelUi: 'Observation Decks',
        backendValue: 'observation_decks',
        description: 'Enjoy observation decks and panoramic views',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-observationdecks.png',
        type: 'day'
    },
    {
        id: 7,
        labelUi: 'Museums',
        backendValue: 'museums',
        description: 'Enjoy museums and cultural heritage',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-museum.png',
        type: 'day'
    },
    {
        id: 8,
        labelUi: 'Adventure',
        backendValue: 'adventure',
        description: 'Enjoy adventure and adrenaline',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-adventure.png',
        type: 'day'
    },
    {
        id: 9,
        labelUi: 'Entertainment',
        backendValue: 'entertainment',
        description: 'Enjoy entertainment and shows',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-entertainment.png',
        type: 'day'
    },
    {
        id: 10,
        labelUi: 'Mountain Adventures',
        backendValue: 'mountain_top_excursion',
        description: 'Visit mountains and enjoy panoramic views',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-excursion.png',
        type: 'day'
    },
    {
        id: 11,
        labelUi: 'Epic Train Journeys',
        backendValue: 'scenic_train',
        description: 'Ride scenic trains with breathtaking landscapes',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-scenictrains.png',
        type: 'day'
    },
    {
        id: 12,
        labelUi: 'Historic Sites & Attractions',
        backendValue: 'landmarks',
        description: 'Explore iconic landmarks and cultural monuments',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-landmarks.png',
        type: 'day'
    },
    {
        id: 13,
        labelUi: 'Old Town Tour',
        backendValue: 'old_town_tour',
        description: 'Wander through historic and cultural neighborhoods',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-oldtowntour.png',
        type: 'day'
    },
    {
        id: 14,
        labelUi: 'Cruises & Boat Rides',
        backendValue: 'river_cruise',
        description: 'Take boat tours through scenic waterways',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-cruise.png',
        type: 'day'
    },
    {
        id: 15,
        labelUi: 'Theme Parks',
        backendValue: 'theme_parks',
        description: 'Explore unique and immersive theme parks',
        imageSrc: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-themepark.png',
        type: 'day'
    }
]

// Utility function to get experience preferences with fallback
export const getExperiencePreferencesWithFallback = async (
    apiCall: () => Promise<ExperiencePreferenceAPIResponse[]>
): Promise<ExperiencePreferenceUI[]> => {
    try {
        const apiResponse = await apiCall()

        // Check if API returned empty array or null/undefined
        if (!apiResponse || apiResponse.length === 0) {
            return FALLBACK_EXPERIENCE_PREFERENCES
        }

        // Transform API response to UI format
        return adaptExperiencePreferenceToUI(apiResponse)
    } catch (e) {
        return FALLBACK_EXPERIENCE_PREFERENCES
    }
}
