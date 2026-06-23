import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Heart, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ExperienceWithShort } from '../api/watchAlongApi'
import { getExperienceSneakPeek } from '@/modules/Experiences/api/experienceApi'
import { useSneakPeekData } from '@/modules/Acitvities/hooks/useSneakPeekData'
import ModalBackdrop from '@/modules/Acitvities/components/SneakPeakModal/ModalBackdrop'
import ModalContainer from '@/modules/Acitvities/components/SneakPeakModal/ModalContainer'
import ShortsCarousel from './ShortsModal/ShortsCarousel'
import ExperienceDetailsPanel from '@/modules/Acitvities/components/SneakPeakModal/ExperienceDetailsPanel'
import { useShortsModalShortlist } from './ShortsModal/useShortsModalShortlist'
import { useIsMobile } from '@/hooks/use-mobile'
import ActivityExploreReelsView from '@/modules/Acitvities/components/SneakPeakModal/ActivityExploreReelsView'
import { useFirstShortsForExperiences } from '@/modules/Acitvities/hooks/useFirstShortsForExperiences'

interface ShortsModalProps {
    isOpen: boolean
    onClose: () => void
    experiences: ExperienceWithShort[]
    initialIndex?: number
    hasMore?: boolean
    onLoadMore?: () => void
    isLoadingMore?: boolean
    showRightPanel?: boolean // Control whether to show the right experience details panel
    triggerType?: string
}

