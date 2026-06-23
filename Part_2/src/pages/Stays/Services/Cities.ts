import { searchCities as searchCitiesAPI } from '../Apis/citiesAPI';

// Types
interface CityDetails {
    id: string;
    name: string;
    image?: string;
}

interface CityListItem {
    id: string;
    name: string;
    is_live?: boolean;
    image_url?: string;
    country_id?: string;
    country_name?: string;
}

// API Response Types
interface CityAPIResponse {
    results: Array<{
        id: string;
        name: string;
        province: string | null;
        country: {
            id: string;
            name: string;
            region: {
                id: string;
                name: string;
                created_at: string;
                updated_at: string;
            };
            created_at: string;
            updated_at: string;
        };
        experience_count: number;
        created_at: string;
        updated_at: string;
        is_live?: boolean;
    }>;
    pagination: {
        total_count: number;
        total_pages: number;
        current_page: number;
        limit: number;
        has_next: boolean;
        has_previous: boolean;
    };
}

// LocalStorage key
const CITIES_STORAGE_KEY = 'rimigo_cities_cache';

// Helper functions for localStorage
const getCitiesFromStorage = (): Record<string, CityDetails> => {
    try {
        const stored = localStorage.getItem(CITIES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading cities from localStorage:', error);
        return {};
    }
};

const saveCityToStorage = (cityName: string, cityDetails: CityDetails): void => {
    try {
        const cities = getCitiesFromStorage();
        cities[cityName.toLowerCase()] = cityDetails;
        localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(cities));
    } catch (error) {
        console.error('Error saving city to localStorage:', error);
    }
};

/**
 * Get city details for a given city query
 * First checks localStorage, then falls back to API
 * Returns the first matching city with id, name, and image
 */
export const getCityDetails = async (cityQuery: string): Promise<CityDetails | null> => {
    if (!cityQuery) {
        return null;
    }

    const normalizedQuery = cityQuery.toLowerCase();

    // Check localStorage first
    const cachedCities = getCitiesFromStorage();
    if (cachedCities[normalizedQuery]) {
        return cachedCities[normalizedQuery];
    }

    // If not in cache, fetch from API
    try {
        const response: CityAPIResponse = await searchCitiesAPI(cityQuery);

        if (response?.results && response.results.length > 0) {
            const firstCity = response.results[0];
            const cityDetails: CityDetails = {
                id: firstCity.id,
                name: firstCity.name,
                image: undefined, // Image not provided in API response currently
            };

            // Save to localStorage for future use
            saveCityToStorage(cityQuery, cityDetails);

            return cityDetails;
        }

        return null;
    } catch (error) {
        console.error('Error fetching city details:', error);
        return null;
    }
};

/**
 * Search cities by query and return a list of cities with id and name only
 */
export const searchCities = async (cityQuery: string): Promise<CityListItem[]> => {
    if (!cityQuery) {
        return [];
    }

    try {
        const response: CityAPIResponse = await searchCitiesAPI(cityQuery);

        if (response?.results && Array.isArray(response.results)) {
            return response.results.map((city) => ({
                id: city.id,
                name: city.name,
                is_live: city.is_live,
            }));
        }

        return [];
    } catch (error) {
        console.error('Error searching cities:', error);
        return [];
    }
};

// Export types for use in components
export type { CityDetails, CityListItem };

