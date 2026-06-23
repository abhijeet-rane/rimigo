import { Collection, Creator } from '@/components/Collection/types'
import { CollectionExperiencesResponse, CollectionExperience, CollectionSource, SourceMetadata } from '../api/collectionsAPI'
import { getCategoryIcon } from '../utils/categoryIconMapper'

/**
 * Capitalize first letter of each word for category display
 */
const formatCategory = (category: string): string => {
    return category
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

/**
 * Get primary category from experience categories array
 */
const getPrimaryCategory = (categories: string[]): string => {
    if (!categories || categories.length === 0) return 'Experience'
    // Use the first category, formatted nicely
    return formatCategory(categories[0])
}

/**
 * Capitalize first letter of month name
 */
const capitalizeMonth = (month: string): string => {
    if (!month) return ''
    return month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()
}

/**
 * Transform source to Creator type
 */
export const adaptSourceToCreator = (source: CollectionSource, sourceMetadata?: SourceMetadata | null): Creator => {
    // Extract Instagram handle from profile URL if available
    const instagramHandle = source.media?.instagram_profile_url
        ? `@${source.media.instagram_profile_url.split('/').filter(Boolean).pop() || ''}`
        : `@${source.name.toLowerCase().replace(/\s+/g, '')}`

    // Get last visited info from metadata (handle null or empty object)
    const lastVisitedMonth = sourceMetadata?.last_visited_month ? capitalizeMonth(sourceMetadata.last_visited_month) : ''
    const lastVisitedYear = sourceMetadata?.last_visited_year || ''

    const firstName = source.entity_name?.split(' ')[0] ?? ''

    return {
        id: source.id,
        name: firstName ?? source.name ?? '',
        handle: instagramHandle,
        profileImage: source.media?.thumbnail_url,
        instagramFollowers: '', // API doesn't provide follower count
        lastVisited: {
            location: '', // API doesn't provide location
            month: lastVisitedMonth,
            year: lastVisitedYear ? parseInt(lastVisitedYear, 10) : null
        }
    }
}

/**
 * Transform API response to Collection type
 */
export const adaptCollectionExperiencesToCollections = (apiResponse: CollectionExperiencesResponse): Collection[] => {
    if (!apiResponse || !apiResponse.data || apiResponse.data.length === 0) {
        return []
    }

    return apiResponse.data
        .filter((collection) => collection.experiences && collection.experiences.length > 0)
        .map((collection) => {
            // Transform experiences to collection items (take first 4)
            const items = collection.experiences
                .filter((experience) => experience.experience_id !== null) // Filter out null experience_ids
                .slice(0, 4)
                .map((experience: CollectionExperience) => {
                    const firstCategory = experience.categories && experience.categories.length > 0 ? experience.categories[0] : null
                    const categoryIcon = getCategoryIcon(firstCategory ?? null)

                    return {
                        id: experience.experience_id!,
                        image: experience.display_props?.landscape_image || '',
                        category: getPrimaryCategory(experience.categories || []),
                        categoryIcon: categoryIcon
                    }
                })

            // Create collection object
            const collectionData: Collection = {
                id: collection.id,
                title: collection.name,
                items
            }

            // If source is provided, map it to creator with metadata
            if (collection.source) {
                collectionData.creator = adaptSourceToCreator(collection.source, collection.source_metadata || undefined)
            }

            return collectionData
        })
}
