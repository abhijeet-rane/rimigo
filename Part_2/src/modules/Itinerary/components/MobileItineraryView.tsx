import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Typography from '@/components/shared/Typography'
import { formatDate } from '../utils/ItineraryUtils'
import { transformItineraryToEvents } from './RenderCalenderEventmobile'
import { isTransportKind } from '../constants/transportKinds'
import SafeImage from './SafeImage'
import { Car, Plane, Train, Bus, Ship, CarTaxiFront, MoreHorizontal, Route, BedDouble, ChevronLeft, ChevronRight, Heart, X, Map as MapIcon } from 'lucide-react'
import WishlistRowList from './wishlist/WishlistRowList'
import { ShortlistedExperiencesProvider } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import type { ItineraryStay } from '@/api/itineraryApi'
import { GenericMap, type MapMarker } from '@/components/shared/Map'
import { MAP_CONFIG } from '@/components/shared/Map/mapConfig'
import { StayChip } from './StayChip'
import { deriveDayStayMap } from '../utils/deriveStayMap'
import type { DayMapData, CitySegment } from '../hooks/useItineraryMapData'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeekModal'
import { SlotDetailBottomSheet } from './SlotDetailBottomSheet'
import { placePhotoProxyUrl } from '../utils/mealPlaceImage'
import type { KanbanPendingPlacement, KanbanPlacementCommitPayload, KanbanCustomTimeOpenArgs } from './kanbanPlacementUtils'
import {
    mergePendingIntoSortedList,
    sortedVisibleForDay,
    computePlacementAnchorUtcMs,
    getEventDurationMs,
    kanbanDropIsNoOpSamePosition,
    scrollKanbanPendingPlacementIntoView
} from './kanbanPlacementUtils'
import { ChooseStartTimeStrip } from './ChooseStartTimeStrip'
import { KanbanEventCard, kanbanSlotEditPayload } from './DesktopKanbanView'
import { CustomSlotDescription } from './CustomSlotDescription'
import { canonicalizeMode, displayTitle, isFlightTransport, parseTransportTitle } from '../utils/transportTitle'
import { FlightTransportCard } from './FlightTransportCard'
import { getFlightEnrichment } from './transportSlotRenderers'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { HERO_IMAGE_MAX_HEIGHT_PX, ITINERARY_BOARD_ALL_EXPERIENCE_HERO_IMAGES } from '../constants'

const MOBILE_LONG_PRESS_MS = 460
const MOBILE_LONG_PRESS_MOVE_CANCEL_PX = 14

const insertIndexFromTouchList = (listEl: HTMLElement, clientY: number, listLength: number) => {
    const nodes = listEl.querySelectorAll<HTMLElement>('[data-mobile-slot-index]')
    for (let i = 0; i < nodes.length; i++) {
        const rect = nodes[i].getBoundingClientRect()
        if (clientY < rect.top + rect.height / 2) return i
    }
    return listLength
}

const findTouchDropTarget = (
    scrollRoot: HTMLElement,
    clientX: number,
    clientY: number
): { dayIndex: number; insertIndex: number } | null => {
    const el = document.elementFromPoint(clientX, clientY)
    if (!el || !scrollRoot.contains(el)) return null
    const section = el.closest('.day-section') as HTMLElement | null
    if (!section) return null
    const dayIndex = Number(section.getAttribute('data-day-index'))
    if (Number.isNaN(dayIndex)) return null
    const listEl = section.querySelector('[data-mobile-day-list]') as HTMLElement | null
    if (!listEl) return null
    const n = listEl.querySelectorAll('[data-mobile-slot-index]').length
    const insertIndex = insertIndexFromTouchList(listEl, clientY, n)
    return { dayIndex, insertIndex }
}

type Slot = {
    kind: string
    title?: string
    start_time?: string | Date
    end_time?: string | Date
    [key: string]: any
}

type Day = {
    date: string
    /** Omitted or undefined when the API returns a day without a slots array yet */
    slots?: Slot[]
    [key: string]: any
}

type MobileItineraryViewProps = {
    days: Day[]
    /** Route-summary sleep city per day, keyed by ``YYYY-MM-DD``. When
     *  present, replaces the base-city label in the day header with
     *  "where the traveller is sleeping that night". Null on overnight-
     *  transit days; the header falls back to ``base_city.name`` then. */
    sleepCityByDate?: Record<string, string>
    /** True while the initial route-summary fetch is in flight. The
     *  day-section header renders a shimmer instead of the fallback
     *  base-city label. */
    sleepCityLoading?: boolean
    highlightedSlots: Set<string>
    // Map-related props (optional – gracefully degrade if not provided)
    getMarkersForDay?: (dayIndex: number) => MapMarker[]
    getDayRouteCoordinates?: (dayIndex: number) => [number, number][]
    dayMapData?: DayMapData[]
    primaryCityName?: string
    // Overview route props (optional — enables "Route" view on mobile map)
    cityMarkers?: MapMarker[]
    overviewRouteCoordinates?: [number, number][]
    citySegments?: CitySegment[]
    /** Notifies parent when user switches between list and map tab (e.g. to hide overlays on map) */
    onMobileTabChange?: (tab: 'list' | 'map') => void
    hideExactDates?: boolean
    /** Parent itinerary events (same as Kanban) — required for mobile reorder + time strip */
    events?: any[]
    canEdit?: boolean
    isViewer?: boolean
    pendingPlacement?: KanbanPendingPlacement | null
    onPendingPlacementChange?: (p: KanbanPendingPlacement | null) => void
    onPlacementCommit?: (payload: KanbanPlacementCommitPayload) => void | Promise<void>
    onOpenCustomPlacementTime?: (args: KanbanCustomTimeOpenArgs) => void
    hidePlacementTimeUi?: boolean
    placementSavingSlotId?: string | null
    onEditEvent?: (event: any) => void
    onDeleteEvent?: (event: any) => void
    shortlistedExperienceIds?: Set<string>
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    changedSlotBadges?: Set<string>
    /** 0-based — scroll list + day pills to this day (e.g. overview deep link); consumed via callback */
    scrollToDayIndexRequest?: number | null
    onScrollToDayRequestConsumed?: () => void
    /** Add activity to this day (opens parent add-slot flow) */
    onAddSlotForDay?: (dayIndex: number) => void
    /** Day-level column menu — same contract as the desktop kanban. */
    onKanbanDayMenuAction?: (
        action: 'add_day_before' | 'add_day_after' | 'clear_column' | 'delete_column',
        ctx: { dayIndex: number; dayNumber: number; date: Date }
    ) => void
    /** Itinerary-level stays. Drives the day-header hotel chip — a
     *  filled pill when the day has a stay, an "Add stay" affordance
     *  otherwise. Parity with the desktop kanban + map-sidebar views. */
    stays?: ItineraryStay[]
    /** Open the inline stay picker drawer for this city. */
    onAddStay?: (cityId: string) => void
    /** Row-level menu action on an existing stay (same contract the
     *  desktop views use). Only ``'change'`` is fired from this header. */
    onStayAction?: (
        action: 'remove' | 'change',
        stayId: string,
        cityId: string | null
    ) => void
    /** Mobile slot ⋯ menu AI options (Tell me about this spot / Suggest alternatives /
     *  Ask something else…) — fires the assistant when a slot's AI item is tapped. */
    onKanbanSlotAssistant?: (args: import('./DesktopKanbanView').KanbanSlotAssistantArgs) => void
    /** Mobile wishlist/shortlist — adds a heart+count pill before "Day 1" in
     *  the day-tab row; selecting it swaps the day list for the shortlist.
     *  The default landing tab stays Day 1 (this pill is never auto-selected). */
    wishlist?: {
        tripId: string
        countryId?: string | null
        cityIds?: string[]
        count: number
        isInItinerary?: (experienceId: string) => boolean
        onAddToItinerary?: (experienceId: string, experienceName: string, experienceImage?: string | null) => void
        onRowClick: (experienceId: string) => void
        onScheduleWithAI: () => void
        onSeeAllExplore: () => void
        onExploreActivities: () => void
    }
}

// ── Helpers ──
// Includes the abstract ``transport`` kind (what the concierge agent writes)
// alongside concrete transit kinds so every transport-like slot renders as
// the same pill visually.
// TRANSPORT_TYPES moved to src/modules/Itinerary/constants/transportKinds.ts

const TRANSPORT_PILL_STYLES: Record<string, { bg: string; text: string; icon: typeof Car }> = {
    flight: { bg: 'bg-red-50', text: 'text-red-600', icon: Plane },
    car: { bg: 'bg-teal-50', text: 'text-teal-700', icon: Car },
    transfer: { bg: 'bg-teal-50', text: 'text-teal-700', icon: Car },
    taxi: { bg: 'bg-teal-50', text: 'text-teal-700', icon: Car },
    private_transport: { bg: 'bg-teal-50', text: 'text-teal-700', icon: CarTaxiFront },
    train: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Train },
    bus: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Bus },
    shuttle: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Bus },
    boat: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: Ship },
    ferry: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: Ship }
}

