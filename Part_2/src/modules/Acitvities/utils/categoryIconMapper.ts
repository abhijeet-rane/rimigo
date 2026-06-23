import type { ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { FALLBACK_EXPERIENCE_PREFERENCES } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'

/**
 * Static mapping of category backend values to their icon URLs
 * This is based on the fallback experience preferences and ensures icons are available
 * even when preferences API is not loaded
 */
const STATIC_CATEGORY_ICON_MAP: Record<string, string> = {
    cultural: 'https://media.rimigo.com/1764777642405_d1e91040bf995ddfb46afff11e149b10.png',
    nature: 'https://media.rimigo.com/1764777646424_dc1fe036afb55bd0a0015154a5833276.png',
    food_tour: 'https://media.rimigo.com/1764777643833_f83d4d9436a65fb79f8a1676deb3d394.png',
    scenic_adventure: 'https://media.rimigo.com/1764777647705_6a5b2538bbde5c3fa4dab53b136c9af9.png',
    observation_decks: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-observationdecks.png',
    museums: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-museum.png',
    adventure: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-adventure.png',
    entertainment: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-entertainment.png',
    mountain_top_excursion: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-excursion.png',
    scenic_train: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-scenictrains.png',
    landmarks: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-landmarks.png',
    old_town_tour: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-oldtowntour.png',
    river_cruise: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-cruise.png',
    theme_parks: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/common-activity-prefs/common-themepark.png',
    shopping: '',
    luxury: '',
    religious: ''

    // need to add for shopping
}

/**
 * Gets the icon URL for a category backend value
 * First tries the static map, then falls back to preference metadata if available
 *
 * @param categoryBackendValue - The backend value of the category (e.g., 'nature', 'museums')
 * @param preferenceMetadataMap - Optional map created by createCategoryIconMap (for dynamic preferences)
 * @returns The icon URL if found, undefined otherwise
 */
export const getCategoryIcon = (
    categoryBackendValue: string | null | undefined,
    preferenceMetadataMap?: Record<string, { label: string; icon?: string }>
): string | undefined => {
    if (!categoryBackendValue) return undefined

    // First try static map (always available)
    if (STATIC_CATEGORY_ICON_MAP[categoryBackendValue]) {
        return STATIC_CATEGORY_ICON_MAP[categoryBackendValue]
    }

    // Fallback to preference metadata map if provided
    if (preferenceMetadataMap && preferenceMetadataMap[categoryBackendValue]?.icon) {
        return preferenceMetadataMap[categoryBackendValue].icon
    }

    return undefined
}

/**
 * Creates a map of category backend values to their preference metadata (label and icon)
 * This is used to map experience categories to their corresponding preference icons
 *
 * @param experiencePreferences - Array of experience preferences from the API
 * @returns A record mapping backend values to { label, icon } objects
 *
 * @example
 * const preferences = [{ backendValue: 'landmarks', labelUi: 'Landmarks', imageSrc: 'icon-url' }]
 * const map = createCategoryIconMap(preferences)
 * // Returns: { 'landmarks': { label: 'Landmarks', icon: 'icon-url' } }
 */
export const createCategoryIconMap = (experiencePreferences?: ExperiencePreferenceUI[]): Record<string, { label: string; icon?: string }> => {
    if (!experiencePreferences) {
        // Return static map as fallback
        return FALLBACK_EXPERIENCE_PREFERENCES.reduce<Record<string, { label: string; icon?: string }>>((acc, preference) => {
            acc[preference.backendValue] = {
                label: preference.labelUi,
                icon: preference.imageSrc
            }
            return acc
        }, {})
    }

    return experiencePreferences.reduce<Record<string, { label: string; icon?: string }>>((acc, preference) => {
        acc[preference.backendValue] = {
            label: preference.labelUi,
            icon: preference.imageSrc
        }
        return acc
    }, {})
}

/**
 * Gets the label for a category backend value from the preference metadata map
 *
 * @param categoryBackendValue - The backend value of the category
 * @param preferenceMetadataMap - The map created by createCategoryIconMap
 * @returns The label if found, undefined otherwise
 */
export const getCategoryLabel = (
    categoryBackendValue: string | null | undefined,
    preferenceMetadataMap: Record<string, { label: string; icon?: string }>
): string | undefined => {
    if (!categoryBackendValue) return undefined
    return preferenceMetadataMap[categoryBackendValue]?.label
}
