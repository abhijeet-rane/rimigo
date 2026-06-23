import { useState } from 'react'
import { PanelLeftClose } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import AIPill from '@/components/common/AIPill'
import CustomShimmer from '@/components/shared/Shimmer'
import ShortlistBanner from '@/modules/ContentCollection/components/ShortlistBanner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useShortlistedExperiencesList } from '@/modules/Acitvities/hooks/useShortlistedExperiencesList'
import WishlistRowCard from './WishlistRowCard'
import WishlistEmptyState from './WishlistEmptyState'

interface WishlistRowListProps {
    tripId: string
    countryId?: string | null
    cityIds?: string[]
    isMobile?: boolean
    /** Row click — opens the SneakPeek for the experience. */
    onRowClick: (experienceId: string) => void
    /** Returns true when the experience already sits on the itinerary (drives
     *  the per-card "Added" tick). Defaults to never-added when omitted. */
    isInItinerary?: (experienceId: string) => boolean
    /** Three-dot → "Add to itinerary" for a wishlist row. When omitted (e.g.
     *  read-only viewers) the kebab is hidden. */
    onAddToItinerary?: (experienceId: string, experienceName: string, experienceImage?: string | null) => void
    /** "Schedule with AI" CTA (banner + sticky header). No-op for now. */
    onScheduleWithAI: () => void
    /** Closes the wishlist panel — wired to the header's collapse button. */
    onClose?: () => void
    /** "See all" in "More places for you" — routes to Activities Explore. */
    onSeeAllExplore: () => void
    /** Empty-state "Explore Activities" CTA. */
    onExploreActivities: () => void
    /** "Get a ready-made itinerary" promo. No-op for now. */
    onReadyMade: () => void
}

/**
 * The reusable wishlist body — shared by the desktop in-flow column and the
 * mobile day-view. Owns the shortlist data/toggle (via
 * `useShortlistedExperiencesList`) and the single top header that swaps
 * between the "Your wishlist" + subtitle resting state and the compact
 * "Schedule with AI" stuck state (after scroll or "Not Now").
 */
