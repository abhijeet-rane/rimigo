import React, { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Plane, X, Loader2, ArrowRight, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import {
    type AddItineraryFlightSearchParams
} from '@/api/itineraryApi'
import { patchSlot, type SlotPayload } from '@/modules/Itinerary/api/ItineraryApi'
import { prefillAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface FlightSegment {
    airline?: { code?: string; name?: string; flight_number?: string }
    origin?: { airport_code?: string; airport_name?: string; city_code?: string; city_name?: string; departure_time?: string }
    destination?: { airport_code?: string; airport_name?: string; city_code?: string; city_name?: string; arrival_time?: string }
    duration?: { minutes?: number; formatted?: string }
}

export interface AddFlightToItineraryFlightInput {
    reference_id: string
    /** Existing TravelerCollection section id when the flight is already
     *  shortlisted. When omitted, the backend auto-shortlists using
     *  ``flight_metadata`` before adding the slot. */
    section_id?: string | null
    title?: string
    journey_type?: number
    segments: FlightSegment[]
    departure_date?: string | null
    return_date?: string | null
    search_params?: AddItineraryFlightSearchParams
    /** Full Section.metadata blob — required when no shortlist Section
     *  yet exists for this reference_id (Explore-view "add" path). */
    flight_metadata?: Record<string, unknown> | null
}

interface ExistingSlotRef {
    slot_id: string
    leg: 'outbound' | 'internal' | 'return'
    day_index: number
    start_time?: string
    end_time?: string
}

interface ItineraryDayLite {
    date: string
    base_city?: { id?: string; name?: string } | null
}

interface AddFlightToItineraryModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    tripId: string
    itineraryId: string
    days: ItineraryDayLite[]
    flight: AddFlightToItineraryFlightInput
    /** Edit mode: existing flight slots already in the itinerary for this
     *  reference_id. When provided, the modal opens prefilled with their
     *  days/times and saving moves them via ``patchSlot`` instead of POSTing
     *  a new flight. */
    existingSlots?: ExistingSlotRef[]
    /** When set, this flight's leg already has a different flight on the
     *  itinerary. The modal surfaces a "Replacing X" banner and removes the
     *  conflicting flight before posting the new one — enforces the
     *  one-flight-per-leg invariant. */
    replacingSection?: {
        sectionId: string
        title: string
        airlineName?: string
        airlineCode?: string
        flightNumber?: string
    }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const eighteenHoursMs = 18 * 60 * 60 * 1000

/** Find the largest arrival→next-departure gap; if it exceeds 18h, treat
 *  as the destination stay between outbound and return legs. */
function splitSegmentsByGap(segments: FlightSegment[]): {
    outbound: FlightSegment[]
    inbound: FlightSegment[]
    isRoundTrip: boolean
} {
    if (!segments || segments.length < 2) {
        return { outbound: segments || [], inbound: [], isRoundTrip: false }
    }
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

const toLocalDateTimeInput = (iso?: string): string => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromLocalDateTimeInput = (value: string): string => {
    if (!value) return ''
    // value is "YYYY-MM-DDTHH:mm"; we send back the same shape (no TZ) so
    // the backend treats it as a local naive timestamp.
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return value.length === 16 ? `${value}:00` : value
}

const formatDayLabel = (day: ItineraryDayLite, idx: number): string => {
    if (!day?.date) return `Day ${idx + 1}`
    const d = new Date(day.date)
    if (Number.isNaN(d.getTime())) return `Day ${idx + 1}`
    const dayStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    const cityStr = day.base_city?.name ? ` · ${day.base_city.name}` : ''
    return `Day ${idx + 1} — ${dayStr}${cityStr}`
}

/** Pick the day index whose base_city matches a target city_id. Falls back
 *  to a date-string match if city ids aren't present. */
const pickDayIndex = (
    days: ItineraryDayLite[],
    targetCityId: string | undefined,
    targetDate: string | undefined,
    fallback: number
): number => {
    if (targetCityId) {
        const idx = days.findIndex((d) => d.base_city?.id === targetCityId)
        if (idx >= 0) return idx
    }
    if (targetDate) {
        const targetYmd = targetDate.slice(0, 10)
        const idx = days.findIndex((d) => (d.date || '').slice(0, 10) === targetYmd)
        if (idx >= 0) return idx
    }
    return Math.max(0, Math.min(fallback, days.length - 1))
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

const AddFlightToItineraryModal: React.FC<AddFlightToItineraryModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    tripId,
    itineraryId,
    days,
    flight,
    existingSlots,
    replacingSection,
}) => {
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEditMode = !!(existingSlots && existingSlots.length > 0)

    const trackModal = (eventName: string, extras?: Record<string, unknown>) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: eventName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                trip_id: tripId,
                itinerary_id: itineraryId,
                reference_id: flight.reference_id,
                section_id: flight.section_id,
                ...extras,
            },
        })
    }

    const handleCancel = () => {
        if (isSaving) return
        trackModal(POSTHOG_EVENTS.FLIGHTS_TAB_ADD_TO_ITINERARY_CANCEL, {
            mode: isEditMode ? 'edit' : (replacingSection ? 'replace' : 'add'),
        })
        onClose()
    }

    const { outboundSegments, returnSegments, isRoundTrip } = useMemo(() => {
        const split = splitSegmentsByGap(flight.segments || [])
        // Honor an explicit journey_type when the gap heuristic disagrees —
        // e.g. an open-jaw or short-layover round-trip the agent flagged.
        const jtRoundTrip = flight.journey_type === 2 || !!flight.return_date
        const isRT = split.isRoundTrip || jtRoundTrip
        return {
            outboundSegments: split.outbound,
            returnSegments: split.inbound,
            isRoundTrip: isRT
        }
    }, [flight.segments, flight.journey_type, flight.return_date])

    // Initial day + time picks (run when modal opens or flight changes).
    const initialPick = useMemo(() => {
        const outFirst = outboundSegments[0]
        const outLast = outboundSegments[outboundSegments.length - 1]
        const retFirst = returnSegments[0]
        const retLast = returnSegments[returnSegments.length - 1]

        const outDayIdx = pickDayIndex(
            days,
            outLast?.destination?.city_code, // arrival city for outbound
            outFirst?.origin?.departure_time,
            0
        )
        const retDayIdx = isRoundTrip
            ? pickDayIndex(
                  days,
                  retFirst?.origin?.city_code,
                  retFirst?.origin?.departure_time,
                  Math.max(0, days.length - 1)
              )
            : -1

        return {
            outDayIdx,
            outStart: toLocalDateTimeInput(outFirst?.origin?.departure_time),
            outEnd: toLocalDateTimeInput(outLast?.destination?.arrival_time),
            retDayIdx,
            retStart: toLocalDateTimeInput(retFirst?.origin?.departure_time),
            retEnd: toLocalDateTimeInput(retLast?.destination?.arrival_time)
        }
    }, [days, outboundSegments, returnSegments, isRoundTrip])

    // Edit-mode prefill from the existing slots. Falls back to the
    // segment-derived defaults when a leg isn't present.
    const editPick = useMemo(() => {
        if (!existingSlots || existingSlots.length === 0) return null
        const outSlot = existingSlots.find((s) => s.leg !== 'return')
        const retSlot = existingSlots.find((s) => s.leg === 'return')
        return {
            outDayIdx: outSlot?.day_index,
            outStart: toLocalDateTimeInput(outSlot?.start_time),
            outEnd: toLocalDateTimeInput(outSlot?.end_time),
            retDayIdx: retSlot?.day_index,
            retStart: toLocalDateTimeInput(retSlot?.start_time),
            retEnd: toLocalDateTimeInput(retSlot?.end_time)
        }
    }, [existingSlots])

    const [outDayIdx, setOutDayIdx] = useState<number>(0)
    const [outStart, setOutStart] = useState<string>('')
    const [outEnd, setOutEnd] = useState<string>('')
    const [retDayIdx, setRetDayIdx] = useState<number>(-1)
    const [retStart, setRetStart] = useState<string>('')
    const [retEnd, setRetEnd] = useState<string>('')

    // Reset state when the modal opens (so reopening on a different flight
    // refreshes the prefill).
    useEffect(() => {
        if (!isOpen) return
        setError(null)
        setOutDayIdx(editPick?.outDayIdx ?? initialPick.outDayIdx)
        setOutStart(editPick?.outStart || initialPick.outStart)
        setOutEnd(editPick?.outEnd || initialPick.outEnd)
        if (isRoundTrip) {
            setRetDayIdx(
                editPick?.retDayIdx != null ? editPick.retDayIdx : initialPick.retDayIdx
            )
            setRetStart(editPick?.retStart || initialPick.retStart)
            setRetEnd(editPick?.retEnd || initialPick.retEnd)
        } else {
            setRetDayIdx(-1)
            setRetStart('')
            setRetEnd('')
        }
    }, [isOpen, initialPick, editPick, isRoundTrip])

    // Body scroll lock while modal is open.
    useEffect(() => {
        if (!isOpen) return
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = original
        }
    }, [isOpen])

    if (!isOpen) return null

    const headerRoute = (() => {
        const first = outboundSegments[0]
        const last = (isRoundTrip ? returnSegments[returnSegments.length - 1] : outboundSegments[outboundSegments.length - 1]) || outboundSegments[outboundSegments.length - 1]
        const a = first?.origin?.city_name || first?.origin?.airport_code || '—'
        const b = (isRoundTrip ? outboundSegments[outboundSegments.length - 1]?.destination?.city_name : last?.destination?.city_name) || last?.destination?.airport_code || '—'
        return { a, b }
    })()

    const validate = (): string | null => {
        if (outDayIdx < 0 || outDayIdx >= days.length) return 'Pick a valid outbound day'
        if (!outStart) return 'Outbound departure time is required'
        if (!outEnd) return 'Outbound arrival time is required'
        if (isRoundTrip) {
            if (retDayIdx < 0 || retDayIdx >= days.length) return 'Pick a valid return day'
            if (!retStart) return 'Return departure time is required'
            if (!retEnd) return 'Return arrival time is required'
            if (retDayIdx < outDayIdx) return 'Return day must be on or after the outbound day'
        }
        return null
    }

    const handleSave = async () => {
        const v = validate()
        if (v) {
            setError(v)
            return
        }
        setError(null)
        setIsSaving(true)
        try {
            if (isEditMode && existingSlots) {
                const outSlot = existingSlots.find((s) => s.leg !== 'return')
                const retSlot = existingSlots.find((s) => s.leg === 'return')
                if (outSlot) {
                    await patchSlot(tripId, itineraryId, outSlot.slot_id, {
                        start_time: fromLocalDateTimeInput(outStart),
                        end_time: fromLocalDateTimeInput(outEnd)
                    } as Partial<SlotPayload>)
                }
                if (isRoundTrip && retSlot) {
                    await patchSlot(tripId, itineraryId, retSlot.slot_id, {
                        start_time: fromLocalDateTimeInput(retStart),
                        end_time: fromLocalDateTimeInput(retEnd)
                    } as Partial<SlotPayload>)
                }
                toast.success('Flight updated in itinerary')
            } else {
                // Add / Replace now dispatch a prompt to the assistant
                // instead of POSTing the flight directly. The user-facing
                // prompt stays plain natural language — no tool names. The
                // agent reads the structured intent from the <selection>
                // metadata envelope (scope, reference_id, replacing_section_id,
                // …) and decides which tools to run.
                const firstSeg = outboundSegments[0]
                const lastOutSeg = outboundSegments[outboundSegments.length - 1]
                const lastRetSeg = returnSegments[returnSegments.length - 1]
                const fromCode = firstSeg?.origin?.airport_code || firstSeg?.origin?.city_code || ''
                const toCode = lastOutSeg?.destination?.airport_code || lastOutSeg?.destination?.city_code || ''
                const airline = firstSeg?.airline?.name || ''
                const flightNumber = firstSeg?.airline?.flight_number || ''
                const carrier = firstSeg?.airline?.code || ''
                const flightLabel = [airline, carrier && flightNumber ? `${carrier} ${flightNumber}` : '']
                    .filter(Boolean)
                    .join(' ')
                    .trim()
                const outDateRaw = days[outDayIdx]?.date || flight.departure_date || ''
                const retDateRaw = isRoundTrip ? days[retDayIdx]?.date || flight.return_date || '' : ''
                const retFromCode = lastOutSeg?.destination?.airport_code || lastOutSeg?.destination?.city_code || ''
                const retToCode = lastRetSeg?.origin?.airport_code || lastRetSeg?.origin?.city_code || ''
                const intent = replacingSection ? 'flight_replace' : 'flight_add'
                const formatDate = (raw: string): string => {
                    if (!raw) return ''
                    const d = new Date(`${raw.slice(0, 10)}T00:00:00Z`)
                    return Number.isFinite(d.getTime())
                        ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
                        : raw
                }
                const flightLabelText = flightLabel || flight.title || 'this flight'
                const outDate = formatDate(outDateRaw)
                const retDate = formatDate(retDateRaw)
                let prompt: string
                if (replacingSection) {
                    prompt = `Replace my ${fromCode} to ${toCode} flight on ${outDate} with ${flightLabelText}.`
                    if (isRoundTrip && retDate) {
                        prompt += ` Round trip — also update the return on ${retDate}.`
                    }
                } else {
                    prompt = `Add ${flightLabelText} from ${fromCode} to ${toCode} on ${outDate} to my itinerary.`
                    if (isRoundTrip && retDate) {
                        prompt += ` Round trip — also add the return from ${retFromCode} to ${retToCode} on ${retDate}.`
                    }
                }
                trackModal(POSTHOG_EVENTS.FLIGHTS_TAB_ASSISTANT_DISPATCH, {
                    scope: intent,
                    reference_id: flight.reference_id,
                    section_id: flight.section_id || null,
                    from: fromCode,
                    to: toCode,
                    date: outDateRaw,
                    is_round_trip: isRoundTrip,
                    return_date: isRoundTrip ? retDateRaw : null,
                    outbound_day_index: outDayIdx,
                    return_day_index: isRoundTrip ? retDayIdx : null,
                    replacing_section_id: replacingSection?.sectionId || null,
                })
                // Drop the prompt into the assistant input — user clicks
                // Send themselves. Structured metadata is dropped; intent
                // is inferred from the natural-language phrasing.
                void prefillAssistantPrompt(prompt)
                toast.success(replacingSection ? 'Prompt ready in the assistant — review and send' : 'Prompt ready in the assistant — review and send')
            }
            trackModal(POSTHOG_EVENTS.FLIGHTS_TAB_ADD_TO_ITINERARY_SUBMIT, {
                mode: isEditMode ? 'edit' : (replacingSection ? 'replace' : 'add'),
                via: isEditMode ? 'direct' : 'assistant',
                is_round_trip: isRoundTrip,
                outbound_day_index: outDayIdx,
                return_day_index: isRoundTrip ? retDayIdx : null,
                replacing_section_id: replacingSection?.sectionId,
            })
            // For edit-mode we still mutate directly, so invalidate the
            // local caches. For add/replace the assistant stream owns the
            // refresh (apply_patch triggers its own itinerary reload).
            if (isEditMode) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] }),
                    queryClient.invalidateQueries({ queryKey: ['itineraryRouteSummary', itineraryId] }),
                    queryClient.invalidateQueries({ queryKey: ['traveler-collection'] })
                ])
            }
            if (onSuccess) onSuccess()
            else onClose()
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string }
            const msg = err?.response?.data?.message || err?.message || 'Could not save the flight'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    const titleText = isEditMode ? 'Update Flight in Itinerary' : 'Add Flight to Itinerary'
    const ctaText = isEditMode
        ? 'Save Changes'
        : replacingSection
          ? 'Replace Flight'
          : 'Add to Itinerary'

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-[460px] rounded-2xl shadow-[0_20px_50px_-15px_rgba(20,8,60,0.32)] overflow-hidden flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-grey-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary-default/10 flex items-center justify-center shrink-0">
                            <Plane className="h-3.5 w-3.5 text-primary-default" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-red-hat-display text-[15px] font-bold text-grey-0 tracking-[-0.01em] leading-[18px]">
                                {titleText}
                            </h2>
                            <p className="font-manrope text-[11px] text-grey-2 mt-0.5 flex items-center gap-1.5 truncate">
                                <span className="truncate">{headerRoute.a}</span>
                                {isRoundTrip ? (
                                    <ArrowRightLeft className="h-3 w-3 shrink-0 text-grey-3" />
                                ) : (
                                    <ArrowRight className="h-3 w-3 shrink-0 text-grey-3" />
                                )}
                                <span className="truncate">{headerRoute.b}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="shrink-0 h-7 w-7 rounded-full hover:bg-grey-5 flex items-center justify-center transition-colors"
                        aria-label="Close">
                        <X className="h-3.5 w-3.5 text-grey-1" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {replacingSection && (
                        <div className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-red-hat-display text-[12px] font-bold text-amber-900 leading-tight">
                                    Replacing your current flight on this leg
                                </p>
                                <p className="font-manrope text-[11px] text-amber-800 mt-0.5 leading-[16px]">
                                    {(replacingSection.airlineName || replacingSection.airlineCode)
                                        ? `${replacingSection.airlineName || replacingSection.airlineCode}${
                                              replacingSection.flightNumber
                                                  ? ` · ${replacingSection.airlineCode || ''}${replacingSection.flightNumber}`.trim()
                                                  : ''
                                          }`
                                        : replacingSection.title}{' '}
                                    will be removed from the itinerary. Only one flight per leg is allowed —
                                    it stays saved on the Flights tab.
                                </p>
                            </div>
                        </div>
                    )}
                    <LegCard
                        label={isRoundTrip ? 'Outbound' : 'Flight'}
                        accent="primary"
                        days={days}
                        dayIdx={outDayIdx}
                        onDayIdxChange={setOutDayIdx}
                        startTime={outStart}
                        onStartTimeChange={setOutStart}
                        endTime={outEnd}
                        onEndTimeChange={setOutEnd}
                    />

                    {isRoundTrip && (
                        <LegCard
                            label="Return"
                            accent="green"
                            days={days}
                            dayIdx={retDayIdx}
                            onDayIdxChange={setRetDayIdx}
                            startTime={retStart}
                            onStartTimeChange={setRetStart}
                            endTime={retEnd}
                            onEndTimeChange={setRetEnd}
                        />
                    )}

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                            <span className="font-manrope text-[12px] leading-[16px] text-red-700">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-grey-4 bg-grey-5/30">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="font-red-hat-display text-[13px] font-bold tracking-[-0.01em] px-4 py-2 rounded-[10px] bg-white border border-grey-4 text-grey-0 hover:border-grey-3 hover:bg-grey-5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 font-red-hat-display text-[13px] font-bold tracking-[-0.01em] px-4 py-2 rounded-[10px] bg-primary-default text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {ctaText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

interface LegCardProps {
    label: string
    /** Accent color for the leg marker — distinguishes outbound vs return
     *  visually without leaning on harsh all-caps section headers. */
    accent: 'primary' | 'green'
    days: ItineraryDayLite[]
    dayIdx: number
    onDayIdxChange: (idx: number) => void
    startTime: string
    onStartTimeChange: (v: string) => void
    endTime: string
    onEndTimeChange: (v: string) => void
}

const LegCard: React.FC<LegCardProps> = ({
    label,
    accent,
    days,
    dayIdx,
    onDayIdxChange,
    startTime,
    onStartTimeChange,
    endTime,
    onEndTimeChange,
}) => {
    const accentBg = accent === 'green' ? 'bg-secondary-green/15' : 'bg-primary-default/12'
    const accentText = accent === 'green' ? 'text-secondary-green' : 'text-primary-default'
    const accentBar = accent === 'green' ? 'bg-secondary-green' : 'bg-primary-default'

    return (
        <div className="rounded-[14px] border border-grey-4 bg-white overflow-hidden">
            {/* Leg header — colored accent bar + chip + label */}
            <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
                <span className={`h-5 w-1 rounded-full ${accentBar}`} aria-hidden />
                <div className={`inline-flex items-center gap-1 rounded-full ${accentBg} px-2 py-0.5`}>
                    <Plane className={`h-3 w-3 ${accentText}`} />
                    <span className={`font-red-hat-display text-[11px] font-bold tracking-[-0.01em] ${accentText}`}>
                        {label}
                    </span>
                </div>
            </div>

            <div className="px-3.5 pb-3.5 space-y-2.5">
                {/* Day picker */}
                <div className="space-y-1">
                    <label className="font-manrope text-[10px] font-semibold uppercase tracking-[0.06em] text-grey-2">
                        Day in itinerary
                    </label>
                    <select
                        value={dayIdx}
                        onChange={(e) => onDayIdxChange(Number(e.target.value))}
                        className="w-full rounded-lg border border-grey-4 bg-white px-3 h-9 font-manrope text-[13px] text-grey-0 focus:outline-none focus:border-primary-default focus:ring-2 focus:ring-primary-default/15 transition-shadow appearance-none bg-no-repeat bg-[length:14px_14px] bg-[position:right_0.75rem_center] cursor-pointer"
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23747474'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
                            paddingRight: '2.25rem',
                        }}>
                        {days.map((d, idx) => (
                            <option key={idx} value={idx}>
                                {formatDayLabel(d, idx)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Time row */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="font-manrope text-[10px] font-semibold uppercase tracking-[0.06em] text-grey-2">
                            Departure
                        </label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => onStartTimeChange(e.target.value)}
                            className="w-full rounded-lg border border-grey-4 bg-white px-3 h-9 font-manrope text-[13px] text-grey-0 tabular-nums focus:outline-none focus:border-primary-default focus:ring-2 focus:ring-primary-default/15 transition-shadow"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="font-manrope text-[10px] font-semibold uppercase tracking-[0.06em] text-grey-2">
                            Arrival
                        </label>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => onEndTimeChange(e.target.value)}
                            className="w-full rounded-lg border border-grey-4 bg-white px-3 h-9 font-manrope text-[13px] text-grey-0 tabular-nums focus:outline-none focus:border-primary-default focus:ring-2 focus:ring-primary-default/15 transition-shadow"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddFlightToItineraryModal
