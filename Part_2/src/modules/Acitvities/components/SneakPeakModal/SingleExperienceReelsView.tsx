import { useMemo } from 'react'
import ActivityExploreReelsView from './ActivityExploreReelsView'
import ReelVideoLoader from './ReelVideoLoader'
import { useExperienceShorts } from '../../hooks/useExperienceShorts'

interface Props {
    isOpen: boolean
    onClose: () => void
    /** The single experience whose own videos make up the reel feed. */
    experienceId: string
    /** Display name used until the sneak-peek API name resolves. */
    experienceName?: string
    /** Card image used as the poster while a short buffers, when the
     *  API doesn't return its own landscape image. */
    fallbackImageUrl?: string
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistToggle?: () => void
    onViewDetails?: () => void
    onAddToItinerary?: () => void
    isInItinerary?: boolean
}

/**
 * Per-card reels view — shows ONLY the tapped activity's own shorts (it
 * can have several) and swipes stay within that activity. Wraps the
 * generic `ActivityExploreReelsView` with a single-experience fetch
 * (`useExperienceShorts`) and the same loading scrim the cross-activity
 * feeds use so the user never sees a brief empty state while shorts
 * hydrate.
 */
export default function SingleExperienceReelsView({
    isOpen,
    onClose,
    experienceId,
    experienceName,
    fallbackImageUrl,
    isShortlisted,
    isShortlisting,
    onShortlistToggle,
    onViewDetails,
    onAddToItinerary,
    isInItinerary
}: Props) {
    const { shorts, name, imageUrl, duration, bestMonths, valueForMoney, walkingRequired, isLoading } = useExperienceShorts({
        experienceId,
        name: experienceName,
        enabled: isOpen
    })

    // Every reel belongs to the same activity, so they all share the
    // title, poster, pills and action bindings.
    const reelShorts = useMemo(() => {
        if (!isOpen) return []
        return shorts.map((s) => ({
            id: s.reelId,
            url: s.url,
            // Poster / no-video fallback = the EXPERIENCE photo, never a
            // YouTube thumbnail. Prefer the card image the user just tapped
            // (`fallbackImageUrl`), then the sneak-peek landscape/verified
            // photo from the hook.
            imageUrl: fallbackImageUrl ?? imageUrl,
            experienceName: name,
            duration,
            bestMonths,
            valueForMoney,
            walkingRequired,
            isShortlisted,
            isShortlisting,
            onShortlistToggle,
            onViewDetails,
            onAddToItinerary,
            isInItinerary
        }))
    }, [
        isOpen,
        shorts,
        imageUrl,
        fallbackImageUrl,
        name,
        duration,
        bestMonths,
        valueForMoney,
        walkingRequired,
        isShortlisted,
        isShortlisting,
        onShortlistToggle,
        onViewDetails,
        onAddToItinerary,
        isInItinerary
    ])

    if (!isOpen) return null

    if (reelShorts.length === 0 && isLoading) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center"
                    aria-label="Close">
                    <span className="text-white text-xl leading-none">×</span>
                </button>
                <ReelVideoLoader />
            </div>
        )
    }

    return (
        <ActivityExploreReelsView
            isOpen={isOpen}
            onClose={onClose}
            shorts={reelShorts}
            experienceName={name}
            initialIndex={0}
            // Same-activity reel feed (typically 1-5 videos) — show the
            // stories-style dot progress instead of an "1/N" pill so the
            // user sees how many reels this activity has at a glance, and
            // swipe horizontally between siblings (these are variations of
            // the SAME experience, not a stream of different ones).
            indicatorStyle="dots"
            swipeDirection="horizontal"
        />
    )
}
