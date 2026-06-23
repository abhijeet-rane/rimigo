import { useMemo, useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { SuggestedAlternativesDrawer } from './SuggestedAlternativesDrawer'
import type { AlternativeSlot } from './SuggestedAlternativesDrawer'
import Typography from '@/components/shared/Typography'
import { OrDivider } from '@/components/shared/OrDivider'
import { CityListItem } from '@/components/common/SearchBar'
import {
    Plus,
    Car,
    Plane,
    Train,
    Bus,
    Ship,
    CarTaxiFront,
    BedDouble,
    ArrowRight,
    Map as MapIcon,
    Loader2,
    MoreHorizontal,
    Sparkles,
    GripVertical,
    ChevronRight,
    ChevronDown,
    Clock,
    Link,
    BookOpen,
    Star,
    Wine,
    MapPin,
    ArrowLeftRight
} from 'lucide-react'
import SafeImage from './SafeImage'
import { BEACH_TREE, PLACE_LOCATION_PIN_ICON } from '@/constants/icons/svgFromCDN'
import { createPortal } from 'react-dom'
import { SneakPeekModal } from '@/modules/Acitvities/components/SneakPeakModal'
import { MobileSlotOptionsMenu } from './MobileSlotOptionsMenu'
import { useIsMobile } from '../hooks/ItineraryHook'
import { canonicalizeMode, displayTitle, isFlightTransport, parseTransportTitle } from '../utils/transportTitle'
import { FlightTransportCard } from './FlightTransportCard'
import { getFlightEnrichment } from './transportSlotRenderers'
import { resolveMealPlaceImage } from '../utils/mealPlaceImage'
import { capitalizeFirstLetter } from '@/utils/formatTextUtil'
import { findTransportMode } from '../constants/transportModes'
import { isTransportKind } from '../constants/transportKinds'
import { ITINERARY_BOARD_ALL_EXPERIENCE_HERO_IMAGES } from '../constants'
import type { KanbanPendingPlacement, KanbanPlacementCommitPayload, KanbanCustomTimeOpenArgs } from './kanbanPlacementUtils'
import {
    mergePendingIntoSortedList,
    sortedVisibleForDay,
    computePlacementAnchorUtcMs,
    getEventDurationMs,
    formatKanbanTimeLabel,
    kanbanDropIsNoOpSamePosition,
    scrollKanbanPendingPlacementIntoView,
    getKanbanDayColumnKey
} from './kanbanPlacementUtils'
import { ChooseStartTimeStrip } from './ChooseStartTimeStrip'
import { SlotDetailDesktopModal } from './SlotDetailDesktopModal'
import { getKanbanSlotMetaFlags, getSlotAttachmentsList, getSlotSuggestionStrings } from './slotDetailShared'
import { BULB_ICON } from '@/constants/thiingsIcons'
import { useFocusInView } from '@/hooks/use-focus-in-view'
import { CustomSlotDescription } from './CustomSlotDescription'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { cn } from '@/lib/utils'
import type { ItineraryStay } from '@/api/itineraryApi'
import { deriveDayStayMap } from '../utils/deriveStayMap'
import type { LinkedActivitySnapshot } from '../types/slotTypes'

export type { KanbanPendingPlacement, KanbanPlacementCommitPayload, KanbanCustomTimeOpenArgs } from './kanbanPlacementUtils'

interface DesktopKanbanViewProps {
    days: any[]
    /** ``itinerary.stays`` from the complete payload — used by the day header
     *  to render the hotel pill via ``day.stay_id`` lookup. */
    stays?: ItineraryStay[]
    /** Route-summary derived per-day sleep city name, keyed by
     *  ``YYYY-MM-DD``. Displayed in the day header in place of the
     *  legacy ``prev → current`` heuristic. Null/missing on overnight-
     *  transit days; the header falls back to the heuristic then. */
    sleepCityByDate?: Record<string, string>
    /** True while the initial route-summary fetch is in flight. When
     *  set, the day header renders a shimmer instead of the fallback
     *  heuristic so we don't briefly flash an incorrect city. */
    sleepCityLoading?: boolean
    /** Fired from the day header pill's popover menu: ``remove`` deletes the
     *  stay, ``change`` deletes it and navigates to the Stays Tab so the user
     *  can pick a new hotel for that city. */
    onStayAction?: (action: 'remove' | 'change', stayId: string, cityId: string | null) => void | Promise<void>
    /** Fired from the "+ Add stay" button rendered above unstayed city blocks
     *  on the kanban day header row. Navigates the user to the Stays Tab
     *  filtered to the city so they can pick a hotel. */
    onAddStay?: (cityId: string, dayDate?: string) => void
    events: any[]
    startDate: Date
    columns: number
    tripStartDate: Date | null
    onEditEvent?: (event: any) => void
    onDeleteEvent: (event: any) => void
    canEdit: boolean
    isViewer: boolean
    shortlistedExperienceIds: Set<string>
    onDateCardClick: (dayData: any, date: Date, cityListItem: CityListItem | null, dayNumber: number) => void
    onAddSlot: (day: any, date: Date) => void
    onMapClick?: (dayIndex: number) => void
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    changedSlotBadges?: Set<string>
    /** In-progress move: visual order + “choose time” strip until commit or cancel */
    pendingPlacement: KanbanPendingPlacement | null
    onPendingPlacementChange: (p: KanbanPendingPlacement | null) => void
    /** Apply placement + cascade day times (persists slots) */
    onPlacementCommit: (payload: KanbanPlacementCommitPayload) => void | Promise<void>
    /** Open Edit Slot with Date & time for “Custom” (parent wires AddEventModal) */
    onOpenCustomPlacementTime?: (args: KanbanCustomTimeOpenArgs) => void
    /** Hide the time strip while Edit Slot modal is open */
    hidePlacementTimeUi?: boolean
    /** Saving placement: show inline loader on this slot’s card only */
    placementSavingSlotId?: string | null
    hideExactDates?: boolean
    /** Open itinerary assistant with a day-scoped prompt (kanban day header / empty state) */
    onKanbanDayAssistant?: (args: {
        dayIndex: number
        dayNumber: number
        date: Date
        cityLabel: string
        intent: 'best_route' | 'shuffle' | 'find_activities' | 'custom'
        customMessage?: string
    }) => void
    /** Day header ⋯ menu: add day, clear slots, delete day (parent implements) */
    onKanbanDayMenuAction?: (
        action: 'add_day_before' | 'add_day_after' | 'clear_column' | 'delete_column',
        ctx: { dayIndex: number; dayNumber: number; date: Date }
    ) => void
    /** Reorder whole days by dragging the day header (desktop kanban only). */
    onKanbanDayReorder?: (fromIndex: number, toIndex: number) => void | Promise<void>
    /**
     * While day reorder persists to the server: `null` = idle; non-null = save in progress.
     * Each listed day index shows the column body overlay; other columns stay interactive.
     */
    dayColumnsReorderBusyIndices?: number[] | null
    /** Slot-level assistant (card hover ✦), same pipeline as day header AI */
    onKanbanSlotAssistant?: (args: {
        dayIndex: number
        dayNumber: number
        date: Date
        cityLabel: string
        event: any
        intent: 'detail' | 'alternate' | 'custom'
        customMessage?: string
    }) => void
    /** Left padding (px) so the day columns shift right when the wishlist overlay is open. */
    leftInset?: number
}

// Transport type mappings.
// Includes the abstract ``transport`` kind (what the concierge agent writes
// and what the backend enricher persists for generic transfers) alongside
// the concrete transit kinds. All of these render as ``TransportPill`` —
// they share the same visual design by intent.
// TRANSPORT_TYPES removed — see ``src/modules/Itinerary/constants/transportKinds.ts``
// for the canonical set (centralised so Kanban + calendar + mobile + map
// agree on which ``slot.kind`` values render as transport).

const TRANSPORT_PILL_STYLES: Record<string, { bg: string; text: string; border: string; icon: typeof Car }> = {
    flight: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600', icon: Plane },
    car: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-600', icon: Car },
    transfer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-600', icon: Car },
    taxi: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-600', icon: Car },
    private_transport: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-600', icon: CarTaxiFront },
    train: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-700', icon: Train },
    bus: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600', icon: Bus },
    shuttle: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600', icon: Bus },
    boat: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-blue-600', icon: Ship },
    ferry: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-blue-600', icon: Ship }
}

/** Shared elevation for kanban activity surfaces */
const KANBAN_CARD_SURFACE_CLASS =
    'border border-grey-4/90 md:shadow-[0_4px_22px_rgba(15,23,42,0.11)] md:transition-shadow md:duration-200 md:ease-out md:hover:shadow-[0_10px_36px_rgba(15,23,42,0.15)]'

/** Card + time strip while user must pick a time (blocks other drags) */
const KANBAN_PLACEMENT_FOCUS_CLASS = `${KANBAN_CARD_SURFACE_CLASS} z-20 ring-2 ring-primary-default ring-offset-2 ring-offset-[#f8f8f8] shadow-[0_12px_40px_-8px_rgba(15,23,42,0.14),0_0_0_4px_rgba(124,58,237,0.12)]`

const STAY_PILL_STYLES = {
    'check-in': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-600', icon: BedDouble },
    'check-out': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-600', icon: BedDouble },
    default: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-600', icon: BedDouble }
}

const formatTimeUTC = formatKanbanTimeLabel

/** Format a time range like "10:00am – 12:30pm" */
const formatTimeRange = (event: any) => {
    // Use start_time/end_time (original slot values) as primary, fall back to start/end (reconstructed)
    const startVal = event?.start_time || event?.start
    const endVal = event?.end_time || event?.end
    const s = formatTimeUTC(startVal)
    const e = formatTimeUTC(endVal)
    if (s && e && s !== e) return `${s} – ${e}`
    if (s) return s
    // Fall back to duration_minutes if no explicit times
    if (event?.duration_minutes) {
        const hrs = Math.floor(event.duration_minutes / 60)
        const mins = event.duration_minutes % 60
        if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
        if (hrs > 0) return `${hrs}h`
        if (mins > 0) return `${mins}m`
    }
    return ''
}

/** Human-readable 12-hour window label e.g. "10AM", "10:30AM", "7PM". Empty string for null/invalid. */
const formatDayTourTimeLabel = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    const hours = d.getUTCHours()
    const minutes = d.getUTCMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    const minuteLabel = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''
    return `${hour12}${minuteLabel}${period}`
}

/**
 * Whole-tour window for the Day Tour hero. Derived only from the slot's
 * own start/end — no per-activity times. Returns '' when either endpoint
 * is missing, in which case the meta row shows just the activity count.
 */
const formatDayTourWindow = (event: any): string => {
    const s = formatDayTourTimeLabel(event?.start_time || event?.start)
    const e = formatDayTourTimeLabel(event?.end_time || event?.end)
    if (s && e) return `${s} – ${e}`
    return ''
}

/** A slot is a Day Tour when its experience is a group activity with stops. */
const getDayTourLinkedActivities = (event: any): LinkedActivitySnapshot[] | null => {
    const slotData = event?.slotData || event?.slot_data
    if (!slotData?.is_group_experience) return null
    const activities = slotData.linked_activities
    if (!Array.isArray(activities) || activities.length === 0) return null
    return activities as LinkedActivitySnapshot[]
}

/** Desktop kanban: one line `time · link(s) · Notes` (board view extras only when showExtras) */
function KanbanDesktopSlotTimeLinkNotesLine({
    timeRange,
    event,
    showExtras,
    className,
    dotClassName
}: {
    timeRange: string
    event: any
    showExtras: boolean
    className: string
    dotClassName?: string
}) {
    const { attachmentCount, hasNotes } = getKanbanSlotMetaFlags(event)
    const dot = dotClassName ?? (className.includes('white') ? 'text-white/60' : 'text-grey-3')

    type Seg = { key: string; el: ReactNode }
    const segments: Seg[] = []
    const t = (timeRange || '').trim()
    if (t) segments.push({ key: 'time', el: <span className="min-w-0 truncate">{t}</span> })
    if (showExtras && attachmentCount > 0) {
        segments.push({
            key: 'links',
            el: (
                <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Link
                        size={11}
                        className="shrink-0 opacity-90"
                        aria-hidden
                    />
                    {attachmentCount === 1 ? 'link' : `links`}
                </span>
            )
        })
    }
    if (showExtras && hasNotes) {
        segments.push({
            key: 'notes',
            el: (
                <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <BookOpen
                        size={11}
                        className="shrink-0 opacity-90"
                        aria-hidden
                    />
                    Notes
                </span>
            )
        })
    }
    if (segments.length === 0) return null

    return (
        <div className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] font-medium font-manrope leading-tight', className)}>
            {segments.flatMap((s, i) =>
                i === 0
                    ? [<span key={s.key}>{s.el}</span>]
                    : [
                          <span
                              key={`${s.key}-sep`}
                              className={cn('shrink-0 select-none', dot)}
                              aria-hidden>
                              ·
                          </span>,
                          <span key={s.key}>{s.el}</span>
                      ]
            )}
        </div>
    )
}

