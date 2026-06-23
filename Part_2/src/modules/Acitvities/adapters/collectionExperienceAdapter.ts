import { CollectionExperienceMapping } from '../api/collectionsAPI'
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
    if (!categories || categories.length === 0) return null
    const firstCategory = categories[0]
    return CATEGORY_MAP[firstCategory as keyof typeof CATEGORY_MAP]
}

/**
 * Adapts collection experience mapping to UI-friendly ExperienceCardData format
 */
export const adaptCollectionExperienceToUI = (experience: CollectionExperienceMapping): ExperienceCardData => {
    // Format the title from name
    const formattedTitle = formatIdentifierToTitle(experience.name)

    // Get first category as backend value for preference mapping
    const firstCategory = experience.categories && experience.categories.length > 0 ? experience.categories[0] : null

    // Get category icon using static mapping
    const categoryIcon = getCategoryIcon(firstCategory ?? null)

    // Build images array from landscape_image and verified_photos
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
        title: formattedTitle,
        name: experience.name,
        identifier: experience.identifier,
        city_name: experience.city_name || '',
        city_id: experience.city_id || '',
        price: {
            lower_bound: experience.price?.lower_bound ?? null,
            upper_bound: experience.price?.upper_bound ?? null,
            currency: experience.price?.currency ?? null
        },
        image: landscapeImage,
        images: images.length > 0 ? images : undefined,
        short_description: experience.short_description ?? null,
        category: formatCategoriesToTitle(experience.categories ?? []),
        categoryBackendValue: firstCategory ?? null,
        categories: experience.categories ?? null,
        categoryIcon: categoryIcon ?? null
    }
}

