import HorizontalListCard from '@/components/HorizontalListCard'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { useUserInfo } from '@/hooks/useUserInfo'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import RemoveSectionButton from './RemoveSectionButton'

interface ExperienceWithToursProps {
    experience: ExperienceCardData
    onExperienceClick: (experienceId: string) => void
    onAddToCollection?: (experienceId: string) => void
    isHovered: boolean
    onMouseEnter: () => void
    onMouseLeave: () => void
    isPublicView?: boolean
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    shouldLoadTours?: boolean // Whether to fetch tours for this experience (for pagination)
    checkIn?: string | null // Check-in date for tours (YYYY-MM-DD format)
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistClick?: (e: React.MouseEvent) => void
    onSwitchToMapTab?: () => void // Optional callback to switch to map tab (for mobile)
    sectionId?: string // Section ID for deletion
    onDeleteSection?: (sectionId: string) => void // Callback to delete section
    showDeleteButton?: boolean // Whether to show delete button
    isDeleting?: boolean // Whether deletion is in progress
    /** Opt-in: when no tours, fetch sneak-peek and show the info strip instead of the empty card. */
    enableSneakPeekFallback?: boolean
    /** Reports to parent once tours settle whether this experience has any tours. */
    onTourAvailabilityReport?: (experienceId: string, hasTours: boolean) => void
}

const ExperienceWithTours: React.FC<ExperienceWithToursProps> = ({
    experience,
    onExperienceClick,
    onAddToCollection,
    isHovered: _isHovered, // Prefixed with _ to indicate intentionally unused (kept for API compatibility)
    onMouseEnter,
    onMouseLeave,
    isPublicView = false,
    onSneakPeekClick,
    shouldLoadTours = true, // Default to true for backward compatibility
    checkIn,
    isShortlisted = false,
    isShortlisting = false,
    onShortlistClick,
    onSwitchToMapTab,
    sectionId,
    onDeleteSection,
    showDeleteButton = false,
    isDeleting = false,
    enableSneakPeekFallback = false,
    onTourAvailabilityReport
}) => {
    const experienceId = experience.id
    const { isRimigoInternal } = useUserInfo()
    const { trackButtonClickCustom } = usePostHog()

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (sectionId && onDeleteSection) {
            onDeleteSection(sectionId)
        }
    }

    const handleAddToCollectionClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onAddToCollection?.(experienceId)
    }

    const handleSneakPeekClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSneakPeekClick?.(e, experienceId)
    }

    const handleShortlistClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onShortlistClick?.(e)
    }

    const handleViewOnMapClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.EXPERIENCE_CARD_MAPS_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                experienceId
            }
        })

        // Switch to map tab on mobile if callback is provided
        onSwitchToMapTab?.()

        // Dispatch event to focus marker on map (similar to StaysExplore)
        try {
            const evt = new CustomEvent('collection:focusMarker', { detail: { id: experienceId } })
            window.dispatchEvent(evt)
        } catch (error) {
            // Ignore errors if event dispatch fails
            console.warn('Failed to dispatch focus marker event', error)
        }
    }

    // Get the first image for sneak peek button
    const sneakPeekUserImage = experience.images && experience.images.length > 0 ? experience.images[0] : experience.image

    // Suppress unused variable warning - isHovered is kept for API compatibility but not currently used
    void _isHovered

    return (
        // `h-full` lets the card stretch to fill its grid cell. When the
        // Shortlist view renders cards in `md:grid-cols-2`, neighbouring
        // cards in the same row have unequal natural heights (a "no
        // tours" card is shorter than one with a populated tour panel).
        // Without h-full the shorter card sits at its natural height and
        // the row visually mismatches.
        <div className="relative w-full max-w-full h-full">
            {/* Remove button */}
            {showDeleteButton && sectionId && onDeleteSection && (
                <RemoveSectionButton
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                />
            )}
            <HorizontalListCard
                image={experience.image}
                images={experience.images}
                imageAlt={experience.name || experience.title}
                title={experience.name || experience.title}
                city={experience.city_name}
                description={experience.short_description}
                category={experience.category}
                categoryIcon={experience.categoryIcon}
                categories={experience.categories}
                onClick={() => onExperienceClick(experienceId)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                showShortlistButton={!!onShortlistClick}
                isShortlisted={isShortlisted}
                isShortlisting={isShortlisting}
                onShortlistClick={onShortlistClick ? handleShortlistClick : undefined}
                showSneakPeekButton={!!onSneakPeekClick}
                onSneakPeekClick={onSneakPeekClick ? handleSneakPeekClick : undefined}
                sneakPeekUserImage={sneakPeekUserImage}
                showAddToCollectionButton={!!onAddToCollection}
                onAddToCollectionClick={onAddToCollection ? handleAddToCollectionClick : undefined}
                isRimigoInternal={isRimigoInternal}
                experienceId={experienceId}
                isPublicView={isPublicView}
                shouldLoadTours={shouldLoadTours}
                checkIn={checkIn}
                enableSneakPeekFallback={enableSneakPeekFallback}
                onTourAvailabilityReport={onTourAvailabilityReport}
                className="w-full h-full"
                handleViewDetailsClick={() => onExperienceClick(experienceId)}
                handleViewOnMapClick={handleViewOnMapClick}
            />
        </div>
    )
}

export default ExperienceWithTours
