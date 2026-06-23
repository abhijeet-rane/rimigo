import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import WatchDiscoverFloatingButton from '@/modules/Acitvities/components/WatchDiscoverFloatingButton'
import ActivityExploreReelsView from '@/modules/Acitvities/components/SneakPeakModal/ActivityExploreReelsView'
import ReelVideoLoader from '@/modules/Acitvities/components/SneakPeakModal/ReelVideoLoader'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import { useFirstShortsForExperiences } from '@/modules/Acitvities/hooks/useFirstShortsForExperiences'
import { useOptionalItineraryAdd } from '@/modules/Acitvities/context/ItineraryAddContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface WatchDiscoverProps {
    /** Experiences to surface in the feed (e.g. every country experience). */
    experiences: ExperienceCardData[]
    /** Heart state + handlers, sourced from the caller's shortlist layer. */
    shortlistState: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds: Record<string, boolean>
    onShortlistToggle?: (experienceId: string) => Promise<void> | void
    /** Only mount the buttons when the Activities tab is the visible tab so
     *  the entrance animation replays on tab return (the tabs stay in the DOM). */
    isActive?: boolean
    /** Curator-shared pages can't shortlist — suppresses the buttons. */
    readOnlyShortlist?: boolean
    tripId?: string | null
    /** Posthog trigger label for the sneak-peek sheet. */
    triggerType?: string
    /** Total experiences in the listing (across all pages). Used for the
     *  desktop tour's "n / total" label so the denominator reflects the full
     *  count up front instead of only the pages loaded so far. Falls back to
     *  the loaded count when omitted. */
    totalCount?: number
    /** Eager-load the rest of the listing's pages when the feed opens so the
     *  reels span every experience, not just the first page. Optional. */
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
    fetchNextPage?: () => void
}

const SHORTS_PREFETCH = 4

/**
 * Cross-experience "Watch & Discover" entry point — a floating CTA that opens
 * a video-first feed of the supplied experiences:
 *   - Mobile → a vertical reels feed (`ActivityExploreReelsView`).
 *   - Desktop → a sneak-peek tour that steps through every experience.
 *
 * Self-contained: owns its own open/tour state and sneak-peek sheet, so a host
 * (e.g. the Activities country overview) just renders `<WatchDiscover ... />`
 * with the experiences it already has.
 */
