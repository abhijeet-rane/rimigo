// Narrowed projection of the loose itinerary API shapes — defining
// only what the PDF reads keeps upstream drift from rippling through.
import type { Voucher } from '@/api/voucherAPI/voucherAPI'

export interface PdfSlot {
    slot_id?: string
    title?: string | null
    kind?: string // flight | train | bus | transfer | meal | stay | experience | place | custom | free_time
    slot_type?: string // morning | afternoon | evening | breakfast | lunch | …
    start_time?: string | null
    end_time?: string | null
    duration_minutes?: number | null
    notes?: string | null
    entity_id?: string | null
    entity_model?: string | null
    slot_data?: Record<string, unknown> | null
    location?: {
        latitude?: number | null
        longitude?: number | null
        address?: string | null
        city_id?: string | null
        [k: string]: unknown
    } | null
    booking_info?: Record<string, unknown> | null
    attachments?: Array<{
        id?: string
        type?: string
        name?: string
        url?: string
    }>
}

export interface PdfDay {
    date: string
    base_city?: { id?: string; name?: string; country?: string } | null
    destination_city?: { id?: string; name?: string; country?: string } | null
    notes?: string | null
    type?: string
    is_checkin_day?: boolean
    is_checkout_day?: boolean
    accommodation?: PdfSlot | null
    slots?: PdfSlot[]
}

export interface PdfStay {
    stay_id: string
    accommodation_id?: string | null
    zentrum_hub_id: string
    hotel_name: string
    hotel_image_url?: string | null
    city_id?: string | null
    latitude?: number | null
    longitude?: number | null
    check_in_date?: string | null
    check_out_date?: string | null
    nights?: number | null
    room_type?: string | null
    check_in_time?: string | null
    check_out_time?: string | null
}

export interface PdfTripContext {
    /** Trip id used to scope deep-link query params if needed. */
    trip_id: string
    /** Display name, used on the cover. */
    name?: string | null
    /** "Bali Trip 2026" type subtitle if available. */
    trip_sequence_id?: string | null
    start_date?: string | null
    end_date?: string | null
    /** Route summary used on the cover ("Goa → Bangalore → Singapore"). */
    destinations?: string[]
    /** Profile fields used by the stay-detail URL. */
    travel_purpose?: string | null
    group_type?: string | null
    adults?: number | null
    children?: number | null
    infants?: number | null
}

// Flat, pre-extracted shape so the PDF module never has to walk the
// ContentCollection Section/Block tree itself.
export interface PdfMustHaveLink {
    url: string
    title?: string
    description?: string
    buttonLabel?: string
    /** Platform logo URL mirroring the website's provider icon. Raster
     *  only — react-pdf <Image> can't render SVG, so SVG logos are dropped
     *  and callers fall back to LINK_ICON. */
    iconUrl?: string
}

export interface PdfMustHaveTextBlock {
    title?: string
    description?: string
    items?: string[]
}

export interface PdfMustHaveData {
    links?: PdfMustHaveLink[]
    visa?: PdfMustHaveTextBlock[]
    sim?: PdfMustHaveTextBlock[]
    tips?: PdfMustHaveTextBlock[]
}

// Compact tour deal — mirrors what TourCard reads from
// AdaptedTourResponseType, narrowed to the fields the PDF actually
// renders. The full website type carries more (mapping_id, visibility
// info, personal recommendation reason etc.) that the PDF skips.
export interface PdfTourDeal {
    id: string
    platform_name: string
    name: string | null
    rating: number | null
    /** Total duration in MINUTES. The website adapter normalises any
     *  unit into minutes already; we just pass through. */
    duration_minutes: number | null
    cancellation_policy: string | null
    price: {
        min_price: number | null
        currency: string | null
        price_type: string | null
    } | null
    link: string | null
    /** Used to pick a badge — "RECOMMENDED" (purple) when true. */
    is_recommended: boolean
}

export interface PdfData {
    trip: PdfTripContext
    days: PdfDay[]
    stays: PdfStay[]
    vouchers: Voucher[]
    mustHave?: PdfMustHaveData
    /** Tour deals keyed by experience_id (slot.entity_id). Optional —
     *  the PDF renders the View-deals link only when this is missing
     *  or the experience has no deals. */
    deals?: Record<string, PdfTourDeal[]>
    /** Absolute origin used for deep links (no trailing slash). Pass the
     *  prod URL if you want PDFs generated in dev to still link to prod. */
    origin: string
    /** Mapbox public token. Used for the route map on the overview page;
     *  omit to fall back to a text-only city list. */
    mapboxToken?: string
}
