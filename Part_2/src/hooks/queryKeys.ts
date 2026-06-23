export const TRIP_QUERY_KEYS = {
    // the query key here is named as travelerTripsKey to avoid confusion with the query key for the traveler trips 
    // which is already used in the travelerTripsContext
    // if we make it same to travelerTripsContext, due to race condition active trip will not be set correctly
    travelerTrips: (travelerId: string) => ['travelerTripsKey', travelerId],
    basicTripData: (tripId: string) => ['basicTripData', tripId]
}

/** Location personalization / cities API – shared cache for getCitiesByIds (collections, itinerary map, etc.) */
export const LOCATION_PERSONALIZATION_QUERY_KEYS = {
    /** cityIds sorted for stable cache key across call sites */
    citiesByIds: (cityIds: string[]) => ['location-personalization-cities', [...cityIds].sort()] as const,
    /** Map endpoint: cities by IDs for map display (lat/long + city_thumbnail_url) */
    citiesByIdsForMap: (cityIds: string[]) => ['location-personalization-cities-map', [...cityIds].sort()] as const
}

export const CURATION_QUERY_KEYS = {
    bestAreas: (cityId: string) => ['best-areas', cityId] as const
}
