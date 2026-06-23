import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, MapPin, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getExperienceSneakPeek } from '@/modules/Experiences/api/experienceApi'
import { useSneakPeekData } from '../../hooks/useSneakPeekData'
import YouTubeShortsCarousel from './YouTubeShortsCarousel'
import ExperienceDetailsPanel from './ExperienceDetailsPanel'
import ModalBackdrop from './ModalBackdrop'
import ModalContainer from './ModalContainer'
import { useSneakPeekShortlist } from './useSneakPeekShortlist'
import { useIsMobile } from '@/modules/Itinerary/hooks/ItineraryHook'
import SneakPeakMobileView from './SneakPeakMobileView'
import ActivityExploreReelsView from './ActivityExploreReelsView'

interface SneakPeekModalProps {
    isOpen: boolean
    onClose: () => void
    experienceId: string
    attachments?: []
    onViewMap?: () => void
    triggerType?: string
    slotNotes?: string
    slotSuggestionReasons?: string[]
    slotAttachments?: any[]
    /**
     * Optional override for the experience name. When the caller (e.g. an
     * itinerary kanban card) already shows a user-facing title, pass it here
     * so the sneak peek title matches the title on the card outside.
     */
    displayName?: string
    /**
     * Opt-in to the fullscreen reels-style mobile view (used by the
     * activity-explore listing). Other surfaces keep the existing
     * scrollable mobile sneak peek. Desktop is unaffected.
     */
    reelsModeOnMobile?: boolean
    /**
     * Trip id fallback for the shortlist hook. Surfaces that know their
     * trip directly (e.g. tripboard activities) pass this so the wishlist
     * action still works when the global `activeTrip` context isn't
     * populated yet.
     */
    tripId?: string
    /**
     * Bump the mobile sheet/backdrop z-index above the reels overlay
     * (z-9999) so the sheet stacks over a still-open reels feed instead
     * of getting clipped behind it. Set this when opening the sneak peek
     * from inside ActivityExploreReelsView / SingleExperienceReelsView
     * (Watch & Discover "View Details" + per-card "Watch Reel" details
     * flows) so closing the sheet returns the user to the reels.
     */
    stackedAboveReels?: boolean
    /**
     * Cross-experience "sneak peek tour" navigation (desktop only). When
     * provided, left/right arrows render over the modal so the user can step
     * through every experience's sneak peek without closing it — this is the
     * desktop counterpart to the mobile Watch & Discover reels feed.
     */
    onPrev?: () => void
    onNext?: () => void
    prevDisabled?: boolean
    nextDisabled?: boolean
    /** "3 / 41"-style counter shown while touring. */
    tourPositionLabel?: string
}

