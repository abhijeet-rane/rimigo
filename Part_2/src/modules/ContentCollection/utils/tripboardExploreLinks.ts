import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'

/** Activities explore URLs expect country_name as hyphenated lowercase (see useActivitiesSearchExplorePage). */
export function formatCountryNameForActivitiesUrl(displayName: string): string {
    return displayName.replace(/ /g, '-').toLowerCase()
}

export const STAYS_EXPLORE_DEFAULT_CITY_PREFS_CSV = 'station_nearby,city_center,nightlife'

/**
 * Query string for `/stays` — must satisfy StaysExplore `hasRequiredParams`
 * (city_id, check_in, check_out, group_type, travel_purpose, city_prefs with ≥1 pref).
 */
export function buildStaysExploreQueryString(opts: {
    cityId: string
    cityName: string
    checkIn: string
    checkOut: string
    groupType?: string | null
    travelPurpose?: string | null
    cityPrefs?: string | null
    adults?: string
    children?: string
    infants?: string
    childrenAge?: string
}): string {
    const p = new URLSearchParams()
    p.set('city_id', opts.cityId)
    p.set('city', opts.cityName)
    p.set('check_in', opts.checkIn)
    p.set('check_out', opts.checkOut)
    p.set('group_type', opts.groupType || 'couple')
    p.set('travel_purpose', opts.travelPurpose || 'leisure_relaxation')
    const prefs = (opts.cityPrefs ?? '').split(',').filter(Boolean)
    p.set('city_prefs', prefs.length > 0 ? prefs.join(',') : STAYS_EXPLORE_DEFAULT_CITY_PREFS_CSV)
    if (opts.adults) p.set('adults', opts.adults)
    if (opts.children !== undefined) p.set('children', opts.children)
    if (opts.infants !== undefined) p.set('infants', opts.infants)
    if (opts.childrenAge) p.set('children_age', opts.childrenAge)
    return p.toString()
}

/**
 * Resolves the best-available `/stays` link for the "Explore more stays" CTAs in StaysTab.
 * Prefers the collection-derived link, falls back to the selected explore city, then to a
 * city-only URL, and finally returns null if no signal is available.
 */
export function buildStaysExploreLinkTo(opts: {
    tripboardExploreStaysLink?: { to: string } | null
    selectedExploreCity?: { id: string; name: string; checkIn: string; checkOut: string } | null
    selectedCityId?: string | null
    guestsData: { adults: number; children: number; infants: number }
}): string | null {
    if (opts.tripboardExploreStaysLink?.to) return opts.tripboardExploreStaysLink.to
    if (opts.selectedExploreCity) {
        return `/stays?${buildStaysExploreQueryString({
            cityId: opts.selectedExploreCity.id,
            cityName: opts.selectedExploreCity.name,
            checkIn: opts.selectedExploreCity.checkIn,
            checkOut: opts.selectedExploreCity.checkOut,
            adults: String(opts.guestsData.adults),
            children: String(opts.guestsData.children),
            infants: String(opts.guestsData.infants),
        })}`
    }
    if (opts.selectedCityId) return `/stays?city_id=${opts.selectedCityId}`
    return null
}

/**
 * Full path + query for activities city explore (`ActivitiesByCityPage`).
 */
export function buildActivitiesCityExploreHref(opts: {
    cityId: string
    cityName: string
    countryId?: string | null
    countryNameDisplay?: string | null
    /** Used to set `month` / `year` query params for the search header. */
    anchorDateYmd?: string | null
    groupType?: string | null
    travelPurpose?: string | null
}): string {
    const p = new URLSearchParams()
    if (opts.countryId) p.set('country_id', opts.countryId)
    if (opts.countryNameDisplay) {
        p.set('country_name', formatCountryNameForActivitiesUrl(opts.countryNameDisplay))
    }
    p.set('city_name', opts.cityName)
    if (opts.anchorDateYmd) {
        const d = new Date(opts.anchorDateYmd)
        if (!Number.isNaN(d.getTime())) {
            p.set('month', String(d.getMonth() + 1))
            p.set('year', String(d.getFullYear()))
        }
    }
    if (opts.groupType) p.set('groupType', opts.groupType)
    if (opts.travelPurpose) p.set('travelPurpose', opts.travelPurpose)
    const q = p.toString()
    return `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${encodeURIComponent(opts.cityId)}${q ? `?${q}` : ''}`
}
