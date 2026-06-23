/**
 * Itinerary transport-slot extraction + provider derivation for the Bookings
 * tab. rimigo_internal users see the itinerary's own transport legs (trains,
 * cars, transfers, ferries…) listed alongside curated bookings so they can
 * spot which legs already carry a booking link — and (Pass 2) promote them
 * into curated Transport items.
 *
 * Non-flight only: flights own the Flights tab + budget flights handling, so
 * ``kind === 'flight'`` / ``entity_model === 'flights'`` / a ``flight_data``
 * payload are excluded here.
 */
import { isTransportKind } from '@/modules/Itinerary/constants/transportKinds'
import { getFlightEnrichment, resolveTransportLeg } from '@/modules/Itinerary/components/transportSlotRenderers'
import { resolveCuratedProviderLogo } from '../../api/curatedBookingsApi'
import type { CuratedBookingItem, CuratedBookingItemPayload } from '../../api/curatedBookingsApi'

/** Registrable-domain → canonical provider name. Names align with
 *  ``CURATED_PROVIDER_OPTIONS`` where possible so the brand logo resolves and
 *  a Pass-2 "add to curated" persists a recognised provider. */
const PROVIDER_DOMAIN_MAP: Record<string, string> = {
    klook: 'Klook',
    getyourguide: 'GetYourGuide',
    viator: 'Viator',
    headout: 'Headout',
    booking: 'Booking.com',
    agoda: 'Agoda',
    expedia: 'Expedia',
    trip: 'Trip.com',
    makemytrip: 'MakeMyTrip',
    goibibo: 'Goibibo',
    cleartrip: 'Cleartrip',
    airbnb: 'Airbnb',
    '12go': '12Go',
    '12goasia': '12Go',
    redbus: 'redBus',
    omio: 'Omio',
    trainline: 'Trainline',
    rentalcars: 'Rentalcars',
    grab: 'Grab',
    bolt: 'Bolt',
    uber: 'Uber',
    blablacar: 'BlaBlaCar',
    kiwi: 'Kiwi.com'
}

/** Query params affiliate/redirect wrappers use to carry the real destination
 *  URL (e.g. ``affiliate.klook.com/redirect?...&k_site=<encoded klook url>``).
 *  We unwrap so the provider reads from the true target, not the wrapper. */
const REDIRECT_TARGET_PARAMS = ['k_site', 'url', 'u', 'r', 'redirect', 'dest', 'to', 'target']

export interface DerivedProvider {
    /** Display name (catalog-canonical when recognised, else title-cased domain). */
    name: string
    /** Bare host (``www.`` stripped) of the resolved destination. */
    host: string
    /** Brand logo when the provider is in the curated catalog, else null. */
    logoUrl: string | null
    /** Favicon fallback for unknown providers. */
    faviconUrl: string
}

const titleCase = (value: string): string => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value)

/** Multi-part TLD tails where the registrable label sits one level deeper
 *  (``klook.co.uk`` → ``klook``, ``klook.com.au`` → ``klook``). */
const TWO_PART_TLD_HEADS = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'])

const registrableLabel = (host: string): string => {
    const clean = host.replace(/^www\./i, '')
    const labels = clean.split('.')
    if (labels.length <= 2) return labels[0] || clean
    return TWO_PART_TLD_HEADS.has(labels[labels.length - 2]) ? labels[labels.length - 3] : labels[labels.length - 2]
}

/** Derive the booking provider from an attachment URL. Unwraps affiliate
 *  redirect wrappers, then maps the registrable domain to a brand name.
 *  Returns null for empty/unparseable URLs. */
