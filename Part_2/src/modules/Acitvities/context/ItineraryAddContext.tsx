import { createContext, useContext, useMemo, ReactNode } from 'react'

interface ItineraryAddContextValue {
    /** Experience ids already present in the current itinerary. O(1) lookups. */
    itineraryExperienceIds: Set<string>
    /** Triggered when the user taps "+ Add" / the tick chip on a card. The
     *  provider opens the day-picker modal. Callers pass the experience id,
     *  the display name, AND the card's image so the day-picker can show a
     *  thumbnail of what's being added — without this, the modal couldn't
     *  resolve an image for experiences sourced from the all-activities
     *  listing (which lives outside the section-derived `experiences`
     *  array the modal would otherwise look against). */
    onAddToItinerary: (
        experienceId: string,
        experienceName: string,
        experienceImage?: string | null
    ) => void
    /** Hide the "+ Add" affordance on cards that AREN'T already in the
     *  itinerary, while still showing the "Added"/tick state for the ones
     *  that ARE. Used by the Explore subview so users add via Shortlist
     *  only, but can still see at a glance which activities are already
     *  on the trip. */
    hideAddAffordance?: boolean
}

const ItineraryAddContext = createContext<ItineraryAddContextValue | null>(null)

interface ItineraryAddProviderProps {
    itineraryExperienceIds: Set<string>
    onAddToItinerary: (
        experienceId: string,
        experienceName: string,
        experienceImage?: string | null
    ) => void
    /** See `hideAddAffordance` on the context value. */
    hideAddAffordance?: boolean
    children: ReactNode
}

/**
 * Provides "Add to itinerary" capability to descendant explore cards
 * (Top 10 highlights, Best Things, All Activities). When the provider is
 * absent, cards render without the +Add / tick affordance — that's how
 * standalone Activities pages stay unchanged.
 */
export const ItineraryAddProvider = ({ itineraryExperienceIds, onAddToItinerary, hideAddAffordance, children }: ItineraryAddProviderProps) => {
    const value = useMemo(
        () => ({ itineraryExperienceIds, onAddToItinerary, hideAddAffordance }),
        [itineraryExperienceIds, onAddToItinerary, hideAddAffordance]
    )
    return <ItineraryAddContext.Provider value={value}>{children}</ItineraryAddContext.Provider>
}

/** Returns the context or null. Cards read this to decide whether to render
 *  the +Add affordance. */
export const useOptionalItineraryAdd = (): ItineraryAddContextValue | null => useContext(ItineraryAddContext)
