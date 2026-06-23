/**
 * Public hotel (accommodation) API helpers.
 *
 * Two flavours, mirroring the experience-public pattern in
 * `src/modules/Experiences/api/experienceApi.ts`:
 *  - `...BySlug()` — uses the shared `apiClient` (browser, injects token if present).
 *  - `...BySlugSSR()` — uses raw `fetch()` so it works in Node during server rendering.
 *
 * Both call the `/curation/accommodations/by-slug/<slug>/` endpoint which is
 * public (AUTH-bypassed in sancus). The composite `getHotelDetailsForSlug*`
 * helpers resolve the accommodation via slug, then issue the existing
 * `POST /stays/` call with default params (30 days out, 1 night, couple,
 * leisure_relaxation) so the public hotel page has priced data.
 */
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import type { HotelDetailData } from '@/types/hotelDetailTypes'

/** Minimal shape returned by `GET /curation/accommodations/by-slug/<slug>/`. */
export interface AccommodationPublicData {
    id?: string
    name: string
    slug?: string
    zentrum_hub_id: string
    description?: string
    highlights?: string[]
    category?: string
    /** Raw ObjectId reference to City — present but unpopulated. Use `base_city_info` for id/name. */
    base_city?: string | { id?: string; name?: string }
    /** Populated city info emitted by `AccommodationSerializer.get_base_city_info`. */
    base_city_info?: { id: string; name: string } | null
    location?: {
        lat?: number
        long?: number
        address?: string
    } | null
    media?: {
        photos?: Array<{ url: string; caption?: string }>
        videos?: Array<{ url: string }>
    } | null
    facilities?: string[]
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    metadata?: Record<string, unknown>
    updated_at?: string
    created_at?: string
}

export interface HotelPublicBundle {
    accommodation: AccommodationPublicData
    hotelData: HotelDetailData | null
}

/** Default dates for public price lookup — 30 days out, 1 night. */
const defaultDates = () => {
    const checkIn = new Date()
    checkIn.setDate(checkIn.getDate() + 30)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 1)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) }
}

/** Defaults for the `/stays/` POST so a logged-out viewer still gets a priced hotel page. */
const defaultStaysPayload = (acc: AccommodationPublicData) => {
    // Resolve city id + name across the two shapes the backend can emit:
    //  - `base_city_info`: populated `{id, name}` (from `AccommodationSerializer`).
    //  - `base_city`: sometimes a raw ObjectId string, sometimes a nested object.
    const cityId = acc.base_city_info?.id
        ?? (typeof acc.base_city === 'string' ? acc.base_city : acc.base_city?.id)
    const cityName = acc.base_city_info?.name
        ?? (typeof acc.base_city === 'object' ? acc.base_city?.name : undefined)
    return {
        hotel_name: acc.name,
        zentrum_hub_id: acc.zentrum_hub_id,
        city: { id: cityId, name: cityName },
        travel_purpose: 'leisure_relaxation',
        group_type: 'couple',
        preferences: [] as string[],
        review_type: 'complete',
        ...defaultDates()
    }
}

// ─── Slug lookup ────────────────────────────────────────────────────────────

export const getHotelBySlug = async (slug: string): Promise<AccommodationPublicData> => {
    const response = await apiClient.get<AccommodationPublicData | { data: AccommodationPublicData }>(
        `${API_CONFIG.BASE_URL}/curation/accommodations/by-slug/${encodeURIComponent(slug)}/`
    )
    const payload = (response.data as { data?: AccommodationPublicData }).data ?? (response.data as AccommodationPublicData)
    return payload
}

export const getHotelBySlugSSR = async (slug: string): Promise<AccommodationPublicData> => {
    const response = await fetch(
        `${API_CONFIG.BASE_URL}/curation/accommodations/by-slug/${encodeURIComponent(slug)}/`,
        { method: 'GET', headers: { Accept: 'application/json' } }
    )
    if (!response.ok) {
        throw new Error(`accommodation by-slug returned ${response.status}`)
    }
    const data = await response.json()
    return (data?.data ?? data) as AccommodationPublicData
}

// ─── Composite detail (accommodation + priced /stays/ payload) ──────────────

export const getHotelDetailsForSlug = async (slug: string): Promise<HotelPublicBundle> => {
    const accommodation = await getHotelBySlug(slug)
    try {
        const staysResponse = await apiClient.post<{ response_code: string; data: HotelDetailData }>(
            `${API_CONFIG.BASE_URL}/stays/`,
            defaultStaysPayload(accommodation)
        )
        const hotelData = staysResponse.data?.response_code === 'SS0200'
            ? staysResponse.data.data
            : null
        return { accommodation, hotelData }
    } catch {
        // If the pricing call fails, still return the accommodation so the page can render.
        return { accommodation, hotelData: null }
    }
}

export const getHotelDetailsForSlugSSR = async (slug: string): Promise<HotelPublicBundle> => {
    const accommodation = await getHotelBySlugSSR(slug)
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/stays/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(defaultStaysPayload(accommodation))
        })
        if (!response.ok) {
            return { accommodation, hotelData: null }
        }
        const payload = await response.json()
        const hotelData = payload?.response_code === 'SS0200' ? (payload.data as HotelDetailData) : null
        return { accommodation, hotelData }
    } catch {
        return { accommodation, hotelData: null }
    }
}
