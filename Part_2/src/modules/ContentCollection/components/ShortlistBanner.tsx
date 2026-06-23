import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import AIPill from '@/components/common/AIPill'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface ShortlistBannerProps {
    /** 'explore' = nudge (no CTA); 'shortlist' = "Add with AI" CTA;
     *  'schedule' = wishlist banner with "Schedule with AI" + "Not Now". */
    variant: 'explore' | 'shortlist' | 'schedule'
    /** Number of shortlisted activities. Banner collapses when 0. */
    shortlistedCount: number
    /** Tapped "Add with AI" / "Schedule with AI". */
    onAddWithAI?: () => void
    /** Tapped "Not Now" (schedule variant) — parent reveals the sticky header. */
    onNotNow?: () => void
    /** Shortlist variant only: every shortlisted activity is already on the
     *  itinerary. Swaps the nudge copy for an "all caught up" message and
     *  drops the "Add with AI" CTA (nothing left to schedule). */
    allCaughtUp?: boolean
}

/**
 * Light-purple contextual banner for the Tripboard Activities tab.
 *
 * Designed to sit INSIDE the sticky chip-header so it pins to the top of
 * the viewport along with the rest of the activities chrome. Renders
 * edge-to-edge (no rounded corners, no horizontal margin) so it lines up
 * with the sticky header's full bleed.
 *
 *   - The component is always mounted (sized to max-h-0 when not visible)
 *     so every state transition — first mount, heart click, X dismiss,
 *     last-card un-heart — runs through the same max-height + opacity
 *     animation. Returning null in any state breaks the transition
 *     because the browser has no collapsed-state frame to ease from.
 *   - The Explore variant (no CTA) persists its dismissal in a module-level
 *     flag, so once crossed it stays hidden across tab switches / remounts
 *     until a full page refresh. The Shortlist variant keeps local-only
 *     dismissal so it resurfaces on return — its "Add with AI" CTA is worth
 *     re-offering each time.
 */

// In-memory only — resets on a full page refresh (module re-evaluated).
let exploreBannerDismissed = false

const ShortlistBanner: React.FC<ShortlistBannerProps> = ({ variant, shortlistedCount, onAddWithAI, onNotNow, allCaughtUp = false }) => {
    const { trackButtonClickCustom } = usePostHog()
    const track = (buttonName: string) =>
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { variant, shortlistedCount }
        })
    const [dismissed, setDismissed] = useState(variant === 'explore' ? exploreBannerDismissed : false)

    // Entrance: render with the row collapsed for one paint, then expand
    // via state flip so the browser actually animates the max-height +
    // opacity transition. Double rAF is needed because React often
    // commits the next-frame state update inside the same paint as the
    // initial render, which would skip the transition.
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const id1 = window.requestAnimationFrame(() => {
            const id2 = window.requestAnimationFrame(() => setMounted(true))
            ;(id1 as unknown as { _next?: number })._next = id2
        })
        return () => {
            window.cancelAnimationFrame(id1)
            const inner = (id1 as unknown as { _next?: number })._next
            if (inner !== undefined) window.cancelAnimationFrame(inner)
        }
    }, [])

    const visible = mounted && !dismissed && shortlistedCount > 0

    const message =
        variant === 'shortlist'
            ? allCaughtUp
                ? "You're all caught up! Every shortlisted activity is already in your itinerary."
                : `You have shortlisted ${shortlistedCount} new ${
                      shortlistedCount === 1 ? 'activity' : 'activities'
                  }. Add them to your itinerary.`
            : variant === 'schedule'
              ? 'These are great spots! Use our AI to organise these places that fit perfectly with your pace.'
              : 'Awesome! Continue to shortlist your favourites and plan your itinerary with AI.'

    const handleNotNow = () => {
        track(POSTHOG_EVENTS.ACTIVITIES_BANNER_NOT_NOW_CLICK)
        setDismissed(true)
        onNotNow?.()
    }

    // Animation: max-height + opacity with Material's standard ease curve
    // so the banner glides in/out at the same leisurely pace regardless
    // of *what* changed (first mount, X click, heart toggle that pushed
    // the count past 0 or back to 0).
    return (
        <div
            className={`overflow-hidden transition-[max-height,opacity] ease-[cubic-bezier(0.4,0,0.2,1)] duration-[1200ms] ${
                visible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
            aria-hidden={!visible}>
            <div
                className={`bg-primary-default-80 border-t border-primary-default/20 px-4 py-3 relative ${
                    variant === 'schedule' ? 'flex flex-col gap-3' : 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'
                }`}>
                <p
                    className={`text-[13px] md:text-[14px] font-medium font-red-hat-display text-grey-0 ${
                        variant === 'schedule' ? '' : 'pr-8 md:pr-0 md:flex-1'
                    }`}>
                    {message}
                </p>
                {variant === 'schedule' ? (
                    <div className="flex items-center gap-4">
                        <AIPill
                            label="Schedule with AI"
                            onClick={() => {
                                track(POSTHOG_EVENTS.ACTIVITIES_BANNER_SCHEDULE_WITH_AI_CLICK)
                                onAddWithAI?.()
                            }}
                            size="sm"
                        />
                        <button
                            type="button"
                            onClick={handleNotNow}
                            className="text-[13px] font-bold font-red-hat-display text-grey-0 underline underline-offset-2 cursor-pointer shrink-0">
                            Not Now
                        </button>
                    </div>
                ) : (
                    <>
                        {variant === 'shortlist' && !allCaughtUp && (
                            <AIPill
                                label="Add with AI"
                                onClick={() => {
                                    track(POSTHOG_EVENTS.ACTIVITIES_BANNER_ADD_WITH_AI_CLICK)
                                    onAddWithAI?.()
                                }}
                                size="sm"
                                className="self-start md:self-auto"
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                track(POSTHOG_EVENTS.ACTIVITIES_BANNER_DISMISS_CLICK)
                                setDismissed(true)
                                // Explore banner stays dismissed until page refresh.
                                if (variant === 'explore') exploreBannerDismissed = true
                            }}
                            aria-label="Dismiss"
                            className="absolute top-2 right-3 md:static md:ml-1 h-6 w-6 rounded-full bg-primary-default hover:bg-primary-default/90 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                            <X className="w-3.5 h-3.5 text-white" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default ShortlistBanner
