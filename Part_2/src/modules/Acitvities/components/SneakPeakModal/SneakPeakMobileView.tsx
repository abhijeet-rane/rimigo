import { AnimatePresence, motion } from 'framer-motion'
import React, { useMemo, useRef, useState } from 'react'
import ToursCardModal from './ToursModalCard'
import { Clock, ExternalLink, Heart, MapPin, Map, X } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import CustomShimmer from '@/components/shared/Shimmer'
import { SneakPeekAttachments } from './SneakPeekAttachments'
import TipsList from '@/components/shared/TipsList'
import SneakPeekDetailSections from './SneakPeekDetailSections'
import YouTubeShortsRow from '@/components/shared/YouTubeShortsRow'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import ActivityExploreReelsView from './ActivityExploreReelsView'

interface SneakPeakMobileViewProps {
    isOpen: boolean
    onClose: () => void

    sneakPeekData: any
    experienceName: string
    youtubeShorts: any[]
    bestMonths: { value: string; description: string } | null
    duration: { value: string; description: string } | null
    walkingRequired: { value: string; description: string } | null
    valueForMoney: { value: string; description: string } | null

    isShortlisted: boolean
    isShortlisting: boolean
    handleShortlistToggle: () => void
    handleViewDetails: () => void
    onViewMap?: () => void
    triggerType?: string
    isLoadingSneakPeek: boolean
    slotNotes?: string
    slotSuggestionReasons?: string[]
    slotAttachments?: any[]
    /**
     * Bump backdrop/sheet z-index above the reels overlay (z-9999) so the
     * sheet stacks ON TOP of a still-open reels feed (View Details inside
     * Watch & Discover / per-card Watch Reel). Default false keeps the
     * normal z-9997/z-9998 stack for sheets opened directly from a card.
     */
    stackedAboveReels?: boolean
}

