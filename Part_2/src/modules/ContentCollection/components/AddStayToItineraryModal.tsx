import React, { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { X, MapPin, Hotel, Compass, Loader2, CalendarRange, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import RimigoDateCalendar from '@/components/RimigoDateCalendar'
import { Button } from '@/components/ui/button'
import {
    addStayToItinerary,
    getCandidateBlocksForCity,
    type ItineraryCityBlock,
    type TripItinerary
} from '@/api/itineraryApi'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useItineraryCompletedData, useItineraryRouteSummary } from '@/modules/Itinerary/hooks/ItineraryHook'

interface ConflictingStay {
    stayId: string
    hotelName: string
    zentrumHubId: string
    isSameHotel: boolean
    /** Check-in as YYYY-MM-DD. */
    checkIn: string
    /** Exclusive check-out as YYYY-MM-DD (morning after last night). */
    checkOut: string
    /** True iff this stay's range fully covers the candidate block. */
    fullyCoversBlock: boolean
}

interface AddStayToItineraryModalProps {
    isOpen: boolean
    onClose: () => void
    /**
     * Called after a successful add/replace POST (and cache invalidation),
     * *instead of* ``onClose``. Lets hosts distinguish "user cancelled"
     * (onClose) from "the stay actually landed" so they can collapse a
     * wrapping drawer / side sheet on commit. When omitted, ``onClose``
     * fires on success as before.
     */
    onSuccess?: () => void
    hotelTitle: string
    hotelImage?: string
    locationTag?: string | React.ReactNode
    zentrumHubId: string
    cityId: string
    cityName?: string
    /** Per-night base price for the hotel. The modal multiplies by nights before
     *  posting, so the backend always stores a real total cost. */
    pricePerNight?: number
    currency?: string
    /** When provided, the modal pre-selects the candidate block whose
     *  start date is closest to this value instead of always defaulting
     *  to the first block. Lets callers indicate which unstayed run the
     *  user clicked so the right block is highlighted on open. */
    preferredCheckIn?: string
}

// ───────────────────────────────────────────────────────────────────
// Date helpers — the modal speaks YYYY-MM-DD on the wire and parses
// the itinerary's ISO timestamps to those.
// ───────────────────────────────────────────────────────────────────

const toIsoYmd = (value: string | null | undefined): string => {
    if (!value) return ''
    return value.slice(0, 10)
}

const addOneDay = (yyyyMmDd: string): string => {
    if (!yyyyMmDd) return ''
    const next = new Date(`${yyyyMmDd}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString().slice(0, 10)
}

const formatRange = (start: string, end: string): string => {
    if (!start || !end) return ''
    const fmt = (d: string) => {
        const date = new Date(`${d}T00:00:00Z`)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }
    return `${fmt(start)} → ${fmt(end)}`
}

const nightsBetween = (start: string, end: string): number => {
    if (!start || !end) return 0
    const s = new Date(`${start}T00:00:00Z`).getTime()
    const e = new Date(`${end}T00:00:00Z`).getTime()
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
}

const ymdFromDate = (date: Date | null): string => {
    if (!date) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const dateFromYmd = (ymd: string): Date | null => {
    if (!ymd) return null
    const [y, m, d] = ymd.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
}

const formatChipDow = (ymd: string): string => {
    const d = new Date(`${ymd}T00:00:00Z`)
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
}
const formatChipDay = (ymd: string): string => {
    const d = new Date(`${ymd}T00:00:00Z`)
    return String(d.getUTCDate())
}
const formatChipMonth = (ymd: string): string => {
    const d = new Date(`${ymd}T00:00:00Z`)
    return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
}

// Natural-language phrasing for a night range, matching how a guest
// would talk about it: "on May 25" for a single night, "from May 25 to
// May 27" for multi-night. ``endYmd`` is exclusive (check-out morning).
const formatStayPhrase = (startYmd: string, endYmd: string): string => {
    if (!startYmd || !endYmd) return ''
    const fmt = (d: string) =>
        new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        })
    const nights = nightsBetween(startYmd, endYmd)
    if (nights <= 1) return `on ${fmt(startYmd)}`
    const lastNight = new Date(`${endYmd}T00:00:00Z`)
    lastNight.setUTCDate(lastNight.getUTCDate() - 1)
    return `from ${fmt(startYmd)} to ${fmt(lastNight.toISOString().slice(0, 10))}`
}

// ───────────────────────────────────────────────────────────────────
// StayStrip — the visual centerpiece. Two anchored boundary chips —
// the check-in date on the left, the check-out morning date on the
// right — connected by a thread with a small "N nights" pill in the
// middle. Handles 1-night, multi-night, and very-long stays uniformly:
// always exactly two date chips at the boundaries.
// ───────────────────────────────────────────────────────────────────

interface StayStripProps {
    checkInDate: string
    /** Exclusive — the morning AFTER the last night. */
    checkOutDate: string
    nights: number
}

const StayStrip: React.FC<StayStripProps> = ({ checkInDate, checkOutDate, nights }) => {
    if (!checkInDate || !checkOutDate || nights <= 0) {
        return (
            <div className="rounded-md border border-dashed border-grey-4 px-4 py-6 text-center">
                <p className="text-xs text-grey-2">Pick a date range to see your stay.</p>
            </div>
        )
    }

    return (
        <div className="select-none">
            <div className="relative">
                {/* The thread that ties the boundary chips together */}
                <div className="absolute inset-x-12 top-1/2 h-px -translate-y-1/2 bg-grey-3" />

                <div className="relative flex items-center justify-between">
                    {/* Check-in chip */}
                    <div className="relative z-10 flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-primary-default/50 bg-natural-white shadow-xs ring-1 ring-primary-default/10">
                        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary-default">{formatChipDow(checkInDate)}</span>
                        <span className="font-red-hat-display mt-0.5 text-[18px] font-bold leading-none text-header-black">
                            {formatChipDay(checkInDate)}
                        </span>
                        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-grey-3">
                            {formatChipMonth(checkInDate)}
                        </span>
                    </div>

                    {/* Middle: nights count pill on top of the thread */}
                    <span className="relative z-10 rounded-full border border-grey-4 bg-natural-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-grey-1 shadow-xs">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>

                    {/* Check-out chip */}
                    <div className="relative z-10 flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-primary-default/50 bg-natural-white shadow-xs ring-1 ring-primary-default/10">
                        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary-default">{formatChipDow(checkOutDate)}</span>
                        <span className="font-red-hat-display mt-0.5 text-[18px] font-bold leading-none text-header-black">
                            {formatChipDay(checkOutDate)}
                        </span>
                        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-grey-3">
                            {formatChipMonth(checkOutDate)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-primary-default">Check in</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-primary-default">Check out</span>
            </div>
        </div>
    )
}

// ───────────────────────────────────────────────────────────────────
// Main modal
// ───────────────────────────────────────────────────────────────────

const AddStayToItineraryModal: React.FC<AddStayToItineraryModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    hotelTitle,
    hotelImage,
    locationTag,
    zentrumHubId,
    cityId,
    cityName,
    pricePerNight,
    currency,
    preferredCheckIn
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const ctx = useOptionalTravelerTrips()
    const activeTripId = ctx?.activeTrip?.trip_id
    const cachedItinerary = activeTripId ? ctx?.tripItineraries[activeTripId] : undefined
    const queryClient = useQueryClient()

    // The cached itinerary in the trip context comes from the *list* serializer
    // and omits the ``days`` array. Read the complete payload from the shared
    // ['itineraryCompleted', id] cache instead — TripboardPage already populates it,
    // so this is a cache hit (no extra /complete fetch) when the modal opens.
    const cachedItineraryId = cachedItinerary?.id ?? ''
    const { data: fullItinerary, isLoading: isLoadingItinerary } = useItineraryCompletedData(cachedItineraryId)
    // Route-summary drives the candidate block boundaries — same source as
    // the Day Header — so the arrival-day night lands under the destination
    // city, matching what the user sees on the itinerary.
    const { data: routeSummary } = useItineraryRouteSummary(cachedItineraryId)

    const itineraryForBlocks = (fullItinerary as TripItinerary | undefined) ?? cachedItinerary ?? null
    const itineraryId = itineraryForBlocks?.id ?? cachedItinerary?.id ?? null

    const candidateBlocks: ItineraryCityBlock[] = useMemo(() => {
        if (!itineraryForBlocks) return []
        return getCandidateBlocksForCity(itineraryForBlocks, cityId, routeSummary)
    }, [itineraryForBlocks, cityId, routeSummary])

    // For each candidate block, collect EVERY ``ItineraryStay`` whose date
    // range overlaps any day of the block — not just those covering the first
    // day. Two ranges [a,b) and [c,d) overlap iff ``a < d && c < b``. Drives
    // the "overlaps / replaces / already attached" UI so users see every
    // affected hotel, including one-night stays in the middle of a multi-day
    // block.
    const conflictingStaysByBlockIdx = useMemo(() => {
        const map = new Map<number, ConflictingStay[]>()
        const stays = itineraryForBlocks?.stays
        if (!stays || stays.length === 0) return map
        candidateBlocks.forEach((block, idx) => {
            const blockStart = toIsoYmd(block.start_date)
            const blockEndExclusive = addOneDay(toIsoYmd(block.end_date))
            if (!blockStart || !blockEndExclusive) return
            const conflicts: ConflictingStay[] = []
            for (const s of stays) {
                if (s.city_id !== cityId) continue
                if (!s.check_in_date || !s.check_out_date) continue
                const stayIn = toIsoYmd(s.check_in_date)
                const stayOut = toIsoYmd(s.check_out_date)
                if (blockStart < stayOut && stayIn < blockEndExclusive) {
                    conflicts.push({
                        stayId: s.stay_id,
                        hotelName: s.hotel_name,
                        zentrumHubId: s.zentrum_hub_id,
                        isSameHotel: s.zentrum_hub_id === zentrumHubId,
                        checkIn: stayIn,
                        checkOut: stayOut,
                        // Does this existing stay fully cover the block?
                        fullyCoversBlock: stayIn <= blockStart && stayOut >= blockEndExclusive
                    })
                }
            }
            if (conflicts.length > 0) map.set(idx, conflicts)
        })
        return map
    }, [itineraryForBlocks, candidateBlocks, cityId, zentrumHubId])

    // Multi-select: each entry is the index of a candidate block the user
    // has chosen. Clicking a block toggles it. We never let the user empty
    // the selection — at least one block must remain picked. The first
    // block is auto-selected on open.
    const [selectedBlockIndices, setSelectedBlockIndices] = useState<Set<number>>(() => new Set([0]))
    const [useCustomDates, setUseCustomDates] = useState(false)
    const [customCheckIn, setCustomCheckIn] = useState('')
    const [customCheckOut, setCustomCheckOut] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Derived: the actual block objects that are selected, in candidate order.
    const selectedBlocks: ItineraryCityBlock[] = useMemo(
        () => candidateBlocks.filter((_, idx) => selectedBlockIndices.has(idx)),
        [candidateBlocks, selectedBlockIndices]
    )
    const isSingleBlockSelected = selectedBlocks.length === 1
    const primaryBlock: ItineraryCityBlock | undefined = selectedBlocks[0]

    // True when every selected block is already fully covered by the same
    // hotel being added — submit would be a pure no-op. Disable the button
    // to prevent pointless POSTs. (Other-hotel conflicts are handled by
    // the submissions subtraction pass below, not here.)
    const allSelectedAlreadyHaveSameHotel = useMemo(() => {
        if (selectedBlockIndices.size === 0) return false
        for (const idx of selectedBlockIndices) {
            const conflicts = conflictingStaysByBlockIdx.get(idx)
            if (!conflicts || conflicts.length === 0) return false
            const sameHotelFullCover = conflicts.some((c) => c.isSameHotel && c.fullyCoversBlock)
            if (!sameHotelFullCover) return false
        }
        return true
    }, [selectedBlockIndices, conflictingStaysByBlockIdx])

    // Every DIFFERENT-hotel stay currently attached anywhere in this city,
    // deduped. Drives the "heads up — another hotel in this city" notice
    // that appears regardless of which block is selected, because the
    // recommendation is about the city-level decision, not the per-block
    // math.
    const otherHotelStaysInCity: ConflictingStay[] = useMemo(() => {
        const stays = itineraryForBlocks?.stays
        if (!stays || stays.length === 0) return []
        const seen = new Set<string>()
        const out: ConflictingStay[] = []
        for (const s of stays) {
            if (s.city_id !== cityId) continue
            if (s.zentrum_hub_id === zentrumHubId) continue
            if (!s.check_in_date || !s.check_out_date) continue
            if (seen.has(s.stay_id)) continue
            seen.add(s.stay_id)
            out.push({
                stayId: s.stay_id,
                hotelName: s.hotel_name,
                zentrumHubId: s.zentrum_hub_id,
                isSameHotel: false,
                checkIn: toIsoYmd(s.check_in_date),
                checkOut: toIsoYmd(s.check_out_date),
                fullyCoversBlock: false
            })
        }
        // Earliest check-in first — reads naturally in a list.
        out.sort((a, b) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : 0))
        return out
    }, [itineraryForBlocks, cityId, zentrumHubId])

    // The "primary" block is the first selected block. When exactly one is
    // selected, the stay strip + adjust-dates UI work against it. When more
    // than one is selected, those features hide and we show a summary.
    const blockCheckIn = primaryBlock ? toIsoYmd(primaryBlock.start_date) : ''
    const blockCheckOut = primaryBlock ? addOneDay(toIsoYmd(primaryBlock.end_date)) : ''

    // Reset state whenever the modal opens or the candidate set changes.
    // When ``preferredCheckIn`` is provided, pre-select the candidate
    // block whose start date is on or after that date (i.e. the block
    // the user actually clicked). Falls back to index 0.
    useEffect(() => {
        if (!isOpen) return
        let defaultIdx = 0
        if (preferredCheckIn && candidateBlocks.length > 1) {
            const preferred = preferredCheckIn.slice(0, 10)
            const matchIdx = candidateBlocks.findIndex((block) => {
                const blockStart = toIsoYmd(block.start_date)
                return blockStart >= preferred
            })
            if (matchIdx >= 0) defaultIdx = matchIdx
        }
        setSelectedBlockIndices(new Set([defaultIdx]))
        setUseCustomDates(false)
        setErrorMessage(null)
    }, [isOpen, candidateBlocks, preferredCheckIn])

    // Re-prefill custom dates whenever the primary block changes (single
    // selection only — multi-selection has no custom-dates affordance).
    useEffect(() => {
        if (!primaryBlock || !isSingleBlockSelected) return
        setCustomCheckIn(blockCheckIn)
        setCustomCheckOut(blockCheckOut)
    }, [primaryBlock, isSingleBlockSelected, blockCheckIn, blockCheckOut])

    // If the user toggles into multi-select while custom dates are open,
    // revert — custom dates only apply to a single block.
    useEffect(() => {
        if (!isSingleBlockSelected && useCustomDates) {
            setUseCustomDates(false)
        }
    }, [isSingleBlockSelected, useCustomDates])

    const toggleBlock = (idx: number) => {
        setSelectedBlockIndices((prev) => {
            const next = new Set(prev)
            if (next.has(idx)) {
                // Never let the user empty the selection.
                if (next.size > 1) next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    // Hooks above this line must run on every render — early returns go below.

    // One submission per selected block. Custom dates only apply to the
    // primary block in single-select mode; everything else uses the block's
    // full range. Backend handles overlap with existing different-hotel
    // stays in the same city by truncating them on save — the frontend just
    // sends the user's intended range as-is.
    const effectiveSubmissions = useMemo(() => {
        const subs: Array<{
            check_in_date: string
            check_out_date: string
            nights: number
        }> = []
        selectedBlocks.forEach((block, blockListIdx) => {
            const useCustom = blockListIdx === 0 && isSingleBlockSelected && useCustomDates
            const baseStart = useCustom ? customCheckIn : toIsoYmd(block.start_date)
            const baseEnd = useCustom ? customCheckOut : addOneDay(toIsoYmd(block.end_date))
            if (!baseStart || !baseEnd || baseEnd <= baseStart) return
            const nights = nightsBetween(baseStart, baseEnd)
            if (nights > 0) {
                subs.push({ check_in_date: baseStart, check_out_date: baseEnd, nights })
            }
        })
        return subs
    }, [selectedBlocks, isSingleBlockSelected, useCustomDates, customCheckIn, customCheckOut])

    const totalNights = useMemo(() => effectiveSubmissions.reduce((acc, s) => acc + s.nights, 0), [effectiveSubmissions])
    const totalCost = pricePerNight && totalNights > 0 ? pricePerNight * totalNights : undefined

    if (!isOpen) return null
    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    // Only declare the city missing once the fetch has finished — otherwise
    // the empty state flashes for a frame on open.
    const cityNotInItinerary = !isLoadingItinerary && candidateBlocks.length === 0

    const handleCalendarChange = (start: Date | null, end: Date | null) => {
        if (start) setCustomCheckIn(ymdFromDate(start))
        if (end) setCustomCheckOut(ymdFromDate(end))
    }

    const handleSubmit = async () => {
        if (!itineraryId || effectiveSubmissions.length === 0) return

        for (const s of effectiveSubmissions) {
            if (!s.check_in_date || !s.check_out_date) {
                setErrorMessage('Pick both a check-in and a check-out date.')
                return
            }
            if (s.check_out_date <= s.check_in_date) {
                setErrorMessage('Check-out must be after check-in.')
                return
            }
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        try {
            // One POST per selected block. The backend's reconcile pass
            // matches each new stay to its own block via date proximity,
            // so multi-select results in N independent ItineraryStay rows.
            // Different-hotel stays whose ranges overlap the new range are
            // truncated server-side on save.
            await Promise.all(
                effectiveSubmissions.map((s) =>
                    addStayToItinerary(itineraryId, {
                        zentrum_hub_id: zentrumHubId,
                        city_id: cityId,
                        check_in_date: s.check_in_date,
                        check_out_date: s.check_out_date,
                        total_cost: pricePerNight && s.nights > 0 ? pricePerNight * s.nights : undefined,
                        currency
                    })
                )
            )

            const blockCount = effectiveSubmissions.length
            const verb = 'added to'
            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_STAY_ADDED_SUCCESS,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    hotel_name: hotelTitle,
                    zentrum_hub_id: zentrumHubId,
                    city_id: cityId,
                    city_name: cityName,
                    total_nights: totalNights,
                    total_cost: totalCost,
                    block_count: blockCount
                }
            })
            toast.success(hotelTitle, {
                description:
                    blockCount > 1
                        ? `${blockCount} stays · ${totalNights} ${totalNights === 1 ? 'night' : 'nights'} ${verb} ${cityName ?? 'your trip'}`
                        : `${totalNights} ${totalNights === 1 ? 'night' : 'nights'} ${verb} ${cityName ?? 'your trip'}`
            })
            // Invalidate the completed-itinerary query so the kanban pill
            // row picks up the new stays / day attachments after reconcile.
            // Without this, the itinerary view renders the stale pre-add
            // state until the query's default staleTime elapses.
            await queryClient.invalidateQueries({
                queryKey: ['itineraryCompleted', itineraryId]
            })
            // Bug 7 — invalidate budget so the Budget Tab picks up the
            // backend-scheduled recalc triggered by the add (and any
            // server-side truncation of an existing overlapping stay)
            // without a manual Recalculate click. Covers both private
            // ['tripBudget', id, 'private'] and public
            // ['tripBudget', id, 'public'] variants via prefix match.
            await queryClient.invalidateQueries({
                queryKey: ['tripBudget']
            })
            // Auto-shortlist into the trip's traveler collection happens on
            // the backend (ItineraryStayService.add_stay). Invalidate the
            // tripboard collection caches so the Stays Tab Shortlist view
            // picks up the new section without a manual refresh.
            await queryClient.invalidateQueries({
                queryKey: ['tripboard-collection']
            })
            await queryClient.invalidateQueries({
                queryKey: ['traveler-collection']
            })
            // Prefer ``onSuccess`` on commit so hosts (e.g. the inline
            // stay picker drawer) can collapse their whole surface; fall
            // back to ``onClose`` when no success handler is wired.
            if (onSuccess) {
                onSuccess()
            } else {
                onClose()
            }
        } catch (err) {
            const apiErr = err as {
                response?: { data?: { message?: string } }
                message?: string
            }
            const message = apiErr?.response?.data?.message || apiErr?.message || 'Could not add this stay. Try again.'
            setErrorMessage(message)
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Card */}
            <div
                className="font-manrope relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-natural-white shadow-[0_24px_60px_-12px_rgba(36,48,127,0.28),0_8px_24px_-8px_rgba(36,48,127,0.18)]"
                onClick={(e) => e.stopPropagation()}>
                {/* ── HERO ── */}
                <div className="relative h-44 w-full shrink-0 overflow-hidden bg-grey-5">
                    {hotelImage ? (
                        <img
                            src={hotelImage}
                            alt={hotelTitle}
                            className="h-full w-full scale-[1.02] object-cover transition-transform duration-700 ease-out hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary-pale-purple">
                            <Hotel className="h-12 w-12 text-primary-default/50" />
                        </div>
                    )}

                    {/* Gradient veil for legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

                    {/* Top row: kicker + close */}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                            <Compass className="h-3 w-3 text-white" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">Adding to your trip</span>
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            aria-label="Close"
                            className="cursor-pointer rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-md transition hover:bg-white/20 disabled:opacity-50">
                            <X className="h-4 w-4 text-white" />
                        </button>
                    </div>

                    {/* Bottom: title */}
                    <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
                        <h2 className="font-red-hat-display line-clamp-2 text-[22px] font-bold leading-[1.1] tracking-tight text-white">
                            {hotelTitle}
                        </h2>
                        {(locationTag || cityName) && (
                            <div className="mt-1.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-white/70" />
                                <span className="line-clamp-1 text-[11px] font-medium text-white/85">{locationTag ?? cityName}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── BODY (scrollable) ── */}
                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                    {isLoadingItinerary && candidateBlocks.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary-default" />
                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-grey-2">Loading your trip…</p>
                        </div>
                    ) : cityNotInItinerary ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                                <MapPin className="h-6 w-6 text-amber-600" />
                            </div>
                            <p className="text-[15px] font-semibold text-header-black">{cityName ?? 'This city'} isn't in your trip yet</p>
                            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-grey-2">
                                Add it to your itinerary first, then come back to attach this hotel.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Heads-up notice: single callout that carries
                             * both the fact (which hotel is already here) and
                             * the product recommendation (lock your route
                             * first). Replaces the earlier caveat line under
                             * the stay strip so we don't restate the same
                             * fact in two places. */}
                            {otherHotelStaysInCity.length > 0 && (
                                <div
                                    className="rounded-xl border border-grey-4 bg-grey-5 px-3.5 py-2.5"
                                    role="note">
                                    <p className="font-manrope text-[11px] font-semibold text-grey-0">
                                        This city already has{' '}
                                        {otherHotelStaysInCity.length === 1 ? 'a hotel' : `${otherHotelStaysInCity.length} hotels`}
                                    </p>
                                    <ul className="mt-1 space-y-0.5">
                                        {otherHotelStaysInCity.map((s) => (
                                            <li
                                                key={s.stayId}
                                                className="font-manrope text-[11px] text-grey-2">
                                                <span className="font-semibold text-grey-0">{s.hotelName}</span>{' '}
                                                <span className="text-grey-3">{formatStayPhrase(s.checkIn, s.checkOut)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-1.5 font-manrope text-[10px] text-grey-2">Adding this will trim the overlapping dates on the existing hotel.</p>
                                </div>
                            )}

                            {/* Block selector — multi-select */}
                            {candidateBlocks.length > 1 && (
                                <div>
                                    <div className="mb-2 flex items-baseline gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-grey-2">
                                            Block{candidateBlocks.length === 1 ? '' : 's'}
                                        </span>
                                        <span className="font-manrope text-[11px] font-medium leading-none text-primary-default">
                                            — pick one or more
                                        </span>
                                    </div>
                                    <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                                        {candidateBlocks.map((block, idx) => {
                                            const active = selectedBlockIndices.has(idx)
                                            const conflicts = conflictingStaysByBlockIdx.get(idx) ?? []
                                            const sameHotelFullCover = conflicts.find((c) => c.isSameHotel && c.fullyCoversBlock)
                                            const differentHotelConflicts = conflicts.filter((c) => !c.isSameHotel)
                                            let chipLabel: string | null = null
                                            let chipTone: 'primary' | 'amber' = 'amber'
                                            if (sameHotelFullCover) {
                                                chipLabel = '✓ Already added'
                                                chipTone = 'primary'
                                            } else if (differentHotelConflicts.length === 1) {
                                                chipLabel = `Overlaps ${differentHotelConflicts[0].hotelName}`
                                            } else if (differentHotelConflicts.length > 1) {
                                                chipLabel = `Overlaps ${differentHotelConflicts.length} hotels`
                                            }
                                            return (
                                                <button
                                                    type="button"
                                                    key={`${block.start_date}-${block.end_date}`}
                                                    onClick={() => toggleBlock(idx)}
                                                    aria-pressed={active}
                                                    className={`shrink-0 cursor-pointer rounded-xl border-2 px-3 py-2 text-left transition-all ${
                                                        active
                                                            ? 'border-primary-default bg-primary-default/5 shadow-xs'
                                                            : 'border-grey-4 bg-natural-white hover:border-grey-3'
                                                    }`}>
                                                    <p className="text-[12px] font-bold tracking-tight text-header-black">
                                                        {formatRange(toIsoYmd(block.start_date), addOneDay(toIsoYmd(block.end_date)))}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] text-grey-2">
                                                        {block.nights} {block.nights === 1 ? 'night' : 'nights'}
                                                    </p>
                                                    {chipLabel && (
                                                        <p
                                                            className={`mt-1 line-clamp-1 max-w-[140px] text-[9px] font-semibold uppercase tracking-[0.04em] ${
                                                                chipTone === 'primary' ? 'text-primary-default' : 'text-amber-700'
                                                            }`}>
                                                            {chipLabel}
                                                        </p>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Stay preview — strip when single, summary when multi */}
                            <div>
                                <div className="mb-3 flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-grey-2">Your stay</span>
                                        {cityName && (
                                            <span className="font-manrope text-[11px] font-medium leading-none text-primary-default">
                                                — in {cityName}
                                            </span>
                                        )}
                                    </div>
                                    {isSingleBlockSelected && (
                                        <button
                                            type="button"
                                            onClick={() => setUseCustomDates((prev) => !prev)}
                                            aria-pressed={useCustomDates}
                                            className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-all ${
                                                useCustomDates
                                                    ? 'border-primary-default bg-primary-default/10 text-primary-default shadow-xs'
                                                    : 'border-grey-4 bg-natural-white text-grey-1 hover:border-primary-default hover:text-primary-default'
                                            }`}>
                                            {useCustomDates ? (
                                                <>
                                                    <ArrowLeft className="h-3 w-3" />
                                                    Full block
                                                </>
                                            ) : (
                                                <>
                                                    <CalendarRange className="h-3 w-3" />
                                                    Adjust dates
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {isSingleBlockSelected && useCustomDates ? (
                                    <div className="rounded-xl border border-grey-4 bg-natural-white p-2">
                                        <RimigoDateCalendar
                                            startDate={dateFromYmd(customCheckIn)}
                                            endDate={dateFromYmd(customCheckOut)}
                                            onChange={handleCalendarChange}
                                            minDate={dateFromYmd(blockCheckIn) ?? undefined}
                                        />
                                        <p className="mt-2 px-1 text-[10px] text-grey-2">Stays within {formatRange(blockCheckIn, blockCheckOut)}</p>
                                    </div>
                                ) : effectiveSubmissions.length === 0 ? (
                                    /* Dead-end: nothing to add and not in replace
                                     * mode. Rare — typically zero-night custom
                                     * range with no existing hotels. */
                                    <div className="rounded-xl border border-dashed border-primary-default/30 bg-primary-default/5 px-4 py-5 text-center">
                                        <p className="font-red-hat-display text-[15px] font-bold tracking-tight text-header-black">Nothing to add</p>
                                        <p className="font-manrope mt-0.5 text-[12px] font-medium leading-none text-primary-default">
                                            — pick a date range
                                        </p>
                                    </div>
                                ) : effectiveSubmissions.length === 1 ? (
                                    <StayStrip
                                        checkInDate={effectiveSubmissions[0].check_in_date}
                                        checkOutDate={effectiveSubmissions[0].check_out_date}
                                        nights={effectiveSubmissions[0].nights}
                                    />
                                ) : (
                                    <div className="rounded-xl border border-grey-4 bg-grey-5/60 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-grey-2">
                                            {effectiveSubmissions.length} stays · {totalNights} {totalNights === 1 ? 'night' : 'nights'} total
                                        </p>
                                        <ul className="mt-2 space-y-1.5">
                                            {effectiveSubmissions.map((s, idx) => {
                                                // End date is exclusive (morning after
                                                // last night); display the last-night
                                                // date instead so the range reads
                                                // naturally as "May 23 → May 25".
                                                const lastNight = new Date(`${s.check_out_date}T00:00:00Z`)
                                                lastNight.setUTCDate(lastNight.getUTCDate() - 1)
                                                const displayEnd = lastNight.toISOString().slice(0, 10)
                                                return (
                                                    <li
                                                        key={`${s.check_in_date}-${s.check_out_date}-${idx}`}
                                                        className="flex items-center justify-between text-[12px]">
                                                        <span className="font-semibold text-header-black">
                                                            {formatRange(s.check_in_date, displayEnd)}
                                                        </span>
                                                        <span className="text-grey-2">
                                                            {s.nights} {s.nights === 1 ? 'night' : 'nights'}
                                                        </span>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Cost — styled like a small ticket stub */}
                            {totalCost !== undefined && (
                                <div className="relative">
                                    <div className="border-t-2 border-dashed border-grey-4" />
                                    <div className="flex items-end justify-between pt-3">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-grey-2">Total</p>
                                            <p className="font-red-hat-display mt-0.5 text-[24px] font-bold leading-none text-header-black">
                                                ₹{totalCost.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <p className="mb-0.5 text-[11px] text-grey-2">
                                            {totalNights}n × ₹{pricePerNight?.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {errorMessage && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-xs text-red-900">{errorMessage}</p>
                        </div>
                    )}
                </div>

                {/* ── FOOTER (sticky) ── */}
                <div className="flex shrink-0 gap-3 border-t border-grey-5 bg-natural-white px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl text-[14px] font-semibold">
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        onClick={handleSubmit}
                        disabled={
                            isSubmitting ||
                            cityNotInItinerary ||
                            effectiveSubmissions.length === 0 ||
                            totalNights <= 0 ||
                            allSelectedAlreadyHaveSameHotel
                        }
                        className="flex-1 rounded-xl text-[14px] font-semibold text-white">
                        {isSubmitting
                            ? 'Adding…'
                            : allSelectedAlreadyHaveSameHotel
                              ? 'Already added'
                              : effectiveSubmissions.length === 0
                                ? 'Nothing to add'
                                : effectiveSubmissions.length > 1
                                  ? `Add ${effectiveSubmissions.length} stays`
                                  : 'Add to itinerary'}
                    </Button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default AddStayToItineraryModal