// ─────────────────────────────── Transport Pill ───────────────────────────────
const TransportPill = ({
    event,
    placementSaving = false,
    boardGrabCursor = false,
    showDesktopSlotMeta = false
}: {
    event: any
    placementSaving?: boolean
    /** Desktop kanban: surface is draggable */
    boardGrabCursor?: boolean
    showDesktopSlotMeta?: boolean
}) => {
    const kind = event.kind || ''
    const slotData = event.slotData || event.slot_data || {}
    const isMobile = useIsMobile()

    // Dedicated flight design — early return before the generic transport
    // resolution runs. Conditions are strict: only swap when the slot is
    // explicitly a flight and every essential field (airline, flight no,
    // origin/destination, times) is hydrated by the search_flights cache.
    // Partial payloads (e.g. a flight slot that pre-dates the persistence
    // fix) fall through to the existing pill + timeline path below.
    const flightEnrichment = getFlightEnrichment({
        ...event,
        slot_data: slotData,
        slotData
    })
    // Case-insensitive mode check — the backend may persist "flight"
    // or "Flight" depending on the agent path (slot_mapper vs. transport
    // enricher). Also tolerate `kind === 'transport'` when the mode says
    // flight — V2 generator sometimes leaves `kind` generic.
    // Title fallback covers slots persisted during the composite
    // migration where slot_data.mode was dropped (strict route regex
    // broke on composite-internal colons).
    const modeIsFlight = isFlightTransport(slotData, event.title)
    const isFullyEnrichedFlight =
        (kind === 'flight' || modeIsFlight) &&
        !!flightEnrichment &&
        !!flightEnrichment.airline &&
        !!flightEnrichment.flight_number &&
        !!flightEnrichment.origin &&
        !!flightEnrichment.destination &&
        !!flightEnrichment.departure_time &&
        !!flightEnrichment.arrival_time
    if (isFullyEnrichedFlight && flightEnrichment) {
        const cabin = slotData.flight_data?.best_offer?.cabin ?? slotData.flightData?.best_offer?.cabin ?? null
        return (
            <div className="relative">
                <div
                    data-kanban-surface
                    className={`w-full ${boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                    <FlightTransportCard
                        flight={flightEnrichment}
                        cabin={cabin}
                        fromCityName={slotData.from_city || slotData.fromCity || null}
                        toCityName={slotData.to_city || slotData.toCity || null}
                    />
                </div>
            </div>
        )
    }

    // Mode resolution priority for icon + color:
    //   1. Concrete kind (flight/train/ferry/...) — the persisted slot
    //      kind from V2 generator or slot_mapper.
    //   2. slot_data.mode — enricher-populated mode string. Canonicalized
    //      via the alias table so "Shinkansen Nozomi 220" → "train",
    //      "Kintetsu Limited Express" → "train", "KLM KL 777" → "flight".
    //   3. Title parse — legacy "<Mode> from <A> to <B>" prose.
    //   4. Fall back to car (matches existing default).
    const rawMode: string | null = (typeof slotData.mode === 'string' && slotData.mode.trim()) || null
    const parsed = parseTransportTitle(event.title)
    const canonicalFromRaw = canonicalizeMode(rawMode)
    const modeKey =
        (kind && TRANSPORT_PILL_STYLES[kind] && kind !== 'transport' ? kind : null) ||
        (canonicalFromRaw && TRANSPORT_PILL_STYLES[canonicalFromRaw] ? canonicalFromRaw : null) ||
        (parsed?.mode && TRANSPORT_PILL_STYLES[parsed.mode] ? parsed.mode : null) ||
        'car'
    const style = TRANSPORT_PILL_STYLES[modeKey]
    // Prefer the icon from the canonical 150-mode catalog when the raw
    // mode matches an entry (covers tuk-tuk, metro, cable car, gondola,
    // etc. — new picker options that don't have their own pill style).
    // Falls back to the pill-style default for legacy / unknown modes.
    const Icon = findTransportMode(rawMode)?.icon ?? style.icon

    const timeRange = formatTimeRange(event)
    const { attachmentCount: transportAttachN, hasNotes: transportHasNotes } = getKanbanSlotMetaFlags(event)
    const subline =
        !placementSaving && (timeRange || (showDesktopSlotMeta && (transportAttachN > 0 || transportHasNotes))) ? (
            <KanbanDesktopSlotTimeLinkNotesLine
                timeRange={timeRange}
                event={event}
                showExtras={showDesktopSlotMeta}
                className={cn(style.text, 'opacity-85')}
            />
        ) : null

    // Title display. When slot_data has explicit endpoints (or the
    // title parsed cleanly), format as "Mode: Source → Dest" so the
    // pill shows endpoints even when compressed. Falls back to the
    // raw title when endpoints aren't available.
    //
    // Intra-city slots (cabs, transfers within a city) persist
    // ``from_venue`` / ``to_venue`` instead of city fields — venue
    // takes precedence so a Phuket airport pickup taxi shows
    // "Taxi: Phuket Airport → Patong" rather than the meaningless
    // "Taxi: Phuket → Phuket" if both happened to be present.
    //
    // Mode label prefers the raw backend-provided string
    // (``"Shinkansen Nozomi 220"``) over the canonical key so the
    // pill carries the agent's full mode phrase rather than a
    // flattened ``"Train"``.
    const fromCity = slotData.from_venue || slotData.from_city || parsed?.from
    const toCity = slotData.to_venue || slotData.to_city || parsed?.to
    const displayMode = rawMode || parsed?.modePhrase || modeKey.charAt(0).toUpperCase() + modeKey.slice(1)
    const titleText = fromCity && toCity ? `${displayMode}: ${fromCity} → ${toCity}` : displayTitle(event.title) || 'Transport'

    // Two-stop timeline card — used when the slot has both endpoints
    // AND start/end times. Matches the design-system transport card:
    // lavender header (icon + mode · duration), body has a hollow
    // circle → dashed line → filled circle with the endpoint names +
    // times. Falls back to the compact pill below when any of those
    // fields is missing (agent-generated "Transport" stubs,
    // transfer-note slots with no route, etc.) OR during an in-flight
    // placement so the existing spinner treatment keeps working.
    const hasTimelineData = !placementSaving && Boolean(fromCity) && Boolean(toCity) && event.start && event.end
    if (hasTimelineData) {
        const fmtTime = (d: Date | string) =>
            new Date(d instanceof Date ? d.getTime() : d)
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'UTC'
                })
                .replace(/\s(AM|PM)/i, (_, p) => p.toLowerCase())
                .replace(' ', '')
        const startDate = event.start instanceof Date ? event.start : new Date(event.start)
        const endDate = event.end instanceof Date ? event.end : new Date(event.end)
        const durMin = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
        const durH = Math.floor(durMin / 60)
        const durM = durMin % 60
        const durLabel = durH > 0 && durM > 0 ? `${durH}h ${durM}m` : durH > 0 ? `${durH}h` : `${durM}m`
        const headerLabel = (rawMode || displayMode || 'Transport').toUpperCase()
        return (
            <div className="relative">
                <div
                    data-kanban-surface
                    className={`w-full rounded-xl bg-white overflow-hidden shadow-[0_4px_18px_rgba(15,23,42,0.09)] ${boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{
                        // Subdued grey border so the card sits quietly
                        // on the white board surface — the indigo
                        // accents inside (mode label + stop dots +
                        // connector) still carry the card's identity
                        // without the frame competing.
                        border: '1px solid #E0E0E0'
                    }}>
                    {/* Header */}
                    <div
                        className="flex items-center gap-2 px-3 py-[6px]"
                        style={{ background: '#F8F8F8' }}>
                        <Icon
                            size={14}
                            className="text-grey-0 shrink-0"
                        />
                        <span
                            className="flex-1 text-[11px] text-grey-0 truncate"
                            style={{
                                fontFamily: "'Red Hat Display', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '0.08em'
                            }}>
                            {headerLabel}
                        </span>
                        <span
                            className="text-[11px] text-grey-3 shrink-0"
                            style={{
                                fontFamily: "'Red Hat Display', sans-serif",
                                fontWeight: 700
                            }}>
                            {durLabel}
                        </span>
                    </div>
                    {/* Stops — expected spec: smaller dots (12px) with a
                        dotted vertical connector between them, extra
                        breathing room so the list reads as a timeline
                        rather than cramped list items. */}
                    <div className="px-3 py-[10px]">
                        <div className="grid grid-cols-[10px_1fr_auto] gap-x-4 items-center">
                            {/* From */}
                            <span
                                className="w-[10px] h-[10px] rounded-full bg-white justify-self-center"
                                style={{ border: '1.5px solid #AEAEAE' }}
                                aria-hidden
                            />
                            <span className="text-[13px] text-grey-0 font-semibold font-manrope truncate">
                                {capitalizeFirstLetter(String(fromCity))}
                            </span>
                            <span
                                className={`text-[12px] ${isMobile ? 'text-grey-2' : 'text-grey-1'} shrink-0`}
                                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: isMobile ? 500 : 600 }}>
                                {fmtTime(startDate)}
                            </span>

                            {/* Connector — dotted line centred in the dot
                                column only, so it doesn't run through the
                                dots above / below. Empty cells in the
                                other columns keep the grid alignment. */}
                            <span
                                className="h-3 w-0 justify-self-center"
                                style={{ borderLeft: '2px dotted #AEAEAE' }}
                                aria-hidden
                            />
                            <span aria-hidden />
                            <span aria-hidden />

                            {/* To */}
                            <span
                                className="w-[10px] h-[10px] rounded-full justify-self-center"
                                style={{ background: '#AEAEAE' }}
                                aria-hidden
                            />
                            <span className="text-[13px] text-grey-0 font-semibold font-manrope truncate">
                                {capitalizeFirstLetter(String(toCity))}
                            </span>
                            <span
                                className={`text-[12px] ${isMobile ? 'text-grey-2' : 'text-grey-1'} shrink-0`}
                                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: isMobile ? 500 : 600 }}>
                                {fmtTime(endDate)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            <div
                data-kanban-surface
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 ${style.bg} ${style.border} shadow-[0_4px_18px_rgba(15,23,42,0.09)] ${boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <Icon
                    size={18}
                    className={`${style.text} shrink-0`}
                />
                <div className="flex-1 min-w-0">
                    <span className={`text-[13px] font-semibold font-manrope ${style.text} truncate block`}>{capitalizeFirstLetter(titleText)}</span>
                    {placementSaving ? (
                        <span
                            className={`mt-0.5 inline-flex min-h-[16px] items-center ${style.text} opacity-70`}
                            aria-busy="true"
                            aria-live="polite">
                            <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden
                            />
                        </span>
                    ) : subline ? (
                        <div className="mt-0.5 min-w-0">{subline}</div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────── Stay Pill ───────────────────────────────
const StayPill = ({
    event,
    placementSaving = false,
    boardGrabCursor = false,
    showDesktopSlotMeta = false
}: {
    event: any
    placementSaving?: boolean
    boardGrabCursor?: boolean
    showDesktopSlotMeta?: boolean
}) => {
    const title = event.title || 'Stay'
    const isCheckIn = title.toLowerCase().includes('check-in') || title.toLowerCase().includes('checkin')
    const isCheckOut = title.toLowerCase().includes('check-out') || title.toLowerCase().includes('checkout')
    const pillKey = isCheckIn ? 'check-in' : isCheckOut ? 'check-out' : 'default'
    const style = STAY_PILL_STYLES[pillKey]

    // Format time if available
    const timeStr = event.start ? `at ${formatTimeUTC(event.start)}` : ''
    const displayTitle = timeStr && !title.toLowerCase().includes('at ') ? `${title} ${timeStr}` : title

    return (
        <div className="relative">
            <div
                data-kanban-surface
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 ${style.bg} ${style.border} ${boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : ''}`}
                aria-busy={placementSaving || undefined}>
                <BedDouble
                    size={14}
                    className={`${style.text} shrink-0`}
                />
                <span className={`flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold font-manrope ${style.text}`}>
                    <span className="truncate">{capitalizeFirstLetter(placementSaving ? title : displayTitle)}</span>
                    {placementSaving && (
                        <Loader2
                            className="h-3.5 w-3.5 shrink-0 animate-spin"
                            aria-hidden
                        />
                    )}
                </span>
            </div>
            {showDesktopSlotMeta && !placementSaving ? (
                <div className="mt-1 min-w-0">
                    <KanbanDesktopSlotTimeLinkNotesLine
                        timeRange=""
                        event={event}
                        showExtras
                        className="text-grey-2"
                    />
                </div>
            ) : null}
        </div>
    )
}

// ─────────────────────────────── Experience Hero Card ───────────────────────────────
const ExperienceHeroCard = ({
    event,
    isShortlisted,
    onViewMap,
    placementSaving = false,
    suppressMobileOpen = false,
    suppressInlineSneakPeek = false,
    showDesktopSlotMeta = false,
    boardGrabCursor = false,
    boardSneakPeekOpen,
    mobileMenuOpen = false
}: {
    event: any
    isShortlisted: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    placementSaving?: boolean
    /** Parent handles tap (e.g. mobile list opens SlotDetailBottomSheet) */
    suppressMobileOpen?: boolean
    /** Desktop board: parent opens slot detail modal instead of SneakPeek on card click */
    suppressInlineSneakPeek?: boolean
    showDesktopSlotMeta?: boolean
    mobileMenuOpen?: boolean
    boardGrabCursor?: boolean
    /** Desktop kanban: open SneakPeek from parent (single portal + merged attachments) */
    boardSneakPeekOpen?: (event: any) => void
}) => {
    const isMobile = useIsMobile()
    const image = event.slotData?.display_props?.landscape_image || event.slot_data?.display_props?.landscape_image
    const title = event.title || 'Experience'
    const experienceId = event.slotData?.id || event.slot_data?.id
    const timeRange = formatTimeRange(event)
    const heroMeta = getKanbanSlotMetaFlags(event)
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)

    const handleClick = useCallback(() => {
        if (suppressMobileOpen || suppressInlineSneakPeek) return
        if (boardSneakPeekOpen && experienceId) {
            boardSneakPeekOpen(event)
            return
        }
        if (experienceId) setSneakPeekId(experienceId)
    }, [boardSneakPeekOpen, experienceId, suppressInlineSneakPeek, suppressMobileOpen])

    // If no hero image, render as thumbnail card instead
    if (!image) {
        return (
            <>
                <ThumbnailCard
                    event={event}
                    onViewMap={onViewMap}
                    placementSaving={placementSaving}
                    suppressMobileOpen={suppressMobileOpen}
                    suppressInlineSneakPeek={suppressInlineSneakPeek}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                    boardGrabCursor={boardGrabCursor}
                    boardSneakPeekOpen={boardSneakPeekOpen}
                />
            </>
        )
    }

    const heroCursorClass = suppressMobileOpen
        ? ''
        : suppressInlineSneakPeek
          ? boardGrabCursor
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-default'
          : boardGrabCursor
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-pointer'

    const heroSuggestions = getSlotSuggestionStrings(event)
    // Only show the tips callout for top-priority AI suggestions (priority 0).
    const heroSuggestionPriority = (event?.slotData || event?.slot_data || {}).suggestion_priority ?? null
    const heroShowTips = heroSuggestionPriority === 0
    const heroFirstTip = heroShowTips ? heroSuggestions[0] : undefined
    const heroExtraTipsCount = heroShowTips ? Math.max(0, heroSuggestions.length - 1) : 0
    const [focusRef, mobileInFocus] = useFocusInView<HTMLDivElement>({ enabled: isMobile === true })

    return (
        <>
            <div
                ref={focusRef}
                className={`group relative ${heroCursorClass}`}
                onClick={suppressMobileOpen || suppressInlineSneakPeek ? undefined : handleClick}
                role={suppressMobileOpen || suppressInlineSneakPeek ? undefined : 'button'}
                tabIndex={suppressMobileOpen || suppressInlineSneakPeek ? undefined : 0}
                onKeyDown={
                    suppressMobileOpen || suppressInlineSneakPeek
                        ? undefined
                        : (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleClick()
                              }
                          }
                }>
                <div
                    data-kanban-surface
                    className={`relative w-full shrink-0 overflow-hidden rounded-xl ${KANBAN_CARD_SURFACE_CLASS}`}
                    style={{
                        backgroundColor: mobileMenuOpen && isMobile === true ? '#DFDDE0' : '#FFFFFF'
                    }}>
                    <div className="p-1.5">
                        <div className={`relative w-full overflow-hidden aspect-[16/10] rounded-lg ${isMobile ? 'shadow-[0px_2px_8px_#e0e0e0]' : ''}`}>
                            <SafeImage
                                src={image}
                                alt={title}
                                fill
                                className={`transition-transform duration-500 ease-out kanban-photo-active-on-hover ${
                                    mobileInFocus ? 'kanban-photo-active' : ''
                                }`}
                            />
                            {isShortlisted && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                                    <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="#EF4444"
                                        stroke="#EF4444"
                                        strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                    <span className="text-[10px] font-semibold font-manrope text-red-500">Wishlist</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`px-3 pb-2 ${isMobile ? 'pt-0.5' : 'pt-2.5'}`}>
                        <p className="text-grey-0 text-[14px] font-semibold font-manrope leading-[18px] line-clamp-2">
                            {capitalizeFirstLetter(title)}
                        </p>
                        {placementSaving ? (
                            <span
                                className="mt-0.5 inline-flex min-h-[16px] items-center text-grey-2"
                                aria-busy="true"
                                aria-live="polite">
                                <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden
                                />
                            </span>
                        ) : timeRange || (showDesktopSlotMeta && (heroMeta.attachmentCount > 0 || heroMeta.hasNotes)) ? (
                            <div className="mt-0.5 min-w-0">
                                <KanbanDesktopSlotTimeLinkNotesLine
                                    timeRange={timeRange}
                                    event={event}
                                    showExtras={showDesktopSlotMeta}
                                    className={isMobile ? 'text-grey-2 font-semibold leading-[18px]' : 'text-grey-2'}
                                />
                            </div>
                        ) : null}
                    </div>
                    {/* Tips callout — desktop only, edge-to-edge at the bottom. */}
                    {heroFirstTip && isMobile !== true && (
                        <div
                            className="flex items-center gap-1 px-3 py-2.5"
                            style={{ backgroundColor: '#FFEDCC' }}>
                            <img
                                src={BULB_ICON}
                                alt="Tip"
                                className="h-4 w-4 shrink-0 object-contain"
                            />
                            <p className="min-w-0 flex-1 font-manrope text-[12px] font-medium text-amber-900 leading-[16px] line-clamp-2">
                                {heroFirstTip}
                                {heroExtraTipsCount > 0 && <span className="ml-1 font-semibold text-amber-700">+{heroExtraTipsCount}</span>}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {!boardSneakPeekOpen &&
                sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        attachments={getSlotAttachmentsList(event) as any}
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        displayName={title}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekId, event.dayIndex) : undefined}
                        triggerType="itinerary_view_page"
                        slotNotes={event.notes?.trim() ? event.notes : undefined}
                        slotSuggestionReasons={Array.isArray(event.suggestion_reasons) ? event.suggestion_reasons : undefined}
                    />,
                    document.body
                )}
        </>
    )
}

// ─────────────── Day Tour Hero Card ────────────────
//
// "Option D — Hero cover" for a group-experience slot. The slot is one
// itinerary entry whose experience bundles several stops
// (``slot_data.linked_activities``). The hero band shows the cover photo
// with a "Day Tour" badge, the tour title, the whole-tour window, and the
// stop count overlaid. Below, an expandable list of numbered stop cards
// (name + city + thumbnail) — no per-activity time/notes (the product
// carries no per-stop times). Collapsing swaps the list for a compact
// overlapping-thumbnail summary. The slot-level ⋯ / map / AI menu is
// supplied by the parent ``KanbanCardHoverToolbar`` (same as the standard
// experience hero), so this card only owns its internal collapse chevron
// and the per-stop hover ⋯ gutter.

const DayTourStopCard = ({
    activity,
    index,
    suppressMobileOpen = false,
    suppressInlineSneakPeek = false,
    onViewMap
}: {
    activity: LinkedActivitySnapshot
    index: number
    suppressMobileOpen?: boolean
    suppressInlineSneakPeek?: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
}) => {
    const experienceId = activity.experience_id
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)
    const canOpen = !suppressMobileOpen && !suppressInlineSneakPeek && !!experienceId

    const handleClick = useCallback(
        (e: ReactMouseEvent) => {
            if (suppressMobileOpen || suppressInlineSneakPeek || !experienceId) return
            // Opening this stop's own sneak peek must not bubble to the parent
            // day-tour card's open-on-click handler.
            e.stopPropagation()
            setSneakPeekId(experienceId)
        },
        [experienceId, suppressInlineSneakPeek, suppressMobileOpen]
    )

    return (
        <>
            <div
                className={`group/stop flex items-center gap-2.5 rounded-xl border border-grey-4 bg-white p-2 pr-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow duration-150 hover:shadow-[0_3px_10px_rgba(15,23,42,0.1)] ${
                    canOpen ? 'cursor-pointer' : ''
                }`}
                onClick={canOpen ? handleClick : undefined}
                role={canOpen ? 'button' : undefined}
                tabIndex={canOpen ? 0 : undefined}
                onKeyDown={
                    canOpen
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (experienceId) setSneakPeekId(experienceId)
                              }
                          }
                        : undefined
                }>
                <div className="relative h-[50px] w-[50px] shrink-0">
                    <div className="h-[50px] w-[50px] overflow-hidden rounded-[9px] bg-grey-4">
                        {activity.landscape_image ? (
                            <SafeImage
                                src={activity.landscape_image}
                                alt={activity.name}
                                fill
                                className="object-cover"
                            />
                        ) : null}
                    </div>
                    <span className="absolute -left-1 -top-1 z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-grey-3 text-[8px] font-extrabold text-natural-white font-red-hat-display shadow-[0_0_0_1.5px_#ffffff,0_1px_2px_rgba(0,0,0,0.25)]">
                        {index + 1}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-red-hat-display text-[12.5px] font-bold leading-[16px] tracking-tight text-grey-0">
                        {activity.name}
                    </p>
                    {activity.base_city_name ? (
                        <span className="mt-0.5 flex items-center gap-1 font-manrope text-[11px] font-semibold text-grey-3">
                            <MapPin
                                size={11}
                                className="shrink-0"
                                aria-hidden
                            />
                            <span className="truncate">{activity.base_city_name}</span>
                        </span>
                    ) : null}
                </div>
                <div className="flex w-[30px] shrink-0 items-center justify-center">
                    <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-grey-3 opacity-0 transition-opacity duration-150 group-hover/stop:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                        aria-hidden>
                        <MoreHorizontal size={15} />
                    </span>
                </div>
            </div>
            {sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        displayName={activity.name}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekId) : undefined}
                        triggerType="itinerary_view_page"
                    />,
                    document.body
                )}
        </>
    )
}

const DayTourCollapsedSummary = ({ activities }: { activities: LinkedActivitySnapshot[] }) => {
    const thumbs = activities.slice(0, 4)
    const names = activities.slice(0, 3).map((a) => a.name)
    const extra = activities.length - 3
    const label = extra > 0 ? `${names.join(' · ')} +${extra} more` : names.join(' · ')
    return (
        <div className="flex items-center gap-2.5 border-t border-dashed border-grey-4 pt-2.5">
            <div className="flex shrink-0 items-center">
                {thumbs.map((a, i) => (
                    <div
                        key={a.experience_id || `${a.name}-${i}`}
                        className="h-[26px] w-[26px] overflow-hidden rounded-full border-2 border-white bg-grey-4"
                        style={{ marginLeft: i === 0 ? 0 : -10 }}>
                        {a.landscape_image ? (
                            <SafeImage
                                src={a.landscape_image}
                                alt={a.name}
                                fill
                                className="object-cover"
                            />
                        ) : null}
                    </div>
                ))}
            </div>
            <span className="min-w-0 truncate font-manrope text-[11.5px] font-semibold text-grey-2">{label}</span>
        </div>
    )
}

const DayTourHeroCard = ({
    event,
    onViewMap,
    suppressMobileOpen = false,
    suppressInlineSneakPeek = false,
    boardGrabCursor = false,
    boardSneakPeekOpen,
    mobileMenuOpen = false,
    showSlotToolbar = false,
    dayNumber = 1,
    columnDate,
    cityLabel = '',
    onEdit,
    onDelete,
    onKanbanSlotAssistant,
    onSlotMenuOpenChange
}: {
    event: any
    isShortlisted?: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    placementSaving?: boolean
    suppressMobileOpen?: boolean
    suppressInlineSneakPeek?: boolean
    showDesktopSlotMeta?: boolean
    boardGrabCursor?: boolean
    boardSneakPeekOpen?: (event: any) => void
    mobileMenuOpen?: boolean
    /** Desktop board: render the slot ⋯ / map / AI toolbar inline beside the collapse chevron. */
    showSlotToolbar?: boolean
    dayNumber?: number
    columnDate?: Date
    cityLabel?: string
    onEdit?: (e: any) => void
    onDelete?: (e: any) => void
    onKanbanSlotAssistant?: (a: KanbanSlotAssistantArgs) => void
    onSlotMenuOpenChange?: (open: boolean) => void
}) => {
    const isMobile = useIsMobile()
    const slotData = event.slotData || event.slot_data || {}
    const activities = (getDayTourLinkedActivities(event) ?? []) as LinkedActivitySnapshot[]
    const title = event.title || slotData.name || 'Day Tour'
    const image = slotData.display_props?.landscape_image || slotData.photo_url
    const experienceId = slotData.id
    const tourWindow = formatDayTourWindow(event)
    const [collapsed, setCollapsed] = useState(false)
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)

    // The hero cover band opens the parent tour's sneak peek — identical to the
    // "View details" pill — preferring the board handoff and falling back to a
    // local modal, mirroring ``ExperienceHeroCard``.
    const handleHeroOpen = useCallback(() => {
        if (suppressMobileOpen || suppressInlineSneakPeek) return
        if (boardSneakPeekOpen && experienceId) {
            boardSneakPeekOpen(event)
            return
        }
        if (experienceId) setSneakPeekId(experienceId)
    }, [boardSneakPeekOpen, event, experienceId, suppressInlineSneakPeek, suppressMobileOpen])

    const heroBandOpens = !suppressMobileOpen && !suppressInlineSneakPeek && !!experienceId

    const heroCursorClass =
        suppressMobileOpen || suppressInlineSneakPeek ? (boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') : 'cursor-default'

    return (
        <div
            className={`group relative ${heroBandOpens ? 'cursor-pointer' : heroCursorClass}`}
            onClick={heroBandOpens ? handleHeroOpen : undefined}
            role={heroBandOpens ? 'button' : undefined}
            tabIndex={heroBandOpens ? 0 : undefined}
            onKeyDown={
                heroBandOpens
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleHeroOpen()
                          }
                      }
                    : undefined
            }>
            <div
                data-kanban-surface
                className={`relative w-full shrink-0 overflow-hidden rounded-2xl ${KANBAN_CARD_SURFACE_CLASS}`}
                style={{ backgroundColor: mobileMenuOpen && isMobile === true ? '#DFDDE0' : '#FFFFFF' }}>
                {/* Hero band — visual only; the whole card root owns the open-on-click behavior. */}
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                    {image ? (
                        <SafeImage
                            src={image}
                            alt={title}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-grey-4" />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to top, rgba(13,12,13,0.86) 2%, rgba(13,12,13,0.12) 52%, rgba(13,12,13,0.42) 100%)'
                        }}
                        aria-hidden
                    />

                    {/* Top-left badge */}
                    <span
                        className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-[3px] font-red-hat-display text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-primary-default"
                        aria-hidden>
                        Day Tour
                    </span>

                    {/* Bottom title + meta */}
                    <div className="absolute inset-x-[13px] bottom-3">
                        <p className="font-red-hat-display text-[19px] font-extrabold leading-[23px] tracking-tight text-natural-white line-clamp-2">
                            {capitalizeFirstLetter(title)}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 font-manrope text-natural-white">
                            {tourWindow ? (
                                <>
                                    <span className="flex items-center gap-1 whitespace-nowrap text-[12px] font-bold">
                                        <Clock
                                            size={12}
                                            className="shrink-0"
                                            aria-hidden
                                        />
                                        {tourWindow}
                                    </span>
                                    <span
                                        className="h-[3px] w-[3px] rounded-full bg-white/70"
                                        aria-hidden
                                    />
                                </>
                            ) : null}
                            <span className="flex items-center gap-1 text-[12px] font-semibold text-white/90">
                                <MapPin
                                    size={12}
                                    className="shrink-0"
                                    aria-hidden
                                />
                                {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-3">
                    {collapsed ? (
                        <DayTourCollapsedSummary activities={activities} />
                    ) : (
                        <>
                            <p className="mb-2 font-red-hat-display text-[10px] font-extrabold uppercase tracking-[0.06em] text-grey-3">
                                Included activities
                            </p>
                            <div className="flex flex-col gap-2">
                                {activities.map((activity, index) => (
                                    <DayTourStopCard
                                        key={activity.experience_id || `${activity.name}-${index}`}
                                        activity={activity}
                                        index={index}
                                        suppressMobileOpen={suppressMobileOpen}
                                        suppressInlineSneakPeek={suppressInlineSneakPeek}
                                        onViewMap={onViewMap}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Top-right control cluster: [⋯ map AI][chevron]. Rendered at the
                hero root (outside the band's overflow-hidden so the ⋯ / AI
                popovers aren't clipped) so the day-tour card owns its slot
                toolbar locally — the generic floating chrome is suppressed and
                can't collide with the collapse chevron. */}
            <div
                className="absolute right-3 top-3 z-20 flex items-center gap-1.5"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}>
                {showSlotToolbar && onEdit && onDelete && (
                    <KanbanCardHoverToolbar
                        inline
                        visible
                        event={event}
                        dayNumber={dayNumber}
                        columnDate={columnDate ?? (event.start ? new Date(event.start) : new Date())}
                        cityLabel={cityLabel}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewMap={onViewMap}
                        onKanbanSlotAssistant={onKanbanSlotAssistant}
                        onMenuOpenChange={onSlotMenuOpenChange}
                    />
                )}
                <button
                    type="button"
                    aria-label={collapsed ? 'Expand activities' : 'Collapse activities'}
                    aria-expanded={!collapsed}
                    onClick={(e) => {
                        e.stopPropagation()
                        setCollapsed((c) => !c)
                    }}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/90 text-grey-1 shadow-[0_2px_8px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-transform active:scale-95">
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
            {!boardSneakPeekOpen &&
                sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        attachments={getSlotAttachmentsList(event) as any}
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        displayName={title}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekId, event.dayIndex) : undefined}
                        triggerType="itinerary_view_page"
                        slotNotes={event.notes?.trim() ? event.notes : undefined}
                        slotSuggestionReasons={Array.isArray(event.suggestion_reasons) ? event.suggestion_reasons : undefined}
                    />,
                    document.body
                )}
        </div>
    )
}

// ─────────────── Meal / Restaurant / Place Card ────────────────
//
// Kanban card for ``kind === 'meal' | 'restaurant' | 'place'`` slots.
// Two layouts:
//
//   • **Photo-on-top** when ``slot_data.photo_url`` (or the other
//     image sources in the priority chain) resolves. The photo fills
//     the upper section of the card, a divider separates it from the
//     text section below, and the text section stacks title → time /
//     notes meta line → rating row. The slot-kind badge (green Wine
//     for meal/restaurant, orange MapPin for place) sits at the
//     top-right of the text section so it clears the photo entirely.
//
//   • **Compact thumbnail row** when no photo resolves: 52×52 image
//     on the left, title/time/rating column on the right, badge
//     top-right. This is the original non-hero layout — used for
//     place slots whose Google venue has no photo, and for legacy
//     meals with no Places metadata.
//
// Both layouts share the same rating-only info bar (⭐ `4.4 (237)`).
// The calendar's ``$$`` price-level chip is intentionally dropped —
// notes surface via the time line (`📖 Notes` affordance) and in
// the slot detail modal.
const MealPlaceHeroCard = ({
    event,
    onViewMap,
    placementSaving = false,
    suppressMobileOpen = false,
    suppressInlineSneakPeek = false,
    mobileMenuOpen = false,
    showDesktopSlotMeta = false,
    boardGrabCursor = false,
    boardSneakPeekOpen
}: {
    event: any
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    placementSaving?: boolean
    suppressMobileOpen?: boolean
    suppressInlineSneakPeek?: boolean
    showDesktopSlotMeta?: boolean
    boardGrabCursor?: boolean
    boardSneakPeekOpen?: (event: any) => void
    mobileMenuOpen?: boolean
}) => {
    const isMobile = useIsMobile()
    const dayIndex = event.dayIndex ?? 0
    const slotData = event.slotData || event.slot_data || {}
    const isPlace = event.kind === 'place'

    // Image resolution — shared with both slot-detail modals via
    // ``utils/mealPlaceImage``. ``hasRealPhoto`` distinguishes actual
    // venue photos from generic placeholders; only real photos earn
    // the photo-on-top layout.
    const { image } = resolveMealPlaceImage(event, dayIndex)

    const title = event.title || 'Activity'
    const placeName: string | undefined = slotData.name
    // Place slots authoritatively use the user-entered title
    // ("Morning hike at Fushimi Inari") over the attached Google
    // Place name ("Fushimi Inari-taisha").
    const displayTitle = isPlace ? title : placeName || title
    const timeRange = formatTimeRange(event)
    const rating: number | undefined = slotData.rating
    // Info bar intentionally shows only the review (rating + count).
    // An earlier pass appended the slot's notes after the rating, but
    // on review that trailing segment was cut — keeps the card focused
    // and reduces visual weight on busy kanban columns.
    const hasInfoBar = rating != null

    // Top-right slot-kind badge — green Wine for restaurants/meals,
    // orange MapPin for places. Same palette as SLOT_TYPE_CONFIG so
    // the kanban and calendar views stay visually aligned.
    const KindIcon = isPlace ? MapPin : Wine
    const kindIconColor = isPlace ? '#E55A34' : '#26BC6D'
    const kindIconBg = isPlace ? '#E55A3429' : '#26BC6D29'

    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)
    const experienceId: string | undefined = slotData.id
    const canOpenSneakPeek = !!experienceId || !!boardSneakPeekOpen

    const handleClick = useCallback(() => {
        if (suppressMobileOpen || suppressInlineSneakPeek) return
        if (boardSneakPeekOpen) {
            boardSneakPeekOpen(event)
            return
        }
        if (experienceId) setSneakPeekId(experienceId)
    }, [boardSneakPeekOpen, event, experienceId, suppressInlineSneakPeek, suppressMobileOpen])

    const surfaceCursorClass = suppressMobileOpen
        ? 'cursor-default'
        : suppressInlineSneakPeek
          ? boardGrabCursor
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-default'
          : boardGrabCursor
            ? 'cursor-grab active:cursor-grabbing'
            : canOpenSneakPeek
              ? 'cursor-pointer'
              : 'cursor-default'

    const meta = getKanbanSlotMetaFlags(event)
    const showMeta = showDesktopSlotMeta && (meta.attachmentCount > 0 || meta.hasNotes)

    // Slot-kind badge — desktop-only tinted square chip on the white card.
    // Mobile shows no kind badge (places already suppressed; meals now too —
    // the kind reads from the "· restaurant" label on the rating line).
    const badge = isPlace || isMobile ? null : (
        <div
            className="w-6 h-6 flex items-center justify-center rounded-[6px]"
            style={{ backgroundColor: kindIconBg, color: kindIconColor }}
            aria-hidden>
            <KindIcon size={14} />
        </div>
    )

    // Mobile: three stacked lines (title / rating / time), badge sits on the
    // image. Desktop: title with inline rating + time row, badge top-right.
    const textBlock = isMobile ? (
        <>
            <span className="block font-manrope text-[14px] font-semibold text-grey-0 leading-[18px] truncate">{displayTitle}</span>
            {placementSaving ? (
                <p
                    className="mt-0.5 flex min-h-[16px] items-center"
                    aria-busy="true"
                    aria-live="polite">
                    <Loader2
                        className="h-3.5 w-3.5 animate-spin text-grey-2"
                        aria-hidden
                    />
                </p>
            ) : (
                <>
                    {hasInfoBar && (
                        <span className="mt-0.5 flex items-center gap-0.5 text-grey-2 text-[12px] font-manrope font-medium whitespace-nowrap">
                            {rating!.toFixed(1)}
                            <Star className="w-3 h-3 text-grey-2" />
                            {!isPlace && <span>· Restaurant</span>}
                        </span>
                    )}
                    {(timeRange || showMeta) && (
                        <div className="mt-0.5 min-w-0 truncate">
                            <KanbanDesktopSlotTimeLinkNotesLine
                                timeRange={timeRange}
                                event={event}
                                showExtras={showDesktopSlotMeta}
                                className="text-grey-2"
                            />
                        </div>
                    )}
                </>
            )}
        </>
    ) : (
        <>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-manrope text-[14px] font-semibold text-grey-0 leading-[18px] truncate min-w-0">{displayTitle}</span>
                {hasInfoBar && (
                    <span className="flex shrink-0 items-center gap-0.5 text-grey-1 text-[11px] font-manrope font-semibold whitespace-nowrap">
                        {rating!.toFixed(1)}
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    </span>
                )}
            </div>
            {placementSaving ? (
                <p
                    className="mt-0.5 flex min-h-[16px] items-center"
                    aria-busy="true"
                    aria-live="polite">
                    <Loader2
                        className="h-3.5 w-3.5 animate-spin text-grey-2"
                        aria-hidden
                    />
                </p>
            ) : (
                (timeRange || showMeta) && (
                    <div className="mt-0.5 min-w-0">
                        <KanbanDesktopSlotTimeLinkNotesLine
                            timeRange={timeRange}
                            event={event}
                            showExtras={showDesktopSlotMeta}
                            className="text-grey-2"
                        />
                    </div>
                )
            )}
        </>
    )

    const surfaceInteractionProps = {
        onClick: suppressMobileOpen || suppressInlineSneakPeek ? undefined : handleClick,
        role: (suppressMobileOpen || suppressInlineSneakPeek || !canOpenSneakPeek ? undefined : 'button') as 'button' | undefined,
        tabIndex: suppressMobileOpen || suppressInlineSneakPeek || !canOpenSneakPeek ? undefined : 0,
        onKeyDown:
            suppressMobileOpen || suppressInlineSneakPeek || !canOpenSneakPeek
                ? undefined
                : (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleClick()
                      }
                  }
    }

    const [mealFocusRef, mealMobileInFocus] = useFocusInView<HTMLDivElement>({ enabled: isMobile === true })

    return (
        <>
            <div
                ref={mealFocusRef}
                className="group relative">
                {/* Compact row layout: photo on the left replaces the kind icon,
                   text column on the right with rating inline next to the title. */}
                <div
                    data-kanban-surface
                    className={`relative flex ${isMobile ? 'items-start' : 'items-center'} gap-3 rounded-xl p-1.5 ${isMobile ? 'pr-10' : 'pr-12'} ${KANBAN_CARD_SURFACE_CLASS} ${surfaceCursorClass}`}
                    style={{
                        backgroundColor: mobileMenuOpen && isMobile ? '#DFDDE0' : '#FFFFFF'
                    }}
                    {...surfaceInteractionProps}>
                    {image ? (
                        <div className="relative w-[60px] h-[60px] shrink-0 overflow-hidden rounded-[8px]">
                            <SafeImage
                                src={image}
                                alt={displayTitle}
                                fill
                                radius={0}
                                className={`transition-transform duration-500 ease-out kanban-photo-active-on-hover ${
                                    mealMobileInFocus ? 'kanban-photo-active' : ''
                                }`}
                            />
                            {isMobile && <div className="absolute top-0 left-0 z-[1]">{badge}</div>}
                        </div>
                    ) : (
                        <div className="relative shrink-0">
                            <img
                                src={PLACE_LOCATION_PIN_ICON}
                                alt={`location`}
                                className={`w-[60px] h-[60px] object-contain transition-transform duration-500 ease-out kanban-photo-active-on-hover ${
                                    mealMobileInFocus ? 'kanban-photo-active' : ''
                                }`}
                            />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">{textBlock}</div>
                    {image && !isMobile && <div className="absolute top-2 right-2">{badge}</div>}
                </div>
            </div>
            {!boardSneakPeekOpen &&
                sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        attachments={getSlotAttachmentsList(event) as any}
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        displayName={displayTitle}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekId, event.dayIndex) : undefined}
                        triggerType="itinerary_view_page"
                        slotNotes={event.notes?.trim() ? event.notes : undefined}
                        slotSuggestionReasons={Array.isArray(event.suggestion_reasons) ? event.suggestion_reasons : undefined}
                    />,
                    document.body
                )}
        </>
    )
}

// ─────────────────────────────── Thumbnail Card ───────────────────────────────
const ThumbnailCard = ({
    event,
    onViewMap,
    placementSaving = false,
    suppressMobileOpen = false,
    suppressInlineSneakPeek = false,
    showDesktopSlotMeta = false,
    boardGrabCursor = false,
    boardSneakPeekOpen,
    mobileMenuOpen = false
}: {
    event: any
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    placementSaving?: boolean
    suppressMobileOpen?: boolean
    suppressInlineSneakPeek?: boolean
    showDesktopSlotMeta?: boolean
    boardGrabCursor?: boolean
    boardSneakPeekOpen?: (event: any) => void
    /** Internal card backdrop while ⋯ menu is open (image stays bright). */
    mobileMenuOpen?: boolean
}) => {
    const title = event.title || 'Activity'
    const type = event.type || event.kind || ''
    const dayIndex = event.dayIndex ?? 0
    const timeRange = formatTimeRange(event)
    const experienceId = event.slotData?.id || event.slot_data?.id
    const isMobile = useIsMobile()
    const canShowDetails = (type === 'experience' || type === 'visit') && !!experienceId
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)

    // Get image based on type.
    //
    // Priority order for meal / restaurant / place slots:
    //   1. ``slot_data.photo_url`` — pre-resolved Google Places CDN URL.
    //      Populated by the concierge enricher for both meal (restaurant)
    //      and place (attraction/market/temple) slots. Always show when present.
    //   2. ``slot_data.display_props.landscape_image`` — V2 generator
    //      image (meal slots only; place slots never have display_props).
    //   3. Meal-type themed placeholder (breakfast/lunch/dinner food image).
    //      MEAL SLOTS ONLY — place slots skip this, because food photos
    //      on a temple/market card would be misleading.
    //   4. Generic meal fallback — meal slots only. Place slots degrade
    //      to no-image (the card renders text-only and keeps proportion
    //      via the title/time block), which is cleaner than a food image.
    let image = ''
    const isMealLike = type === 'restaurant' || event.kind === 'meal'
    const isPlace = event.kind === 'place'
    if (isMealLike || isPlace) {
        // Single source of truth — same resolver used at the card-render
        // path above (and in RestaurantEvent). Includes the place_id photo
        // proxy as tier 0, so new slots (which store only place_id) render
        // the real photo instead of falling through to a placeholder.
        image = resolveMealPlaceImage(event, dayIndex).image
    } else if (type === 'experience') {
        const slotData = event.slotData || event.slot_data || {}
        image = slotData.display_props?.landscape_image || ''
    } else if (type === 'stay') {
        image = 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'
    } else {
        const slotData = event.slotData || event.slot_data || {}
        image = slotData.display_props?.landscape_image || ''
    }

    const surfaceCursorClass = suppressMobileOpen
        ? 'cursor-default'
        : suppressInlineSneakPeek
          ? boardGrabCursor
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-default'
          : boardGrabCursor
            ? 'cursor-grab active:cursor-grabbing'
            : canShowDetails
              ? 'cursor-pointer'
              : 'cursor-default'

    const openSneakPeek = () => {
        if (suppressMobileOpen || suppressInlineSneakPeek) return
        if (canShowDetails && experienceId) {
            if (boardSneakPeekOpen) {
                boardSneakPeekOpen(event)
                return
            }
            setSneakPeekId(experienceId)
        }
    }

    const thumbMeta = getKanbanSlotMetaFlags(event)
    const thumbSubline = !placementSaving && (timeRange || (showDesktopSlotMeta && (thumbMeta.attachmentCount > 0 || thumbMeta.hasNotes)))

    const [thumbFocusRef, thumbMobileInFocus] = useFocusInView<HTMLDivElement>({ enabled: isMobile === true })

    return (
        <div
            ref={thumbFocusRef}
            className="group relative">
            <div
                data-kanban-surface
                className={`relative flex items-center gap-3 rounded-xl p-1.5 ${KANBAN_CARD_SURFACE_CLASS} ${surfaceCursorClass}`}
                style={{
                    backgroundColor: mobileMenuOpen && isMobile ? '#DFDDE0' : '#FFFFFF'
                }}
                onClick={suppressMobileOpen || suppressInlineSneakPeek ? undefined : openSneakPeek}
                role={!suppressMobileOpen && !suppressInlineSneakPeek && canShowDetails ? 'button' : undefined}
                tabIndex={!suppressMobileOpen && !suppressInlineSneakPeek && canShowDetails ? 0 : undefined}
                onKeyDown={
                    suppressMobileOpen || suppressInlineSneakPeek || !canShowDetails
                        ? undefined
                        : (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  openSneakPeek()
                              }
                          }
                }>
                {image && (
                    <div className="w-[60px] h-[60px] shrink-0 overflow-hidden rounded-lg">
                        <SafeImage
                            src={image}
                            alt={title}
                            fill
                            radius={0}
                            className={`transition-transform duration-500 ease-out kanban-photo-active-on-hover ${
                                thumbMobileInFocus ? 'kanban-photo-active' : ''
                            }`}
                        />
                    </div>
                )}
                <div className={`min-w-0 flex-1 ${isMobile === true ? 'pr-9' : ''}`}>
                    <p className="text-[14px] font-semibold font-manrope text-grey-0 leading-[18px] line-clamp-2">{capitalizeFirstLetter(title)}</p>
                    {placementSaving ? (
                        <p
                            className="mt-0.5 flex min-h-[16px] items-center"
                            aria-busy="true"
                            aria-live="polite">
                            <Loader2
                                className="h-3.5 w-3.5 animate-spin text-grey-2"
                                aria-hidden
                            />
                        </p>
                    ) : thumbSubline ? (
                        <div className="mt-0.5 min-w-0">
                            <KanbanDesktopSlotTimeLinkNotesLine
                                timeRange={timeRange}
                                event={event}
                                showExtras={showDesktopSlotMeta}
                                className="text-grey-2"
                            />
                        </div>
                    ) : null}
                </div>
            </div>
            {!boardSneakPeekOpen &&
                sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        attachments={getSlotAttachmentsList(event) as any}
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        displayName={title}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekId, event.dayIndex) : undefined}
                        triggerType="itinerary_view_page"
                        slotNotes={event.notes?.trim() ? event.notes : undefined}
                        slotSuggestionReasons={Array.isArray(event.suggestion_reasons) ? event.suggestion_reasons : undefined}
                    />,
                    document.body
                )}
        </div>
    )
}

// ─────────────────────────────── Custom Card ───────────────────────────────
const CustomCard = ({
    event,
    placementSaving = false,
    boardGrabCursor = false,
    showDesktopSlotMeta = false
}: {
    event: any
    placementSaving?: boolean
    boardGrabCursor?: boolean
    showDesktopSlotMeta?: boolean
}) => {
    const isMobile = useIsMobile()
    const title = event.title || 'Custom Event'
    const timeRange = formatTimeRange(event)
    const customMeta = getKanbanSlotMetaFlags(event)
    // Traveler-picked icon + background colour from CustomSection
    // (stored on ``slot_data.icon_url`` / ``slot_data.bg_color``).
    // Falls back to the default 🎯 on amber tile when nothing was
    // chosen so legacy custom slots keep their current look. The
    // accent border is derived by stripping the ~7% alpha suffix
    // off ``bg_color`` — ``#7011F614`` → ``#7011F6`` — so we don't
    // need to re-save the solid colour separately.
    const customSlotData = event.slot_data || event.slotData || {}
    const customIconUrl = typeof customSlotData.icon_url === 'string' && customSlotData.icon_url.trim() ? customSlotData.icon_url : null
    const customBgColor = typeof customSlotData.bg_color === 'string' && customSlotData.bg_color.trim() ? customSlotData.bg_color : null
    const customAccent = customBgColor && customBgColor.length === 9 ? customBgColor.slice(0, 7) : null
    // ``time_bound`` gates the clock row. Defaults to true so legacy
    // slots keep showing their timings.
    const customTimeBound = customSlotData.time_bound !== false
    const customDescription = typeof customSlotData.description === 'string' ? customSlotData.description : ''
    const customSubline =
        !placementSaving && ((customTimeBound && timeRange) || (showDesktopSlotMeta && (customMeta.attachmentCount > 0 || customMeta.hasNotes)))

    return (
        <div className="group relative">
            <div
                data-kanban-surface
                className={`relative flex flex-col gap-2 rounded-xl p-2.5 ${
                    customBgColor ? '' : `bg-white ${KANBAN_CARD_SURFACE_CLASS}`
                } ${boardGrabCursor ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                style={
                    customBgColor
                        ? {
                              background: customBgColor,
                              border: `1px solid ${customAccent || 'rgba(15,23,42,0.08)'}`
                          }
                        : undefined
                }>
                <div className="flex items-center gap-3">
                    <div
                        className={`w-[52px] h-[52px] rounded-lg flex items-center justify-center shrink-0 ${
                            customBgColor ? 'bg-white/60' : 'bg-amber-50'
                        }`}>
                        {customIconUrl ? (
                            <img
                                src={customIconUrl}
                                alt=""
                                className="h-8 w-8 object-contain"
                            />
                        ) : (
                            <span className="text-2xl">🎯</span>
                        )}
                    </div>
                    <div className={`min-w-0 flex-1 ${isMobile === true ? 'pr-1' : ''}`}>
                        <p className="text-[14px] font-semibold font-manrope text-grey-0 leading-[18px] line-clamp-2">
                            {capitalizeFirstLetter(title)}
                        </p>
                        {placementSaving ? (
                            <p
                                className="mt-0.5 flex min-h-[16px] items-center"
                                aria-busy="true"
                                aria-live="polite">
                                <Loader2
                                    className="h-3.5 w-3.5 animate-spin text-grey-2"
                                    aria-hidden
                                />
                            </p>
                        ) : customSubline ? (
                            <div className="mt-0.5 min-w-0">
                                <KanbanDesktopSlotTimeLinkNotesLine
                                    timeRange={customTimeBound ? timeRange : ''}
                                    event={event}
                                    showExtras={showDesktopSlotMeta}
                                    className="text-grey-2"
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
                {customDescription && !placementSaving ? <CustomSlotDescription description={customDescription} /> : null}
                {isMobile === true && (
                    <div
                        className="pointer-events-none absolute bottom-2.5 right-2.5 z-[1] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/80 shadow-sm"
                        aria-hidden>
                        <ChevronRight
                            size={10}
                            className="text-grey-1"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────── Day Header ───────────────────────────────
const headerActionBtnClass =
    'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-grey-4/80 bg-white text-grey-0 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-[background-color,box-shadow,transform,border-color] duration-200 ease-out hover:scale-[1.03] hover:border-primary-default/40 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default/30 focus-visible:ring-offset-0'

const mapActionBtnClass =
    'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-primary-default/35 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFC_100%)] text-primary-default shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-[background-color,box-shadow,transform,border-color] duration-200 ease-out hover:scale-[1.03] hover:border-primary-default hover:bg-primary-default/12 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default/30 focus-visible:ring-offset-0'

// ── Day stay pill ──────────────────────────────────────────────────────
// Renders a single per-day pill in the column header: either a white
// hotel chip (280px wide, rounded-[38px], Manrope 12/600) when the day
// has a matched stay, or a dashed "+ Add stay" button (Red Hat Display
// 12/645, primary-indigo) otherwise. One pill per day — no spanning.
//
// When a stay is present and ``onStayAction`` is wired, clicking the
// pill opens a popover menu (Change hotel / Remove from trip) anchored
// to the pill's bottom-left. The popover reanchors on scroll/resize so
// the kanban's horizontal scroll doesn't orphan it.
const DayStayPill = ({
    matchedStay,
    cityId,
    dayDate,
    onStayAction,
    onAddStay
}: {
    matchedStay: ItineraryStay | null | undefined
    /** The day's ``base_city.id`` (or null for transit days). Drives both
     *  the add-stay button's navigation target and whether to render the
     *  button at all on unstayed days. */
    cityId: string | null
    /** The day's date string (YYYY-MM-DD). Passed to ``onAddStay`` so
     *  the handler can identify which day was clicked. */
    dayDate?: string | null
    onStayAction?: DesktopKanbanViewProps['onStayAction']
    /** Click handler for the "+ Add stay" button on unstayed days. */
    onAddStay?: DesktopKanbanViewProps['onAddStay']
}) => {
    const pillRef = useRef<HTMLButtonElement | null>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // While the menu is open: outside-click / Escape dismiss, plus
    // scroll/resize re-anchor. The menu is ``position: fixed`` but the
    // pill it belongs to sits inside a horizontally-scrollable Kanban
    // strip — if the user scrolls the board the pill slides out from
    // under the menu and the popover looks orphaned. Track the pill's
    // client rect on every scroll frame (rAF-throttled) and keep the
    // menu anchored below its bottom-left corner.
    useEffect(() => {
        if (!menuPos) return
        const onDoc = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return
            setMenuPos(null)
        }
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuPos(null)
        }
        let rafId = 0
        const reposition = () => {
            rafId = 0
            const el = pillRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const next = { top: rect.bottom + 6, left: rect.left }
            setMenuPos((prev) => {
                if (!prev) return prev
                if (prev.top === next.top && prev.left === next.left) return prev
                return next
            })
        }
        const scheduleReposition = () => {
            if (rafId !== 0) return
            rafId = window.requestAnimationFrame(reposition)
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onEsc)
        window.addEventListener('scroll', scheduleReposition, true)
        window.addEventListener('resize', scheduleReposition)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('keydown', onEsc)
            window.removeEventListener('scroll', scheduleReposition, true)
            window.removeEventListener('resize', scheduleReposition)
            if (rafId !== 0) window.cancelAnimationFrame(rafId)
        }
    }, [menuPos])

    // Unstayed day → render the dashed "+ Add stay" button. Transit days
    // (no base city) render nothing so the header height stays flush
    // with stayed / add-stay columns' city row only.
    if (!matchedStay) {
        if (!cityId || !onAddStay) return null
        return (
            <button
                type="button"
                aria-label="Add stay"
                onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onAddStay(cityId, dayDate ?? undefined)
                }}
                className="flex w-[280px] cursor-pointer items-center justify-center gap-1 rounded-[38px] border border-dashed border-grey-4 bg-white px-2 py-[5px] transition-colors hover:bg-grey-5">
                <Plus
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-primary-default"
                />
                <span className="font-red-hat-display text-[12px] font-[645] tracking-[-0.48px] text-primary-default">Add stay</span>
            </button>
        )
    }

    const stay = matchedStay
    const stayId = String(stay.stay_id)
    const stayCityId = stay.city_id ?? null
    const interactive = Boolean(onStayAction)

    const openMenu = (e: ReactMouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        setMenuPos({ top: rect.bottom + 6, left: rect.left })
    }

    const handleAction = async (action: 'remove' | 'change') => {
        setMenuPos(null)
        if (!onStayAction) return
        await onStayAction(action, stayId, stayCityId)
    }

    const menuPortal =
        menuPos && interactive && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      ref={menuRef}
                      role="menu"
                      className="fixed z-[120] w-44 overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.28),0_4px_12px_-4px_rgba(15,23,42,0.16)]"
                      style={{ top: menuPos.top, left: menuPos.left }}
                      onMouseDown={(e) => e.stopPropagation()}>
                      <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleAction('change')}
                          className="block w-full cursor-pointer px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-primary-default/5">
                          Change hotel
                      </button>
                      <div className="h-px w-full bg-grey-4/80" />
                      <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleAction('remove')}
                          className="block w-full cursor-pointer px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-secondary-red transition-colors hover:bg-secondary-red/5">
                          Remove from trip
                      </button>
                  </div>,
                  document.body
              )
            : null

    const pillClass = 'flex w-[280px] items-center gap-1 rounded-[38px] border border-grey-4 bg-white px-2 py-[5px] transition-colors'
    const pillLabel = (
        <>
            <BedDouble
                size={14}
                strokeWidth={2}
                className="shrink-0 text-grey-0"
            />
            <span className="min-w-0 flex-1 truncate font-manrope text-[12px] font-semibold tracking-[-0.48px] text-grey-0">
                {stay.hotel_name}
                {stay.nights != null ? <span className="ml-1 font-normal text-grey-2">· {stay.nights}n</span> : null}
            </span>
        </>
    )

    if (!interactive) {
        return <div className={pillClass}>{pillLabel}</div>
    }

    return (
        <>
            <button
                ref={pillRef}
                type="button"
                onClick={openMenu}
                aria-label="Stay options"
                className={`${pillClass} cursor-pointer text-left hover:bg-grey-5`}>
                {pillLabel}
            </button>
            {menuPortal}
        </>
    )
}

const DayHeader = ({
    date,
    dayNumber,
    dayIndex,
    dayData,
    onOpenDayModal,
    isViewer,
    canEdit,
    routeFrom,
    sleepCity = null,
    sleepCityLoading = false,
    onMapClick,
    onKanbanDayAssistant,
    onKanbanDayMenuAction,
    hideExactDates = false,
    dayReorderEnabled = false,
    onDayReorderDragStart,
    onDayReorderDragEnd,
    dayDropMarkerTop = false,
    dayDropMarkerBottom = false,
    matchedStay = null,
    stayCityId = null,
    stayDayDate = null,
    onStayAction,
    onAddStay,
    isFirstDay = false,
    isLastDay = false,
    evenColumn = true
}: {
    date: Date
    dayNumber: number
    dayIndex: number
    dayData: any
    onOpenDayModal: () => void
    isViewer: boolean
    canEdit: boolean
    routeFrom?: string | null
    /** Route-summary sleep city for this day. When present, supersedes
     *  the ``routeFrom``/``baseCity`` heuristic. Null on overnight-
     *  transit days. */
    sleepCity?: string | null
    /** Initial route-summary fetch in flight — render a shimmer in
     *  the header instead of the fallback heuristic. */
    sleepCityLoading?: boolean
    onMapClick?: () => void
    onKanbanDayAssistant?: DesktopKanbanViewProps['onKanbanDayAssistant']
    onKanbanDayMenuAction?: DesktopKanbanViewProps['onKanbanDayMenuAction']
    hideExactDates?: boolean
    dayReorderEnabled?: boolean
    onDayReorderDragStart?: (e: React.DragEvent) => void
    onDayReorderDragEnd?: () => void
    /** Day reorder: dashed bar at top of header = “Day lands before this day” */
    dayDropMarkerTop?: boolean
    /** Day reorder: dashed bar at bottom = “Day lands after the trip (end)” */
    dayDropMarkerBottom?: boolean
    /** Matched stay for this day (post stayById lookup), or null if the
     *  day has no stay attached. Drives the per-day pill rendered below
     *  the city row. */
    matchedStay?: ItineraryStay | null
    /** The day's ``base_city.id`` (or null for transit days). Used by
     *  the "+ Add stay" pill to identify the target city. */
    stayCityId?: string | null
    /** The day's date string (YYYY-MM-DD). Passed through to
     *  ``onAddStay`` so the handler can identify the clicked day. */
    stayDayDate?: string | null
    /** Popover menu action for the hotel pill: ``remove`` or ``change``. */
    onStayAction?: DesktopKanbanViewProps['onStayAction']
    /** Click handler for the "+ Add stay" button on unstayed days. */
    onAddStay?: DesktopKanbanViewProps['onAddStay']
    /** True when this is the leftmost day column — gets the 24px
     *  left-side padding that otherwise would sit on a wrapping
     *  container (which doesn't exist in the header strip). */
    isFirstDay?: boolean
    /** True when this is the rightmost day column — gets the 24px
     *  right-side padding. */
    isLastDay?: boolean
    /** Mirrors the column-body alternation (``idx % 2 === 0``): even
     *  columns (Day 1, 3, …) are grey-5, odd columns are white. The header
     *  bg matches the body bg so the column reads as one strip rather
     *  than a white header on a coloured body. */
    evenColumn?: boolean
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const [headerHovered, setHeaderHovered] = useState(false)
    const [aiMenuOpen, setAiMenuOpen] = useState(false)
    const [aiCustom, setAiCustom] = useState('')
    const aiPopoverRef = useRef<HTMLDivElement>(null)
    const [dotsMenuOpen, setDotsMenuOpen] = useState(false)
    const dotsMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!aiMenuOpen) return
        const onDocDown = (e: MouseEvent) => {
            if (aiPopoverRef.current?.contains(e.target as Node)) return
            setAiMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocDown)
        return () => document.removeEventListener('mousedown', onDocDown)
    }, [aiMenuOpen])

    useEffect(() => {
        if (!dotsMenuOpen) return
        const onDocDown = (e: MouseEvent) => {
            if (dotsMenuRef.current?.contains(e.target as Node)) return
            setDotsMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocDown)
        return () => document.removeEventListener('mousedown', onDocDown)
    }, [dotsMenuOpen])

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })

    const getOrdinal = (n: number) => {
        if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
        switch (n % 10) {
            case 1:
                return `${n}st`
            case 2:
                return `${n}nd`
            case 3:
                return `${n}rd`
            default:
                return `${n}th`
        }
    }

    const baseCity = dayData?.base_city?.name || dayData?.destination_city?.name || ''
    const cityLabel = baseCity

    const showToolbar = headerHovered || aiMenuOpen || dotsMenuOpen
    const showAi = Boolean(!isViewer && canEdit && onKanbanDayAssistant)

    const fireAssistant = (intent: 'best_route' | 'shuffle' | 'find_activities' | 'custom', customMessage?: string) => {
        if (!onKanbanDayAssistant) return
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_AI_INTENT_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { intent, day_index: dayIndex, day_number: dayNumber }
        })
        onKanbanDayAssistant({
            dayIndex,
            dayNumber,
            date,
            cityLabel,
            intent,
            customMessage: customMessage?.trim() || undefined
        })
        setAiMenuOpen(false)
        setAiCustom('')
    }

    const openDayModal = () => {
        if (isViewer || !canEdit) return
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_HEADER_EDIT_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { day_index: dayIndex, day_number: dayNumber }
        })
        onOpenDayModal()
    }

    return (
        <div
            onMouseEnter={() => setHeaderHovered(true)}
            onMouseLeave={() => setHeaderHovered(false)}
            draggable={dayReorderEnabled}
            onDragStart={dayReorderEnabled ? onDayReorderDragStart : undefined}
            onDragEnd={dayReorderEnabled ? onDayReorderDragEnd : undefined}
            // Header alternation: white (even) / grey-5 (odd). Matches the
            // column body so each column reads as one continuous strip
            // top-to-bottom; adjacent columns get the rhythm break.
            className={`relative ${evenColumn ? 'bg-grey-5' : 'bg-white'} py-4 transition-[background-color] duration-200 ease-out ${
                isFirstDay ? 'pl-6' : ''
            } ${isLastDay ? 'pr-6' : ''} ${
                dayReorderEnabled ? 'cursor-grab active:cursor-grabbing [&_button]:cursor-pointer [&_input]:cursor-text' : ''
            }`}>
            {dayDropMarkerTop && (
                <div
                    className="pointer-events-none absolute inset-x-2 top-1 z-20 flex justify-center"
                    aria-hidden>
                    <div className="h-1 w-full max-w-[min(100%,220px)] rounded-full border-2 border-dashed border-primary-default/55 bg-primary-default/20 shadow-[0_0_0_1px_rgba(255,255,255,0.6)] animate-pulse" />
                </div>
            )}
            {dayDropMarkerBottom && (
                <div
                    className="pointer-events-none absolute inset-x-2 bottom-1 z-20 flex justify-center"
                    aria-hidden>
                    <div className="h-1 w-full max-w-[min(100%,220px)] rounded-full border-2 border-dashed border-primary-default/55 bg-primary-default/20 shadow-[0_0_0_1px_rgba(255,255,255,0.6)] animate-pulse" />
                </div>
            )}
            <div className="relative flex items-start gap-2">
                {dayReorderEnabled && (
                    <div
                        className="mt-0.5 shrink-0 text-grey-3 opacity-60"
                        aria-hidden
                        draggable={false}>
                        <GripVertical
                            size={16}
                            strokeWidth={2}
                        />
                    </div>
                )}
                <button
                    type="button"
                    draggable={false}
                    onClick={openDayModal}
                    disabled={isViewer || !canEdit}
                    className="min-w-0 flex-1 cursor-pointer rounded-lg px-0 py-0 text-left disabled:cursor-default disabled:opacity-90">
                    {/* Right padding is scoped to the date row only — that's where
                        the toolbar overlaps. The city line below gets full width so
                        long routes like "Nuwara Eliya → Kandy" stay on one line. */}
                    <div
                        className={`flex min-w-0 flex-nowrap items-baseline gap-x-1.5 transition-[padding] duration-200 ease-out ${
                            showToolbar && !isViewer && canEdit && (onKanbanDayMenuAction || onMapClick || onKanbanDayAssistant)
                                ? 'pr-[7.25rem]'
                                : showToolbar && onMapClick
                                  ? 'pr-12'
                                  : ''
                        }`}>
                        <span className="shrink-0 font-red-hat-display text-[16px] leading-[20px] tracking-[-0.32px] font-[550] text-grey-0">
                            Day {dayNumber}
                        </span>
                        {!hideExactDates && (
                            <>
                                <span className="shrink-0 font-red-hat-display text-[16px] leading-[20px] tracking-[-0.32px] font-[550] text-grey-2">
                                    ·
                                </span>
                                <span className="min-w-0 truncate font-red-hat-display text-[16px] leading-[20px] tracking-[-0.32px] font-[550] text-grey-2">
                                    {dayName}, {getOrdinal(day)} {month}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="mt-0.5 flex min-h-[18px] min-w-0 items-center gap-2">
                        {sleepCity ? (
                            <span className="font-manrope text-[12px] font-bold tracking-[-0.48px] text-grey-2 break-words whitespace-normal">
                                {sleepCity}
                            </span>
                        ) : sleepCityLoading ? (
                            <span
                                aria-hidden
                                className="inline-block h-3 w-20 animate-pulse rounded bg-grey-4"
                            />
                        ) : baseCity ? (
                            <span className="font-manrope text-[12px] font-bold tracking-[-0.48px] text-grey-2 break-words whitespace-normal">
                                {routeFrom ? (
                                    <>
                                        <span>{routeFrom}</span>{' '}
                                        <ArrowRight
                                            size={12}
                                            className="inline-block shrink-0 align-middle text-grey-2"
                                        />{' '}
                                        <span>{baseCity}</span>
                                    </>
                                ) : (
                                    baseCity
                                )}
                            </span>
                        ) : (
                            <span className="font-manrope text-[12px] font-bold tracking-[-0.48px] text-grey-3">Add a destination</span>
                        )}
                    </div>
                </button>

                <div
                    className={`absolute right-0 -top-1 z-30 flex items-start gap-1.5 transition-all duration-200 ease-out ${
                        showToolbar ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                    }`}>
                    {!isViewer && canEdit && (
                        <div
                            className="relative"
                            ref={dotsMenuRef}>
                            <button
                                type="button"
                                draggable={false}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onKanbanDayMenuAction) {
                                        setAiMenuOpen(false)
                                        setDotsMenuOpen((v) => !v)
                                    } else {
                                        openDayModal()
                                    }
                                }}
                                className={headerActionBtnClass}
                                title="Day options"
                                aria-expanded={dotsMenuOpen}
                                aria-haspopup={onKanbanDayMenuAction ? 'menu' : undefined}>
                                <MoreHorizontal
                                    size={16}
                                    strokeWidth={2}
                                    className="text-grey-1"
                                />
                            </button>
                            {onKanbanDayMenuAction && dotsMenuOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[200px] overflow-hidden rounded-xl border border-grey-4 bg-white py-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        draggable={false}
                                        onClick={() => {
                                            trackButtonClickCustom({
                                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_MENU_ADD_BEFORE_CLICK,
                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                extra: { day_index: dayIndex, day_number: dayNumber }
                                            })
                                            onKanbanDayMenuAction('add_day_before', { dayIndex, dayNumber, date })
                                            setDotsMenuOpen(false)
                                        }}
                                        className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                                        Add a day before
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        draggable={false}
                                        onClick={() => {
                                            trackButtonClickCustom({
                                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_MENU_ADD_AFTER_CLICK,
                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                extra: { day_index: dayIndex, day_number: dayNumber }
                                            })
                                            onKanbanDayMenuAction('add_day_after', { dayIndex, dayNumber, date })
                                            setDotsMenuOpen(false)
                                        }}
                                        className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                                        Add a day after
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        draggable={false}
                                        onClick={() => {
                                            trackButtonClickCustom({
                                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_MENU_CLEAR_COLUMN_CLICK,
                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                extra: { day_index: dayIndex, day_number: dayNumber }
                                            })
                                            onKanbanDayMenuAction('clear_column', { dayIndex, dayNumber, date })
                                            setDotsMenuOpen(false)
                                        }}
                                        className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                                        Clear day
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        draggable={false}
                                        onClick={() => {
                                            trackButtonClickCustom({
                                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_MENU_DELETE_COLUMN_CLICK,
                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                extra: { day_index: dayIndex, day_number: dayNumber }
                                            })
                                            onKanbanDayMenuAction('delete_column', { dayIndex, dayNumber, date })
                                            setDotsMenuOpen(false)
                                        }}
                                        className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
                                        Delete day
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {onMapClick && (
                        <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                                e.stopPropagation()
                                trackButtonClickCustom({
                                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_OPEN_MAP_FROM_COLUMN_CLICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { day_index: dayIndex, day_number: dayNumber }
                                })
                                onMapClick()
                            }}
                            className={mapActionBtnClass}
                            title="View on map">
                            <MapIcon
                                size={15}
                                className="text-primary-default"
                            />
                        </button>
                    )}
                    {showAi && (
                        <div
                            className="relative"
                            ref={aiPopoverRef}>
                            <button
                                type="button"
                                draggable={false}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDotsMenuOpen(false)
                                    setAiMenuOpen((v) => !v)
                                }}
                                className={`${headerActionBtnClass} border-primary-default/25`}
                                title="AI assistant"
                                aria-expanded={aiMenuOpen}>
                                <Sparkles
                                    size={16}
                                    className="text-primary-default"
                                    strokeWidth={2}
                                />
                            </button>
                            {aiMenuOpen && (
                                <div
                                    className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(260px,calc(100vw-24px))] overflow-hidden rounded-xl border border-grey-4 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        draggable={false}
                                        onClick={() => fireAssistant('best_route')}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                                        <Sparkles
                                            size={14}
                                            className="shrink-0 text-primary-default"
                                        />
                                        Find me the best route
                                    </button>
                                    <button
                                        type="button"
                                        draggable={false}
                                        onClick={() => fireAssistant('shuffle')}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                                        <Sparkles
                                            size={14}
                                            className="shrink-0 text-primary-default"
                                        />
                                        Shuffle options
                                    </button>
                                    <form
                                        className="border-t border-grey-4/80 px-2.5 pb-1 pt-2"
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            const t = aiCustom.trim()
                                            if (t) fireAssistant('custom', t)
                                        }}>
                                        <input
                                            value={aiCustom}
                                            draggable={false}
                                            onChange={(e) => setAiCustom(e.target.value)}
                                            placeholder="Ask something else…"
                                            style={{
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                borderColor: '#7011f6'
                                            }}
                                            className="w-full rounded-full bg-white px-3.5 py-2 font-manrope text-[12px] text-grey-0 placeholder:text-grey-3 outline-none"
                                        />
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Centered horizontally so the 280px Add-stay / stay pill
                doesn't sit left-aligned in the wider column header. */}
            <div className="mt-3 flex justify-center">
                <DayStayPill
                    matchedStay={matchedStay}
                    cityId={stayCityId}
                    dayDate={stayDayDate}
                    onStayAction={onStayAction}
                    onAddStay={onAddStay}
                />
            </div>
        </div>
    )
}

