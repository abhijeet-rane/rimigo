import type { FlightLegPayload } from '../../api/travelerCollectionApi'

interface ItineraryCity {
    id?: string
    name?: string
    country?: string
}

export interface ItineraryDay {
    date: string
    base_city?: ItineraryCity | null
    destination_city?: ItineraryCity | null
}

export interface DerivedLeg extends FlightLegPayload {
    /** The city this leg starts at (display label, no IATA dependency). */
    from_city_name?: string
    from_country_name?: string
    /** The city this leg ends at. */
    to_city_name?: string
    to_country_name?: string
}

interface CitySegment {
    city: ItineraryCity
    /** First day in the itinerary at this city — used as the leg arrival/start date. */
    start_date: string
}

const sameCity = (a?: ItineraryCity | null, b?: ItineraryCity | null): boolean => {
    if (!a || !b) return false
    if (a.id && b.id) return a.id === b.id
    return (a.name || '').trim().toLowerCase() === (b.name || '').trim().toLowerCase()
}

/**
 * Reduce the itinerary's day-level destination city list into ordered "city
 * segments" — collapsing consecutive duplicate cities. A segment carries the
 * city itself and the FIRST day the trip arrived at that city (used as the
 * leg's date).
 *
 * Example: days [A, A, B, B, A] → segments [{A, day1}, {B, day3}, {A, day5}].
 */
export function buildCitySegmentsFromItinerary(days: ItineraryDay[]): CitySegment[] {
    const segments: CitySegment[] = []
    for (const day of days || []) {
        const city = day.destination_city || day.base_city
        if (!city || !city.name) continue
        const last = segments[segments.length - 1]
        if (last && sameCity(last.city, city)) continue
        segments.push({ city, start_date: (day.date || '').slice(0, 10) })
    }
    return segments
}

/**
 * Resolve unique city names to IATA codes via the supplied async resolver.
 * Returns a map keyed by `${name}|${country}` so callers can look up legs.
 */
async function buildIataMap(
    cities: ItineraryCity[],
    resolveIata: (city: string, country?: string | null) => Promise<string | null>
): Promise<Map<string, string | null>> {
    const seen = new Map<string, ItineraryCity>()
    for (const city of cities) {
        if (!city.name) continue
        const key = `${city.name}|${city.country || ''}`
        if (!seen.has(key)) seen.set(key, city)
    }

    const result = new Map<string, string | null>()
    await Promise.all(
        Array.from(seen.entries()).map(async ([key, city]) => {
            try {
                const iata = await resolveIata(city.name as string, city.country || null)
                result.set(key, iata)
            } catch {
                result.set(key, null)
            }
        })
    )
    return result
}

const cityKey = (city: ItineraryCity): string =>
    `${city.name || ''}|${city.country || ''}`

/**
 * Derive flight legs from an itinerary.
 *
 * Rules (locked with the user):
 * - If first-itinerary-city == last-itinerary-city (single distinct city), emit
 *   a single `round_trip` leg with both outbound and return dates rolled up.
 * - Otherwise, emit `outbound` (home → first city), one `inter_city` leg per
 *   consecutive distinct-city pair (using the arrival-day date), and `return`
 *   (last city → home).
 *
 * `homeAirportIata` may be null — we still emit the legs, but with `from`/`to`
 * for the home side left null so the FlightsTab surfaces the "set home airport"
 * affordance. Likewise, any city whose IATA we can't resolve leaves that
 * side null.
 *
 * Returns an empty array if the itinerary has zero day-level cities (no
 * fallback to country-level guessing — by design).
 */