export const deriveProviderFromUrl = (rawUrl: string | null | undefined): DerivedProvider | null => {
    if (!rawUrl) return null
    let parsed: URL
    try {
        parsed = new URL(rawUrl)
    } catch {
        return null
    }
    // Prefer an embedded target URL when the link is an affiliate wrapper.
    for (const param of REDIRECT_TARGET_PARAMS) {
        const candidate = parsed.searchParams.get(param)
        if (candidate && /^https?:/i.test(candidate)) {
            try {
                parsed = new URL(candidate)
                break
            } catch {
                /* keep the wrapper URL */
            }
        }
    }
    const host = parsed.hostname.replace(/^www\./i, '')
    const label = registrableLabel(parsed.hostname).toLowerCase()
    const name = PROVIDER_DOMAIN_MAP[label] || titleCase(label)
    const logoUrl = resolveCuratedProviderLogo({ provider_name: name, provider_logo: null })
    return { name, host, logoUrl, faviconUrl: `https://www.google.com/s2/favicons?domain=${host}&sz=64` }
}

export interface ItineraryTransportSlot {
    slot_id: string
    /** ISO date of the day the slot sits on. */
    date: string | null
    kind: string
    mode: string | null
    from: string | null
    to: string | null
    title: string
    cityName: string | null
    estimatedCost: number | null
    currency: string | null
    /** First attachment carrying a real http(s) link, if any. */
    link: string | null
    attachmentName: string | null
    /** Provider derived from ``link`` — null when the slot has no booking link. */
    provider: DerivedProvider | null
}

const firstHttpLink = (attachments: unknown): { url: string; name: string | null } | null => {
    if (!Array.isArray(attachments)) return null
    for (const att of attachments) {
        const url = (att as { url?: unknown })?.url
        if (typeof url === 'string' && /^https?:/i.test(url)) {
            return { url, name: ((att as { name?: unknown })?.name as string) || null }
        }
    }
    return null
}

/** Flatten an itinerary's days into its non-flight transport slots, deriving a
 *  booking provider from each slot's attachment link where present. Used by the
 *  internal-only "Itinerary transport" listing in the Bookings tab. */
interface RawSlot {
    slot_id?: string
    order?: number
    kind?: string
    title?: string
    entity_model?: string
    estimated_cost?: number
    currency?: string
    slot_data?: { mode?: string } & Record<string, unknown>
    city?: { name?: string }
    attachments?: unknown
}

interface RawDay {
    date?: string
    base_city?: { name?: string } | null
    slots?: unknown
}

export const extractItineraryTransportSlots = (
    itinerary: { days?: RawDay[] } | null | undefined
): ItineraryTransportSlot[] => {
    const out: ItineraryTransportSlot[] = []
    for (const day of itinerary?.days || []) {
        if (!Array.isArray(day?.slots)) continue
        for (const slot of day.slots) {
            const s = slot as RawSlot
            const kind = s?.kind
            if (!isTransportKind(kind)) continue
            // Exclude flights — owned by the Flights tab + budget handling.
            if (kind === 'flight' || s?.entity_model === 'flights' || getFlightEnrichment(s)) continue

            const leg = resolveTransportLeg(s?.slot_data, s?.title)
            const linkAtt = firstHttpLink(s?.attachments)
            out.push({
                slot_id: s?.slot_id || `${day.date || ''}-${s?.order ?? ''}`,
                date: day.date || null,
                kind: kind as string,
                mode: leg?.mode || s?.slot_data?.mode || null,
                from: leg?.from || null,
                to: leg?.to || null,
                title: s?.title || '',
                cityName: s?.city?.name || day.base_city?.name || null,
                estimatedCost: typeof s?.estimated_cost === 'number' ? s.estimated_cost : null,
                currency: s?.currency || null,
                link: linkAtt?.url || null,
                attachmentName: linkAtt?.name || null,
                provider: deriveProviderFromUrl(linkAtt?.url)
            })
        }
    }
    return out
}

// ── Mapping itinerary legs → curated transport bookings ──────────────────────

/** Itinerary transport kind → canonical curated subtype preset. Keeps the type
 *  on a known preset (resolves in the modal dropdown + maps to the right icon)
 *  instead of a free-text mode like "Private car". Mirrors the modal's
 *  SUBTYPE_SUGGESTIONS and the card's SUBTYPE_ICON_RULES. */
