import type { SneakPeekResponse } from '@/modules/Experiences/types/sneakPeekTypes'
import type { SneakPeekFormattedData } from '@/modules/Acitvities/hooks/useSneakPeekData'
import type { GroupTravelerReview } from '@/modules/Experiences/types/experienceDetailTypes'
import SneakPeekInfoStrip from '@/components/shared/SneakPeekInfoStrip'
import ExperienceReviewsSection from '@/modules/Experiences/components/ExperienceDetails/sections/ExperienceReviewsSection'
import { useIsMobile } from '@/hooks/use-mobile'

interface SneakPeekDetailSectionsProps {
    sneakPeekData: SneakPeekResponse | undefined
    /** Formatted highlight-card values (from useSneakPeekData) for the strip. */
    bestMonths: SneakPeekFormattedData['bestMonths']
    duration: SneakPeekFormattedData['duration']
    walkingRequired: SneakPeekFormattedData['walkingRequired']
    valueForMoney: SneakPeekFormattedData['valueForMoney']
    /** Group type to pick the matching review set; falls back to the first available. */
    groupType?: string | null
    className?: string
}

/**
 * Shared "more details" block for the sneak peek — composed from existing,
 * already-built sections that consume the sneak-peek payload as-is:
 *
 *   1. Highlight cards   (SneakPeekInfoStrip)       — best months · duration · walking · value
 *   2. Traveler reviews  (ExperienceReviewsSection) — AI pros & cons for the matching group
 *
 * Each section self-hides when its data is missing. Used by both the desktop
 * panel and the mobile sheet so the two stay in sync.
 */
const SneakPeekDetailSections: React.FC<SneakPeekDetailSectionsProps> = ({
    sneakPeekData,
    bestMonths,
    duration,
    walkingRequired,
    valueForMoney,
    groupType,
    className = ''
}) => {
    const isMobile = useIsMobile()

    if (!sneakPeekData) return null

    const groupReviews = sneakPeekData.traveler_reviews?.group_reviews
    // Prefer the requested group type; otherwise show the first available set.
    const reviewGroupKey = groupReviews
        ? groupType && groupReviews[groupType]
            ? groupType
            : Object.keys(groupReviews)[0]
        : undefined
    const groupReview = reviewGroupKey ? groupReviews?.[reviewGroupKey] : undefined

    const hasStrip = Boolean(bestMonths || duration || walkingRequired || valueForMoney)

    // Nothing to show → render nothing (so callers don't get an empty block).
    if (!hasStrip && !groupReview) return null

    return (
        <div className={`flex flex-col gap-4 min-w-0 ${className}`}>
            {hasStrip && (
                <SneakPeekInfoStrip
                    bestMonths={bestMonths}
                    duration={duration}
                    walkingRequired={walkingRequired}
                    valueForMoney={valueForMoney}
                    // 2x2 on mobile so four cards never overflow the narrow
                    // sheet into a horizontal scroll; single row on desktop.
                    variant={isMobile ? 'grid' : 'strip'}
                />
            )}
            {groupReview && (
                <ExperienceReviewsSection
                    groupReview={groupReview as unknown as GroupTravelerReview}
                    groupType={reviewGroupKey}
                />
            )}
        </div>
    )
}

export default SneakPeekDetailSections