const MEAL_IMAGE_MAP: Record<string, string[]> = {
    breakfast: ['https://media.rimigo.com/1765760238217_image-ct6TpZ91pix5oetpcsAiRNdWwloxva.png'],
    lunch: ['https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'],
    dinner: [
        'https://media.rimigo.com/1765795179203_image-7QufcMTGFHaF0gEiQwJ2Ki8ZVJekLL.png',
        'https://media.rimigo.com/1765795179901_image-HbCnYirZv0o05ffcBstUMZcPgOwlWQ.png'
    ]
}
const FALLBACK_MEAL_IMAGES = [
    'https://media.rimigo.com/1765760280370_image-lajTvnCG0rsoksTEwSYSZaFk9DdR4b.png',
    'https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'
]

const formatTimeUTC = (dateStr: string | Date | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const hours = d.getUTCHours()
    const minutes = d.getUTCMinutes()
    const period = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`
}

const getMealTypeFromTime = (start?: Date | string | null) => {
    if (!start) return null
    const d = new Date(start)
    const hour = d.getUTCHours()
    if (hour < 11) return 'breakfast'
    if (hour < 17) return 'lunch'
    return 'dinner'
}

/** Format a time range like "10:00am – 12:30pm" */
const formatTimeRange = (event: any) => {
    const startVal = event?.start_time || event?.start
    const endVal = event?.end_time || event?.end
    const s = formatTimeUTC(startVal)
    const e = formatTimeUTC(endVal)
    if (s && e && s !== e) return `${s} – ${e}`
    if (s) return s
    if (event?.duration_minutes) {
        const hrs = Math.floor(event.duration_minutes / 60)
        const mins = event.duration_minutes % 60
        if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
        if (hrs > 0) return `${hrs}h`
        if (mins > 0) return `${mins}m`
    }
    return ''
}

const getRandomFrom = (arr: string[], seed = 0) => arr[seed % arr.length]

// ── Mobile Transport Pill ──
const MobileTransportPill = ({ event }: { event: any }) => {
    const kind = event.kind || ''
    // Concrete kind (flight/train/...) maps directly. Abstract "transport"
    // kinds resolve via slot_data.mode through the canonicalizer so
    // "Shinkansen Nozomi 220" picks the train icon rather than defaulting
    // to car.
    const slotData = event.slotData || event.slot_data || {}

    // Dedicated flight design — same gate as the desktop kanban. Strict on
    // required fields so a partially-enriched flight falls through to the
    // generic mobile pill below rather than rendering a half-formed card.
    const flightEnrichment = getFlightEnrichment({
        ...event,
        slot_data: slotData,
        slotData,
    })
    // Case-insensitive mode check + accept `kind === 'transport'` slots
    // whose mode says flight (V2 generator sometimes leaves `kind`
    // generic, and slot_data.mode may arrive as "Flight" capitalised).
    // Title fallback covers slots persisted during the composite
    // migration where slot_data.mode was dropped.
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
        const cabin = slotData.flight_data?.best_offer?.cabin
            ?? slotData.flightData?.best_offer?.cabin
            ?? null
        return (
            <FlightTransportCard
                flight={flightEnrichment}
                cabin={cabin}
                fromCityName={slotData.from_city || slotData.fromCity || null}
                toCityName={slotData.to_city || slotData.toCity || null}
            />
        )
    }

    const rawMode: string | null =
        (typeof slotData.mode === 'string' && slotData.mode.trim()) || null
    const canonicalFromRaw = canonicalizeMode(rawMode)
    const canonicalFromTitle = parseTransportTitle(event.title)?.mode || null
    const resolvedMode =
        (kind && TRANSPORT_PILL_STYLES[kind] && kind !== 'transport' ? kind : null) ||
        (canonicalFromRaw && TRANSPORT_PILL_STYLES[canonicalFromRaw] ? canonicalFromRaw : null) ||
        (canonicalFromTitle && TRANSPORT_PILL_STYLES[canonicalFromTitle] ? canonicalFromTitle : null) ||
        'car'
    const style = TRANSPORT_PILL_STYLES[resolvedMode] || TRANSPORT_PILL_STYLES.car
    const Icon = style.icon
    const timeRange = formatTimeRange(event)

    return (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl ${style.bg} w-full`}>
            <Icon
                size={15}
                className={`${style.text} shrink-0`}
            />
            <div className="flex-1 min-w-0">
                <span className={`text-[13px] font-semibold font-manrope ${style.text} leading-tight block truncate`}>
                    {displayTitle(event.title) || 'Transport'}
                </span>
                {timeRange && <span className={`text-[11px] font-medium font-manrope ${style.text} opacity-60 block truncate`}>{timeRange}</span>}
            </div>
        </div>
    )
}

// ── Mobile Stay Pill ──
const MobileStayPill = ({ event }: { event: any }) => {
    const title = event.title || 'Stay'
    const timeStr = event.start ? `at ${formatTimeUTC(event.start)}` : ''
    const displayTitle = timeStr && !title.toLowerCase().includes('at ') ? `${title} ${timeStr}` : title

    return (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-orange-50 w-full">
            <BedDouble
                size={15}
                className="text-orange-600 shrink-0"
            />
            <span className="text-[13px] font-semibold font-manrope text-orange-600 leading-tight">{displayTitle}</span>
        </div>
    )
}

// ── Mobile Experience Hero Card ──
// const MobileExperienceCard = ({ event }: { event: any }) => {
//     const image = event.slotData?.display_props?.landscape_image || event.slot_data?.display_props?.landscape_image
//     const title = event.title || 'Experience'
//     const timeRange = formatTimeRange(event)

//     if (!image) {
//         return <MobileThumbnailCard event={event} />
//     }

//     return (
//         <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
//             <SafeImage src={image} alt={title} fill />
//             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
//             <div className="absolute bottom-0 left-0 right-0 p-3">
//                 <p className="text-white text-[14px] font-semibold font-manrope leading-[18px] line-clamp-2">
//                     {title}
//                 </p>
//                 {timeRange && (
//                     <p className="text-white/60 text-[11px] font-medium font-manrope mt-0.5">
//                         {timeRange}
//                     </p>
//                 )}
//             </div>
//         </div>
//     )
// }

