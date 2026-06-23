/**
 * Client for the trip-scoped Vouchers feature.
 *
 * Endpoints (krysto):
 *   POST   /api/trips/<trip_id>/vouchers/         Bulk-create from attachment IDs
 *   GET    /api/trips/<trip_id>/vouchers/         List
 *   GET    /api/vouchers/<id>/                    Detail / poll
 *   DELETE /api/vouchers/<id>/                    Remove
 *   GET    /api/vouchers/<id>/stream/             SSE stream of status events
 *
 * Voucher upload is a 3-step flow that piggybacks on the existing Attachment
 * pipeline (presigned S3 PUT) and finishes with the voucher bulk-create call:
 *
 *   1. createUploadAttachment({kind:'voucher', …}) → presigned_url + attachment_id
 *   2. putFileToS3(presigned_url, file)
 *   3. createTripVouchers(tripId, {attachment_ids:[…]}) → Voucher[] in 'queued'
 *      state; extraction Celery tasks fire in parallel; FE subscribes to
 *      `/api/vouchers/<id>/stream/` for live transitions.
 */
import apiClient from '@/lib/api/apiClient'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

export type VoucherStatus = 'queued' | 'processing' | 'extracted' | 'failed'

export type VoucherCategory =
    | 'flight'
    | 'hotel'
    | 'activity'
    | 'transfer'
    | 'visa'
    | 'other'

/**
 * Free-form bag for category-specific affordances. All optional —
 * the AI fills what's present on the document, the rest is null.
 * The renderer should treat absent / null fields as "this affordance
 * doesn't apply" rather than "this booking is incomplete."
 */
export type VoucherCategoryData = {
    // ── Flight ───────────────────────────────────────────────────────
    flight_number?: string | null
    seat?: string | null
    gate?: string | null
    terminal?: string | null
    fare_class?: string | null
    baggage?: string | null
    departure_airport?: string | null
    arrival_airport?: string | null
    departure_airport_code?: string | null
    arrival_airport_code?: string | null
    departure_city?: string | null
    arrival_city?: string | null
    duration_minutes?: number | null
    webcheckin_url?: string | null

    // ── Hotel ────────────────────────────────────────────────────────
    room_no?: string | null
    room_type?: string | null
    nights?: number | null
    guests_count?: number | null
    breakfast_included?: boolean | null
    check_in_time?: string | null
    check_out_time?: string | null
    cancellation_policy?: string | null

    // ── Activity / experience ────────────────────────────────────────
    ticket_type?: string | null
    guests?: number | null
    duration?: string | null
    meeting_point?: string | null
    language?: string | null
    included?: string | null
    confirmation_url?: string | null

    // ── Transfer / cab / private car ─────────────────────────────────
    pickup_location?: string | null
    dropoff_location?: string | null
    vehicle_type?: string | null
    vehicle_number?: string | null
    driver_name?: string | null
    driver_phone?: string | null

    // ── Visa ─────────────────────────────────────────────────────────
    visa_type?: string | null
    visa_number?: string | null
    entries?: string | null
    valid_from?: string | null
    valid_until?: string | null
    country?: string | null

    /** Catch-all for fields the AI may surface that we don't model yet. */
    [k: string]: unknown
}

export type VoucherLocation = {
    name?: string | null
    address?: string | null
    lat?: number | null
    lng?: number | null
}

export type VoucherExtracted = {
    title?: string | null
    start_datetime?: string | null
    end_datetime?: string | null
    timezone?: string | null
    location?: VoucherLocation | null
    booking_ref?: string | null
    pnr?: string | null
    passengers?: string[] | null
    provider?: string | null
    category_data?: VoucherCategoryData
    /** One short AI-generated tip surfaced as a pill below the title — e.g.
     *  "Arrive at least 3 hours early", "Carry printed copy". Null when
     *  the model has nothing useful to say. */
    advisory?: string | null
    raw_text?: string | null
}

/** Itinerary sync state — set when the voucher is attached to a slot
 *  via `attach_voucher_to_slot`. Null when not synced. */
export type VoucherSyncedSlot = {
    /** 1-based day number in the itinerary. */
    day: number
    /** Stable slot identifier (server-generated). */
    slot_id?: string | null
    /** Slot title at the time of enrichment (display only — may drift if
     *  the user later renames the slot). */
    slot_title?: string | null
    /** ISO 8601 start time of the synced slot. */
    slot_start?: string | null
}

export type Voucher = {
    voucher_id: string
    trip_id: string
    attachment_id: string
    status: VoucherStatus
    category: VoucherCategory | null
    extracted: VoucherExtracted
    confidence: number | null
    error_code: string | null
    error_reason: string | null
    created_at: string
    extracted_at: string | null
    // ─── File access (enriched server-side per list/detail request) ───
    /** Presigned GET URL for the original uploaded file. 6-hour expiry —
     *  refresh by refetching the list / detail. Null when the wrapped
     *  attachment was deleted or had no S3 key. */
    file_url?: string | null
    /** Original upload filename for tooltip / fallback label. */
    filename?: string | null
    /** Mime type — drives inline preview vs. open-in-new-tab in the FE. */
    mime_type?: string | null
    /** Set when the voucher has been linked to an itinerary slot. */
    synced_slot?: VoucherSyncedSlot | null
}

type Envelope<T> = {
    message?: string
    response_code?: string
    data?: T
} & Partial<T>

const unwrap = <T,>(envelope: Envelope<T>): T => {
    if (envelope?.data !== undefined && envelope?.data !== null) return envelope.data as T
    return envelope as unknown as T
}

export const createTripVouchers = async (
    tripId: string,
    attachmentIds: string[]
): Promise<{ vouchers: Voucher[] }> => {
    try {
        const resp = await apiClient.post(`/api/trips/${tripId}/vouchers/`, {
            attachment_ids: attachmentIds,
        })
        return unwrap<{ vouchers: Voucher[] }>(resp.data)
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const listTripVouchers = async (tripId: string): Promise<Voucher[]> => {
    try {
        const resp = await apiClient.get(`/api/trips/${tripId}/vouchers/`)
        return unwrap<{ vouchers: Voucher[] }>(resp.data).vouchers ?? []
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const getVoucher = async (voucherId: string): Promise<Voucher> => {
    try {
        const resp = await apiClient.get(`/api/vouchers/${voucherId}/`)
        return unwrap<Voucher>(resp.data)
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const deleteVoucher = async (voucherId: string): Promise<void> => {
    try {
        await apiClient.delete(`/api/vouchers/${voucherId}/`)
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/** Endpoint path for the per-voucher SSE stream (consumed by the SSE hook). */
export const voucherStreamPath = (voucherId: string): string =>
    `/api/vouchers/${voucherId}/stream/`
