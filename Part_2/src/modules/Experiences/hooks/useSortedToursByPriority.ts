import { useMemo } from 'react'
import { AdaptedTourResponseType } from '../types/toursResponseTypes'
import { getSortablePrice } from '../utils/tourPrice'

// Lower = ranked higher: personal recs first, then global recs, then the rest.
// Personally-recommended tours float to the primary/first slot so the traveler sees
// their pick up front. This reorder is safe for the curate flow because the curate
// popover is lifted to the list level (HorizontalListCard) — toggling a tour no longer
// remounts its card, so the popover / "Recommend for everyone?" prompt stays open.
export const getTourPriority = (tour: AdaptedTourResponseType | null | undefined): number => {
    if (!tour) return Number.POSITIVE_INFINITY
    if (tour.is_personally_recommended) return 0
    if (tour.is_recommended) return 1
    return 2
}

export const getCheapestTourId = (tours: AdaptedTourResponseType[] | undefined): string | null => {
    if (!tours || tours.length === 0) return null
    let cheapestId: string | null = null
    let cheapestPrice = Number.POSITIVE_INFINITY
    for (const tour of tours) {
        const price = getSortablePrice(tour)
        if (price != null && price < cheapestPrice) {
            cheapestPrice = price
            cheapestId = tour.id
        }
    }
    return cheapestId
}

// Sort by priority tier first, then price ascending within each tier.
export const useSortedToursByPriority = (tours?: AdaptedTourResponseType[]) => {
    return useMemo(() => {
        if (!tours || tours.length === 0) return []

        return [...tours].sort((a, b) => {
            const priorityDiff = getTourPriority(a) - getTourPriority(b)
            if (priorityDiff !== 0) return priorityDiff

            const aPrice = getSortablePrice(a)
            const bPrice = getSortablePrice(b)

            if (aPrice == null && bPrice == null) return 0
            if (aPrice == null) return 1
            if (bPrice == null) return -1

            return aPrice - bPrice
        })
    }, [tours])
}
