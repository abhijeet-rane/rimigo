import { CountryExploreExperience } from '@/modules/Experiences/types/experienceType'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { formatIdentifierToTitle } from '../utils/textUtils'
import { getCategoryIcon } from '../utils/categoryIconMapper'

const CATEGORY_MAP = {
    adventure: 'Adventure',
    entertainment: 'Entertainment center',
    mountain_top_excursion: 'Mountain Top Excursion',
    food_tour: 'Food Tour',
    scenic_train: 'Scenic Train',
    scenic_adventure: 'Scenic Adventure',
    landmarks: 'Landmark',
    old_town_tour: 'Old Town Tour',
    river_cruise: 'River Cruise',
    theme_parks: 'Theme Park',
    nature: 'Nature',
    shopping: 'Shopping',
    architecture: 'Architecture',
    cultural: 'Cultural place',
    museums: 'Museum',
    nightlife: 'Nightlife',
    observation_decks: 'Observation Deck',
    religious: 'Religious place',
    luxury: 'Luxury place'
}

const formatCategoriesToTitle = (categories: string[] | null) => {
    if (!categories) return null

    // get first category
    const firstCategory = categories[0]
    return CATEGORY_MAP[firstCategory as keyof typeof CATEGORY_MAP]
}

/**
 * Adapts country experience to UI-friendly ActivityCardData format for Activities module
 * This is similar to adaptCountryExperienceToUI but with Activities-specific formatting
 */
export const adaptActivitiesCountryExperienceToUI = (experience: CountryExploreExperience): ExperienceCardData => {
    // Format the title from identifier or name
    const rawTitle = experience.identifier ?? experience.name
    const formattedTitle = formatIdentifierToTitle(rawTitle)

    // Get first category as backend value for preference mapping
    const firstCategory = experience.categories && experience.categories.length > 0 ? experience.categories[0] : null

    // Get category icon using static mapping (works even without preferences loaded)
    const categoryIcon = getCategoryIcon(firstCategory ?? null)

    // Build images array from verified_photos and landscape_image
    // Priority: landscape_image first (as primary), then verified_photos
    const landscapeImage = experience.display_props?.landscape_image || ''
    const verifiedPhotoUrls = experience.verified_photos?.map((photo) => photo.url).filter(Boolean) || []

    // Combine images: landscape_image first, then verified_photos (excluding duplicates)
    const images: string[] = []
    if (landscapeImage) {
        images.push(landscapeImage)
    }
    // Add verified photos that aren't already included
    verifiedPhotoUrls.forEach((url) => {
        if (url && !images.includes(url)) {
            images.push(url)
        }
    })

    return {
        id: experience.id,
        suggestion_priority: experience.suggestion_priority ?? null,
        title: formattedTitle, // Formatted title for display
        name: experience.name, // Original name for list pages
        identifier: experience.identifier, // Original identifier for top activities
        city_name: experience.city_name,
        city_id: experience.city_id,
        price: {
            lower_bound: experience.price?.lower_bound ?? null,
            upper_bound: experience.price?.upper_bound ?? null,
            currency: experience.price?.currency ?? null
        },
        image: landscapeImage, // Keep for backward compatibility
        images: images.length > 0 ? images : undefined, // New images array for carousel
        short_description: experience.short_description ?? null,
        category: formatCategoriesToTitle(experience.categories ?? []),
        categoryBackendValue: firstCategory ?? null,
        categories: experience.categories ?? null, // All categories for tags
        categoryIcon: categoryIcon ?? null // Add icon directly in adapter
    }
}
