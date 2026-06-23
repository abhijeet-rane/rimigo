import { type ReactNode } from 'react'
import {
    Plane,
    Car,
    Train,
    Bus,
    BedDouble,
    Wine,
    Clock,
    Navigation,
    Calendar,
    DollarSign,
    Map as MapIcon,
    X,
    Pencil,
    Trash2,
    Paperclip,
    ArrowRight,
    type LucideIcon
} from 'lucide-react'
import Typography from '@/components/shared/Typography'
import TipsList from '@/components/shared/TipsList'
import { SneakPeekAttachments } from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekAttachments'
import { capitalizeFirstLetter } from '@/utils/formatTextUtil'
import { canonicalizeMode, parseTransportTitle } from '../utils/transportTitle'
import { isTransportKind } from '../constants/transportKinds'
import { FlightEnrichmentBlock, getFlightEnrichment, resolveTransportLeg } from './transportSlotRenderers'

// Rimigo brand indigo — transport detail modal uses the on-brand
// indigo for every mode (flight/train/taxi/…) rather than per-kind
// tints. The design file's JSX maps every mode to the same BRAND
// constant.
const TRANSPORT_BRAND = '#7011F6'
const TRANSPORT_BRAND_PALE = '#F5EDFF'
const TRANSPORT_BRAND_DARK = '#4D1D91'