const KIND_TO_SUBTYPE: Record<string, string> = {
    transfer: 'Transfer',
    shuttle: 'Transfer',
    taxi: 'Transfer',
    'ride-hail': 'Transfer',
    'shared-cab': 'Transfer',
    train: 'Train',
    metro: 'Metro',
    subway: 'Metro',
    tram: 'Metro',
    monorail: 'Metro',
    'light-rail': 'Metro',
    bus: 'Bus',
    coach: 'Bus',
    minibus: 'Bus',
    car: 'Car Rental',
    'car-rental': 'Car Rental',
    private_transport: 'Car Rental',
    campervan: 'Car Rental',
    ferry: 'Ferry',
    boat: 'Ferry',
    speedboat: 'Ferry',
    cruise: 'Ferry',
    houseboat: 'Ferry',
    'water-taxi': 'Ferry'
}

/** Curated subtype for the item (≤30 chars per serializer). Canonical preset by
 *  kind where known, else the title-cased authored mode/kind. */
const legSubtype = (slot: ItineraryTransportSlot): string => {
    const mapped = slot.kind ? KIND_TO_SUBTYPE[slot.kind] : undefined
    if (mapped) return mapped
    const raw = slot.mode || slot.kind || 'Transport'
    return (raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[-_]/g, ' ')).slice(0, 30)
}

/** Curated title — the route when structured, else the slot title (≤120). */
export const legTitle = (slot: ItineraryTransportSlot): string =>
    (slot.from && slot.to ? `${slot.from} → ${slot.to}` : slot.title || legSubtype(slot)).slice(0, 120)

/** A leg is "complete" — directly addable without the editor — when it carries
 *  a booking link, a positive price, and a title. Anything missing routes
 *  through the prefilled modal so the internal user can fill the gap. */
export const isLegComplete = (slot: ItineraryTransportSlot): boolean =>
    !!slot.link && slot.estimatedCost != null && slot.estimatedCost > 0 && !!legTitle(slot)

/** What's missing on an incomplete leg — drives the modal-prompt hint. */
export const legMissingFields = (slot: ItineraryTransportSlot): string[] => {
    const missing: string[] = []
    if (!slot.link) missing.push('link')
    if (slot.estimatedCost == null || slot.estimatedCost <= 0) missing.push('price')
    if (!legTitle(slot)) missing.push('title')
    return missing
}

/** Map a leg to a curated Transport payload. Catalog logos that aren't http
 *  URLs are dropped (backend validates ``provider_logo`` as a URL; the name
 *  re-resolves the logo at render). cta_type follows what data we have. */
export const legToCuratedPayload = (slot: ItineraryTransportSlot): CuratedBookingItemPayload => {
    const price = slot.estimatedCost != null && slot.estimatedCost > 0 ? slot.estimatedCost : null
    const logo = slot.provider?.logoUrl
    return {
        category: 'transport',
        subtype: legSubtype(slot),
        title: legTitle(slot),
        // Itinerary legs are date-bound — carry the day's date so the card
        // shows it (trip-spanning passes added manually stay date-less).
        date: slot.date,
        image: null,
        description: null,
        badge: null,
        sort_order: 0,
        is_visible: true,
        offers: [
            {
                provider_name: slot.provider?.name || '',
                provider_logo: logo && logo.startsWith('http') ? logo : null,
                cta_type: price != null && slot.link ? 'price_link' : slot.link ? 'book_now' : 'get_quote',
                price,
                currency: slot.currency || 'INR',
                price_unit: price != null ? 'per_person' : null,
                link: slot.link || null,
                tags: []
            }
        ]
    }
}

/** Seed a CuratedBookingItem (no ``item_id``) to prefill the create modal for
 *  an incomplete leg. The modal reads title/subtype/image/is_visible/offers and
 *  ignores ``item_id``; the empty id keeps it on the "Add" (create) path.
 *  Offers are forced to ``price_link`` so the modal's own validation requires
 *  the missing price + link before the internal user can save. */
export const legToCuratedSeed = (slot: ItineraryTransportSlot): CuratedBookingItem => {
    const payload = legToCuratedPayload(slot)
    return {
        item_id: '',
        ...payload,
        offers: payload.offers.map((offer) => ({ ...offer, cta_type: 'price_link' }))
    }
}
