import { useCallback } from 'react'
import { useOptionalItineraryAdd } from '../context/ItineraryAddContext'

interface UseItineraryAddItemResult {
    /** True when the experience is already on the itinerary. */
    isAdded: boolean
    /** True when the affordance should render nothing at all (no
     *  provider, OR provider hides non-added affordances and the item
     *  is not yet added). Render branch goes: `if (shouldHide) return null`. */
    shouldHide: boolean
    /** stopPropagation + provider call. No-op when already added. */
    handleAdd: (e?: React.MouseEvent) => void
}

/** Shared state + click handler for the +Add / tick affordances. */
export function useItineraryAddItem(
    experienceId: string,
    experienceName: string,
    experienceImage?: string | null,
): UseItineraryAddItemResult {
    const ctx = useOptionalItineraryAdd()
    const isAdded = ctx?.itineraryExperienceIds.has(experienceId) ?? false
    const shouldHide = !ctx || (!isAdded && !!ctx.hideAddAffordance)

    const handleAdd = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation()
            if (!ctx || isAdded) return
            ctx.onAddToItinerary(experienceId, experienceName, experienceImage ?? null)
        },
        [ctx, isAdded, experienceId, experienceName, experienceImage],
    )

    return { isAdded, shouldHide, handleAdd }
}
