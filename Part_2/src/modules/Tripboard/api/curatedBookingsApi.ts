import apiClient from '@/lib/api/apiClient'
import { PLATFORM_ICONS } from '@/constants/icons/platformIcons'

/* Curated Transport/Ancillary booking items — populated by rimigo_internal
 * users, stored on the collection's metadata.curated_bookings (krysto). */

export type CuratedCategory = 'transport' | 'ancillary'
export type CuratedCtaType = 'price_link' | 'book_now' | 'get_quote'
export type CuratedPriceUnit = 'per_person' | 'total' | 'per_day'

export interface CuratedOffer {
    headline?: string
    provider_name: string
    provider_logo?: string | null
    cta_type: CuratedCtaType
    price?: number | null
    currency?: string
    price_unit?: CuratedPriceUnit | null
    link?: string | null
    tags?: string[]
}

export interface CuratedBookingItem {
    item_id: string
    category: CuratedCategory
    subtype: string
    title: string
    /** ISO date the item is tied to — itinerary-sourced legs carry their day's
     *  date; trip-spanning passes (Swiss/JR Rail) leave it null. */
    date?: string | null
    image?: string | null
    description?: string | null
    badge?: string | null
    sort_order: number
    is_visible: boolean
    offers: CuratedOffer[]
    created_by?: string
    updated_by?: string
    created_at?: string
    updated_at?: string
}

export type CuratedBookingItemPayload = Omit<CuratedBookingItem, 'item_id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>

/** Known providers for the internal editor — picking one fills name + logo.
 *  Logos resolve from this catalog at render time too (data-URI logos can't
 *  be persisted: the backend validates provider_logo as a URL). */
export const CURATED_PROVIDER_OPTIONS: { name: string; logo: string }[] = [
    { name: 'GetYourGuide', logo: PLATFORM_ICONS.GETYOURGUIDE },
    { name: 'Klook', logo: PLATFORM_ICONS.KLOOK },
    { name: 'Viator', logo: PLATFORM_ICONS.VIATOR },
    { name: 'Headout', logo: PLATFORM_ICONS.HEADOUT },
    { name: 'Booking.com', logo: PLATFORM_ICONS.BOOKING_COM },
    { name: 'Agoda', logo: PLATFORM_ICONS.AGODA },
    { name: 'Expedia', logo: PLATFORM_ICONS.EXPEDIA },
    { name: 'Trip.com', logo: PLATFORM_ICONS.TRIP_COM },
    { name: 'MakeMyTrip', logo: PLATFORM_ICONS.MAKE_MY_TRIP },
    { name: 'Goibibo', logo: PLATFORM_ICONS.GOIBIBO },
    { name: 'Cleartrip', logo: PLATFORM_ICONS.CLEARTIP },
    { name: 'Kayak', logo: PLATFORM_ICONS.KAYAK },
    { name: 'Airbnb', logo: PLATFORM_ICONS.AIRBNB },
    { name: 'Visa2Fly', logo: PLATFORM_ICONS.VISA2FLY },
    { name: 'Teleport', logo: PLATFORM_ICONS.TELEPORT }
]

/** Stored logo URL when present, else catalog lookup by provider name. */
export const resolveCuratedProviderLogo = (offer: Pick<CuratedOffer, 'provider_name' | 'provider_logo'>): string | null =>
    offer.provider_logo || CURATED_PROVIDER_OPTIONS.find((option) => option.name === offer.provider_name)?.logo || null

const basePath = (identifier: string) => `/api/tripboards/${encodeURIComponent(identifier)}/curated-bookings/`

export const curatedBookingsApi = {
    list: async (identifier: string): Promise<CuratedBookingItem[]> => {
        const response = await apiClient.get(basePath(identifier))
        return response.data.data.items
    },

    create: async (identifier: string, payload: CuratedBookingItemPayload): Promise<CuratedBookingItem> => {
        const response = await apiClient.post(basePath(identifier), payload)
        return response.data.data
    },

    update: async (identifier: string, itemId: string, payload: Partial<CuratedBookingItemPayload>): Promise<CuratedBookingItem> => {
        const response = await apiClient.patch(`${basePath(identifier)}${encodeURIComponent(itemId)}/`, payload)
        return response.data.data
    },

    remove: async (identifier: string, itemId: string): Promise<void> => {
        await apiClient.delete(`${basePath(identifier)}${encodeURIComponent(itemId)}/`)
    }
}