const SneakPeekModal: React.FC<SneakPeekModalProps> = ({ isOpen, onClose, experienceId, attachments, onViewMap, triggerType, slotNotes, slotSuggestionReasons, slotAttachments, displayName, reelsModeOnMobile, tripId, stackedAboveReels, onPrev, onNext, prevDisabled, nextDisabled, tourPositionLabel }) => {
    const [searchParams] = useSearchParams()
    const isMobile = useIsMobile()

    // Fetch sneak peek data
    const { data: sneakPeekData, isLoading: isLoadingSneakPeek } = useQuery({
        queryKey: ['experienceSneakPeek', experienceId],
        queryFn: () => getExperienceSneakPeek(experienceId),
        enabled: isOpen && !!experienceId
    })

    // Format sneak peek data using hook
    const { bestMonths, duration, walkingRequired, valueForMoney, experienceName: sneakPeekExperienceName } = useSneakPeekData(sneakPeekData)

    // Use shortlist hook
    const { isShortlisted, isShortlisting, handleShortlistToggle } = useSneakPeekShortlist({
        experienceId,
        isOpen,
        fallbackTripId: tripId
    })

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            // Tour navigation: up/down (left/right kept as aliases).
            if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && onPrev && !prevDisabled) onPrev()
            if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && onNext && !nextDisabled) onNext()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, onPrev, onNext, prevDisabled, nextDisabled])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // ⛔ NOW we can safely gate rendering
    if (!isOpen || isMobile === undefined) return null

    // Handle view details - preserve query params from current page
    const handleViewDetails = () => {
        const queryString = searchParams.toString()
        const url = `/experiences/${experienceId}/${queryString ? `?${queryString}` : ''}`
        window.open(url, '_blank')
    }

    if (!isOpen) return null
    // Tour mode = desktop Watch & Discover (the only caller wiring onPrev/onNext).
    // Drives the compact modal size + the bottom up/down stepper.
    const isTour = Boolean(onPrev || onNext)
    const safeAttachments = attachments ?? []
    // Prefer the caller-provided title (e.g. the kanban card text) so the
    // sneak peek surface stays in sync with what the user just clicked.
    const experienceName = displayName?.trim() || sneakPeekExperienceName || 'Experience'
    const youtubeShorts = sneakPeekData?.shorts || []
    if (isMobile) {
        // Activity-explore opts into reels mode. Every other surface (itinerary,
        // collections, etc.) keeps the existing scrollable mobile sneak peek.
        if (reelsModeOnMobile) {
            return (
                <ActivityExploreReelsView
                    isOpen={isOpen}
                    onClose={onClose}
                    shorts={youtubeShorts}
                    experienceName={experienceName}
                    isShortlisted={isShortlisted}
                    isShortlisting={isShortlisting}
                    onShortlistToggle={handleShortlistToggle}
                    duration={duration}
                    bestMonths={bestMonths}
                    valueForMoney={valueForMoney}
                    walkingRequired={walkingRequired}
                    description={sneakPeekData?.short_description ?? null}
                />
            )
        }
        return (
            <SneakPeakMobileView
                isOpen={isOpen}
                onClose={onClose}
                sneakPeekData={sneakPeekData}
                experienceName={experienceName}
                youtubeShorts={youtubeShorts}
                bestMonths={bestMonths}
                duration={duration}
                walkingRequired={walkingRequired}
                valueForMoney={valueForMoney}
                isShortlisted={isShortlisted}
                isShortlisting={isShortlisting}
                handleShortlistToggle={handleShortlistToggle}
                handleViewDetails={handleViewDetails}
                onViewMap={onViewMap}
                isLoadingSneakPeek={isLoadingSneakPeek}
                triggerType={triggerType}
                slotNotes={slotNotes}
                slotSuggestionReasons={slotSuggestionReasons}
                slotAttachments={slotAttachments}
                stackedAboveReels={stackedAboveReels}
            />
        )
    }

    // Desktop Modal (existing layout)
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <ModalBackdrop onClose={onClose} />

                    {/* Tour stepper: up / "n / total" / down, floating to the right of the card. */}
                    {isTour && (
                        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[1320] flex flex-col items-center gap-5 rounded-[20px] bg-transparent shadow-lg px-3 py-4">
                            <button
                                type="button"
                                onClick={onPrev}
                                disabled={prevDisabled || !onPrev}
                                aria-label="Previous experience"
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-grey-5 bg-white">
                                <ChevronUp className="w-5 h-5 text-grey-0" />
                            </button>
                            {tourPositionLabel && (
                                <span className="min-w-[36px] text-center text-white text-[13px] font-bold font-red-hat-display tabular-nums">
                                    {tourPositionLabel}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onNext}
                                disabled={nextDisabled || !onNext}
                                aria-label="Next experience"
                                className="w-10 h-10 rounded-full border border-grey-3 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-grey-5 bg-white">
                                <ChevronDown className="w-5 h-5 text-grey-0" />
                            </button>
                        </div>
                    )}

                    {/* Modal Content */}
                    <ModalContainer compact={isTour}>
                        {/* Top-right action cluster — directions icon swap.
                            Wishlist moved to the footer CTA inside
                            ExperienceDetailsPanel; only directions + close live
                            here now. */}
                        <div className="absolute top-4 right-4 z-[80] flex flex-row gap-3">
                            {/* DIRECTIONS — icon-only. Uses internal map when
                                available, otherwise falls back to a Google
                                Maps search in a new tab. */}
                            {(() => {
                                const fallbackOpenMaps = () => {
                                    const query = [
                                        experienceName,
                                        sneakPeekData?.city_name,
                                        sneakPeekData?.country_name
                                    ]
                                        .filter(Boolean)
                                        .join(', ')
                                    if (query) {
                                        window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                                            '_blank'
                                        )
                                    }
                                }
                                const handleDirections = onViewMap
                                    ? () => {
                                          onClose()
                                          setTimeout(() => onViewMap(), 150)
                                      }
                                    : fallbackOpenMaps
                                return (
                                    <button
                                        onClick={handleDirections}
                                        aria-label={onViewMap ? 'View on map' : 'Get directions'}
                                        className="shrink-0 w-10 h-10 rounded-md border border-grey-4 bg-white/90 hover:bg-grey-5 flex items-center justify-center transition-colors">
                                        <MapPin className="w-5 h-5 text-grey-0" />
                                    </button>
                                )
                            })()}

                            {/* CLOSE BUTTON */}
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="shrink-0 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Left Side - Shorts Carousel */}
                        <div className="flex-1 flex flex-col bg-grey-0 relative overflow-hidden">
                            <YouTubeShortsCarousel
                                shorts={youtubeShorts}
                                experienceName={experienceName}
                                isLoading={isLoadingSneakPeek}
                            />
                        </div>

                        {/* Right Side - Experience Details */}
                        <div className="w-full lg:w-[550px] bg-white border-l border-grey_4 flex flex-col overflow-hidden min-h-0">
                            <ExperienceDetailsPanel
                                sneakPeekData={sneakPeekData}
                                experienceName={experienceName}
                                bestMonths={bestMonths}
                                duration={duration}
                                walkingRequired={walkingRequired}
                                valueForMoney={valueForMoney}
                                onViewDetails={handleViewDetails}
                                isLoading={isLoadingSneakPeek}
                                attachments={safeAttachments}
                                triggerType={triggerType}
                                slotNotes={slotNotes}
                                slotSuggestionReasons={slotSuggestionReasons}
                                isShortlisted={isShortlisted}
                                isShortlisting={isShortlisting}
                                onShortlistToggle={handleShortlistToggle}
                            />
                        </div>
                    </ModalContainer>
                </>
            )}
        </AnimatePresence>
    )
}

export default SneakPeekModal