export function kanbanSlotEditPayload(event: any) {
    return {
        id: event.id,
        title: event.title,
        start: event.start ? new Date(event.start) : null,
        end: event.end ? new Date(event.end) : null,
        extendedProps: event
    }
}

export type KanbanSlotAssistantArgs = {
    dayIndex: number
    dayNumber: number
    date: Date
    cityLabel: string
    event: any
    intent: 'detail' | 'alternate' | 'custom'
    customMessage?: string
}

/** Top-right ⋯ / map / AI actions (desktop kanban); matches DayHeader chrome */
function KanbanCardHoverToolbar({
    visible,
    event,
    dayNumber,
    columnDate,
    cityLabel,
    onEdit,
    onDelete,
    onViewMap,
    onKanbanSlotAssistant,
    onMenuOpenChange,
    onToggleAlternatives,
    inline = false
}: {
    visible: boolean
    event: any
    dayNumber: number
    columnDate: Date
    cityLabel: string
    onEdit: (e: any) => void
    onDelete: (e: any) => void
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    onKanbanSlotAssistant?: (a: KanbanSlotAssistantArgs) => void
    onMenuOpenChange?: (open: boolean) => void
    onToggleAlternatives?: () => void
    /** Render inside a host card's own top-right cluster (static, no absolute corner / fade-translate) instead of as the floating overlay. */
    inline?: boolean
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [aiMenuOpen, setAiMenuOpen] = useState(false)
    const [aiCustom, setAiCustom] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)
    const aiPopoverRef = useRef<HTMLDivElement>(null)
    const { trackButtonClickCustom } = usePostHog()

    useEffect(() => {
        if (!menuOpen) return
        const onDoc = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return
            setMenuOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [menuOpen])

    useEffect(() => {
        if (!aiMenuOpen) return
        const onDoc = (e: MouseEvent) => {
            if (aiPopoverRef.current?.contains(e.target as Node)) return
            setAiMenuOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [aiMenuOpen])

    useEffect(() => {
        if (!visible) {
            setMenuOpen(false)
            setAiMenuOpen(false)
        }
    }, [visible])

    // Any open popover on the slot keeps the card elevated + tells the parent to
    // reserve z-index. Either menu counts as "menu open" for the slot card.
    useEffect(() => {
        onMenuOpenChange?.(menuOpen || aiMenuOpen)
    }, [menuOpen, aiMenuOpen, onMenuOpenChange])

    const payload = useMemo(() => kanbanSlotEditPayload(event), [event])
    const slotData = event.slotData || event.slot_data || {}
    const experienceId = slotData.id as string | undefined
    const showMap = Boolean(onViewMap && experienceId)
    const hasAiHandler = Boolean(onKanbanSlotAssistant)
    // Transport slots aren't "spots" — relabel the AI items so the copy
    // doesn't ask "Tell me about this spot" for a flight or transfer, and
    // recasts "Suggest alternatives" as a route-focused prompt.
    const isTransportSlot = event.type === 'transport' || isTransportKind(event.kind)
    const aiTellLabel = isTransportSlot ? 'Tell me about this route' : 'Tell me about this spot'
    const aiAlternateLabel = isTransportSlot ? 'Suggest alternative routes' : 'Suggest alternatives'

    const fireSlotAssistant = (intent: 'detail' | 'alternate' | 'custom', customMessage?: string) => {
        if (!onKanbanSlotAssistant) return
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_SLOT_AI_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { slot_id: event.slot_id, day_index: event.dayIndex, intent }
        })
        onKanbanSlotAssistant({
            dayIndex: event.dayIndex,
            dayNumber,
            date: columnDate,
            cityLabel,
            event,
            intent,
            customMessage: customMessage?.trim() || undefined
        })
        setAiMenuOpen(false)
        setAiCustom('')
    }

    return (
        <div
            className={
                inline
                    ? 'kanban-card-hover-toolbar flex items-center gap-1'
                    : `kanban-card-hover-toolbar absolute right-3 top-3 z-20 flex items-center gap-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                      }`
            }
            onMouseDown={(e) => e.stopPropagation()}
            aria-hidden={inline ? undefined : !visible}>
            <div
                className="relative"
                ref={menuRef}>
                <button
                    type="button"
                    draggable={false}
                    onClick={(e) => {
                        e.stopPropagation()
                        setAiMenuOpen(false)
                        setMenuOpen((v) => !v)
                    }}
                    className={headerActionBtnClass}
                    title="Slot options"
                    aria-expanded={menuOpen}>
                    <MoreHorizontal
                        size={16}
                        strokeWidth={2}
                        className="text-grey-1"
                    />
                </button>
                {menuOpen && (
                    <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+6px)] z-[70] min-w-[200px] overflow-hidden rounded-xl border border-grey-4 bg-white py-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)] origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 ease-out"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            role="menuitem"
                            draggable={false}
                            onClick={() => {
                                setMenuOpen(false)
                                trackButtonClickCustom({
                                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_EDIT_SLOT_CLICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { slot_id: event.slot_id, day_index: event.dayIndex }
                                })
                                onEdit(payload)
                            }}
                            className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                            Edit slot
                        </button>
                        {/* <button
                            type="button"
                            role="menuitem"
                            draggable={false}
                            onClick={() => {
                                setMenuOpen(false)
                                toast.message('Move this slot', {
                                    description:
                                        'Drag the card to another day or drop between activities to change the order.'
                                })
                            }}
                            className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                            Move slot
                        </button> */}
                        <button
                            type="button"
                            role="menuitem"
                            draggable={false}
                            onClick={() => {
                                setMenuOpen(false)
                                trackButtonClickCustom({
                                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DELETE_SLOT_CLICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { slot_id: event.slot_id, day_index: event.dayIndex }
                                })
                                onDelete(payload)
                            }}
                            className="flex w-full px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
                            Delete event
                        </button>
                    </div>
                )}
            </div>
            {onToggleAlternatives && (
                <button
                    type="button"
                    draggable={false}
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleAlternatives()
                    }}
                    className={cn(
                        headerActionBtnClass,
                        'border-primary-default/30 hover:border-primary-default hover:bg-primary-default/8'
                    )}
                    title="See alternatives">
                    <ArrowLeftRight
                        size={14}
                        strokeWidth={2}
                        className="text-primary-default"
                    />
                </button>
            )}
            {showMap && (
                <button
                    type="button"
                    draggable={false}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (experienceId) {
                            trackButtonClickCustom({
                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_SLOT_TOOLBAR_MAP_CLICK,
                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                extra: { slot_id: event.slot_id, day_index: event.dayIndex, experience_id: experienceId }
                            })
                            onViewMap!(experienceId, event.dayIndex)
                        }
                    }}
                    className={headerActionBtnClass}
                    title="View on map">
                    <MapIcon
                        size={15}
                        strokeWidth={2}
                        className="text-grey-1"
                    />
                </button>
            )}
            <div
                className="relative"
                ref={aiPopoverRef}>
                <button
                    type="button"
                    draggable={false}
                    disabled={!hasAiHandler}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!onKanbanSlotAssistant) return
                        setMenuOpen(false)
                        setAiMenuOpen((v) => !v)
                    }}
                    className={`${headerActionBtnClass} border-primary-default/25 ${!hasAiHandler ? 'cursor-not-allowed opacity-40 hover:scale-100' : ''}`}
                    title={hasAiHandler ? 'Ask AI about this slot' : 'AI assistant unavailable'}
                    aria-expanded={aiMenuOpen}>
                    <Sparkles
                        size={16}
                        strokeWidth={2}
                        className="text-primary-default"
                    />
                </button>
                {aiMenuOpen && hasAiHandler && (
                    <div
                        className="absolute right-0 top-[calc(100%+6px)] z-[70] w-[min(260px,calc(100vw-24px))] overflow-hidden rounded-xl border border-grey-4 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)] origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 ease-out"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        // Stop key events from bubbling up to the slot
                        // card root, which treats Enter/Space as
                        // "open slot detail" for keyboard a11y.
                        // Without this, typing Space or Enter in the
                        // "Ask something else…" input opens the slot
                        // modal instead of inserting a space / firing
                        // the form submit.
                        onKeyDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            draggable={false}
                            onClick={() => fireSlotAssistant('detail')}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                            <Sparkles
                                size={14}
                                className="shrink-0 text-primary-default"
                            />
                            {aiTellLabel}
                        </button>
                        <button
                            type="button"
                            draggable={false}
                            onClick={() => fireSlotAssistant('alternate')}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-grey-4/30">
                            <Sparkles
                                size={14}
                                className="shrink-0 text-primary-default"
                            />
                            {aiAlternateLabel}
                        </button>
                        <form
                            className="border-t border-grey-4/80 px-2.5 pb-1 pt-2"
                            onSubmit={(e) => {
                                e.preventDefault()
                                const t = aiCustom.trim()
                                if (t) fireSlotAssistant('custom', t)
                            }}>
                            <input
                                value={aiCustom}
                                draggable={false}
                                onChange={(e) => setAiCustom(e.target.value)}
                                placeholder="Ask something else…"
                                style={{
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: '#7011f6'
                                }}
                                className="w-full rounded-full bg-white px-3.5 py-2 font-manrope text-[12px] text-grey-0 placeholder:text-grey-3 outline-none"
                            />
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────── Kanban Event Card Router ───────────────────────────────
export const KanbanEventCard = ({
    event,
    onEdit,
    onDelete,
    canEdit,
    shortlistedExperienceIds,
    onViewMap,
    changedSlotBadges,
    suppressHoverPopup = false,
    attachTimeStripBelow = false,
    placementSaving = false,
    isViewer = false,
    columnDate,
    dayNumber: dayNumberProp,
    cityLabel = '',
    onKanbanSlotAssistant,
    onMobileSlotTap,
    suppressHoverSuggestionsForPlacement = false,
    suppressHoverAiSuggestions = false,
    boardGrabCursor = false,
    onDesktopSlotDetailOpen,
    onDesktopBoardSneakPeekOpen
}: {
    event: any
    onEdit: (e: any) => void
    onDelete: (e: any) => void
    canEdit: boolean
    shortlistedExperienceIds: Set<string>
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    changedSlotBadges?: Set<string>
    /** Hide card hover chrome (e.g. mobile, map sidebar, drag placeholder, time strip) */
    suppressHoverPopup?: boolean
    /** Flatten bottom radius/border so ChooseStartTimeStrip reads as one card */
    attachTimeStripBelow?: boolean | null
    /** Persisting new time after placement: tiny spinner in the time row only */
    placementSaving?: boolean
    isViewer?: boolean
    columnDate?: Date
    dayNumber?: number
    cityLabel?: string
    onKanbanSlotAssistant?: (a: KanbanSlotAssistantArgs) => void
    /** Mobile: parent opens SlotDetailBottomSheet / SneakPeek instead of inline SneakPeek on the card */
    onMobileSlotTap?: (event: any) => void
    /** Desktop board only: while “choose start time” is open, hide hover suggestions (avoids overlap). */
    suppressHoverSuggestionsForPlacement?: boolean
    /** e.g. map subtab: never show hover AI suggestions on cards. */
    suppressHoverAiSuggestions?: boolean
    /** Desktop itinerary board: draggable column — show grab cursors on card surfaces */
    boardGrabCursor?: boolean
    /** Desktop board: centered slot dialog for non-experience cards; experience/visit opens SneakPeek via onDesktopBoardSneakPeekOpen */
    onDesktopSlotDetailOpen?: (event: any) => void
    onDesktopBoardSneakPeekOpen?: (event: any) => void
}) => {
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()
    const [cardHovered, setCardHovered] = useState(false)
    const [slotOverflowMenuOpen, setSlotOverflowMenuOpen] = useState(false)
    // Mobile ⋯ menu — anchor rect of the trigger button.
    const [mobileMenuAnchor, setMobileMenuAnchor] = useState<DOMRect | null>(null)

    // ── Suggested Alternatives state ──────────────────────────────────────
    const [altDrawerOpen, setAltDrawerOpen] = useState(false)
    const [altLoading, setAltLoading] = useState(false)
    const [altSlots, setAltSlots] = useState<AlternativeSlot[]>([])

    const resolvedDayNumber = dayNumberProp ?? (typeof event.dayIndex === 'number' ? event.dayIndex + 1 : 1)
    const resolvedColumnDate = columnDate ?? (event.start ? new Date(event.start) : new Date())

    const delegateMobileTap = Boolean(isMobile && onMobileSlotTap)
    const showDesktopSlotMeta = Boolean(!isMobile && !delegateMobileTap && onDesktopSlotDetailOpen)

    const type = event.type as string
    const kind = event.kind as string
    const slotExperienceId = event.slotData?.id || event.slot_data?.id
    const opensSneakPeekOnDesktopBoard = Boolean(showDesktopSlotMeta && (type === 'experience' || type === 'visit') && slotExperienceId)
    const suppressInlineSneakPeek = showDesktopSlotMeta && !opensSneakPeekOnDesktopBoard
    const showDesktopSlotDetailClick = showDesktopSlotMeta && !opensSneakPeekOnDesktopBoard
    const boardSneakPeekHandoff = opensSneakPeekOnDesktopBoard && onDesktopBoardSneakPeekOpen ? onDesktopBoardSneakPeekOpen : undefined

    const useBoardGrabCursor = Boolean(boardGrabCursor && !isMobile && !delegateMobileTap)
    const boardGrabRootClass = useBoardGrabCursor ? 'cursor-grab active:cursor-grabbing [&_button]:cursor-pointer [&_a]:cursor-pointer' : ''


    // Transport and stay pills don't need alternatives
    const isTransportOrStayPill = useMemo(() => {
        if (type === 'transport' || isTransportKind(kind)) return true
        const t = (event.title || '').toLowerCase()
        if ((type === 'stay' || kind === 'stay') && (t.includes('check-in') || t.includes('check-out') || t.includes('checkin') || t.includes('checkout'))) return true
        if (type === 'custom' || kind === 'custom') return true
        return false
    }, [type, kind, event.title])

    const showAlternativesButton = !isMobile && canEdit && !isViewer && !suppressHoverPopup && !placementSaving && !isTransportOrStayPill

    const generateMockAlternatives = useCallback((evt: any): AlternativeSlot[] => {
        const slotData = evt.slotData || evt.slot_data || {}
        const cityName = slotData.base_city?.name || cityLabel || 'this area'
        const slotType = evt.type || evt.kind || 'experience'

        const experienceAlts: AlternativeSlot[] = [
            {
                id: `alt-${evt.id || evt.slot_id}-1`,
                title: `Cultural Walking Tour of ${cityName}`,
                image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
                rating: 4.7,
                ratingCount: 1243,
                location: cityName,
                duration: '3h',
                priceLabel: '₹2,400/pp',
                tags: ['Cultural', 'Walking'],
                reason: 'Highly rated by travellers visiting this city'
            },
            {
                id: `alt-${evt.id || evt.slot_id}-2`,
                title: `${cityName} Food Market Experience`,
                image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
                rating: 4.5,
                ratingCount: 876,
                location: cityName,
                duration: '2h',
                priceLabel: '₹1,800/pp',
                tags: ['Food', 'Local'],
                reason: 'Popular with foodies and cultural explorers'
            },
            {
                id: `alt-${evt.id || evt.slot_id}-3`,
                title: `Sunset Viewpoint & Photography`,
                image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80',
                rating: 4.8,
                ratingCount: 2100,
                location: cityName,
                duration: '1.5h',
                priceLabel: '₹800/pp',
                tags: ['Photography', 'Scenic'],
                reason: 'Perfect timing for your evening slot'
            },
            {
                id: `alt-${evt.id || evt.slot_id}-4`,
                title: `Heritage Museum & Art Gallery`,
                image: 'https://images.unsplash.com/photo-1513506003901-1e6a35b1a4f1?w=400&q=80',
                rating: 4.3,
                ratingCount: 540,
                location: cityName,
                duration: '2h 30m',
                priceLabel: '₹1,200/pp',
                tags: ['Art', 'History'],
                reason: 'Great indoor alternative if weather is uncertain'
            }
        ]

        const restaurantAlts: AlternativeSlot[] = [
            {
                id: `alt-${evt.id || evt.slot_id}-1`,
                title: `The Local Kitchen – Farm to Table`,
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
                rating: 4.6,
                ratingCount: 782,
                location: cityName,
                duration: '1.5h',
                priceLabel: '₹₹ Mid-range',
                tags: ['Veg-friendly', 'Local Cuisine'],
                reason: 'Top-rated for authentic local flavours'
            },
            {
                id: `alt-${evt.id || evt.slot_id}-2`,
                title: `Rooftop Bistro with City Views`,
                image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
                rating: 4.4,
                ratingCount: 1023,
                location: cityName,
                duration: '2h',
                priceLabel: '₹₹₹ Premium',
                tags: ['Rooftop', 'Romantic'],
                reason: 'Great for special evenings or celebrations'
            }
        ]

        const isMealKind = slotType === 'restaurant' || slotType === 'meal'
        const alts = isMealKind ? restaurantAlts : experienceAlts
        return alts.slice(0, 4)
    }, [cityLabel])

    const handleToggleAlternatives = useCallback(() => {
        if (altDrawerOpen) {
            setAltDrawerOpen(false)
            return
        }
        setAltDrawerOpen(true)
        setAltLoading(true)
        setAltSlots([])
        setTimeout(() => {
            setAltSlots(generateMockAlternatives(event))
            setAltLoading(false)
        }, 800)
    }, [altDrawerOpen, event, generateMockAlternatives])

    const handleSwapAlternative = useCallback(async (alt: AlternativeSlot) => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: 'kanban_slot_alternative_swap',
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { slot_id: event.slot_id, day_index: event.dayIndex, alt_id: alt.id }
        })
        await new Promise((r) => setTimeout(r, 600))
    }, [event, trackButtonClickCustom])

    // Determine card element based on event type (existing routing logic)
    let cardElement: React.ReactNode
    /** Transport & check-in/out stays use the shared hover toolbar (⋯ / map / AI); other stays use thumbnail + toolbar */
    let useCardChromeToolbar = true
    /** Compact (non-hero) cards get the small "Suggestions" pill chip instead of the full blurred hero overlay. */
    let isCompactCard = false
    /** Day-tour hero owns its own controls — hide the redundant floating "View details" pill. */
    let suppressViewDetailsPill = false

    if (type === 'transport' || isTransportKind(kind)) {
        cardElement = (
            <TransportPill
                event={event}
                placementSaving={placementSaving}
                boardGrabCursor={useBoardGrabCursor}
                showDesktopSlotMeta={showDesktopSlotMeta}
            />
        )
    } else if (type === 'stay' || kind === 'stay') {
        const title = (event.title || '').toLowerCase()
        if (title.includes('check-in') || title.includes('check-out') || title.includes('checkin') || title.includes('checkout')) {
            cardElement = (
                <StayPill
                    event={event}
                    placementSaving={placementSaving}
                    boardGrabCursor={useBoardGrabCursor}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                />
            )
        } else {
            isCompactCard = true
            cardElement = (
                <ThumbnailCard
                    event={event}
                    placementSaving={placementSaving}
                    suppressMobileOpen={delegateMobileTap}
                    suppressInlineSneakPeek={suppressInlineSneakPeek}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                    boardGrabCursor={useBoardGrabCursor}
                    boardSneakPeekOpen={boardSneakPeekHandoff}
                    mobileMenuOpen={Boolean(mobileMenuAnchor)}
                />
            )
        }
    } else if (type === 'experience') {
        const slotData = event.slotData || event.slot_data || {}
        const suggestionPriority = slotData.suggestion_priority ?? null
        const experienceId = slotData.id
        const isShortlisted = experienceId ? shortlistedExperienceIds.has(experienceId) : false
        const isDayTour = getDayTourLinkedActivities(event) !== null
        const useHeroLayout = ITINERARY_BOARD_ALL_EXPERIENCE_HERO_IMAGES || suggestionPriority === 0 || suggestionPriority === 2
        if (isDayTour) {
            // The day-tour hero owns its slot toolbar inline beside the collapse
            // chevron — suppress the generic floating chrome (and the redundant
            // "View details" pill; the cover image opens the sneak peek) so the
            // two control systems can't collide in the top-right corner.
            useCardChromeToolbar = false
            suppressViewDetailsPill = true
            cardElement = (
                <DayTourHeroCard
                    event={event}
                    isShortlisted={isShortlisted}
                    onViewMap={onViewMap}
                    placementSaving={placementSaving}
                    suppressMobileOpen={delegateMobileTap}
                    suppressInlineSneakPeek={suppressInlineSneakPeek}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                    boardGrabCursor={useBoardGrabCursor}
                    boardSneakPeekOpen={boardSneakPeekHandoff}
                    mobileMenuOpen={Boolean(mobileMenuAnchor)}
                    showSlotToolbar={!isMobile && canEdit && !isViewer && !suppressHoverPopup && !placementSaving && (cardHovered || slotOverflowMenuOpen)}
                    dayNumber={resolvedDayNumber}
                    columnDate={resolvedColumnDate}
                    cityLabel={cityLabel}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onKanbanSlotAssistant={onKanbanSlotAssistant}
                    onSlotMenuOpenChange={setSlotOverflowMenuOpen}
                />
            )
        } else if (useHeroLayout) {
            cardElement = (
                <ExperienceHeroCard
                    event={event}
                    isShortlisted={isShortlisted}
                    onViewMap={onViewMap}
                    placementSaving={placementSaving}
                    suppressMobileOpen={delegateMobileTap}
                    suppressInlineSneakPeek={suppressInlineSneakPeek}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                    boardGrabCursor={useBoardGrabCursor}
                    boardSneakPeekOpen={boardSneakPeekHandoff}
                    mobileMenuOpen={Boolean(mobileMenuAnchor)}
                />
            )
        } else {
            isCompactCard = true
            cardElement = (
                <ThumbnailCard
                    event={event}
                    onViewMap={onViewMap}
                    placementSaving={placementSaving}
                    suppressMobileOpen={delegateMobileTap}
                    suppressInlineSneakPeek={suppressInlineSneakPeek}
                    showDesktopSlotMeta={showDesktopSlotMeta}
                    boardGrabCursor={useBoardGrabCursor}
                    boardSneakPeekOpen={boardSneakPeekHandoff}
                    mobileMenuOpen={Boolean(mobileMenuAnchor)}
                />
            )
        }
    } else if (type === 'restaurant' || kind === 'meal' || kind === 'place') {
        // Meal & place slots always render as the small compact thumbnail row,
        // so they take the Suggestions hover chip instead of the View details
        // pill (which is reserved for taller hero/experience cards).
        isCompactCard = true
        cardElement = (
            <MealPlaceHeroCard
                event={event}
                onViewMap={onViewMap}
                placementSaving={placementSaving}
                suppressMobileOpen={delegateMobileTap}
                suppressInlineSneakPeek={suppressInlineSneakPeek}
                showDesktopSlotMeta={showDesktopSlotMeta}
                boardGrabCursor={useBoardGrabCursor}
                boardSneakPeekOpen={boardSneakPeekHandoff}
                mobileMenuOpen={Boolean(mobileMenuAnchor)}
            />
        )
    } else if (type === 'custom' || kind === 'custom') {
        cardElement = (
            <CustomCard
                event={event}
                placementSaving={placementSaving}
                boardGrabCursor={useBoardGrabCursor}
                showDesktopSlotMeta={showDesktopSlotMeta}
            />
        )
    } else if (type === 'visit') {
        isCompactCard = true
        cardElement = (
            <ThumbnailCard
                event={event}
                onViewMap={onViewMap}
                placementSaving={placementSaving}
                suppressMobileOpen={delegateMobileTap}
                suppressInlineSneakPeek={suppressInlineSneakPeek}
                showDesktopSlotMeta={showDesktopSlotMeta}
                boardGrabCursor={useBoardGrabCursor}
                boardSneakPeekOpen={boardSneakPeekHandoff}
                mobileMenuOpen={Boolean(mobileMenuAnchor)}
            />
        )
    } else {
        isCompactCard = true
        cardElement = (
            <ThumbnailCard
                event={event}
                onViewMap={onViewMap}
                placementSaving={placementSaving}
                suppressMobileOpen={delegateMobileTap}
                suppressInlineSneakPeek={suppressInlineSneakPeek}
                showDesktopSlotMeta={showDesktopSlotMeta}
                boardGrabCursor={useBoardGrabCursor}
                boardSneakPeekOpen={boardSneakPeekHandoff}
                mobileMenuOpen={Boolean(mobileMenuAnchor)}
            />
        )
    }

    const showHoverChrome = !isMobile && canEdit && !isViewer && !suppressHoverPopup && !placementSaving && useCardChromeToolbar

    const isHighlighted = event.isHighlighted || false
    const slotId = `${event.dayIndex}-${event.slotIndex}`
    const hasChangedBadge = changedSlotBadges?.has(slotId) || false

    const attachStripClasses = attachTimeStripBelow
        ? '[&_.rounded-xl]:rounded-b-none [&_.rounded-xl]:border-b-0 [&_.rounded-xl]:shadow-none [&_.rounded-xl]:hover:shadow-none'
        : ''

    // Pill-style events (no hero image): transport, stay check-in/out, custom notes.
    // These get a compact "View details" chip on hover instead of the big overlay,
    // since a full-card blur doesn't fit a ~44px-tall pill.
    const isPillEvent = useMemo(() => {
        const t = event.type
        const k = event.kind
        const title = (event.title || '').toLowerCase()
        if (t === 'transport' || isTransportKind(k)) return true
        if (
            (t === 'stay' || k === 'stay') &&
            (title.includes('check-in') || title.includes('check-out') || title.includes('checkin') || title.includes('checkout'))
        )
            return true
        if (t === 'custom' || k === 'custom') return true
        return false
    }, [event])

    const hoverActive = !isMobile && !placementSaving && cardHovered && !suppressHoverSuggestionsForPlacement && !suppressHoverAiSuggestions
    const useCompactChip = isPillEvent || isCompactCard
    const suggestionReasonsAll = useMemo(() => getSlotSuggestionStrings(event), [event])
    const hasSuggestions = suggestionReasonsAll.length > 0

    const openSlotDetail = () => {
        if (opensSneakPeekOnDesktopBoard) onDesktopBoardSneakPeekOpen?.(event)
        else onDesktopSlotDetailOpen?.(event)
    }

    const handleDesktopSlotCardClick = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!showDesktopSlotDetailClick || isMobile || delegateMobileTap) return
        if (placementSaving) return
        const el = e.target as HTMLElement
        if (el.closest('.kanban-card-hover-toolbar')) return
        if (el.closest('button')) return
        if (el.closest('a')) return
        onDesktopSlotDetailOpen?.(event)
    }

    const desktopPointerSurfaceClass =
        showDesktopSlotDetailClick && !delegateMobileTap && !useBoardGrabCursor ? '[&_[data-kanban-surface]]:cursor-pointer' : ''

    return (
        <div
            onMouseEnter={() => !isMobile && setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}
            onClick={
                // While the mobile ⋯ menu is open, a tap on the card just
                // dismisses it — don't fall through to SneakPeek / bottom sheet.
                isMobile && mobileMenuAnchor
                    ? () => setMobileMenuAnchor(null)
                    : delegateMobileTap
                      ? () => onMobileSlotTap?.(event)
                      : showDesktopSlotDetailClick
                        ? handleDesktopSlotCardClick
                        : undefined
            }
            role={delegateMobileTap ? 'button' : showDesktopSlotDetailClick ? 'button' : undefined}
            tabIndex={delegateMobileTap || showDesktopSlotDetailClick ? 0 : undefined}
            onKeyDown={
                delegateMobileTap
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onMobileSlotTap?.(event)
                          }
                      }
                    : showDesktopSlotDetailClick
                      ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onDesktopSlotDetailOpen?.(event)
                            }
                        }
                      : undefined
            }
            className={`relative transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                // Menu-open state needs to sit ABOVE the Tripboard floating AI launcher
                // (fixed, z-[60]). A plain z-10 stacking context confines the inner menu
                // no matter how high its own z-index — z-[80] escapes that and keeps the
                // ⋯ / AI popovers fully clickable over the floating chip.
                // Mobile no longer raises the card above the click-blocker (was
                // causing scrolls to leak through from the photo). The card's
                // bg color change alone signals selection.
                !isMobile && slotOverflowMenuOpen ? 'z-[80]' : !isMobile && cardHovered ? 'z-10' : 'z-0'
            } ${delegateMobileTap ? 'cursor-pointer' : boardGrabRootClass} ${desktopPointerSurfaceClass} ${isHighlighted ? 'ring-2 ring-primary-default/40 rounded-xl animate-pulse ' : ''} ${attachStripClasses}`}>
            {hasChangedBadge && (
                <span className="absolute -top-1.5 -right-1.5 z-30 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold font-red-hat-display shadow-sm">
                    Changed
                </span>
            )}

            <div className="relative z-[2] rounded-xl overflow-hidden">
                {cardElement}
                {/* Mobile ⋯ trigger — non-pill cards only. Compact rows centre
                    the button vertically; hero cards anchor it bottom-right. */}
                {isMobile && !isPillEvent && (
                    <button
                        type="button"
                        aria-label="Slot options"
                        onClick={(e) => {
                            e.stopPropagation()
                            trackButtonClickCustom({
                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_OPEN,
                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                extra: { day_index: event.dayIndex, slot_kind: kind }
                            })
                            setMobileMenuAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())
                        }}
                        className={`absolute z-[3] flex items-center justify-center active:scale-95 transition-transform ${
                            isCompactCard
                                ? 'top-2 right-2'
                                : 'right-2 bottom-2 h-8 w-8 rounded-full bg-white/95 ring-1 ring-grey-4'
                        }`}>
                        <MoreHorizontal
                            size={16}
                            className="text-grey-1"
                        />
                    </button>
                )}
                {!useCompactChip && !suppressViewDetailsPill && showDesktopSlotMeta && (
                    <div
                        className={`absolute bottom-0 right-0 z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            hoverActive ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                        }`}>
                        <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                                e.stopPropagation()
                                openSlotDetail()
                            }}
                            className="bg-primary-default cursor-pointer font-red-hat-display rounded-br-xl rounded-tl-xl text-natural-white px-3 py-1.5 text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
                            View details
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Hover-only "Tips" chip on compact/pill cards that have AI suggestions. */}
            <AnimatePresence initial={false}>
                {useCompactChip && hoverActive && hasSuggestions && (
                    <motion.span
                        key="kanban-pill-suggestion-chip"
                        initial={{ opacity: 0, y: -4, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -3, scale: 0.92 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="pointer-events-none absolute -top-2.5 left-2 z-[5] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold font-manrope ring-2 ring-white shadow-[0_6px_16px_-4px_rgba(217,119,6,0.45)]"
                        style={{ backgroundColor: '#FFEDCC', color: '#92400E' /* amber-900 */ }}>
                        <img
                            src={BULB_ICON}
                            alt=""
                            className="h-3.5 w-3.5 object-contain"
                        />
                        Tips
                    </motion.span>
                )}
            </AnimatePresence>

            {showHoverChrome && (
                <KanbanCardHoverToolbar
                    visible={cardHovered || altDrawerOpen}
                    event={event}
                    dayNumber={resolvedDayNumber}
                    columnDate={resolvedColumnDate}
                    cityLabel={cityLabel}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewMap={onViewMap}
                    onKanbanSlotAssistant={onKanbanSlotAssistant}
                    onMenuOpenChange={setSlotOverflowMenuOpen}
                    onToggleAlternatives={showAlternativesButton ? handleToggleAlternatives : undefined}
                />
            )}

            {/* Suggested Alternatives inline drawer — desktop only, slides in below the card */}
            {!isMobile && showAlternativesButton && (
                <SuggestedAlternativesDrawer
                    isOpen={altDrawerOpen}
                    onClose={() => setAltDrawerOpen(false)}
                    alternatives={altSlots}
                    currentTitle={event.title || 'this slot'}
                    onSwap={handleSwapAlternative}
                    isLoading={altLoading}
                />
            )}

            {/* Mobile ⋯ options menu */}
            {isMobile && (
                <MobileSlotOptionsMenu
                    isOpen={Boolean(mobileMenuAnchor)}
                    onClose={() => setMobileMenuAnchor(null)}
                    anchorRect={mobileMenuAnchor}
                    aiTellLabel={type === 'transport' || isTransportKind(kind) ? 'Tell me about this route' : 'Tell me about this spot'}
                    aiAlternativesLabel={type === 'transport' || isTransportKind(kind) ? 'Suggest alternative routes' : 'Suggest alternatives'}
                    onViewDetails={
                        onMobileSlotTap
                            ? () => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_VIEW_DETAILS_CLICK,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: { day_index: event.dayIndex, slot_kind: kind }
                                  })
                                  onMobileSlotTap(event)
                              }
                            : undefined
                    }
                    onEditSlot={
                        canEdit && onEdit
                            ? () => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_EDIT_CLICK,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: { day_index: event.dayIndex, slot_kind: kind }
                                  })
                                  onEdit(kanbanSlotEditPayload(event))
                              }
                            : undefined
                    }
                    onDeleteSlot={
                        canEdit && onDelete
                            ? () => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_DELETE_CLICK,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: { day_index: event.dayIndex, slot_kind: kind }
                                  })
                                  onDelete(event)
                              }
                            : undefined
                    }
                    showAiOptions={Boolean(onKanbanSlotAssistant)}
                    onAskTellMeAboutSpot={
                        onKanbanSlotAssistant
                            ? () => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_AI_TELL_CLICK,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: { day_index: event.dayIndex, slot_kind: kind }
                                  })
                                  onKanbanSlotAssistant({
                                      dayIndex: event.dayIndex,
                                      dayNumber: resolvedDayNumber,
                                      date: resolvedColumnDate,
                                      cityLabel,
                                      event,
                                      intent: 'detail'
                                  })
                              }
                            : undefined
                    }
                    onAskSuggestAlternatives={
                        onKanbanSlotAssistant
                            ? () => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_AI_ALTERNATIVES_CLICK,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: { day_index: event.dayIndex, slot_kind: kind }
                                  })
                                  onKanbanSlotAssistant({
                                      dayIndex: event.dayIndex,
                                      dayNumber: resolvedDayNumber,
                                      date: resolvedColumnDate,
                                      cityLabel,
                                      event,
                                      intent: 'alternate'
                                  })
                              }
                            : undefined
                    }
                    onAskCustom={
                        onKanbanSlotAssistant
                            ? (text: string) => {
                                  trackButtonClickCustom({
                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                      buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_MENU_AI_CUSTOM_SUBMIT,
                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                      extra: {
                                          day_index: event.dayIndex,
                                          slot_kind: kind,
                                          query_length: text.length
                                      }
                                  })
                                  onKanbanSlotAssistant({
                                      dayIndex: event.dayIndex,
                                      dayNumber: resolvedDayNumber,
                                      date: resolvedColumnDate,
                                      cityLabel,
                                      event,
                                      intent: 'custom',
                                      customMessage: text
                                  })
                              }
                            : undefined
                    }
                />
            )}
        </div>
    )
}

