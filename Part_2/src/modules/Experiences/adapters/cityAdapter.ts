import { CityApiResponse, CitiesApiResponse, CityFilter } from '../types/city'

/**
 * Adapts city API response to UI-friendly format
 */
export const adaptCitiesToFilters = (cities: CityApiResponse[]): CityFilter[] => {
    return cities.map((city) => ({
        id: city.id,
        name: city.name,
        isSelected: false,
        experienceCount: city.experience_count
    }))
}

/**
 * Adapts full API response (with pagination) to city filters
 */
export const adaptCitiesResponseToFilters = (response: CitiesApiResponse): CityFilter[] => {
    return adaptCitiesToFilters(response.results)
}

/**
 * Adds "All" option to the beginning of city filters
 */
export const addAllCitiesOption = (cities: CityFilter[]): CityFilter[] => {
    return [
        {
            id: 'all',
            name: 'All Cities',
            isSelected: true
        },
        ...cities
    ]
}
