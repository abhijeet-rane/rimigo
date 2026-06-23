import type { FoodItemData } from '../components/FoodCard'
import type { IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'

/**
 * Minimal shape we need from the completed-itinerary payload's day.slot.
 * Matches the server contract (snake_case, `kind: 'meal'` for food slots,
 * `slot_data` carrying the Google Places fields when enriched).
 *
 * Kept intentionally loose — the caller passes the full itinerary response
 * whose slot shape is `any[]` in our TS types, so we narrow field-by-field.
 */
interface ItinerarySlotShape {
    slot_id?: string
    kind?: string
    title?: string
    start_time?: string
    order?: number
    slot_data?: {
        name?: string
        place_id?: string
        google_maps_uri?: string
        maps_uri?: string
        photo_url?: string
        formatted_address?: string
        address?: string
        location?: {
            latitude?: number
            longitude?: number
        }
    }
    location?: {
        latitude?: number
        longitude?: number
    }
}

interface ItineraryDayShape {
    date?: string
    base_city?: { id?: string; name?: string } | null
    destination_city?: { id?: string; name?: string } | null
    slots?: ItinerarySlotShape[]
}

const pickCity = (day: ItineraryDayShape): { id?: string; name?: string } => {
    return day.base_city ?? day.destination_city ?? {}
}

const pickString = (v: unknown): string | undefined => {
    if (typeof v !== 'string') return undefined
    const t = v.trim()
    return t.length > 0 ? t : undefined
}

const pickNumber = (v: unknown): number | undefined => {
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

/**
 * Project meal slots from a completed-itinerary response into the same
 * `FoodItemData` shape that FoodTabContent already consumes from
 * collection sections. No collection writes, no extra API calls —
 * purely a view transform over data that already sits in
 * `useItineraryCompletedData`.
 *
 * Ordering is `(day.date, slot.start_time, slot.order)` so food cards
 * appear in the order they'll be eaten on the trip — stable and
 * meaningful without mirroring collection's `sections_order`.
 *
 * Dedup key is case-insensitive name + city_id to match the backend's
 * historical behaviour (`_extract_meals`). A restaurant that legitimately
 * appears on multiple days in the same city collapses to one card.
 */
export function buildFoodItemsFromItinerary(
    days: ItineraryDayShape[] | undefined | null,
): FoodItemData[] {
    if (!days || days.length === 0) return []

    type Entry = { item: FoodItemData; sortKey: string }
    const seen = new Map<string, Entry>()

    for (const day of days) {
        const city = pickCity(day)
        const cityId = pickString(city.id)
        const cityName = pickString(city.name)
        const dayDate = pickString(day.date) ?? ''

        for (const slot of day.slots ?? []) {
            if (slot.kind !== 'meal') continue

            const data = slot.slot_data ?? {}
            const name = pickString(data.name) ?? pickString(slot.title)
            if (!name) continue // nothing useful to render

            const dedupKey = `${cityId ?? ''}::${name.toLowerCase()}`
            if (seen.has(dedupKey)) continue

            const mapLink = pickString(data.google_maps_uri) ?? pickString(data.maps_uri)
            // Prefer the on-demand photo proxy keyed on place_id (stable,
            // never expires). Fall back to a legacy stored photo_url only for
            // pre-proxy slots that have no place_id.
            const placeId = pickString(data.place_id)
            const imageUrl = placeId
                ? placePhotoProxyUrl(placeId, 800)
                : pickString(data.photo_url)
            const address = pickString(data.formatted_address) ?? pickString(data.address)
            const latitude = pickNumber(data.location?.latitude) ?? pickNumber(slot.location?.latitude)
            const longitude = pickNumber(data.location?.longitude) ?? pickNumber(slot.location?.longitude)
            // Order key: day-date + start-time + order. Falling back to empty
            // strings is fine — lexicographic comparison puts empties first,
            // and we don't rely on a specific ordering when dates are absent.
            const sortKey = `${dayDate}::${slot.start_time ?? ''}::${String(slot.order ?? 0).padStart(6, '0')}`

            seen.set(dedupKey, {
                sortKey,
                item: {
                    // Use slot_id so cards have stable React keys AND so the
                    // FoodCard delete branch can no-op safely (see
                    // FoodTabContent: when itinerary-mode is active we don't
                    // forward onDeleteSection, but passing slot_id here keeps
                    // the key stable across renders).
                    sectionId: pickString(slot.slot_id) ?? `${dedupKey}::${dayDate}`,
                    name,
                    map_link: mapLink,
                    instagram_url: undefined,
                    image_url: imageUrl,
                    address,
                    latitude,
                    longitude,
                    city_id: cityId,
                    city_name: cityName,
                },
            })
        }
    }

    return [...seen.values()]
        .sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
        .map((e) => e.item)
}

/**
 * Cheap boolean check for "does this itinerary have at least one meal slot?"
 * Used by the three page-level components to decide whether to inject a
 * synthetic `restaurant` tab when the collection's `/section-types`
 * response doesn't include one. Short-circuits on the first hit to avoid
 * walking the full day list.
 */
export function itineraryHasMealSlots(
    itineraryData: IItineraryCompletedResponse | null | undefined,
): boolean {
    const days = itineraryData?.days
    if (!days || days.length === 0) return false
    for (const day of days) {
        for (const slot of day.slots ?? []) {
            if (slot?.kind === 'meal') return true
        }
    }
    return false
}
