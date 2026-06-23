import { JSX } from 'react'
import { ExperienceEvent, RestaurantEvent, StayEvent, VisitEvent } from './RestaurantEvent'
import { TransportEvent } from './TransportEventContent'
import { CustomEvent } from './CustomEvent'
import { isTransportKind } from '../constants/transportKinds'

type EventUIType = 'transport' | 'restaurant' | 'visit' | 'experience' | 'stay' | 'custom'
// | 'accommodation' | 'other'
export function RenderEventContent(eventInfo: any) {
    const type = eventInfo.event.extendedProps.type as EventUIType
    const isHighlighted = eventInfo.event.extendedProps.isHighlighted || false
    const highlightedBgColor = '#f5edff' // Light purple background using primary-default pale purple

    const componentMap: Record<EventUIType, JSX.Element> = {
        transport: (
            <TransportEvent
                eventInfo={eventInfo}
                highlightedBgColor={isHighlighted ? highlightedBgColor : undefined}
            />
        ),
        restaurant: <RestaurantEvent eventInfo={eventInfo} />,
        visit: <VisitEvent eventInfo={eventInfo} />,
        experience: <ExperienceEvent eventInfo={eventInfo} />,
        stay: <StayEvent eventInfo={eventInfo} />,
        custom: <CustomEvent eventInfo={eventInfo} />
        // accommodation: <div>Accommodation</div>, // Add your accommodation component
        // other: <div>Other Activity</div>
    }

    return (
        <div
            className={`fc-event-custom-wrapper w-full h-full relative ${isHighlighted ? 'highlighted-card rounded-xl' : ''}`}
            style={
                isHighlighted
                    ? {
                          animation: 'blink-shadow 1.5s infinite ease-in-out'
                      }
                    : {}
            }>
            {componentMap[type] ?? null}
            <style>{`
               
                @keyframes blink-shadow {
                    0% {
                        box-shadow: 0 0 0 0 var(--color-primary-default-80),
                                    0 0 0 0 var(--color-primary-default-80),
                                    0 0 0 0 var(--color-primary-default-80);
                    }
                    35% {
                        box-shadow: 0 0 1px 1px var(--color-primary-default-8),
                                    0 0 2px 1px var(--color-primary-default-8),
                                    0 0 3px 2px var(--color-primary-default-80);
                    }
                    
                    70% {
                        box-shadow: 0 0 1px 1px var(--color-primary-default-8),
                                    0 0 2px 1px var(--color-primary-default-8),
                                    0 0 3px 2px var(--color-primary-default-80);
                    }
                    100% {
                        box-shadow: 0 0 0 0 var(--color-primary-default-80),
                                    0 0 0 0 var(--color-primary-default-80),
                                    0 0 0 0 var(--color-primary-default-80);
                    }
                }
                .highlighted-card {
                    border: 2px solid var(--color-primary-default-8);
                    border-radius: 12px; /* rounded-xl equivalent */
                }
            `}</style>
        </div>
    )
}
export const transformItineraryToEvents = (days: any[], highlightedSlots?: Set<string>) => {
    const events: any[] = []

    // Check if days exists and is an array
    if (!days || !Array.isArray(days)) {
        console.warn('Invalid days data:', days)
        return events
    }

    days.forEach((day: any, dayIndex: number) => {
        // Skip days with empty slots array - keep the column empty
        if (!day.slots || !Array.isArray(day.slots) || day.slots.length === 0) {
            return
        }

        day.slots.forEach((slot: any, slotIndex: number) => {
            // Get the day's date (normalized to start of day in UTC)
            const dayDate = new Date(day.date)
            const dayDateStart = new Date(Date.UTC(
                dayDate.getUTCFullYear(),
                dayDate.getUTCMonth(),
                dayDate.getUTCDate(),
                0, 0, 0, 0
            ))

            // Extract time components from slot times, but use day.date as the base date
            // This ensures events appear in the correct day column regardless of when they actually start/end
            let displayStart = slot.start_time
            let displayEnd = slot.end_time || null

            if (slot.start_time) {
                const slotStartDate = new Date(slot.start_time)
                // Extract time component from slot
                const slotHours = slotStartDate.getUTCHours()
                const slotMinutes = slotStartDate.getUTCMinutes()
                const slotSeconds = slotStartDate.getUTCSeconds()
                const slotMillis = slotStartDate.getUTCMilliseconds()

                // Create start time using day's date with slot's time
                displayStart = new Date(Date.UTC(
                    dayDate.getUTCFullYear(),
                    dayDate.getUTCMonth(),
                    dayDate.getUTCDate(),
                    slotHours,
                    slotMinutes,
                    slotSeconds,
                    slotMillis
                )).toISOString()

                // Handle end time
                if (slot.end_time) {
                    const slotEndDate = new Date(slot.end_time)
                    const endHours = slotEndDate.getUTCHours()
                    const endMinutes = slotEndDate.getUTCMinutes()
                    const endSeconds = slotEndDate.getUTCSeconds()
                    const endMillis = slotEndDate.getUTCMilliseconds()

                    // Check if end time is on the next day relative to slot start
                    const slotStartDateOnly = new Date(Date.UTC(
                        slotStartDate.getUTCFullYear(),
                        slotStartDate.getUTCMonth(),
                        slotStartDate.getUTCDate()
                    ))
                    const slotEndDateOnly = new Date(Date.UTC(
                        slotEndDate.getUTCFullYear(),
                        slotEndDate.getUTCMonth(),
                        slotEndDate.getUTCDate()
                    ))
                    const daysDiff = Math.floor((slotEndDateOnly.getTime() - slotStartDateOnly.getTime()) / (1000 * 60 * 60 * 24))

                    if (daysDiff > 0) {
                        // End is on a later day - add the day difference to day's date
                        const endDayDate = new Date(dayDateStart)
                        endDayDate.setUTCDate(endDayDate.getUTCDate() + daysDiff)
                        displayEnd = new Date(Date.UTC(
                            endDayDate.getUTCFullYear(),
                            endDayDate.getUTCMonth(),
                            endDayDate.getUTCDate(),
                            endHours,
                            endMinutes,
                            endSeconds,
                            endMillis
                        )).toISOString()
                    } else {
                        // End is on the same day as start
                        displayEnd = new Date(Date.UTC(
                            dayDate.getUTCFullYear(),
                            dayDate.getUTCMonth(),
                            dayDate.getUTCDate(),
                            endHours,
                            endMinutes,
                            endSeconds,
                            endMillis
                        )).toISOString()
                    }
                }
            }

            // Determine EVENT TYPE shown in UI based on slot.kind
            let uiType: EventUIType = 'custom'

            if (isTransportKind(slot.kind)) {
                uiType = 'transport'
            } else if (slot.kind === 'meal' || slot.kind === 'place') {
                uiType = 'restaurant'
            } else if (slot.kind === 'experience') {
                uiType = 'experience'
            } else if (slot.kind === 'stay') {
                uiType = 'stay'
            } else if (slot.kind === 'custom') {
                uiType = 'custom'
            }
            // else if (slot.kind === 'stay') {
            //     uiType = 'accommodation'
            // }

            // Check if this slot should be highlighted
            const slotId = `${dayIndex}-${slotIndex}`
            const isHighlighted = highlightedSlots?.has(slotId) || false

            events.push({
                id: `${day.date}-${slot.order}`,
                slot_id: slot.slot_id || '',
                title: slot.title || '',
                start: displayStart, // Use day.date-based start time for column mapping
                end: displayEnd, // Use day.date-based end time for column mapping
                type: uiType,
                city: day.base_city?.name || day.destination_city?.name || '',
                dayType: day.type,

                // ✅ CRITICAL: Keep both naming conventions for backward compatibility
                kind: slot.kind,
                slotType: slot.kind, // Add this for TransportEvent
                slot_data: slot.slot_data, // Keep original snake_case
                slotData: slot.slot_data, // Add camelCase version
                dayIndex: dayIndex,
                slotIndex: slotIndex,
                isHighlighted: isHighlighted, // Flag to indicate if this slot should have yellow background

                // All other properties
                start_time: slot.start_time,
                end_time: slot.end_time,
                duration_minutes: slot.duration_minutes,
                entity_id: slot.entity_id,
                notes: slot.notes,
                estimated_cost: slot.estimated_cost,
                currency: slot.currency,
                isCheckoutDay: day.is_checkout_day,
                isCheckinDay: day.is_checkin_day,
                order: slot.order,
                slot_type: slot.slot_type,
                entity_model: slot.entity_model,
                booking_info: slot.booking_info,
                location: slot.location,
                priority: slot.priority,
                is_mandatory: slot.is_mandatory,
                is_flexible_timing: slot.is_flexible_timing,
                source: slot.source,
                status: slot.status,
                ai_confidence_score: slot.ai_confidence_score,
                suggestion_reasons: slot.suggestion_reasons,
                suggestion_priority: slot.slot_data?.suggestion_priority ?? null,
                // Canonical per-slot City ``{_id, name}`` — distinct from the
                // ``city`` string above (the day's base-city name) so the edit
                // composer seeds its picker from the slot's own city.
                slotCity: slot.city || null,
                attachments: slot.attachments || []
            })
        })

        // Also add accommodation as an event if it exists
        // if (day.accommodation) {
        //     events.push({
        //         id: `${day.date}-accommodation`,
        //         title: day.accommodation.title || 'Hotel Stay',
        //         start: day.accommodation.start_time,
        //         end: day.accommodation.end_time,
        //         type: 'accommodation',
        //         city: day.base_city?.name || '',
        //         kind: 'stay',
        //         slotType: 'stay',
        //         ...day.accommodation
        //     })
        // }
    })

    return events
}
