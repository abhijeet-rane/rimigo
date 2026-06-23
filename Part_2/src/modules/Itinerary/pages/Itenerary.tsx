/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { EventContentArg, EventDropArg, EventMountArg } from '@fullcalendar/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { RenderEventContent, transformItineraryToEvents } from '../components/RenderCalenderContent'
import { DateCard } from '../components/DateCard'
import HeaderCalender from '../components/HeaderCalender'
import SearchHeaderCalendar from '../components/SearchHeaderCalendar'

import CreateItineraryWizard from '../components/CreateItineraryWizard'
import type { WizardSubmitData } from '../components/CreateItineraryWizard/types'
import { STAY_BUDGET_RANGE_MAP } from '../components/CreateItineraryWizard/types'

import {
    useColumnCount,
    useItineraryCompletedData,
    useItineraryRouteSummary,
    useSendItineraryRequest,
    importCompletedItinerary,
    useIsMobile,
    useCountryItineraryStatus,
    useAddItineraryDay,
    useUpdateItineraryDay,
    useDeleteItineraryDay,
    useResetItineraryDay,
    useSwitchItineraryDay
} from '../hooks/ItineraryHook'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { useTripboardCreation } from '../hooks/useTripboardCreation'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getAgentBySpace, fetchThreads, fetchInteractions } from '@/api/ataAPI/ataApi'
import { triggerAssistantPrompt, prefillAssistantPrompt, submitConciergeMessage } from '@/pages/Stays/Components/assistantController'
import ItineraryGenerationLoader from '../components/ItineraryGenerationLoader'
import { MOCK_ITINERARY_LOADER, MOCK_LOADER_CITIES, MOCK_LOADER_TOTAL_DAYS, MOCK_LOADER_PROGRESS_DETAILS } from '../mocks/itineraryLoaderMock'
import LogoLoadingScreen from '@/components/shared/LogoLoadingScreen'
import ViewContentCollectionLoading from '@/modules/ContentCollection/components/ViewContentCollectionLoading'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { Airport } from '@/api/flights/airportSearchAPI'
import ItineraryComingSoonPage from '@/modules/ItinerayComingSoon/pages/ItineraryComingSoonPage'
import { getShortlistedByTrip } from '@/modules/Experiences/api/experienceShortlistAPI'
import { MobileItineraryView } from '../components/MobileItineraryView'
import { Share2, X } from 'lucide-react'
import DesktopKanbanView, {
    type KanbanPlacementCommitPayload,
    type KanbanCustomTimeOpenArgs,
    type KanbanPendingPlacement
} from '../components/DesktopKanbanView'
import { assignKanbanColumnKeyForReorder } from '../components/kanbanPlacementUtils'
import { ItineraryRailIcons } from '../components/ItinerarySidebar'
import ItineraryWishlistColumn, { WISHLIST_PANEL_WIDTH } from '../components/wishlist/ItineraryWishlistColumn'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import AddToItineraryDayModal from '@/modules/Acitvities/components/AddToItineraryDayModal'
import { useExperienceFitRecommendation } from '@/modules/Acitvities/hooks/useExperienceFitRecommendation'
import { buildScheduleShortlistPrompt } from '@/utils/shortlistPrompts'
import { createPortal } from 'react-dom'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import CityRouteBar from '../components/CityRouteBar'
import ItineraryMapView, { type ItineraryMapViewHandle } from '../components/ItineraryMapView'
import { type ItineraryViewMode } from '../components/HeaderCalender'
import { useItineraryMapData } from '../hooks/useItineraryMapData'
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction'
import AddEventModal from '../components/AddEventModal'
import { useDeleteSlot, useUpdateSlot } from '../hooks/ItineraryEventHook'
import AddDayIndicator from '../components/AddDayIndicator'
import AddDayModal from '../components/AddDayModal'
import ShareItineraryModal from '../components/ShareItineraryModal'
import CloneItineraryModal from '../components/CloneItineraryModal'
import ReplaceConfirmationModal from '../components/ReplaceConfirmationModal'
import StayPickerModal from '../components/StayPickerModal'
import TripboardProgressModal from '../components/TripboardProgressModal'
import { CityListItem } from '@/components/common/SearchBar'
import { cloneItinerary, CloneItineraryPayload, deleteStayFromItinerary } from '@/api/itineraryApi'
import type { ItineraryStay } from '@/api/itineraryApi'
import { useNavigationActionStore } from '@/stores/navigationActionStore'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { getPrioritizedCountries, LocationResponse } from '@/modules/Onboarding/api'
import { TravelerTripsData } from '@/pages/Landing/api/travelerTrips'
import { useUserInfo } from '@/hooks/useUserInfo'
import Typography from '@/components/shared/Typography'

type ItineraryProps = {
    itineraryIdOverride?: string
    embedded?: boolean
    readOnly?: boolean
    /** When true, hides exact dates and shows only "Day N" labels */
    hideExactDates?: boolean
    activeTrip?: TravelerTripsData['trips'][number]
    showCloneButton?: boolean
    /** Internal-only: called to open "clone from link" flow (Tripboard). */
    onCloneFromLink?: () => void
    showCloneFromLinkButton?: boolean
    tripsData?: TravelerTripsData
    /** External handler for "Create Tripboard" button. When provided, overrides the internal
     *  isRimigoInternal gate so ALL users see the button (used by TripboardPage). */
    onCreateTripboardOverride?: () => void
    /** Pre-fetched itinerary agent ID. When provided, skips the internal agent query.
     *  Used by TripboardPage which already fetches this agent ID. */
    agentIdOverride?: string
    showCreateTripboardBtn?: boolean
    /** Notify parent when user enters/exits recreate mode. */
    onRecreateModeChange?: (isInRecreateMode: boolean) => void
    /**
     * Lets the host (e.g. TripboardPage) trigger Recreate from its own
     * header chrome. We own the handler because it manipulates local
     * state — register on mount, clear on unmount. The handler stays
     * stable; it reads the latest `handleRetry` through a ref.
     */
    onRegisterRecreate?: (handler: (() => void) | null) => void
    /**
     * Same pattern as onRegisterRecreate, but for the Share Itinerary
     * modal — only useful for internal users, which the caller gates
     * on by choosing whether to register.
     */
    onRegisterShareItinerary?: (handler: (() => void) | null) => void
    /** Called when mobile itinerary switches between list and map view */
    onMobileViewChange?: (view: 'list' | 'map') => void
    /** True when this Itinerary instance is the visible tab. When a
     *  Tripboard host keeps Itinerary mounted across tab switches,
     *  pass `false` on non-Itinerary tabs so we skip publishing the
     *  rail icons (and clear any we'd already published). Defaults
     *  to `true` for standalone use. */
    isActive?: boolean
}

const KANBAN_PLACEMENT_GAP_MS = 15 * 60 * 1000

function kanbanDaySlotVisible(ev: any): boolean {
    const isCustom = ev.type === 'custom' || ev.kind === 'custom'
    const hasNoTime = !ev.start && !ev.end
    return !(isCustom && hasNoTime)
}

function sortKanbanDayEventsForPlacement(list: any[]): any[] {
    return [...list].sort((a, b) => {
        const aStart = a.start ? new Date(a.start).getTime() : new Date(a.start_time || 0).getTime()
        const bStart = b.start ? new Date(b.start).getTime() : new Date(b.start_time || 0).getTime()
        if (aStart !== bStart) return aStart - bStart
        return (a.order ?? a.slotIndex ?? 0) - (b.order ?? b.slotIndex ?? 0)
    })
}

function getKanbanEventDurationMs(ev: any): number {
    const s = ev.start || ev.start_time
    const e = ev.end || ev.end_time
    if (s && e) {
        const ms = new Date(e).getTime() - new Date(s).getTime()
        if (ms > 0) return ms
    }
    if (ev.duration_minutes) return ev.duration_minutes * 60 * 1000
    return 60 * 60 * 1000
}

/** PUT payload from flat kanban event — aligned with calendar `buildUpdateSlotPayload` */
function buildKanbanPutPayloadFromKanbanEvent(ev: any, startIso: string, endIso: string): any {
    const kind = ev.kind
    const slot_data = ev.slot_data ?? ev.slotData
    const suggestion_reasons = ev.suggestion_reasons ?? []
    const attachments = ev.attachments ?? []
    const title = ev.title

    const payload: any = {
        kind,
        start_time: startIso,
        end_time: endIso,
        suggestion_reasons,
        attachments
    }

    const TRANSPORT_KINDS = ['flight', 'train', 'bus', 'transfer', 'car', 'taxi', 'shuttle', 'boat', 'ferry']

    if (TRANSPORT_KINDS.includes(kind)) {
        if (slot_data) payload.slot_data = slot_data
        if (title) payload.title = title
        if (ev.notes) payload.notes = ev.notes
        if (ev.estimated_cost !== undefined && ev.estimated_cost !== null) {
            payload.estimated_cost = ev.estimated_cost
            payload.currency = ev.currency || 'INR'
        }
    } else if (kind === 'experience' || kind === 'visit') {
        if (ev.entity_id) payload.entity_id = ev.entity_id
        if (ev.entity_model) payload.entity_model = ev.entity_model
    } else if (kind === 'meal') {
        if (title) payload.title = title
    } else if (kind === 'custom') {
        if (title) payload.title = title
        if (ev.notes) payload.notes = ev.notes
    } else {
        if (title) payload.title = title
        if (ev.notes) payload.notes = ev.notes
    }

    return payload
}

function arrayMoveItineraryDays<T>(arr: T[], from: number, to: number): T[] {
    const n = arr.length
    if (n < 2 || from < 0 || to < 0 || from >= n || to > n) return [...arr]
    if (from === to) return [...arr]
    const next = [...arr]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    return next
}

function toUtcYmdFromStored(dateStr: string): string {
    const d = new Date(dateStr)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function utcYmdStartMs(ymd: string): number {
    return Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), 0, 0, 0, 0)
}

function remapSlotIsoToNewDay(iso: string, fromYmd: string, toYmd: string): string {
    const fromMs = utcYmdStartMs(fromYmd)
    const toMs = utcYmdStartMs(toYmd)
    const t = new Date(iso).getTime()
    return new Date(toMs + (t - fromMs)).toISOString()
}

function formatDayDateForStore(ymd: string, template: string): string {
    if (template && template.includes('T')) {
        return `${ymd}T00:00:00.000Z`
    }
    return ymd
}

function computeReorderedItineraryDays(days: any[], from: number, to: number): any[] | null {
    if (!days?.length || from === to) return null
    if (from < 0 || to < 0 || from >= days.length || to > days.length) return null

    const template = typeof days[0]?.date === 'string' ? days[0].date : ''
    const clone = days.map((d) => ({
        ...d,
        slots: Array.isArray(d.slots) ? d.slots.map((s: any) => ({ ...s })) : d.slots,
        _kanbanColumnKey: assignKanbanColumnKeyForReorder(d)
    }))
    const moved = arrayMoveItineraryDays(clone, from, to)
    const chronological = [...days].map((d) => toUtcYmdFromStored(d.date)).sort()

    return moved.map((row, i) => {
        const targetYmd = chronological[i]
        const sourceYmd = toUtcYmdFromStored(row.date)
        const newDateStr = formatDayDateForStore(targetYmd, template)
        if (sourceYmd === targetYmd) {
            return { ...row, date: newDateStr }
        }
        const slots = Array.isArray(row.slots)
            ? row.slots.map((slot: any) => ({
                  ...slot,
                  start_time: slot.start_time ? remapSlotIsoToNewDay(slot.start_time, sourceYmd, targetYmd) : slot.start_time,
                  end_time: slot.end_time ? remapSlotIsoToNewDay(slot.end_time, sourceYmd, targetYmd) : slot.end_time
              }))
            : row.slots
        return { ...row, date: newDateStr, slots }
    })
}

function dayRowMetaDirty(prev: any | undefined, next: any): boolean {
    if (!prev) return true
    return (
        JSON.stringify(prev.base_city ?? null) !== JSON.stringify(next.base_city ?? null) ||
        prev.type !== next.type ||
        prev.is_checkout_day !== next.is_checkout_day ||
        prev.is_checkin_day !== next.is_checkin_day ||
        prev.overnight_transit !== next.overnight_transit ||
        // Day-reorder carries stay_id along with the moved content so the
        // backend's reconcile pre-pass can expand the referenced stay to
        // cover the new position. Treat a stay_id difference as dirty so
        // the update_day call flushes it.
        (prev.stay_id ?? null) !== (next.stay_id ?? null)
    )
}

/** Remapped day indices that receive slot or day-meta writes during a day reorder (per-column loaders). */
function computeKanbanDayReorderBusyDayIndices(
    beforeDays: any[],
    remapped: any[],
    chronological: string[],
    slotMutations: { slotId: string; payload: any }[]
): number[] {
    const indices = new Set<number>()
    const slotIdToDayIndex = new Map<string, number>()
    remapped.forEach((day, idx) => {
        for (const s of day.slots || []) {
            if (s?.slot_id) slotIdToDayIndex.set(s.slot_id, idx)
        }
    })
    for (const m of slotMutations) {
        const idx = slotIdToDayIndex.get(m.slotId)
        if (idx !== undefined) indices.add(idx)
    }
    for (let i = 0; i < remapped.length; i++) {
        const ymd = chronological[i]
        const desired = remapped[i]
        const prev = beforeDays.find((d) => toUtcYmdFromStored(d.date) === ymd)
        if (dayRowMetaDirty(prev, desired)) indices.add(i)
    }
    return [...indices].sort((a, b) => a - b)
}

function computeKanbanPlacementResult(
    prev: any[],
    payload: KanbanPlacementCommitPayload
): { next: any[]; mutations: { slotId: string; payload: any }[] } {
    const { event, targetDayIndex, insertIndex, newStartIso, newEndIso } = payload
    const slotId = event.slot_id
    if (!slotId) {
        return { next: prev, mutations: [] }
    }

    const slotById = new Map(prev.map((e) => [e.slot_id, e]))

    const targetBase = sortKanbanDayEventsForPlacement(
        prev.filter((e) => e.dayIndex === targetDayIndex && kanbanDaySlotVisible(e) && e.slot_id !== slotId)
    )
    const reordered = [...targetBase]
    reordered.splice(insertIndex, 0, { ...event, dayIndex: targetDayIndex })

    let durationMs = new Date(newEndIso).getTime() - new Date(newStartIso).getTime()
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        durationMs = getKanbanEventDurationMs(event)
    }

    // Use the user's chosen time as the slot start exactly (no clamp to neighbours).
    const movedStartMs = new Date(newStartIso).getTime()
    const movedEndMs = movedStartMs + durationMs

    const updates = new Map<string, { start: string; end: string }>()
    updates.set(slotId, {
        start: new Date(movedStartMs).toISOString(),
        end: new Date(movedEndMs).toISOString()
    })

    let prevEnd = movedEndMs
    for (let i = insertIndex + 1; i < reordered.length; i++) {
        const ev = reordered[i]
        if (!ev?.slot_id || ev.slot_id === slotId) continue
        const dur = getKanbanEventDurationMs(ev)
        const ns = prevEnd + KANBAN_PLACEMENT_GAP_MS
        const ne = ns + dur
        updates.set(ev.slot_id, {
            start: new Date(ns).toISOString(),
            end: new Date(ne).toISOString()
        })
        prevEnd = ne
    }

    const mutations: { slotId: string; payload: any }[] = []
    updates.forEach((newTimes, changedSlotId) => {
        const originalEv = slotById.get(changedSlotId)
        if (!originalEv?.slot_id) return
        mutations.push({
            slotId: changedSlotId,
            payload: buildKanbanPutPayloadFromKanbanEvent(originalEv, newTimes.start, newTimes.end)
        })
    })

    mutations.sort((a, b) => {
        if (a.slotId === slotId) return -1
        if (b.slotId === slotId) return 1
        return 0
    })

    const next = prev.map((e) => {
        if (e.slot_id === slotId) {
            const u = updates.get(slotId)!
            return {
                ...e,
                dayIndex: targetDayIndex,
                start: u.start,
                end: u.end,
                start_time: u.start,
                end_time: u.end
            }
        }
        if (e.dayIndex === targetDayIndex) {
            const u = updates.get(e.slot_id)
            if (u) {
                return { ...e, start: u.start, end: u.end, start_time: u.start, end_time: u.end }
            }
        }
        return e
    })

    return { next, mutations }
}

// Auto-open the desktop wishlist the FIRST time the itinerary tab is opened in
// a given page session. Module-level so it survives Itinerary remounts (tab
// switches keep it alive, but a fresh page load resets it). After this, the
// user's manual open/close is respected.
let wishlistAutoOpenedThisSession = false