/** Matches the per-day “Add” control at the bottom of columns that already have cards */
const KANBAN_ADD_SLOT_BUTTON_CLASS =
    'flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary-default bg-white py-2.5 text-primary-default font-semibold font-manrope transition-all hover:bg-primary-default-08'

// ─────────────────────────────── Empty Day State ───────────────────────────────
const EmptyDayState = ({ canEdit, onAdd, onFindThings }: { canEdit: boolean; onAdd: () => void; onFindThings?: () => void }) => {
    return (
        <div
            className="flex flex-col items-center rounded-2xl px-4 py-8"
            role="region"
            aria-label="Empty day">
            <div className="flex w-full flex-col items-center gap-5">
                <SafeImage
                    src={BEACH_TREE}
                    alt=""
                    width={68}
                    height={68}
                    radius={20}
                    className="object-contain"
                />
                <div className="text-center">
                    <Typography
                        size="14"
                        weight="semibold"
                        family="manrope"
                        color="grey-0"
                        textAlign="center"
                        className="block w-full">
                        Nothing planned today
                    </Typography>
                    <Typography
                        size="12"
                        weight="medium"
                        family="manrope"
                        color="grey-3"
                        textAlign="center"
                        className="mt-2 block max-w-[232px] leading-relaxed">
                        Feel free to rest and relax, or checkout some activities we think you&apos;d love.
                    </Typography>
                </div>
                {canEdit && (
                    <div className="flex flex-col items-stretch gap-4">
                        {onFindThings && (
                            <>
                                <button
                                    type="button"
                                    onClick={onFindThings}
                                    className="flex items-center cursor-pointer justify-center gap-1.5 rounded-full border border-primary-default bg-white px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,box-shadow,transform] hover:bg-primary-default-08 hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)] active:scale-[0.99]">
                                    <Sparkles
                                        size={15}
                                        className="shrink-0 text-primary-default"
                                        strokeWidth={2}
                                    />
                                    <Typography
                                        size="12"
                                        weight="semibold"
                                        family="manrope"
                                        color="black">
                                        Find things to do
                                    </Typography>
                                </button>
                                <OrDivider className="gap-2.5 px-0.5" />
                            </>
                        )}
                        <div className="w-full">
                            <button
                                type="button"
                                onClick={onAdd}
                                className={KANBAN_ADD_SLOT_BUTTON_CLASS}>
                                <Plus
                                    size={16}
                                    className="shrink-0 text-primary-default"
                                    strokeWidth={2.5}
                                />
                                <Typography
                                    size="13"
                                    weight="semibold"
                                    family="manrope"
                                    color="primary-default">
                                    Add
                                </Typography>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/** Skeleton for column body during day reorder save (matches board card chrome). */
function KanbanDayColumnBodySkeleton() {
    return (
        <div
            className="flex min-h-[200px] flex-1 flex-col gap-6 overflow-hidden px-3 pb-5 pt-6"
            role="status"
            aria-live="polite"
            aria-label="Updating itinerary days">
            <div className="flex items-center gap-2 text-grey-2">
                <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-primary-default"
                    aria-hidden
                />
                <span className="font-manrope text-[12px] font-semibold leading-tight">Updating days…</span>
            </div>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="flex flex-col gap-2.5 rounded-xl border border-grey-4/80 bg-white/70 px-3.5 py-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
                    <div className="h-3.5 w-[42%] rounded-full bg-grey-4/70 animate-pulse" />
                    <div className="h-3 w-full rounded-full bg-grey-4/45 animate-pulse" />
                    <div className="h-3 w-[78%] rounded-full bg-grey-4/35 animate-pulse" />
                </div>
            ))}
        </div>
    )
}

// Fallback column width (used until container is measured)
const DEFAULT_COL_WIDTH = 260
// Number of visible columns (4.25 shows a peek of the next column)
const VISIBLE_COLUMNS = 4.25
function arrayMoveDayOrderCheck(arr: number[], from: number, to: number): number[] {
    const n = arr.length
    if (n < 2 || from < 0 || to < 0 || from >= n || to > n) return [...arr]
    if (from === to) return [...arr]
    const next = [...arr]
    const [r] = next.splice(from, 1)
    next.splice(to, 0, r)
    return next
}

/** True if moving `from` → `to` actually changes day order */
function dayReorderWouldChangeOrder(from: number, to: number, n: number): boolean {
    if (n < 2 || from === to) return false
    const base = Array.from({ length: n }, (_, i) => i)
    const next = arrayMoveDayOrderCheck(base, from, to)
    return next.some((v, i) => v !== base[i])
}

// ═══════════════════════════════ Main Component ═══════════════════════════════
const DesktopKanbanView = ({
    days,
    stays,
    sleepCityByDate,
    sleepCityLoading,
    onStayAction,
    onAddStay,
    events,
    startDate: _startDate,
    columns: _columns,
    tripStartDate: _tripStartDate,
    onEditEvent,
    onDeleteEvent,
    canEdit,
    isViewer,
    shortlistedExperienceIds,
    onDateCardClick,
    onAddSlot,
    onMapClick,
    onViewMap,
    changedSlotBadges,
    pendingPlacement,
    onPendingPlacementChange,
    onPlacementCommit,
    onOpenCustomPlacementTime,
    hidePlacementTimeUi = false,
    placementSavingSlotId = null,
    hideExactDates = false,
    onKanbanDayAssistant,
    onKanbanDayMenuAction,
    onKanbanDayReorder,
    dayColumnsReorderBusyIndices = null,
    onKanbanSlotAssistant,
    leftInset = 0
}: DesktopKanbanViewProps) => {
    const { trackButtonClickCustom } = usePostHog()
    const reduceMotion = useReducedMotion()
    // Stagger the day columns' fade-in only on the FIRST render (the skeleton→board
    // transition), so the days appear one-by-one on load. After that this flips true,
    // so adding/editing a single day later doesn't sit behind a long stagger delay.
    const hasStaggeredInRef = useRef(false)
    useEffect(() => {
        hasStaggeredInRef.current = true
    }, [])
    const dayReorderSaveInProgress = dayColumnsReorderBusyIndices !== null
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [colWidth, setColWidth] = useState(DEFAULT_COL_WIDTH)

    // Map ``stay_id`` → stay for fast lookup.
    const stayById = useMemo(() => {
        const map = new Map<string, ItineraryStay>()
        for (const stay of stays || []) {
            if (stay?.stay_id) map.set(String(stay.stay_id), stay)
        }
        return map
    }, [stays])

    // Derive day-to-stay mapping from stays + days (no dependency on
    // day.stay_id — stays are the sole source of truth).
    const dayStayMap = useMemo(() => deriveDayStayMap(days || [], stays || []), [days, stays])

    // ── Drag & Drop state ──────────────────────────────────────────────────────
    const [draggingEvent, setDraggingEvent] = useState<any>(null)
    const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null)
    // Insertion target: insertIndex = position to insert BEFORE (list without moved for cross-day)
    const [insertionTarget, setInsertionTarget] = useState<{ dayIndex: number; insertIndex: number } | null>(null)

    const [draggingDaySourceIndex, setDraggingDaySourceIndex] = useState<number | null>(null)
    /** Final array index where the dragged day will land (0 … days.length); drives the blue insert gap */
    const [dayReorderTargetIndex, setDayReorderTargetIndex] = useState<number | null>(null)

    const isAnyDragActive = draggingEvent != null || draggingDaySourceIndex != null
    const placementTimePickerOpen = Boolean(pendingPlacement && !hidePlacementTimeUi)
    const [desktopSlotDetailEvent, setDesktopSlotDetailEvent] = useState<any | null>(null)
    const [boardSneakPeekEvent, setBoardSneakPeekEvent] = useState<any | null>(null)
    const boardSneakPeekExperienceId = boardSneakPeekEvent?.slotData?.id || boardSneakPeekEvent?.slot_data?.id

    const draggingEventRef = useRef<any>(null)
    const insertionTargetRef = useRef<{ dayIndex: number; insertIndex: number } | null>(null)
    const dropHandledRef = useRef(false)

    const draggingDayIndexRef = useRef<number | null>(null)
    const dayDropHandledRef = useRef(false)
    const dayReorderTargetIndexRef = useRef<number | null>(null)
    const dayDragGhostElRef = useRef<HTMLDivElement | null>(null)

    const resetDragState = useCallback(() => {
        setDraggingEvent(null)
        setDragOverDayIndex(null)
        setInsertionTarget(null)
        draggingEventRef.current = null
        insertionTargetRef.current = null
    }, [])

    const resetDayDragState = useCallback(() => {
        setDraggingDaySourceIndex(null)
        setDayReorderTargetIndex(null)
        draggingDayIndexRef.current = null
        dayReorderTargetIndexRef.current = null
        const ghost = dayDragGhostElRef.current
        if (ghost?.parentNode) {
            ghost.parentNode.removeChild(ghost)
        }
        dayDragGhostElRef.current = null
    }, [])

    const autoScrollKanbanHorizontal = useCallback((e: React.DragEvent) => {
        const sc = scrollContainerRef.current
        if (!sc) return
        const r = sc.getBoundingClientRect()
        const pad = 72
        if (e.clientX < r.left + pad) sc.scrollLeft -= 28
        else if (e.clientX > r.right - pad) sc.scrollLeft += 28
    }, [])

    const updateDayReorderTargetFromPointer = useCallback(
        (e: React.DragEvent, dayIndex: number, columnRect: DOMRect) => {
            if (draggingDayIndexRef.current === null) return
            const w = columnRect.width
            const edge = Math.min(28, w * 0.22)
            let t: number
            if (e.clientX < columnRect.left + edge) {
                t = dayIndex
            } else if (e.clientX > columnRect.right - edge) {
                t = dayIndex + 1
            } else {
                const mid = columnRect.left + w / 2
                t = e.clientX < mid ? dayIndex : dayIndex + 1
            }
            t = Math.max(0, Math.min(t, days.length))
            if (dayReorderTargetIndexRef.current !== t) {
                dayReorderTargetIndexRef.current = t
                setDayReorderTargetIndex(t)
            }
        },
        [days.length]
    )

    const setInsertionTargetBoth = useCallback((val: { dayIndex: number; insertIndex: number } | null) => {
        const prev = insertionTargetRef.current
        if (val === null && prev === null) return
        if (val !== null && prev !== null && prev.dayIndex === val.dayIndex && prev.insertIndex === val.insertIndex) {
            return
        }
        insertionTargetRef.current = val
        setInsertionTarget(val)
    }, [])

    /** Same-day insert index from pointer Y — works during HTML5 drag (unlike elementFromPoint). */
    /**
     * Insert index = gap before slot `i`. Uses full slot row geometry (not only the inner drag handle)
     * and a biased threshold so moving up/down doesn’t require hovering the vertical center of tall cards.
     */
    const insertIndexFromListClientY = (listEl: HTMLElement, clientY: number, listLength: number) => {
        if (listLength <= 0) return 0

        const BEFORE_FR = 0.36
        let rows = Array.from(listEl.querySelectorAll<HTMLElement>('[data-kanban-slot-row]')).sort(
            (a, b) => Number(a.getAttribute('data-kanban-slot-row') ?? 0) - Number(b.getAttribute('data-kanban-slot-row') ?? 0)
        )

        if (rows.length !== listLength) {
            rows = Array.from(listEl.querySelectorAll<HTMLElement>('[data-kanban-slot-index]')).sort(
                (a, b) => Number(a.getAttribute('data-kanban-slot-index') ?? 0) - Number(b.getAttribute('data-kanban-slot-index') ?? 0)
            )
        }

        if (rows.length === 0) return listLength

        const firstR = rows[0].getBoundingClientRect()
        if (clientY < firstR.top) return 0

        for (let i = 0; i < rows.length; i++) {
            const rect = rows[i].getBoundingClientRect()
            const h = Math.max(rect.height, 1)
            if (clientY < rect.top + h * BEFORE_FR) return i
        }
        return listLength
    }

    // Reset after drag ends only when drop did not complete (cancel / drop outside).
    useEffect(() => {
        const onDragEnd = () => {
            window.setTimeout(() => {
                if (dropHandledRef.current) {
                    dropHandledRef.current = false
                    return
                }
                if (dayDropHandledRef.current) {
                    dayDropHandledRef.current = false
                    resetDayDragState()
                    return
                }
                if (draggingEventRef.current) resetDragState()
                if (draggingDayIndexRef.current) resetDayDragState()
            }, 0)
        }
        window.addEventListener('dragend', onDragEnd)
        return () => window.removeEventListener('dragend', onDragEnd)
    }, [resetDragState, resetDayDragState])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !pendingPlacement) return
            onPendingPlacementChange(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pendingPlacement, onPendingPlacementChange])

    // Column width from viewport so ~4.25 columns are visible; row width follows content (w-max)
    useLayoutEffect(() => {
        const el = scrollContainerRef.current
        if (!el) return

        const measure = () => {
            const w = el.clientWidth
            if (w > 0) {
                setColWidth(Math.max(200, Math.floor(w / VISIBLE_COLUMNS)))
            }
        }
        measure()

        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useLayoutEffect(() => {
        if (!pendingPlacement || hidePlacementTimeUi) return
        let innerRaf = 0
        const outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                scrollKanbanPendingPlacementIntoView(scrollContainerRef.current)
            })
        })
        return () => {
            cancelAnimationFrame(outerRaf)
            cancelAnimationFrame(innerRaf)
        }
    }, [pendingPlacement?.event?.slot_id, pendingPlacement?.targetDayIndex, hidePlacementTimeUi])

    // Show ALL days from the itinerary for horizontal scroll
    const allDays = useMemo(() => {
        return days.map((dayData: any, index: number) => {
            const date = new Date(dayData.date)
            const dayNumber = index + 1
            return { date, dayData, dayIndex: index, dayNumber }
        })
    }, [days])

    const finalizeDropAsPending = useCallback(
        (dayIndex: number, dayDate: Date, sortedForHit: any[]) => {
            const ev = draggingEventRef.current
            if (!ev?.slot_id || pendingPlacement) return

            dropHandledRef.current = true

            if (kanbanDropIsNoOpSamePosition(ev, dayIndex, sortedForHit, events, insertionTargetRef.current)) {
                resetDragState()
                return
            }

            let insertIndex = insertionTargetRef.current?.dayIndex === dayIndex ? insertionTargetRef.current.insertIndex : sortedForHit.length

            if (ev.dayIndex === dayIndex) {
                const cur = sortedForHit.findIndex((x) => x.slot_id === ev.slot_id)
                if (cur !== -1) {
                    insertIndex = cur < insertIndex ? insertIndex - 1 : insertIndex
                }
            }

            const listWithout = sortedVisibleForDay(events, dayIndex).filter((x) => x.slot_id !== ev.slot_id)
            insertIndex = Math.max(0, Math.min(insertIndex, listWithout.length))

            const durationMs = getEventDurationMs(ev)
            const anchorUtcMs = computePlacementAnchorUtcMs(dayDate, insertIndex, listWithout, durationMs)

            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_SLOT_DRAG_DROP_PENDING,
                buttonAction: POSTHOG_ACTIONS.DRAG_DROP,
                extra: {
                    source_day_index: ev.dayIndex,
                    target_day_index: dayIndex,
                    insert_index: insertIndex,
                    slot_id: ev.slot_id,
                    surface: 'kanban_desktop'
                }
            })

            onPendingPlacementChange({
                event: ev,
                sourceDayIndex: ev.dayIndex,
                targetDayIndex: dayIndex,
                insertIndex,
                anchorUtcMs,
                durationMs
            })
            resetDragState()
        },
        [events, onPendingPlacementChange, pendingPlacement, resetDragState, trackButtonClickCustom]
    )

    const kanbanListDragOver = useCallback(
        (e: React.DragEvent, dayIndex: number, sortedForHit: any[]) => {
            if (draggingDayIndexRef.current !== null) return
            if (!draggingEventRef.current || pendingPlacement) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (dragOverDayIndex !== dayIndex) setDragOverDayIndex(dayIndex)

            const sc = scrollContainerRef.current
            if (sc) {
                const r = sc.getBoundingClientRect()
                const pad = 72
                if (e.clientX < r.left + pad) sc.scrollLeft -= 28
                else if (e.clientX > r.right - pad) sc.scrollLeft += 28
            }

            const listEl = e.currentTarget
            if (!(listEl instanceof HTMLElement)) return

            const lr = listEl.getBoundingClientRect()
            const vPad = 64
            const vStep = 22
            if (e.clientY < lr.top + vPad) listEl.scrollTop -= vStep
            else if (e.clientY > lr.bottom - vPad) listEl.scrollTop += vStep

            const insertIndex = insertIndexFromListClientY(listEl, e.clientY, sortedForHit.length)
            setInsertionTargetBoth({ dayIndex, insertIndex })
        },
        [dragOverDayIndex, pendingPlacement, setInsertionTargetBoth]
    )

    const fromIdx = draggingDaySourceIndex
    const tIdx = dayReorderTargetIndex
    const nDays = days.length
    const reorderWould = fromIdx !== null && tIdx !== null && dayReorderWouldChangeOrder(fromIdx, tIdx, nDays)

    const dayDropMarkerTopFor = (i: number) => Boolean(reorderWould && tIdx === i && i !== fromIdx)
    const dayDropMarkerBottomFor = (i: number) => Boolean(reorderWould && tIdx === nDays && i === nDays - 1)

    return (
        <>
            <div
                ref={scrollContainerRef}
                className="flex-1 h-full overflow-x-auto bg-white"
                id="kanban-scroll-container"
                style={{ scrollbarWidth: 'none' }}>
                <LayoutGroup id="itinerary-kanban-board">
                    <div
                        className="relative flex h-full w-max min-w-0 items-stretch"
                        style={leftInset ? { paddingLeft: leftInset } : undefined}>
                        {allDays.map(({ date, dayData, dayIndex, dayNumber }, idx) => {
                            const dayCity = dayData?.base_city || dayData?.destination_city
                            const cityListItem: CityListItem | null = dayCity ? { id: dayCity.id, name: dayCity.name } : null

                            const prevDayData = idx > 0 ? allDays[idx - 1]?.dayData : null
                            const prevCity = prevDayData?.base_city?.name || prevDayData?.destination_city?.name || null
                            const currentCityName = dayCity?.name || null
                            const routeFrom = prevCity && prevCity !== currentCityName ? prevCity : null
                            // Route summary's "where the traveller is sleeping"
                            // for this day. Null on overnight-transit days;
                            // falls back to prev→current heuristic below.
                            const dayDateKey = dayData?.date ? String(dayData.date).slice(0, 10) : null
                            const sleepCity = dayDateKey ? sleepCityByDate?.[dayDateKey] || null : null

                            // Per-day stay resolution. The stay map holds the
                            // raw ``stay_id`` reference; run it through
                            // ``stayById`` here so stale references (stay was
                            // deleted but the day still points at it) collapse
                            // to null and the column correctly renders the
                            // "+ Add stay" pill instead of a broken hotel chip.
                            const rawStayId = dayStayMap.get(idx)
                            const dayMatchedStay = rawStayId ? (stayById.get(String(rawStayId)) ?? null) : null
                            const dayCityIdValue = dayData?.base_city?.id ? String(dayData.base_city.id) : null

                            const sortedEvents = mergePendingIntoSortedList(dayIndex, events, pendingPlacement)
                            const sortedForDragHit = mergePendingIntoSortedList(dayIndex, events, null)

                            const isCrossDayTarget = dragOverDayIndex === dayIndex && draggingEventRef.current?.dayIndex !== dayIndex
                            const activeDrag = draggingEventRef.current

                            const dayReorderEnabled = Boolean(
                                canEdit && !isViewer && !pendingPlacement && !dayReorderSaveInProgress && onKanbanDayReorder && allDays.length > 1
                            )
                            const isDayDragSource = draggingDaySourceIndex === dayIndex
                            const showDayReorderColumnOverlay =
                                dayColumnsReorderBusyIndices != null && dayColumnsReorderBusyIndices.includes(dayIndex)

                            const columnKey = getKanbanDayColumnKey(dayData)

                            return (
                                <motion.div
                                    key={columnKey}
                                    layout={!reduceMotion ? 'position' : false}
                                    initial={reduceMotion ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                        layout: { type: 'spring', stiffness: 520, damping: 38, mass: 0.85 },
                                        // Opacity-only entrance (no transform → no conflict with `layout`).
                                        // Staggered left→right on first load; instant for later mounts.
                                        opacity: { duration: 0.28, ease: 'easeOut', delay: hasStaggeredInRef.current ? 0 : idx * 0.06 }
                                    }}
                                    data-day-index={dayIndex}
                                    data-day-column="1"
                                    className={`shrink-0 flex flex-col overflow-hidden border-grey-4 transition-[background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] last:border-r-0 ${
                                        isCrossDayTarget ? 'bg-primary-default/5' : 'bg-natural-white'
                                    } ${isDayDragSource ? 'opacity-40' : ''}`}
                                    style={{ width: `${colWidth}px` }}
                                    onDragOver={(e) => {
                                        if (pendingPlacement) return
                                        if (draggingDayIndexRef.current !== null && dayReorderSaveInProgress) {
                                            e.preventDefault()
                                            e.dataTransfer.dropEffect = 'move'
                                            return
                                        }
                                        if (draggingDayIndexRef.current !== null) {
                                            e.preventDefault()
                                            e.dataTransfer.dropEffect = 'move'
                                            const colEl = e.currentTarget as HTMLElement
                                            updateDayReorderTargetFromPointer(e, dayIndex, colEl.getBoundingClientRect())
                                            autoScrollKanbanHorizontal(e)
                                            return
                                        }
                                        if (!draggingEventRef.current) return
                                        e.preventDefault()
                                        e.dataTransfer.dropEffect = 'move'
                                        if (dragOverDayIndex !== dayIndex) setDragOverDayIndex(dayIndex)
                                        const ev = draggingEventRef.current
                                        if (ev.dayIndex === dayIndex && !insertionTargetRef.current) {
                                            setInsertionTargetBoth({ dayIndex, insertIndex: sortedForDragHit.length })
                                        }
                                    }}
                                    onDragLeave={(e) => {
                                        const rel = e.relatedTarget as Node | null
                                        if (rel !== null && !e.currentTarget.contains(rel)) {
                                            setDragOverDayIndex(null)
                                        }
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        if (pendingPlacement) return
                                        if (draggingDayIndexRef.current !== null && dayReorderSaveInProgress) return
                                        if (draggingDayIndexRef.current !== null && onKanbanDayReorder) {
                                            const from = draggingDayIndexRef.current
                                            const to = dayReorderTargetIndexRef.current ?? from
                                            if (from !== to) {
                                                dayDropHandledRef.current = true
                                                trackButtonClickCustom({
                                                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_REORDER_DROP,
                                                    buttonAction: POSTHOG_ACTIONS.DRAG_DROP,
                                                    extra: { from_index: from, to_index: to, surface: 'kanban_desktop' }
                                                })
                                                void Promise.resolve(onKanbanDayReorder(from, to))
                                            }
                                            resetDayDragState()
                                            return
                                        }
                                        finalizeDropAsPending(dayIndex, date, sortedForDragHit)
                                    }}>
                                    <DayHeader
                                        date={date}
                                        dayNumber={dayNumber}
                                        dayIndex={dayIndex}
                                        dayData={dayData}
                                        isViewer={isViewer}
                                        canEdit={canEdit}
                                        routeFrom={routeFrom}
                                        sleepCity={sleepCity}
                                        sleepCityLoading={!!sleepCityLoading}
                                        hideExactDates={hideExactDates}
                                        isFirstDay={idx === 0}
                                        isLastDay={idx === allDays.length - 1}
                                        evenColumn={idx % 2 === 0}
                                        dayReorderEnabled={dayReorderEnabled}
                                        dayDropMarkerTop={dayDropMarkerTopFor(dayIndex)}
                                        dayDropMarkerBottom={dayDropMarkerBottomFor(dayIndex)}
                                        matchedStay={dayMatchedStay}
                                        stayCityId={dayCityIdValue}
                                        stayDayDate={dayData?.date ? String(dayData.date).slice(0, 10) : null}
                                        onStayAction={onStayAction}
                                        onAddStay={onAddStay}
                                        onDayReorderDragStart={(ev) => {
                                            if (pendingPlacement || !onKanbanDayReorder) {
                                                ev.preventDefault()
                                                return
                                            }
                                            draggingDayIndexRef.current = dayIndex
                                            setDraggingDaySourceIndex(dayIndex)
                                            dayReorderTargetIndexRef.current = null
                                            setDayReorderTargetIndex(null)

                                            const src = ev.currentTarget as HTMLElement
                                            const rect = src.getBoundingClientRect()
                                            const ghost = src.cloneNode(true) as HTMLDivElement
                                            ghost.style.boxSizing = 'border-box'
                                            ghost.style.width = `${rect.width}px`
                                            ghost.style.opacity = '0.96'
                                            ghost.style.pointerEvents = 'none'
                                            ghost.style.borderRadius = '14px'
                                            ghost.style.boxShadow = '0 18px 44px rgba(15,23,42,0.2)'
                                            ghost.style.background = '#ffffff'
                                            ghost.style.overflow = 'hidden'
                                            document.body.appendChild(ghost)
                                            ghost.style.position = 'fixed'
                                            ghost.style.left = '-10000px'
                                            ghost.style.top = '0'
                                            ghost.style.zIndex = '100000'
                                            void ghost.offsetWidth
                                            const ox = Math.max(24, Math.min(ev.clientX - rect.left, rect.width - 24))
                                            const oy = Math.max(20, Math.min(ev.clientY - rect.top, rect.height - 20))
                                            ev.dataTransfer.setDragImage(ghost, ox, oy)
                                            dayDragGhostElRef.current = ghost

                                            ev.dataTransfer.effectAllowed = 'move'
                                            ev.dataTransfer.setData('text/plain', `rimigo-day:${dayIndex}`)
                                        }}
                                        onDayReorderDragEnd={() => {
                                            // Global dragend clears state when drop did not commit
                                        }}
                                        onOpenDayModal={() => {
                                            onDateCardClick(dayData, date, cityListItem, dayNumber)
                                        }}
                                        onMapClick={onMapClick ? () => onMapClick(dayIndex) : undefined}
                                        onKanbanDayAssistant={onKanbanDayAssistant}
                                        onKanbanDayMenuAction={onKanbanDayMenuAction}
                                    />

                                    <div
                                        // Column body background alternates by visible
                                        // position — even idx keeps the original grey-5,
                                        // odd idx steps to white. The contrast gives
                                        // the eye a clear column rhythm for long
                                        // itineraries without pulling visual weight
                                        // off the cards themselves.
                                        className={`relative flex min-h-[120px] flex-1 flex-col gap-6 overflow-y-auto border-t border-grey-4 ${idx % 2 === 0 ? 'bg-grey-5' : 'bg-white'} px-3 pb-5 pt-6 shadow-[inset_0_6px_20px_-8px_rgba(15,23,42,0.14),inset_0_2px_8px_-4px_rgba(15,23,42,0.08)] transition-[opacity] duration-300 ease-out [&::-webkit-scrollbar]:hidden`}
                                        style={{ scrollbarWidth: 'none' }}
                                        onDragOver={(e) => {
                                            if (showDayReorderColumnOverlay) return
                                            if (draggingDayIndexRef.current !== null) {
                                                e.preventDefault()
                                                e.dataTransfer.dropEffect = 'move'
                                                const col = (e.currentTarget as HTMLElement).closest('[data-day-column]')
                                                if (col instanceof HTMLElement) {
                                                    updateDayReorderTargetFromPointer(e, dayIndex, col.getBoundingClientRect())
                                                }
                                                autoScrollKanbanHorizontal(e)
                                                return
                                            }
                                            kanbanListDragOver(e, dayIndex, sortedForDragHit)
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (pendingPlacement || showDayReorderColumnOverlay) return
                                            if (draggingDayIndexRef.current !== null && onKanbanDayReorder) {
                                                const from = draggingDayIndexRef.current
                                                const to = dayReorderTargetIndexRef.current ?? from
                                                if (from !== to) {
                                                    dayDropHandledRef.current = true
                                                    trackButtonClickCustom({
                                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                        buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_DAY_REORDER_DROP,
                                                        buttonAction: POSTHOG_ACTIONS.DRAG_DROP,
                                                        extra: { from_index: from, to_index: to, surface: 'kanban_desktop' }
                                                    })
                                                    void Promise.resolve(onKanbanDayReorder(from, to))
                                                }
                                                resetDayDragState()
                                                return
                                            }
                                            finalizeDropAsPending(dayIndex, date, sortedForDragHit)
                                        }}>
                                        {showDayReorderColumnOverlay ? (
                                            <KanbanDayColumnBodySkeleton />
                                        ) : sortedEvents.length > 0 ? (
                                            sortedEvents.map((event, index) => {
                                                const showGapBefore =
                                                    activeDrag &&
                                                    insertionTarget?.dayIndex === dayIndex &&
                                                    insertionTarget.insertIndex === index &&
                                                    activeDrag.slot_id !== event.slot_id

                                                const showTimeStrip =
                                                    pendingPlacement &&
                                                    !hidePlacementTimeUi &&
                                                    pendingPlacement.event.slot_id === event.slot_id &&
                                                    pendingPlacement.targetDayIndex === dayIndex

                                                const placementUiBlocksOtherDrags = Boolean(pendingPlacement && !hidePlacementTimeUi)
                                                const isDimmedDuringPlacement = placementUiBlocksOtherDrags && !showTimeStrip

                                                const isKanbanDragSource =
                                                    !!draggingEvent && (draggingEvent.slot_id || draggingEvent.id) === (event.slot_id || event.id)
                                                const slotPlacementSaving = placementSavingSlotId != null && placementSavingSlotId === event.slot_id

                                                return (
                                                    <motion.div
                                                        key={event.slot_id || event.id || `slot-${dayIndex}-${index}`}
                                                        layout={false}
                                                        transition={{
                                                            type: 'spring',
                                                            stiffness: 380,
                                                            damping: 30,
                                                            mass: 0.85
                                                        }}
                                                        data-kanban-slot-row={index}
                                                        {...(showTimeStrip ? { 'data-kanban-pending-slot': '' } : {})}
                                                        className={`flex flex-col gap-2 transition-[opacity,transform] duration-300 ease-out ${
                                                            showTimeStrip ? 'relative z-20' : ''
                                                        } ${isDimmedDuringPlacement ? 'scale-[0.985] opacity-[0.4]' : ''}`}>
                                                        {showGapBefore && (
                                                            <div className="min-h-[52px] rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07] transition-opacity duration-300" />
                                                        )}

                                                        <div
                                                            className={
                                                                showTimeStrip
                                                                    ? `overflow-hidden rounded-xl ${KANBAN_PLACEMENT_FOCUS_CLASS}`
                                                                    : 'contents'
                                                            }>
                                                            {showTimeStrip && (
                                                                <div
                                                                    className="flex items-center gap-2 rounded-t-xl border-b border-primary-default/25 bg-primary-default-12 px-3 py-2"
                                                                    role="status"
                                                                    aria-live="polite">
                                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-default/40 opacity-75" />
                                                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-default" />
                                                                    </span>
                                                                    <span className="font-manrope text-[12px] font-semibold leading-tight text-primary-default">
                                                                        Choose a start time below to finish moving this slot
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div
                                                                data-slot-index={event.order ?? index}
                                                                data-kanban-slot-index={index}
                                                                draggable={canEdit && !isViewer && !pendingPlacement}
                                                                onDragStart={(e) => {
                                                                    if (pendingPlacement) {
                                                                        e.preventDefault()
                                                                        return
                                                                    }
                                                                    draggingEventRef.current = event
                                                                    setDraggingEvent(event)
                                                                    setInsertionTargetBoth({ dayIndex, insertIndex: index })
                                                                    e.dataTransfer.effectAllowed = 'move'
                                                                    e.dataTransfer.setData('text/plain', event.slot_id || event.id || '')
                                                                    if (e.currentTarget instanceof HTMLElement) {
                                                                        e.dataTransfer.setDragImage(e.currentTarget, 20, 20)
                                                                    }
                                                                }}
                                                                className={`relative transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                                    canEdit && !isViewer && !pendingPlacement
                                                                        ? 'cursor-grab active:cursor-grabbing [&_button]:cursor-pointer [&_a]:cursor-pointer'
                                                                        : ''
                                                                }`}>
                                                                <div className="relative">
                                                                    {isKanbanDragSource ? (
                                                                        <>
                                                                            <div className="invisible pointer-events-none">
                                                                                <KanbanEventCard
                                                                                    event={event}
                                                                                    onEdit={onEditEvent ?? (() => {})}
                                                                                    onDelete={onDeleteEvent}
                                                                                    canEdit={canEdit}
                                                                                    isViewer={isViewer}
                                                                                    shortlistedExperienceIds={shortlistedExperienceIds}
                                                                                    onViewMap={onViewMap}
                                                                                    changedSlotBadges={changedSlotBadges}
                                                                                    attachTimeStripBelow={showTimeStrip}
                                                                                    suppressHoverPopup
                                                                                    placementSaving={slotPlacementSaving}
                                                                                    columnDate={date}
                                                                                    dayNumber={dayNumber}
                                                                                    cityLabel={dayCity?.name ?? ''}
                                                                                    onKanbanSlotAssistant={onKanbanSlotAssistant}
                                                                                    suppressHoverSuggestionsForPlacement={placementTimePickerOpen}
                                                                                    suppressHoverAiSuggestions={isAnyDragActive}
                                                                                    boardGrabCursor={canEdit && !isViewer && !pendingPlacement}
                                                                                    onDesktopSlotDetailOpen={setDesktopSlotDetailEvent}
                                                                                    onDesktopBoardSneakPeekOpen={setBoardSneakPeekEvent}
                                                                                />
                                                                            </div>
                                                                            <div
                                                                                className="pointer-events-none absolute inset-0 z-[1] rounded-xl border border-dashed border-grey-3 bg-grey-4/25"
                                                                                style={{ borderStyle: 'dashed' }}
                                                                                aria-hidden
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <KanbanEventCard
                                                                            event={event}
                                                                            onEdit={onEditEvent ?? (() => {})}
                                                                            onDelete={onDeleteEvent}
                                                                            canEdit={canEdit}
                                                                            isViewer={isViewer}
                                                                            shortlistedExperienceIds={shortlistedExperienceIds}
                                                                            onViewMap={onViewMap}
                                                                            changedSlotBadges={changedSlotBadges}
                                                                            attachTimeStripBelow={showTimeStrip}
                                                                            suppressHoverPopup={showTimeStrip || slotPlacementSaving}
                                                                            placementSaving={slotPlacementSaving}
                                                                            columnDate={date}
                                                                            dayNumber={dayNumber}
                                                                            cityLabel={dayCity?.name ?? ''}
                                                                            onKanbanSlotAssistant={onKanbanSlotAssistant}
                                                                            suppressHoverSuggestionsForPlacement={placementTimePickerOpen}
                                                                            suppressHoverAiSuggestions={isAnyDragActive}
                                                                            boardGrabCursor={canEdit && !isViewer && !pendingPlacement}
                                                                            onDesktopSlotDetailOpen={setDesktopSlotDetailEvent}
                                                                            onDesktopBoardSneakPeekOpen={setBoardSneakPeekEvent}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {showTimeStrip && (
                                                                    <ChooseStartTimeStrip
                                                                        key={`${pendingPlacement.event.slot_id}-time`}
                                                                        anchorUtcMs={pendingPlacement.anchorUtcMs}
                                                                        durationMs={pendingPlacement.durationMs}
                                                                        targetDayDate={date}
                                                                        analyticsSurface="kanban_desktop"
                                                                        onDismiss={() => onPendingPlacementChange(null)}
                                                                        onPick={(startUtcMs) => {
                                                                            const p = pendingPlacement
                                                                            if (!p) return
                                                                            const endMs = startUtcMs + p.durationMs
                                                                            void onPlacementCommit({
                                                                                event: p.event,
                                                                                sourceDayIndex: p.sourceDayIndex,
                                                                                targetDayIndex: p.targetDayIndex,
                                                                                insertIndex: p.insertIndex,
                                                                                newStartIso: new Date(startUtcMs).toISOString(),
                                                                                newEndIso: new Date(endMs).toISOString()
                                                                            })
                                                                        }}
                                                                        onCustom={() => {
                                                                            const p = pendingPlacement
                                                                            if (!p || !onOpenCustomPlacementTime) return
                                                                            const s = new Date(p.anchorUtcMs)
                                                                            const en = new Date(p.anchorUtcMs + p.durationMs)
                                                                            onOpenCustomPlacementTime({
                                                                                event: p.event,
                                                                                sourceDayIndex: p.sourceDayIndex,
                                                                                targetDayIndex: p.targetDayIndex,
                                                                                insertIndex: p.insertIndex,
                                                                                provisionalStart: s,
                                                                                provisionalEnd: en,
                                                                                baseCity: dayCity?.id
                                                                                    ? {
                                                                                          id: dayCity.id,
                                                                                          name: dayCity.name,
                                                                                          country: (dayCity as { country?: string }).country || ''
                                                                                      }
                                                                                    : undefined
                                                                            })
                                                                        }}
                                                                    />
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })
                                        ) : dayData ? (
                                            <div className="px-0.5">
                                                <EmptyDayState
                                                    canEdit={canEdit && !isViewer}
                                                    onAdd={() => {
                                                        trackButtonClickCustom({
                                                            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                            buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_EMPTY_DAY_ADD_CLICK,
                                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                                            extra: { day_index: dayIndex, day_number: dayNumber }
                                                        })
                                                        onAddSlot(dayData, date)
                                                    }}
                                                    onFindThings={
                                                        onKanbanDayAssistant
                                                            ? () => {
                                                                  trackButtonClickCustom({
                                                                      buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                                      buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_EMPTY_DAY_FIND_THINGS_CLICK,
                                                                      buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                      extra: { day_index: dayIndex, day_number: dayNumber }
                                                                  })
                                                                  onKanbanDayAssistant({
                                                                      dayIndex,
                                                                      dayNumber,
                                                                      date,
                                                                      cityLabel: dayCity?.name || '',
                                                                      intent: 'find_activities'
                                                                  })
                                                              }
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                        ) : null}

                                        {!showDayReorderColumnOverlay &&
                                            activeDrag &&
                                            insertionTarget?.dayIndex === dayIndex &&
                                            insertionTarget.insertIndex === sortedForDragHit.length &&
                                            sortedForDragHit.length > 0 && (
                                                <div className="min-h-[52px] rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07] transition-opacity duration-300" />
                                            )}

                                        {!showDayReorderColumnOverlay && canEdit && dayData && sortedEvents.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackButtonClickCustom({
                                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                        buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_ADD_SLOT_BOTTOM_CLICK,
                                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                                        extra: { day_index: dayIndex, day_number: dayNumber }
                                                    })
                                                    onAddSlot(dayData, date)
                                                }}
                                                className={KANBAN_ADD_SLOT_BUTTON_CLASS}>
                                                <Plus size={14} />
                                                <Typography
                                                    size="13"
                                                    weight="medium"
                                                    family="manrope">
                                                    Add
                                                </Typography>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </LayoutGroup>
            </div>
            <SlotDetailDesktopModal
                event={desktopSlotDetailEvent}
                isOpen={desktopSlotDetailEvent != null}
                onClose={() => setDesktopSlotDetailEvent(null)}
                onEdit={
                    onEditEvent
                        ? () => {
                              const evt = desktopSlotDetailEvent
                              if (!evt) return
                              setDesktopSlotDetailEvent(null)
                              onEditEvent(kanbanSlotEditPayload(evt))
                          }
                        : undefined
                }
            />
            {boardSneakPeekEvent &&
                boardSneakPeekExperienceId &&
                createPortal(
                    <SneakPeekModal
                        attachments={getSlotAttachmentsList(boardSneakPeekEvent) as any}
                        isOpen
                        onClose={() => setBoardSneakPeekEvent(null)}
                        experienceId={boardSneakPeekExperienceId}
                        displayName={
                            // Mirror the per-card display logic so the sneak peek
                            // title always matches the title shown on the card:
                            //   • Hero / Thumbnail / Custom cards  → event.title
                            //   • Meal / Restaurant cards          → slot_data.name || event.title
                            //   • Place cards                      → event.title (user-entered)
                            (() => {
                                const ev = boardSneakPeekEvent
                                const slotName = ev.slot_data?.name || ev.slotData?.name
                                const isMealLike = ev.kind === 'meal' || ev.kind === 'restaurant'
                                return isMealLike ? slotName || ev.title : ev.title || slotName
                            })()
                        }
                        onViewMap={onViewMap ? () => onViewMap(boardSneakPeekExperienceId, boardSneakPeekEvent.dayIndex) : undefined}
                        triggerType="itinerary_view_page"
                        slotNotes={boardSneakPeekEvent.notes?.trim() ? boardSneakPeekEvent.notes : undefined}
                        slotSuggestionReasons={
                            Array.isArray(boardSneakPeekEvent.suggestion_reasons) ? boardSneakPeekEvent.suggestion_reasons : undefined
                        }
                    />,
                    document.body
                )}
        </>
    )
}

export default DesktopKanbanView