const ShortsModal: React.FC<ShortsModalProps> = ({
    isOpen,
    onClose,
    experiences,
    initialIndex = 0,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
    showRightPanel = true, // Default to true for backward compatibility
    triggerType
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [searchParams] = useSearchParams()
    const isMobile = useIsMobile()

    // Reset to initial index when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex)
        }
    }, [isOpen, initialIndex])

    const currentExperience = experiences[currentIndex]

    // Fetch sneak peek data for current experience (only if showRightPanel is true)
    const { data: sneakPeekData, isLoading: isLoadingSneakPeek } = useQuery({
        queryKey: ['experienceSneakPeek', currentExperience?.id],
        queryFn: () => getExperienceSneakPeek(currentExperience!.id),
        enabled: isOpen && !!currentExperience?.id && showRightPanel
    })

    // Format sneak peek data using hook
    const { bestMonths, duration, walkingRequired, valueForMoney, experienceName: sneakPeekExperienceName } = useSneakPeekData(sneakPeekData)

    // Use shortlist hook (only if showRightPanel is true)
    const { handleShortlistToggle, getShortlistStatus } = useShortsModalShortlist({
        experiences,
        isOpen: isOpen && showRightPanel
    })

    // Per-experience pill stats for the mobile reels overlay. Each reel
    // gets its own duration / best months / value / walking pills sourced
    // from that experience's sneak-peek endpoint. Cached per id so re-
    // opens skip the network. Only fired on mobile-open (the desktop
    // path renders ExperienceDetailsPanel and doesn't need this).
    const { firstShorts: experiencePillStats } = useFirstShortsForExperiences({
        experiences: experiences.map((exp) => ({ id: exp.id, name: exp.name })),
        enabled: isOpen && isMobile
    })

    // Handle keyboard navigation for closing modal
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Handle view details
    const handleViewDetails = () => {
        if (!currentExperience) return
        const queryString = searchParams.toString()
        const url = `/experiences/${currentExperience.id}/${queryString ? `?${queryString}` : ''}`
        window.open(url, '_blank')
    }

    if (!isOpen || experiences.length === 0) return null
    if (!currentExperience) return null

    const { isShortlisted, isShortlisting } = showRightPanel ? getShortlistStatus(currentExperience.id) : { isShortlisted: false, isShortlisting: false }
    const experienceName = sneakPeekExperienceName || currentExperience.name

    // Mobile: full-screen reels view (matches Top Highlights + the
    // activity-explore experience). One reel per experience, each using
    // that experience's `youtube_short` URL. Per-reel title + shortlist
    // binding rides on the Short item so the heart toggles the right
    // experience as the user scrolls. The legacy bottom-sheet layout
    // (title-above-video + scrollable details) only renders on desktop
    // surfaces that never hit this `isMobile` branch.
    if (isMobile) {
        const pillStatsById = new Map(experiencePillStats.map((info) => [info.experienceId, info]))
        const reelShorts = experiences
            .filter((exp) => exp.youtube_short?.url)
            .map((exp) => {
                const { isShortlisted: itemShortlisted, isShortlisting: itemShortlisting } = getShortlistStatus(exp.id)
                const stats = pillStatsById.get(exp.id)
                return {
                    id: exp.id,
                    url: exp.youtube_short.url,
                    experienceName: exp.name,
                    isShortlisted: itemShortlisted,
                    isShortlisting: itemShortlisting,
                    onShortlistToggle: () => handleShortlistToggle(exp.id),
                    duration: stats?.duration ?? null,
                    bestMonths: stats?.bestMonths ?? null,
                    valueForMoney: stats?.valueForMoney ?? null,
                    walkingRequired: stats?.walkingRequired ?? null
                }
            })
        const startIndex = Math.max(
            0,
            reelShorts.findIndex((s) => s.id === currentExperience.id)
        )
        return (
            <ActivityExploreReelsView
                isOpen={isOpen}
                onClose={onClose}
                shorts={reelShorts}
                experienceName={experienceName}
                initialIndex={startIndex === -1 ? 0 : startIndex}
            />
        )
    }

    // Desktop Modal View (Original)
    return (
        <AnimatePresence>
            {isOpen && (
                <div className='hidden md:block'>
                    <ModalBackdrop onClose={onClose} />

                    {/* Modal Content */}
                    <ModalContainer>
                        {/* Close Button */}
                        <div className="absolute top-4 right-4 z-100 flex items-center gap-3">
                            {/* HEART - Only show if showRightPanel is true */}
                            {showRightPanel && (
                                <button
                                    onClick={() => handleShortlistToggle(currentExperience.id)}
                                    disabled={isShortlisting}
                                    className="w-10 h-10 rounded-md border border-grey-4 flex items-center justify-center bg-white">
                                    <Heart
                                        className={`w-5 h-5 transition-colors cursor-pointer ${isShortlisted ? 'fill-secondary-red text-secondary-red' : 'text-grey-0'}`}
                                    />
                                </button>
                            )}

                            {/* CLOSE */}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors">
                                <X className="w-5 h-5 text-natural-white" />
                            </button>
                        </div>

                        {/* Shorts Carousel - Full width if no right panel */}
                        <div className={`${showRightPanel ? 'flex-1' : 'w-full'} flex flex-col bg-grey-0 relative overflow-hidden`}>
                            <ShortsCarousel
                                experiences={experiences}
                                initialIndex={currentIndex}
                                hasMore={hasMore}
                                onLoadMore={onLoadMore}
                                isLoadingMore={isLoadingMore}
                                onIndexChange={setCurrentIndex}
                            />
                        </div>

                        {/* Right Side - Experience Details - Only show if showRightPanel is true */}
                        {showRightPanel && (
                            <div className="w-full lg:w-[500px] bg-white border-l border-grey_4 flex flex-col overflow-hidden min-h-0">
                                <ExperienceDetailsPanel
                                    sneakPeekData={sneakPeekData}
                                    experienceName={experienceName}
                                    bestMonths={bestMonths}
                                    duration={duration}
                                    walkingRequired={walkingRequired}
                                    valueForMoney={valueForMoney}
                                    onViewDetails={handleViewDetails}
                                    isLoading={isLoadingSneakPeek}
                                    triggerType={triggerType}
                                />
                            </div>
                        )}
                    </ModalContainer>
                </div>
            )}
        </AnimatePresence>
    )
}

export default ShortsModal