export const SLOT_DETAIL_KIND_STYLES: Record<string, { icon: LucideIcon; label: string; bg: string; text: string }> = {
    flight: { icon: Plane, label: 'Flight', bg: 'bg-red-50', text: 'text-red-600' },
    car: { icon: Car, label: 'Drive', bg: 'bg-teal-50', text: 'text-teal-700' },
    transfer: { icon: Car, label: 'Transfer', bg: 'bg-teal-50', text: 'text-teal-700' },
    taxi: { icon: Car, label: 'Taxi', bg: 'bg-teal-50', text: 'text-teal-700' },
    train: { icon: Train, label: 'Train', bg: 'bg-blue-50', text: 'text-blue-600' },
    bus: { icon: Bus, label: 'Bus', bg: 'bg-blue-50', text: 'text-blue-600' },
    shuttle: { icon: Bus, label: 'Shuttle', bg: 'bg-blue-50', text: 'text-blue-600' },
    boat: { icon: Bus, label: 'Boat', bg: 'bg-blue-50', text: 'text-blue-600' },
    ferry: { icon: Bus, label: 'Ferry', bg: 'bg-blue-50', text: 'text-blue-600' },
    meal: { icon: Wine, label: 'Meal', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    stay: { icon: BedDouble, label: 'Stay', bg: 'bg-orange-50', text: 'text-orange-600' },
    custom: { icon: Clock, label: 'Custom', bg: 'bg-amber-50', text: 'text-amber-700' }
}

export const SLOT_DETAIL_DEFAULT_STYLE = { icon: Clock, label: 'Activity', bg: 'bg-grey-5', text: 'text-grey-1' }

/**
 * Pick the right detail-panel style for a slot. When the slot is a
 * concrete kind (``flight``, ``train``, ``meal``, …) we match the
 * style map directly. When ``kind`` is the abstract ``transport``
 * (which the concierge now always writes), we canonicalize the
 * raw mode string from ``slot_data.mode`` — or fall back to parsing
 * the title — to get a concrete key like ``train`` / ``ferry`` /
 * ``car`` and render the matching pill. Without this the modal's
 * badge falls through to the ``Activity`` default, which is wrong
 * for transport slots.
 *
 * The returned ``label`` prefers the raw backend-provided mode string
 * (``"Shinkansen Nozomi 220"``) when we have one, so the pill shows
 * the agent's full mode phrase rather than a flattened canonical
 * ("Train"). Icon and colors always come from the canonical key.
 */
export function resolveSlotDetailStyle(event: any): {
    icon: LucideIcon
    label: string
    bg: string
    text: string
} {
    const kind = event?.kind || event?.type || ''
    const slotData = event?.slot_data || event?.slotData || {}
    const rawMode: string | null = (typeof slotData.mode === 'string' && slotData.mode.trim()) || null

    // Any transport-family kind — ``transport``, ``train``, ``tram``,
    // ``metro``, ``tuk-tuk``, ``auto-rickshaw``, ``ride-hail``, etc.
    // The 150-mode transport dropdown emits ~40 distinct backend
    // kinds; we only have pill styles for ~10 of them, so rather than
    // falling through to the "Activity" default we route every
    // transport kind through the same resolver: pick a pill style
    // from the canonical mode (or a ``car`` fallback) and show the
    // raw mode label as the chip text.
    if (isTransportKind(kind)) {
        const direct = SLOT_DETAIL_KIND_STYLES[kind]
        if (direct) {
            return { ...direct, label: rawMode || direct.label }
        }
        const canonical = canonicalizeMode(rawMode) || parseTransportTitle(event?.title)?.mode || null
        if (canonical && SLOT_DETAIL_KIND_STYLES[canonical]) {
            const base = SLOT_DETAIL_KIND_STYLES[canonical]
            return { ...base, label: rawMode || base.label }
        }
        const carStyle = SLOT_DETAIL_KIND_STYLES.car
        return { ...carStyle, label: rawMode || 'Transport' }
    }

    // Non-transport kinds with a direct style — meal, stay, custom, etc.
    const direct = SLOT_DETAIL_KIND_STYLES[kind]
    if (direct) return direct

    return SLOT_DETAIL_DEFAULT_STYLE
}

/**
 * True when an event is a transport slot that has all the data needed
 * to render the timeline hero (mode, both endpoints, both times).
 * Falls back to the generic title header when any of that is missing.
 */
export function isTransportSlotHeroRenderable(event: any): boolean {
    const kind = event?.kind || event?.type || ''
    if (!isTransportKind(kind)) return false
    const slotData = event?.slot_data || event?.slotData || {}
    const fromCity = slotData.from_city || parseTransportTitle(event?.title)?.from || ''
    const toCity = slotData.to_city || parseTransportTitle(event?.title)?.to || ''
    return Boolean(fromCity) && Boolean(toCity) && Boolean(event?.start) && Boolean(event?.end)
}

/** Resolve the canonical family label for the mode-strip eyebrow.
 *  Prefers the kind-level style label (``"Train"``, ``"Flight"``)
 *  over the raw phrase so the eyebrow stays short even when
 *  ``slot_data.mode`` carries the long service name (``"Shinkansen
 *  Nozomi 23"``). */
function getTransportFamilyLabel(event: any): string {
    const kind = event?.kind || event?.type || ''
    const slotData = event?.slot_data || event?.slotData || {}
    const rawMode = (typeof slotData.mode === 'string' && slotData.mode.trim()) || null
    const direct = SLOT_DETAIL_KIND_STYLES[kind]
    if (direct) return direct.label
    const canonical = canonicalizeMode(rawMode) || parseTransportTitle(event?.title)?.mode
    if (canonical && SLOT_DETAIL_KIND_STYLES[canonical]) {
        return SLOT_DETAIL_KIND_STYLES[canonical].label
    }
    return 'Transport'
}

/** Format a UTC timestamp as ``10:00 AM`` — matches the design
 *  (bigger time numerals + space + AM/PM). */
function formatTransportTime(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) return ''
    const h = date.getUTCHours()
    const m = date.getUTCMinutes()
    const hh = h % 12 === 0 ? 12 : h % 12
    const mm = m.toString().padStart(2, '0')
    const ap = h >= 12 ? 'PM' : 'AM'
    return `${hh}:${mm} ${ap}`
}

/** Format a UTC timestamp as ``Tue, Apr 14``. */
function formatTransportDate(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    })
}

/**
 * Parse a flight ``departure_time`` / ``arrival_time`` string into a
 * Date whose ``getUTC*`` accessors return the airport-local time. The
 * concierge persists these as naive local-tz strings (e.g.
 * ``"2026-06-14T10:00:00"``) — appending ``Z`` is the same trick
 * ``FlightTransportCard`` would use if it went through Date at all, and
 * matches how FullCalendar's normalized slot dates feed the existing
 * UTC-based ``formatTransportTime`` / ``formatTransportDate`` helpers.
 */
function parseFlightLocalIso(iso?: string | null): Date | null {
    if (!iso) return null
    const trimmed = String(iso).trim()
    if (!trimmed) return null
    const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : `${trimmed}Z`
    const d = new Date(normalized)
    return Number.isNaN(d.getTime()) ? null : d
}

/** UTC day-count difference between two timestamps — used to show
 *  the ``+1D`` overnight badge and per-endpoint dates. */
function transportDayOffset(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate) return 0
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0
    const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    return Math.max(0, Math.round((endUTC - startUTC) / 86_400_000))
}

/**
 * Transport-specific hero block for the detail modal. Big journey
 * header — brand-indigo mode-strip pill on top followed by a
 * From · duration-chip · To grid with times + cross-date badges.
 * Matches the Rimigo design-system transport details modal.
 *
 * ``onClose`` renders the in-header close pill. ``onEdit`` and
 * ``onDelete`` render the pencil / trash icons next to Close per
 * the handoff design; omit them when the caller doesn't have a
 * handler wired up and they disappear cleanly.
 */
export function TransportJourneyHeader({
    event,
    onClose,
    onEdit,
    onDelete
}: {
    event: any
    onClose?: () => void
    onEdit?: () => void
    onDelete?: () => void
}) {
    const style = resolveSlotDetailStyle(event)
    const Icon = style.icon
    const slotData = event?.slot_data || event?.slotData || {}
    const parsed = parseTransportTitle(event?.title)
    const fromCity = slotData.from_city || parsed?.from || ''
    const toCity = slotData.to_city || parsed?.to || ''
    const rawMode = (typeof slotData.mode === 'string' && slotData.mode.trim()) || null
    const familyLabel = getTransportFamilyLabel(event)
    // Title line under the eyebrow — prefer the full mode phrase,
    // fall back to the slot title (``"Flight from Tokyo to Osaka"``)
    // and finally to the family label.
    const titleLine = rawMode || (typeof event?.title === 'string' && event.title.trim()) || familyLabel

    // For fully-enriched flight slots, the journey times in slot_data.flight_data
    // are the airline-authoritative departure / arrival — the slot's own
    // start / end are calendar placement metadata that can drift from
    // the real schedule. Prefer the flight payload when both endpoints
    // parse; otherwise fall back to the slot times unchanged.
    const flightEnrichment = getFlightEnrichment(event)
    const flightStart = parseFlightLocalIso(flightEnrichment?.departure_time)
    const flightEnd = parseFlightLocalIso(flightEnrichment?.arrival_time)
    const useFlightTimes = !!(flightStart && flightEnd)
    const startDate = useFlightTimes ? flightStart! : event?.start instanceof Date ? event.start : new Date(event?.start)
    const endDate = useFlightTimes ? flightEnd! : event?.end instanceof Date ? event.end : new Date(event?.end)
    const durMin = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60_000))
    const durH = Math.floor(durMin / 60)
    const durM = durMin % 60
    // Design uses spaces between digit + unit — ``"2 h 12 m"``, ``"1 h"``,
    // ``"45 m"`` — to match the handoff JSX.
    const durLabel = durH > 0 && durM > 0 ? `${durH} h ${durM} m` : durH > 0 ? `${durH} h` : `${durM} m`
    const dayOffset = transportDayOffset(startDate, endDate)

    const startTimeStr = formatTransportTime(startDate)
    const endTimeStr = formatTransportTime(endDate)
    const startDateStr = formatTransportDate(startDate)
    const endDateStr = formatTransportDate(endDate)

    return (
        <div className="relative bg-white">
            {/* Mode strip */}
            <div className="flex items-center gap-2.5 border-b border-grey-4 px-4 py-3 sm:px-5">
                <div
                    className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px]"
                    style={{ background: TRANSPORT_BRAND }}
                    aria-hidden>
                    <Icon
                        size={16}
                        color="#fff"
                    />
                </div>
                <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
                    <span
                        className="truncate text-[10px] font-redhat font-bold uppercase tracking-[0.12em]"
                        style={{ color: TRANSPORT_BRAND_DARK }}>
                        {familyLabel}
                    </span>
                    <span className="truncate text-[14px] font-redhat font-semibold text-grey-0 leading-[18px]">{titleLine}</span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                    {onEdit ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            aria-label="Edit"
                            title="Edit"
                            className="grid h-8 w-8 place-items-center rounded-[8px] text-grey-1 transition-colors hover:bg-grey-5">
                            <Pencil size={15} />
                        </button>
                    ) : null}
                    {onDelete ? (
                        <button
                            type="button"
                            onClick={onDelete}
                            aria-label="Delete"
                            title="Delete"
                            className="grid h-8 w-8 place-items-center rounded-[8px] transition-colors hover:bg-red-50"
                            style={{ color: '#DC2626' }}>
                            <Trash2 size={15} />
                        </button>
                    ) : null}
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            title="Close"
                            className="grid h-8 w-8 place-items-center rounded-[8px] text-grey-1 transition-colors hover:bg-grey-5">
                            <X size={16} />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Journey row */}
            <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-4">
                    {/* From */}
                    <div className="min-w-0">
                        <div className="mb-1 truncate text-[10px] font-redhat font-semibold uppercase tracking-[0.12em] text-grey-2">From</div>
                        <div className="break-words text-[16px] font-redhat font-bold leading-[20px] tracking-[-0.01em] text-grey-0 sm:text-[18px] sm:leading-[22px]">
                            {capitalizeFirstLetter(String(fromCity))}
                        </div>
                        <div className="mt-2">
                            <div
                                className="flex items-center gap-1.5 text-[14px] font-redhat font-bold tabular-nums sm:text-[15px]"
                                style={{ color: TRANSPORT_BRAND_DARK }}>
                                <Clock
                                    size={13}
                                    color={TRANSPORT_BRAND}
                                />
                                {startTimeStr}
                            </div>
                            {dayOffset > 0 && startDateStr ? (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-manrope font-semibold text-grey-2">
                                    <Calendar
                                        size={11}
                                        className="text-grey-3"
                                    />
                                    {startDateStr}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Connector */}
                    <div className="flex min-w-[88px] flex-col items-center gap-1.5 pb-0.5 sm:min-w-[120px]">
                        <div
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-redhat font-bold tabular-nums"
                            style={{
                                background: TRANSPORT_BRAND_PALE,
                                color: TRANSPORT_BRAND_DARK,
                                letterSpacing: '0.02em'
                            }}>
                            {durLabel}
                        </div>
                        <svg
                            width="100%"
                            height="16"
                            viewBox="0 0 140 18"
                            preserveAspectRatio="none"
                            style={{ maxWidth: 120 }}
                            aria-hidden>
                            <circle
                                cx="4"
                                cy="9"
                                r="3"
                                fill={TRANSPORT_BRAND}
                            />
                            <path
                                d="M8 9 H126"
                                stroke={TRANSPORT_BRAND}
                                strokeWidth="1.4"
                                strokeDasharray="3 4"
                                strokeLinecap="round"
                            />
                            <path
                                d="M128 5l6 4-6 4"
                                stroke={TRANSPORT_BRAND}
                                strokeWidth="1.4"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {dayOffset === 0 && startDateStr ? (
                            <div className="flex items-center gap-1 text-[11px] font-manrope font-medium text-grey-2">
                                <Calendar
                                    size={11}
                                    className="text-grey-3"
                                />
                                {startDateStr}
                            </div>
                        ) : null}
                    </div>

                    {/* To */}
                    <div className="min-w-0 text-right">
                        <div className="mb-1 flex items-center justify-end gap-1.5 truncate text-[10px] font-redhat font-semibold uppercase tracking-[0.12em] text-grey-2">
                            To
                            {dayOffset > 0 ? (
                                <span
                                    className="rounded-full px-1.5 py-0.5 text-[10px] font-redhat font-bold text-white tracking-[0.04em]"
                                    style={{ background: TRANSPORT_BRAND }}>
                                    +{dayOffset}D
                                </span>
                            ) : null}
                        </div>
                        <div className="break-words text-[16px] font-redhat font-bold leading-[20px] tracking-[-0.01em] text-grey-0 sm:text-[18px] sm:leading-[22px]">
                            {capitalizeFirstLetter(String(toCity))}
                        </div>
                        <div className="mt-2">
                            <div
                                className="flex items-center justify-end gap-1.5 text-[14px] font-redhat font-bold tabular-nums sm:text-[15px]"
                                style={{ color: TRANSPORT_BRAND_DARK }}>
                                <Clock
                                    size={13}
                                    color={TRANSPORT_BRAND}
                                />
                                {endTimeStr}
                            </div>
                            {dayOffset > 0 && endDateStr ? (
                                <div
                                    className="mt-1 flex items-center justify-end gap-1 text-[11px] font-manrope font-semibold"
                                    style={{ color: TRANSPORT_BRAND_DARK }}>
                                    <Calendar
                                        size={11}
                                        color={TRANSPORT_BRAND}
                                    />
                                    {endDateStr}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/** Back-compat alias — existing callers reference ``TransportSlotHero``. */
export const TransportSlotHero = TransportJourneyHeader

/**
 * Pale-indigo gradient cost chip shown above the tips / attachments
 * body for transport slots. Design has a tile icon on the left, an
 * ``ESTIMATED COST`` eyebrow above the amount, and a right-aligned
 * cost label (``"Round trip · 2 adults"``) where available.
 */
export function TransportCostChip({ event }: { event: any }) {
    const cost = event?.estimated_cost
    if (cost === null || cost === undefined || cost === '' || cost === 0) return null
    const currency = event?.currency || ''
    const slotData = event?.slot_data || event?.slotData || {}
    const costLabel: string =
        (typeof slotData.cost_label === 'string' && slotData.cost_label.trim()) ||
        (typeof slotData.fare_label === 'string' && slotData.fare_label.trim()) ||
        ''

    return (
        <div
            className="flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5"
            style={{
                background: `linear-gradient(135deg, ${TRANSPORT_BRAND_PALE} 0%, #fff 120%)`,
                borderColor: `${TRANSPORT_BRAND}33`
            }}>
            <div
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-white"
                style={{
                    color: TRANSPORT_BRAND_DARK,
                    border: `1px solid ${TRANSPORT_BRAND}22`
                }}>
                <DollarSign
                    size={13}
                    color={TRANSPORT_BRAND_DARK}
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
                <span className="truncate text-[10px] font-redhat font-semibold uppercase tracking-[0.1em] text-grey-2">Estimated cost</span>
                <span className="mt-0.5 truncate text-[14px] font-redhat font-bold tabular-nums text-grey-0">
                    {currency ? `${currency} ` : ''}
                    {cost}
                </span>
            </div>
            {costLabel ? <span className="max-w-[140px] text-right text-[11px] font-manrope font-medium text-grey-2">{costLabel}</span> : null}
        </div>
    )
}

/** Google Maps travel mode param inferred from the slot's kind /
 *  mode string. Flight gets ``transit`` (Maps doesn't route flights). */
function inferGoogleTravelMode(event: any): 'driving' | 'transit' | 'walking' {
    const kind = String(event?.kind || '').toLowerCase()
    const slotData = event?.slot_data || event?.slotData || {}
    const rawMode = String(slotData.mode || '').toLowerCase()
    const haystack = `${kind} ${rawMode}`
    if (/\b(walk|walking|foot|hike|hiking|trek|trekking)\b/.test(haystack)) {
        return 'walking'
    }
    if (/\b(flight|train|bullet|shinkansen|metro|subway|underground|tram|bus|coach|shuttle|ferry|boat|cruise|rail|monorail|tube)\b/.test(haystack)) {
        return 'transit'
    }
    return 'driving'
}

/**
 * Build a Google Maps directions URL for a transport slot.
 * Prefers lat/lng when the enricher captured them on the slot's
 * ``from_location`` / ``to_location``; otherwise uses the place
 * names as search strings. Returns ``null`` when the slot doesn't
 * have enough data to build a usable link.
 */
export function getTransportDirectionsUrl(event: any): string | null {
    if (!event) return null
    const kind = event?.kind || event?.type || ''
    if (!isTransportKind(kind)) return null
    const slotData = event?.slot_data || event?.slotData || {}
    const parsed = parseTransportTitle(event?.title)

    const fromName: string = slotData.from_city || parsed?.from || ''
    const toName: string = slotData.to_city || parsed?.to || ''

    const fromLoc = slotData.from_location || slotData.origin_location
    const toLoc = slotData.to_location || slotData.destination_location

    const latLng = (loc: any): string | null => {
        if (!loc || typeof loc !== 'object') return null
        const lat = loc.latitude ?? loc.lat
        const lng = loc.longitude ?? loc.lng
        if (lat == null || lng == null) return null
        const latNum = Number(lat)
        const lngNum = Number(lng)
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null
        return `${latNum},${lngNum}`
    }

    const origin = latLng(fromLoc) || (fromName && encodeURIComponent(fromName))
    const destination = latLng(toLoc) || (toName && encodeURIComponent(toName))
    if (!origin || !destination) return null

    const travelmode = inferGoogleTravelMode(event)
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelmode}`
}

/**
 * Footer action row for transport slots — renders the "View on
 * map" link (opens Google Maps with directions pre-filled) and,
 * when an ``onEdit`` callback is provided, a primary Edit button.
 */
export function TransportDetailFooter({ event, onEdit }: { event: any; onEdit?: () => void }) {
    const mapUrl = getTransportDirectionsUrl(event)
    if (!mapUrl && !onEdit) return null
    return (
        <div className="flex items-center justify-end gap-2 border-t border-grey-4 bg-grey-5 px-4 py-3 sm:px-5">
            {mapUrl ? (
                <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-grey-4 bg-white px-3 py-1.5 text-[12px] font-redhat font-semibold text-grey-1 transition-colors hover:bg-white hover:border-grey-3"
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <MapIcon
                        size={13}
                        className="text-grey-1"
                    />
                    View on map
                </a>
            ) : null}
            {onEdit ? (
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-redhat font-semibold text-white transition-transform active:scale-[0.98]"
                    style={{
                        background: TRANSPORT_BRAND,
                        border: `1px solid ${TRANSPORT_BRAND}`,
                        boxShadow: `0 2px 6px ${TRANSPORT_BRAND}40`
                    }}>
                    <Pencil
                        size={13}
                        color="#fff"
                    />
                    Edit
                </button>
            ) : null}
        </div>
    )
}

/**
 * Transport-specific empty state — shown inside the modal body
 * when the slot has no notes / suggestions / attachments / cost /
 * booking. Brand-pale circle with the mode icon, a short headline,
 * a subhead, and ``Add notes`` + ``Attach file`` CTAs that call
 * ``onEdit`` (both jump into the edit flow). Matches the design.
 */
export function TransportEmptyState({ event, onEdit }: { event: any; onEdit?: () => void }) {
    const style = resolveSlotDetailStyle(event)
    const Icon = style.icon
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <div
                className="grid h-11 w-11 place-items-center rounded-full"
                style={{ background: TRANSPORT_BRAND_PALE }}
                aria-hidden>
                <Icon
                    size={20}
                    color={TRANSPORT_BRAND_DARK}
                />
            </div>
            <div className="text-[14px] font-redhat font-semibold text-grey-0 tracking-[-0.01em]">Route set — nothing else to plan</div>
            <div className="max-w-[320px] text-[12px] font-manrope font-medium leading-[18px] text-grey-2">
                Add notes, upload booking confirmations, or let Rimigo suggest tips for this leg of the journey.
            </div>
            <div className="mt-1 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onEdit}
                    disabled={!onEdit}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-grey-4 bg-white px-3 py-1.5 text-[12px] font-redhat font-semibold text-grey-1 transition-colors hover:border-grey-3 disabled:cursor-default disabled:opacity-60">
                    <Pencil
                        size={12}
                        className="text-grey-1"
                    />
                    Add notes
                </button>
                <button
                    type="button"
                    onClick={onEdit}
                    disabled={!onEdit}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-grey-4 bg-white px-3 py-1.5 text-[12px] font-redhat font-semibold text-grey-1 transition-colors hover:border-grey-3 disabled:cursor-default disabled:opacity-60">
                    <Paperclip
                        size={12}
                        className="text-grey-1"
                    />
                    Attach file
                </button>
            </div>
        </div>
    )
}

/** True when a transport slot has no body content — no cost, no
 *  notes, no suggestions, no attachments, no booking details. */
export function isTransportDetailEmpty(event: any): boolean {
    const notes = typeof event?.notes === 'string' ? event.notes.trim() : ''
    const suggestions = getSlotSuggestionStrings(event)
    const attachments = getSlotAttachmentsList(event)
    const booking = event?.booking_info
    const hasBooking = booking && typeof booking === 'object' && Object.keys(booking).length > 0
    const cost = event?.estimated_cost
    return (
        !notes &&
        suggestions.length === 0 &&
        attachments.length === 0 &&
        !hasBooking &&
        (cost === null || cost === undefined || cost === '' || cost === 0)
    )
}

export function formatSlotDetailTime(dateStr: string | Date | null) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const hours = d.getUTCHours()
    const minutes = d.getUTCMinutes()
    const period = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`
}

export function getSlotAttachmentsList(event: any): unknown[] {
    const raw = event?.attachments ?? event?.slotData?.attachments ?? event?.slot_data?.attachments ?? []
    return Array.isArray(raw) ? raw : []
}

export function getSlotSuggestionStrings(event: any): string[] {
    const r = event?.suggestion_reasons
    if (!Array.isArray(r)) return []
    return r.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()))
}

