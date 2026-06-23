import Typography from '@/components/shared/Typography'
import { EXPERIENCE_JAPAN_1, EXPERIENCE_JAPAN_2 } from '@/constants/icons/svgFromCDN'

interface WishlistEmptyStateProps {
    onExploreActivities: () => void
    /** No-op placeholder for now — wired up later. */
    onReadyMade: () => void
}

/**
 * Zero state for the wishlist surface: centred "No shortlisted activities"
 * prompt with an Explore CTA, plus a bottom-pinned "Get a ready-made
 * itinerary" promo card.
 */
const WishlistEmptyState = ({ onExploreActivities }: WishlistEmptyStateProps) => {
    return (
        // Large mobile pb clears the floating assistant chip; desktop has no
        // chip over the column, so a normal inset keeps the CTA at the bottom.
        <div className="flex min-h-full flex-col gap-8 px-4 pt-6 pb-28 md:pb-6">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                {/* Two tilted "polaroid" travel photos. */}
                <div className="relative mb-4 h-[84px] w-[128px]">
                    <img
                        src={EXPERIENCE_JAPAN_1}
                        alt=""
                        className="absolute left-3 top-1.5 h-[68px] w-[68px] -rotate-[5deg] rounded-xl border-[3px] border-white object-cover shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25)]"
                    />
                    <img
                        src={EXPERIENCE_JAPAN_2}
                        alt=""
                        className="absolute right-3 top-0.5 h-[68px] w-[68px] rotate-[4deg] rounded-xl border-[3px] border-white object-cover shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25)]"
                    />
                </div>
                <Typography
                    size="16"
                    weight="bold"
                    family="redhat"
                    color="grey-0">
                    Shortlisted activites appear here
                </Typography>
                <p className="mt-1.5 max-w-[240px] text-[13px] font-medium font-red-hat-display text-grey-2">
                    Browse and shortlist activities to add to your itinerary
                </p>
                <button
                    type="button"
                    onClick={onExploreActivities}
                    className="mt-5 rounded-xl bg-primary-default hover:bg-primary-default/90 transition-colors px-5 py-2.5 text-[14px] font-bold font-red-hat-display text-white cursor-pointer">
                    Shortlist Activities
                </button>
            </div>

            {/* <button
                type="button"
                onClick={onReadyMade}
                className="relative flex h-[104px] shrink-0 items-stretch overflow-hidden rounded-3xl bg-white text-left cursor-pointer">
                <div className="relative z-10 flex min-w-0 flex-[1.4] flex-col justify-center p-3.5">
                    <Typography
                        size="15"
                        weight="bold"
                        family="manrope"
                        color="grey-0"
                        className="line-clamp-1">
                        Get a ready-made itinerary
                    </Typography>
                    <Typography
                        size="12"
                        weight="medium"
                        family="manrope"
                        color="grey-1"
                        className="mt-1 line-clamp-3">
                        Click to generate a personalised itinerary that suits your preferences
                    </Typography>
                </div>
                <div className="relative flex-1 shrink-0 overflow-hidden">
                    <img
                        src={HERO_IMAGES}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-150 rotate-6 object-cover"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
                </div>
                
                <span className="pointer-events-none absolute inset-0 rounded-3xl border-[3px] border-primary-default" />
            </button> */}
        </div>
    )
}

export default WishlistEmptyState
