/**
 * Global "shortlist changed" signal. `bulkUpsertTripExperiences` (the single
 * shortlist write path) dispatches this after a successful write, so any
 * surface deriving state from the shortlist — the count context, the React
 * Query caches — can refetch regardless of where the toggle came from.
 */
export const SHORTLIST_CHANGED_EVENT = 'rimigo:shortlistChanged'

export interface ShortlistChangedDetail {
    tripId?: string
    experienceId?: string
    isShortlisted?: boolean
}

export type ShortlistChangedEvent = CustomEvent<ShortlistChangedDetail>

export const dispatchShortlistChanged = (detail?: ShortlistChangedDetail) => {
    if (typeof window === 'undefined') {
        return
    }

    const event: ShortlistChangedEvent = new CustomEvent(SHORTLIST_CHANGED_EVENT, {
        detail
    })

    window.dispatchEvent(event)
}

export const addShortlistChangedListener = (listener: (event: ShortlistChangedEvent) => void): (() => void) => {
    if (typeof window === 'undefined') {
        return () => {}
    }

    window.addEventListener(SHORTLIST_CHANGED_EVENT, listener as EventListener)

    return () => {
        window.removeEventListener(SHORTLIST_CHANGED_EVENT, listener as EventListener)
    }
}
