import { ShortlistedExperiencesProvider } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import WishlistRowList from './WishlistRowList'

/** Desktop wishlist overlay width (px). The kanban is padded right by this
 *  amount when the wishlist is open so the day columns shift instead of being
 *  covered/compressed. */
export const WISHLIST_PANEL_WIDTH = 440

interface ItineraryWishlistColumnProps {
    isOpen: boolean
    tripId: string
    countryId?: string | null
    cityIds?: string[]
    isInItinerary?: (experienceId: string) => boolean
    onAddToItinerary?: (experienceId: string, experienceName: string, experienceImage?: string | null) => void
    onRowClick: (experienceId: string) => void
    onScheduleWithAI: () => void
    onClose: () => void
    onSeeAllExplore: () => void
    onExploreActivities: () => void
    onReadyMade: () => void
}

/**
 * Desktop wishlist overlay. Absolutely positioned over the left of the
 * itinerary content area so it floats ON TOP of the kanban/map without
 * resizing the day columns (no compression). The parent container is
 * `relative`. Desktop-only — mobile uses the day-tabs heart pill + day-view
 * inside MobileItineraryView.
 */
const ItineraryWishlistColumn = ({
    isOpen,
    tripId,
    countryId,
    cityIds,
    isInItinerary,
    onAddToItinerary,
    onRowClick,
    onScheduleWithAI,
    onClose,
    onSeeAllExplore,
    onExploreActivities,
    onReadyMade
}: ItineraryWishlistColumnProps) => {
    if (!isOpen) return null

    return (
        <div
            style={{ width: WISHLIST_PANEL_WIDTH }}
            className="hidden md:flex absolute left-0 top-0 bottom-0 z-40 min-h-0 flex-col overflow-hidden border-r border-grey-4 bg-white">
            <ShortlistedExperiencesProvider tripId={tripId}>
                <WishlistRowList
                    tripId={tripId}
                    countryId={countryId}
                    cityIds={cityIds}
                    isInItinerary={isInItinerary}
                    onAddToItinerary={onAddToItinerary}
                    onRowClick={onRowClick}
                    onScheduleWithAI={onScheduleWithAI}
                    onClose={onClose}
                    onSeeAllExplore={onSeeAllExplore}
                    onExploreActivities={onExploreActivities}
                    onReadyMade={onReadyMade}
                />
            </ShortlistedExperiencesProvider>
        </div>
    )
}

export default ItineraryWishlistColumn
