import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { BaseEventLayout, resolveTransportSlotType } from './BaseEventLayout'
import Typography from '@/components/shared/Typography'
import { EventOverlayPortal } from './EventOverlayPortal'
import { AiSuggestionsList } from './AiSuggestion'
import { useIsMobile } from '../hooks/ItineraryHook'
import {
    FlightEnrichmentBlock,
    getFlightEnrichment,
    resolveTransportLeg,
    type CompactFlightData,
} from './transportSlotRenderers'
import { isFlightTransport } from '../utils/transportTitle'
import { FlightTransportCard } from './FlightTransportCard'

export const TransportEvent = ({
    eventInfo,
    highlightedBgColor,
    onEdit,
    onDelete,
    canEdit = true
}: {
    eventInfo: any
    highlightedBgColor?: string
    onEdit?: (event: any) => void
    onDelete?: (event: any) => void
    canEdit?: boolean
}) => {
    const props = eventInfo?.event?.extendedProps || {}
    const slotData = props.slot_data || props.slotData || {}
    const title = eventInfo.event.title ?? props.title
    const transportSlotType = resolveTransportSlotType(props.kind)

    // Compact flight payload from the concierge ``search_flights`` tool
    // + transport enricher hydration. Present when the agent's
    // ``search_flights`` cache hit during the current ReACT turn and the
    // enricher matched the slot's flight number. Absent for descriptive
    // transport slots (trains, buses, arrivals) — the existing render
    // path handles those unchanged. Also tolerates the pre-fix top-level
    // ``flight_data`` for slots persisted before the krysto persistence
    // patch landed.
    const flightData: CompactFlightData | null =
        getFlightEnrichment({ ...props, slot_data: slotData })

    // Strict gate for the dedicated flight design — we only swap to it
    // when slot is a flight AND every essential flight_data field
    // (airline / flight no / origin / dest / times) is present. The new
    // card returns null for partial payloads, but we mirror the check
    // here so the existing fallback path keeps owning thin slots cleanly.
    // ``isFlightTransport`` checks slot_data.mode first, falls back to
    // parsing ``<Mode>:`` from the title so slots persisted during the
    // composite migration (slot_data missing mode) still render the
    // dedicated card.
    const modeIsFlight = isFlightTransport(slotData, title)
    const showDedicatedFlightCard =
        modeIsFlight &&
        !!flightData &&
        !!flightData.airline &&
        !!flightData.flight_number &&
        !!flightData.origin &&
        !!flightData.destination &&
        !!flightData.departure_time &&
        !!flightData.arrival_time
    const cabin =
        (slotData.flight_data?.best_offer?.cabin as string | undefined) ??
        (slotData.flightData?.best_offer?.cabin as string | undefined) ??
        null

    // Use event start and end times from FullCalendar
    const start = eventInfo.event.start
    const end = eventInfo.event.end

    const [expanded, setExpanded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [overlayStyle, setOverlayStyle] = useState<any>(null)

    const isMobile = useIsMobile()

    const formatTimeNoConvert = (value: string | Date) => {
        if (value instanceof Date) {
            const hours = value.getUTCHours()
            const minutes = value.getUTCMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
        }

        if (typeof value === 'string') {
            const timePart = value.split('T')[1]?.slice(0, 5) || ''
            let [hour, minute] = timePart.split(':').map(Number)
            const period = hour >= 12 ? 'PM' : 'AM'
            hour = hour % 12 || 12
            return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
        }
        return ''
    }

    const formatDuration = (minutes: number) => {
        if (!minutes) return ''
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        if (h && m) return `${h}h ${m}m`
        if (h) return `${h}h`
        return `${m}m`
    }

    // Calculate duration from start and end times
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0

    // Build time range string
    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'
    const timeText = durationMinutes ? `${timeRange} • ${formatDuration(durationMinutes)}` : timeRange

    const isVeryShortDuration = durationMinutes < 45
    const isShortDuration = durationMinutes < 89
    const suggestions = props?.suggestion_reasons ?? []

    // Update overlay position and close on scroll
    useLayoutEffect(() => {
        if (!expanded) return

        const updatePosition = () => {
            if (!cardRef.current) return
            const rect = cardRef.current.getBoundingClientRect()
            setOverlayStyle({
                position: 'fixed',
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            })
        }

        const close = () => setExpanded(false)

        updatePosition()

        const calendarRoot = document.getElementById('calendar-root')
        const fcScroller = calendarRoot?.querySelector('.fc-scroller')

        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('wheel', close, { passive: true })
        window.addEventListener('touchmove', close, { passive: true })

        calendarRoot?.addEventListener('scroll', close, { passive: true })
        fcScroller?.addEventListener('scroll', close, { passive: true })

        return () => {
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
            window.removeEventListener('wheel', close)
            window.removeEventListener('touchmove', close)

            calendarRoot?.removeEventListener('scroll', close)
            fcScroller?.removeEventListener('scroll', close)
        }
    }, [expanded])

    // Resolve the leg via the shared resolver: intra-city venues take
    // precedence over city fields, and a title-parse fallback handles
    // legacy descriptive transport slots that never got slot_data
    // populated. Returns null when no leg can be derived (rare —
    // typically a free-form title like "Free time" misclassified as
    // transport) and we suppress the leg row entirely rather than
    // render "undefined → undefined".
    const leg = resolveTransportLeg(slotData, title)
    const fromCity = leg?.from
    const toCity = leg?.to
    const resolvedMode = leg?.mode

    const legs =
        fromCity && toCity
            ? [
                  {
                      fromCity,
                      toCity,
                      duration: formatDuration(durationMinutes)
                  }
              ]
            : []

    const additionalInfo: string[] = []
    if (resolvedMode) {
        additionalInfo.push(resolvedMode.charAt(0).toUpperCase() + resolvedMode.slice(1))
    }
    if (props.estimated_cost && props.currency) {
        additionalInfo.push(`${props.currency} ${props.estimated_cost}`)
    }

    const LegsContent = (
        <div className="flex flex-col gap-2">
            {isVeryShortDuration && (
                <Typography
                    size="12"
                    weight="medium"
                    family="manrope"
                    color="grey-0"
                    className="pb-1 border-b border-grey-4">
                    {timeText}
                </Typography>
            )}

            {legs.map((leg: any, index: number) => (
                <div
                    key={index}
                    className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-grey-1 rounded-xs" />
                        <Typography
                            size="11"
                            weight="medium"
                            family="manrope"
                            color="grey-1"
                            className="flex items-center gap-1">
                            <span>{leg.fromCity}</span>
                            <ArrowRight size={11} />
                            <span>{leg.toCity}</span>
                        </Typography>
                    </div>

                    {leg.duration && (
                        <Typography
                            size="11"
                            weight="medium"
                            family="manrope"
                            color="grey-1">
                            {leg.duration}
                        </Typography>
                    )}
                </div>
            ))}

            {additionalInfo.length > 0 && (
                <div className="rounded-[4px] bg-grey-4 py-0.5 px-2">
                    <Typography
                        size="11"
                        weight="medium"
                        family="manrope"
                        color="grey-1">
                        {additionalInfo.join(' • ')}
                    </Typography>
                </div>
            )}

            {/* Concierge flight enrichment — rendered when the search_flights
                tool + transport enricher hydrated this slot with compact
                Kayak flight data. Absent for descriptive transport slots. */}
            {flightData && <FlightEnrichmentBlock flight={flightData} />}

            {props.notes && (
                <div className="rounded-[4px] bg-blue-50 py-0.5 px-2 border border-blue-200">
                    <Typography
                        size="11"
                        weight="medium"
                        family="manrope"
                        color="grey-1"
                        className="whitespace-pre-line">
                        {props.notes}
                    </Typography>
                </div>
            )}
            {suggestions.length > 0 && <AiSuggestionsList suggestions={suggestions} />}
        </div>
    )

    return (
        <>
            <div
                ref={cardRef}
                data-day-index={props.dayIndex}
                data-slot-index={props.slotIndex}
                className={`h-full ${isShortDuration ? 'cursor-pointer' : ''} `}
                onMouseEnter={() => !isMobile && isShortDuration && setExpanded(true)}
                onMouseLeave={() => !isMobile && isShortDuration && setExpanded(false)}
                onClick={() => !isMobile && isShortDuration && setExpanded((prev) => !prev)}>
                <BaseEventLayout
                    slotData={eventInfo.event}
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    bgColor={highlightedBgColor || '#ECF5FB'}
                    slotType={transportSlotType}
                    canEdit={canEdit}>
                    {showDedicatedFlightCard && flightData ? (
                        // Dedicated flight design: airline lockup + duration
                        // header, time + airport + city rail with stops-aware
                        // connector. Replaces the generic title/time/legs
                        // chrome entirely for fully-enriched flight slots.
                        // Notes / AI suggestions still surface beneath.
                        <div className="flex flex-col gap-2">
                            <FlightTransportCard
                                flight={flightData}
                                cabin={cabin}
                                fromCityName={slotData.from_city || slotData.fromCity || null}
                                toCityName={slotData.to_city || slotData.toCity || null}
                            />
                            {props.notes && (
                                <div className="rounded-[4px] bg-blue-50 py-0.5 px-2 border border-blue-200">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-1"
                                        className="whitespace-pre-line">
                                        {props.notes}
                                    </Typography>
                                </div>
                            )}
                            {suggestions.length > 0 && <AiSuggestionsList suggestions={suggestions} />}
                        </div>
                    ) : (
                        <>
                            <div className={`flex flex-col p-1 pr-4 ${isVeryShortDuration ? 'pb-0' : ''}`}>
                                <Typography
                                    size="14"
                                    weight="semibold"
                                    family="manrope"
                                    color="grey-0">
                                    {title || 'Transport'}
                                </Typography>

                                {/* Time text */}
                                {(isMobile || !isVeryShortDuration) && (
                                    <div className="flex flex-row justify-between items-center">
                                        <Typography
                                            size="12"
                                            weight="medium"
                                            family="manrope"
                                            color="grey-0"
                                            className="mt-1">
                                            {timeText}
                                        </Typography>
                                    </div>
                                )}
                            </div>

                            {/* Legs / details */}
                            {(isMobile || (!isShortDuration && legs.length > 0)) && (
                                <div className="bg-grey-5 border-t border-grey-4 rounded-b-xl -mx-2 p-3">{LegsContent}</div>
                            )}
                        </>
                    )}
                </BaseEventLayout>
            </div>

            {!isMobile && expanded && overlayStyle && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto bg-grey-5 border border-grey-4 rounded-xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {LegsContent}
                    </div>
                </EventOverlayPortal>
            )}
        </>
    )
}
