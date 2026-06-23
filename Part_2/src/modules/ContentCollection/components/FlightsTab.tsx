import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { useIsMobile } from '@/hooks/use-mobile'
import { ArrowUpRight, Loader, Trash2, Link2, Pencil, X, Sparkles, Plus, Heart, ExternalLink, Plane } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'
import { travelerCollectionApi } from '../api/travelerCollectionApi'
import type { ApiResponse } from '../types/contentCollection'
import type { FlightLeg, FlightLegPayload } from '../api/travelerCollectionApi'
import { addSlot, updateSlot, deleteSlot, type SlotPayload } from '@/modules/Itinerary/api/ItineraryApi'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import CustomShimmer from '@/components/shared/Shimmer'
import { PROVIDER_HORIZONRAL_LOGOS } from '@/constants/providerLogos'
import FlightPriceChangePill, { purgeStaleFlightPriceBaselines } from './FlightPriceChangePill'
import LegStrip from './flights/LegStrip'
import LegEditModal from './flights/LegEditModal'
import FlightsViewToggle, { type FlightsView } from './flights/FlightsViewToggle'
import FlightExploreView, { type ExploreFlight } from './flights/FlightExploreView'
import AnchorFlightCard, { hasAnchorFlightSignal } from './flights/AnchorFlightCard'
// AddFlightToItineraryModal removed — "Add to Itinerary" now auto-triggers
// the concierge directly via buildAddFlightPrompt + triggerAssistantPrompt,
// passing the flight's rimigo_id so the BE resolves it from cache (no re-search).
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

const SKYSCANNER_WORDMARK_URL = PROVIDER_HORIZONRAL_LOGOS.SKYSCANNER

interface ManualOffer {
    provider: 'skyscanner'
    url: string
    price?: number | null
}

interface FlightSection {
    id: string
    section_type: string
    title: string
    entity_id: string
    entity_type: string
    metadata: {
        reference_id: string
        segments: Array<{
            airline: { code: string; name: string; flight_number: string }
            origin: {
                airport_code: string
                airport_name: string
                city_code: string
                city_name: string
                departure_time: string
                /** Optional terminal label. May be 'N/A' / empty for providers
                 *  that don't surface it; rendered only when meaningfully populated. */
                terminal?: string | null
            }
            destination: {
                airport_code: string
                airport_name: string
                city_code: string
                city_name: string
                arrival_time: string
                terminal?: string | null
            }
            duration: { minutes: number; formatted: string }
            /** Aircraft type label (e.g. "Airbus A320neo"). Provider-dependent. */
            aircraft?: string | null
            aircraft_type?: string | null
            /** Per-segment baggage allowance — both fields are optional strings. */
            baggage?: {
                checked_baggage?: string | null
                cabin_baggage?: string | null
            } | null
        }>
        total_price: string
        stop_count: number
        total_duration: number
        formatted_duration: string
        departure_date: string
        return_date: string | null
        is_refundable: boolean
        journey_type: number
        /** Flat-shape fallback fields (present on slot.slot_data.flight_data
         *  when written by the AI agent / direct-add path; segments[] is
         *  omitted in that shape). AnchorFlightCard reads these as a
         *  fallback when segments[] is empty. */
        airline?: string
        airline_code?: string
        airline_logo?: string
        flight_number?: string
        origin?: string
        destination?: string
        departure_time?: string
        arrival_time?: string
        duration_minutes?: number
        stops?: number
        price?: number
        segments_summary?: string
        price_comparison?: Array<{
            provider?: string
            price?: number
            currency?: string
            affiliate_url?: string | null
            provider_logo_url?: string | null
        }>
        best_offer?: {
            provider: string
            price: number
            currency?: string
            affiliate_url?: string | null
            provider_logo_url?: string | null
            /** Cabin class label (e.g. "Economy"). Optional — surfaced when present. */
            cabin?: string | null
        }
        search_params: {
            origin: string[]
            destination: string[]
            departure_date: string[]
            return_date: string[] | null
            adult_count: number
            child_count: number
            infant_count: number
            cabin_class: number
            journey_type: number
        }
        manual_offer?: ManualOffer
    }
}
// Re-exported as a named alias so the AnchorFlightCard can import the
// shape without circular naming. AnchorLivePriceData mirrors LivePriceData
// below for the same reason.
export type AnchorFlightSection = FlightSection

interface PriceOffer {
    provider: string
    price: number
    currency?: string
    affiliate_url?: string | null
    provider_logo_url?: string | null
    cabin?: string | null
}

interface LivePriceData {
    total_price: string
    best_offer?: PriceOffer
    price_comparison?: PriceOffer[]
}
export type AnchorLivePriceData = LivePriceData

interface ItineraryFlightSlotInfo {
    slot_id: string
    leg: 'outbound' | 'internal' | 'return'
    day_index: number
    start_time?: string
    end_time?: string
    section_id?: string | null
    reference_id?: string | null
}

interface ItineraryDayLite {
    date: string
    base_city?: { id?: string; name?: string } | null
    slots?: Array<{
        slot_id?: string
        kind?: string
        start_time?: string | null
        end_time?: string | null
        entity_id?: string | null
        slot_data?: Record<string, unknown> | null
    }>
}

interface FlightsTabProps {
    collectionIdentifier?: string
    flightSections: FlightSection[]
    isLoading: boolean
    onDeleteSection?: (sectionId: string) => void
    isDeleting?: boolean
    isRimigoInternal?: boolean
    /** Persisted flight legs (Outbound / Inter-city / Return / Round trip). */
    flightLegs?: FlightLeg[]
    /** True for shared-link / read-only viewers — disables editing. */
    isReadOnly?: boolean
    /** Trip + itinerary identifiers + day list — required to enable the
     *  "Add to Itinerary" / "In your Itinerary" affordances. The Budget
     *  Tab now sources flights from the itinerary, so itinerary inclusion
     *  IS budget inclusion — there is no separate include/exclude toggle. */
    tripId?: string | null
    itineraryId?: string | null
    itineraryDays?: ItineraryDayLite[]
}

// Resolve a provider logo for a flight offer: prefer Kayak's own logo, else
// fall back to a Google favicon derived from the offer's affiliate URL host.
const resolveOfferLogo = (offer?: { provider_logo_url?: string | null; affiliate_url?: string | null } | null): string | null => {
    if (!offer) return null
    if (offer.provider_logo_url) return offer.provider_logo_url
    if (!offer.affiliate_url) return null
    try {
        const host = new URL(offer.affiliate_url).hostname.replace(/^www\./, '')
        return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null
    } catch {
        return null
    }
}