const WishlistRowList = ({
    tripId,
    countryId,
    isMobile = false,
    isInItinerary,
    onAddToItinerary,
    onRowClick,
    onScheduleWithAI,
    onClose,
    onExploreActivities,
    onReadyMade
}: WishlistRowListProps) => {
    const { flatItems, isLoading, error, hasNextPage, isFetchingNextPage, sentinelRef, isShortlisted, isShortlisting, toggle } =
        useShortlistedExperiencesList(tripId)

    const { trackButtonClickCustom } = usePostHog()
    const track = (buttonName: string, extra?: Record<string, unknown>) =>
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { surface: isMobile ? 'mobile' : 'desktop', ...extra }
        })
    const handleScheduleWithAI = () => {
        track(POSTHOG_EVENTS.WISHLIST_SCHEDULE_WITH_AI_CLICK, { count: flatItems.length })
        onScheduleWithAI()
    }
    const handleClose = () => {
        track(POSTHOG_EVENTS.WISHLIST_CLOSE_CLICK)
        onClose?.()
    }
    const handleRowClick = (experienceId: string) => {
        track(POSTHOG_EVENTS.WISHLIST_ROW_CLICK, { experience_id: experienceId })
        onRowClick(experienceId)
    }
    const handleToggle = (experienceId: string) => {
        track(POSTHOG_EVENTS.WISHLIST_ROW_SHORTLIST_TOGGLE, {
            experience_id: experienceId,
            next: isShortlisted(experienceId) ? 'removed' : 'added'
        })
        void toggle(experienceId)
    }
    // const handleSeeAllExplore = () => {
    //     track(POSTHOG_EVENTS.WISHLIST_MORE_PLACES_SEE_ALL_CLICK)
    //     onSeeAllExplore()
    // }
    const handleExploreActivities = () => {
        track(POSTHOG_EVENTS.WISHLIST_EXPLORE_ACTIVITIES_CLICK)
        onExploreActivities()
    }
    const handleReadyMade = () => {
        track(POSTHOG_EVENTS.WISHLIST_READY_MADE_CLICK)
        onReadyMade()
    }

    // "Not Now" dismisses the banner and flips the header into its compact
    // state, moving the "Schedule with AI" CTA up into the header. While the
    // banner is visible the header stays in its resting "Your wishlist" +
    // subtitle state (no AI button) — the CTA lives in the banner itself.
    // The banner itself owns its dismissal + entrance animation and resets
    // on re-mount (exactly like the Activities tab banner), so reopening the
    // wishlist or reloading brings it back.
    const [notNow, setNotNow] = useState(false)
    const hasItems = flatItems.length > 0
    const headerStuck = hasItems && notNow

    return (
        // Single flex-1 scroller (sticky header inside) — mirrors the day-list
        // so iOS momentum scroll doesn't overshoot.
        <div
            className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-none scrollbar-hide bg-white"
            style={{
                WebkitOverflowScrolling: 'touch',
                // overscroll:none kills the rubber-band bounce; overflow-anchor:none
                // stops the browser fighting the chrome-collapse scroll.
                overflowAnchor: 'none'
            }}>
            {/* Single top header — sticky, swaps content based on stuck state.
                The collapse button is pinned to the right and stays put across
                both states (alongside the "Schedule with AI" pill when stuck)
                so the user always has a clear way to close the wishlist. */}
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-grey-4 bg-white px-4 py-3">
                {headerStuck ? (
                    <>
                        <Typography
                            size="14"
                            weight="bold"
                            family="manrope"
                            color="grey-0">
                            Shortlisted
                        </Typography>
                        <div className="flex shrink-0 items-center gap-2">
                            <AIPill
                                label="Schedule with AI"
                                onClick={handleScheduleWithAI}
                                size="sm"
                            />
                            {onClose && <WishlistCloseButton onClose={handleClose} />}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="min-w-0">
                            <Typography
                                size="14"
                                weight="bold"
                                family="manrope"
                                color="grey-0">
                                Shortlisted
                            </Typography>
                        </div>
                        {onClose && <WishlistCloseButton onClose={handleClose} />}
                    </>
                )}
            </div>

            {/* Banner — same as the Activities tab: always mounted, self-hides
                at count 0, self-manages dismissal (resets on re-mount). onNotNow
                flips the header to its compact "Schedule with AI" state.
                shrink-0 is load-bearing: the banner root is overflow-hidden,
                which gives a flex child auto min-size 0, so the scroll column
                would otherwise crush it to 0 height once the list overflows. */}
            <div className="shrink-0">
                <ShortlistBanner
                    variant="schedule"
                    shortlistedCount={flatItems.length}
                    onAddWithAI={onScheduleWithAI}
                    onNotNow={() => setNotNow(true)}
                />
            </div>

            {/* Body — rendered directly inside the single scroll container. */}
            {isLoading && !hasItems ? (
                <div className="flex flex-col gap-3 p-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <CustomShimmer
                            key={`wishlist-skeleton-${i}`}
                            height={72}
                            radius={16}
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="mx-4 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to load your wishlist. Please try again.
                </div>
            ) : !hasItems ? (
                <div className="flex flex-1 flex-col">
                    <WishlistEmptyState
                        onExploreActivities={handleExploreActivities}
                        onReadyMade={handleReadyMade}
                    />
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-2.5 px-3 py-3">
                        {[...flatItems].sort((a, b) => Number(isInItinerary?.(a.id) ?? false) - Number(isInItinerary?.(b.id) ?? false)).map((item) => (
                            <WishlistRowCard
                                key={item.id}
                                image={item.image}
                                title={item.title}
                                cityName={item.city_name}
                                isShortlisted={isShortlisted(item.id)}
                                isShortlisting={isShortlisting(item.id)}
                                isInItinerary={isInItinerary?.(item.id) ?? false}
                                onClick={() => handleRowClick(item.id)}
                                onToggleShortlist={() => handleToggle(item.id)}
                                onAddToItinerary={
                                    onAddToItinerary
                                        ? () => onAddToItinerary(item.id, item.title, item.image)
                                        : undefined
                                }
                            />
                        ))}
                        {hasNextPage && (
                            <div
                                ref={sentinelRef}
                                className="h-6 w-full"
                            />
                        )}
                        {isFetchingNextPage && (
                            <div className="flex justify-center py-3">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary-default" />
                            </div>
                        )}
                    </div>

                    {/* More places for you — recommended explore cards on a
                        light-purple panel; "See all" (bottom) routes to the
                        Activities Explore tab. */}
                    {countryId && (
                        <div className="mt-1">
                            {/* <MorePlacesForYou
                                countryId={countryId}
                                cityIds={cityIds}
                                tripId={tripId}
                                isMobile={isMobile}
                                onSeeAll={handleSeeAllExplore}
                            /> */}
                            <></>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/** Collapse-the-wishlist affordance — a centered panel-close icon button
 *  shown at the right edge of the wishlist header. */
const WishlistCloseButton = ({ onClose }: { onClose: () => void }) => (
    <button
        type="button"
        onClick={onClose}
        aria-label="Close wishlist"
        title="Close wishlist"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-grey-4 bg-grey-5 text-grey-1 shadow-sm transition-colors hover:border-grey-3 hover:bg-grey-4 hover:text-grey-0">
        <PanelLeftClose className="h-[16px] w-[16px]" />
    </button>
)

export default WishlistRowList
