// CustomEvent.tsx
import { useLayoutEffect, useRef, useState } from 'react'
import Typography from '@/components/shared/Typography'
import { BaseEventLayout } from './BaseEventLayout'
import { EventOverlayPortal } from './EventOverlayPortal'
import { useIsMobile } from '../hooks/ItineraryHook'
import { CustomSlotDescription } from './CustomSlotDescription'

export const CustomEvent = ({
    eventInfo,
    onEdit,
    onDelete,
    canEdit = true
}: {
    eventInfo: any
    onEdit?: (eventInfo: any) => void
    onDelete?: (eventInfo: any) => void
    canEdit?: boolean
}) => {
    const props = eventInfo.event.extendedProps
    const title = eventInfo.event.title || 'Custom Event'
    const start = eventInfo.event.start
    const end = eventInfo.event.end
    const isHighlighted = props.isHighlighted || false
    // Traveler-picked mode icon + background from CustomSection
    // (saved on ``slot_data.icon_url`` / ``slot_data.bg_color``).
    // Highlighted slots keep their lavender flash override; otherwise
    // the picked bg colour tints the card.
    const slotData = props.slot_data || props.slotData || {}
    const modeIconUrl =
        typeof slotData.icon_url === 'string' && slotData.icon_url.trim()
            ? slotData.icon_url
            : null
    const modeBgColor =
        typeof slotData.bg_color === 'string' && slotData.bg_color.trim()
            ? slotData.bg_color
            : null
    const timeBound = slotData.time_bound !== false
    const modeDescription =
        typeof slotData.description === 'string' ? slotData.description : ''

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

    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'

    // Calculate duration in minutes
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
    const isShortDuration = durationMinutes < 70

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

    return (
        <>
            <div
                ref={cardRef}
                data-day-index={props.dayIndex}
                data-slot-index={props.slotIndex}
                className={`h-full ${isShortDuration && props.notes ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => !isMobile && isShortDuration && props.notes && setExpanded(true)}
                onMouseLeave={() => !isMobile && isShortDuration && props.notes && setExpanded(false)}
                onClick={() => !isMobile && isShortDuration && props.notes && setExpanded((prev) => !prev)}>
                <BaseEventLayout
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    bgColor={isHighlighted ? '#F1EDFE' : modeBgColor || ''}
                    canEdit={canEdit}>
                    <div className="flex items-start gap-2 pr-4">
                        {modeIconUrl ? (
                            <img
                                src={modeIconUrl}
                                alt=""
                                className="h-5 w-5 shrink-0 object-contain mt-0.5"
                            />
                        ) : null}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <Typography
                                size="14"
                                weight="semibold"
                                family="manrope"
                                lineHeight="18px"
                                color="grey-0">
                                {title}
                            </Typography>
                            {timeBound && (
                                <Typography
                                    size="12"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-0">
                                    {timeRange}
                                </Typography>
                            )}
                        </div>
                    </div>
                    {modeDescription && !isShortDuration && (
                        <CustomSlotDescription
                            description={modeDescription}
                            className="mt-1"
                        />
                    )}

                    {/* Show notes in expanded view or on mobile */}
                    {(isMobile || !isShortDuration) && props.notes && (
                        <div className="rounded-[4px] bg-grey-4 py-1 px-2 mt-2">
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

                    {/* Show notes indicator on desktop short duration */}
                    {!isMobile && isShortDuration && props.notes && (
                        <div className="flex items-center gap-1 px-2 py-0.5 w-fit mr-auto rounded-sm mt-1">
                            <Typography
                                size="11"
                                weight="medium"
                                family="manrope"
                                color="grey-1">
                                + Notes
                            </Typography>
                        </div>
                    )}
                </BaseEventLayout>
            </div>

            {/* Overlay for notes on hover */}
            {!isMobile && expanded && overlayStyle && props.notes && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto bg-white border border-grey-4 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-3">
                        <Typography
                            size="12"
                            weight="medium"
                            family="manrope"
                            color="grey-0"
                            className="whitespace-pre-line">
                            {props.notes}
                        </Typography>
                    </div>
                </EventOverlayPortal>
            )}
        </>
    )
}
