import type { PdfDay, PdfStay } from '../types'

export interface CityPoint {
    name: string
    lat: number
    lng: number
    /** How many days the traveller spends in this city. */
    nights: number
}

// Returns the unique cities visited in order, each with a coordinate
// resolved from (in priority): a stay in that city, the first slot on
// any day in that city with location.lat/lng. Cities without any
// coordinate source are dropped — the map can't pin them.
export function extractCityPoints(days: PdfDay[], stays: PdfStay[]): CityPoint[] {
    const order: string[] = []
    const nightsByName = new Map<string, number>()
    const cityIdByName = new Map<string, string>()
    const slotCoordByName = new Map<string, { lat: number; lng: number }>()

    for (const day of days) {
        const city = day.base_city?.name || day.destination_city?.name
        if (!city) continue
        if (!nightsByName.has(city)) {
            order.push(city)
            nightsByName.set(city, 0)
        }
        nightsByName.set(city, nightsByName.get(city)! + 1)

        const cityId = day.base_city?.id || day.destination_city?.id
        if (cityId && !cityIdByName.has(city)) cityIdByName.set(city, cityId)

        if (!slotCoordByName.has(city)) {
            for (const slot of day.slots ?? []) {
                const lat = slot.location?.latitude
                const lng = slot.location?.longitude
                if (typeof lat === 'number' && typeof lng === 'number') {
                    slotCoordByName.set(city, { lat, lng })
                    break
                }
            }
        }
    }

    const out: CityPoint[] = []
    for (const name of order) {
        const cityId = cityIdByName.get(name)
        const stayHere = stays.find(
            (s) =>
                typeof s.latitude === 'number'
                && typeof s.longitude === 'number'
                && (cityId ? s.city_id === cityId : false),
        )
        const coord = stayHere
            ? { lat: stayHere.latitude!, lng: stayHere.longitude! }
            : slotCoordByName.get(name)
        if (!coord) continue
        out.push({ name, lat: coord.lat, lng: coord.lng, nights: nightsByName.get(name)! })
    }
    return out
}

// Brand-purple labeled pins, auto-fit viewport. Up to ~10 cities works
// well; beyond that the URL gets long and pins overlap — we cap.
const MAX_PINS = 10
const PIN_COLOR = '7011f6' // primaryDefault, no leading #

export function buildMapboxRouteUrl(points: CityPoint[], token: string): string | null {
    if (!token || points.length === 0) return null
    const pins = points.slice(0, MAX_PINS).map((p, i) => {
        const label = String(i + 1)
        return `pin-l-${label}+${PIN_COLOR}(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`
    })
    const overlay = pins.join(',')
    // outdoors-v12 gives a colored, terrain-aware basemap (greens,
    // water tint, hill shading). 1x to keep download size modest;
    // @2x added too many MB to the embedded PDF on a multi-day trip.
    return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/auto/900x420?access_token=${token}&padding=40`
}

// Google Maps multi-stop directions — recipient taps once, gets
// turn-by-turn for the whole route. Single-city trips fall back to
// a Google Maps search.
export function buildGoogleMapsDirectionsUrl(points: CityPoint[]): string | null {
    if (points.length === 0) return null
    if (points.length === 1) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points[0].name)}`
    }
    const path = points.map((p) => encodeURIComponent(p.name)).join('/')
    return `https://www.google.com/maps/dir/${path}`
}
