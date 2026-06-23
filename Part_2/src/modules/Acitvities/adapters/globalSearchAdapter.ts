import type { SearchResultUnion } from '../types/searchTypes'
import type { WhereModalSectionItem } from '@/components/common/SearchBar/modals/WhereModal'

/**
 * Adapter to map global search API response to frontend format
 * Includes image URLs for display in search dropdown
 */

/**
 * Map experience result to WhereModalSectionItem with portrait_image
 */
export const mapExperienceToSectionItem = (result: Extract<SearchResultUnion, { type: 'experience' }>): WhereModalSectionItem | null => {
    if (result.type !== 'experience') {
        return null
    }

    // Build subtitle with city and country info
    const locationParts: string[] = []
    if (result.city_name) locationParts.push(result.city_name)
    if (result.country_name) locationParts.push(result.country_name)
    const subtitle = locationParts.length > 0 ? locationParts.join(', ') : 'Attraction'

    return {
        id: result.id,
        title: result.name,
        subtitle,
        type: 'experience',
        meta: {
            identifier: result.identifier,
            imageUrl: result.portrait_image // Use portrait_image for experiences
        },
        raw: result
    }
}

/**
 * Map country result to WhereModalSectionItem with image_url
 */
export const mapCountryToSectionItem = (result: Extract<SearchResultUnion, { type: 'location_country' }>): WhereModalSectionItem | null => {
    if (result.type !== 'location_country') {
        return null
    }

    return {
        id: result.country_id,
        title: result.country_name,
        subtitle: 'Country',
        type: 'location_country',
        meta: {
            countryId: result.country_id,
            countryName: result.country_name,
            imageUrl: result.image_url, // Use image_url for countries
            is_live: result.is_live
        },
        raw: result
    }
}

/**
 * Map city result to WhereModalSectionItem with image_url
 */
export const mapCityToSectionItem = (result: Extract<SearchResultUnion, { type: 'location_city' }>): WhereModalSectionItem | null => {
    if (result.type !== 'location_city') {
        return null
    }

    return {
        id: result.city_id,
        title: result.city_name,
        subtitle: 'City',
        type: 'location_city',
        meta: {
            cityId: result.city_id,
            cityName: result.city_name,
            imageUrl: result.image_url // Use image_url for cities
        },
        raw: result
    }
}