/** Inline meta for kanban cards: attachment count + notes flag */
export function getKanbanSlotMetaFlags(event: any) {
    const attachments = getSlotAttachmentsList(event)
    const attachmentCount = attachments.length
    const hasNotes = Boolean(typeof event?.notes === 'string' && event.notes.trim())
    return { attachmentCount, hasNotes }
}

type SlotDetailPanelBodyProps = {
    event: any
    /** Extra block after main content (e.g. “View full experience”) */
    footer?: ReactNode
    /** Threaded from the slot-detail modal containers so the embedded
     *  flight-enrichment Book CTA can dismiss the (portal-rendered)
     *  modal before navigating to FlightsTab live search. */
    onClose?: () => void
}

export function SlotDetailPanelBody({ event, footer, onClose }: SlotDetailPanelBodyProps) {
    const style = resolveSlotDetailStyle(event)
    const Icon = style.icon
    const kind = event?.kind || event?.type || ''

    const notes = (event?.notes && String(event.notes)) || ''
    const suggestions = getSlotSuggestionStrings(event)
    const attachments = getSlotAttachmentsList(event)
    const estimatedCost = event?.estimated_cost
    const bookingInfo = event?.booking_info

    // Transport enrichment: leg (venue or city pair) + Kayak flight
    // card (logo, price, booking CTA). Only the agent's flight slots
    // get the rich card; descriptive cabs/trains just show the leg.
    // Uses ``isTransportKind`` (from constants/transportKinds) so the
    // accepted set stays in lockstep with the rest of the file.
    const isTransport = isTransportKind(kind)
    const slotData = event?.slot_data || event?.slotData || {}
    const transportLeg = isTransport ? resolveTransportLeg(slotData, event?.title) : null
    const flightData = isTransport ? getFlightEnrichment(event) : null

    const hasContent =
        Boolean(notes.trim()) ||
        suggestions.length > 0 ||
        attachments.length > 0 ||
        estimatedCost ||
        (bookingInfo && typeof bookingInfo === 'object' && Object.keys(bookingInfo).length > 0) ||
        transportLeg !== null ||
        flightData !== null

    return (
        <>
            {hasContent ? (
                <div className="flex flex-col [&>*+*]:mt-4 [&>*+*]:pt-4 [&>*+*]:border-t [&>*+*]:border-grey-4">
                    {(transportLeg || flightData) && (
                        <div className="flex flex-col gap-2">
                            {transportLeg && (
                                <div className="p-3 bg-grey-5 rounded-xl flex items-center justify-between gap-3">
                                    <Typography
                                        size="13"
                                        weight="semibold"
                                        family="manrope"
                                        color="grey-0"
                                        className="flex items-center gap-2 min-w-0">
                                        <span className="truncate">{transportLeg.from}</span>
                                        <ArrowRight
                                            size={14}
                                            className="text-grey-2 shrink-0"
                                        />
                                        <span className="truncate">{transportLeg.to}</span>
                                    </Typography>
                                    {transportLeg.mode && (
                                        <span className="text-[10px] font-semibold font-manrope uppercase tracking-wide text-grey-2 shrink-0">
                                            {transportLeg.mode}
                                        </span>
                                    )}
                                </div>
                            )}
                            {flightData && (
                                <FlightEnrichmentBlock
                                    flight={flightData}
                                    variant="detail"
                                    onClose={onClose}
                                />
                            )}
                        </div>
                    )}
                    {bookingInfo && typeof bookingInfo === 'object' && Object.keys(bookingInfo).length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <Typography
                                size="13"
                                weight="semibold"
                                family="manrope"
                                color="grey-1">
                                Booking Details
                            </Typography>
                            <div className="p-3 bg-grey-5 rounded-xl space-y-1.5">
                                {Object.entries(bookingInfo).map(([key, value]) => {
                                    if (!value || typeof value === 'object') return null
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-2">
                                            <Typography
                                                size="12"
                                                weight="medium"
                                                family="manrope"
                                                color="grey-2"
                                                className="capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </Typography>
                                            <Typography
                                                size="12"
                                                weight="semibold"
                                                family="manrope"
                                                color="grey-0"
                                                className="text-right">
                                                {String(value)}
                                            </Typography>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {attachments.length > 0 && <SneakPeekAttachments attachments={attachments as any} />}
                    {(notes.trim() || suggestions.length > 0) && (
                        <TipsList
                            notes={notes}
                            suggestions={suggestions}
                        />
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div className={`w-12 h-12 rounded-full ${style.bg} flex items-center justify-center`}>
                        <Icon
                            size={20}
                            className={style.text}
                        />
                    </div>
                    <Typography
                        size="13"
                        weight="medium"
                        family="manrope"
                        color="grey-3">
                        No additional details
                    </Typography>
                </div>
            )}
            {footer ? <div className="pt-3 pb-1">{footer}</div> : null}
        </>
    )
}

const _HIDE_COST_KINDS = new Set(['meal', 'place'])

export function slotDetailHeaderDerived(event: any) {
    const kind = event?.kind || event?.type || ''
    const style = resolveSlotDetailStyle(event)
    const title = event?.title || style.label
    const startTime = formatSlotDetailTime(event?.start_time || event?.start)
    const endTime = formatSlotDetailTime(event?.end_time || event?.end)
    const timeRange = startTime && endTime && startTime !== endTime ? `${startTime} – ${endTime}` : startTime || ''
    const estimatedCost = _HIDE_COST_KINDS.has(kind) ? null : event?.estimated_cost
    const currency = event?.currency || ''
    return { style, title, timeRange, estimatedCost, currency }
}

/** Resolve the venue/restaurant name from slot_data for modal display.
 *  Falls back to the slot title if slot_data.name is empty.
 *
 *  Place slots are intentionally skipped — the user-entered title
 *  ("Morning hike at Fushimi Inari") is the authoritative label for
 *  that slot type, even when a Google Place is attached behind it. */
export function getSlotVenueName(event: any): string | null {
    const kind = event?.kind || event?.type
    if (kind === 'place') return null
    return event?.slot_data?.name || event?.slotData?.name || null
}

/** Build a directions URL from the event's location data.
 *  Priority: google_maps_uri > lat/lng constructed URL > null */
export function getSlotDirectionsUrl(event: any): string | null {
    const mapsUri = event?.slot_data?.google_maps_uri || event?.slotData?.google_maps_uri
    if (mapsUri) return mapsUri

    const loc = event?.location || event?.slot_data?.location || event?.slotData?.location
    const lat = loc?.latitude
    const lng = loc?.longitude
    if (lat != null && lng != null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    }

    return null
}

/** Directions button — opens Google Maps in a new tab. Only renders
 *  when a directions URL is available. */
export function DirectionsButton({ event }: { event: any }) {
    const url = getSlotDirectionsUrl(event)
    if (!url) return null

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <Navigation
                size={12}
                className="text-blue-600"
            />
            <span className="text-[12px] font-semibold font-manrope text-blue-600">Directions</span>
        </a>
    )
}