export async function deriveLegsFromItinerary(
    days: ItineraryDay[],
    homeAirportIata: string | null,
    resolveIata: (city: string, country?: string | null) => Promise<string | null>
): Promise<DerivedLeg[]> {
    const segments = buildCitySegmentsFromItinerary(days)
    if (segments.length === 0) return []

    const distinctKeys = new Set(segments.map((s) => cityKey(s.city)))
    const iataMap = await buildIataMap(
        segments.map((s) => s.city),
        resolveIata
    )

    const homeSafe = homeAirportIata ?? null
    const lastDay = (days[days.length - 1]?.date || segments[segments.length - 1].start_date).slice(0, 10)

    if (distinctKeys.size === 1) {
        const only = segments[0]
        const iata = iataMap.get(cityKey(only.city)) ?? null
        return [
            {
                kind: 'round_trip',
                from: homeSafe,
                to: iata,
                date: only.start_date,
                return_date: lastDay,
                source: 'auto',
                pinned: false,
                from_city_name: undefined,
                from_country_name: undefined,
                to_city_name: only.city.name,
                to_country_name: only.city.country
            }
        ]
    }

    const legs: DerivedLeg[] = []
    const first = segments[0]
    const last = segments[segments.length - 1]

    legs.push({
        kind: 'outbound',
        from: homeSafe,
        to: iataMap.get(cityKey(first.city)) ?? null,
        date: first.start_date,
        source: 'auto',
        pinned: false,
        to_city_name: first.city.name,
        to_country_name: first.city.country
    })

    for (let i = 0; i < segments.length - 1; i += 1) {
        const a = segments[i]
        const b = segments[i + 1]
        legs.push({
            kind: 'inter_city',
            from: iataMap.get(cityKey(a.city)) ?? null,
            to: iataMap.get(cityKey(b.city)) ?? null,
            date: b.start_date,
            source: 'auto',
            pinned: false,
            from_city_name: a.city.name,
            from_country_name: a.city.country,
            to_city_name: b.city.name,
            to_country_name: b.city.country
        })
    }

    legs.push({
        kind: 'return',
        from: iataMap.get(cityKey(last.city)) ?? null,
        to: homeSafe,
        date: lastDay,
        source: 'auto',
        pinned: false,
        from_city_name: last.city.name,
        from_country_name: last.city.country
    })

    return legs
}

/**
 * Minimal shape of a saved flight section we need to derive a leg from it.
 * Mirrors metadata.search_params on traveler_collection sections.
 */
export interface FlightSectionForDerivation {
    metadata?: {
        leg_id?: string
        return_date?: string | null
        search_params?: {
            origin?: string[]
            destination?: string[]
            departure_date?: string[]
            return_date?: string[] | null
            journey_type?: number
        }
    }
}

/**
 * Augment a list of derived legs with extra legs synthesized from any
 * shortlisted flights that don't already match a leg.
 *
 * "Match" rules (same as FlightsTab.matchesLeg):
 * 1. If the section has metadata.leg_id and that id exists in `derived`, match.
 * 2. Else, full route+date match (origin == leg.from, destination == leg.to,
 *    departure_date == leg.date — all must be non-null).
 *
 * For unmatched sections, a new leg is appended with kind=`inter_city` (a
 * neutral default — user can rename via the pencil). If a section has both
 * a return_date in search_params and journey_type=2, we synthesize a
 * `round_trip` leg instead. Same-route same-date sections collapse to
 * one leg.
 *
 * This function never mutates the input legs; returns a new combined array.
 */
export function augmentLegsWithShortlistedFlights(
    derived: DerivedLeg[],
    sections: FlightSectionForDerivation[]
): DerivedLeg[] {
    if (!sections || sections.length === 0) return derived

    const derivedIds = new Set(derived.map((l) => l.id).filter((x): x is string => !!x))

    const fullyMatchesAny = (sp: NonNullable<FlightSectionForDerivation['metadata']>['search_params']): boolean => {
        if (!sp) return false
        const origin = sp.origin?.[0]
        const destination = sp.destination?.[0]
        const date = sp.departure_date?.[0]
        if (!origin || !destination || !date) return false
        return derived.some((leg) => leg.from === origin && leg.to === destination && leg.date === date)
    }

    const seen = new Set<string>()
    const extras: DerivedLeg[] = []

    for (const section of sections) {
        const meta = section.metadata
        if (!meta) continue
        if (meta.leg_id && derivedIds.has(meta.leg_id)) continue
        const sp = meta.search_params
        if (!sp) continue
        const origin = sp.origin?.[0]
        const destination = sp.destination?.[0]
        const date = sp.departure_date?.[0]
        if (!origin || !destination || !date) continue
        if (fullyMatchesAny(sp)) continue

        const isRoundTrip = sp.journey_type === 2 || !!sp.return_date?.[0]
        const returnDate = sp.return_date?.[0] || null
        const dedupeKey = `${origin}|${destination}|${date}|${returnDate || ''}|${isRoundTrip ? 'rt' : 'ow'}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        extras.push({
            kind: isRoundTrip ? 'round_trip' : 'inter_city',
            from: origin,
            to: destination,
            date,
            return_date: returnDate,
            source: 'auto',
            pinned: false
        })
    }

    return [...derived, ...extras]
}