const SneakPeakMobileView: React.FC<SneakPeakMobileViewProps> = ({
    isOpen,
    onClose,
    sneakPeekData,
    experienceName,
    youtubeShorts,
    bestMonths,
    duration,
    walkingRequired,
    isShortlisted,
    valueForMoney,
    isShortlisting,
    handleShortlistToggle,
    handleViewDetails,
    onViewMap,
    isLoadingSneakPeek,
    triggerType,
    slotNotes,
    slotSuggestionReasons,
    slotAttachments,
    stackedAboveReels = false
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const toursRef = useRef<HTMLDivElement>(null)
    const [hasNoTours, setHasNoTours] = useState(false)
    const [reelsStartIndex, setReelsStartIndex] = useState<number | null>(null)
    const { trackButtonClickCustom } = usePostHog()

    const sneakPeekExtras = {
        experienceId: sneakPeekData?.experience_id,
        experienceName,
        triggerType: triggerType || null
    }

    const handleViewDetailsClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_VIEW_DETAILS_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: sneakPeekExtras
        })
        handleViewDetails()
    }

    const handleCloseClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_CLOSE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: sneakPeekExtras
        })
        onClose()
    }

    const handleShortlistClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_SHORTLIST_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { ...sneakPeekExtras, next: isShortlisted ? 'removed' : 'added' }
        })
        handleShortlistToggle()
    }

    const handleOpenMap = () => {
        if (!onViewMap) return
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_VIEW_MAP_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: sneakPeekExtras
        })
        onClose()
        setTimeout(() => onViewMap(), 150)
    }

    const handlePlayShortClick = (index: number) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_SHORT_PLAY_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { ...sneakPeekExtras, index }
        })
        setReelsStartIndex(index)
    }

    // Shorts for the reels viewer, each carrying the EXPERIENCE photo as its
    // poster / no-video fallback (landscape hero, else first verified photo).
    // The raw `youtubeShorts` have no image, so without this the reels view
    // falls back to YouTube's thumbnail when a video is refused (e.g. 150).
    const reelsShorts = useMemo(() => {
        const poster = sneakPeekData?.landscape_image ?? sneakPeekData?.verified_photos?.[0]?.url
        return youtubeShorts.map((s) => ({ ...s, imageUrl: s?.imageUrl ?? poster }))
    }, [youtubeShorts, sneakPeekData])

    // Build location string
    const location = sneakPeekData?.city_name || sneakPeekData?.country_name || ''
    const timings = sneakPeekData?.operating_hours || ''
    const priceRange = sneakPeekData?.estimated_cost ? `₹ ${sneakPeekData.estimated_cost}` : ''

    // Best months / Walking / Value strip shows only when the visible mobile
    // surface is otherwise empty. Description is hidden on mobile, so it
    // never counts as content — only the body sections (shorts, tips,
    // attachments, tours) do.
    const hasTips = Boolean(
        (slotNotes && slotNotes.trim()) ||
            (slotSuggestionReasons && slotSuggestionReasons.length > 0)
    )
    const hasAttachments = Boolean(slotAttachments && slotAttachments.length > 0)
    // Whether the experience has any rich detail to show above tours — gates
    // the details section so it never leaves an empty padded block + divider.
    const hasDetailSections = Boolean(
        sneakPeekData &&
            (bestMonths ||
                duration ||
                walkingRequired ||
                valueForMoney ||
                sneakPeekData.traveler_reviews?.group_reviews)
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP — z-[10001] when stacked over the reels
                        overlay (z-9999), else default z-[9997]. */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCloseClick}
                        className={`fixed inset-0 bg-black/60 ${stackedAboveReels ? 'z-[10001]' : 'z-[9997]'}`}
                    />

                    {/* BOTTOM SHEET — z-[10002] when stacked over the reels
                        overlay (z-9999), else default z-[9998].
                        `data-overlay-scroll`: the global `useHideOnScrollDown`
                        hook (hooked at document/capture) treats any ancestor
                        with this marker as a SEALED scroll context and skips
                        the event. Without it, scrolling inside the sheet
                        bubbled up and the hook hid the Tripboard sub-header
                        underneath — same root cause as the AI assistant
                        scroll-leak we patched earlier. */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        data-overlay-scroll
                        className={`fixed inset-x-0 bottom-0 bg-white rounded-t-[20px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden ${stackedAboveReels ? 'z-[10002]' : 'z-[9998]'}`}>

                        {/* ── Drag handle ── */}
                        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                            <div className="w-9 h-1 rounded-full bg-grey-4" />
                        </div>

                        {/* ── Title + actions (ABOVE video) ── */}
                        <div className="px-4 pt-1 pb-2.5 shrink-0">
                            {isLoadingSneakPeek ? (
                                <div className="flex items-start gap-3">
                                    <CustomShimmer height={48} className="w-12 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <CustomShimmer height={18} className="w-3/4" />
                                        <CustomShimmer height={12} className="w-1/2" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    {/* Landscape thumbnail */}
                                    {sneakPeekData?.landscape_image && (
                                        <img
                                            src={sneakPeekData.landscape_image}
                                            alt={experienceName}
                                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <Typography size="16" weight="semibold" family="redhat" color="grey-0" lineHeight="20px">
                                            {experienceName}
                                        </Typography>
                                        {location && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <MapPin size={11} className="text-grey-2 shrink-0" />
                                                <Typography size="11" weight="medium" family="manrope" color="grey-2">
                                                    {location}
                                                </Typography>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {timings && (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} className="text-grey-2" />
                                                    <span className="text-[10px] font-medium font-manrope text-grey-2">{timings}</span>
                                                </div>
                                            )}
                                            {priceRange && (
                                                <span className="text-[10px] font-semibold font-manrope text-grey-0">{priceRange}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={handleShortlistClick}
                                            disabled={isShortlisting}
                                            className="w-9 h-9 rounded-full border border-grey-4 flex items-center justify-center bg-white">
                                            <Heart
                                                className={`w-4 h-4 transition-colors ${isShortlisted ? 'fill-secondary-red text-secondary-red' : 'text-grey-1'}`}
                                            />
                                        </button>
                                        <button
                                            onClick={handleCloseClick}
                                            className="w-9 h-9 rounded-full bg-grey-5 flex items-center justify-center">
                                            <X className="w-4 h-4 text-grey-1" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── SCROLLABLE CONTENT ── */}
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                            style={{ scrollbarWidth: 'none' }}>

                            <YouTubeShortsRow
                                shorts={youtubeShorts}
                                title={experienceName}
                                onPlayClick={handlePlayShortClick}
                            />

                            {/* Short description intentionally hidden on mobile —
                                the bottom sheet stays focused on the shorts +
                                tips + booking flow. The full description is
                                still available on the experience detail page
                                via "View Details". */}

                            {/* Body sections built as an array so the divider
                                only renders below sections that aren't last. */}
                            {(() => {
                                const sections: Array<{ key: string; node: React.ReactNode }> = []
                                if (youtubeShorts.length > 0) {
                                    // Shorts already rendered above; use a marker
                                    // so the divider stays positioned correctly.
                                    sections.push({ key: 'shorts', node: null })
                                }
                                if (hasTips || hasAttachments) {
                                    sections.push({
                                        key: 'attachments-tips',
                                        node: (
                                            <div className="px-4 pt-3 pb-3 space-y-3">
                                                {hasAttachments && slotAttachments && (
                                                    <SneakPeekAttachments attachments={slotAttachments} />
                                                )}
                                                <TipsList
                                                    notes={slotNotes}
                                                    suggestions={slotSuggestionReasons}
                                                />
                                            </div>
                                        ),
                                    })
                                }
                                {/* Rich experience detail — highlights ·
                                    reviews · seasonal · good-to-know — shown
                                    ABOVE the booking links/tours. */}
                                if (hasDetailSections) {
                                    sections.push({
                                        key: 'details',
                                        node: (
                                            <div className="px-4 pt-3 pb-3">
                                                <SneakPeekDetailSections
                                                    sneakPeekData={sneakPeekData}
                                                    bestMonths={bestMonths}
                                                    duration={duration}
                                                    walkingRequired={walkingRequired}
                                                    valueForMoney={valueForMoney}
                                                />
                                            </div>
                                        )
                                    })
                                }
                                if (!hasNoTours) {
                                    sections.push({
                                        key: 'tours',
                                        node: (
                                            <div
                                                ref={toursRef}
                                                className="px-4 pt-3 pb-4 flex flex-col gap-3">
                                                <p className="text-[14px] font-semibold font-red-hat-display text-grey-0">
                                                    Exclusive tickets & tours
                                                </p>
                                                {!isLoadingSneakPeek && sneakPeekData && (
                                                    <ToursCardModal
                                                        experienceId={sneakPeekData.experience_id}
                                                        bookingWindow={''}
                                                        triggerType={triggerType}
                                                        viewMode="list"
                                                        onEmptyChange={setHasNoTours}
                                                    />
                                                )}
                                            </div>
                                        ),
                                    })
                                }
                                const lastIdx = sections.length - 1
                                return (
                                    <>
                                        {sections.map((s, i) => (
                                            <React.Fragment key={s.key}>
                                                {s.node}
                                                {i < lastIdx && (
                                                    <div className="border-b border-grey-4 mx-4" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                        {/* Tours empty → keep modal mounted hidden
                                            so its data fetch + onEmptyChange
                                            callback still run. Outside the
                                            divider loop. */}
                                        {hasNoTours && !isLoadingSneakPeek && sneakPeekData && (
                                            <div className="hidden">
                                                <ToursCardModal
                                                    experienceId={sneakPeekData.experience_id}
                                                    bookingWindow={''}
                                                    triggerType={triggerType}
                                                    viewMode="list"
                                                    onEmptyChange={setHasNoTours}
                                                />
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>

                        {/* ── FIXED ACTION BAR ── */}
                        <div className="shrink-0 bg-white border-t border-grey-4 px-4 py-3 pb-6">
                            <div className="flex gap-2.5">
                                {/* Map — icon button (only if map is available) */}
                                {onViewMap && (
                                    <button
                                        onClick={handleOpenMap}
                                        className="w-12 h-12 rounded-xl border border-grey-4 flex items-center justify-center bg-white active:scale-[0.95] transition-transform shrink-0">
                                        <Map size={20} className="text-grey-1" />
                                    </button>
                                )}

                                {/* View Details — primary */}
                                <button
                                    onClick={handleViewDetailsClick}
                                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-grey-0 text-white active:scale-[0.97] transition-transform">
                                    <ExternalLink size={16} />
                                    <span className="text-[14px] font-semibold font-manrope">View Details</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {reelsStartIndex !== null && (
                        <ActivityExploreReelsView
                            isOpen
                            onClose={() => setReelsStartIndex(null)}
                            shorts={reelsShorts}
                            experienceName={experienceName}
                            initialIndex={reelsStartIndex}
                            duration={duration}
                            bestMonths={bestMonths}
                            valueForMoney={valueForMoney}
                            walkingRequired={walkingRequired}
                            description={sneakPeekData?.short_description ?? null}
                            // Same-activity reel feed — matches the per-card
                            // Watch Reel flow: dot indicator + horizontal
                            // swipe between sibling reels of this experience.
                            indicatorStyle="dots"
                            swipeDirection="horizontal"
                            // We're already inside the sneak-peek (which IS
                            // the details view) — the bottom action row
                            // (View Details + heart + add) is redundant
                            // and visually heavy here. `hideViewDetails`
                            // drops the View Details CTA; intentionally NOT
                            // wiring `onShortlistToggle` / per-reel add
                            // means the row's render condition becomes
                            // false and it disappears entirely, leaving
                            // just the title + info pills over the video.
                            hideViewDetails
                            // When this sheet is itself stacked over an
                            // outer reels feed (z-[10002]), the videos
                            // opened from inside need to render ABOVE the
                            // sheet — otherwise they're invisible behind it.
                            // `zBoost` lifts this inner viewer to z-[10004].
                            zBoost={stackedAboveReels}
                        />
                    )}
                </>
            )}
        </AnimatePresence>
    )
}

export default SneakPeakMobileView
