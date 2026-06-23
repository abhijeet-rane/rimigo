/**
 * Static config of popular departure cities surfaced beneath the search bar
 * on the FLYING FROM? sub-tab. Keep this list curated; longer-tail cities
 * appear through the search input.
 *
 * Current scope is India-only — top 6 airports by passenger volume. When we
 * expand internationally, replace this list (or branch it by user locale)
 * rather than mixing markets, since a global six can't be representative
 * for any single market.
 */
export interface DepartureCityConfig {
    /** Display name on the row. */
    city_name: string
    /** Country shown next to the city name. */
    country_name: string
    /** IATA airport code rendered in the purple pill on the right. */
    iata: string
}

export const POPULAR_DEPARTURE_CITIES: DepartureCityConfig[] = [
    { city_name: 'Delhi',     country_name: 'India', iata: 'DEL' },
    { city_name: 'Mumbai',    country_name: 'India', iata: 'BOM' },
    { city_name: 'Bengaluru', country_name: 'India', iata: 'BLR' },
    { city_name: 'Hyderabad', country_name: 'India', iata: 'HYD' },
    { city_name: 'Chennai',   country_name: 'India', iata: 'MAA' },
    { city_name: 'Kolkata',   country_name: 'India', iata: 'CCU' },
]
