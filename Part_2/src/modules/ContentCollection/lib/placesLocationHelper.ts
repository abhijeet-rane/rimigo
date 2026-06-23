/**
 * Resolve place location (lat/long) using Google Places Autosuggest + Place Details,
 * same flow as AddFoodItemModal. Use when backend getPlacePreview does not return coordinates.
 * Runs only in browser (uses @googlemaps/js-api-loader and google.maps.places).
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let placesLoaded = false

async function ensurePlacesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return
    if (placesLoaded) return
    const key = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return
    setOptions({ key, v: 'weekly' })
    await importLibrary('places')
    placesLoaded = true
}

/**
 * Get latitude and longitude for a place by searching with name and city
 * (same autosuggest + place-details flow as AddFoodItemModal).
 * Returns null if Places API is unavailable or no result found.
 */
export async function getPlaceLocationBySearch(
    name: string,
    cityName: string
): Promise<{ latitude: number; longitude: number } | null> {
    if (typeof window === 'undefined' || !name?.trim()) return null
    try {
        await ensurePlacesLoaded()
        if (!placesLoaded || !google?.maps?.places) return null

        const sessionToken = new google.maps.places.AutocompleteSessionToken()
        const input = cityName?.trim() ? `${name.trim()}, ${cityName.trim()}` : name.trim()
        const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedPrimaryTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
            sessionToken
        })

        const first = suggestions?.find((s) => s.placePrediction?.placeId)
        if (!first?.placePrediction) return null

        const place = first.placePrediction.toPlace()
        await place.fetchFields({ fields: ['location'] })
        const lat = place.location?.lat()
        const lng = place.location?.lng()
        if (lat == null || lng == null || (lat === 0 && lng === 0)) return null
        return { latitude: lat, longitude: lng }
    } catch {
        return null
    }
}
