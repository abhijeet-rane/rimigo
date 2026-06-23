import { ExperiencesApiResponse, ExperienceApiItem, CountryExploreExperience, CategoryExperienceItem } from '../types/experienceType'
import { Experience } from '@/pages/Experiences/components/ExperienceCard'
import { ExperienceCardData } from '../types/experienceCardTypes'
import type {
    CuratedExperienceItem,
    CuratedExperiencesResponse,
    CityCuratedExperiencesApiResponse,
    CountryCuratedExperiencesApiResponse
} from '../types/curatedExperienceType'
import { getCategoryIcon } from '@/modules/Acitvities/utils/categoryIconMapper'

/**
 * Adapts experience API item to UI-friendly Experience format
 */
export const adaptExperienceToUI = (experience: ExperienceApiItem): Experience => {
    return {
        id: experience.id,
        title: experience.display_props.name || experience.name,
        location: experience.base_city.name,
        rating: 4.5, // Default rating as API doesn't provide it
        price: experience.price.lower_bound.toString(),
        image: experience.display_props.portrait_image || experience.display_props.landscape_image,
        isLiked: false,
        isUploaded: false
    }
}

/**
 * Adapts category-list experience to UI-friendly Experience format
 * This is for experiences from the category-list API which has a different structure
 */
export const adaptCategoryExperienceToUI = (experience: CategoryExperienceItem): Experience => {
    return {
        id: experience.id,
        title: experience.display_props?.name || experience.name || '',
        location: 'Japan', // Default location since category-list doesn't provide city info
        rating: 4.5, // Default rating as API doesn't provide it
        price: (experience.price?.lower_bound || 0).toString(),
        image: experience.display_props?.portrait_image || experience.display_props?.landscape_image || experience.display_image || '',
        isLiked: false,
        isUploaded: false
    }
}

/**
 * Adapts new country experiences API response to UI-friendly ExperienceCardData format
 * This is for experiences from the new /curation/experiences/explore/<country_id>/country/ endpoint
 */
export const adaptCountryExperienceToUI = (experience: CountryExploreExperience): ExperienceCardData => {
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
        title: experience.name ?? experience.identifier, // Formatted title for display
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
        category: null, // Will be set by activities adapter if needed
        categoryBackendValue: firstCategory ?? null,
        categories: experience.categories ?? null, // All categories for tags
        categoryIcon: categoryIcon ?? null // Add icon directly in adapter
    }
}

export const adaptCuratedExperienceToUI = (experience: CuratedExperienceItem): ExperienceCardData => {
    const landscapeImage = experience.display_props?.landscape_image || ''

    // Create images array: landscape_image first, then verified_photos
    // This matches the pattern used in other adapters where images[0] is landscape_image
    // and images[1+] are verified_photos
    const images: string[] = []
    if (landscapeImage) {
        images.push(landscapeImage)
    }
    // Add verified photos after landscape image
    if (experience.verified_photos && experience.verified_photos.length > 0) {
        experience.verified_photos.forEach((photo) => {
            if (photo.url) {
                images.push(photo.url)
            }
        })
    }

    // Get first category for backward compatibility
    const firstCategory = experience.categories && experience.categories.length > 0 ? experience.categories[0] : null

    // Get category icon using static mapping (works even without preferences loaded)
    const categoryIcon = getCategoryIcon(firstCategory ?? null)

    return {
        id: experience.id,
        name: experience.name, // Add name field for ListCard
        identifier: experience.identifier ?? undefined, // Add identifier if available
        suggestion_priority: experience.suggestion_priority ?? null,
        title: experience.name,
        city_name: experience.city_name,
        city_id: experience.city_id,
        price: {
            lower_bound: experience.price?.lower_bound ?? null,
            upper_bound: experience.price?.upper_bound ?? null,
            currency: experience.price?.currency ?? null
        },
        image: landscapeImage, // Keep for backward compatibility
        images: images.length > 0 ? images : undefined, // Array for carousel support
        experience_recommended: experience.experience_recommended ?? null,
        reason_of_suggestion: experience.reason_of_suggestion ?? [],
        short_description: experience.short_description ?? null,
        category: null, // Will be set by activities adapter if needed
        categoryBackendValue: firstCategory ?? null, // Set first category as backend value
        categories: experience.categories && experience.categories.length > 0 ? experience.categories : null, // All categories for tags
        categoryIcon: categoryIcon ?? null // Add icon directly in adapter
    }
}

/**
 * Adapts the concierge `present_options` experience `card_data` (the backend
 * `ExperienceSmartSearchResponseSerializer` shape) into the UI `ExperienceCardData`.
 * That serializer payload is field-compatible with `CuratedExperienceItem`, so we
 * reuse `adaptCuratedExperienceToUI` rather than duplicate the mapping.
 */
export const adaptConciergeExperienceCardData = (cardData: Record<string, unknown>): ExperienceCardData =>
    adaptCuratedExperienceToUI(cardData as unknown as CuratedExperienceItem)

/**
 * Adapts full API response to array of UI experiences
 */
export const adaptExperiencesResponse = (response: ExperiencesApiResponse): Experience[] => {
    return response.results.map(adaptExperienceToUI)
}

/**
 * Gets pagination info from API response
 */
export const getPaginationInfo = (response: ExperiencesApiResponse) => {
    return {
        total: response.total,
        page: response.page,
        limit: response.limit,
        hasMore: response.has_more,
        totalPages: Math.ceil(response.total / response.limit)
    }
}

/**
 * Adapts raw API response (city or country) to normalized CuratedExperiencesResponse format
 * This adapter handles the difference between city-based and country-based API responses
 * Also handles wrapped responses (with message, response_code, data)
 */
export const adaptCuratedExperiencesResponse = (
    apiResponse:
        | CityCuratedExperiencesApiResponse
        | CountryCuratedExperiencesApiResponse
        | { data: CityCuratedExperiencesApiResponse | CountryCuratedExperiencesApiResponse; message?: string; response_code?: string }
): CuratedExperiencesResponse => {
    // Extract data if response is wrapped (has 'data' property and 'message' or 'response_code')
    const isWrapped = 'data' in apiResponse && ('message' in apiResponse || 'response_code' in apiResponse)
    const response = isWrapped
        ? (apiResponse as { data: CityCuratedExperiencesApiResponse | CountryCuratedExperiencesApiResponse }).data
        : (apiResponse as CityCuratedExperiencesApiResponse | CountryCuratedExperiencesApiResponse)

    // Check if it's a city-based response
    if ('city_id' in response && 'city_name' in response) {
        return {
            city_id: response.city_id,
            city_name: response.city_name,
            country_id: null,
            country_name: null,
            total_experiences: response.total_experiences,
            page: response.page,
            limit: response.limit,
            total_pages: response.total_pages,
            experiences: response.data
        }
    }

    // Otherwise it's a country-based response
    return {
        country_id: response.country_id,
        country_name: response.country_name,
        city_id: null,
        city_name: null,
        total_experiences: response.total_experiences,
        page: response.page,
        limit: response.limit,
        total_pages: response.total_pages,
        experiences: response.experiences
    }
}
