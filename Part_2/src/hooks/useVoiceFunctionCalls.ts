import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface FunctionExecution {
    name: string
    arguments: Record<string, unknown>
    result: Record<string, unknown>
}

interface UseVoiceFunctionCallsOptions {
    tripId: string
    itineraryId?: string
    onExpertDelegated?: (interactionId: string) => void
    onSlotChanged?: (slotId: string) => void
}

export type VoiceAnimationType = 'remove' | 'move' | 'arrive' | 'update' | 'reorder'

/** Animation durations in ms — matched to CSS keyframes in index.css */
const ANIM_DURATIONS: Record<VoiceAnimationType, number> = {
    remove: 700,
    move: 600,
    arrive: 900, // 600ms anim + 300ms delay
    update: 1200,
    reorder: 500,
}

/**
 * Dispatch a voice animation event on the slot's DOM element.
 * The Itinerary component listens for these and applies CSS classes.
 */
function dispatchSlotAnimation(
    slotId: string,
    animation: VoiceAnimationType,
    extra?: Record<string, unknown>
) {
    window.dispatchEvent(new CustomEvent('voice:slot-animate', {
        detail: { slotId, animation, ...extra },
    }))
}

/**
 * Handles function execution events from the voice chat,
 * playing swoosh animations before invalidating React Query caches.
 */
export function useVoiceFunctionCalls({
    tripId,
    itineraryId,
    onExpertDelegated,
    onSlotChanged,
}: UseVoiceFunctionCallsOptions) {
    const queryClient = useQueryClient()

    const invalidateItinerary = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['itineraryCompleted'] })
        if (itineraryId) {
            queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] })
        }
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
        queryClient.invalidateQueries({ queryKey: ['tripSlots', tripId] })
    }, [queryClient, tripId, itineraryId])

    /** Animate first, then invalidate cache after animation completes */
    const animateThenRefresh = useCallback((
        slotId: string | undefined,
        animation: VoiceAnimationType,
        extra?: Record<string, unknown>,
    ) => {
        if (slotId) {
            dispatchSlotAnimation(slotId, animation, extra)
            // Delay cache invalidation so user sees the animation on the current DOM
            setTimeout(() => {
                invalidateItinerary()
                if (animation !== 'remove') {
                    onSlotChanged?.(slotId)
                }
            }, ANIM_DURATIONS[animation])
        } else {
            invalidateItinerary()
        }
    }, [invalidateItinerary, onSlotChanged])

    /** After cache refresh, animate the slot arriving in its new position */
    const scheduleArrivalAnimation = useCallback((slotId: string, delay = 200) => {
        // Arrival animation fires after React re-renders with new data
        setTimeout(() => {
            dispatchSlotAnimation(slotId, 'arrive')
            onSlotChanged?.(slotId)
        }, delay)
    }, [onSlotChanged])

    const handleFunctionExecuted = useCallback((execution: FunctionExecution) => {
        const { name, arguments: args, result } = execution
        const success = (result as Record<string, unknown>).success

        if (!success) {
            const error = (result as Record<string, unknown>).error as string
            toast.error(`Action failed: ${error}`)
            return
        }

        const slotId = (args as Record<string, unknown>).slot_id as string | undefined
            ?? (result as Record<string, unknown>).slot_id as string | undefined

        const getInteractionId = () => {
            const fromArgs =
                (args as Record<string, unknown>).interaction_id ??
                (args as Record<string, unknown>).interactionId
            const fromResult =
                (result as Record<string, unknown>).interaction_id ??
                (result as Record<string, unknown>).interactionId
            const candidate = fromArgs ?? fromResult
            return typeof candidate === 'string' ? candidate : undefined
        }

        switch (name) {
            case 'update_slot_time': {
                const title = (result as Record<string, unknown>).title as string
                toast.success(`Updated time for "${title}"`)
                animateThenRefresh(slotId, 'update')
                break
            }

            case 'move_slot_to_day': {
                const title = (result as Record<string, unknown>).title as string
                const movedTo = (result as Record<string, unknown>).moved_to as string
                toast.success(`Moved "${title}" to ${movedTo}`)
                // Animate the card flying out, then after refresh animate it arriving
                if (slotId) {
                    dispatchSlotAnimation(slotId, 'move', { targetDate: movedTo })
                    setTimeout(() => {
                        invalidateItinerary()
                        // After data refreshes, animate the arrival
                        scheduleArrivalAnimation(slotId, 400)
                    }, ANIM_DURATIONS.move)
                } else {
                    invalidateItinerary()
                }
                break
            }

            case 'remove_slot': {
                const removedTitle = (result as Record<string, unknown>).removed_title as string
                toast.success(`Removed "${removedTitle}"`)
                // Animate removal, then refresh (slot will be gone from data)
                animateThenRefresh(slotId, 'remove')
                break
            }

            case 'edit_slot_title': {
                const editedTitle = (result as Record<string, unknown>).title as string
                toast.success(`Updated "${editedTitle}"`)
                animateThenRefresh(slotId, 'update')
                break
            }

            case 'reorder_slots': {
                const date = (result as Record<string, unknown>).date as string
                const newOrder = (result as Record<string, unknown>).new_order as string[] | undefined
                toast.success(`Reordered activities for ${date}`)
                // Animate all reordered slots
                if (newOrder) {
                    newOrder.forEach(id => dispatchSlotAnimation(id, 'reorder'))
                    setTimeout(() => invalidateItinerary(), ANIM_DURATIONS.reorder)
                } else {
                    invalidateItinerary()
                }
                break
            }

            case 'delegate_to_expert': {
                const prompt = (result as Record<string, unknown>).prompt as string

                // If backend provides an interaction id, bubble it up to the caller.
                const interactionId = getInteractionId()
                if (interactionId) onExpertDelegated?.(interactionId)

                window.dispatchEvent(new CustomEvent('voice:delegate-to-expert', {
                    detail: { prompt, source: 'voice' },
                }))
                break
            }

            case 'navigate_ui': {
                const uiAction = (result as Record<string, unknown>).ui_action as string
                const target = (result as Record<string, unknown>).target as string
                window.dispatchEvent(new CustomEvent('voice:navigate-ui', {
                    detail: { action: uiAction, target },
                }))
                break
            }

            default:
                invalidateItinerary()
        }
    }, [invalidateItinerary, animateThenRefresh, scheduleArrivalAnimation])

    return { handleFunctionExecuted }
}
