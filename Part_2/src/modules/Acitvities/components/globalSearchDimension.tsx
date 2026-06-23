import type { WhereDimensionConfig, WhereDimensionSearchArgs } from '@/components/common/SearchBar'
import { globalSearch } from '../api/searchAPI'
import type { SearchResultUnion } from '../types/searchTypes'
import { mapExperienceToSectionItem, mapCountryToSectionItem } from '../adapters/globalSearchAdapter'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'

/**
 * Shared search function that calls global search API
 * Used by all dimensions to get unified results
 */
const sharedGlobalSearch = async ({ query }: WhereDimensionSearchArgs): Promise<SearchResultUnion[]> => {
    if (!query || !query.trim()) {
        return []
    }

    try {
        const response = await globalSearch(query.trim())
        return response.results || []
    } catch {
        // Silently fail - return empty results on error
        return []
    }
}

/**
 * Creates dimension configurations for experiences and countries
 * Cities are handled separately via customSearchCities in whereConfig
 *
 * @param onExperienceSelect - Callback when experience is selected (navigate immediately)
 * @param onCountrySelect - Callback when country is selected (for custom handling)
 * @returns Array of dimension configs: [experiencesDimension, countriesDimension]
 */
export const createGlobalSearchDimensions = (
    onExperienceSelect?: (result: Extract<SearchResultUnion, { type: 'experience' }>) => void,
    onCountrySelect?: (result: Extract<SearchResultUnion, { type: 'location_country' }>) => void
): WhereDimensionConfig<SearchResultUnion>[] => {
    // Dimension: Experiences
    const experiencesDimension: WhereDimensionConfig<SearchResultUnion> = {
        id: 'experiences',
        label: 'Experiences',
        type: 'experience',
        enabled: true,
        closeOnSelect: true,

        /**
         * Search function: Use global search API and filter to only experiences
         */
        search: async (args) => {
            const allResults = await sharedGlobalSearch(args)
            // Filter to only experience results
            return allResults.filter((result) => result.type === 'experience')
        },

        /**
         * Map experience results for display in dropdown
         * Uses adapter to include portrait_image in meta
         */
        mapItem: (result) => {
            return mapExperienceToSectionItem(result as Extract<SearchResultUnion, { type: 'experience' }>)
        },

        /**
         * Handle experience selection - store selection and allow month/preferences flow
         */
        onSelect: (item, { closeModal }) => {
            const result = item.raw as SearchResultUnion
            if (result && result.type === 'experience' && onExperienceSelect) {
                onExperienceSelect(result)
                // Don't close modal immediately - let auto-progression handle it
                // The callback will store the experience and trigger next segment
                closeModal()
            }
        },

        emptyMessage: 'No experiences found'
    }

    // Dimension: Countries
    const countriesDimension: WhereDimensionConfig<SearchResultUnion> = {
        id: 'countries',
        label: 'Countries',
        type: 'location_country',
        enabled: true,
        closeOnSelect: true,

        /**
         * Search function: Use global search API and filter to only countries
         */
        search: async (args) => {
            const allResults = await sharedGlobalSearch(args)
            // Filter to only country results
            return allResults.filter((result) => result.type === 'location_country')
        },

        /**
         * Map country results for display in dropdown
         * Uses adapter to include image_url in meta
         */
        mapItem: (result) => {
            return mapCountryToSectionItem(result as Extract<SearchResultUnion, { type: 'location_country' }>)
        },

        /**
         * Handle country selection - store selection and allow month/preferences flow
         */
        onSelect: (item, { closeModal }) => {
            const result = item.raw as SearchResultUnion
            if (result && result.type === 'location_country' && onCountrySelect) {
                onCountrySelect(result)
                // Close modal - auto-progression will open next segment
                closeModal()
            }
        },

        emptyMessage: 'No countries found'
    }

    return [countriesDimension, experiencesDimension]
}

/**
 * Helper function to navigate based on search result type
 *
 * @param result - The search result to navigate to
 * @param navigate - Navigation function from useNavigate hook
 */
export const navigateFromGlobalSearchResult = (result: SearchResultUnion, navigate: (path: string) => void) => {
    // Modify country name for URL (replace spaces with hyphens, lowercase)
    const modifyCountryName = (countryName: string): string => {
        return countryName.replace(/ /g, '-').toLowerCase()
    }

    switch (result.type) {
        case 'experience':
            // Navigate to experience details page
            navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/${result.id}`)
            break
        case 'location_city':
            // Navigate to city page
            navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${result.city_id}`)
            break
        case 'location_country': {
            // Navigate to activities page with country params
            const modifiedName = modifyCountryName(result.country_name)
            navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}?country_name=${modifiedName}&country_id=${result.country_id}`)
            break
        }
    }
}