const Itinerary = ({
    itineraryIdOverride,
    embedded = false,
    readOnly = false,
    hideExactDates = false,
    activeTrip,
    showCloneButton = true,
    tripsData,
    onCreateTripboardOverride,
    agentIdOverride,
    showCreateTripboardBtn = true,
    onRecreateModeChange,
    onRegisterRecreate,
    onRegisterShareItinerary,
    onMobileViewChange,
    isActive = true
}: ItineraryProps) => {
    const isMobile = useIsMobile()
    // Mobile-only: the embedded (tripboard) shell reserves a fixed height for
    // the full chrome. When the trip-name row collapses on scroll the chrome
    // shrinks by ~56px, so we must shrink the reserved offset too — otherwise
    // a white gap opens at the bottom. Mirrors the chrome-collapse signal used
    // across the tripboard.
    const isChromeCollapsed = useHideOnScrollDown()
    const params = useParams<{ id?: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const itineraryDayParam = searchParams.get('itineraryDay')
    const itineraryMapParam = searchParams.get('itineraryMap')
    const itineraryBoardParam = searchParams.get('itineraryBoard')
    const isExternalIdView = !!params.id || !!itineraryIdOverride

    const [currentDayIndex, setCurrentDayIndex] = useState(0) // Track which day we're starting from
    const [events, setEvents] = useState<any[]>([])
    const eventsRef = useRef(events)
    const [tripStartDate, setTripStartDate] = useState<Date | null>(null)
    const [tripEndDate, setTripEndDate] = useState<Date | null>(null)
    const [totalTripDays, setTotalTripDays] = useState(0)
    const [highlightedSlots, setHighlightedSlots] = useState<Set<string>>(new Set())
    const [changedSlotBadges, setChangedSlotBadges] = useState<Set<string>>(new Set())

    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
    const [eventToDelete, setEventToDelete] = useState<any | null>(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [kanbanBulkActionModal, setKanbanBulkActionModal] = useState<
        { type: 'clear_day'; dayIndex: number; dayId: string; count: number } | { type: 'delete_day'; date: Date } | null
    >(null)
    const [lastItineraryId, setLastItineraryId] = useState<string | null>(null)
    // Track if we're in "recreate" mode so we can show a close button and restore the previous view
    const [recreatingFromItineraryId, setRecreatingFromItineraryId] = useState<string | null>(null)
    const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false)
    const [addDayDate, setAddDayDate] = useState<Date | null>(null)
    const [updateDayCity, setUpdateDayCity] = useState<CityListItem | null>(null)
    // Inline hotel picker drawer state. Set when the user clicks a
    // "+ Add stay" button on the kanban, or "Change hotel" on an
    // existing stay chip. ``currentStay`` flips the drawer into
    // Change mode (anchor card + filtered list + reframed header).
    const [stayPickerContext, setStayPickerContext] = useState<{
        cityId: string
        cityName: string
        checkIn: string
        checkOut: string
        currentStay?: ItineraryStay | null
    } | null>(null)
    const [isUpdateDayMode, setIsUpdateDayMode] = useState(false)
    const [updateDayNumber, setUpdateDayNumber] = useState<number | null>(null)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [shareButtonRect, setShareButtonRect] = useState<DOMRect | null>(null)
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)
    const [pendingCloneDate, setPendingCloneDate] = useState<Date | null>(null)
    const [pendingCloneTripId, setPendingCloneTripId] = useState<string | null>(null)
    const [isCloneWarningOpen, setIsCloneWarningOpen] = useState(false)
    const [cloneWarningStartDate, setCloneWarningStartDate] = useState<Date | null>(null)
    const [cloneWarningTripId, setCloneWarningTripId] = useState<string | null>(null)
    const [cloneWarningTripName, setCloneWarningTripName] = useState<string>('')
    const [cloneWarningHasExistingItinerary, setCloneWarningHasExistingItinerary] = useState(false)
    const { trackButtonClickCustom } = usePostHog()
    const [viewMode, setViewMode] = useState<ItineraryViewMode>('kanban')
    const [isWishlistOpen, setIsWishlistOpen] = useState(false)
    // SneakPeek opened from a wishlist row (desktop column).
    const [wishlistSneakPeekId, setWishlistSneakPeekId] = useState<string | null>(null)
    const { setRailExtra } = useSidebarContext()
    const [mobileItineraryTab, setMobileItineraryTabInternal] = useState<'list' | 'map'>('list')
    const setMobileItineraryTab = useCallback(
        (tab: 'list' | 'map') => {
            setMobileItineraryTabInternal(tab)
            onMobileViewChange?.(tab)
        },
        [onMobileViewChange]
    )
    const [selectedSlot, setSelectedSlot] = useState<{
        start: Date
        end: Date
        baseCity?: {
            id: string
            name: string
            country: string
        }
    } | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<{
        slot: any
        start: Date
        end: Date
        baseCity?: {
            id: string
            name: string
            country: string
        }
    } | null>(null)
    const [kanbanPendingPlacement, setKanbanPendingPlacement] = useState<KanbanPendingPlacement | null>(null)
    const [kanbanPlacementSavingSlotId, setKanbanPlacementSavingSlotId] = useState<string | null>(null)
    /** `null` = idle; non-null = save in progress (array lists day indices that show the column overlay). */
    const [kanbanDayReorderBusyIndices, setKanbanDayReorderBusyIndices] = useState<number[] | null>(null)
    const [kanbanEditPlacement, setKanbanEditPlacement] = useState<{
        sourceDayIndex: number
        targetDayIndex: number
        insertIndex: number
        event: any
    } | null>(null)

    // Get itinerary ID from props, URL params, or active trip
    const [itineraryId, setItineraryId] = useState<string | null>(() => {
        // If URL has an ID param, use that (for /itinerary/:id route)
        if (params.id) {
            return params.id
        }

        if (itineraryIdOverride) {
            return itineraryIdOverride
        }

        // Otherwise use active trip's itinerary ID
        return activeTrip?.tripItinerary?.id || null
    })

    // Get countries from trip
    const tripCountries = activeTrip?.tripProfile?.final_destination_countries || activeTrip?.final_destination_countries || []

    // Extract country IDs - handle both string array and object array formats
    const tripCountryIds = tripCountries
        .map((country) => {
            if (typeof country === 'string') {
                return country
            }
            return (country as { id?: string; name?: string })?.id || ''
        })
        .filter(Boolean)

    const firstCountry = tripCountries.length > 0 ? tripCountries[0] : null

    // Fetch all live countries to get country names from IDs
    const { data: allCountries } = useQuery<LocationResponse[]>({
        queryKey: ['prioritizedCountries'],
        queryFn: getPrioritizedCountries,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        enabled: !readOnly
    })

    // Fetch country itinerary status for all trip countries
    const { data: countryStatusData, isLoading: isLoadingCountryStatus } = useCountryItineraryStatus(
        tripCountryIds.length > 0 ? tripCountryIds : undefined
    )

    // Check if any country is live (has itinerary support)
    const isAnyCountryLive =
        tripCountryIds.length > 0 && countryStatusData?.data ? tripCountryIds.some((id) => countryStatusData.data[id] === true) : false

    const [interactionMeta, setInteractionMeta] = useState<{
        agentId: string
        threadId: string
        interactionId: string
    } | null>(null)

    // Store wizard city data so we can show images + map during generation loading
    const [generationCities, setGenerationCities] = useState<
        { name: string; image: string; lat: number; lng: number; nights: number; id?: string }[]
    >([])
    const [generationTotalDays, setGenerationTotalDays] = useState<number | undefined>(undefined)

    const [isRefetchingAfterCompletion, setIsRefetchingAfterCompletion] = useState(false)
    const hasCompletedGenerationRef = useRef(false)

    // Store wizard data for tripboard creation after itinerary completes
    const [lastWizardData, setLastWizardData] = useState<WizardSubmitData | null>(null)
    const tripboardCreation = useTripboardCreation()

    const today = new Date('2025-12-04')
    const columnWidth = 260
    const columns = useColumnCount(columnWidth, false)

    // Always fetch agent ID — needed for recreate even when embedded (e.g. inside TripboardPage).
    // Only skip when readOnly (viewer can't recreate) or override already provided.
    const { data: fetchedAgentId } = useQuery<string>({
        queryKey: ['itinerary-agent'],
        queryFn: () => getAgentBySpace('itinerary_agent'),
        enabled: !readOnly && !agentIdOverride,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })
    const experienceSmartSearchAgentId = agentIdOverride || fetchedAgentId
    const tripId = activeTrip?.trip_id ?? ''
    const itineraryIdForHooks = activeTrip?.tripItinerary?.id ?? ''

    const { mutate: updateSlotMutate, mutateAsync: updateSlotAsync } = useUpdateSlot(tripId, itineraryIdForHooks)

    const { mutate: deleteSlotMutate } = useDeleteSlot(tripId, itineraryIdForHooks)

    const { mutate: addDayMutate } = useAddItineraryDay(itineraryIdForHooks)
    const { mutate: updateDayMutate } = useUpdateItineraryDay(itineraryIdForHooks)
    const { mutate: deleteDayMutate } = useDeleteItineraryDay(itineraryIdForHooks)
    const { mutate: resetDayMutate } = useResetItineraryDay(itineraryIdForHooks)
    const { mutateAsync: switchDayMutateAsync } = useSwitchItineraryDay(itineraryIdForHooks)

    const {
        data: itineraryData,
        isLoading: isLoadingItinerary,
        // isFetching: isFetchingItinerary,
        isError: isItineraryError,
        error: itineraryError
    } = useItineraryCompletedData(itineraryId ?? '')

    // Route summary drives the per-day "where the traveller is sleeping"
    // label on the kanban / mobile day headers. Keyed by the day's ISO
    // date so both views can look up by ``day.date`` without coupling to
    // ``day_number`` ordering. ``sleep_city`` is null on overnight-
    // transit days; the views fall back to their base-city heuristic.
    //
    // **First / last day exception**: an overnight entry (Day 1) or
    // exit (Day N) flight legitimately leaves ``sleep_city`` null
    // because the traveller spent midnight on a plane. The base_city
    // heuristic would show only the origin side ("Tokyo" on a Delhi→
    // Tokyo entry, "Sapporo" on a Sapporo→Delhi exit) which hides the
    // journey. Surface the ``day_segment`` instead so the header reads
    // "Delhi → Tokyo" / "Sapporo → Delhi". Mid-trip overnight transits
    // keep falling through to the base_city heuristic.
    const { data: routeSummary, isLoading: isRouteSummaryLoading } =
        useItineraryRouteSummary(itineraryId ?? '')
    const sleepCityByDate = useMemo(() => {
        const map: Record<string, string> = {}
        const daysArr = routeSummary?.days || []
        const lastIdx = daysArr.length - 1
        for (let i = 0; i < daysArr.length; i++) {
            const d = daysArr[i]
            if (!d?.date) continue
            const key = String(d.date).slice(0, 10) // normalise to YYYY-MM-DD
            if (d.sleep_city?.name) {
                map[key] = d.sleep_city.name
            } else if ((i === 0 || i === lastIdx) && d.day_segment) {
                // Algorithm joins with ASCII " -> "; normalise to a
                // unicode arrow so the header visually matches the
                // existing routeFrom-arrow fallback. Pipeline:
                //   1. Split into hops.
                //   2. Pick first + middle + last (or keep all if ≤3).
                //   3. Drop consecutive case-insensitive duplicates —
                //      the middle pick can collide with first/last
                //      (e.g. "Osaka → Nara → Osaka → Bangalore" →
                //      [Osaka, Osaka, Bangalore]) and the backend's
                //      id-based dedup can also leak same-name/different-
                //      id pairs ("Tokyo → Tokyo → Kyoto").
                const raw = d.day_segment.split(/\s*->\s*/).filter(Boolean)
                const picked =
                    raw.length <= 3
                        ? raw
                        : [raw[0], raw[Math.floor(raw.length / 2)], raw[raw.length - 1]]
                const out: string[] = []
                for (const p of picked) {
                    const prev = out[out.length - 1]
                    if (!prev || prev.toLowerCase() !== p.toLowerCase()) out.push(p)
                }
                map[key] = out.join(' → ')
            }
        }
        return map
    }, [routeSummary])

    // Fetch shortlisted experiences once for all experience slots
    const { data: shortlistData } = useQuery({
        queryKey: ['shortlistedByTrip', tripId],
        queryFn: () =>
            getShortlistedByTrip({
                tripId: tripId,
                baseCityIds: '',
                page: 1,
                limit: 100
            }),
        enabled: !!tripId
    })

    // Create a lookup map of shortlisted experience IDs
    const shortlistedExperienceIds = useMemo(() => {
        if (!shortlistData?.results) return new Set<string>()
        const shortlistedIds = new Set<string>()
        shortlistData.results.forEach((result: any) => {
            const experienceId = result.experience?.id || result.experience_id
            if (experienceId && result.is_traveler_shortlisted) {
                shortlistedIds.add(experienceId)
            }
        })
        return shortlistedIds
    }, [shortlistData])

    // Country + base cities for the wishlist's "More places for you" recs.
    const wishlistCountryId = useMemo(
        () => (typeof firstCountry === 'string' ? firstCountry : (firstCountry as { id?: string } | null)?.id || null),
        [firstCountry]
    )
    const wishlistCityIds = useMemo(() => {
        const ids = new Set<string>()
        for (const day of itineraryData?.days ?? []) {
            const id = (day as { base_city?: { id?: string } }).base_city?.id
            if (id) ids.add(id)
        }
        return [...ids]
    }, [itineraryData])

    // "See all" / "Explore Activities" in the wishlist → Activities Explore tab.
    const handleWishlistSeeAllExplore = useCallback(() => {
        navigate('/tripboard?tab=experience')
    }, [navigate])

    // "Schedule with AI" → same prompt as the Shortlist tab's "Add with AI".
    const handleScheduleWithAI = useCallback(() => {
        // Multi-add: send every shortlisted experience id via
        // input_data.experience_ids so the BE schedules the known picks
        // without re-running search (the "+ Add" fast path, bulk variant).
        void triggerAssistantPrompt(buildScheduleShortlistPrompt(shortlistedExperienceIds.size), {
            skills: ['schedule_shortlisted'],
            experienceIds: [...shortlistedExperienceIds]
        })
    }, [shortlistedExperienceIds])

    // Experience ids already placed on the itinerary — powers the wishlist
    // row "Added" tick. Same match rule as ExperienceTab's
    // `itineraryDateByEntityId` (entity_model 'experiences' OR an
    // experience/tour/activity kind) so tour/activity-tagged slots still count.
    const itineraryExperienceIds = useMemo(() => {
        const ids = new Set<string>()
        for (const day of itineraryData?.days ?? []) {
            for (const slot of (day as { slots?: Array<{ entity_id?: string | null; entity_model?: string | null; kind?: string | null }> }).slots ?? []) {
                if (!slot.entity_id) continue
                const isExperienceSlot =
                    slot.entity_model === 'experiences' || slot.kind === 'experience' || slot.kind === 'tour' || slot.kind === 'activity'
                if (isExperienceSlot) ids.add(slot.entity_id)
            }
        }
        return ids
    }, [itineraryData])
    const isExperienceInItinerary = useCallback(
        (experienceId: string) => itineraryExperienceIds.has(experienceId),
        [itineraryExperienceIds]
    )

    // Wishlist "Add to itinerary" (three-dot) → opens the same day-picker modal
    // the Activities Shortlist tab uses, then hands the chosen day to the AI
    // concierge (mirrors ExperienceTab.handleConfirmAddToItinerary).
    const [addToItineraryTarget, setAddToItineraryTarget] = useState<{
        id: string
        name: string
        image?: string | null
    } | null>(null)
    const dayFitRecommendation = useExperienceFitRecommendation({
        experienceId: addToItineraryTarget?.id ?? null,
        tripId: tripId ?? null,
        enabled: !!addToItineraryTarget
    })
    const handleWishlistAddToItinerary = useCallback(
        (experienceId: string, experienceName: string, experienceImage?: string | null) => {
            setAddToItineraryTarget({ id: experienceId, name: experienceName, image: experienceImage ?? null })
        },
        []
    )
    const handleConfirmWishlistAddToItinerary = useCallback(
        ({ dayDate, dayNumber }: { dayDate: string; dayNumber: number }) => {
            const name = addToItineraryTarget?.name ?? 'this activity'
            const experienceId = addToItineraryTarget?.id
            setAddToItineraryTarget(null)
            // ``experienceIds`` rides input_data.experience_ids (the "+ Add"
            // fast path) so the BE adds the known experience without re-search.
            const prompt = `Add "${name}" to Day ${dayNumber} (${dayDate}) of my itinerary.`
            void triggerAssistantPrompt(prompt, experienceId ? { experienceIds: [experienceId] } : undefined)
        },
        [addToItineraryTarget]
    )

    // Map data for itinerary map view
    const {
        dayMapData,
        getMarkersForDay,
        isLoading: isMapLoading,
        primaryCityName,
        citySegments,
        cityMarkers,
        overviewRouteCoordinates,
        getDayRouteCoordinates
    } = useItineraryMapData(itineraryData?.days || [], itineraryData?.stays || [])

    /** Selected day in map view (day pills + sidebar scroll spy); also set when opening map from board/calendar. */
    const [mapSelectedDayIndex, setMapSelectedDayIndex] = useState(0)
    const itineraryMapRef = useRef<ItineraryMapViewHandle>(null)
    const mapDayPillsScrollRef = useRef<HTMLDivElement>(null)
    /** Deep link from collection/tripboard overview daily cards (mobile list scroll) */
    const [mobileScrollDayRequest, setMobileScrollDayRequest] = useState<number | null>(null)
    const handleMobileScrollDayConsumed = useCallback(() => setMobileScrollDayRequest(null), [])

    // Get role from itinerary data
    const userRole = itineraryData?.role
    const isViewingOwnItinerary = activeTrip?.tripItinerary?.id === itineraryId
    const isViewer = readOnly || (userRole === 'viewer' && !isViewingOwnItinerary)
    const canEdit = !readOnly && (userRole === 'owner' || userRole === 'invited' || isViewingOwnItinerary)

    // Task 1: first time the itinerary tab is opened this session, auto-open the
    // wishlist (desktop only — mobile lands on Day 1, see MobileItineraryView).
    // Gated to non-viewers since viewers have no wishlist column.
    useEffect(() => {
        if (!isActive || isMobile || isViewer) return
        if (wishlistAutoOpenedThisSession) return
        wishlistAutoOpenedThisSession = true
        setIsWishlistOpen(true)
    }, [isActive, isMobile, isViewer])
    const { isRimigoInternal } = useUserInfo()

    // Publish Itinerary-specific icons into the outer SideBarLayout's
    // collapsed 69px rail. Also runs when embedded inside Tripboard —
    // Tripboard doesn't publish its own rail today, so letting the
    // embedded Itinerary own the rail is what surfaces the Kanban /
    // Map / Heart icons on the Tripboard's Itinerary tab. Cleared on
    // unmount so other pages see a plain hamburger-only rail.
    //
    // `trackButtonClickCustom` comes from `usePostHog()` which returns
    // a new function reference on every render. Keeping it in the deps
    // array causes the effect to fire on every re-render — which calls
    // setRailExtra repeatedly, which re-renders SideBarLayout, which
    // cascades to TripboardPage via context, which creates a render
    // loop that prevents tab clicks from resolving. Cache the callback
    // in a ref so the effect only re-runs on actual prop changes.
    const trackRef = useRef(trackButtonClickCustom)
    useEffect(() => {
        trackRef.current = trackButtonClickCustom
    })
    useEffect(() => {
        // When Itinerary is mounted but not the visible tab (Tripboard
        // keeps us alive across tab switches), don't publish our
        // icons — the rail should read blank on Overview / Stays /
        // Activities. Still clears on unmount via the cleanup.
        if (!isActive) {
            setRailExtra(null)
            return
        }
        setRailExtra(
            <ItineraryRailIcons
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                    trackRef.current({
                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                        buttonName: POSTHOG_EVENTS.ITINERARY_VIEW_MODE_CLICK,
                        buttonAction: POSTHOG_ACTIONS.CLICK,
                        extra: {
                            view_mode: mode,
                            embedded,
                            read_only: readOnly
                        }
                    })
                    if (mode === 'map') setMapSelectedDayIndex(0)
                    setViewMode(mode)
                }}
                showCalendarTab={isRimigoInternal && !isViewer}
                shortlistCount={shortlistedExperienceIds.size}
                isViewer={isViewer}
                isWishlistOpen={isWishlistOpen}
                onWishlistToggle={(next) => {
                    trackRef.current({
                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                        buttonName: POSTHOG_EVENTS.ITINERARY_SIDEBAR_WISHLIST_TOGGLE,
                        buttonAction: POSTHOG_ACTIONS.CLICK,
                        extra: { is_open: next, shortlist_count: shortlistedExperienceIds.size }
                    })
                    setIsWishlistOpen(next)
                }}
            />
        )
        return () => setRailExtra(null)
    }, [
        isActive,
        embedded,
        readOnly,
        viewMode,
        isRimigoInternal,
        isViewer,
        isWishlistOpen,
        shortlistedExperienceIds.size,
        setRailExtra,
    ])

    // Embedded tripboard/overview: ?itineraryBoard=1 → board; ?itineraryDay=&itineraryMap=1 → map + day on desktop only; mobile always list scroll
    useEffect(() => {
        if (!embedded) return

        if (itineraryBoardParam === '1') {
            setSearchParams(
                (prev) => {
                    const n = new URLSearchParams(prev)
                    n.delete('itineraryBoard')
                    n.delete('itineraryDay')
                    n.delete('itineraryMap')
                    return n
                },
                { replace: true }
            )
            setViewMode('kanban')
            setMobileItineraryTab('list')
            setMapSelectedDayIndex(0)
            return
        }

        if (itineraryDayParam == null || itineraryDayParam === '') return
        if (!itineraryData?.days?.length) return

        const parsed = parseInt(itineraryDayParam, 10)
        if (!Number.isFinite(parsed)) {
            setSearchParams(
                (prev) => {
                    const n = new URLSearchParams(prev)
                    n.delete('itineraryDay')
                    n.delete('itineraryMap')
                    return n
                },
                { replace: true }
            )
            return
        }

        const idx = Math.max(0, Math.min(parsed, itineraryData.days.length - 1))
        const openMap = itineraryMapParam === '1'

        setSearchParams(
            (prev) => {
                const n = new URLSearchParams(prev)
                n.delete('itineraryDay')
                n.delete('itineraryMap')
                return n
            },
            { replace: true }
        )

        if (openMap && !isMobile) {
            setViewMode('map')
            setMapSelectedDayIndex(idx)
            return
        }

        setViewMode('kanban')
        setMobileItineraryTab('list')
        setMapSelectedDayIndex(0)

        if (isMobile) {
            setMobileScrollDayRequest(idx)
        } else {
            const scrollKanban = () => {
                const sc = document.getElementById('kanban-scroll-container')
                const col = sc?.querySelector<HTMLElement>(`[data-day-index="${idx}"]`)
                col?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
            }
            requestAnimationFrame(() => requestAnimationFrame(scrollKanban))
            window.setTimeout(scrollKanban, 350)
        }
    }, [
        embedded,
        itineraryBoardParam,
        itineraryDayParam,
        itineraryMapParam,
        itineraryData?.days?.length,
        isMobile,
        setSearchParams,
        setMobileItineraryTab
    ])

    // ── Voice agent navigation: change_view + scroll_to ─────────────────
    // The voice agent's navigate_ui tool dispatches `voice:navigate-ui`.
    // Tab switches + modal opens are handled by TripboardHeader; the
    // itinerary-local actions (view mode, scroll to a day/city) live here.
    useEffect(() => {
        const handler = (e: Event) => {
            const { action, target } = (e as CustomEvent).detail || {}
            if (!action || !target) return
            const t = String(target).toLowerCase()

            if (action === 'open_wishlist') {
                // Concierge ``open_experience_shortlist`` custom_action → open
                // the desktop "Your wishlist" panel.
                setIsWishlistOpen(true)
                return
            }

            if (action === 'change_view') {
                if (t === 'map') {
                    if (isMobile) {
                        setMobileItineraryTab('map')
                    } else {
                        setViewMode('map')
                        setMapSelectedDayIndex(0)
                    }
                } else if (t === 'calendar') {
                    setViewMode('calendar')
                } else if (t === 'kanban' || t === 'list' || t === 'board') {
                    setViewMode('kanban')
                    if (isMobile) setMobileItineraryTab('list')
                }
                return
            }

            if (action === 'scroll_to') {
                const days = itineraryData?.days || []
                if (!days.length) return

                let idx = -1
                const dayMatch = t.match(/day[_\s-]?(\d+)/)
                if (dayMatch) {
                    idx = parseInt(dayMatch[1], 10) - 1
                } else {
                    const cityQuery = t.replace(/^city[_\s-]?/, '').trim()
                    if (cityQuery) {
                        idx = days.findIndex((d) =>
                            (d?.base_city?.name || '').toLowerCase().includes(cityQuery))
                    }
                }
                if (idx < 0 || idx >= days.length) return

                setViewMode('kanban')
                if (isMobile) {
                    setMobileItineraryTab('list')
                    setMobileScrollDayRequest(idx)
                } else {
                    const scrollKanban = () => {
                        const sc = document.getElementById('kanban-scroll-container')
                        const col = sc?.querySelector<HTMLElement>(`[data-day-index="${idx}"]`)
                        col?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
                    }
                    requestAnimationFrame(() => requestAnimationFrame(scrollKanban))
                    window.setTimeout(scrollKanban, 350)
                }
            }
        }
        window.addEventListener('voice:navigate-ui', handler)
        return () => window.removeEventListener('voice:navigate-ui', handler)
    }, [itineraryData?.days, isMobile, setMobileItineraryTab])

    // Check if itinerary is in progress and resume polling
    useEffect(() => {
        // Only check if we don't already have interactionMeta set
        if (interactionMeta) return

        // Skip if generation already completed this session — the backend status
        // may still be 'in_progress' briefly after completion, which would
        // incorrectly re-trigger polling.
        if (hasCompletedGenerationRef.current) return

        // Check if itinerary status is in_progress and has interaction_id in metadata
        if (itineraryData?.status === 'in_progress' && itineraryData.metadata?.interaction_id && experienceSmartSearchAgentId) {
            const metadataInteractionId = itineraryData.metadata.interaction_id

            // Check if metadata has agent_id and thread_id, otherwise use defaults
            // The metadata should ideally contain all three IDs, but we handle partial data
            const agentId = itineraryData.metadata.agent_id || experienceSmartSearchAgentId
            const threadId = itineraryData.metadata.thread_id

            if (threadId) {
                // We have all required IDs, set interactionMeta directly
                setInteractionMeta({
                    agentId,
                    threadId,
                    interactionId: metadataInteractionId
                })
            } else {
                // If thread_id is missing, search through threads to find the one with this interaction
                const searchForInteraction = async () => {
                    try {
                        // Fetch threads for this agent, filtered by trip_id if available
                        const threadsResponse = await fetchThreads(agentId, 10, tripId, 'trip_id')
                        const threads = threadsResponse.data?.data || []

                        // Search through threads to find the one containing our interaction
                        for (const thread of threads) {
                            try {
                                const interactionsResponse = await fetchInteractions(agentId, thread.id)
                                const interactions = interactionsResponse.data?.data || []

                                // Check if any interaction matches our interaction_id
                                const matchingInteraction = interactions.find(
                                    (interaction: any) =>
                                        (interaction.id === metadataInteractionId || interaction.interaction_id === metadataInteractionId) &&
                                        interaction.output_status === 'in_progress'
                                )

                                if (matchingInteraction) {
                                    // Found it! Set interactionMeta with all required IDs
                                    setInteractionMeta({
                                        agentId,
                                        threadId: thread.id,
                                        interactionId: metadataInteractionId
                                    })
                                    return
                                }
                            } catch (error) {
                                // Continue searching other threads
                                toast.warning(`Failed to fetch interactions for thread ${thread.id}:`, {
                                    description: error instanceof Error ? error.message : 'Unknown error'
                                })
                            }
                        }

                        // If we reach here, we didn't find the interaction
                        toast.warning(`Could not find interaction ${metadataInteractionId} in any thread. Unable to resume polling.`)
                    } catch (error) {
                        toast.error('Failed to search for interaction to resume polling:', {
                            description: error instanceof Error ? error.message : 'Unknown error'
                        })
                    }
                }

                searchForInteraction()
            }
        }
    }, [itineraryData?.status, itineraryData?.metadata, experienceSmartSearchAgentId, interactionMeta, tripId])

    useEffect(() => {
        // If URL has an ID param, use that (don't override)
        if (params.id) {
            setItineraryId(params.id)
            return
        }

        if (itineraryIdOverride) {
            setItineraryId(itineraryIdOverride)
            return
        }

        // Otherwise use active trip's itinerary ID
        if (activeTrip?.tripItinerary?.id) {
            setItineraryId(activeTrip.tripItinerary.id)
        }
    }, [activeTrip?.tripItinerary?.id, itineraryIdOverride, params.id])

    // Replace your useEffect:
    const hasTrackedItineraryLoadRef = useRef(false)

    useEffect(() => {
        if (!itineraryData?.days?.length) return

        const transformedEvents = transformItineraryToEvents(itineraryData.days, highlightedSlots)
        setEvents(transformedEvents)

        if (!hasTrackedItineraryLoadRef.current) {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ITINERARY_INTERNAL_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_META_LOAD_BUTTON_NAME,
                buttonAction: POSTHOG_EVENTS.ITINERARY_META_LOAD_SUCCESS_ACTION,
                extra: {
                    itinerary_id: itineraryData.id
                }
            })

            hasTrackedItineraryLoadRef.current = true
        }

        const firstDay = new Date(itineraryData.days[0].date)
        const lastDay = new Date(itineraryData.days[itineraryData.days.length - 1].date)

        const isNewItinerary = lastItineraryId !== itineraryData.id
        const datesChanged = tripStartDate?.getTime() !== firstDay.getTime() || tripEndDate?.getTime() !== lastDay.getTime()

        if (isNewItinerary || datesChanged || !tripStartDate || !tripEndDate) {
            setTripStartDate(firstDay)
            setTripEndDate(lastDay)
            setTotalTripDays(itineraryData.days.length)
            setCurrentDayIndex(0)
            setLastItineraryId(itineraryData.id)

            hasTrackedItineraryLoadRef.current = false
        }

        if (isRefetchingAfterCompletion) {
            setIsRefetchingAfterCompletion(false)
            setInteractionMeta(null)
        }
    }, [itineraryData, highlightedSlots])

    useEffect(() => {
        eventsRef.current = events
    }, [events])

    const handleSlotSelect = (info: { start: Date; end: Date }) => {
        // Don't allow selecting slots if viewer
        if (isViewer) return

        const selectedDay = itineraryData?.days?.find((day: any) => {
            // Parse the day date as UTC
            const dayDate = new Date(day.date)

            const dayYear = dayDate.getUTCFullYear()
            const dayMonth = dayDate.getUTCMonth()
            const dayDay = dayDate.getUTCDate()

            const slotYear = info.start.getUTCFullYear()
            const slotMonth = info.start.getUTCMonth()
            const slotDay = info.start.getUTCDate()

            return dayYear === slotYear && dayMonth === slotMonth && dayDay === slotDay
        })

        setSelectedEvent(null)

        setSelectedSlot({
            start: info.start,
            end: info.end,
            baseCity: selectedDay?.base_city || undefined
        })

        setIsAddEventOpen(true)
    }

    const { mutate: sendItinerary, isPending: isSendingItinerary } = useSendItineraryRequest()

    // Calculate the actual start date based on current day index
    const startDate = useMemo(() => {
        if (!tripStartDate) return new Date('2025-12-07')
        const date = new Date(tripStartDate)
        date.setDate(date.getDate() + currentDayIndex)
        return date
    }, [tripStartDate, currentDayIndex])

    // Calculate the end date for the current view
    const endDate = useMemo(() => {
        if (!tripStartDate || !tripEndDate) return new Date()

        const viewEnd = new Date(startDate)
        viewEnd.setDate(viewEnd.getDate() + columns - 1)

        // Cap at trip end date
        return viewEnd > tripEndDate ? tripEndDate : viewEnd
    }, [startDate, columns, tripStartDate, tripEndDate])
    // Also update openEditEventModal to correctly pass base_city:
    const openEditEventModal = (event: any) => {
        // Don't allow editing if viewer
        if (isViewer) return

        setSelectedSlot(null) // ✅ Clear selectedSlot when editing

        setSelectedEvent({
            slot: {
                ...event.extendedProps,
                title: event.title
            },
            start: event.start!,
            end: event.end!,
            baseCity: event.extendedProps.baseCity || null
        })

        setIsAddEventOpen(true)
    }
    const handleCloseModal = () => {
        setIsAddEventOpen(false)
        setSelectedSlot(null)
        setSelectedEvent(null)
        setKanbanEditPlacement(null)
    }

    const shiftDates = (days: number) => {
        if (totalTripDays === 0) return

        // Scroll the visible container horizontally
        const scrollAmount = days * 260
        const containerId = viewMode === 'kanban' ? 'kanban-scroll-container' : 'calendar-root'
        const container = document.getElementById(containerId)
        if (container) {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }

        // Also update currentDayIndex for header labels
        let newIndex = currentDayIndex + days

        // Clamp to valid range
        if (newIndex >= totalTripDays) {
            newIndex = totalTripDays - 1
        } else if (newIndex < 0) {
            newIndex = 0
        }

        setCurrentDayIndex(newIndex)
    }

    // Timeout ref for highlight auto-clear (prevents race when called multiple times within 5s)
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [])

    // Auto-scroll during drag - throttled
    const lastScrollTimeRef = useRef<number>(0)
    const isDraggingRef = useRef<boolean>(false)
    const THROTTLE_MS = 300 // Throttle auto-scroll to every 300ms
    const EDGE_THRESHOLD = 100 // Pixels from edge to trigger auto-scroll

    // Handle mouse move during drag for auto-scrolling
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return

            const calendarEl = document.getElementById('calendar-root')
            if (!calendarEl) return

            const rect = calendarEl.getBoundingClientRect()
            const mouseX = e.clientX
            const relativeX = mouseX - rect.left
            const calendarWidth = rect.width

            const now = Date.now()
            const timeSinceLastScroll = now - lastScrollTimeRef.current

            // Check if near left edge (want to scroll left/backward)
            if (relativeX < EDGE_THRESHOLD && timeSinceLastScroll >= THROTTLE_MS) {
                // Scroll backward by 1 day
                shiftDates(-1)
                lastScrollTimeRef.current = now
            }
            // Check if near right edge (want to scroll right/forward)
            else if (relativeX > calendarWidth - EDGE_THRESHOLD && timeSinceLastScroll >= THROTTLE_MS) {
                // Scroll forward by 1 day
                shiftDates(1)
                lastScrollTimeRef.current = now
            }
        }

        document.addEventListener('mousemove', handleMouseMove)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
        }
    }, [shiftDates])

    // Track when dragging starts/stops by checking for dragging class on FullCalendar
    useEffect(() => {
        const checkDragging = () => {
            const calendarEl = document.getElementById('calendar-root')
            if (!calendarEl) return

            // Check if FullCalendar has a dragging class or element
            const draggingElement = calendarEl.querySelector('.fc-event-dragging')
            isDraggingRef.current = !!draggingElement
        }

        const interval = setInterval(checkDragging, 100) // Check every 100ms
        return () => clearInterval(interval)
    }, [])

    const visibleRange = useMemo(
        () => () => {
            // Show ALL trip days with horizontal scroll
            if (tripStartDate && tripEndDate) {
                const start = new Date(tripStartDate)
                const end = new Date(tripEndDate)
                end.setDate(end.getDate() + 1) // FullCalendar end is exclusive
                return { start, end }
            }
            const start = new Date(startDate)
            const end = new Date(start)
            end.setDate(end.getDate() + columns)
            return { start, end }
        },
        [tripStartDate, tripEndDate, startDate, columns]
    )

    const handleGenerateItinerary = (data: WizardSubmitData) => {
        if (!activeTrip || !experienceSmartSearchAgentId) {
            return
        }

        // Store wizard data for automated tripboard creation after itinerary completes
        setLastWizardData(data)
        tripboardCreation.reset() // Allow re-creation if retrying
        setRecreatingFromItineraryId(null) // Clear recreate mode — user committed to new generation

        // Store city data for the generation loader (images + names + geo for map)
        setGenerationCities(
            data.cities
                .filter((c) => c.image)
                .map((c) => {
                    const geo = data.cityGeoLocations?.find((g) => g.cityId === c.cityId)
                    return {
                        name: c.cityName || '',
                        image: c.image || '',
                        lat: geo?.lat ?? 0,
                        lng: geo?.lng ?? 0,
                        nights: typeof geo?.nights === 'number' ? geo.nights : 0,
                        id: c.cityId
                    }
                })
        )

        // Store total days for loader context
        {
            const s = data.startDate
            const e = data.endDate
            const d = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
            setGenerationTotalDays(d)
        }

        // Format cities_to_cover as array of objects with id, name and nights
        const citiesToCover = data.cities.map((c) => {
            const nightsInfo = data.cityGeoLocations?.find((g) => g.cityId === c.cityId)
            return {
                id: c.cityId,
                name: c.cityName || c.cityId,
                nights: nightsInfo?.nights ?? 'auto'
            }
        })

        // Get country information from trip
        const tripCountries = activeTrip?.final_destination_countries || activeTrip?.tripProfile?.final_destination_countries || []
        const firstCountry = tripCountries.length > 0 ? tripCountries[0] : null
        // Handle both string ID and object with id/name properties
        const countryId = typeof firstCountry === 'string' ? firstCountry : (firstCountry as { id?: string; name?: string })?.id || ''
        const countryName = typeof firstCountry === 'string' ? '' : (firstCountry as { id?: string; name?: string })?.name || ''

        const start = data.startDate
        const end = data.endDate
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const totalBudget = data.budget

        // Format starting and ending point
        const formatLocation = (location: Airport | null): string => {
            if (!location) return 'Bangalore, India' // fallback
            return `${location.city_name}, ${location.country_name}`
        }

        const startingPoint = formatLocation(data.startLocation)
        const endPoint = formatLocation(data.endLocation)

        // Format dietary restrictions - convert to lowercase and handle empty array
        const dietaryRestrictions =
            data.dietaryRestrictions.length > 0 ? data.dietaryRestrictions.map((d) => d.toLowerCase().replace(/\s+/g, '_')) : ['none']

        sendItinerary(
            {
                agentId: experienceSmartSearchAgentId,
                request: {
                    input_data: {
                        cities_to_cover: citiesToCover,
                        country_id: countryId,
                        country_name: countryName,
                        user_text_input: data.preferences,
                        total_days: totalDays,
                        group_setup: {
                            adults: data.groupSetup.adults,
                            children: data.groupSetup.children,
                            infants: data.groupSetup.infants
                        },
                        purpose: data.preferences,
                        total_budget: totalBudget,
                        starting_point: startingPoint,
                        start_date: start.toISOString().split('T')[0],
                        end_date: end.toISOString().split('T')[0],
                        end_point: endPoint,
                        dietary_restrictions: dietaryRestrictions
                    },
                    space: 'trip_itinerary',
                    thread_id: null,
                    trip_id: activeTrip.trip_id,
                    // entity id
                    entity_id: activeTrip.trip_id,
                    entity_type: 'trip_id'
                }
            },
            {
                onSuccess: (response) => {
                    const data = response?.data
                    if (!data) return

                    hasCompletedGenerationRef.current = false
                    setInteractionMeta({
                        agentId: data.agent_id,
                        threadId: data.thread_id,
                        interactionId: data.id
                    })
                    trackButtonClickCustom?.({
                        buttonPage: POSTHOG_PAGES.ITINERARY_INTERNAL_PAGE,
                        buttonName: POSTHOG_EVENTS.ITINERARY_META_CREATE_BUTTON_NAME,
                        buttonAction: POSTHOG_EVENTS.ITINERARY_META_CREATION_TRIGGERED_ACTION,
                        extra: {
                            interaction_id: data.id,
                            cities: citiesToCover,

                            start_date: startDate,
                            end_date: endDate,
                            total_days: totalDays,
                            budget: totalBudget,
                            group_type: data.groupSetup,
                            has_dietary_restrictions: dietaryRestrictions?.length > 0,
                            dietaryRestrictions: dietaryRestrictions
                        }
                    })
                },
                onError: () => {}
            }
        )
    }

    const queryClient = useQueryClient()

    // Hook to call /complete API when "View Changes" is clicked
    const handleViewChangeClick = useCallback(
        async (changes?: {
            days_updated?: number
            summaries?: string[]
            updated_slots_count?: number
            updated_slot_paths?: Array<{
                day_index: number
                slot_index: number
                path: string
                title?: string
                kind?: string
                change_type?: string
            }>
        }) => {
            const itineraryId = activeTrip?.tripItinerary?.id
            if (!itineraryId) return

            try {
                // Call the /complete API to get the updated itinerary (first response)
                await importCompletedItinerary(itineraryId)

                // Create a Set of highlighted slot IDs from the changes
                const highlightedSlotsSet = new Set<string>()
                if (changes?.updated_slot_paths && Array.isArray(changes.updated_slot_paths)) {
                    changes.updated_slot_paths.forEach((slotPath) => {
                        // Format: "dayIndex-slotIndex" to match transformItineraryToEvents format
                        const slotId = `${slotPath.day_index}-${slotPath.slot_index}`
                        highlightedSlotsSet.add(slotId)
                    })
                }

                // Set highlighted slots state
                setHighlightedSlots(highlightedSlotsSet)

                // Scroll to the first changed day
                if (changes?.updated_slot_paths && changes.updated_slot_paths.length > 0) {
                    const firstDayIndex = Math.min(...changes.updated_slot_paths.map((p) => p.day_index))
                    setCurrentDayIndex(firstDayIndex)

                    // Smooth-scroll the visible container to the right column
                    requestAnimationFrame(() => {
                        const containerId = viewMode === 'kanban' ? 'kanban-scroll-container' : 'calendar-root'
                        const container = document.getElementById(containerId)
                        if (container) {
                            // Each column is ~260px in kanban view
                            const scrollTarget = firstDayIndex * 260
                            container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
                        }
                    })
                }

                // Auto-clear highlights after 5 seconds
                clearTimeout(highlightTimeoutRef.current)
                highlightTimeoutRef.current = setTimeout(() => setHighlightedSlots(new Set()), 5000)

                // Invalidate the query to refresh the UI smoothly
                queryClient.invalidateQueries({
                    queryKey: ['itineraryCompleted', itineraryId]
                })
            } catch (error) {
                toast.error('Failed to refresh itinerary after viewing changes', {
                    description: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        },
        [activeTrip?.tripItinerary?.id, queryClient]
    )

    /**
     * Kanban day header — "+ Add stay" button click. Opens the inline
     * stay picker drawer for the clicked city, seeded with the city's
     * own block dates so the hotel list + modal land on the right
     * window straight away. Falls back to the Stays tab navigation
     * when we can't resolve a date range (shouldn't happen with a
     * well-formed itinerary).
     */
    const handleAddStay = useCallback(
        (cityId: string, dayDate?: string) => {
            if (!cityId) return
            const days = itineraryData?.days ?? []
            let cityName = ''

            // Build ordered list of contiguous unstayed blocks for this
            // city. Each block is a set of consecutive dates where
            // base_city matches and no stay is attached. When the user
            // clicks "+ Add stay" on Day 4-5 (the second Tokyo block),
            // ``dayDate`` tells us which block they meant.
            const allCityDates: string[] = []
            const contiguousBlocks: string[][] = []
            let currentBlock: string[] = []
            for (const d of days) {
                const bc = d?.base_city
                if (bc?.id && String(bc.id) === cityId) {
                    if (!cityName && bc.name) cityName = bc.name
                    const dateStr = d.date ? String(d.date).slice(0, 10) : ''
                    if (dateStr) {
                        allCityDates.push(dateStr)
                        currentBlock.push(dateStr)
                    }
                } else {
                    if (currentBlock.length > 0) {
                        contiguousBlocks.push(currentBlock)
                        currentBlock = []
                    }
                }
            }
            if (currentBlock.length > 0) contiguousBlocks.push(currentBlock)

            if (allCityDates.length === 0) {
                navigate(`/tripboard?tab=stays&stays_city=${cityId}`)
                return
            }

            // Find the block that contains the clicked day. Fall back
            // to the first block if ``dayDate`` isn't provided or
            // doesn't match (e.g. mobile / map view callers).
            let targetBlock = contiguousBlocks[0] ?? allCityDates
            if (dayDate) {
                const matched = contiguousBlocks.find((block) => block.includes(dayDate))
                if (matched) targetBlock = matched
            }

            targetBlock.sort()
            const checkIn = targetBlock[0]
            const last = targetBlock[targetBlock.length - 1]
            const next = new Date(`${last}T00:00:00Z`)
            next.setUTCDate(next.getUTCDate() + 1)
            const checkOut = next.toISOString().slice(0, 10)
            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_STAY_SELECT_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { city_id: cityId, city_name: cityName, check_in: checkIn, check_out: checkOut }
            })
            // Send the user to the Stays tab seeded with this city + date
            // range instead of opening the inline picker modal. When
            // embedded inside TripboardPage we stay on the same path and
            // flip `tab` so other query params (identifier, etc.) survive;
            // the standalone /itinerary route does a cross-page navigate.
            if (embedded) {
                const next = new URLSearchParams(searchParams)
                next.set('tab', 'stays')
                next.set('stays_city', cityId)
                next.set('stays_checkin', checkIn)
                next.set('stays_checkout', checkOut)
                setSearchParams(next)
            } else {
                navigate(`/tripboard?tab=stays&stays_city=${cityId}&stays_checkin=${checkIn}&stays_checkout=${checkOut}`)
            }
        },
        [embedded, itineraryData, navigate, searchParams, setSearchParams, trackButtonClickCustom]
    )

    /**
     * Kanban day header pill action — fired from the "Change" / "Remove"
     * menu on a hotel pill.
     *
     * - ``change``: open the same inline stay picker drawer Add Stay uses,
     *   pre-populated with the existing stay's city + date range. The old
     *   stay is **kept** until the user picks a replacement; reconcile's
     *   cheapest-wins per block resolves the duplication on save. Deleting
     *   up front would be destructive — the user hasn't committed yet.
     *
     * - ``remove``: actually delete the stay and refresh the itinerary
     *   so the pill disappears.
     */
    const handleStayAction = useCallback(
        async (action: 'remove' | 'change', stayId: string, cityId: string | null) => {
            const activeItineraryId = itineraryId || activeTrip?.tripItinerary?.id
            if (!activeItineraryId) return

            if (action === 'change') {
                const stay = (itineraryData?.stays ?? []).find((s) => s.stay_id === stayId)
                const targetCityId = stay?.city_id || cityId
                if (!targetCityId || !stay?.check_in_date || !stay?.check_out_date) {
                    if (targetCityId) {
                        navigate(`/tripboard?tab=stays&stays_city=${targetCityId}`)
                    }
                    return
                }
                let cityName = ''
                for (const d of itineraryData?.days ?? []) {
                    const bc = d?.base_city
                    if (bc?.id && String(bc.id) === targetCityId && bc.name) {
                        cityName = bc.name
                        break
                    }
                }
                trackButtonClickCustom({
                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                    buttonName: POSTHOG_EVENTS.ITINERARY_STAY_CHANGE_HOTEL_CLICK,
                    buttonAction: POSTHOG_ACTIONS.CLICK,
                    extra: { stay_id: stayId, hotel_name: stay.hotel_name, city_id: targetCityId, city_name: cityName }
                })
                setStayPickerContext({
                    cityId: targetCityId,
                    cityName,
                    checkIn: String(stay.check_in_date).slice(0, 10),
                    checkOut: String(stay.check_out_date).slice(0, 10),
                    currentStay: stay
                })
                return
            }

            // action === 'remove'
            const removingStay = (itineraryData?.stays ?? []).find((s) => s.stay_id === stayId)
            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_STAY_REMOVE_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { stay_id: stayId, hotel_name: removingStay?.hotel_name, city_id: cityId }
            })
            try {
                await deleteStayFromItinerary(activeItineraryId, stayId)
                await queryClient.invalidateQueries({
                    queryKey: ['itineraryCompleted', activeItineraryId]
                })
                // Bug 7 — invalidate budget so the Budget Tab picks up the
                // stay-delete recalc without a manual Recalculate click.
                await queryClient.invalidateQueries({
                    queryKey: ['tripBudget']
                })
                trackButtonClickCustom({
                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                    buttonName: POSTHOG_EVENTS.ITINERARY_STAY_REMOVED_SUCCESS,
                    buttonAction: POSTHOG_ACTIONS.CLICK,
                    extra: { stay_id: stayId, hotel_name: removingStay?.hotel_name, city_id: cityId }
                })
                toast.success('Hotel removed from itinerary')
            } catch (err) {
                const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not remove stay'
                toast.error(message)
            }
        },
        [itineraryId, activeTrip?.tripItinerary?.id, queryClient, navigate, itineraryData, trackButtonClickCustom]
    )

    // Navigate to a specific slot in the itinerary (from chat NavigationCard / ExplanationCard)
    const handleNavigateToSlot = useCallback((dayIndex: number, slotIndex: number) => {
        clearTimeout(highlightTimeoutRef.current)
        setCurrentDayIndex(dayIndex)
        const slotId = `${dayIndex}-${slotIndex}`
        setHighlightedSlots(new Set([slotId]))
        // Auto-clear highlight after 5 seconds
        highlightTimeoutRef.current = setTimeout(() => setHighlightedSlots(new Set()), 5000)
    }, [])

    // Send a structured message through the assistant (from AlternativesCarousel / DiscoveryMapPanel)
    // Concierge rebuild: structured intent metadata is wrapped into a
    // <selection>...</selection> envelope inline (replaces legacy task_data
    // shapes). All cards funnel through submitConciergeMessage.
    const handleSendAgentMessage = useCallback((message: string, metadata?: Record<string, any>) => {
        // Clear "Changed" badges when user sends a new interaction
        setChangedSlotBadges(new Set())
        if (metadata && Object.keys(metadata).length > 0) {
            void submitConciergeMessage(message, metadata)
        } else {
            void triggerAssistantPrompt(message)
        }
    }, [])

    const handleKanbanDayAssistant = useCallback(
        (args: {
            dayIndex: number
            dayNumber: number
            date: Date
            cityLabel: string
            intent: 'best_route' | 'shuffle' | 'find_activities' | 'custom'
            customMessage?: string
        }) => {
            if (isViewer || !canEdit) return
            setChangedSlotBadges(new Set())
            const dateStr = args.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            })
            const city = args.cityLabel.trim() || 'this destination'
            const dayContext = `Day ${args.dayNumber} (${dateStr}) in ${city}`
            let message: string
            if (args.intent === 'custom' && args.customMessage?.trim()) {
                // Typed input → the user already committed, so send it.
                message = `Regarding ${dayContext}: ${args.customMessage.trim()}`
                triggerAssistantPrompt(message, { day_index: args.dayIndex, scope: 'single_day' })
                return
            }
            // Suggestion buttons → open + prefill, let the user review/send.
            if (args.intent === 'find_activities') {
                message = `Plan activities and experiences for ${dayContext}. My day is empty — what would you recommend?`
            } else if (args.intent === 'best_route') {
                message = `What's the best route and order for my activities on ${dayContext}?`
            } else if (args.intent === 'shuffle') {
                message = `Suggest alternative activities or a shuffled order for ${dayContext}.`
            } else {
                message = `Help me plan ${dayContext}.`
            }
            prefillAssistantPrompt(message)
        },
        [isViewer, canEdit]
    )

    const handleKanbanSlotAssistant = useCallback(
        (args: {
            dayIndex: number
            dayNumber: number
            date: Date
            cityLabel: string
            event: any
            intent: 'detail' | 'alternate' | 'custom'
            customMessage?: string
        }) => {
            if (isViewer || !canEdit) return
            setChangedSlotBadges(new Set())
            const dateStr = args.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            })
            const city = args.cityLabel.trim() || 'this destination'
            const title = (args.event.title || 'this activity').trim()
            const slotContext = `"${title}" on Day ${args.dayNumber} (${dateStr}) in ${city}`
            const TRANSPORT_KINDS = ['flight', 'train', 'bus', 'transfer', 'car', 'taxi', 'shuttle', 'boat', 'ferry']
            const isTransportSlot =
                args.event.type === 'transport' ||
                TRANSPORT_KINDS.includes((args.event.kind || '').toString().toLowerCase())
            let message: string
            if (args.intent === 'custom' && args.customMessage?.trim()) {
                // Typed input → the user already committed, so send it.
                message = `Regarding ${slotContext}: ${args.customMessage.trim()}`
                const slotIdx = args.event.slotIndex ?? args.event.slot_index ?? args.event.order
                triggerAssistantPrompt(message, {
                    day_index: args.dayIndex,
                    ...(slotIdx !== undefined && slotIdx !== null ? { slot_index: slotIdx } : {}),
                    scope: 'single_slot'
                })
                return
            }
            // Suggestion buttons → open + prefill, let the user review/send.
            if (args.intent === 'alternate') {
                message = isTransportSlot
                    ? `Suggest alternative ways to make this transfer for ${slotContext}. Compare options like private car, taxi, ride-share, public transport, ferry/flight where relevant — including approximate cost, travel time, comfort, and any booking tips.`
                    : `Plan alternatives to ${slotContext}. Suggest similar or better options I could swap it with.`
            } else {
                message = isTransportSlot
                    ? `Tell me about this transfer for ${slotContext}. What's the route like, how long does it take, what does it typically cost, what should I watch out for (luggage, pickup point, traffic, scams), and any practical tips for a smooth trip.`
                    : `Plan my visit to ${slotContext}. Tell me what makes it worth doing, what to expect, and practical tips for the visit.`
            }
            prefillAssistantPrompt(message)
        },
        [isViewer, canEdit]
    )

    // Refresh the itinerary data (from DateShiftCard)
    const handleRefreshItinerary = useCallback(() => {
        const id = activeTrip?.tripItinerary?.id
        if (id) {
            queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', id] })
        }
    }, [activeTrip?.tripItinerary?.id, queryClient])

    const hooksConfig = useMemo(
        () => ({
            onViewChangeClick: handleViewChangeClick,
            onNavigateToSlot: handleNavigateToSlot,
            onSendAgentMessage: handleSendAgentMessage,
            onRefreshItinerary: handleRefreshItinerary
        }),
        [handleViewChangeClick, handleNavigateToSlot, handleSendAgentMessage, handleRefreshItinerary]
    )

    // Listen for viewChanges events from the assistant (bypasses broken hooksConfig chain)
    useEffect(() => {
        const handler = (e: Event) => {
            const changes = (e as CustomEvent).detail
            // Always switch to kanban for viewing changes — clearest UX
            setViewMode('kanban')
            if (changes) {
                // Persist "Changed" badges for the affected slots
                if (changes.updated_slot_paths && Array.isArray(changes.updated_slot_paths)) {
                    const badgeIds = new Set<string>(changedSlotBadges)
                    changes.updated_slot_paths.forEach((slotPath: { day_index: number; slot_index: number }) => {
                        badgeIds.add(`${slotPath.day_index}-${slotPath.slot_index}`)
                    })
                    setChangedSlotBadges(badgeIds)
                }
                // Small delay to let kanban render before scrolling
                setTimeout(() => handleViewChangeClick(changes), 300)
            }
        }
        window.addEventListener('rimigo:viewChanges', handler)
        return () => window.removeEventListener('rimigo:viewChanges', handler)
    }, [handleViewChangeClick, changedSlotBadges])

    // Listen for navigateToSlot events from the assistant (bypasses broken hooksConfig chain)
    useEffect(() => {
        const handler = (e: Event) => {
            const { dayIndex, slotIndex } = (e as CustomEvent).detail
            handleNavigateToSlot(dayIndex, slotIndex)
        }
        window.addEventListener('rimigo:navigateToSlot', handler)
        return () => window.removeEventListener('rimigo:navigateToSlot', handler)
    }, [handleNavigateToSlot])

    // Auto-highlight changed slots when navigation_action.highlight arrives
    // (from ActionRouter processing update responses — no "View Changes" click needed)
    const activeHighlight = useNavigationActionStore((s) => s.activeHighlight)
    useEffect(() => {
        if (!activeHighlight || !activeHighlight.targets?.length) return
        const badgeIds = new Set<string>()
        const highlightIds = new Set<string>()
        activeHighlight.targets.forEach((target) => {
            const slotId = `${target.day_index}-${target.slot_index}`
            badgeIds.add(slotId)
            highlightIds.add(slotId)
        })
        setChangedSlotBadges((prev) => {
            const merged = new Set(prev)
            badgeIds.forEach((id) => merged.add(id))
            return merged
        })
        setHighlightedSlots(highlightIds)
        // Auto-clear highlight ring after 5 seconds (badges persist until next user message)
        clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = setTimeout(() => setHighlightedSlots(new Set()), 5000)
    }, [activeHighlight])

    // Desktop: switch to map view when "View on Map" is clicked in SneakPeek
    const handleViewMapFromDesktop = useCallback(
        (_experienceId: string, dayIndex?: number) => {
            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_DESKTOP_CARD_VIEW_MAP_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    experience_id: _experienceId,
                    day_index: dayIndex ?? null,
                    is_mobile: isMobile
                }
            })
            if (dayIndex !== undefined) {
                setMapSelectedDayIndex(dayIndex)
            }
            setViewMode('map')
        },
        [isMobile, trackButtonClickCustom]
    )

    useEffect(() => {
        if (isRimigoInternal) return
        if (viewMode === 'calendar') setViewMode('kanban')
    }, [isRimigoInternal, viewMode])

    useEffect(() => {
        const n = itineraryData?.days?.length ?? 0
        if (n === 0) return
        setMapSelectedDayIndex((i) => Math.min(Math.max(0, i), n - 1))
    }, [itineraryData?.days?.length])

    const MAP_DAY_PILLS_SCROLL_OFFSET_PX = 40
    useEffect(() => {
        if (viewMode !== 'map') return
        const dateContainer = mapDayPillsScrollRef.current
        if (!dateContainer) return
        const selectedCard = dateContainer.querySelector<HTMLElement>(`[data-date-index="${mapSelectedDayIndex}"]`)
        if (!selectedCard) return
        const containerRect = dateContainer.getBoundingClientRect()
        const cardRect = selectedCard.getBoundingClientRect()
        const isInView = cardRect.left >= containerRect.left && cardRect.right <= containerRect.right
        if (!isInView) {
            dateContainer.scrollTo({
                left: dateContainer.scrollLeft + (cardRect.left - containerRect.left) - MAP_DAY_PILLS_SCROLL_OFFSET_PX,
                behavior: 'smooth'
            })
        }
    }, [viewMode, mapSelectedDayIndex])

    // Dynamic calendar column width — show 4.25 days visible (matching kanban)
    const VISIBLE_COLUMNS = 4.25
    const calendarRootRef = useRef<HTMLDivElement>(null)
    const [calColWidth, setCalColWidth] = useState(260)
    const calResizeObserverRef = useRef<ResizeObserver | null>(null)

    // Use a callback ref to attach ResizeObserver as soon as the element mounts
    const calendarRootCallbackRef = useCallback((node: HTMLDivElement | null) => {
        // Cleanup previous observer
        if (calResizeObserverRef.current) {
            calResizeObserverRef.current.disconnect()
            calResizeObserverRef.current = null
        }

        calendarRootRef.current = node

        if (node) {
            const measure = () => {
                const w = node.clientWidth
                if (w > 0) setCalColWidth(Math.floor(w / VISIBLE_COLUMNS))
            }
            measure()
            const ro = new ResizeObserver(measure)
            ro.observe(node)
            calResizeObserverRef.current = ro
        }
    }, [])

    const handleCreateTripboard = useCallback(() => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_HEADER_CREATE_TRIPBOARD_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                trip_id: activeTrip?.trip_id ?? null,
                tripboard_status: tripboardCreation.status,
                embedded,
                read_only: readOnly
            }
        })
        tripboardCreation.openModal()

        // If already completed or creating, just show the modal (don't re-trigger)
        if (tripboardCreation.status === 'completed' || tripboardCreation.status === 'creating') {
            return
        }

        // Need itinerary data + active trip to create
        if (!itineraryData || !activeTrip) return

        const countryName = typeof firstCountry === 'string' ? '' : (firstCountry as { id?: string; name?: string })?.name || ''

        // Build wizard data: prefer explicit wizard data, fall back to trip profile
        const tripProfile = activeTrip.tripProfile
        const days = itineraryData.days || []

        const startDate = lastWizardData ? lastWizardData.startDate.toISOString().split('T')[0] : days[0]?.date || ''

        const endDate = lastWizardData ? lastWizardData.endDate.toISOString().split('T')[0] : days[days.length - 1]?.date || ''

        const groupSetup = lastWizardData ? lastWizardData.groupSetup : tripProfile?.group_setup || { adults: 2, children: 0, infants: 0 }

        const stayBudgetRange = lastWizardData
            ? lastWizardData.stayBudgetRange
            : STAY_BUDGET_RANGE_MAP[(tripProfile?.budget_range as 'budget' | 'moderate' | 'premium') || 'moderate'] || { min: 3000, max: 8000 }

        const dietaryRestrictions = lastWizardData ? lastWizardData.dietaryRestrictions : []

        tripboardCreation.trigger({
            itineraryId: itineraryIdForHooks,
            tripId: activeTrip.trip_id,
            travelerId: activeTrip.owner_id,
            tripName: tripProfile?.trip_name || 'My Trip',
            countryIds: tripCountryIds,
            countryName,
            itineraryData,
            wizardData: {
                startDate,
                endDate,
                groupSetup: {
                    adults: groupSetup.adults,
                    children: groupSetup.children,
                    infants: groupSetup.infants
                },
                stayBudgetRange,
                dietaryRestrictions
            }
        })
    }, [
        lastWizardData,
        itineraryData,
        activeTrip,
        tripboardCreation,
        tripCountryIds,
        firstCountry,
        itineraryIdForHooks,
        trackButtonClickCustom,
        embedded,
        readOnly
    ])

    // ── Kanban drag & drop ────────────────────────────────────────────────────

    const handleKanbanPlacementCommit = useCallback(
        async (placementPayload: KanbanPlacementCommitPayload) => {
            if (isViewer || !canEdit) return
            if (!tripId || !itineraryIdForHooks) {
                toast.error('Cannot save', { description: 'Trip or itinerary is not ready.' })
                return
            }

            const prev = eventsRef.current
            const { next, mutations } = computeKanbanPlacementResult(prev, placementPayload)
            if (mutations.length === 0) return

            eventsRef.current = next
            setEvents(next)
            // Clear pending in the same commit as optimistic events so the list never repaints the pre-drop order.
            setKanbanPendingPlacement(null)
            setKanbanPlacementSavingSlotId(placementPayload.event.slot_id)

            try {
                for (const m of mutations) {
                    await updateSlotAsync(m)
                }
                trackButtonClickCustom({
                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_PLACEMENT_SAVE_SUCCESS,
                    buttonAction: POSTHOG_ACTIONS.PLACEMENT_SAVE,
                    extra: {
                        slot_id: placementPayload.event.slot_id,
                        source_day_index: placementPayload.sourceDayIndex,
                        target_day_index: placementPayload.targetDayIndex,
                        insert_index: placementPayload.insertIndex,
                        mutation_count: mutations.length
                    }
                })
            } catch {
                toast.error('Failed to update itinerary times', { description: 'Please try again.' })
                const cacheId = itineraryId || itineraryIdForHooks
                if (cacheId) {
                    await queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', cacheId] })
                }
            } finally {
                setKanbanPlacementSavingSlotId(null)
            }
        },
        [isViewer, canEdit, tripId, itineraryId, itineraryIdForHooks, updateSlotAsync, queryClient, trackButtonClickCustom]
    )

    const openKanbanCustomTime = useCallback(
        (args: KanbanCustomTimeOpenArgs) => {
            if (isViewer) return
            setKanbanEditPlacement({
                sourceDayIndex: args.sourceDayIndex,
                targetDayIndex: args.targetDayIndex,
                insertIndex: args.insertIndex,
                event: args.event
            })
            setSelectedSlot(null)
            setSelectedEvent({
                slot: { ...args.event, title: args.event.title },
                start: args.provisionalStart,
                end: args.provisionalEnd,
                baseCity: args.baseCity
            })
            setIsAddEventOpen(true)
        },
        [isViewer]
    )

    /** Calendar date in local time, offset by whole days from a column date (matches Add day modal / handleAddDay). */
    const kanbanNeighborCalendarDate = (columnDate: Date, deltaDays: number) => {
        const y = columnDate.getFullYear()
        const m = columnDate.getMonth()
        const day = columnDate.getDate()
        return new Date(y, m, day + deltaDays, 0, 0, 0, 0)
    }

    const runClearKanbanDaySlots = useCallback(
        (dayId: string) => {
            if (isViewer || !canEdit || !itineraryIdForHooks || !dayId) return
            resetDayMutate(dayId, {
                onSuccess: () => {
                    toast.success('Day cleared')
                },
                onError: (err) => {
                    toast.error('Failed to clear day', {
                        description: err instanceof Error ? err.message : 'Please try again.'
                    })
                }
            })
        },
        [isViewer, canEdit, itineraryIdForHooks, resetDayMutate]
    )

    const confirmKanbanBulkAction = useCallback(() => {
        if (!kanbanBulkActionModal) return
        if (kanbanBulkActionModal.type === 'clear_day') {
            const { dayId } = kanbanBulkActionModal
            setKanbanBulkActionModal(null)
            runClearKanbanDaySlots(dayId)
            return
        }
        if (kanbanBulkActionModal.type === 'delete_day') {
            const d = kanbanBulkActionModal.date
            if (!itineraryIdForHooks) {
                setKanbanBulkActionModal(null)
                return
            }
            setKanbanBulkActionModal(null)
            const ymd = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
            // Auto-backup before this destructive op (non-blocking — versioning
            // never gets in the user's way; failures only emit a console warn).
            ;(async () => {
                if (!tripId) return
                try {
                    const { saveTripboardVersion } = await import('@/api/tripboardVersionsApi')
                    const stamp = new Date().toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })
                    await saveTripboardVersion(tripId, {
                        name: `Backup · before deleting day · ${stamp}`,
                        note: `Saved automatically before removing ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`,
                    })
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('[Versioning] auto-save before delete-day failed', e)
                }
            })()
            deleteDayMutate(ymd, {
                onSuccess: () => {
                    toast.success('Day removed')
                },
                onError: (error) => {
                    console.error('Failed to delete day:', error)
                    toast.error('Failed to delete day', {
                        description: error instanceof Error ? error.message : 'Please try again.'
                    })
                }
            })
        }
    }, [kanbanBulkActionModal, deleteDayMutate, itineraryIdForHooks, runClearKanbanDaySlots, tripId])

    const handleKanbanDayMenuAction = useCallback(
        (action: 'add_day_before' | 'add_day_after' | 'clear_column' | 'delete_column', ctx: { dayIndex: number; dayNumber: number; date: Date }) => {
            if (isViewer || !canEdit) return

            const dayRow = itineraryData?.days?.[ctx.dayIndex]
            const dayCity = dayRow?.base_city || dayRow?.destination_city
            const cityListItem: CityListItem | null = dayCity ? { id: dayCity.id, name: dayCity.name } : null

            if (action === 'add_day_before') {
                const target = kanbanNeighborCalendarDate(ctx.date, -1)
                setAddDayDate(target)
                setUpdateDayCity(cityListItem)
                setIsUpdateDayMode(false)
                setUpdateDayNumber(null)
                setIsAddDayModalOpen(true)
                return
            }
            if (action === 'add_day_after') {
                const target = kanbanNeighborCalendarDate(ctx.date, 1)
                setAddDayDate(target)
                setUpdateDayCity(cityListItem)
                setIsUpdateDayMode(false)
                setUpdateDayNumber(null)
                setIsAddDayModalOpen(true)
                return
            }
            if (action === 'clear_column') {
                const slots = itineraryData?.days?.[ctx.dayIndex]?.slots || []
                const n = slots.map((s: { slot_id?: string }) => s.slot_id).filter(Boolean).length
                const rawDate = itineraryData?.days?.[ctx.dayIndex]?.date
                const dayId = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''
                if (!dayId) return
                if (n === 0) return
                setKanbanBulkActionModal({ type: 'clear_day', dayIndex: ctx.dayIndex, dayId, count: n })
                return
            }
            if (action === 'delete_column') {
                setKanbanBulkActionModal({ type: 'delete_day', date: ctx.date })
            }
        },
        [isViewer, canEdit, itineraryData?.days]
    )

    const handleKanbanDayReorder = useCallback(
        async (fromIndex: number, toIndex: number) => {
            if (readOnly || isViewer || !canEdit) return
            if (!tripId || !itineraryIdForHooks) {
                toast.error('Cannot reorder days', { description: 'Trip or itinerary is not ready.' })
                return
            }
            const days = itineraryData?.days
            if (!days?.length || days.length < 2) return

            const remapped = computeReorderedItineraryDays(days, fromIndex, toIndex)
            if (!remapped) return

            const chronological = [...days].map((d) => toUtcYmdFromStored(d.date)).sort()
            const reorderLoaderDayIndices = computeKanbanDayReorderBusyDayIndices(days, remapped, chronological, [])
            const cacheId = itineraryId || itineraryIdForHooks
            if (!cacheId) return

            const previousData = queryClient.getQueryData(['itineraryCompleted', cacheId])

            queryClient.setQueryData(['itineraryCompleted', cacheId], (old: any) => {
                if (!old) return old
                return { ...old, days: remapped }
            })

            setKanbanDayReorderBusyIndices(reorderLoaderDayIndices)
            try {
                const fromDayId = toUtcYmdFromStored(days[fromIndex].date)
                const toDayId = toUtcYmdFromStored(days[toIndex].date)
                if (fromDayId === toDayId) return

                await switchDayMutateAsync({
                    from_day_id: fromDayId,
                    to_day_id: toDayId
                })
                toast.success('Day order updated')
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Day reorder failed:', err)
                toast.error('Could not reorder days', {
                    description: err instanceof Error ? err.message : 'Please try again.'
                })
                if (previousData) {
                    queryClient.setQueryData(['itineraryCompleted', cacheId], previousData)
                } else {
                    await queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', cacheId] })
                }
            } finally {
                setKanbanDayReorderBusyIndices(null)
            }
        },
        [readOnly, isViewer, canEdit, tripId, itineraryIdForHooks, itineraryId, itineraryData?.days, queryClient, switchDayMutateAsync]
    )

    // Notify parent when recreate flow opens/closes (used by Tripboard to hide desktop floating AI input).
    useEffect(() => {
        onRecreateModeChange?.(Boolean(recreatingFromItineraryId))
    }, [recreatingFromItineraryId, onRecreateModeChange])

    // Ensure parent resets recreate mode if this view unmounts.
    useEffect(() => {
        return () => {
            onRecreateModeChange?.(false)
        }
    }, [onRecreateModeChange])

    // Expose the recreate handler to the outer host (TripboardHeader's
    // overflow dropdown). `handleRetry` is defined further down because
    // it closes over many local setters and would violate hooks rules if
    // promoted above the early returns. We keep a ref that the bottom of
    // the render path updates each pass; this effect registers a stable
    // wrapper that forwards to whatever's currently in the ref.
    const handleRetryRef = useRef<(() => void) | null>(null)
    useEffect(() => {
        if (!onRegisterRecreate) return
        const forward = () => handleRetryRef.current?.()
        onRegisterRecreate(forward)
        return () => onRegisterRecreate(null)
    }, [onRegisterRecreate])

    // Same pattern for the itinerary Share modal (used to be triggered
    // from HeaderCalender's 3-dot menu; now lives in TripboardHeader).
    const handleShareItineraryRef = useRef<(() => void) | null>(null)
    useEffect(() => {
        if (!onRegisterShareItinerary) return
        const forward = () => handleShareItineraryRef.current?.()
        onRegisterShareItinerary(forward)
        return () => onRegisterShareItinerary(null)
    }, [onRegisterShareItinerary])

    const handleMobileAddSlotForDay = useCallback(
        (dayIndex: number) => {
            if (isViewer || !canEdit) return
            if (!itineraryData?.days?.length || !tripStartDate) return
            const day = itineraryData.days[dayIndex]
            if (!day) return

            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_ADD_SLOT_BOTTOM_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { day_index: dayIndex, day_number: dayIndex + 1, surface: 'mobile_list' }
            })

            const start = new Date(day.date)
            start.setUTCHours(10, 0, 0, 0)
            const end = new Date(start)
            end.setUTCHours(11, 0, 0, 0)

            setSelectedEvent(null)
            setSelectedSlot({
                start,
                end,
                baseCity: day.base_city || undefined
            })
            setIsAddEventOpen(true)
        },
        [isViewer, canEdit, itineraryData?.days, tripStartDate, trackButtonClickCustom]
    )

    // Mock loader for UI dev: set MOCK_ITINERARY_LOADER in mocks/itineraryLoaderMock.ts
    if (MOCK_ITINERARY_LOADER) {
        return (
            <ItineraryGenerationLoader
                agentId=""
                threadId=""
                interactionId=""
                pollingInterval={5000}
                cities={[...MOCK_LOADER_CITIES]}
                totalDays={MOCK_LOADER_TOTAL_DAYS}
                tripName="My Trip"
                mockMode
                mockProgressDetails={MOCK_LOADER_PROGRESS_DETAILS as Parameters<typeof ItineraryGenerationLoader>[0]['mockProgressDetails']}
                mockOutputStatus="in_progress"
            />
        )
    }

    if (!readOnly && (interactionMeta || isRefetchingAfterCompletion)) {
        return (
            <ItineraryGenerationLoader
                agentId={interactionMeta?.agentId ?? ''}
                threadId={interactionMeta?.threadId ?? ''}
                interactionId={interactionMeta?.interactionId ?? ''}
                pollingInterval={5000}
                cities={generationCities}
                totalDays={generationTotalDays}
                tripName={activeTrip?.tripProfile?.trip_name ?? undefined}
                onComplete={async () => {
                    // When embedded in TripboardPage (itinerary recreate), do a full page
                    // reload so all tab data, section types, and collection queries refresh
                    // cleanly with the new itinerary content.
                    if (embedded) {
                        window.location.reload()
                        return
                    }

                    const itineraryId = activeTrip?.tripItinerary?.id
                    if (!itineraryId) return

                    hasCompletedGenerationRef.current = true
                    setItineraryId(itineraryId)
                    setIsRefetchingAfterCompletion(true)

                    // Replace the current history entry so browser back doesn't
                    // return to the create-itinerary wizard flow
                    navigate(`/itinerary/${itineraryId}`, { replace: true })

                    queryClient.invalidateQueries({
                        queryKey: ['itineraryCompleted', itineraryId]
                    })
                }}
                onError={() => {
                    setInteractionMeta(null)
                    setIsRefetchingAfterCompletion(false)
                }}
            />
        )
    }

    // Show loading screen while checking country status (only for default /itinerary flow)
    if (!isExternalIdView && isLoadingCountryStatus) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F7FF]">
                <LogoLoadingScreen />
            </div>
        )
    }

    // Show coming soon only on the default /itinerary flow when no trip country supports itinerary yet.
    // When viewing a specific itinerary (URL or Tripboard embed), never show this — country status may
    // still be loading briefly, which incorrectly made !isAnyCountryLive true and flashed Coming Soon.
    if (!isExternalIdView && tripCountryIds.length > 0 && !isAnyCountryLive) {
        return (
            <ItineraryComingSoonPage
                tripCountryIds={tripCountryIds}
                allCountries={allCountries}
                tripCountries={tripCountries}
            />
        )
    }

    const hasDays = itineraryData?.days && itineraryData.days.length > 0

    const handleCancelRecreate = () => {
        if (recreatingFromItineraryId) {
            setItineraryId(recreatingFromItineraryId)
            setRecreatingFromItineraryId(null)
        }
    }

    // Show landing overlay if country is live but no itinerary exists
    if (!isExternalIdView || !itineraryId || (!isLoadingItinerary && itineraryData && !hasDays)) {
        return (
            <div className="relative min-h-screen">
                {recreatingFromItineraryId && (
                    <button
                        type="button"
                        onClick={handleCancelRecreate}
                        className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-grey-5 transition-colors cursor-pointer">
                        <X
                            size={20}
                            className="text-grey-2"
                        />
                    </button>
                )}
                <CreateItineraryWizard
                    onSubmit={handleGenerateItinerary}
                    hideFloatingExpert
                    isSubmitting={isSendingItinerary}
                />
            </div>
        )
    }

    if (isLoadingItinerary || (!readOnly && isRefetchingAfterCompletion)) {
        // Embedded in the tripboard, the compass already showed while the itinerary
        // section resolved (ItineraryTabContent). Show the kanban skeleton here so the
        // tripboard flow reads compass → skeleton → content (no flip back to the compass).
        // Standalone /itinerary keeps the full-screen compass.
        if (embedded) {
            return <ViewContentCollectionLoading activeTab="itinerary" hideTabBar />
        }
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F7FF]">
                <LogoLoadingScreen />
            </div>
        )
    }

    if (isExternalIdView && isItineraryError) {
        toast.error('Failed to load itinerary', {
            description: itineraryError instanceof Error ? itineraryError.message : 'Unknown error'
        })
        return (
            <div className={embedded ? 'w-full py-10' : 'min-h-screen w-full flex items-center justify-center bg-[#F9F7FF]'}>
                <div className="text-center">
                    <p className="text-grey-2 font-manrope font-medium">Failed to load itinerary.</p>
                </div>
            </div>
        )
    }

    if (isExternalIdView && !hasDays) {
        return (
            <div className={embedded ? 'w-full py-10' : 'min-h-screen w-full flex items-center justify-center bg-[#F9F7FF]'}>
                <div className="text-center">
                    <p className="text-grey-2 font-manrope font-medium">Itinerary not available.</p>
                </div>
            </div>
        )
    }
    const handleRetry = () => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_RECREATE_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                trip_id: itineraryId,
                total_days: totalTripDays,
                was_viewer: isViewer
            }
        })
        // Store current itinerary ID so user can cancel and go back
        setRecreatingFromItineraryId(itineraryId)

        setItineraryId(null)
        setLastItineraryId(null) // 👈 Important!

        setEvents([])
        setTripStartDate(null)
        setTripEndDate(null)
        setTotalTripDays(0)
        setCurrentDayIndex(0)

        setInteractionMeta(null)
        setIsRefetchingAfterCompletion(false)

        // Reset tripboard so a fresh one can be created on next generation
        setLastWizardData(null)
        tripboardCreation.reset()
    }
    // Keep the ref fresh so the header's registered wrapper always invokes
    // the latest closure. Safe plain assignment — not a hook.
    handleRetryRef.current = isViewer ? null : handleRetry

    // Share Itinerary handler — fired from TripboardHeader's overflow
    // dropdown. Uses the same tracking + modal open as the old
    // HeaderCalender "Share" entry; anchorRect falls back to null (the
    // modal centers itself) since the old `[data-share-button]` element
    // lived on HeaderCalender and no longer exists.
    handleShareItineraryRef.current = readOnly
        ? null
        : () => {
              trackButtonClickCustom({
                  buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                  buttonName: POSTHOG_EVENTS.ITINERARY_SHARE_CLICK,
                  buttonAction: POSTHOG_ACTIONS.CLICK,
                  extra: {
                      trip_id: activeTrip?.trip_id ?? null,
                      surface: 'tripboard_header_overflow',
                  },
              })
              setShareButtonRect(null)
              setIsShareModalOpen(true)
          }

    // In your Itinerary.tsx, replace the buildUpdateSlotPayload function
    // and update both handleEventDrop and handleEventResize:

    const buildUpdateSlotPayload = (event: any) => {
        const { kind, entity_id, entity_model, attachments, slot_data, notes, estimated_cost, currency, suggestion_reasons } = event.extendedProps
        const title = event.title
        // Base payload with required fields
        const payload: any = {
            kind,
            start_time: event.start.toISOString(),
            end_time: event.end.toISOString(),
            suggestion_reasons: suggestion_reasons,
            attachments: attachments ?? []
        }

        // Check if this is a transport type (uses slot_data)
        const isTransportType = ['flight', 'train', 'bus'].includes(kind)

        if (isTransportType) {
            // For transport types: use slot_data structure
            if (slot_data) {
                payload.slot_data = slot_data
            }

            // Always include title for transport types
            if (title) {
                payload.title = title
            }

            // Add optional transport fields if they exist
            if (notes) payload.notes = notes
            if (estimated_cost !== undefined && estimated_cost !== null) {
                payload.estimated_cost = estimated_cost
                payload.currency = currency || 'INR'
            }
        } else if (kind === 'experience') {
            // For experience type: use entity_id and entity_model
            if (entity_id) payload.entity_id = entity_id
            if (entity_model) payload.entity_model = entity_model
        } else if (kind === 'meal') {
            if (title) payload.title = title
        } else if (kind === 'custom') {
            // For custom type: include title and notes
            if (title) payload.title = title
            if (notes) payload.notes = notes
        }

        return payload
    }

    const handleEventDrop = (info: EventDropArg) => {
        // Don't allow dragging if viewer
        if (isViewer) {
            info.revert()
            return
        }

        const { event } = info
        const slotId = event.extendedProps?.slot_id

        if (!slotId) {
            // console.error('Missing slotId on drop')
            info.revert()
            return
        }

        const payload = buildUpdateSlotPayload(event)

        // ✅ Optimistic UI update
        setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, start: event.start, end: event.end } : e)))

        updateSlotMutate(
            { slotId, payload },
            {
                onSuccess: () => {
                    // console.log('Slot updated after drag')
                },
                onError: () => {
                    // console.error('Failed to update slot on drop', err)
                    // ⛑ rollback FullCalendar internal state
                    info.revert()
                }
            }
        )
    }

    const handleEventResize = (info: EventResizeDoneArg) => {
        // Don't allow resizing if viewer
        if (isViewer) {
            info.revert()
            return
        }

        const { event } = info
        const slotId = event.extendedProps.slot_id

        if (!slotId) {
            toast.error('Missing slotId on resize')
            info.revert()
            return
        }

        const payload = buildUpdateSlotPayload(event)

        updateSlotMutate(
            {
                slotId,
                payload
            },
            {
                onSuccess: () => {
                    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, start: event.start, end: event.end } : e)))
                },
                onError: (err) => {
                    toast.error('Failed to update slot on resize', {
                        description: err instanceof Error ? err.message : 'Unknown error'
                    })
                    info.revert() // ⛑ rollback UI
                }
            }
        )
    }

    const handleDeleteEvent = (event: any) => {
        // Don't allow deleting if viewer
        if (isViewer) return

        setEventToDelete(event)
        setIsDeleteModalOpen(true)
    }
    const confirmDeleteEvent = () => {
        if (!eventToDelete) return
        // Desktop calendar events wrap fields in `extendedProps`
        const slotId = eventToDelete.extendedProps?.slot_id ?? eventToDelete.slot_id
        if (!slotId) {
            return
        }

        // ✅ Optimistic UI update
        setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id))

        deleteSlotMutate(
            { slotId },
            {
                onSuccess: () => {
                    setIsDeleteModalOpen(false)
                    setEventToDelete(null)
                },
                onError: (err) => {
                    console.error('Delete failed', err)

                    // ⛑ rollback
                    setEvents((prev) => [...prev, eventToDelete])
                    setIsDeleteModalOpen(false)
                    setEventToDelete(null)
                }
            }
        )
    }
    const cancelDeleteEvent = () => {
        setIsDeleteModalOpen(false)
        setEventToDelete(null)
    }
    const handleAddDay = (_position: number, columnDate: Date) => {
        // Don't allow adding days if viewer
        if (isViewer) return

        // The new day should default to the column date itself (not next day)
        // Normalize to local date at midnight to avoid timezone shifts
        // Get the local date string from columnDate to avoid UTC conversion issues
        const localYear = columnDate.getFullYear()
        const localMonth = columnDate.getMonth()
        const localDay = columnDate.getDate()

        // Create date at local midnight (no timezone conversion)
        const newDayDate = new Date(localYear, localMonth, localDay, 0, 0, 0, 0)

        // Try to find the day in itinerary data that matches the LEFT column (columnDate)
        const leftDay = itineraryData?.days?.find((day: any) => {
            const dayDate = new Date(day.date)

            // Compare using local date parts to avoid timezone issues
            const dayKey = [dayDate.getFullYear(), String(dayDate.getMonth() + 1).padStart(2, '0'), String(dayDate.getDate()).padStart(2, '0')].join(
                '-'
            )

            const columnKey = [
                columnDate.getFullYear(),
                String(columnDate.getMonth() + 1).padStart(2, '0'),
                String(columnDate.getDate()).padStart(2, '0')
            ].join('-')

            const isMatch = dayKey === columnKey
            return isMatch
        })

        // Prefer base_city, fall back to destination_city
        const dayCity = leftDay?.base_city || leftDay?.destination_city

        const cityListItem: CityListItem | null = dayCity
            ? {
                  id: dayCity.id,
                  name: dayCity.name
              }
            : null

        // For adding a new day, we are NOT in update mode, but we still want the city prefilled
        setUpdateDayCity(cityListItem)
        setIsUpdateDayMode(false)
        setUpdateDayNumber(null)

        // Default date in modal is the "next day" (column to the right)
        setAddDayDate(newDayDate)

        setIsAddDayModalOpen(true)
    }

    const handleConfirmAddDay = (city: CityListItem | null, selectedDate: Date) => {
        if (!selectedDate || !itineraryIdForHooks) return

        // Get country name from trip countries
        let countryName = ''
        if (city && tripCountries.length > 0) {
            // Get country name from trip countries
            if (typeof firstCountry === 'object' && firstCountry !== null) {
                countryName = (firstCountry as { id?: string; name?: string })?.name || ''
            }
        }

        // Format date as YYYY-MM-DD without timezone shift
        // Using local date parts instead of toISOString to avoid off-by-one errors
        const formattedDate = [
            selectedDate.getFullYear(),
            String(selectedDate.getMonth() + 1).padStart(2, '0'),
            String(selectedDate.getDate()).padStart(2, '0')
        ].join('-')

        if (isUpdateDayMode) {
            // Update existing day
            if (!city) return

            updateDayMutate(
                {
                    date: formattedDate,
                    payload: {
                        base_city: {
                            id: city.id,
                            name: city.name,
                            country: countryName
                        }
                    }
                },
                {
                    onSuccess: () => {
                        setIsAddDayModalOpen(false)
                        setAddDayDate(null)
                        setUpdateDayCity(null)
                        setIsUpdateDayMode(false)
                        setUpdateDayNumber(null)
                    },
                    onError: (error) => {
                        console.error('Failed to update day:', error)
                        // Still close the modal
                        setIsAddDayModalOpen(false)
                        setAddDayDate(null)
                        setUpdateDayCity(null)
                        setIsUpdateDayMode(false)
                        setUpdateDayNumber(null)
                    }
                }
            )
        } else {
            // Add new day
            if (!city) return

            addDayMutate(
                {
                    date: formattedDate,
                    base_city: {
                        id: city.id,
                        name: city.name,
                        country: countryName
                    },
                    type: 'stay', // Default type as per API example
                    is_checkout_day: false,
                    is_checkin_day: false,
                    overnight_transit: false
                },
                {
                    onSuccess: () => {
                        setIsAddDayModalOpen(false)
                        setAddDayDate(null)
                    },
                    onError: (error) => {
                        toast.error('Failed to add day:', {
                            description: error instanceof Error ? error.message : 'Unknown error'
                        })
                        // Still close the modal
                        setIsAddDayModalOpen(false)
                        setAddDayDate(null)
                    }
                }
            )
        }
    }

    // Clone itinerary handlers — `handleCloneClick` used to open the clone
    // modal from the Itinerary header's 3-dot menu. That menu has been
    // removed; the clone flow below stays wired so it can be reattached to
    // a new surface (e.g. TripboardHeader) without rebuilding the modal.
    const handleCloneConfirm = (startDate: Date, selectedTripId?: string) => {
        // For embedded + external view, use selected trip ID
        // Otherwise, use active trip ID
        const targetTripId = selectedTripId || activeTrip?.trip_id

        if (!targetTripId) {
            toast.error('No trip selected')
            return
        }

        // Check if user already has an itinerary for the target trip
        const targetTrip = tripsData?.trips?.find((t) => t.trip_id === targetTripId)
        const hasExistingItinerary = !!targetTrip?.tripItinerary?.id
        const targetTripName = targetTrip?.name || activeTrip?.name || 'your trip'

        setCloneWarningStartDate(startDate)
        setCloneWarningTripId(targetTripId)
        setCloneWarningTripName(targetTripName)
        setCloneWarningHasExistingItinerary(hasExistingItinerary)
        setIsCloneWarningOpen(true)
    }

    const handleCloneWarningConfirm = () => {
        if (!cloneWarningStartDate || !cloneWarningTripId) return

        setIsCloneWarningOpen(false)

        if (cloneWarningHasExistingItinerary) {
            // Store the date and trip ID, then show replace confirmation
            setPendingCloneDate(cloneWarningStartDate)
            setPendingCloneTripId(cloneWarningTripId)
            setIsCloneModalOpen(false)
            setIsReplaceModalOpen(true)
            return
        }

        // No existing itinerary, clone directly
        setIsCloneModalOpen(false)
        performClone(cloneWarningStartDate, cloneWarningTripId)
    }

    const handleCloneWarningCancel = () => {
        setIsCloneWarningOpen(false)
        setCloneWarningStartDate(null)
        setCloneWarningTripId(null)
        setCloneWarningHasExistingItinerary(false)
        setCloneWarningTripName('')
    }

    const performClone = async (startDate: Date, targetTripId?: string) => {
        const tripIdToUse = targetTripId || activeTrip?.trip_id

        if (!itineraryId || !tripIdToUse) {
            toast.error('Missing itinerary ID or trip ID')
            return
        }

        try {
            const payload: CloneItineraryPayload = {
                trip_id: tripIdToUse,
                start_date: startDate.toISOString()
            }

            await cloneItinerary(itineraryId, payload)
            toast.success('Itinerary cloned successfully!')

            // Redirect to /itinerary (without ID)
            navigate('/itinerary')
        } catch (error: any) {
            toast.error(error?.message || 'Failed to clone itinerary. Please try again.')
        } finally {
            setIsCloneModalOpen(false)
            setIsReplaceModalOpen(false)
            setPendingCloneDate(null)
            setPendingCloneTripId(null)
        }
    }

    const handleReplaceConfirm = () => {
        if (pendingCloneDate) {
            // Use the stored trip ID from the clone confirmation
            const tripIdToUse = pendingCloneTripId || activeTrip?.trip_id
            if (tripIdToUse) {
                performClone(pendingCloneDate, tripIdToUse)
            }
        }
    }

    const handleDeleteDay = () => {
        // Don't allow deleting days if viewer
        if (isViewer) return

        if (!addDayDate || !itineraryIdForHooks) return

        // Format date as YYYY-MM-DD without timezone shift
        const formattedDate = [
            addDayDate.getFullYear(),
            String(addDayDate.getMonth() + 1).padStart(2, '0'),
            String(addDayDate.getDate()).padStart(2, '0')
        ].join('-')

        deleteDayMutate(formattedDate, {
            onSuccess: () => {
                setIsAddDayModalOpen(false)
                setAddDayDate(null)
                setUpdateDayCity(null)
                setIsUpdateDayMode(false)
                setUpdateDayNumber(null)
            },
            onError: (error) => {
                console.error('Failed to delete day:', error)
                // Still close the modal even if deletion failed
                setIsAddDayModalOpen(false)
                setAddDayDate(null)
                setUpdateDayCity(null)
                setIsUpdateDayMode(false)
                setUpdateDayNumber(null)
            }
        })
    }

    return (
        <>
            {!embedded && <ReactHelmet title={`${activeTrip?.name || itineraryData?.trip?.name || 'Trip'} itinerary`} />}

            <div
                className="relative flex flex-col bg-grey-5 overflow-hidden"
                style={
                    embedded
                        ? {
                              // Tripboard mobile header is two rows (top bar + tabs), not desktop 72px only.
                              // Use dvh on mobile: 100vh is the *large* viewport (counts the area behind the
                              // browser toolbar), which creates a spurious scroll region that lets the sticky
                              // day-pills row slide up under the tripboard header.
                              //
                              // When the trip-name row collapses on scroll the chrome is ~56px shorter, so
                              // shrink the reserved offset to match — otherwise a white gap opens at the bottom.
                              height: isMobile ? (isChromeCollapsed ? 'calc(100dvh - 62px)' : 'calc(100dvh - 118px)') : 'calc(100vh - 72px)',
                              // Animate the height change in lockstep with the chrome's
                              // 500ms collapse. Snapping it instantly resized the inner
                              // scroller in one frame and killed scroll momentum
                              // ("stops mid-scroll"); easing it keeps the scroll smooth.
                              transition: isMobile ? 'height 500ms cubic-bezier(0.4, 0, 0.2, 1)' : undefined
                          }
                        : { height: '100vh' }
                }>
                <div
                    id="event-overlay-root"
                    className="fixed inset-0 z-9 pointer-events-none"
                />

                {!embedded && !readOnly && (
                    <>
                        <div className="relative shrink-0">
                            <SearchHeaderCalendar hooksConfig={hooksConfig} />
                            {/* Desktop only: SearchHeader (not rendered on mobile) */}
                            {/* Mobile share button — overlays top-right of header */}
                            {isMobile && !embedded && (
                                <button
                                    onClick={() => {
                                        trackButtonClickCustom({
                                            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                            buttonName: POSTHOG_EVENTS.ITINERARY_SHARE_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: {
                                                trip_id: activeTrip?.trip_id ?? null,
                                                surface: 'mobile_header'
                                            }
                                        })
                                        setIsShareModalOpen(true)
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden
                                    w-9 h-9 rounded-lg border border-grey-4
                                    flex items-center justify-center
                                    bg-white hover:bg-grey-5 transition-colors cursor-pointer z-[80]">
                                    <Share2
                                        size={16}
                                        className="text-grey-0"
                                    />
                                </button>
                            )}
                        </div>
                    </>
                )}
                {isMobile && !embedded && !readOnly && !(canEdit && !isViewer) && (
                    <div className="w-full shrink-0 border-y border-primary-default/20 bg-primary-default-12 py-1 text-center">
                        <p className="text-[11px] leading-4 font-medium text-primary-default font-red-hat-display">
                            Edit mode is available on desktop version
                        </p>
                    </div>
                )}
                {isMobile && itineraryData?.days ? (
                    <>
                        {/* Reserve bottom space so content doesn't sit under the overlay */}
                        <div className={`flex-1 flex flex-col min-h-0 ${mobileItineraryTab !== 'map' ? (embedded ? 'pb-2' : 'pb-28') : ''}`}>
                            <MobileItineraryView
                                days={itineraryData.days}
                                sleepCityByDate={sleepCityByDate}
                                sleepCityLoading={isRouteSummaryLoading}
                                stays={itineraryData?.stays || []}
                                onAddStay={(canEdit && !isViewer) || isRimigoInternal ? handleAddStay : undefined}
                                onStayAction={(canEdit && !isViewer) || isRimigoInternal ? handleStayAction : undefined}
                                highlightedSlots={highlightedSlots}
                                getMarkersForDay={getMarkersForDay}
                                getDayRouteCoordinates={getDayRouteCoordinates}
                                dayMapData={dayMapData}
                                primaryCityName={primaryCityName}
                                cityMarkers={cityMarkers}
                                overviewRouteCoordinates={overviewRouteCoordinates}
                                citySegments={citySegments}
                                onMobileTabChange={setMobileItineraryTab}
                                hideExactDates={hideExactDates}
                                events={events}
                                canEdit={canEdit}
                                isViewer={isViewer}
                                pendingPlacement={kanbanPendingPlacement}
                                onPendingPlacementChange={setKanbanPendingPlacement}
                                onPlacementCommit={handleKanbanPlacementCommit}
                                onOpenCustomPlacementTime={!isViewer && canEdit ? openKanbanCustomTime : undefined}
                                hidePlacementTimeUi={isAddEventOpen}
                                placementSavingSlotId={kanbanPlacementSavingSlotId}
                                onEditEvent={!isViewer && canEdit ? openEditEventModal : undefined}
                                onDeleteEvent={handleDeleteEvent}
                                shortlistedExperienceIds={shortlistedExperienceIds}
                                onViewMap={handleViewMapFromDesktop}
                                changedSlotBadges={changedSlotBadges}
                                scrollToDayIndexRequest={embedded ? mobileScrollDayRequest : null}
                                onScrollToDayRequestConsumed={embedded ? handleMobileScrollDayConsumed : undefined}
                                onAddSlotForDay={!isViewer && canEdit ? handleMobileAddSlotForDay : undefined}
                                onKanbanDayMenuAction={!isViewer && canEdit ? handleKanbanDayMenuAction : undefined}
                                onKanbanSlotAssistant={!readOnly && canEdit && !isViewer ? handleKanbanSlotAssistant : undefined}
                                wishlist={
                                    isViewer
                                        ? undefined
                                        : {
                                              tripId,
                                              countryId: wishlistCountryId,
                                              cityIds: wishlistCityIds,
                                              count: shortlistedExperienceIds.size,
                                              isInItinerary: isExperienceInItinerary,
                                              onAddToItinerary: canEdit ? handleWishlistAddToItinerary : undefined,
                                              onRowClick: (experienceId) => setWishlistSneakPeekId(experienceId),
                                              onScheduleWithAI: handleScheduleWithAI,
                                              onSeeAllExplore: handleWishlistSeeAllExplore,
                                              onExploreActivities: handleWishlistSeeAllExplore
                                          }
                                }
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Combined city route bar + action buttons in a single sticky row */}
                        <div className="flex min-w-0 items-center shrink-0 z-40 bg-white border-b border-feature-card-border">
                            {viewMode === 'map' && itineraryData?.days && itineraryData.days.length > 0 ? (
                                <div
                                    ref={mapDayPillsScrollRef}
                                    className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-3 py-2"
                                    style={{ scrollbarWidth: 'none' }}>
                                    {itineraryData.days.map((_day: unknown, index: number) => {
                                        const mapDayCount = itineraryData.days!.length
                                        const isActive = index === mapSelectedDayIndex
                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                data-date-index={index}
                                                onClick={() => {
                                                    trackButtonClickCustom({
                                                        buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                        buttonName: POSTHOG_EVENTS.ITINERARY_DESKTOP_MAP_DAY_PILL_CLICK,
                                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                                        extra: {
                                                            day_index: index,
                                                            total_days: mapDayCount
                                                        }
                                                    })
                                                    itineraryMapRef.current?.selectDayAndScrollTo(index)
                                                }}
                                                className={`shrink-0 cursor-pointer rounded-[32px] py-2 px-5 font-red-hat-display text-[14px] leading-[18px] tracking-[-0.56px] font-[645] whitespace-nowrap transition-colors ${
                                                    isActive
                                                        ? 'bg-grey-0 text-white hover:bg-grey-0'
                                                        : 'bg-grey-5 text-grey-0 hover:bg-grey-4'
                                                }`}>
                                                Day {index + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                viewMode !== 'map' &&
                                itineraryData?.days &&
                                itineraryData.days.length > 0 && (
                                    <CityRouteBar
                                        itineraryId={itineraryData.id}
                                        days={itineraryData.days}
                                        viewMode={viewMode}
                                    />
                                )
                            )}
                            {itineraryData?.days && itineraryData.days.length > 0 && (
                                <button
                                    onClick={() => {
                                        const next = viewMode === 'map' ? 'kanban' : 'map'
                                        trackRef.current({
                                            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                            buttonName: POSTHOG_EVENTS.ITINERARY_VIEW_MODE_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: { view_mode: next, embedded, read_only: readOnly }
                                        })
                                        if (next === 'map') {
                                            setMapSelectedDayIndex(0)
                                            setIsWishlistOpen(false)
                                        }
                                        setViewMode(next)
                                    }}
                                    className={`shrink-0 mr-2 px-4 py-1.5 rounded-full text-[12px] font-bold font-manrope transition-colors cursor-pointer ${
                                        viewMode === 'map'
                                            ? 'bg-grey-0 text-white'
                                            : 'bg-white text-grey-0 border border-grey-4 hover:bg-grey-5'
                                    }`}>
                                    {viewMode === 'map' ? 'Itinerary View' : 'Map View'}
                                </button>
                            )}
                            <HeaderCalender
                                isViewer={isViewer}
                                onCreateTripboard={
                                    onCreateTripboardOverride
                                        ? itineraryData?.days?.length
                                            ? onCreateTripboardOverride
                                            : undefined
                                        : isRimigoInternal && !isViewer && itineraryData?.days?.length
                                          ? handleCreateTripboard
                                          : undefined
                                }
                                tripboardStatus={tripboardCreation.status}
                                showCreateTripboardBtn={showCreateTripboardBtn}
                            />
                        </div>

                        <div className="relative flex w-full flex-1 min-h-0">
                            {/* Wishlist: absolute overlay on the left; the kanban shifts
                                right by the same width (leftInset) instead of being covered. */}
                            {!isViewer && (
                                <ItineraryWishlistColumn
                                    isOpen={isWishlistOpen}
                                    tripId={tripId}
                                    countryId={wishlistCountryId}
                                    cityIds={wishlistCityIds}
                                    isInItinerary={isExperienceInItinerary}
                                    onAddToItinerary={canEdit ? handleWishlistAddToItinerary : undefined}
                                    onRowClick={(experienceId) => setWishlistSneakPeekId(experienceId)}
                                    onScheduleWithAI={handleScheduleWithAI}
                                    onClose={() => setIsWishlistOpen(false)}
                                    onSeeAllExplore={handleWishlistSeeAllExplore}
                                    onExploreActivities={handleWishlistSeeAllExplore}
                                    onReadyMade={() => {}}
                                />
                            )}
                            {viewMode === 'map' ? (
                                <ItineraryMapView
                                    ref={itineraryMapRef}
                                    dayMapData={dayMapData}
                                    getMarkersForDay={getMarkersForDay}
                                    isLoading={isMapLoading}
                                    primaryCityName={primaryCityName}
                                    days={itineraryData?.days || []}
                                    stays={itineraryData?.stays || []}
                                    onAddStay={(canEdit && !isViewer) || isRimigoInternal ? handleAddStay : undefined}
                                    onStayAction={(canEdit && !isViewer) || isRimigoInternal ? handleStayAction : undefined}
                                    events={events}
                                    highlightedSlots={highlightedSlots}
                                    selectedDayIndex={mapSelectedDayIndex}
                                    onSelectedDayIndexChange={setMapSelectedDayIndex}
                                    getDayRouteCoordinates={getDayRouteCoordinates}
                                    hideExactDates={hideExactDates}
                                    canEdit={canEdit}
                                    isViewer={isViewer}
                                    pendingPlacement={kanbanPendingPlacement}
                                    onPendingPlacementChange={setKanbanPendingPlacement}
                                    onPlacementCommit={handleKanbanPlacementCommit}
                                    onOpenCustomPlacementTime={!isViewer && canEdit ? openKanbanCustomTime : undefined}
                                    hidePlacementTimeUi={isAddEventOpen}
                                    placementSavingSlotId={kanbanPlacementSavingSlotId}
                                    onEditEvent={!isViewer && canEdit ? openEditEventModal : undefined}
                                    onDeleteEvent={handleDeleteEvent}
                                    shortlistedExperienceIds={shortlistedExperienceIds}
                                    onViewMap={handleViewMapFromDesktop}
                                    changedSlotBadges={changedSlotBadges}
                                />
                            ) : viewMode === 'kanban' ? (
                                <DesktopKanbanView
                                    days={itineraryData?.days || []}
                                    sleepCityByDate={sleepCityByDate}
                                    sleepCityLoading={isRouteSummaryLoading}
                                    stays={itineraryData?.stays || []}
                                    onStayAction={(canEdit && !isViewer) || isRimigoInternal ? handleStayAction : undefined}
                                    onAddStay={(canEdit && !isViewer) || isRimigoInternal ? handleAddStay : undefined}
                                    events={events}
                                    startDate={startDate}
                                    columns={columns}
                                    tripStartDate={tripStartDate}
                                    pendingPlacement={kanbanPendingPlacement}
                                    onPendingPlacementChange={setKanbanPendingPlacement}
                                    onPlacementCommit={handleKanbanPlacementCommit}
                                    onOpenCustomPlacementTime={!isViewer && canEdit ? openKanbanCustomTime : undefined}
                                    hidePlacementTimeUi={isAddEventOpen}
                                    placementSavingSlotId={kanbanPlacementSavingSlotId}
                                    onEditEvent={!isViewer && canEdit ? openEditEventModal : undefined}
                                    onDeleteEvent={handleDeleteEvent}
                                    canEdit={canEdit}
                                    isViewer={isViewer}
                                    shortlistedExperienceIds={shortlistedExperienceIds}
                                    onDateCardClick={(dayData, date, cityListItem, dayNumber) => {
                                        if (dayData) {
                                            setAddDayDate(date)
                                            setUpdateDayCity(cityListItem)
                                            setIsUpdateDayMode(true)
                                            setUpdateDayNumber(dayNumber)
                                            setIsAddDayModalOpen(true)
                                        } else {
                                            setAddDayDate(date)
                                            setUpdateDayCity(null)
                                            setIsUpdateDayMode(false)
                                            setUpdateDayNumber(null)
                                            setIsAddDayModalOpen(true)
                                        }
                                    }}
                                    onAddSlot={(day, date) => {
                                        if (isViewer) return
                                        const start = new Date(date)
                                        start.setUTCHours(10, 0, 0, 0)
                                        const end = new Date(start)
                                        end.setUTCHours(11, 0, 0, 0)
                                        setSelectedEvent(null)
                                        setSelectedSlot({
                                            start,
                                            end,
                                            baseCity: day.base_city || undefined
                                        })
                                        setIsAddEventOpen(true)
                                    }}
                                    onMapClick={(dayIndex) => {
                                        trackButtonClickCustom({
                                            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                            buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_OPEN_MAP_FROM_COLUMN_CLICK,
                                            buttonAction: POSTHOG_ACTIONS.CLICK,
                                            extra: { day_index: dayIndex }
                                        })
                                        setMapSelectedDayIndex(dayIndex)
                                        setViewMode('map')
                                    }}
                                    onKanbanDayAssistant={handleKanbanDayAssistant}
                                    onKanbanSlotAssistant={!readOnly && canEdit && !isViewer ? handleKanbanSlotAssistant : undefined}
                                    onKanbanDayMenuAction={handleKanbanDayMenuAction}
                                    onKanbanDayReorder={!readOnly && canEdit && !isViewer ? handleKanbanDayReorder : undefined}
                                    onViewMap={handleViewMapFromDesktop}
                                    changedSlotBadges={changedSlotBadges}
                                    hideExactDates={hideExactDates}
                                    dayColumnsReorderBusyIndices={kanbanDayReorderBusyIndices}
                                    leftInset={!isViewer && isWishlistOpen ? WISHLIST_PANEL_WIDTH : 0}
                                />
                            ) : (
                                <div
                                    ref={calendarRootCallbackRef}
                                    className="flex-1 relative overflow-y-auto overflow-x-auto"
                                    id="calendar-root">
                                    <div style={{ minWidth: `${totalTripDays * calColWidth}px`, height: '100%' }}>
                                        {!readOnly && (
                                            <AddDayIndicator
                                                columns={totalTripDays || columns}
                                                columnWidth={calColWidth}
                                                startDate={tripStartDate || startDate}
                                                onAddDay={canEdit ? handleAddDay : () => {}}
                                            />
                                        )}
                                        <FullCalendar
                                            timeZone="UTC"
                                            scrollTime={{ hours: 7 }}
                                            scrollTimeReset={false}
                                            visibleRange={visibleRange}
                                            plugins={[timeGridPlugin, interactionPlugin]}
                                            initialView="timeGrid"
                                            headerToolbar={false}
                                            snapDuration="00:15:00"
                                            select={handleSlotSelect}
                                            editable={canEdit}
                                            eventStartEditable={canEdit}
                                            eventDurationEditable={canEdit}
                                            eventResizableFromStart={canEdit}
                                            droppable={canEdit}
                                            selectable={canEdit}
                                            dayHeaderContent={(args) => {
                                                const dayData = itineraryData?.days?.find((day: any) => {
                                                    const dayDate = new Date(day.date)
                                                    const dayYear = dayDate.getUTCFullYear()
                                                    const dayMonth = dayDate.getUTCMonth()
                                                    const dayDay = dayDate.getUTCDate()

                                                    const headerYear = args.date.getUTCFullYear()
                                                    const headerMonth = args.date.getUTCMonth()
                                                    const headerDay = args.date.getUTCDate()

                                                    return dayYear === headerYear && dayMonth === headerMonth && dayDay === headerDay
                                                })

                                                const dayIndex =
                                                    itineraryData?.days?.findIndex((day: any) => {
                                                        const dd = new Date(day.date)
                                                        return (
                                                            dd.getUTCFullYear() === args.date.getUTCFullYear() &&
                                                            dd.getUTCMonth() === args.date.getUTCMonth() &&
                                                            dd.getUTCDate() === args.date.getUTCDate()
                                                        )
                                                    }) ?? -1

                                                const dayCity = dayData?.base_city || dayData?.destination_city
                                                const cityListItem: CityListItem | null = dayCity
                                                    ? {
                                                          id: dayCity.id,
                                                          name: dayCity.name
                                                      }
                                                    : null

                                                return (
                                                    <DateCard
                                                        date={args.date}
                                                        isToday={args.date.toDateString() === today.toDateString()}
                                                        dayNumber={
                                                            tripStartDate
                                                                ? Math.floor(
                                                                      (args.date.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)
                                                                  ) + 1
                                                                : 1
                                                        }
                                                        cityName={dayCity?.name || null}
                                                        hideExactDates={hideExactDates}
                                                        onMapClick={
                                                            dayIndex >= 0
                                                                ? () => {
                                                                      trackButtonClickCustom({
                                                                          buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                                                          buttonName: POSTHOG_EVENTS.ITINERARY_CALENDAR_DAY_HEADER_MAP_CLICK,
                                                                          buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                          extra: { day_index: dayIndex }
                                                                      })
                                                                      setMapSelectedDayIndex(dayIndex)
                                                                      setViewMode('map')
                                                                  }
                                                                : undefined
                                                        }
                                                        onClick={() => {
                                                            if (isViewer) return

                                                            const dayNumber = tripStartDate
                                                                ? Math.floor(
                                                                      (args.date.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)
                                                                  ) + 1
                                                                : 1

                                                            if (dayData) {
                                                                setAddDayDate(args.date)
                                                                setUpdateDayCity(cityListItem)
                                                                setIsUpdateDayMode(true)
                                                                setUpdateDayNumber(dayNumber)
                                                                setIsAddDayModalOpen(true)
                                                            } else {
                                                                setAddDayDate(args.date)
                                                                setUpdateDayCity(null)
                                                                setIsUpdateDayMode(false)
                                                                setUpdateDayNumber(null)
                                                                setIsAddDayModalOpen(true)
                                                            }
                                                        }}
                                                    />
                                                )
                                            }}
                                            events={events}
                                            eventContent={(args: EventContentArg) => (
                                                <RenderEventContent
                                                    onDeleteClick={handleDeleteEvent}
                                                    {...args}
                                                    onEditClick={openEditEventModal}
                                                    canEdit={canEdit}
                                                    shortlistedExperienceIds={shortlistedExperienceIds}
                                                    onViewMap={handleViewMapFromDesktop}
                                                />
                                            )}
                                            eventDrop={handleEventDrop}
                                            eventResize={handleEventResize}
                                            eventMaxStack={3}
                                            eventOverlap={true}
                                            selectOverlap={true}
                                            slotEventOverlap={true}
                                            eventDidMount={(info: EventMountArg) => {
                                                const el = info.el
                                                el.style.background = 'transparent'
                                                el.style.border = 'none'
                                                el.style.left = '0px'
                                                el.style.right = '0px'
                                                el.style.width = '100%'
                                                el.style.marginRight = '0'
                                                el.style.marginLeft = '0'
                                            }}
                                            slotMinTime="05:00:00"
                                            slotMaxTime="24:00:00"
                                            allDaySlot={false}
                                            height="100%"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {!readOnly && tripId && (
                    <AddEventModal
                        shortlistedExpercience={shortlistData}
                        itineraryId={itineraryIdForHooks}
                        tripId={tripId}
                        isOpen={isAddEventOpen}
                        onClose={handleCloseModal}
                        start={selectedSlot?.start}
                        end={selectedSlot?.end}
                        baseCity={selectedSlot?.baseCity || selectedEvent?.baseCity} // 👈 FIXED
                        slot={selectedEvent?.slot} // 👈 NEW
                        onEditSaveSuccess={
                            kanbanEditPlacement
                                ? (saved) => {
                                      const ctx = kanbanEditPlacement
                                      setKanbanEditPlacement(null)
                                      void handleKanbanPlacementCommit({
                                          event: ctx.event,
                                          sourceDayIndex: ctx.sourceDayIndex,
                                          targetDayIndex: ctx.targetDayIndex,
                                          insertIndex: ctx.insertIndex,
                                          newStartIso: saved.start_time,
                                          newEndIso: saved.end_time
                                      })
                                  }
                                : undefined
                        }
                    />
                )}
                {!readOnly && isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-[360px]">
                            <h2 className="text-lg font-semibold text-grey-0 font-manrope">Delete this event?</h2>

                            <p className="text-sm text-grey-2 mt-2 font-medium font-manrope">This action cannot be undone.</p>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={cancelDeleteEvent}
                                    className="px-4 py-2 rounded-md border border-grey-4 text-grey-1 text-[14px] font-medium font-manrope cursor-pointer">
                                    Cancel
                                </button>

                                <button
                                    onClick={confirmDeleteEvent}
                                    className="px-4 py-2 rounded-md bg-secondary-red text-natural-white text-[14px] font-medium font-manrope cursor-pointer">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {!readOnly && kanbanBulkActionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl">
                            <h2 className="font-manrope text-lg font-semibold text-grey-0">
                                {kanbanBulkActionModal.type === 'clear_day' ? 'Remove all activities?' : 'Delete this day?'}
                            </h2>
                            <p className="mt-2 font-manrope text-sm font-medium text-grey-2">
                                {kanbanBulkActionModal.type === 'clear_day'
                                    ? `Remove all ${kanbanBulkActionModal.count} activit${
                                          kanbanBulkActionModal.count === 1 ? 'y' : 'ies'
                                      } from this day? This cannot be undone.`
                                    : 'Delete this day and all its activities? This cannot be undone.'}
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setKanbanBulkActionModal(null)}
                                    className="cursor-pointer rounded-md border border-grey-4 px-4 py-2 font-manrope text-[14px] font-medium text-grey-1">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmKanbanBulkAction}
                                    className="cursor-pointer rounded-md bg-secondary-red px-4 py-2 font-manrope text-[14px] font-medium text-natural-white">
                                    {kanbanBulkActionModal.type === 'clear_day' ? 'Remove all' : 'Delete day'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {!readOnly && (
                    <AddDayModal
                        isOpen={isAddDayModalOpen}
                        onClose={() => {
                            setIsAddDayModalOpen(false)
                            setAddDayDate(null)
                            setUpdateDayCity(null)
                            setIsUpdateDayMode(false)
                            setUpdateDayNumber(null)
                        }}
                        date={addDayDate || new Date()}
                        countryIds={tripCountryIds}
                        onConfirm={handleConfirmAddDay}
                        prefilledCity={updateDayCity}
                        isUpdateMode={isUpdateDayMode}
                        dayNumber={updateDayNumber}
                        onDelete={isUpdateDayMode ? handleDeleteDay : undefined}
                    />
                )}
                {!readOnly && (
                    <ShareItineraryModal
                        isOpen={isShareModalOpen}
                        onClose={() => {
                            setIsShareModalOpen(false)
                            setShareButtonRect(null)
                        }}
                        itineraryId={itineraryId || ''}
                        anchorRect={shareButtonRect}
                    />
                )}
                {isViewer && activeTrip?.trip_id && !isViewingOwnItinerary && showCloneButton && (
                    <>
                        {isCloneWarningOpen && (
                            <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
                                <div
                                    className="bg-white rounded-lg border border-feature-card-border shadow-lg w-full max-w-md"
                                    onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between p-6 border-b border-feature-card-border">
                                        <Typography
                                            size="18"
                                            weight="semibold"
                                            family="manrope"
                                            color="grey-0">
                                            Confirm clone
                                        </Typography>
                                        <button
                                            type="button"
                                            onClick={handleCloneWarningCancel}
                                            className="p-1 hover:bg-grey-5 rounded transition-colors"
                                            aria-label="Close">
                                            <X className="h-5 w-5 text-grey-2" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <Typography
                                            size="14"
                                            weight="medium"
                                            family="manrope"
                                            color="grey-0">
                                            You are about to clone this itinerary into{' '}
                                            <span className="font-semibold">{cloneWarningTripName || 'your trip'}</span>. Do you want to continue?
                                        </Typography>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 p-6 border-t border-feature-card-border">
                                        <button
                                            type="button"
                                            onClick={handleCloneWarningCancel}
                                            className="h-10 px-4 flex items-center justify-center rounded-md border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer">
                                            <div
                                                className="font-red-hat-display text-grey-1"
                                                style={{ fontWeight: 550, fontSize: '14px' }}>
                                                No
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloneWarningConfirm}
                                            className="h-10 px-4 flex items-center justify-center rounded-md bg-primary-default hover:bg-primary-light transition-colors cursor-pointer">
                                            <div
                                                className="font-red-hat-display text-natural-white"
                                                style={{ fontWeight: 550, fontSize: '14px' }}>
                                                Yes
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <CloneItineraryModal
                            isOpen={isCloneModalOpen}
                            onClose={() => {
                                setIsCloneModalOpen(false)
                                setPendingCloneDate(null)
                                setPendingCloneTripId(null)
                            }}
                            onConfirm={handleCloneConfirm}
                            hasExistingItinerary={!!activeTrip?.tripItinerary?.id}
                            isEmbeddedView={embedded && isExternalIdView}
                            isExternalIdView={isExternalIdView}
                            trips={tripsData?.trips || []}
                            onTripsUpdated={() => {
                                // Invalidate trips query to refresh the list
                                queryClient.invalidateQueries({
                                    queryKey: ['travelerTrips']
                                })
                            }}
                        />
                        <ReplaceConfirmationModal
                            isOpen={isReplaceModalOpen}
                            onClose={() => {
                                setIsReplaceModalOpen(false)
                                setPendingCloneDate(null)
                                setPendingCloneTripId(null)
                            }}
                            onConfirm={handleReplaceConfirm}
                        />
                    </>
                )}

                {/* Tripboard creation progress modal */}
                <TripboardProgressModal
                    open={tripboardCreation.showModal}
                    onClose={tripboardCreation.closeModal}
                    steps={tripboardCreation.steps}
                    status={tripboardCreation.status}
                    error={tripboardCreation.error}
                    identifier={tripboardCreation.identifier}
                    onRetry={handleCreateTripboard}
                />

                {/* Inline hotel list for the clicked city. Renders the
                 * same hotels as the Stays tab, fetched from the same
                 * underlying query cache. Each row shows banner +
                 * cheapest live rate + provider via
                 * useStayPriceAndDeals, and clicking any row opens the
                 * add-stay modal — no detour through the Stays tab. */}
                {stayPickerContext && (
                    <StayPickerModal
                        isOpen={!!stayPickerContext}
                        onClose={() => setStayPickerContext(null)}
                        cityId={stayPickerContext.cityId}
                        cityName={stayPickerContext.cityName}
                        checkIn={stayPickerContext.checkIn}
                        checkOut={stayPickerContext.checkOut}
                        tripId={tripId || undefined}
                        itineraryId={itineraryId || undefined}
                        currentStay={stayPickerContext.currentStay ?? null}
                    />
                )}

                {/* SneakPeek from a wishlist row — portaled to <body> to escape the column's stacking context. */}
                {wishlistSneakPeekId &&
                    typeof document !== 'undefined' &&
                    createPortal(
                        <SneakPeekModal
                            isOpen={!!wishlistSneakPeekId}
                            onClose={() => setWishlistSneakPeekId(null)}
                            experienceId={wishlistSneakPeekId}
                            tripId={tripId || undefined}
                        />,
                        document.body
                    )}

                {/* Wishlist three-dot → "Add to itinerary": same day-picker the
                    Activities Shortlist tab uses; confirm hands the day to the
                    AI concierge. */}
                <AddToItineraryDayModal
                    isOpen={!!addToItineraryTarget}
                    onClose={() => setAddToItineraryTarget(null)}
                    experienceName={addToItineraryTarget?.name ?? ''}
                    experienceImage={addToItineraryTarget?.image ?? null}
                    days={itineraryData?.days ?? []}
                    recommendation={dayFitRecommendation}
                    onAdd={handleConfirmWishlistAddToItinerary}
                />
            </div>
        </>
    )
}

export default Itinerary
