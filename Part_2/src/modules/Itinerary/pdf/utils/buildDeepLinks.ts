// Mirrors the URL params ItineraryMapView builds (search zentrum_hub_id
// there). Duplicated for now to keep this PR scoped — TODO: consolidate.
// Each builder returns null when required fields are missing so callers
// can render plain text instead of a dead link.
import type { PdfDay, PdfSlot, PdfStay, PdfTripContext } from '../types'

// Reads from the matched PdfStay row first (carries clean check-in/out
// + zentrum_hub_id) and falls back to slot fields.
export function buildStayUrl({
    origin,
    slot,
    stay,
    trip,
}: {
    origin: string
    slot?: PdfSlot | null
    stay?: PdfStay | null
    trip: PdfTripContext
}): string | null {
    const zentrumHubId =
        stay?.zentrum_hub_id
        || (slot?.slot_data?.['zentrum_hub_id'] as string | undefined)
        || (slot?.entity_model === 'Accommodation' ? slot?.entity_id : null)
    if (!zentrumHubId) return null

    const hotelName =
        stay?.hotel_name
        || (slot?.title ?? '')
        || (slot?.slot_data?.['hotel_name'] as string | undefined)
        || ''

    const accommodationId =
        stay?.accommodation_id
        || (slot?.entity_model === 'Accommodation' ? slot?.entity_id : null)
        || (slot?.slot_data?.['accommodation_id'] as string | undefined)
        || ''

    const cityId =
        stay?.city_id
        || (slot?.location?.city_id ?? '')
        || ''
    const cityName =
        (slot?.location?.['city_name'] as string | undefined)
        || ''
    const countryId =
        (slot?.location?.['country_id'] as string | undefined)
        || ''

    const checkIn = stay?.check_in_date || (slot?.start_time?.slice(0, 10) ?? '')
    const checkOut = stay?.check_out_date || (slot?.end_time?.slice(0, 10) ?? '')

    const params = new URLSearchParams({
        hotel_name: hotelName,
        zentrum_hub_id: zentrumHubId,
        accommodation_id: accommodationId,
        check_in: checkIn,
        check_out: checkOut,
        city_id: cityId,
        city_name: cityName,
        country_id: countryId,
        travel_purpose: trip.travel_purpose || 'leisure_relaxation',
        group_type: trip.group_type || 'couple',
        city_prefs: '',
        review_type: 'complete',
        adults: String(trip.adults ?? 2),
        children: String(trip.children ?? 0),
        infants: String(trip.infants ?? 0),
    })

    return `${origin}/stays/${zentrumHubId}?${params.toString()}`
}

// The screen passes through the current URL's search params; the PDF
// has no current URL, so we carry the minimum the experience page
// needs to bootstrap (trip + date context for pricing/availability).
export function buildExperienceUrl({
    origin,
    slot,
    day,
    trip,
}: {
    origin: string
    slot: PdfSlot
    day: PdfDay
    trip: PdfTripContext
}): string | null {
    const entityId =
        slot.entity_id
        || (slot.slot_data?.['experience_id'] as string | undefined)
        || null
    if (!entityId) return null

    const params = new URLSearchParams()
    params.set('trip_id', trip.trip_id)
    if (day.date) params.set('date', day.date.slice(0, 10))
    if (slot.start_time) params.set('start', slot.start_time)
    if (day.base_city?.id) params.set('city_id', day.base_city.id)
    if (day.base_city?.name) params.set('city_name', day.base_city.name)
    if (trip.travel_purpose) params.set('travel_purpose', trip.travel_purpose)
    if (trip.group_type) params.set('group_type', trip.group_type)
    params.set('adults', String(trip.adults ?? 2))
    params.set('children', String(trip.children ?? 0))
    params.set('infants', String(trip.infants ?? 0))

    return `${origin}/experiences/${entityId}?${params.toString()}`
}

// Prefer coordinates (precise) over the typed address (ambiguous).
export function buildMapsUrl(
    location: PdfSlot['location'] | null | undefined,
    titleFallback?: string | null,
): string | null {
    if (!location && !titleFallback) return null
    const lat = location?.latitude
    const lng = location?.longitude
    if (typeof lat === 'number' && typeof lng === 'number') {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }
    const query =
        (location?.address && String(location.address))
        || titleFallback
        || ''
    if (!query.trim()) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