// ── Mobile Thumbnail Card ──
const MobileThumbnailCard = ({
    event,
    expandImage = false,
    constrainImageHeight = false
}: {
    event: any
    expandImage?: boolean
    constrainImageHeight?: boolean
}) => {
    const title = event.title || 'Activity'
    const type = event.type || event.kind || ''
    const dayIndex = event.dayIndex ?? 0
    const timeRange = formatTimeRange(event)

    // Image priority — see DesktopKanbanView for the rationale; both views
    // share this priority chain to keep meal/place slots visually consistent.
    //   1. slot_data.photo_url (Places CDN URL, both meal + place)
    //   2. slot_data.display_props.landscape_image (V2 meal slots only)
    //   3. Themed meal placeholder (meal slots only)
    //   4. Generic fallback (meal slots only; places degrade to no image)
    let image = ''
    const isMealLike = type === 'restaurant' || event.kind === 'meal'
    const isPlace = event.kind === 'place'
    if (isMealLike || isPlace) {
        const slotData = event.slotData || event.slot_data || {}
        // Tier 0: on-demand photo proxy keyed on place_id (stable, never
        // expires). Legacy photo_url is only a fallback for pre-proxy slots.
        const placeId: string | undefined = slotData.place_id
        const proxyPhotoUrl: string | undefined = placeId ? placePhotoProxyUrl(placeId) : undefined
        const placesPhotoUrl: string | undefined = slotData.photo_url
        const displayImage: string | undefined = slotData.display_props?.landscape_image
        let themedPlaceholder = ''
        if (isMealLike) {
            const mealType = slotData.meal_type || getMealTypeFromTime(event.start)
            if (mealType && MEAL_IMAGE_MAP[mealType]) {
                themedPlaceholder = getRandomFrom(MEAL_IMAGE_MAP[mealType], dayIndex)
            }
        }
        const lastResort = isMealLike ? getRandomFrom(FALLBACK_MEAL_IMAGES, dayIndex) : ''
        image = proxyPhotoUrl || placesPhotoUrl || displayImage || themedPlaceholder || lastResort
    } else if (type === 'experience') {
        const slotData = event.slotData || event.slot_data || {}
        image = slotData.display_props?.landscape_image || ''
    } else if (type === 'stay') {
        image = 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'
    } else {
        const slotData = event.slotData || event.slot_data || {}
        image = slotData.display_props?.landscape_image || ''
    }

    if (expandImage && image) {
        return (
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div
                    className={`relative w-full ${constrainImageHeight ? '' : 'aspect-[16/10]'}`}
                    style={constrainImageHeight ? { height: HERO_IMAGE_MAX_HEIGHT_PX, maxHeight: HERO_IMAGE_MAX_HEIGHT_PX } : undefined}>
                    <SafeImage
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-[14px] font-semibold font-manrope text-white leading-[18px] line-clamp-2">{title}</p>
                        {timeRange && <p className="text-[11px] font-medium font-manrope text-white/80 mt-0.5">{timeRange}</p>}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 bg-white rounded-2xl p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            {image && (
                <SafeImage
                    src={image}
                    alt={title}
                    className="w-[52px] h-[52px] rounded-xl object-cover shrink-0"
                />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold font-manrope text-grey-0 leading-[18px] line-clamp-2">{title}</p>
                {timeRange && <p className="text-[11px] font-medium font-manrope text-grey-2 mt-0.5">{timeRange}</p>}
            </div>
        </div>
    )
}

// ── Mobile Custom Card ──
const MobileCustomCard = ({ event }: { event: any }) => {
    const title = event.title || 'Custom Event'
    const timeRange = formatTimeRange(event)
    // Traveler-picked mode icon + background from CustomSection.
    // Falls back to the default 🎯 on amber tile for legacy slots.
    const sd = event.slot_data || event.slotData || {}
    const iconUrl = typeof sd.icon_url === 'string' && sd.icon_url.trim() ? sd.icon_url : null
    const bgColor = typeof sd.bg_color === 'string' && sd.bg_color.trim() ? sd.bg_color : null
    const accent = bgColor && bgColor.length === 9 ? bgColor.slice(0, 7) : null
    const timeBound = sd.time_bound !== false
    const description = typeof sd.description === 'string' ? sd.description : ''

    return (
        <div
            className={`flex flex-col gap-2 rounded-2xl p-2.5 ${
                bgColor ? '' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            }`}
            style={
                bgColor
                    ? {
                          background: bgColor,
                          border: `1px solid ${accent || 'rgba(15,23,42,0.08)'}`,
                      }
                    : undefined
            }>
            <div className="flex items-center gap-3">
                <div
                    className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0 ${
                        bgColor ? 'bg-white/60' : 'bg-amber-50'
                    }`}>
                    {iconUrl ? (
                        <img src={iconUrl} alt="" className="h-8 w-8 object-contain" />
                    ) : (
                        <span className="text-2xl">🎯</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold font-manrope text-grey-0 leading-[18px] line-clamp-2">{title}</p>
                    {timeBound && timeRange && (
                        <p className="text-[11px] font-medium font-manrope text-grey-2 mt-0.5">{timeRange}</p>
                    )}
                </div>
            </div>
            {description ? <CustomSlotDescription description={description} /> : null}
        </div>
    )
}

// ── Mobile Event Card Router ──
export const MobileEventCard = ({ event }: { event: any }) => {
    const type = event.type as string
    const kind = event.kind as string

    // Transport → pill
    if (type === 'transport' || isTransportKind(kind)) {
        return <MobileTransportPill event={event} />
    }

    // Stay check-in/out → pill
    if (type === 'stay' || kind === 'stay') {
        const title = (event.title || '').toLowerCase()
        if (title.includes('check-in') || title.includes('check-out') || title.includes('checkin') || title.includes('checkout')) {
            return <MobileStayPill event={event} />
        }
        return <MobileThumbnailCard event={event} />
    }

    // Experience → hero image row when flag is on or suggestion_priority is 0/2; cap height when duration > 3h.
    if (type === 'experience') {
        const slotData = event.slotData || event.slot_data || {}
        const suggestionPriority = slotData.suggestion_priority ?? event.suggestion_priority ?? null
        const start = event.start ? new Date(event.start) : null
        const end = event.end ? new Date(event.end) : null
        const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
        const constrainImageHeight = durationMinutes > 180
        const expandImage =
            ITINERARY_BOARD_ALL_EXPERIENCE_HERO_IMAGES ||
            suggestionPriority === 0 ||
            suggestionPriority === 2
        return (
            <MobileThumbnailCard
                event={event}
                expandImage={expandImage}
                constrainImageHeight={constrainImageHeight}
            />
        )
    }

    // Meal/restaurant → thumbnail
    if (type === 'restaurant' || kind === 'meal') {
        return <MobileThumbnailCard event={event} />
    }

    // Custom → custom card
    if (type === 'custom' || kind === 'custom') {
        return <MobileCustomCard event={event} />
    }

    // Visit → thumbnail
    if (type === 'visit') {
        return <MobileThumbnailCard event={event} />
    }

    return <MobileThumbnailCard event={event} />
}

// ═══════════════════════════════ Main Component ═══════════════════════════════
export const MobileItineraryView = ({
    days,
    sleepCityByDate,
    sleepCityLoading = false,
    highlightedSlots,
    getMarkersForDay,
    getDayRouteCoordinates,
    dayMapData,
    primaryCityName,
    cityMarkers,
    overviewRouteCoordinates,
    citySegments: _citySegments,
    onMobileTabChange,
    hideExactDates = false,
    events: eventsProp,
    canEdit = false,
    isViewer = false,
    pendingPlacement = null,
    onPendingPlacementChange,
    onPlacementCommit,
    onOpenCustomPlacementTime,
    hidePlacementTimeUi = false,
    placementSavingSlotId = null,
    onEditEvent,
    onDeleteEvent,
    shortlistedExperienceIds,
    onViewMap,
    changedSlotBadges,
    scrollToDayIndexRequest = null,
    onScrollToDayRequestConsumed,
    stays,
    onAddStay,
    onStayAction,
    onKanbanSlotAssistant,
    onKanbanDayMenuAction,
    wishlist
}: MobileItineraryViewProps) => {
    const { trackButtonClickCustom } = usePostHog()
    const [dayMenuState, setDayMenuState] = useState<{ dayIndex: number; dayNumber: number; date: Date } | null>(null)
    const [selectedDayIndex, setSelectedDayIndex] = useState(0)
    // Mobile list mode: 'days' (default — lands on Day 1) or 'shortlist' (the
    // heart pill before Day 1). Switching to a day pill always returns to days.
    const [mobileListMode, setMobileListMode] = useState<'days' | 'shortlist'>('days')
    const [localEvents, setLocalEvents] = useState<any[]>([])
    const events = eventsProp ?? localEvents
    const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'map'>('list')
    // Slide the cards up on first load only. Stays true through the initial stagger
    // window, then off — so later day-switches/edits don't re-animate.
    const [animateCardsIn, setAnimateCardsIn] = useState(true)
    useEffect(() => {
        const t = window.setTimeout(() => setAnimateCardsIn(false), 900)
        return () => window.clearTimeout(t)
    }, [])

    type TouchDragState = {
        event: any
        sourceDayIndex: number
        clientX: number
        clientY: number
        cardWidth: number
        cardHeight: number
    }
    const [touchDrag, setTouchDrag] = useState<TouchDragState | null>(null)
    const [touchDropTarget, setTouchDropTarget] = useState<{ dayIndex: number; insertIndex: number } | null>(null)
    const longPressTimerRef = useRef<number | null>(null)
    const longPressStartRef = useRef<{ x: number; y: number; event: any; dayIndex: number; el: HTMLElement } | null>(null)
    const touchDragRef = useRef<TouchDragState | null>(null)
    const touchDropTargetRef = useRef<{ dayIndex: number; insertIndex: number } | null>(null)
    const eventsRef = useRef(events)
    const daysRef = useRef(days)
    const lastTouchDragEndedAt = useRef(0)
    const scrollSpyRaf = useRef<number | null>(null)

    eventsRef.current = events
    daysRef.current = days
    touchDragRef.current = touchDrag
    touchDropTargetRef.current = touchDropTarget

    const shortlisted = shortlistedExperienceIds ?? new Set<string>()

    const latestOnPendingPlacementChangeRef = useRef(onPendingPlacementChange)
    latestOnPendingPlacementChangeRef.current = onPendingPlacementChange
    const latestPendingPlacementRef = useRef(pendingPlacement)
    latestPendingPlacementRef.current = pendingPlacement

    const placementEnabled =
        canEdit &&
        !isViewer &&
        !!onPendingPlacementChange &&
        !!onPlacementCommit &&
        !!onEditEvent &&
        !!onDeleteEvent

    useEffect(() => {
        onMobileTabChange?.(mobileActiveTab)
    }, [mobileActiveTab, onMobileTabChange])
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [sneakPeekSlotData, setSneakPeekSlotData] = useState<{ notes?: string; suggestion_reasons?: string[]; attachments?: any[]; displayName?: string } | null>(null)
    const [bottomSheetEvent, setBottomSheetEvent] = useState<any | null>(null)
    const [isOverviewMode, setIsOverviewMode] = useState(false)
    const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null)

    // Can show overview route if we have city markers with >1 city
    const hasRouteOverview = (cityMarkers?.length ?? 0) >= 2 && (overviewRouteCoordinates?.length ?? 0) >= 2
    const eventsScrollRef = useRef<HTMLDivElement | null>(null)
    const dateScrollRef = useRef<HTMLDivElement | null>(null)
    const isScrollingProgrammatically = useRef(false)
    const scrollTimeout = useRef<number | null>(null)
    const OFFSET = 40

    const handleCardClick = useCallback(
        (event: any) => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SLOT_CARD_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                slot_type: event?.type ?? event?.kind ?? null,
                day_index: typeof event?.dayIndex === 'number' ? event.dayIndex : null
            }
        })
        const experienceId = event.slotData?.id || event.slot_data?.id
        const isExperienceOrVisit =
            Boolean(experienceId) && (event.type === 'experience' || event.type === 'visit')

        const hasNotes = typeof event.notes === 'string' && event.notes.trim().length > 0
        const hasSuggestions =
            Array.isArray(event.suggestion_reasons) &&
            event.suggestion_reasons.some((s: unknown) => typeof s === 'string' && s.trim().length > 0)
        const hasAttachments = Array.isArray(event.attachments) && event.attachments.length > 0
        const hasBooking =
            event.booking_info &&
            typeof event.booking_info === 'object' &&
            Object.keys(event.booking_info).length > 0

        const suggestionReasonsForModal = Array.isArray(event.suggestion_reasons)
            ? event.suggestion_reasons.filter((s: unknown): s is string => typeof s === 'string' && Boolean(s.trim()))
            : undefined

        // Experiences / visits: always open SneakPeek (notes + AI suggestions + attachments) like before.
        if (isExperienceOrVisit) {
            setSneakPeekExperienceId(experienceId as string)
            setSneakPeekSlotData({
                notes: event.notes,
                suggestion_reasons: suggestionReasonsForModal,
                attachments: event.attachments || [],
                // Carry the card-facing title in so the sneak peek title matches.
                displayName: event.title || event.slot_data?.name || event.slotData?.name
            })
            return
        }

        // Other slot types: bottom sheet when there is extra context to show.
        if (hasNotes || hasSuggestions || hasAttachments || hasBooking) {
            setBottomSheetEvent(event)
            return
        }

        setBottomSheetEvent(event)
    }, [])

    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
        setSneakPeekSlotData(null)
    }, [])

    const handleViewMapFromSneakPeek = useCallback(() => {
        // Find which day contains the current sneakPeek experience and switch to map tab
        if (sneakPeekExperienceId && events.length > 0) {
            const matchingEvent = events.find((e) => (e.slotData?.id || e.slot_data?.id) === sneakPeekExperienceId)
            if (matchingEvent?.dayIndex !== undefined) {
                const targetDayIndex = matchingEvent.dayIndex
                setSelectedDayIndex(targetDayIndex)
                setIsOverviewMode(false)

                // Find the marker ID for this experience so we can highlight/focus it on the map.
                // Markers are keyed by slotId in useItineraryMapData; match via entity_id.
                const entityId = matchingEvent.entity_id
                if (entityId && getMarkersForDay) {
                    const dayMarkers = getMarkersForDay(targetDayIndex)
                    const targetMarker = dayMarkers.find((m) => m.experience_id === entityId)
                    if (targetMarker) {
                        setFocusedMarkerId(String(targetMarker.id))
                    }
                }
            }
        }
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_SNEAK_PEEK_OPEN_MAP_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { experience_id: sneakPeekExperienceId }
        })
        setMobileActiveTab('map')
    }, [sneakPeekExperienceId, events, getMarkersForDay, trackButtonClickCustom])

    /** Kanban card "View on map" — must switch mobile tab + day; desktop-only parent handlers won't do that. */
    const handleViewMapFromCard = useCallback(
        (experienceId: string, dayIndex?: number) => {
            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_CARD_VIEW_MAP_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experience_id: experienceId, day_index: dayIndex ?? null }
            })
            if (dayIndex !== undefined) {
                setSelectedDayIndex(dayIndex)
                setIsOverviewMode(false)
                const matchingEvent = events.find(
                    (e) =>
                        e.dayIndex === dayIndex && (e.slotData?.id || e.slot_data?.id) === experienceId
                )
                const entityId = matchingEvent?.entity_id
                if (entityId && getMarkersForDay) {
                    const dayMarkers = getMarkersForDay(dayIndex)
                    const targetMarker = dayMarkers.find((m) => m.experience_id === entityId)
                    if (targetMarker) {
                        setFocusedMarkerId(String(targetMarker.id))
                    }
                }
            }
            setMobileActiveTab('map')
            onViewMap?.(experienceId, dayIndex)
        },
        [events, getMarkersForDay, onViewMap, trackButtonClickCustom]
    )

    const hasMapData = !!getMarkersForDay && !!dayMapData && dayMapData.length > 0

    // When a marker is focused (from SneakPeek "View on Map"), dispatch a custom
    // event after the map has had time to render so GenericMap opens the popup and
    // flies to the marker. Then clear the focused state.
    useEffect(() => {
        if (!focusedMarkerId || mobileActiveTab !== 'map') return

        // Allow the GenericMap to fully mount, initialize mapbox, and create markers
        // before dispatching the focus event that opens the popup and flies to the pin.
        const timer = setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent('collection:focusMarker', { detail: { id: focusedMarkerId } })
            )
            // Clear after the flyTo animation completes so hover highlight doesn't persist
            setTimeout(() => setFocusedMarkerId(null), 1500)
        }, 1000)

        return () => clearTimeout(timer)
    }, [focusedMarkerId, mobileActiveTab])

    // Transform days -> events exactly like desktop
    useEffect(() => {
        if (scrollToDayIndexRequest == null || !days?.length) return
        const idx = Math.max(0, Math.min(scrollToDayIndexRequest, days.length - 1))
        setSelectedDayIndex(idx)
        setMobileActiveTab('list')
        setIsOverviewMode(false)

        const run = () => {
            const container = eventsScrollRef.current
            const section = container?.querySelector<HTMLElement>(`.day-section[data-day-index="${idx}"]`)
            // Scroll only the itinerary list — avoid scrollIntoView(block:start), which scrolls the window
            // and pulls the tripboard header away when embedded.
            if (container && section) {
                const cRect = container.getBoundingClientRect()
                const sRect = section.getBoundingClientRect()
                const nextTop = container.scrollTop + (sRect.top - cRect.top)
                container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
            }

            const dateContainer = dateScrollRef.current
            const pill = dateContainer?.querySelector<HTMLElement>(`[data-date-index="${idx}"]`)
            if (pill && dateContainer) {
                const dc = dateContainer.getBoundingClientRect()
                const pr = pill.getBoundingClientRect()
                const inView = pr.left >= dc.left && pr.right <= dc.right
                if (!inView) {
                    const delta = pr.left - dc.left - dc.width / 2 + pr.width / 2
                    dateContainer.scrollBy({ left: delta, behavior: 'smooth' })
                }
            }
            onScrollToDayRequestConsumed?.()
        }

        const t = window.setTimeout(run, 150)
        return () => clearTimeout(t)
    }, [scrollToDayIndexRequest, days?.length, onScrollToDayRequestConsumed])

    useEffect(() => {
        if (eventsProp !== undefined) return
        if (!days || days.length === 0) return
        setLocalEvents(transformItineraryToEvents(days, highlightedSlots))
    }, [days, highlightedSlots, eventsProp])

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
        }
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !pendingPlacement || !onPendingPlacementChange) return
            onPendingPlacementChange(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pendingPlacement, onPendingPlacementChange])

    useLayoutEffect(() => {
        if (!pendingPlacement || hidePlacementTimeUi) return
        let innerRaf = 0
        const outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                scrollKanbanPendingPlacementIntoView(eventsScrollRef.current)
            })
        })
        return () => {
            cancelAnimationFrame(outerRaf)
            cancelAnimationFrame(innerRaf)
        }
    }, [pendingPlacement?.event?.slot_id, pendingPlacement?.targetDayIndex, hidePlacementTimeUi])

    useEffect(() => {
        if (!touchDrag) return

        const clearNativeSelection = () => {
            try {
                window.getSelection()?.removeAllRanges()
            } catch {
                /* ignore */
            }
        }
        clearNativeSelection()

        const body = document.body
        const html = document.documentElement
        const prevBodyUserSelect = body.style.userSelect
        const prevHtmlUserSelect = html.style.userSelect
        const prevBodyWebkit = (body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect
        const prevHtmlWebkit = (html.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect

        body.style.userSelect = 'none'
        html.style.userSelect = 'none'
        ;(body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none'
        ;(html.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none'

        const onMove = (e: TouchEvent) => {
            if (e.touches.length === 0) return
            const t = e.touches[0]
            e.preventDefault()
            clearNativeSelection()
            const nx = t.clientX
            const ny = t.clientY
            setTouchDrag((d) => {
                if (!d) return null
                const next = { ...d, clientX: nx, clientY: ny }
                touchDragRef.current = next
                return next
            })

            const scrollRoot = eventsScrollRef.current
            if (scrollRoot) {
                const r = scrollRoot.getBoundingClientRect()
                if (ny < r.top + 72) scrollRoot.scrollTop -= 26
                else if (ny > r.bottom - 72) scrollRoot.scrollTop += 26

                const drop = findTouchDropTarget(scrollRoot, nx, ny)
                touchDropTargetRef.current = drop
                setTouchDropTarget(drop)
            }
        }

        const endDrag = () => {
            clearNativeSelection()
            const drag = touchDragRef.current
            const drop = touchDropTargetRef.current
            touchDragRef.current = null
            touchDropTargetRef.current = null
            setTouchDrag(null)
            setTouchDropTarget(null)

            if (!drag) return
            lastTouchDragEndedAt.current = Date.now()
            try {
                navigator.vibrate?.(6)
            } catch {
                /* ignore */
            }

            if (!latestOnPendingPlacementChangeRef.current || latestPendingPlacementRef.current) return
            if (!drag.event?.slot_id) return
            if (!drop) return

            const daysArr = daysRef.current
            if (!daysArr[drop.dayIndex]) return

            const dayDate = new Date(daysArr[drop.dayIndex].date)
            const ev = drag.event
            const sortedForHit = mergePendingIntoSortedList(drop.dayIndex, eventsRef.current, null)

            const touchInsertion = { dayIndex: drop.dayIndex, insertIndex: drop.insertIndex }
            if (
                kanbanDropIsNoOpSamePosition(ev, drop.dayIndex, sortedForHit, eventsRef.current, touchInsertion)
            ) {
                return
            }

            let insertIndex = drop.insertIndex
            if (ev.dayIndex === drop.dayIndex) {
                const cur = sortedForHit.findIndex((x) => x.slot_id === ev.slot_id)
                if (cur !== -1) {
                    insertIndex = cur < insertIndex ? insertIndex - 1 : insertIndex
                }
            }

            const listWithout = sortedVisibleForDay(eventsRef.current, drop.dayIndex).filter((x) => x.slot_id !== ev.slot_id)
            insertIndex = Math.max(0, Math.min(insertIndex, listWithout.length))

            const durationMs = getEventDurationMs(ev)
            const anchorUtcMs = computePlacementAnchorUtcMs(dayDate, insertIndex, listWithout, durationMs)

            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_SLOT_DRAG_DROP_PENDING,
                buttonAction: POSTHOG_ACTIONS.DRAG_DROP,
                extra: {
                    source_day_index: ev.dayIndex,
                    target_day_index: drop.dayIndex,
                    insert_index: insertIndex,
                    slot_id: ev.slot_id,
                    surface: 'mobile_list'
                }
            })

            latestOnPendingPlacementChangeRef.current?.({
                event: ev,
                sourceDayIndex: ev.dayIndex,
                targetDayIndex: drop.dayIndex,
                insertIndex,
                anchorUtcMs,
                durationMs
            })
        }

        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', endDrag)
        document.addEventListener('touchcancel', endDrag)

        return () => {
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', endDrag)
            document.removeEventListener('touchcancel', endDrag)
            body.style.userSelect = prevBodyUserSelect
            html.style.userSelect = prevHtmlUserSelect
            ;(body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = prevBodyWebkit ?? ''
            ;(html.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = prevHtmlWebkit ?? ''
            clearNativeSelection()
        }
    }, [touchDrag, trackButtonClickCustom])

    useEffect(() => {
        if (mobileActiveTab !== 'list') return
        const dateContainer = dateScrollRef.current
        if (!dateContainer) return

        const selectedCard = dateContainer.querySelector<HTMLElement>(`[data-date-index="${selectedDayIndex}"]`)
        if (!selectedCard) return

        const containerRect = dateContainer.getBoundingClientRect()
        const cardRect = selectedCard.getBoundingClientRect()

        const isInView = cardRect.top >= containerRect.top && cardRect.bottom <= containerRect.bottom

        if (!isInView) {
            dateContainer.scrollTo({
                top: dateContainer.scrollTop + (cardRect.top - containerRect.top) - OFFSET,
                behavior: 'smooth'
            })
        }
    }, [selectedDayIndex, mobileActiveTab])

    useEffect(() => {
        if (mobileActiveTab !== 'list') return
        const root = eventsScrollRef.current
        if (!root) return

        const FOCUS_OFFSET_PX = 88

        const compute = () => {
            if (isScrollingProgrammatically.current) return
            const sections = Array.from(root.querySelectorAll<HTMLElement>('.day-section'))
            if (!sections.length) return

            const nearBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 12
            let active = 0

            if (nearBottom) {
                const last = sections[sections.length - 1]
                const idx = Number(last.getAttribute('data-day-index'))
                active = Number.isNaN(idx) ? sections.length - 1 : idx
            } else {
                const rootRect = root.getBoundingClientRect()
                const focusY = rootRect.top + FOCUS_OFFSET_PX
                for (const sec of sections) {
                    const idx = Number(sec.getAttribute('data-day-index'))
                    if (Number.isNaN(idx)) continue
                    const r = sec.getBoundingClientRect()
                    if (r.top <= focusY) active = idx
                }
            }

            setSelectedDayIndex((p) => (p !== active ? active : p))
        }

        const onScroll = () => {
            if (scrollSpyRaf.current != null) return
            scrollSpyRaf.current = window.requestAnimationFrame(() => {
                scrollSpyRaf.current = null
                compute()
            })
        }

        root.addEventListener('scroll', onScroll, { passive: true })
        compute()

        return () => {
            root.removeEventListener('scroll', onScroll)
            if (scrollSpyRaf.current != null) {
                cancelAnimationFrame(scrollSpyRaf.current)
                scrollSpyRaf.current = null
            }
        }
    }, [days.length, events.length, mobileActiveTab])

    const handleDateClick = (index: number) => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_DAY_PILL_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { day_index: index, total_days: days.length }
        })
        setSelectedDayIndex(index)

        if (mobileActiveTab !== 'list') return

        const container = eventsScrollRef.current
        const section = container?.querySelector<HTMLElement>(`.day-section[data-day-index="${index}"]`)

        if (!container || !section) return

        isScrollingProgrammatically.current = true

        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current)
        }

        container.scrollTo({
            top: section.offsetTop - 80,
            behavior: 'smooth'
        })

        scrollTimeout.current = window.setTimeout(() => {
            isScrollingProgrammatically.current = false
        }, 1000)
    }

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }, [])

    const onMobileSlotTouchStart = useCallback(
        (e: React.TouchEvent, ev: any, dayIndex: number) => {
            if (!placementEnabled || latestPendingPlacementRef.current) return
            if (!ev.slot_id) return
            if (touchDragRef.current) return
            const t = e.touches[0]
            if (!t) return
            const target = e.currentTarget as HTMLElement
            longPressStartRef.current = { x: t.clientX, y: t.clientY, event: ev, dayIndex, el: target }
            clearLongPressTimer()
            longPressTimerRef.current = window.setTimeout(() => {
                longPressTimerRef.current = null
                if (!longPressStartRef.current) return
                const start = longPressStartRef.current
                longPressStartRef.current = null
                try {
                    window.getSelection()?.removeAllRanges()
                } catch {
                    /* ignore */
                }
                const rect = start.el.getBoundingClientRect()
                try {
                    navigator.vibrate?.(14)
                } catch {
                    /* ignore */
                }
                const next = {
                    event: start.event,
                    sourceDayIndex: start.dayIndex,
                    clientX: start.x,
                    clientY: start.y,
                    cardWidth: rect.width,
                    cardHeight: rect.height
                }
                touchDragRef.current = next
                setTouchDrag(next)
                const root = eventsScrollRef.current
                if (root) {
                    const drop = findTouchDropTarget(root, start.x, start.y)
                    touchDropTargetRef.current = drop
                    setTouchDropTarget(drop)
                }
            }, MOBILE_LONG_PRESS_MS)
        },
        [placementEnabled, clearLongPressTimer]
    )

    const onMobileSlotTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!longPressTimerRef.current || !longPressStartRef.current) return
            const t = e.touches[0]
            if (!t) return
            const dx = t.clientX - longPressStartRef.current.x
            const dy = t.clientY - longPressStartRef.current.y
            if (dx * dx + dy * dy > MOBILE_LONG_PRESS_MOVE_CANCEL_PX ** 2) {
                clearLongPressTimer()
                longPressStartRef.current = null
            }
        },
        [clearLongPressTimer]
    )

    const onMobileSlotTouchEnd = useCallback(() => {
        clearLongPressTimer()
        longPressStartRef.current = null
    }, [clearLongPressTimer])

    // ── Map data for current day ──
    const mapMarkers = useMemo(() => {
        if (!getMarkersForDay) return []
        return getMarkersForDay(selectedDayIndex)
    }, [selectedDayIndex, getMarkersForDay])

    const mapRouteCoordinates = useMemo(() => {
        if (!getDayRouteCoordinates) return []
        return getDayRouteCoordinates(selectedDayIndex)
    }, [selectedDayIndex, getDayRouteCoordinates])

    const mapRouteStyle = useMemo(() => {
        if (isOverviewMode) {
            return {
                color: MAP_CONFIG.routeLine.overview.color,
                width: MAP_CONFIG.routeLine.overview.width,
                opacity: MAP_CONFIG.routeLine.overview.opacity,
                dashArray: [...MAP_CONFIG.routeLine.overview.dashArray]
            }
        }
        return {
            color: MAP_CONFIG.routeLine.day.color,
            width: MAP_CONFIG.routeLine.day.width,
            opacity: MAP_CONFIG.routeLine.day.opacity,
            dashArray: [...MAP_CONFIG.routeLine.day.dashArray]
        }
    }, [isOverviewMode])

    const mapCityName = useMemo(() => {
        if (isOverviewMode) return primaryCityName || ''
        const row = days[selectedDayIndex]
        const rowCity = row?.base_city?.name || row?.destination_city?.name || ''
        const dm = dayMapData?.[selectedDayIndex]
        const dmCity = dm?.cityName && dm.cityName !== 'Unknown' ? dm.cityName : ''
        return dmCity || rowCity || primaryCityName || ''
    }, [selectedDayIndex, dayMapData, primaryCityName, isOverviewMode, days])

    // Resolved markers & route based on overview/day mode
    const resolvedMarkers = isOverviewMode ? cityMarkers || [] : mapMarkers
    const resolvedRoute = isOverviewMode ? overviewRouteCoordinates || [] : mapRouteCoordinates

    // Map popup "View Details" on experience markers -> navigate to experience page.
    // Same-tab navigation (window.location.assign) is used because this is the mobile view
    // and window.open('_blank') fired through a callback chain is blocked by mobile browsers.
    const handleMapPopupButtonClick = useCallback(
        (action: 'view_deal' | 'view_details' | 'directions' | 'instagram', marker: MapMarker) => {
            if (action === 'view_details' && marker.experience_id) {
                const searchParamsString = (marker.onClickData as { searchParams?: string } | undefined)
                    ?.searchParams
                const query = searchParamsString ?? ''
                const url = `/experiences/${marker.experience_id}/${query ? `?${query}` : ''}`
                window.location.assign(url)
            }
        },
        []
    )

    const staysById = useMemo(() => {
        const map = new Map<string, ItineraryStay>()
        for (const s of stays ?? []) {
            if (s?.stay_id) map.set(s.stay_id, s)
        }
        return map
    }, [stays])

    const dayStayMap = useMemo(
        () => deriveDayStayMap(days || [], stays || []),
        [days, stays]
    )

    if (!days || days.length === 0) return null

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* ── List view: horizontal pills on top, single selected day below ──
                `min-h-0` is load-bearing: without it a flex-1 column's implicit
                `min-height: auto` lets it grow to its content height (iOS Safari
                doesn't reliably derive min-size from `overflow-hidden`), which
                unbounds the inner scroller and causes momentum overshoot. */}
            <div className={`flex flex-col flex-1 min-h-0 overflow-hidden ${mobileActiveTab === 'map' ? 'hidden' : ''}`}>
                {/* Horizontal day pills row */}
                <div
                    ref={dateScrollRef}
                    className="shrink-0 bg-white border-b border-grey-5 px-3 py-2.5 overflow-x-auto"
                    style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex items-center gap-2">
                        {/* Shortlist pill — leads the row, before Day 1. Heart +
                            count; selecting it swaps the day list for the
                            shortlist. Never the default tab (lands on Day 1). */}
                        {wishlist && (
                            <button
                                type="button"
                                onClick={() => {
                                    trackButtonClickCustom({
                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                        buttonName: POSTHOG_EVENTS.ITINERARY_SIDEBAR_WISHLIST_TOGGLE,
                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                        extra: { is_open: true, surface: 'mobile', shortlist_count: wishlist.count }
                                    })
                                    setMobileListMode('shortlist')
                                }}
                                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold font-manrope transition-colors cursor-pointer ${
                                    mobileListMode === 'shortlist'
                                        ? 'bg-grey-0 text-white'
                                        : 'bg-white text-grey-0 border border-grey-5 hover:bg-grey-5'
                                }`}>
                                <Heart className="h-3.5 w-3.5 fill-secondary-red text-secondary-red" />
                                {wishlist.count}
                            </button>
                        )}
                        {wishlist && <div className="h-6 w-px shrink-0 bg-grey-4" aria-hidden />}
                        {days.map((_day, index) => (
                            <button
                                key={index}
                                type="button"
                                data-date-index={index}
                                onClick={() => {
                                    setMobileListMode('days')
                                    handleDateClick(index)
                                }}
                                className={`shrink-0 px-4 py-1.5 rounded-full border-[0.8px] text-[12px] font-medium font-manrope transition-colors cursor-pointer ${
                                    mobileListMode === 'days' && index === selectedDayIndex
                                        ? 'bg-grey-0 text-white border-grey-0'
                                        : 'bg-white text-grey-2 border-grey-5 hover:bg-grey-5'
                                }`}>
                                Day {index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shortlist list — shown when the heart pill is active. Mounted
                    only in shortlist mode; the day list below is kept mounted
                    (hidden) so its scroll position survives the toggle. */}
                {wishlist && mobileListMode === 'shortlist' && (
                    <div className="flex flex-1 min-h-0 flex-col bg-white">
                        <ShortlistedExperiencesProvider tripId={wishlist.tripId}>
                            <WishlistRowList
                                tripId={wishlist.tripId}
                                countryId={wishlist.countryId}
                                cityIds={wishlist.cityIds}
                                isMobile
                                isInItinerary={wishlist.isInItinerary}
                                onAddToItinerary={wishlist.onAddToItinerary}
                                onRowClick={wishlist.onRowClick}
                                onScheduleWithAI={wishlist.onScheduleWithAI}
                                onSeeAllExplore={wishlist.onSeeAllExplore}
                                onExploreActivities={wishlist.onExploreActivities}
                                onReadyMade={() => {}}
                            />
                        </ShortlistedExperiencesProvider>
                    </div>
                )}

                {/* All days — continuous scrollable list */}
                <div
                    ref={eventsScrollRef}
                    className={`flex-1 overflow-y-auto bg-grey-5 ${mobileListMode !== 'days' ? 'hidden' : ''} ${placementEnabled ? 'select-none' : ''}`}
                    style={{
                        // `none` (not `contain`) kills the rubber-band bounce that
                        // reads as "overshoot" on real iOS — `contain` only stops
                        // scroll chaining, it still lets the element rubber-band.
                        overscrollBehavior: 'none',
                        // Stop the browser's scroll-anchoring from shifting the
                        // scroll position when a new item lands in the list (e.g.
                        // the AI expert adds an activity) — that re-anchor is what
                        // makes the next flick overshoot past the new content.
                        overflowAnchor: 'none',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        ...(placementEnabled ? { WebkitTouchCallout: 'none' as const } : {})
                    }}>
                    {days.map((day, dayIndex) => {
                        const cityName = day?.base_city?.name || day?.destination_city?.name || ''
                        const cityId =
                            (day?.base_city?.id as string | undefined) ??
                            (day?.destination_city?.id as string | undefined) ??
                            null
                        const stayIdForDay = dayStayMap.get(dayIndex)
                        const stayForDay: ItineraryStay | null =
                            (stayIdForDay && staysById.get(stayIdForDay)) || null
                        const dayDate = new Date(day.date)
                        const sortedEvents = mergePendingIntoSortedList(dayIndex, events, pendingPlacement)
                        // Route-summary sleep city for this day (falls back
                        // to base_city when null — overnight transit days or
                        // days added after the last summary fetch).
                        const dayDateKey = day?.date ? String(day.date).slice(0, 10) : null
                        const sleepCity = dayDateKey ? sleepCityByDate?.[dayDateKey] || null : null
                        // Active = the day the scroll-spy currently has in focus.
                        // Drives the header's dark→light colour inversion below.
                        const isActiveDay = dayIndex === selectedDayIndex

                        return (
                            <div key={dayIndex} className="day-section" data-day-index={dayIndex}>
                                <div
                                    className={`sticky top-0 z-[5] min-h-[46px] py-[6px] px-3 flex items-center justify-between gap-2 border-b transition-colors duration-300 ease-out ${
                                        isActiveDay ? 'bg-white border-grey-4' : 'bg-grey-4 border-grey-4'
                                    }`}
                                    style={{
                                        boxShadow: isActiveDay
                                            ? '0px 2px 6px rgba(0, 0, 0, 0.08)'
                                            : '0 -2px 6px rgba(255, 255, 255, 0.15), 0 2px 6px rgba(255, 255, 255, 0.15)'
                                    }}>
                                    <div className="flex min-w-0 items-center gap-1 font-manrope text-[12px] text-grey-0">
                                        <span className="shrink-0 font-semibold leading-4 tracking-[-0.01em] text-grey-1">
                                            {hideExactDates ? `Day ${dayIndex + 1}` : formatDate(day?.date)}
                                        </span>
                                        {sleepCity || cityName ? (
                                            <>
                                                <span className="shrink-0 font-medium leading-4 tracking-[-0.01em]">◦</span>
                                                <span className="truncate font-medium leading-4 tracking-[-0.01em]">
                                                    {sleepCity || cityName}
                                                </span>
                                            </>
                                        ) : sleepCityLoading ? (
                                            <span
                                                aria-hidden
                                                className="inline-block h-3 w-20 animate-pulse rounded bg-grey-4"
                                            />
                                        ) : null}
                                        {stayForDay ? (
                                            <StayChip
                                                dense
                                                stay={stayForDay}
                                                cityId={cityId}
                                                onChange={
                                                    canEdit && onStayAction
                                                        ? (stayId, sCityId) =>
                                                              onStayAction('change', stayId, sCityId)
                                                        : undefined
                                                }
                                                onRemove={
                                                    canEdit && onStayAction
                                                        ? (stayId, sCityId) =>
                                                              onStayAction('remove', stayId, sCityId)
                                                        : undefined
                                                }
                                            />
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isActiveDay && hasMapData && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackButtonClickCustom({
                                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                        buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_MAP_VIEW_CLICK,
                                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                                        extra: { day_index: dayIndex }
                                                    })
                                                    setMobileActiveTab('map')
                                                }}
                                                aria-label="Map View"
                                                className="flex items-center justify-center text-primary-default rounded-lg p-2 bg-white shrink-0">
                                                <MapIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                                            </button>
                                        )}
                                        {isActiveDay && (onKanbanDayMenuAction || onAddStay) && canEdit && !isViewer && (
                                            <button
                                                type="button"
                                                onClick={() => setDayMenuState({ dayIndex, dayNumber: dayIndex + 1, date: dayDate })}
                                                className="w-8 h-8 rounded-full flex items-center justify-center border border-grey-4 bg-white text-grey-1 shrink-0">
                                                <MoreHorizontal size={16} strokeWidth={2} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div
                                    data-mobile-day-list
                                    className={`flex flex-col p-3 pb-5 pt-2 ${placementEnabled ? 'select-none' : ''}`}
                                    style={placementEnabled ? { WebkitTouchCallout: 'none' as const } : undefined}
                                    onClickCapture={
                                        placementEnabled
                                            ? (e) => {
                                                  if (Date.now() - lastTouchDragEndedAt.current < 420) {
                                                      e.preventDefault()
                                                      e.stopPropagation()
                                                  }
                                              }
                                            : undefined
                                    }>
                                    {sortedEvents.length > 0 ? (
                                        sortedEvents.map((event, index) => {
                                            if (placementEnabled) {
                                                const showTouchGap =
                                                    touchDrag &&
                                                    touchDropTarget &&
                                                    touchDropTarget.dayIndex === dayIndex &&
                                                    touchDropTarget.insertIndex === index &&
                                                    touchDrag.event.slot_id !== event.slot_id

                                                const showTimeStrip =
                                                    pendingPlacement &&
                                                    !hidePlacementTimeUi &&
                                                    pendingPlacement.event.slot_id === event.slot_id &&
                                                    pendingPlacement.targetDayIndex === dayIndex

                                                const placementUiBlocksOtherDrags =
                                                    Boolean(pendingPlacement && !hidePlacementTimeUi)
                                                const isDimmedDuringPlacement =
                                                    placementUiBlocksOtherDrags && !showTimeStrip

                                                const isTouchDragSource =
                                                    !!touchDrag &&
                                                    (touchDrag.event.slot_id || touchDrag.event.id) ===
                                                        (event.slot_id || event.id)
                                                const slotPlacementSaving =
                                                    placementSavingSlotId != null &&
                                                    placementSavingSlotId === event.slot_id

                                                return (
                                                    <Fragment key={event.slot_id || event.id || index}>
                                                        {index > 0 && !showTouchGap && (
                                                            <div className="pointer-events-none flex justify-center py-1" aria-hidden>
                                                                <div style={{ width: 1.7, height: 24, borderRadius: 1, backgroundImage: 'repeating-linear-gradient(to bottom, var(--color-grey-4) 0px, var(--color-grey-4) 5px, transparent 5px, transparent 10px)' }} />
                                                            </div>
                                                        )}
                                                    <div
                                                        data-mobile-slot-index={index}
                                                        {...(showTimeStrip ? { 'data-kanban-pending-slot': '' } : {})}
                                                        className={`relative touch-manipulation select-none transition-[opacity,transform] duration-300 ${
                                                            showTimeStrip ? 'z-10' : ''
                                                        } ${isDimmedDuringPlacement ? 'scale-[0.985] opacity-[0.4]' : ''} ${animateCardsIn ? 'animate-card-up' : ''}`}
                                                        style={{ WebkitTouchCallout: 'none', animationDelay: animateCardsIn ? `${index * 60}ms` : undefined }}
                                                        onContextMenu={(e) => e.preventDefault()}
                                                        onTouchStart={(e) => onMobileSlotTouchStart(e, event, dayIndex)}
                                                        onTouchMove={onMobileSlotTouchMove}
                                                        onTouchEnd={onMobileSlotTouchEnd}
                                                        onTouchCancel={onMobileSlotTouchEnd}>
                                                        {showTouchGap && (
                                                            <div className="mb-2 min-h-12 rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07]" />
                                                        )}
                                                        <div
                                                            className={`relative overflow-hidden rounded-xl [&_img]:pointer-events-none ${
                                                                isTouchDragSource
                                                                    ? 'shadow-none ring-0'
                                                                    : showTimeStrip
                                                                      ? 'ring-2 ring-primary-default shadow-[0_12px_40px_-8px_rgba(15,23,42,0.14),0_0_0_4px_rgba(124,58,237,0.12)]'
                                                                      : 'ring-1 ring-grey-4/80'
                                                            }`}>
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
                                                                className={
                                                                    isTouchDragSource ? 'invisible pointer-events-none' : ''
                                                                }>
                                                                <div className="relative">
                                                                    <KanbanEventCard
                                                                        event={event}
                                                                        onEdit={onEditEvent ?? (() => {})}
                                                                        onDelete={onDeleteEvent ?? (() => {})}
                                                                        canEdit={canEdit && !!onEditEvent}
                                                                        shortlistedExperienceIds={shortlisted}
                                                                        onViewMap={handleViewMapFromCard}
                                                                        changedSlotBadges={changedSlotBadges}
                                                                        attachTimeStripBelow={showTimeStrip}
                                                                        suppressHoverPopup
                                                                        placementSaving={slotPlacementSaving}
                                                                        onMobileSlotTap={handleCardClick}
                                                                        onKanbanSlotAssistant={onKanbanSlotAssistant}
                                                                    />
                                                                </div>
                                                                <AnimatePresence>
                                                                    {showTimeStrip && onPlacementCommit && onPendingPlacementChange && (
                                                                        <ChooseStartTimeStrip
                                                                            key={`${pendingPlacement!.event.slot_id}-mobile-time`}
                                                                            anchorUtcMs={pendingPlacement!.anchorUtcMs}
                                                                            durationMs={pendingPlacement!.durationMs}
                                                                            targetDayDate={dayDate}
                                                                            analyticsSurface="mobile_list"
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
                                                                                const dayCity = day?.base_city || day?.destination_city
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
                                                                                              country:
                                                                                                  (dayCity as { country?: string }).country || ''
                                                                                          }
                                                                                        : undefined
                                                                                })
                                                                            }}
                                                                        />
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                            {isTouchDragSource && (
                                                                <div
                                                                    className="pointer-events-none absolute inset-0 z-[1] rounded-xl border border-dashed border-grey-3 bg-grey-4/25"
                                                                    style={{ borderStyle: 'dashed' }}
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    </Fragment>
                                                )
                                            }

                                            const slotPlacementSaving =
                                                placementSavingSlotId != null &&
                                                placementSavingSlotId === event.slot_id
                                            return (
                                                <Fragment key={event.slot_id || event.id || index}>
                                                    {index > 0 && (
                                                        <div className="pointer-events-none flex justify-center py-1" aria-hidden>
                                                            <div style={{ width: 1.7, height: 24, borderRadius: 1, backgroundImage: 'repeating-linear-gradient(to bottom, var(--color-grey-4) 0px, var(--color-grey-4) 5px, transparent 5px, transparent 10px)' }} />
                                                        </div>
                                                    )}
                                                    <div
                                                        data-mobile-slot-index={index}
                                                        className={`relative cursor-pointer active:scale-[0.98] transition-transform ${animateCardsIn ? 'animate-card-up' : ''}`}
                                                        style={{ animationDelay: animateCardsIn ? `${index * 60}ms` : undefined }}>
                                                        <div className="relative overflow-hidden rounded-xl ring-1 ring-grey-4/80 [&_img]:pointer-events-none">
                                                            <KanbanEventCard
                                                                event={event}
                                                                onEdit={onEditEvent ?? (() => {})}
                                                                onDelete={onDeleteEvent ?? (() => {})}
                                                                canEdit={canEdit && !!onEditEvent}
                                                                shortlistedExperienceIds={shortlisted}
                                                                onViewMap={handleViewMapFromCard}
                                                                changedSlotBadges={changedSlotBadges}
                                                                suppressHoverPopup
                                                                placementSaving={slotPlacementSaving}
                                                                onMobileSlotTap={handleCardClick}
                                                                onKanbanSlotAssistant={onKanbanSlotAssistant}
                                                            />
                                                        </div>
                                                    </div>
                                                </Fragment>
                                            )
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                                            <span className="text-3xl">🏖️</span>
                                            <Typography size="13" weight="medium" family="manrope" color="grey-3">
                                                Nothing planned today
                                            </Typography>
                                        </div>
                                    )}
                                    {placementEnabled &&
                                        touchDrag &&
                                        touchDropTarget &&
                                        touchDropTarget.dayIndex === dayIndex &&
                                        touchDropTarget.insertIndex === sortedEvents.length && (
                                            <div className="min-h-12 rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07]" />
                                        )}
                                </div>
                            </div>
                        )
                    })}
                    <div className="h-[200px]" />
                </div>
            </div>

            {/* ── Map view ── */}
            {mobileActiveTab === 'map' && hasMapData && (
                <div className="flex-1 relative overflow-hidden">
                    {/* Back to list button */}
                    <button
                        type="button"
                        onClick={() => {
                            trackButtonClickCustom({
                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_LIST_VIEW_CLICK,
                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                extra: {}
                            })
                            setMobileActiveTab('list')
                        }}
                        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope bg-white shadow-md border border-primary-default cursor-pointer transition-colors">
                        <ChevronLeft size={14} className="text-primary-default" />
                        <span className="text-primary-default">List View</span>
                    </button>

                    <GenericMap
                        key={selectedDayIndex}
                        cityName={mapCityName || primaryCityName || 'Trip'}
                        markers={resolvedMarkers}
                        hoveredMarkerId={focusedMarkerId}
                        height="100%"
                        className="h-full"
                        expandbtnClassName="hidden"
                        routeCoordinates={resolvedRoute}
                        routeLineStyle={mapRouteStyle}
                        emptyZoom={11}
                        onPopupButtonClick={handleMapPopupButtonClick}
                    />

                    {/* Map navigation overlay — fixed to viewport bottom, z-[70] to render above agent input (z-[60]) */}
                    <div className="fixed bottom-6 left-4 right-4 z-[70] flex items-center gap-2">
                        {/* Route toggle button (if multi-city) */}
                        {hasRouteOverview && (
                            <button
                                onClick={() => {
                                    const next = !isOverviewMode
                                    trackButtonClickCustom({
                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                        buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_ROUTE_OVERVIEW_TOGGLE,
                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                        extra: { route_overview_on: next }
                                    })
                                    setIsOverviewMode(next)
                                }}
                                className={`h-[42px] px-3.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                    isOverviewMode ? 'bg-primary-default text-white' : 'bg-white text-grey-0'
                                }`}>
                                <Route size={14} />
                                <span className="text-[12px] font-bold font-manrope">Route</span>
                            </button>
                        )}

                        {/* Day navigation pill */}
                        <div
                            className={`flex-1 flex items-center justify-center gap-1 bg-white rounded-full shadow-lg px-2 py-1.5 transition-opacity ${
                                isOverviewMode ? 'opacity-40 pointer-events-none' : ''
                            }`}>
                            <button
                                disabled={selectedDayIndex === 0 || isOverviewMode}
                                onClick={() => {
                                    trackButtonClickCustom({
                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                        buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_MAP_DAY_NAV_CLICK,
                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                        extra: { direction: 'prev', from_day: selectedDayIndex }
                                    })
                                    setIsOverviewMode(false)
                                    setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))
                                }}
                                className="w-8 h-8 rounded-full hover:bg-grey-5 flex items-center justify-center disabled:opacity-30 cursor-pointer disabled:cursor-default shrink-0">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[12px] font-bold font-manrope text-grey-0 px-1 min-w-0 text-center truncate">
                                Day {selectedDayIndex + 1} ·{' '}
                                {days[selectedDayIndex]?.base_city?.name || days[selectedDayIndex]?.destination_city?.name || ''}
                            </span>
                            <button
                                disabled={selectedDayIndex === days.length - 1 || isOverviewMode}
                                onClick={() => {
                                    trackButtonClickCustom({
                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                        buttonName: POSTHOG_EVENTS.ITINERARY_MOBILE_MAP_DAY_NAV_CLICK,
                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                        extra: { direction: 'next', from_day: selectedDayIndex }
                                    })
                                    setIsOverviewMode(false)
                                    setSelectedDayIndex(Math.min(days.length - 1, selectedDayIndex + 1))
                                }}
                                className="w-8 h-8 rounded-full hover:bg-grey-5 flex items-center justify-center disabled:opacity-30 cursor-pointer disabled:cursor-default shrink-0">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {touchDrag &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="pointer-events-none fixed z-[10050] flex flex-col items-stretch gap-1 select-none"
                        style={{
                            WebkitTouchCallout: 'none',
                            left: Math.min(
                                typeof window !== 'undefined' ? window.innerWidth - touchDrag.cardWidth - 12 : 12,
                                Math.max(10, touchDrag.clientX - touchDrag.cardWidth / 2)
                            ),
                            top: Math.max(12, touchDrag.clientY - 28),
                            width: touchDrag.cardWidth,
                            maxWidth: 'min(92vw, 400px)'
                        }}>
                        <div className="overflow-hidden rounded-xl shadow-2xl ring-2 ring-primary-default/35 bg-white [&_img]:pointer-events-none">
                            <KanbanEventCard
                                event={touchDrag.event}
                                onEdit={() => {}}
                                onDelete={() => {}}
                                canEdit={false}
                                shortlistedExperienceIds={shortlisted}
                                suppressHoverPopup
                            />
                        </div>
                        <p className="text-center text-[10px] font-semibold font-manrope text-grey-1 drop-shadow-sm">
                            Release to place
                        </p>
                    </div>,
                    document.body
                )}

            {/* SneakPeek Modal for experience/visit cards */}
            {sneakPeekExperienceId &&
                createPortal(
                    <SneakPeekModal
                        isOpen={true}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                        displayName={sneakPeekSlotData?.displayName}
                        onViewMap={hasMapData ? handleViewMapFromSneakPeek : undefined}
                        triggerType='itinerary_view_page'
                        slotNotes={sneakPeekSlotData?.notes}
                        slotSuggestionReasons={sneakPeekSlotData?.suggestion_reasons}
                        slotAttachments={sneakPeekSlotData?.attachments}
                    />,
                    document.body
                )}

            {/* Bottom Sheet for non-experience slot details */}
            {bottomSheetEvent &&
                createPortal(
                    <SlotDetailBottomSheet
                        event={bottomSheetEvent}
                        isOpen={true}
                        onClose={() => setBottomSheetEvent(null)}
                        onEdit={
                            onEditEvent
                                ? () => {
                                      const ev = bottomSheetEvent
                                      if (!ev) return
                                      setBottomSheetEvent(null)
                                      onEditEvent(kanbanSlotEditPayload(ev))
                                  }
                                : undefined
                        }
                        onViewFullExperience={() => {
                            const ev = bottomSheetEvent
                            const id = ev?.slotData?.id || ev?.slot_data?.id
                            if (!id || (ev.type !== 'experience' && ev.type !== 'visit')) return
                            setBottomSheetEvent(null)
                            setSneakPeekExperienceId(id)
                            const sr = Array.isArray(ev.suggestion_reasons)
                                ? ev.suggestion_reasons.filter(
                                      (s: unknown): s is string => typeof s === 'string' && Boolean(s.trim())
                                  )
                                : undefined
                            setSneakPeekSlotData({
                                notes: ev.notes,
                                suggestion_reasons: sr,
                                attachments: ev.attachments || [],
                                displayName: ev.title || ev.slot_data?.name || ev.slotData?.name
                            })
                        }}
                    />,
                    document.body
                )}

            {/* Day menu bottom sheet */}
            {dayMenuState &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            key="day-menu-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDayMenuState(null)}
                            className="fixed inset-0 bg-black/50 z-[9997]"
                        />
                        <motion.div
                            key="day-menu-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-[9998] bg-white rounded-t-[20px] shadow-2xl">
                            {/* Drag handle */}
                            <div className="flex justify-center pt-2.5 pb-1">
                                <div className="w-9 h-1 rounded-full bg-grey-4" />
                            </div>
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-grey-4">
                                <span className="text-[15px] font-bold font-red-hat-display text-grey-0">
                                    {hideExactDates ? `Day ${dayMenuState.dayNumber}` : formatDate(dayMenuState.date)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDayMenuState(null)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-grey-5 transition-colors cursor-pointer">
                                    <X size={16} className="text-grey-2" />
                                </button>
                            </div>
                            <div className="flex flex-col pb-8">
                                {(() => {
                                    const menuDay = days[dayMenuState.dayIndex]
                                    const menuCityId =
                                        (menuDay?.base_city?.id as string | undefined) ??
                                        (menuDay?.destination_city?.id as string | undefined) ??
                                        null
                                    const menuStayId = dayStayMap.get(dayMenuState.dayIndex)
                                    const menuHasStay = Boolean(menuStayId && staysById.get(menuStayId))
                                    if (!(canEdit && onAddStay && menuCityId && !menuHasStay)) return null
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onAddStay(menuCityId)
                                                setDayMenuState(null)
                                            }}
                                            className="px-5 py-4 text-left text-[15px] font-manrope font-medium text-grey-0 active:bg-grey-5 transition-colors">
                                            Add stay
                                        </button>
                                    )
                                })()}
                                {onKanbanDayMenuAction && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onKanbanDayMenuAction('add_day_before', dayMenuState)
                                                setDayMenuState(null)
                                            }}
                                            className="px-5 py-4 text-left text-[15px] font-manrope font-medium text-grey-0 active:bg-grey-5 transition-colors">
                                            Add a day before
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onKanbanDayMenuAction('add_day_after', dayMenuState)
                                                setDayMenuState(null)
                                            }}
                                            className="px-5 py-4 text-left text-[15px] font-manrope font-medium text-grey-0 active:bg-grey-5 transition-colors">
                                            Add a day after
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onKanbanDayMenuAction('clear_column', dayMenuState)
                                                setDayMenuState(null)
                                            }}
                                            className="px-5 py-4 text-left text-[15px] font-manrope font-medium text-grey-0 active:bg-grey-5 transition-colors">
                                            Clear Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onKanbanDayMenuAction('delete_column', dayMenuState)
                                                setDayMenuState(null)
                                            }}
                                            className="px-5 py-4 text-left text-[15px] font-manrope font-medium text-secondary-red active:bg-grey-5 transition-colors">
                                            Delete Day
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    )
}