const formatAmount = (value?: string | number) => {
    if (!value) return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const formatTime = (isoString?: string) => {
    if (!isoString) return '--'
    try {
        const d = new Date(isoString)
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    } catch {
        return '--'
    }
}

const formatDate = (isoString?: string) => {
    if (!isoString) return '--'
    try {
        const d = new Date(isoString)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    } catch {
        return '--'
    }
}

const getStopsLabel = (stopCount: number) => {
    if (stopCount === 0) return 'Direct'
    if (stopCount === 1) return '1 stop'
    return `${stopCount} stops`
}

/** Deal row for provider comparison */
const FlightDealChip: React.FC<{ deal: PriceOffer; isHighlighted?: boolean }> = ({ deal, isHighlighted }) => {
    // Prefer Kayak's own provider_logo_url, fall back to a Google favicon
    // derived from the offer's affiliate URL host.
    const logoUrl = resolveOfferLogo(deal)
    const [logoErrored, setLogoErrored] = useState(false)
    const showLogo = !!logoUrl && !logoErrored
    return (
        <a
            href={deal.affiliate_url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-colors cursor-pointer ${
                isHighlighted
                    ? 'border-secondary-green/30 bg-secondary-green/5 hover:bg-secondary-green/10'
                    : 'border-grey-4 hover:border-primary-default/30 hover:bg-grey-5/50'
            }`}>
            <div className="flex items-center gap-2 min-w-0">
                {showLogo ? (
                    <img
                        src={logoUrl!}
                        alt={deal.provider}
                        className="h-6 w-auto max-w-32 object-contain shrink-0"
                        onError={() => setLogoErrored(true)}
                    />
                ) : (
                    <span className="font-manrope text-sm font-medium text-grey-0 truncate">{deal.provider}</span>
                )}
                {isHighlighted && (
                    <span className="rounded-full bg-secondary-green/10 px-1.5 py-px font-manrope text-[8px] font-bold text-secondary-green uppercase shrink-0">
                        Best
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`font-red-hat-display text-[15px] font-bold ${isHighlighted ? 'text-secondary-green' : 'text-grey-0'}`}>
                    {formatAmount(deal.price)}
                </span>
                <ArrowUpRight className="w-3 h-3 text-grey-3" />
            </div>
        </a>
    )
}

/** Shimmer for deal chips while loading */
const DealChipShimmer: React.FC = () => (
    <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
            <div
                key={i}
                className="min-w-32.5 h-15 rounded-xl bg-grey-5 animate-pulse"
            />
        ))}
    </div>
)

const FlightsTab: React.FC<FlightsTabProps> = ({
    collectionIdentifier,
    flightSections,
    isLoading,
    onDeleteSection,
    isDeleting,
    isRimigoInternal = false,
    flightLegs,
    isReadOnly = false,
    tripId,
    itineraryId,
    itineraryDays
}) => {
    // Mobile: collapse the toggle/Browse row on scroll-down; leg strip stays pinned.
    const hideSecondaryHeader = useHideOnScrollDown()
    const isMobileViewport = useIsMobile()
    const [expandedDealsBySectionId, setExpandedDealsBySectionId] = useState<Record<string, boolean>>({})
    const [editingLinkSectionId, setEditingLinkSectionId] = useState<string | null>(null)
    const [linkUrlDraft, setLinkUrlDraft] = useState<string>('')
    const [linkPriceDraft, setLinkPriceDraft] = useState<string>('')
    const [linkError, setLinkError] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()

    // PostHog shorthand — every Flights-tab event uses the same surface
    // (FLIGHT_PAGE / click) and shares ``collection_identifier`` so they
    // can be filtered / aggregated per tripboard.
    const track = (eventName: string, extras?: Record<string, unknown>) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: eventName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                collection_identifier: collectionIdentifier,
                ...extras
            }
        })
    }

    // Index itinerary flight slots by reference_id so cards across both
    // Shortlisted and Explore views can flip their CTA → "In your Itinerary"
    // badge in O(1). One reference_id can map to multiple slots
    // (round-trip → outbound + return).
    const flightSlotsByReferenceId = useMemo(() => {
        const map = new Map<string, ItineraryFlightSlotInfo[]>()
        if (!itineraryDays) return map
        itineraryDays.forEach((day, dayIdx) => {
            ;(day.slots || []).forEach((slot) => {
                // Mirrors BudgetService._is_flight_slot — accept canonical
                // kind="flight" AND legacy kind="transport" + flights payload
                // (AI emitter path). Without this, FY-1440-style slots are
                // invisible to the In-your-Itinerary badge.
                const sd = (slot.slot_data || {}) as Record<string, unknown>
                const isFlight =
                    slot.kind === 'flight' ||
                    (slot.kind === 'transport' &&
                        ((slot as { entity_model?: string }).entity_model === 'flights' || (sd.flight_data && typeof sd.flight_data === 'object')))
                if (!isFlight) return
                const fd = (sd.flight_data || {}) as Record<string, unknown>
                const refId =
                    (fd.reference_id as string | undefined) ||
                    (sd.reference_id as string | undefined) ||
                    (slot.entity_id as string | undefined) ||
                    null
                if (!refId) return
                const leg = (sd.leg as ItineraryFlightSlotInfo['leg']) || 'outbound'
                const info: ItineraryFlightSlotInfo = {
                    slot_id: slot.slot_id || '',
                    leg,
                    day_index: dayIdx,
                    start_time: slot.start_time || undefined,
                    end_time: slot.end_time || undefined,
                    section_id: (sd.section_id as string | undefined) || (slot.entity_id as string | undefined) || null,
                    reference_id: refId
                }
                const arr = map.get(refId) || []
                arr.push(info)
                map.set(refId, arr)
            })
        })
        return map
    }, [itineraryDays])

    const canAddToItinerary = !!(tripId && itineraryId && itineraryDays && itineraryDays.length > 0)

    // For each leg_id, the flight Section currently on the itinerary —
    // used to enforce the "one flight per leg" invariant. Adding a
    // different flight on a leg that already has one triggers a
    // "Replacing X" flow rather than a duplicate.
    const inItinerarySectionByLegId = useMemo(() => {
        const map = new Map<string, FlightSection>()
        for (const section of flightSections) {
            const sectionId = section.id
            const legId = (section.metadata as { leg_id?: string }).leg_id
            if (!legId || !sectionId) continue
            const slotsForRef = flightSlotsByReferenceId.get(section.entity_id || section.metadata.reference_id)
            const isOnItinerary = !!slotsForRef && slotsForRef.length > 0
            if (isOnItinerary) {
                map.set(legId, section)
            }
        }
        return map
    }, [flightSections, flightSlotsByReferenceId])

    // Anchor-card source of truth: the itinerary slot itself. Legs are
    // derived from slots (BE `_derive_legs_from_slots`) and `leg.id === slot.reference_id`,
    // so finding the slot for the active leg gives us the canonical
    // flight_data — no dependence on a Section existing (agent-added
    // flights often skip the section). The slot's `slot_data.flight_data`
    // has the same shape AnchorFlightCard reads from `section.metadata`
    // (segments[], best_offer, is_refundable, etc.), so we wrap it in a
    // synthetic FlightSection envelope to feed the component unchanged.
    const inItinerarySlotByReferenceId = useMemo(() => {
        const map = new Map<string, FlightSection>()
        if (!itineraryDays) return map
        for (const day of itineraryDays) {
            for (const slot of day.slots || []) {
                const sd = (slot.slot_data || {}) as Record<string, unknown>
                const isFlight =
                    slot.kind === 'flight' ||
                    (slot.kind === 'transport' &&
                        ((slot as { entity_model?: string }).entity_model === 'flights' || (sd.flight_data && typeof sd.flight_data === 'object')))
                if (!isFlight) continue
                const fd = (sd.flight_data || {}) as Record<string, unknown>
                const refId =
                    (fd.reference_id as string | undefined) ||
                    (sd.reference_id as string | undefined) ||
                    ((slot as { entity_id?: string }).entity_id as string | undefined)
                if (!refId || map.has(refId)) continue
                map.set(refId, {
                    id: `slot-${refId}`,
                    section_type: 'flights',
                    title: ((fd.title as string | undefined) || (slot as { title?: string }).title || `Flight ${refId}`).toString(),
                    entity_id: refId,
                    entity_type: 'flight',
                    metadata: fd as unknown as FlightSection['metadata']
                })
            }
        }
        return map
    }, [itineraryDays])

    // Build the natural-language prompt that the assistant input gets
    // prefilled with when the user clicks "Add to Itinerary" on a flight
    // card. Bypasses the AddFlightToItineraryModal entirely — the
    // agent infers day placement from the date in the prompt.
    interface AddFlightPromptReplacing {
        airlineName?: string
        airlineCode?: string
        flightNumber?: string
        title?: string
    }
    const buildAddFlightPrompt = (input: {
        title: string
        segments:
            | Array<
                  | {
                        airline?: { code?: string | null; name?: string | null; flight_number?: string | null } | null
                        origin?: {
                            airport_code?: string | null
                            city_code?: string | null
                            city_name?: string | null
                            departure_time?: string | null
                        } | null
                        destination?: {
                            airport_code?: string | null
                            city_code?: string | null
                            city_name?: string | null
                            arrival_time?: string | null
                        } | null
                        duration?: { minutes?: number | null; formatted?: string | null } | null
                    }
                  | null
                  | undefined
              >
            | null
            | undefined
        departure_date?: string | null
        return_date?: string | null
        journey_type?: number
        /** Top-level enrichers — when present, surfaced in the prompt so
         *  the agent can disambiguate the exact flight against its
         *  search-result cache (same airline + route + day can have
         *  multiple departures). All optional; the descriptor degrades
         *  gracefully to airline + flight number alone if missing. */
        formatted_duration?: string | null
        stop_count?: number | null
        best_offer?: { price?: number | null; currency?: string | null } | null
        replacing?: boolean
        /** Identifier for the flight currently on the leg — used to build a
         *  "Swap my TG 326 BLR → NRT flight with…" prompt instead of a
         *  generic "Replace my BLR → NRT flight…". Optional; the prompt
         *  falls back to the route-only phrasing when absent. */
        replacingFlight?: AddFlightPromptReplacing
    }): string => {
        const segs = (input.segments ?? []).filter((s): s is NonNullable<typeof s> => !!s)
        const first = segs[0]
        const last = segs[segs.length - 1]
        const fromCode = first?.origin?.airport_code || first?.origin?.city_code || ''
        const toCode = last?.destination?.airport_code || last?.destination?.city_code || ''
        const fromCity = first?.origin?.city_name || ''
        const toCity = last?.destination?.city_name || ''
        const airline = first?.airline?.name || ''
        const carrier = first?.airline?.code || ''
        const flightNumber = first?.airline?.flight_number || ''
        const carrierFlight = carrier && flightNumber ? `${carrier} ${flightNumber}` : ''
        const baseLabel = [airline, carrierFlight].filter(Boolean).join(' ').trim() || input.title || 'this flight'
        const labelFor = (code: string, city: string) =>
            city && city.trim() && city.trim().toUpperCase() !== code.toUpperCase() ? `${city.trim()} (${code})` : code
        const fromLabel = labelFor(fromCode, fromCity)
        const toLabel = labelFor(toCode, toCity)
        const formatDate = (raw?: string | null): string => {
            if (!raw) return ''
            const d = new Date(`${raw.slice(0, 10)}T00:00:00Z`)
            return Number.isFinite(d.getTime())
                ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
                : raw
        }
        // Parse a segment's local-airport ``departure_time`` /
        // ``arrival_time`` into a ``{ time, date }`` pair, formatted in
        // 12-hour "hh:mm AM/PM" + short calendar date. These strings can
        // be ISO ("2026-06-19T16:55:00") or already-localized — falls
        // back gracefully on unparseable input.
        const formatTimePart = (raw?: string | null): { time: string; date: string } => {
            if (!raw) return { time: '', date: '' }
            const d = new Date(raw)
            if (!Number.isFinite(d.getTime())) return { time: '', date: '' }
            return {
                time: d.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                date: d.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })
            }
        }
        const depTimePart = formatTimePart(first?.origin?.departure_time)
        const arrTimePart = formatTimePart(last?.destination?.arrival_time)

        // Layover airports (the city/airport codes between segments).
        // Two segments DPS → BKK → BLR → layovers = [BKK]; the agent uses
        // this to disambiguate routes when an airline pair flies the
        // same number via different connections.
        const layoverCodes: string[] = []
        for (let i = 0; i < segs.length - 1; i++) {
            const code = segs[i]?.destination?.airport_code || segs[i]?.destination?.city_code
            if (code) layoverCodes.push(code)
        }
        const stopCount = typeof input.stop_count === 'number' ? input.stop_count : Math.max(0, segs.length - 1)
        const stopsLabel =
            stopCount <= 0
                ? 'non-stop'
                : layoverCodes.length > 0
                  ? `${stopCount} stop${stopCount > 1 ? 's' : ''} via ${layoverCodes.join(', ')}`
                  : `${stopCount} stop${stopCount > 1 ? 's' : ''}`

        // Total trip duration — prefer the precomputed
        // ``formatted_duration`` ("7h"); otherwise fall back to the
        // first segment's segment-level value.
        const duration = (input.formatted_duration && input.formatted_duration.trim()) || first?.duration?.formatted || ''

        // Price (best_offer.price + currency). Format with grouping.
        const priceLabel = (() => {
            const price = input.best_offer?.price
            if (!Number.isFinite(price as number) || (price as number) <= 0) return ''
            const currency = (input.best_offer?.currency || '').toUpperCase()
            const formatted = Number(price).toLocaleString('en-IN')
            if (currency === 'INR' || !currency) return `₹${formatted}`
            return `${currency} ${formatted}`
        })()

        // Compose the parenthetical detail string. Each piece is gated
        // on its source being non-empty so a partial payload still
        // produces a clean descriptor.
        const routeBit = fromCode && toCode ? `${fromCode} → ${toCode}` : ''
        const depBit = depTimePart.time ? `departs ${depTimePart.time}${depTimePart.date ? ` ${depTimePart.date}` : ''}` : ''
        const arrBit = arrTimePart.time ? `arrives ${arrTimePart.time}${arrTimePart.date ? ` ${arrTimePart.date}` : ''}` : ''
        const detailBits = [routeBit, depBit, arrBit, duration, stopsLabel, priceLabel].filter((s) => s && s.trim())
        const detailSuffix = detailBits.length > 0 ? ` (${detailBits.join(' · ')})` : ''
        const label = `${baseLabel}${detailSuffix}`

        const outDate = formatDate(input.departure_date)
        const isRoundTrip = Number(input.journey_type ?? 1) === 2 && !!input.return_date
        const retDate = isRoundTrip ? formatDate(input.return_date) : ''
        if (input.replacing) {
            // Identify the existing flight by airline + flight number when we
            // have them ("Swap my Thai Airways TG-326 BLR → NRT flight with
            // Cathay Pacific CX-624…"). Falls back to the bare route phrasing
            // when no identifier resolves.
            const existingAirlineName = input.replacingFlight?.airlineName || ''
            const existingCode = input.replacingFlight?.airlineCode || ''
            const existingFlightNum = input.replacingFlight?.flightNumber || ''
            const existingFlightCode = existingCode && existingFlightNum ? `${existingCode}-${existingFlightNum}` : existingCode || ''
            const existingLabel = [existingAirlineName, existingFlightCode].filter(Boolean).join(' ').trim() || input.replacingFlight?.title || ''
            const existingDescriptor = existingLabel ? `${existingLabel} ${fromLabel} → ${toLabel}` : `${fromLabel} → ${toLabel}`
            let prompt = `Swap my ${existingDescriptor} flight on ${outDate} with ${label}.`
            if (isRoundTrip && retDate) {
                prompt += ` Round trip — also update the return on ${retDate}.`
            }
            prompt += ' Align my itinerary to the new flight — airport transfers and anything tied to the old times.'
            return prompt
        }
        let prompt = `Add ${label} from ${fromLabel} to ${toLabel} on ${outDate} to my itinerary.`
        if (isRoundTrip && retDate) {
            prompt += ` Round trip — also add the return on ${retDate}.`
        }
        return prompt
    }

    const buildReplacingDescriptor = (targetLegId: string | undefined, targetSectionId: string) => {
        if (!targetLegId) return undefined
        // Prefer the slot-derived lookup (canonical for agent-added flights) and
        // fall back to the legacy `leg_id`-keyed section map for sections that
        // happen to carry one.
        const existing = inItinerarySlotByReferenceId.get(targetLegId) ?? inItinerarySectionByLegId.get(targetLegId)
        if (!existing) return undefined
        if (existing.id === targetSectionId) return undefined
        // Both nested (segments[].airline) and flat (metadata.airline/.airline_code/.flight_number)
        // shapes need to resolve so the descriptor works for Kayak-section AND
        // slot-only flights.
        const firstSeg = existing.metadata?.segments?.[0]
        const airlineCode = firstSeg?.airline?.code || existing.metadata?.airline_code || ''
        const airlineName = firstSeg?.airline?.name || existing.metadata?.airline || ''
        const rawFlightNum = firstSeg?.airline?.flight_number || existing.metadata?.flight_number || ''
        // `flight_number` in the flat shape often arrives already prefixed
        // ("TG 326") — strip the code so we don't render "TG TG 326".
        const flightNumber = airlineCode ? rawFlightNum.replace(new RegExp(`^${airlineCode}\\s*`, 'i'), '').trim() : rawFlightNum
        const titleFallback = [airlineCode, flightNumber].filter(Boolean).join('-')
        return {
            sectionId: existing.id,
            title: existing.title || (titleFallback ? `Flight ${titleFallback}` : 'Flight'),
            airlineName,
            airlineCode,
            flightNumber
        }
    }

    const openFlightModalForSection = (section: FlightSection) => {
        if (!canAddToItinerary) return
        const refId = section.entity_id || section.metadata.reference_id
        const existingSlots = flightSlotsByReferenceId.get(refId)
        const legId = (section.metadata as { leg_id?: string }).leg_id
        const replacingSection =
            existingSlots && existingSlots.length > 0
                ? undefined // editing the same flight — no replacement
                : buildReplacingDescriptor(legId, section.id)
        track(POSTHOG_EVENTS.FLIGHTS_TAB_ADD_TO_ITINERARY_OPEN, {
            source: 'shortlisted',
            mode: existingSlots && existingSlots.length > 0 ? 'edit' : replacingSection ? 'replace' : 'add',
            reference_id: refId,
            section_id: section.id,
            leg_id: legId,
            journey_type: section.metadata.journey_type
        })
        // Bypass the timing-confirmation modal — auto-trigger the concierge.
        // Agent infers day placement from the date in the prompt. A saved
        // section rarely carries a live rimigo_id (it's a search-time token),
        // so this path usually omits it and the agent resolves the flight
        // normally; when present we forward it for the cache fast-path.
        const sectionRimigoId = (section.metadata as { rimigo_id?: string | null }).rimigo_id
        const prompt = buildAddFlightPrompt({
            title: section.title,
            segments: section.metadata.segments,
            departure_date: section.metadata.departure_date,
            return_date: section.metadata.return_date,
            journey_type: section.metadata.journey_type,
            // Top-level enrichers — keep the section path's prompt at
            // parity with the explore path so a shortlisted Swap reads
            // as richly as a fresh search-result Swap.
            formatted_duration: section.metadata.formatted_duration,
            stop_count: section.metadata.stop_count,
            best_offer: section.metadata.best_offer
                ? {
                      price: section.metadata.best_offer.price,
                      currency: section.metadata.best_offer.currency
                  }
                : null,
            replacing: !!replacingSection,
            replacingFlight: replacingSection
                ? {
                      airlineName: replacingSection.airlineName,
                      airlineCode: replacingSection.airlineCode,
                      flightNumber: replacingSection.flightNumber,
                      title: replacingSection.title
                  }
                : undefined
        })
        void triggerAssistantPrompt(prompt, sectionRimigoId ? { flightRimigoIds: [sectionRimigoId] } : undefined)
        toast.success('Adding this flight — opening your concierge')
    }

    // Explore-view handler is defined AFTER activeLeg is computed (below).

    // Fetch live prices
    const { data: livePricesResponse, isLoading: isLoadingPrices } = useQuery<ApiResponse<Record<string, LivePriceData>>>({
        queryKey: ['traveler-collection-flight-prices', collectionIdentifier],
        queryFn: () => travelerCollectionApi.getFlightPrices(collectionIdentifier!),
        enabled: !!collectionIdentifier && flightSections.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000
    })

    const livePrices = useMemo(() => {
        return (livePricesResponse?.data as Record<string, LivePriceData>) || {}
    }, [livePricesResponse])

    // Garbage-collect stale flight-price baselines from localStorage on
    // first flight result load. The pill itself rolls over its own
    // baseline every 24h, but doesn't reap entries for sections that no
    // longer exist (deleted flights, archived trips, etc.). This sweep
    // catches those orphans. Idempotent within a session via a
    // module-level guard — only runs once.
    useEffect(() => {
        if (livePricesResponse) {
            purgeStaleFlightPriceBaselines()
        }
    }, [livePricesResponse])

    // ─────────────────────────────────────────────────────────────────────
    // Flight legs (Outbound / Inter-city / Return / Round trip)
    // ─────────────────────────────────────────────────────────────────────

    // Drop unresolvable legs — both endpoints missing means the derive pass
    // (resolver + creation_inputs fallback) couldn't produce a route. Showing
    // a "Set origin → Set destination" chip for slots we can't speak to adds
    // noise; the surrounding legs (and "Add leg") still carry user intent.
    const derivedLegs: FlightLeg[] = useMemo(() => (flightLegs || []).filter((leg) => Boolean(leg.from) || Boolean(leg.to)), [flightLegs])

    // Ephemeral search-only leg handed in from the itinerary composer via
    // ?flsearch_from/to/date. NEVER persisted — it lives only in this
    // component's state, is appended to the visible legs, and auto-clears on
    // abandon (leg switch, unmount, or once a real matching leg appears).
    const [tempLeg, setTempLeg] = useState<FlightLeg | null>(null)

    // Merge the temp leg in last so it reads as a fresh search context after
    // the route-derived legs in the strip.
    const legs: FlightLeg[] = useMemo(() => (tempLeg ? [...derivedLegs, tempLeg] : derivedLegs), [derivedLegs, tempLeg])

    const [activeLegId, setActiveLegId] = useState<string | null>(null)
    const [editingLeg, setEditingLeg] = useState<FlightLeg | null>(null)
    const [showAddLeg, setShowAddLeg] = useState(false)

    useEffect(() => {
        if (legs.length === 0) {
            setActiveLegId(null)
            return
        }
        if (!activeLegId || !legs.find((l) => l.id === activeLegId)) {
            setActiveLegId(legs[0].id)
        }
    }, [legs, activeLegId])

    // Drop the ephemeral leg when the user navigates to a different leg — it
    // was a one-shot search, so it shouldn't linger in the strip afterwards.
    useEffect(() => {
        if (tempLeg && activeLegId && activeLegId !== tempLeg.id) {
            setTempLeg(null)
        }
    }, [activeLegId, tempLeg])

    // Drop the ephemeral leg once a real (derived) leg covers the same
    // route+date — e.g. after the AI concierge adds the flight slot — so the
    // strip doesn't show a duplicate.
    useEffect(() => {
        if (!tempLeg) return
        const covered = derivedLegs.some((l) => l.from === tempLeg.from && l.to === tempLeg.to && l.date === tempLeg.date)
        if (covered) setTempLeg(null)
    }, [derivedLegs, tempLeg])

    // After a slot mutation, both the traveler-collection cache (source of
    // flightLegs via the derived projection) and the itinerary cache
    // (source of itineraryDays / flight slots map) must refresh.
    const invalidateAfterSlotMutation = () => {
        if (collectionIdentifier) {
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
        }
        if (itineraryId) {
            queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] })
        }
        queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
    }

    // Build a sparse "flight" slot payload that mirrors the backend's rich
    // shape just enough for derivation to read origin/destination/date out
    // of `slot_data.flight_data`. Times default to noon → 3pm UTC so the
    // slot anchors on the requested day without a real departure time.
    const buildFlightSlotPayload = (input: { from: string; to: string; date: string }): SlotPayload => {
        const referenceId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `flight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        return {
            kind: 'flight',
            start_time: `${input.date}T12:00:00Z`,
            end_time: `${input.date}T15:00:00Z`,
            entity_model: 'flights',
            slot_data: {
                mode: 'flight',
                from_city: input.from,
                to_city: input.to,
                flight_data: {
                    reference_id: referenceId,
                    origin: input.from,
                    destination: input.to,
                    departure_date: input.date,
                    segments: [
                        {
                            airline: { code: '', name: '', flight_number: '' },
                            origin: { airport_code: input.from, city_name: '', departure_time: '' },
                            destination: { airport_code: input.to, city_name: '', arrival_time: '' },
                            duration: { minutes: 0, formatted: '' },
                            stopover: { has_stopover: false }
                        }
                    ]
                }
            },
            suggestion_reasons: []
        }
    }

    const createFlightSlotMutation = useMutation({
        mutationFn: (payload: SlotPayload) => {
            if (!tripId || !itineraryId) {
                return Promise.reject(new Error('Missing trip or itinerary id'))
            }
            return addSlot(tripId, itineraryId, payload)
        },
        onSuccess: invalidateAfterSlotMutation,
        onError: () => toast.error('Could not save flight leg.')
    })

    const updateFlightSlotMutation = useMutation({
        mutationFn: ({ slotId, payload }: { slotId: string; payload: SlotPayload }) => {
            if (!tripId || !itineraryId) {
                return Promise.reject(new Error('Missing trip or itinerary id'))
            }
            return updateSlot(tripId, itineraryId, slotId, payload)
        },
        onSuccess: invalidateAfterSlotMutation,
        onError: () => toast.error('Could not update flight leg.')
    })

    const removeFlightSlotMutation = useMutation({
        mutationFn: (slotId: string) => {
            if (!tripId || !itineraryId) {
                return Promise.reject(new Error('Missing trip or itinerary id'))
            }
            return deleteSlot(tripId, itineraryId, slotId)
        },
        onSuccess: () => {
            invalidateAfterSlotMutation()
            toast.success('Leg removed')
        },
        onError: () => toast.error('Could not remove flight leg.')
    })

    // Synthetic ids — emitted by the backend's legacy-spine fallback when
    // the itinerary has no flight slots yet. Treat any edit on one as an
    // ADD: the slot doesn't exist, so we can't PUT it. Detection is
    // hoisted out of the submit handler so the same predicate flags both
    // submit (which routes through the assistant) and analytics events.
    const isSyntheticLegId = (id: string | undefined) => !!id && (id.startsWith('legacy-') || id.startsWith('derived-'))

    const handleLegSubmit = async (payload: FlightLegPayload) => {
        const isSynthetic = isSyntheticLegId(payload.id)
        // Edits on synthetic ids become adds in practice (no slot to PUT),
        // so report the effective intent — analytics shouldn't show a
        // ghost "edit" when the underlying action was an add.
        const effectiveMode = payload.id && !isSynthetic ? 'edit' : 'add'
        const route = effectiveMode === 'edit' ? 'direct' : 'search'
        track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_SAVE, {
            mode: effectiveMode,
            via: route,
            is_legacy_leg: isSynthetic,
            leg_id: payload.id,
            kind: payload.kind,
            from: payload.from,
            to: payload.to,
            date: payload.date,
            return_date: payload.return_date
        })
        if (!tripId || !itineraryId) {
            toast.error('Trip not ready yet — try again in a moment.')
            return
        }
        if (!payload.from || !payload.to || !payload.date) return
        const from = payload.from
        const to = payload.to
        const date = payload.date
        if (payload.id && !isSyntheticLegId(payload.id)) {
            // Edit existing slot — patch the rich-shape fields on the
            // existing slot via PUT. Edit stays direct (not routed through
            // the assistant) because it only mutates dates / route fields
            // and there's nothing to search.
            const slotPayload = buildFlightSlotPayload({ from, to, date })
            await updateFlightSlotMutation.mutateAsync({ slotId: payload.id, payload: slotPayload })
            return
        }
        // +Add leg (and edit of a synthetic legacy leg) now run a NORMAL
        // flight SEARCH rather than dispatching an AI prompt or persisting a
        // placeholder leg. We hand off to the ephemeral search-leg flow via the
        // ?flsearch_* params the injection effect consumes: a search-only leg is
        // created (never persisted), the search runs, and the user adds a real
        // result through the existing "Add to my itinerary" flow. Round-trip
        // searches the outbound hop; the return is added as its own leg search.
        const searchHandoff = new URLSearchParams(searchParams)
        searchHandoff.set('flsearch_from', from)
        searchHandoff.set('flsearch_to', to)
        searchHandoff.set('flsearch_date', date)
        setSearchParams(searchHandoff, { replace: true })
        setShowAddLeg(false)
        setEditingLeg(null)
    }

    const handleLegEdit = (legId: string) => {
        const found = legs.find((l) => l.id === legId)
        if (found) {
            track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_EDIT_OPEN, {
                leg_id: legId,
                kind: found.kind,
                from: found.from,
                to: found.to,
                is_legacy_leg: isSyntheticLegId(legId)
            })
            setEditingLeg(found)
        }
    }

    const handleLegRemove = async (legId: string) => {
        if (!tripId || !itineraryId) return
        // Synthetic legacy-spine legs have no underlying slot — there's
        // nothing to delete. Surface that to the user instead of firing
        // a guaranteed 404 against /slots/legacy-outbound/.
        if (isSyntheticLegId(legId)) {
            track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_LEGACY_REMOVE_BLOCKED, {
                leg_id: legId
            })
            toast.message('Nothing to remove yet', {
                description: 'This leg is auto-derived from your itinerary. Add a flight first — then you can remove it from here.'
            })
            return
        }
        const tagged = flightSections.filter((s) => (s.metadata as { leg_id?: string }).leg_id === legId)
        const confirmMsg =
            tagged.length > 0
                ? `Remove this leg? ${tagged.length} shortlisted flight${tagged.length > 1 ? 's' : ''} will stay saved but become unassigned to a leg.`
                : 'Remove this leg?'
        if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return
        track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_REMOVE, {
            leg_id: legId,
            tagged_flight_count: tagged.length,
            is_legacy_leg: false
        })
        await removeFlightSlotMutation.mutateAsync(legId)
    }

    // ─────────────────────────────────────────────────────────────────────
    // View toggle (Shortlisted | Explore) + per-leg filtering + shortlist mutation
    // ─────────────────────────────────────────────────────────────────────

    const activeLeg = useMemo(() => legs.find((l) => l.id === activeLegId) || null, [legs, activeLegId])

    // Flight currently anchored on the itinerary for the active leg (if any).
    // Surfaces as the hero AnchorFlightCard above the Explore search/results,
    // so the user sees their committed pick before browsing alternatives.
    const inItineraryFlightForActiveLeg = activeLeg ? (inItinerarySlotByReferenceId.get(activeLeg.id) ?? null) : null

    const openFlightModalForExplore = (flight: ExploreFlight) => {
        if (!canAddToItinerary) return
        const refId = flight.reference_id
        const existingSlots = flightSlotsByReferenceId.get(refId)
        const first = flight.segments[0]
        const last = flight.segments[flight.segments.length - 1]
        const fromCode = first?.origin?.airport_code || activeLeg?.from || ''
        const toCode = last?.destination?.airport_code || activeLeg?.to || ''
        const title = `${fromCode} → ${toCode}${flight.departure_date ? ` | ${flight.departure_date}` : ''}`
        // Explore-view adds always come from a fresh Section (auto-shortlist
        // creates one in the backend), so the section_id is unknown until
        // the POST. We still detect the conflict here using the active leg's
        // id since the leg-tagging is what the constraint keys off.
        const replacingSection = existingSlots && existingSlots.length > 0 ? undefined : buildReplacingDescriptor(activeLeg?.id, '')
        track(POSTHOG_EVENTS.FLIGHTS_TAB_ADD_TO_ITINERARY_OPEN, {
            source: 'explore',
            mode: existingSlots && existingSlots.length > 0 ? 'edit' : replacingSection ? 'replace' : 'add',
            reference_id: refId,
            leg_id: activeLeg?.id,
            journey_type: Number(flight.journey_type ?? 1)
        })
        // Bypass the timing-confirmation modal — auto-trigger the concierge.
        // Agent infers day placement from the date in the prompt; the flight's
        // rimigo_id (minted by the BE search, seeded into flight_cache) rides
        // along so the BE resolves THIS exact flight without re-searching Kayak.
        const prompt = buildAddFlightPrompt({
            title,
            segments: flight.segments,
            departure_date: flight.departure_date,
            return_date: flight.return_date,
            journey_type: Number(flight.journey_type ?? 1),
            // Top-level enrichers — let the agent disambiguate this
            // exact flight from sibling search results on the same day.
            formatted_duration: flight.formatted_duration,
            stop_count: flight.stop_count,
            best_offer: flight.best_offer ? { price: flight.best_offer.price, currency: flight.best_offer.currency } : null,
            replacing: !!replacingSection,
            replacingFlight: replacingSection
                ? {
                      airlineName: replacingSection.airlineName,
                      airlineCode: replacingSection.airlineCode,
                      flightNumber: replacingSection.flightNumber,
                      title: replacingSection.title
                  }
                : undefined
        })
        void triggerAssistantPrompt(prompt, flight.rimigo_id ? { flightRimigoIds: [flight.rimigo_id] } : undefined)
        toast.success('Adding this flight — opening your concierge')
    }

    const matchesLeg = (section: FlightSection, leg: FlightLeg | null): boolean => {
        if (!leg) return true
        const metaLegId = (section.metadata as { leg_id?: string }).leg_id
        if (metaLegId) return metaLegId === leg.id
        // Legacy fallback: match by route + departure_date for sections saved before
        // the leg-tagging was introduced.
        const sp = section.metadata.search_params
        if (!sp) return false
        const matchesOrigin = !leg.from || sp.origin?.[0] === leg.from
        const matchesDest = !leg.to || sp.destination?.[0] === leg.to
        const matchesDate = !leg.date || sp.departure_date?.[0] === leg.date
        return matchesOrigin && matchesDest && matchesDate
    }

    const flightSectionsForActiveLeg = useMemo(() => flightSections.filter((s) => matchesLeg(s, activeLeg)), [flightSections, activeLeg])

    // Float in-itinerary flights to the top of the Shortlisted list so the
    // user sees committed picks before browsing other shortlisted options.
    // Insertion order is preserved within each group.
    const flightSectionsForActiveLegOrdered = useMemo(() => {
        if (flightSlotsByReferenceId.size === 0) return flightSectionsForActiveLeg
        const inItinerary: typeof flightSectionsForActiveLeg = []
        const others: typeof flightSectionsForActiveLeg = []
        for (const section of flightSectionsForActiveLeg) {
            const refId = section.entity_id || section.metadata.reference_id
            if (flightSlotsByReferenceId.has(refId)) {
                inItinerary.push(section)
            } else {
                others.push(section)
            }
        }
        return [...inItinerary, ...others]
    }, [flightSectionsForActiveLeg, flightSlotsByReferenceId])

    const shortlistedReferenceIds = useMemo(
        () => new Set(flightSectionsForActiveLeg.map((s) => s.entity_id || s.metadata.reference_id)),
        [flightSectionsForActiveLeg]
    )

    // ─────────────────────────────────────────────────────────────────────
    // Per-leg "search has been triggered" state — lifted from
    // FlightExploreView so external actions (the empty-shortlist
    // "Browse flights" CTA, plus the auto-trigger when the leg already
    // has shortlisted flights) can pre-mark a leg before the view flips.
    // Declared here, AFTER flightSectionsForActiveLeg, because the
    // auto-trigger effect depends on it.
    // ─────────────────────────────────────────────────────────────────────

    const [triggeredLegIds, setTriggeredLegIds] = useState<Set<string>>(new Set())

    const triggerSearchForActiveLeg = () => {
        if (!activeLegId) return
        setTriggeredLegIds((prev) => {
            if (prev.has(activeLegId)) return prev
            const next = new Set(prev)
            next.add(activeLegId)
            return next
        })
    }

    const activeLegHasSearched = !!(activeLegId && triggeredLegIds.has(activeLegId))

    const [flightsView, setFlightsView] = useState<FlightsView>('shortlisted')

    // Tracks the last leg the view-reset effect ran for. Declared up here so
    // the composer-handoff effect below can pre-seed it to the temp leg id.
    const lastLegRef = useRef<string | null>(null)

    // Anchor-card auto-redirect bookkeeping. When the user taps Book on the
    // "In your Itinerary" anchor, the persisted ``best_offer.affiliate_url``
    // is likely stale (expires hourly), so we trigger a live Explore search
    // for the leg, wait for results, find the offer whose reference_id
    // matches the anchor section's, and open ITS fresh affiliate_url.
    //  - bookPendingForLegId: which leg the user is waiting on
    //  - bookPendingRefId: which section's match to look up when results land
    const [bookPendingForLegId, setBookPendingForLegId] = useState<string | null>(null)
    const [bookPendingRefId, setBookPendingRefId] = useState<string | null>(null)

    // ─────────────────────────────────────────────────────────────────────
    // Itinerary-composer handoff. The composer routes commercial-flight
    // intent here via ?flsearch_from/to/date (IATA, IATA, YYYY-MM-DD).
    //
    // Prefer a real persisted leg matching from/to/date — keeps the
    // "In your Itinerary" anchor card visible since that gate keys on real
    // legs. Falls back to an ephemeral search-only leg (never persisted)
    // when no match exists. Either way: select it, open Explore, mark it
    // as searched (so FlightExploreView's query auto-runs), then strip the
    // params so a refresh can't re-trigger.
    //
    // lastLegRef is pre-seeded to the selected id so the leg-switch effect
    // below doesn't immediately flip the view back to Shortlisted.
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const from = searchParams.get('flsearch_from')
        const to = searchParams.get('flsearch_to')
        const date = searchParams.get('flsearch_date')
        if (!from || !to || !date) return

        const existingLeg = flightLegs?.find((l) => l.from === from && l.to === to && l.date === date)
        let selectedId: string
        if (existingLeg) {
            selectedId = existingLeg.id
        } else {
            selectedId = `flsearch-${from}-${to}-${date}`
            const leg: FlightLeg = {
                id: selectedId,
                kind: 'outbound',
                from,
                to,
                date,
                from_city: null,
                to_city: null,
                return_date: null,
                pinned: false,
                source: 'user'
            }
            setTempLeg(leg)
        }
        setActiveLegId(selectedId)
        lastLegRef.current = selectedId
        setFlightsView('explore')
        setTriggeredLegIds((prev) => {
            const next = new Set(prev)
            next.add(selectedId)
            return next
        })

        const next = new URLSearchParams(searchParams)
        next.delete('flsearch_from')
        next.delete('flsearch_to')
        next.delete('flsearch_date')
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams, flightLegs])

    // On every leg switch, reset to Shortlisted if the new leg has any
    // shortlisted flights — otherwise default to Explore. This matches the
    // Stays tab behaviour: each leg is its own context, so the user
    // shouldn't carry an Explore-view selection from leg A across to leg B
    // (which may have its own pre-existing shortlists they want to see).
    // The user's manual toggle is preserved within the same leg by gating
    // on lastLegRef so length-changes (mid-leg shortlists) don't override.
    useEffect(() => {
        if (!activeLeg) return
        if (lastLegRef.current === activeLeg.id) return
        lastLegRef.current = activeLeg.id
        setFlightsView(flightSectionsForActiveLeg.length > 0 ? 'shortlisted' : 'explore')
        // Clear any anchor book-pending state — that pending request was
        // scoped to the previous leg, so it shouldn't latch on to whichever
        // results arrive for the new one.
        setBookPendingForLegId(null)
        setBookPendingRefId(null)
    }, [activeLeg?.id, flightSectionsForActiveLeg.length])

    const handleFlightsViewChange = (next: FlightsView) => {
        if (next !== flightsView) {
            track(POSTHOG_EVENTS.FLIGHTS_TAB_VIEW_TOGGLE, {
                from: flightsView,
                to: next,
                leg_id: activeLeg?.id,
                shortlisted_count: flightSectionsForActiveLeg.length
            })
        }
        setFlightsView(next)
    }

    const addFlightMutation = useMutation({
        mutationFn: ({ flight, leg }: { flight: ExploreFlight; leg: FlightLeg }) => {
            if (!collectionIdentifier) {
                return Promise.reject(new Error('Missing collection identifier'))
            }
            const first = flight.segments[0]
            const last = flight.segments[flight.segments.length - 1]
            const fromCode = first?.origin?.airport_code || leg.from || ''
            const toCode = last?.destination?.airport_code || leg.to || ''
            const departureDate = flight.departure_date || leg.date || ''
            const title = `${fromCode} → ${toCode}${departureDate ? ` | ${departureDate}` : ''}`
            const totalDurationMinutes = flight.segments.reduce((sum, seg) => sum + (Number(seg.duration?.minutes) || 0), 0)
            return travelerCollectionApi.addFlightToCollection(collectionIdentifier, {
                reference_id: flight.reference_id,
                title,
                metadata: {
                    reference_id: flight.reference_id,
                    segments: flight.segments,
                    total_price: String(flight.total_price ?? flight.best_offer?.price ?? ''),
                    stop_count: Number(flight.stop_count ?? 0),
                    total_duration: totalDurationMinutes,
                    formatted_duration: flight.formatted_duration || '',
                    departure_date: departureDate,
                    return_date: flight.return_date ?? leg.return_date ?? null,
                    is_refundable: !!flight.is_refundable,
                    journey_type: Number(flight.journey_type ?? (leg.kind === 'round_trip' ? 2 : 1)),
                    best_offer: flight.best_offer
                        ? {
                              provider: flight.best_offer.provider || '',
                              price: Number(flight.best_offer.price ?? 0),
                              currency: flight.best_offer.currency,
                              affiliate_url: flight.best_offer.affiliate_url ?? null,
                              provider_logo_url: flight.best_offer.provider_logo_url ?? null
                          }
                        : undefined,
                    search_params: {
                        origin: leg.from ? [leg.from] : [],
                        destination: leg.to ? [leg.to] : [],
                        departure_date: leg.date ? [leg.date] : [],
                        return_date: leg.return_date ? [leg.return_date] : null,
                        adult_count: 1,
                        child_count: 0,
                        infant_count: 0,
                        cabin_class: 1,
                        journey_type: leg.kind === 'round_trip' ? 2 : 1
                    },
                    leg_id: leg.id
                }
            })
        },
        onSuccess: () => {
            invalidatePrices()
            toast.success('Flight added to shortlist')
        },
        onError: () => toast.error('Could not shortlist flight.')
    })

    const handleShortlistFlight = async (flight: ExploreFlight) => {
        if (!activeLeg) return
        track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_SHORTLIST_ADD, {
            reference_id: flight.reference_id,
            leg_id: activeLeg.id,
            stop_count: flight.stop_count,
            price: flight.best_offer?.price ?? flight.total_price,
            airline_code: flight.segments?.[0]?.airline?.code
        })
        await addFlightMutation.mutateAsync({ flight, leg: activeLeg })
    }

    const handleUnshortlistFlight = async (flight: ExploreFlight) => {
        // Look up the saved section that corresponds to this Explore flight.
        // Match by reference_id since the section's entity_id is what we set
        // at save time (= flight.reference_id), with metadata.reference_id
        // as a redundant fallback.
        const match = flightSectionsForActiveLeg.find((s) => s.entity_id === flight.reference_id || s.metadata?.reference_id === flight.reference_id)
        if (!match || !onDeleteSection) return
        track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_SHORTLIST_REMOVE, {
            reference_id: flight.reference_id,
            section_id: match.id,
            leg_id: activeLeg?.id,
            source: 'explore'
        })
        onDeleteSection(match.id)
    }

    const activeLegRouteLabel = useMemo(() => {
        if (!activeLeg) return ''
        const arrow = activeLeg.kind === 'round_trip' ? '⇄' : '→'
        const from = activeLeg.from || 'Home'
        const to = activeLeg.to || 'Home'
        return `${from} ${arrow} ${to}`
    }, [activeLeg])

    const invalidatePrices = () => {
        if (collectionIdentifier) {
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-flight-prices', collectionIdentifier] })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
        }
    }

    const setManualOfferMutation = useMutation({
        mutationFn: ({ sectionId, url, price }: { sectionId: string; url: string; price: number | null }) =>
            travelerCollectionApi.setFlightManualOffer(collectionIdentifier!, sectionId, {
                provider: 'skyscanner',
                url,
                price
            }),
        onSuccess: () => {
            invalidatePrices()
            setEditingLinkSectionId(null)
            setLinkUrlDraft('')
            setLinkPriceDraft('')
            setLinkError(null)
        },
        onError: () => setLinkError('Failed to save link. Check the URL and try again.')
    })

    const clearManualOfferMutation = useMutation({
        mutationFn: (sectionId: string) => travelerCollectionApi.clearFlightManualOffer(collectionIdentifier!, sectionId),
        onSuccess: () => invalidatePrices()
    })

    const startEdit = (sectionId: string, existingUrl?: string, existingPrice?: number | null) => {
        setEditingLinkSectionId(sectionId)
        setLinkUrlDraft(existingUrl || '')
        setLinkPriceDraft(existingPrice != null ? String(existingPrice) : '')
        setLinkError(null)
    }

    const cancelEdit = () => {
        setEditingLinkSectionId(null)
        setLinkUrlDraft('')
        setLinkPriceDraft('')
        setLinkError(null)
    }

    const saveLink = (sectionId: string) => {
        const trimmed = linkUrlDraft.trim()
        if (!trimmed.toLowerCase().startsWith('https://')) {
            setLinkError('URL must start with https://')
            return
        }
        let priceValue: number | null = null
        const priceTrimmed = linkPriceDraft.trim()
        if (priceTrimmed) {
            const parsed = Number(priceTrimmed)
            if (!Number.isFinite(parsed) || parsed < 0) {
                setLinkError('Price must be a non-negative number')
                return
            }
            priceValue = parsed
        }
        track(POSTHOG_EVENTS.FLIGHTS_TAB_MANUAL_OFFER_SAVE, {
            section_id: sectionId,
            has_price: priceValue != null
        })
        setManualOfferMutation.mutate({ sectionId, url: trimmed, price: priceValue })
    }

    // ─────────────────────────────────────────────────────────────────────
    // Anchor-card auto-redirect — fired when the user taps Book on the
    // "In your Itinerary" card. The persisted affiliate_url expires hourly,
    // so we ensure Explore is searching, then await the live results below
    // (see `handleExploreResultsLoaded`).
    // ─────────────────────────────────────────────────────────────────────
    const handleAnchorBookClick = () => {
        if (!activeLeg || !inItineraryFlightForActiveLeg) return
        const refId = inItineraryFlightForActiveLeg.entity_id || inItineraryFlightForActiveLeg.metadata.reference_id
        if (!refId) return
        // Ensure Explore is the visible view and the leg's search has been
        // triggered. If results were already fetched (cache hit), the
        // matching effect below will open the live URL on the next render.
        setFlightsView('explore')
        setTriggeredLegIds((prev) => {
            if (prev.has(activeLeg.id)) return prev
            const next = new Set(prev)
            next.add(activeLeg.id)
            return next
        })
        setBookPendingForLegId(activeLeg.id)
        setBookPendingRefId(refId)
    }

    const handleExploreResultsLoaded = useCallback(
        (legId: string, flights: ExploreFlight[]) => {
            if (!bookPendingForLegId || legId !== bookPendingForLegId) return
            const refId = bookPendingRefId
            const sectionForAnalytics = inItineraryFlightForActiveLeg
            const baseExtras: Record<string, unknown> = {
                section_id: sectionForAnalytics?.id,
                reference_id: refId,
                leg_id: legId
            }
            const match = refId ? flights.find((f) => f.reference_id === refId) : undefined
            if (match && match.best_offer?.affiliate_url) {
                track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK, {
                    ...baseExtras,
                    source: 'anchor_auto_redirect',
                    matched: true,
                    provider: match.best_offer.provider,
                    price: match.best_offer.price
                })
                if (typeof window !== 'undefined') {
                    window.open(match.best_offer.affiliate_url, '_blank', 'noopener,noreferrer')
                }
            } else {
                track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK, {
                    ...baseExtras,
                    source: 'anchor_auto_redirect',
                    matched: false,
                    results_count: flights.length
                })
                // No match — scroll the first live result into view so the
                // user can pick manually instead of getting stuck on the anchor.
                if (typeof document !== 'undefined' && flights.length > 0) {
                    // TripboardFlightCard doesn't expose a stable id, so we
                    // settle for scrolling to the FlightExploreView region
                    // (the explore-view header lands the first card in frame).
                    const firstCard = document.querySelector('[data-flight-explore-list]')
                    if (firstCard && 'scrollIntoView' in firstCard) {
                        ;(firstCard as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }
            }
            setBookPendingForLegId(null)
            setBookPendingRefId(null)
        },
        // ``track`` is a closure over trackButtonClickCustom + collectionIdentifier
        // — both stable across renders, but lint-safe to depend on the
        // bookPending state explicitly so we re-arm after each click.
        [bookPendingForLegId, bookPendingRefId, inItineraryFlightForActiveLeg]
    )

    return (
        <div
            className="w-full min-h-screen"
            style={{ background: '#F5F4F7' }}>
            {/* Sticky cluster (LegStrip + ViewToggle). Mobile: header pinned
                outside, so top-0. Desktop: scrolls under the 72px header.
                Downstream stickies (Sort/filter) offset below this. */}
            <div className="sticky top-0 md:top-[72px] z-30 bg-white">
                {/* Mobile-only hide of the LegStrip on scroll-down. Collapses
                    the row's HEIGHT (grid-rows 1fr→0fr) rather than only
                    translating it: a transform-only hide leaves the element's
                    box in flow, so the sticky white cluster showed an empty
                    band where the strip slid away. Collapsing the height lets
                    the cards rise flush under the main tab bar — no white gap. */}
                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isMobileViewport && hideSecondaryHeader
                            ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            : 'grid-rows-[1fr] opacity-100'
                    }`}>
                    <div className="overflow-hidden min-w-0">
                <LegStrip
                    legs={legs}
                    activeLegId={activeLegId}
                    onSelectLeg={(legId) => {
                        if (legId !== activeLegId) {
                            const leg = legs.find((l) => l.id === legId)
                            track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_SELECT, {
                                leg_id: legId,
                                kind: leg?.kind,
                                from: leg?.from,
                                to: leg?.to
                            })
                        }
                        setActiveLegId(legId)
                    }}
                    onEditLeg={handleLegEdit}
                    onAddLeg={() => {
                        track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_ADD_OPEN)
                        setShowAddLeg(true)
                    }}
                    canEdit={!isReadOnly && !!collectionIdentifier}
                />
                    </div>
                </div>
                {/* Secondary controls (toggle / Browse).
                    Mobile-only collapse — desktop keeps these visible
                    because the downstream SORT row is `lg:sticky
                    lg:top-[206px]` (fixed offset). Shrinking the cluster
                    height on desktop leaves a gap between the now-shorter
                    sticky cluster and the SORT row at 206px, so flight
                    cards bleed through above the SORT row. */}
                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isMobileViewport && hideSecondaryHeader
                            ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            : 'grid-rows-[1fr] opacity-100'
                    }`}>
                    <div className="overflow-hidden min-w-0">
                        {legs.length > 0 && (
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-grey-4 flex-wrap max-sm:flex-nowrap max-sm:gap-2 bg-white">
                                <FlightsViewToggle
                                    view={flightsView}
                                    shortlistedCount={flightSectionsForActiveLeg.length}
                                    onChange={handleFlightsViewChange}
                                />
                                <div className="flex items-center gap-3 ml-auto flex-wrap">
                                    <span
                                        className="font-manrope hidden sm:inline"
                                        style={{ fontWeight: 500, fontSize: 12, color: '#747474' }}>
                                        Final price confirmed at provider checkout
                                    </span>
                                    <a
                                        href="/flights"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            track(POSTHOG_EVENTS.FLIGHTS_TAB_EXPLORE_BROWSE_CLICK)
                                        }}>
                                        <span className="hidden sm:inline text-[12px] font-semibold font-manrope text-grey-0 tracking-[-0.24px] leading-4 whitespace-nowrap">
                                            Explore more flights
                                        </span>
                                        <span className="text-[12px] font-bold font-red-hat-display text-primary-default tracking-[-0.24px] leading-4 underline whitespace-nowrap">
                                            Browse
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-primary-default shrink-0" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Gray spacer extends the sticky cluster down so it meets the
                    SORT row + Filter aside (sticky at top-[190/206]) without a
                    gap. Cards scrolling behind the cluster can't peek through
                    the breathing room because this strip masks them.
                    Collapses to 0 on mobile scroll-down along with the rest of
                    the cluster — otherwise this 16px strip stays as a stray
                    gray band under the tab bar once the leg strip is hidden. */}
                {legs.length > 0 && (
                    <div
                        className={`transition-[height] duration-300 ease-out ${
                            isMobileViewport && hideSecondaryHeader ? 'h-0' : 'h-4'
                        }`}
                        style={{ background: '#F5F4F7' }}
                    />
                )}
            </div>
            {isLoading ? (
                <div className="px-4 py-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <CustomShimmer
                            key={i}
                            className="h-40 rounded-xl"
                        />
                    ))}
                </div>
            ) : legs.length === 0 ? (
                <div className="flex items-center justify-center py-8 px-4">
                    <div className="bg-white flex flex-col gap-4 items-center px-8 py-6 rounded-2xl shadow-[0px_2px_8px_0px_#dfdde0] max-w-sm w-full">
                        <div className="grid place-items-center w-10 h-10 rounded-full bg-primary-pale-purple">
                            <Plane className="w-5 h-5 text-primary-default" />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <h3 className="text-[15px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.3px] leading-5 text-center">
                                No flights in your itinerary yet
                            </h3>
                            <p className="text-[12px] font-medium font-manrope text-grey-2 tracking-[-0.24px] leading-4 text-center">
                                Add your first leg and we'll surface options to shortlist.
                            </p>
                        </div>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => {
                                    track(POSTHOG_EVENTS.FLIGHTS_TAB_LEG_ADD_OPEN)
                                    setShowAddLeg(true)
                                }}
                                disabled={createFlightSlotMutation.isPending}
                                className="bg-primary-default text-white font-red-hat-display font-bold text-[13px] tracking-[-0.26px] leading-[16px] px-4 py-2.5 rounded-xl flex items-center gap-1 hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                                {createFlightSlotMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add your first flight
                            </button>
                        )}
                    </div>
                </div>
            ) : flightsView === 'explore' && activeLeg ? (
                <div className="w-full">
                    {inItineraryFlightForActiveLeg && hasAnchorFlightSignal(inItineraryFlightForActiveLeg) ? (
                        <div className="w-full max-w-5xl mx-auto px-4 pt-4">
                            <AnchorFlightCard
                                section={inItineraryFlightForActiveLeg}
                                leg={activeLeg}
                                livePriceData={livePrices[inItineraryFlightForActiveLeg.entity_id] || livePrices[inItineraryFlightForActiveLeg.id]}
                                isBookPending={bookPendingForLegId === activeLeg.id}
                                onBook={() => {
                                    track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK, {
                                        section_id: inItineraryFlightForActiveLeg.id,
                                        reference_id: inItineraryFlightForActiveLeg.entity_id || inItineraryFlightForActiveLeg.metadata.reference_id,
                                        provider: inItineraryFlightForActiveLeg.metadata.best_offer?.provider,
                                        price: inItineraryFlightForActiveLeg.metadata.best_offer?.price,
                                        source: 'anchor'
                                    })
                                    handleAnchorBookClick()
                                }}
                                onToggleDeals={(expanded) => {
                                    track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_DEALS_TOGGLE, {
                                        section_id: inItineraryFlightForActiveLeg.id,
                                        reference_id: inItineraryFlightForActiveLeg.entity_id || inItineraryFlightForActiveLeg.metadata.reference_id,
                                        expanded,
                                        deals_count: (inItineraryFlightForActiveLeg.metadata.price_comparison || []).length,
                                        leg_id: activeLeg.id,
                                        source: 'anchor'
                                    })
                                }}
                                onDealClick={(deal) => {
                                    track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK, {
                                        section_id: inItineraryFlightForActiveLeg.id,
                                        reference_id: inItineraryFlightForActiveLeg.entity_id || inItineraryFlightForActiveLeg.metadata.reference_id,
                                        provider: deal.provider,
                                        price: deal.price,
                                        is_cheapest: deal.isCheapest,
                                        leg_id: activeLeg.id,
                                        source: 'anchor_deal'
                                    })
                                }}
                            />
                            <div className="mt-10 mb-3.5">
                                <div className="font-red-hat-display text-[11px] font-extrabold uppercase tracking-[0.08em] text-grey-2">
                                    Not sure yet?
                                </div>
                                <h2 className="mt-1.5 font-red-hat-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-grey-0">
                                    Explore other options
                                </h2>
                                <p className="mt-1.5 max-w-[480px] font-manrope text-[13px] font-medium leading-[1.4] text-grey-2">
                                    We'll search 100+ booking partners for this leg. Anything you like becomes a swap candidate for the flight above.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    <FlightExploreView
                        leg={activeLeg}
                        shortlistedReferenceIds={shortlistedReferenceIds}
                        onShortlist={handleShortlistFlight}
                        onUnshortlist={handleUnshortlistFlight}
                        hasSearched={activeLegHasSearched}
                        onTriggerSearch={triggerSearchForActiveLeg}
                        inItineraryReferenceIds={new Set(Array.from(flightSlotsByReferenceId.keys()))}
                        onAddToItinerary={canAddToItinerary && !isReadOnly ? openFlightModalForExplore : undefined}
                        hasItineraryFlightOnLeg={!!inItineraryFlightForActiveLeg}
                        onResultsLoaded={handleExploreResultsLoaded}
                        tripId={tripId}
                    />
                </div>
            ) : flightSectionsForActiveLeg.length === 0 ? (
                <div className="flex items-center justify-center py-8 sm:py-12 px-4">
                    <div className="bg-white flex flex-col gap-8 items-center px-10 py-8 rounded-2xl shadow-[0px_2px_8px_0px_#dfdde0] max-w-sm w-full">
                        <div className="flex flex-col gap-2 items-center w-full">
                            <h3 className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5 text-center">
                                {activeLegRouteLabel ? `No shortlisted flights for ${activeLegRouteLabel}` : 'No shortlisted flights yet'}
                            </h3>
                            <p className="text-[14px] font-semibold font-manrope text-grey-2 tracking-[-0.28px] leading-[18px] text-center max-w-[260px]">
                                Tap the{' '}
                                <span className="inline-flex align-middle mx-[2px]">
                                    <Plus className="w-[16px] h-[16px] text-grey-2" />
                                </span>{' '}
                                button on a flight in Explore to save it here
                            </p>
                        </div>
                        {activeLeg ? (
                            <button
                                type="button"
                                onClick={() => {
                                    // Clicking "Browse flights" is itself a deliberate
                                    // commit — pre-trigger so Explore renders results
                                    // straight away instead of the confirmation gate.
                                    triggerSearchForActiveLeg()
                                    handleFlightsViewChange('explore')
                                }}
                                className="bg-primary-default text-white font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px] px-4 py-3 rounded-xl flex items-center gap-1 hover:bg-primary-dark transition-colors cursor-pointer">
                                <Sparkles className="w-4 h-4" />
                                Browse flights
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowAddLeg(true)}
                                className="bg-primary-default text-white font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px] px-4 py-3 rounded-xl flex items-center gap-1 hover:bg-primary-dark transition-colors cursor-pointer">
                                <Plus className="w-4 h-4" />
                                Add a leg
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                renderFlightSectionsList()
            )}
            <LegEditModal
                open={!!editingLeg || showAddLeg}
                mode={editingLeg ? 'edit' : 'add'}
                leg={editingLeg}
                onClose={() => {
                    setEditingLeg(null)
                    setShowAddLeg(false)
                }}
                onSubmit={handleLegSubmit}
                onDelete={
                    editingLeg
                        ? async () => {
                              const id = editingLeg.id
                              setEditingLeg(null)
                              await handleLegRemove(id)
                          }
                        : undefined
                }
                deleting={removeFlightSlotMutation.isPending}
                itineraryDays={itineraryDays?.map((d) => ({ date: d.date }))}
            />
        </div>
    )

    // Hoisted function declaration so the JSX block stays put at the bottom
    // of the component. Renders the active leg's filtered flight-sections list.
    function renderFlightSectionsList() {
        return (
            <div className="px-4 py-4 space-y-4 w-full max-w-5xl mx-auto">
                {isLoadingPrices && flightSectionsForActiveLeg.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-700 font-medium">
                        <Loader className="w-4 h-4 animate-spin" />
                        Fetching live prices from providers...
                    </div>
                )}
                {flightSectionsForActiveLegOrdered.map((section) => {
                    const { metadata } = section
                    if (!metadata?.segments?.length) return null

                    const firstSeg = metadata.segments[0]
                    const lastSeg = metadata.segments[metadata.segments.length - 1]
                    const airlineCode = firstSeg?.airline?.code || ''
                    const airlineName = firstSeg?.airline?.name || 'Airline'

                    // Round-trip split — mirrors TripboardFlightCard / FlightsBudgetSection
                    // so the saved-flight card on the Shortlisted view doesn't render
                    // outbound + destination-stay + return as one continuous time-rail.
                    const splitResult = splitSegmentsByGap(metadata.segments)
                    const isRoundTrip = splitResult.isRoundTrip || metadata.journey_type === 2 || !!metadata.return_date
                    const outboundStats = computeLegStats(splitResult.outbound)
                    const inboundStats = computeLegStats(splitResult.inbound)
                    const headerFromCode = firstSeg?.origin?.airport_code
                    const headerToCode = isRoundTrip ? outboundStats.arrivalCode : lastSeg?.destination?.airport_code
                    const headerArrow = isRoundTrip ? '⇄' : '→'

                    const manualOffer = metadata.manual_offer
                    const hasManualOffer = !!manualOffer?.url

                    // Use live price if available, otherwise stored price. Manual-offer
                    // cards still surface the Kayak price — the Skyscanner link is a CTA
                    // only, not a price source.
                    const livePrice = livePrices[section.entity_id] || livePrices[section.id]
                    const priceComparison = hasManualOffer ? [] : livePrice?.price_comparison || []
                    const bestOffer = livePrice?.best_offer || metadata.best_offer
                    const displayPrice = bestOffer?.price || livePrice?.total_price || metadata.total_price
                    const numericDisplayPrice =
                        typeof displayPrice === 'number' ? displayPrice : displayPrice ? parseFloat(String(displayPrice)) : NaN
                    const isLivePrice = !!livePrice

                    // Sort deals by price and mark cheapest
                    const sortedDeals = [...priceComparison].sort((a, b) => (a.price || 0) - (b.price || 0))
                    const cheapestPrice = sortedDeals.length > 0 ? sortedDeals[0].price : null
                    const allDeals = sortedDeals

                    const isDealsExpanded = !!expandedDealsBySectionId[section.id]
                    const isEditingThisLink = editingLinkSectionId === section.id
                    const isSavingLink = setManualOfferMutation.isPending && setManualOfferMutation.variables?.sectionId === section.id
                    const isClearingLink = clearManualOfferMutation.isPending && clearManualOfferMutation.variables === section.id

                    const refIdForCard = section.entity_id || section.metadata.reference_id
                    const isInItineraryCard = flightSlotsByReferenceId.has(refIdForCard)
                    return (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative rounded-2xl border bg-white transition-colors overflow-hidden ${
                                isInItineraryCard
                                    ? 'border-secondary-green/40 shadow-[0px_2px_8px_0px_rgba(0,168,120,0.18)] hover:border-secondary-green/60'
                                    : 'border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0] hover:border-grey-0'
                            }`}>
                            <div className="p-4">
                                {/* Row 1: Airline + route on the left, "Add to
                                Itinerary" text + Heart icon on the right.
                                Mirrors the stays card pattern: itinerary
                                action gets primary visual weight, shortlist
                                heart sits as a smaller secondary affordance. */}
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                            src={getAirlineLogo(airlineCode)}
                                            alt={airlineName}
                                            className="w-9 h-9 rounded-lg object-contain border border-grey-4 bg-white p-0.5 shrink-0"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-red-hat-display text-[15px] font-bold text-grey-0 truncate">
                                                    {headerFromCode} {headerArrow} {headerToCode}
                                                </p>
                                                {isLivePrice && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f7ee] px-1.5 py-px font-manrope text-[9px] font-bold text-secondary-green shrink-0">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary-green animate-pulse" />
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-manrope text-xs text-grey-2 truncate">{airlineName}</span>
                                                {metadata.is_refundable && <span className="font-manrope text-[10px] text-grey-3">· Refundable</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {canAddToItinerary &&
                                            !isReadOnly &&
                                            // When the flight is already on the itinerary, render a
                                            // static label (matches the stays card pattern) — clicking
                                            // it shouldn't reopen the picker. The user can remove via
                                            // the Heart toggle or from the Budget tab.
                                            (isInItineraryCard ? (
                                                <span
                                                    className="font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-4 whitespace-nowrap shrink-0"
                                                    style={{ color: '#00A878' }}>
                                                    In your Itinerary
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openFlightModalForSection(section)}
                                                    className="font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-4 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none transition-colors"
                                                    style={{ color: '#7011F6' }}>
                                                    Add to Itinerary
                                                </button>
                                            ))}
                                        {onDeleteSection ? (
                                            <button
                                                type="button"
                                                disabled={isDeleting}
                                                onClick={() => {
                                                    track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_SHORTLIST_REMOVE, {
                                                        reference_id: refIdForCard,
                                                        section_id: section.id,
                                                        leg_id: (section.metadata as { leg_id?: string }).leg_id,
                                                        source: 'shortlisted'
                                                    })
                                                    onDeleteSection(section.id)
                                                }}
                                                aria-label="Remove from shortlist"
                                                title="Remove from shortlist"
                                                className="group grid place-items-center h-7 w-7 rounded-full bg-white border border-grey-4 hover:border-red-300 hover:bg-red-50 shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                                                {isDeleting ? (
                                                    <Loader className="w-3.5 h-3.5 text-primary-default animate-spin" />
                                                ) : (
                                                    <Heart className="w-3.5 h-3.5 text-primary-default fill-primary-default group-hover:text-red-500 group-hover:fill-red-500 transition-colors" />
                                                )}
                                            </button>
                                        ) : (
                                            <span
                                                aria-label="Shortlisted"
                                                title="Shortlisted"
                                                className="grid place-items-center h-7 w-7 rounded-full bg-white border border-grey-4 shrink-0">
                                                <Heart className="w-3.5 h-3.5 text-primary-default fill-primary-default" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Row 2: Timeline — two stacked rails for round-trip,
                                one rail for one-way. Mirrors the Explore card. */}
                                {isRoundTrip ? (
                                    <div className="flex flex-col gap-2.5 py-2">
                                        <SavedFlightTimeRail
                                            label="Outbound"
                                            stats={outboundStats}
                                        />
                                        <div className="h-px bg-grey-4/60" />
                                        <SavedFlightTimeRail
                                            label="Return"
                                            stats={inboundStats}
                                        />
                                    </div>
                                ) : (
                                    <SavedFlightTimeRail
                                        stats={outboundStats}
                                        fallbackDuration={
                                            metadata.formatted_duration ||
                                            `${Math.floor(metadata.total_duration / 60)}h ${metadata.total_duration % 60}m`
                                        }
                                        fallbackStopsLabel={`${getStopsLabel(metadata.stop_count)}${
                                            metadata.stop_count > 0 && metadata.segments.length > 1
                                                ? ` · ${metadata.segments.length - 1} layover`
                                                : ''
                                        }`}
                                    />
                                )}

                                {/* Row 3: Price + provider | Book + deals link.
                                When a manual Skyscanner offer is set, the price
                                still reflects live Kayak; the CTA routes the user
                                to Skyscanner for booking. */}
                                {hasManualOffer ? (
                                    <div className="flex items-start justify-between gap-3 pt-3 border-t border-grey-4/60">
                                        {displayPrice ? (
                                            <div className="flex flex-col shrink-0">
                                                <p className="font-red-hat-display text-xl font-extrabold text-grey-0">
                                                    {formatAmount(displayPrice)}
                                                </p>
                                                <FlightPriceChangePill
                                                    sectionId={section.id}
                                                    currentPrice={isNaN(numericDisplayPrice) ? null : numericDisplayPrice}
                                                />
                                            </div>
                                        ) : (
                                            <span />
                                        )}
                                        <a
                                            href={manualOffer!.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Compare on Skyscanner"
                                            className="group flex items-center gap-2 rounded-xl border border-grey-4 bg-white hover:border-grey-3 hover:shadow-sm px-4 py-1 shrink-0 transition-all">
                                            <span className="font-manrope text-sm font-bold text-grey-0 whitespace-nowrap leading-tight">
                                                Compare on
                                            </span>
                                            <img
                                                src={SKYSCANNER_WORDMARK_URL}
                                                alt="Skyscanner"
                                                className="h-3.5 w-auto object-contain shrink-0"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                }}
                                            />
                                            <ArrowUpRight className="w-4 h-4 text-grey-2 group-hover:text-grey-0 shrink-0 transition-colors" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between pt-3 border-t border-grey-4/60">
                                        {/* Left: price + provider */}
                                        <div className="min-w-0">
                                            {allDeals.length > 0 && (
                                                <span className="inline-block rounded-full bg-secondary-green/10 px-2 py-px font-manrope text-[9px] font-bold text-secondary-green uppercase mb-1">
                                                    Cheapest
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2.5">
                                                <p className="font-red-hat-display text-xl font-extrabold text-grey-0 shrink-0">
                                                    {formatAmount(displayPrice)}
                                                </p>
                                                {(() => {
                                                    const headerLogo = resolveOfferLogo(bestOffer)
                                                    if (headerLogo) {
                                                        return (
                                                            <img
                                                                src={headerLogo}
                                                                alt={bestOffer?.provider || ''}
                                                                className="h-7 w-auto max-w-36 object-contain shrink-0"
                                                                onError={(e) => {
                                                                    const target = e.currentTarget
                                                                    target.style.display = 'none'
                                                                    const fallback = target.nextElementSibling as HTMLElement
                                                                    if (fallback) fallback.style.display = ''
                                                                }}
                                                            />
                                                        )
                                                    }
                                                    return (
                                                        <span className="font-manrope text-[11px] text-grey-2 shrink-0">
                                                            via {bestOffer?.provider || 'provider'}
                                                        </span>
                                                    )
                                                })()}
                                                <span
                                                    className="font-manrope text-[11px] text-grey-2 shrink-0"
                                                    style={{ display: 'none' }}>
                                                    via {bestOffer?.provider || 'provider'}
                                                </span>
                                            </div>
                                            <FlightPriceChangePill
                                                sectionId={section.id}
                                                currentPrice={isNaN(numericDisplayPrice) ? null : numericDisplayPrice}
                                            />
                                        </div>

                                        {/* Right: deals link + Book + Add-to-itinerary stacked */}
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            {allDeals.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const open = !isDealsExpanded
                                                        track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_DEALS_TOGGLE, {
                                                            section_id: section.id,
                                                            reference_id: refIdForCard,
                                                            open,
                                                            deal_count: allDeals.length
                                                        })
                                                        setExpandedDealsBySectionId((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                                                    }}
                                                    className="font-manrope text-[11px] font-medium text-grey-2 hover:text-primary-default cursor-pointer transition-colors">
                                                    {isDealsExpanded
                                                        ? 'Hide deals'
                                                        : `${allDeals.length - 1} more deal${allDeals.length - 1 > 1 ? 's' : ''} →`}
                                                </button>
                                            )}
                                            {bestOffer?.affiliate_url && (
                                                <a
                                                    href={bestOffer.affiliate_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => {
                                                        track(POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK, {
                                                            section_id: section.id,
                                                            reference_id: refIdForCard,
                                                            provider: bestOffer?.provider,
                                                            price: bestOffer?.price,
                                                            source: 'shortlisted'
                                                        })
                                                    }}
                                                    className="flex items-center gap-1.5 rounded-xl bg-primary-pale-purple px-4 py-2 font-manrope text-[13px] font-bold text-primary-default hover:bg-primary-default hover:text-white transition-colors">
                                                    Book
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Expanded deals — suppressed for manual-offer cards */}
                                {!hasManualOffer && isDealsExpanded && allDeals.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                        {allDeals.map((deal, idx) => (
                                            <FlightDealChip
                                                key={`${deal.provider}-${idx}`}
                                                deal={deal}
                                                isHighlighted={deal.price === cheapestPrice && idx === 0}
                                            />
                                        ))}
                                    </motion.div>
                                )}

                                {/* Loading state for deals — suppressed for manual-offer cards */}
                                {!hasManualOffer && isLoadingPrices && sortedDeals.length === 0 && (
                                    <div className="mt-3">
                                        <DealChipShimmer />
                                    </div>
                                )}

                                {/* Internal-user link toolbar (Skyscanner) */}
                                {isRimigoInternal && collectionIdentifier && (
                                    <div className="mt-3 pt-3 border-t border-grey-4/60">
                                        {isEditingThisLink ? (
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-manrope text-[11px] font-bold text-grey-2 shrink-0">Skyscanner URL</span>
                                                    <input
                                                        type="url"
                                                        value={linkUrlDraft}
                                                        onChange={(e) => setLinkUrlDraft(e.target.value)}
                                                        placeholder="https://www.skyscanner.co.in/..."
                                                        className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-grey-4 font-manrope text-xs text-grey-0 focus:outline-none focus:border-primary-default"
                                                    />
                                                    <span className="font-manrope text-[11px] font-bold text-grey-2 shrink-0">₹</span>
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={0}
                                                        value={linkPriceDraft}
                                                        onChange={(e) => setLinkPriceDraft(e.target.value)}
                                                        placeholder="approx"
                                                        className="w-20 px-2 py-1 rounded-lg border border-grey-4 font-manrope text-xs text-grey-0 focus:outline-none focus:border-primary-default"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isSavingLink}
                                                        onClick={() => saveLink(section.id)}
                                                        className="rounded-lg bg-primary-default px-3 py-1 font-manrope text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                                                        {isSavingLink ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEdit}
                                                        className="rounded-lg border border-grey-4 px-2 py-1 font-manrope text-[11px] text-grey-2 hover:text-grey-0">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {linkError && <span className="font-manrope text-[10px] text-red-500">{linkError}</span>}
                                            </div>
                                        ) : hasManualOffer ? (
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Link2 className="w-3 h-3 text-grey-3 shrink-0" />
                                                    <span
                                                        className="font-manrope text-[11px] text-grey-2 truncate"
                                                        title={manualOffer!.url}>
                                                        {manualOffer!.url}
                                                    </span>
                                                    {manualOffer!.price != null && (
                                                        <span className="font-manrope text-[10px] text-grey-3 shrink-0">
                                                            · {formatAmount(manualOffer!.price)} approx
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(section.id, manualOffer!.url, manualOffer!.price ?? null)}
                                                        className="flex items-center gap-1 rounded-lg border border-grey-4 px-2 py-1 font-manrope text-[10px] font-medium text-grey-2 hover:text-primary-default hover:border-primary-default/40">
                                                        <Pencil className="w-3 h-3" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isClearingLink}
                                                        onClick={() => {
                                                            track(POSTHOG_EVENTS.FLIGHTS_TAB_MANUAL_OFFER_CLEAR, {
                                                                section_id: section.id
                                                            })
                                                            clearManualOfferMutation.mutate(section.id)
                                                        }}
                                                        className="flex items-center gap-1 rounded-lg border border-grey-4 px-2 py-1 font-manrope text-[10px] font-medium text-grey-2 hover:text-red-500 hover:border-red-300 disabled:opacity-50">
                                                        <Trash2 className="w-3 h-3" /> {isClearingLink ? 'Removing…' : 'Remove'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => startEdit(section.id)}
                                                className="flex items-center gap-1.5 font-manrope text-[11px] font-semibold text-grey-2 hover:text-primary-default">
                                                <Link2 className="w-3 h-3" />
                                                Add Skyscanner link
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        )
    }
}

/* ─────────────────────────────────────────────
   Round-trip segment split + per-leg time rail.
   Mirrors TripboardFlightCard / FlightsBudgetSection
   so the saved-flight card on the Shortlisted view
   reads identically for round-trip flights.
   ───────────────────────────────────────────── */

interface SavedSegmentLike {
    airline?: { code?: string; name?: string; flight_number?: string }
    origin?: { airport_code?: string; departure_time?: string }
    destination?: { airport_code?: string; arrival_time?: string }
    duration?: { minutes?: number; formatted?: string }
}

interface SavedLegStats {
    departureTime?: string
    arrivalTime?: string
    departureCode?: string
    arrivalCode?: string
    durationMinutes: number
    stopsCount: number
    stopCodes: string[]
}

/** Find the largest arrival→next-departure gap; if it exceeds 18h, treat
 *  as the destination stay between outbound and return legs. */
function splitSegmentsByGap(segments: SavedSegmentLike[]): {
    outbound: SavedSegmentLike[]
    inbound: SavedSegmentLike[]
    isRoundTrip: boolean
} {
    if (!segments || segments.length < 2) {
        return { outbound: segments || [], inbound: [], isRoundTrip: false }
    }
    const eighteenHoursMs = 18 * 60 * 60 * 1000
    let bestGap = 0
    let bestIdx = -1
    for (let i = 0; i < segments.length - 1; i += 1) {
        const arr = new Date(segments[i].destination?.arrival_time || '').getTime()
        const dep = new Date(segments[i + 1].origin?.departure_time || '').getTime()
        if (Number.isFinite(arr) && Number.isFinite(dep)) {
            const gap = dep - arr
            if (gap > bestGap) {
                bestGap = gap
                bestIdx = i
            }
        }
    }
    if (bestIdx >= 0 && bestGap > eighteenHoursMs) {
        return {
            outbound: segments.slice(0, bestIdx + 1),
            inbound: segments.slice(bestIdx + 1),
            isRoundTrip: true
        }
    }
    return { outbound: segments, inbound: [], isRoundTrip: false }
}

function computeLegStats(segments: SavedSegmentLike[]): SavedLegStats {
    if (!segments || segments.length === 0) {
        return { durationMinutes: 0, stopsCount: 0, stopCodes: [] }
    }
    const first = segments[0]
    const last = segments[segments.length - 1]
    const dep = new Date(first.origin?.departure_time || '').getTime()
    const arr = new Date(last.destination?.arrival_time || '').getTime()
    const durationMinutes = Number.isFinite(dep) && Number.isFinite(arr) ? Math.max(0, Math.round((arr - dep) / 60000)) : 0
    const stopCodes = segments
        .slice(0, -1)
        .map((s) => s.destination?.airport_code)
        .filter((c): c is string => !!c)
    return {
        departureTime: first.origin?.departure_time,
        arrivalTime: last.destination?.arrival_time,
        departureCode: first.origin?.airport_code,
        arrivalCode: last.destination?.airport_code,
        durationMinutes,
        stopsCount: Math.max(0, segments.length - 1),
        stopCodes
    }
}

function formatLegDuration(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes <= 0) return '--'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface SavedFlightTimeRailProps {
    label?: string
    stats: SavedLegStats
    /** Optional override for one-way cards that prefer the API-supplied
     *  ``formatted_duration`` over the computed one. */
    fallbackDuration?: string
    fallbackStopsLabel?: string
}

const SavedFlightTimeRail: React.FC<SavedFlightTimeRailProps> = ({ label, stats, fallbackDuration, fallbackStopsLabel }) => {
    const durationLabel = fallbackDuration || formatLegDuration(stats.durationMinutes)
    const stopsLabel =
        fallbackStopsLabel ||
        `${stats.stopsCount === 0 ? 'Direct' : `${stats.stopsCount} stop${stats.stopsCount > 1 ? 's' : ''}`}${
            stats.stopsCount > 0 && stats.stopCodes.length ? ` · ${stats.stopCodes.join(', ')}` : ''
        }`
    return (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2">
            <div className="min-w-0">
                {label && <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.06em] text-grey-3 mb-0.5">{label}</p>}
                <p className="font-red-hat-display text-lg font-extrabold text-grey-0 leading-tight tabular-nums">
                    {formatTime(stats.departureTime)}
                </p>
                <p className="font-manrope text-[11px] text-grey-2 mt-0.5">
                    {formatDate(stats.departureTime)} · {stats.departureCode || '—'}
                </p>
            </div>
            <div className="flex flex-col items-center w-full max-w-64 mx-auto">
                {label && <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.06em] mb-0.5 invisible">_</p>}
                <p className="font-manrope text-[11px] font-semibold text-grey-2 tabular-nums">{durationLabel}</p>
                <div className="w-full flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-primary-default" />
                    <div className="h-px flex-1 bg-grey-3" />
                    <span className="w-2 h-2 rounded-full bg-primary-default" />
                </div>
                <p className="font-manrope text-[11px] text-grey-3 mt-1">{stopsLabel}</p>
            </div>
            <div className="min-w-0 text-right">
                {label && <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.06em] mb-0.5 invisible">_</p>}
                <p className="font-red-hat-display text-lg font-extrabold text-grey-0 leading-tight tabular-nums">{formatTime(stats.arrivalTime)}</p>
                <p className="font-manrope text-[11px] text-grey-2 mt-0.5">
                    {formatDate(stats.arrivalTime)} · {stats.arrivalCode || '—'}
                </p>
            </div>
        </div>
    )
}

export default FlightsTab