const WatchDiscover: React.FC<WatchDiscoverProps> = ({
    experiences,
    shortlistState,
    shortlistLoadingIds,
    onShortlistToggle,
    isActive = true,
    readOnlyShortlist = false,
    tripId,
    triggerType = 'activities_watch_discover',
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
}) => {
    const itineraryAddCtx = useOptionalItineraryAdd()
    const { trackButtonClickCustom } = usePostHog()
    const trackOpen = (variant: 'mobile' | 'desktop') =>
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_WATCH_DISCOVER_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { variant, count: experiences.length }
        })

    // Mobile reels feed.
    const [isWatchDiscoverOpen, setIsWatchDiscoverOpen] = useState(false)
    // Per-reel "View details" sheet (mobile, layered over the reels).
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    // Desktop sneak-peek tour pointer (null = not touring).
    const [sneakPeekTourIndex, setSneakPeekTourIndex] = useState<number | null>(null)
    const isSneakPeekTour = sneakPeekTourIndex !== null

    // Furthest reel the user has reached — drives both the shorts prefetch
    // window and on-demand listing pagination.
    const [activeReelIndex, setActiveReelIndex] = useState(0)
    useEffect(() => {
        if (!isWatchDiscoverOpen) setActiveReelIndex(0)
    }, [isWatchDiscoverOpen])

    // Page the listing in lazily: fetch the NEXT page only as the user nears
    // the end of what's already loaded — never the whole listing up front.
    // Eagerly chaining every page on open fired ~30 back-to-back requests for
    // large countries, saturating the network/main thread and stalling the
    // active video (it would buffer, then drop back to the loading state). Now
    // each page is pulled in just ahead of the position the user has reached —
    // in the mobile reels feed (activeReelIndex) OR the desktop sneak-peek tour
    // (sneakPeekTourIndex), so the desktop tour spans every page too instead of
    // being stuck on the first 20.
    const PAGE_FETCH_AHEAD = 5
    const furthestReachedIndex = Math.max(activeReelIndex, sneakPeekTourIndex ?? 0)
    useEffect(() => {
        if (!isWatchDiscoverOpen && !isSneakPeekTour) return
        if (!hasNextPage || isFetchingNextPage) return
        if (furthestReachedIndex >= experiences.length - PAGE_FETCH_AHEAD) fetchNextPage?.()
    }, [isWatchDiscoverOpen, isSneakPeekTour, furthestReachedIndex, experiences.length, hasNextPage, isFetchingNextPage, fetchNextPage])

    // Sliding shorts-fetch window so we don't fan out one request per reel on
    // open. Expands as the user advances; never shrinks (cached shorts stay).
    const [shortsWindowEnd, setShortsWindowEnd] = useState(SHORTS_PREFETCH + 1)
    useEffect(() => {
        if (!isWatchDiscoverOpen) setShortsWindowEnd(SHORTS_PREFETCH + 1)
    }, [isWatchDiscoverOpen])
    const handleReelsActiveIndexChange = useCallback((index: number) => {
        setActiveReelIndex(index)
        setShortsWindowEnd((prev) => Math.max(prev, index + SHORTS_PREFETCH + 1))
    }, [])

    const watchDiscoverExperienceList = useMemo(
        () => experiences.slice(0, Math.min(shortsWindowEnd, experiences.length)).map((a) => ({ id: a.id, name: a.title })),
        [experiences, shortsWindowEnd]
    )
    const { firstShorts: watchDiscoverShorts, isLoading: isWatchDiscoverLoading } = useFirstShortsForExperiences({
        experiences: watchDiscoverExperienceList,
        enabled: isWatchDiscoverOpen
    })

    // Experiences → reel items. Every experience appears: ones with a YouTube
    // short get their video, the rest show their hero image. Each reel carries
    // its own shortlist + view-details + add-to-itinerary bindings.
    const watchDiscoverReelItems = useMemo(() => {
        if (!isWatchDiscoverOpen) return []
        // Index shorts by experience id so assembling 500+ reels is O(n), not
        // O(n²) — the per-item .find was a real cost on every scroll-driven
        // re-render of large listings.
        const shortsById = new Map(watchDiscoverShorts.map((s) => [s.experienceId, s]))
        return experiences.map((exp) => {
            const shortInfo = shortsById.get(exp.id)
            const shortlistEntry = shortlistState[exp.id]
            const displayTitle = exp.title
            return {
                // STABLE key per experience — must not change when the short
                // resolves, else the reel node remounts and activeIndex freezes.
                id: `wd-${exp.id}`,
                url: shortInfo?.shortUrl ?? '',
                urls: shortInfo?.shortUrls ?? (shortInfo?.shortUrl ? [shortInfo.shortUrl] : []),
                isLoadingShort: !shortInfo || shortInfo.isLoading,
                imageUrl: exp.image,
                experienceName: displayTitle,
                duration: shortInfo?.duration ?? null,
                bestMonths: shortInfo?.bestMonths ?? null,
                valueForMoney: shortInfo?.valueForMoney ?? null,
                walkingRequired: shortInfo?.walkingRequired ?? null,
                isShortlisted: shortlistEntry?.isShortlisted ?? false,
                isShortlisting: Boolean(shortlistLoadingIds[exp.id]),
                onShortlistToggle: () => {
                    void onShortlistToggle?.(exp.id)
                },
                onViewDetails: () => setSneakPeekExperienceId(exp.id),
                onAddToItinerary:
                    itineraryAddCtx && !itineraryAddCtx.hideAddAffordance
                        ? () => itineraryAddCtx.onAddToItinerary(exp.id, displayTitle ?? 'Activity', exp.image ?? null)
                        : undefined,
                isInItinerary: itineraryAddCtx?.itineraryExperienceIds.has(exp.id) ?? false
            }
        })
    }, [isWatchDiscoverOpen, experiences, watchDiscoverShorts, shortlistState, shortlistLoadingIds, onShortlistToggle, itineraryAddCtx])

    // Random hero image for the button bg — excludes index 0 (already anchors
    // the page) so it doesn't duplicate what the user already sees.
    const watchDiscoverButtonImage = useMemo(() => {
        if (experiences.length === 0) return null
        if (experiences.length === 1) return experiences[0]?.image ?? null
        const pool = experiences.slice(1)
        const idx = Math.floor(Math.random() * pool.length)
        return pool[idx]?.image ?? null
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [experiences.map((e) => e.id).join(',')])

    // Desktop tour nav.
    const startSneakPeekTour = useCallback(() => {
        if (experiences.length > 0) setSneakPeekTourIndex(0)
    }, [experiences.length])
    const sneakPeekTourPrev = useCallback(() => {
        setSneakPeekTourIndex((i) => (i === null ? i : Math.max(0, i - 1)))
    }, [])
    const sneakPeekTourNext = useCallback(() => {
        setSneakPeekTourIndex((i) => (i === null ? i : Math.min(experiences.length - 1, i + 1)))
    }, [experiences.length])
    const closeSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
        setSneakPeekTourIndex(null)
    }, [])

    const activeSneakPeekId = isSneakPeekTour ? (experiences[sneakPeekTourIndex]?.id ?? null) : sneakPeekExperienceId

    if (readOnlyShortlist || experiences.length === 0 || !isActive) return null

    return (
        <>
            {/* Mobile reels CTA — hidden while the feed is open (it sits behind it). */}
            {!isWatchDiscoverOpen && (
                <WatchDiscoverFloatingButton
                    backgroundImageUrl={watchDiscoverButtonImage}
                    onClick={() => {
                        trackOpen('mobile')
                        setIsWatchDiscoverOpen(true)
                    }}
                />
            )}

            {/* Desktop sneak-peek tour CTA — hidden while a tour is running. */}
            {!isSneakPeekTour && (
                <WatchDiscoverFloatingButton
                    variant="desktop"
                    backgroundImageUrl={watchDiscoverButtonImage}
                    onClick={() => {
                        trackOpen('desktop')
                        startSneakPeekTour()
                    }}
                />
            )}

            {/* Mobile reels feed. */}
            {isWatchDiscoverOpen && watchDiscoverReelItems.length > 0 && (
                <ActivityExploreReelsView
                    isOpen={isWatchDiscoverOpen}
                    onClose={() => setIsWatchDiscoverOpen(false)}
                    shorts={watchDiscoverReelItems}
                    experienceName={watchDiscoverReelItems[0]?.experienceName ?? ''}
                    initialIndex={0}
                    onActiveIndexChange={handleReelsActiveIndexChange}
                />
            )}
            {isWatchDiscoverOpen && watchDiscoverReelItems.length === 0 && isWatchDiscoverLoading && (
                <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setIsWatchDiscoverOpen(false)}
                        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center"
                        aria-label="Close">
                        <span className="text-white text-xl leading-none">×</span>
                    </button>
                    <ReelVideoLoader />
                </div>
            )}

            {/* Shared sneak-peek sheet — per-reel "View details" (mobile) and
                the desktop tour step both render through here. */}
            {activeSneakPeekId && (
                <SneakPeekModal
                    isOpen={!!activeSneakPeekId}
                    onClose={closeSneakPeek}
                    experienceId={activeSneakPeekId}
                    triggerType={triggerType}
                    tripId={tripId ?? undefined}
                    stackedAboveReels={isWatchDiscoverOpen}
                    onPrev={isSneakPeekTour ? sneakPeekTourPrev : undefined}
                    onNext={isSneakPeekTour ? sneakPeekTourNext : undefined}
                    prevDisabled={isSneakPeekTour && sneakPeekTourIndex === 0}
                    nextDisabled={isSneakPeekTour && sneakPeekTourIndex === experiences.length - 1 && !hasNextPage}
                    tourPositionLabel={isSneakPeekTour ? `${(sneakPeekTourIndex ?? 0) + 1} / ${totalCount || experiences.length}` : undefined}
                />
            )}
        </>
    )
}

export default WatchDiscover
