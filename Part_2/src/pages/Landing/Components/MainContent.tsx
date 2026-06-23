import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HeroContentContainer } from './HeroContentContainer'
import { NeedSection } from './NeedSection'
// import { SimpleFooter } from '@/components/Footer/SimpleFooter'
// import { useATAFeatures } from '../hooks/useATAFeatures'
// import { useAgentThreads } from '../hooks/useAgentThreads'
import { useExperiencesWithShorts } from '@/modules/Experiences/hooks/useExperiencesWithShorts'
import ShortsModal from '@/modules/WatchAlong/components/ShortsModal'
import GuideTipper from '@/modules/UserGuideModal/pages/GuideTipper'
import { useOnboardingGuideContext } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import LandingPagePremiumCTA from './LandingPagePremiumCTA'
import { LandingCollectionCtaSection } from './LandingCollectionCtaSection'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import RimigoFooter from '@/components/Footer/RimigoFooter'

interface MainContentProps {
    onTileClick: (route: string) => void
}

export const MainContent: React.FC<MainContentProps> = ({ onTileClick }) => {
    const [searchParams] = useSearchParams()

    // Local modal states
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)

    const [travelerId, setTravelerId] = useState<string | undefined>()
    const { travelerDetails } = useTravelerDetails(travelerId)
    const isPremiumUser = travelerDetails?.type === "premium"

    const [pickanyModal, setPickAnyModal] = useState(false) // set_criteria_guide
    // const [isNeedModalOpen, setIsNeedModalOpen] = useState(false) // customised_needs_guide
    const { isTripCreationOpen } = useSidebarContext()

    // Country
    const countryId = searchParams.get('country_id') || undefined

    // Data hooks
    // const { features, heroFeatures, categoryInfo, isLoading } = useATAFeatures({ countryId })
    // const hasFeatures = features.length > 0

    const { guide, isLoading: isGuideLoading, updateGuide } = useOnboardingGuideContext()

    // Fetch thread IDs for all agents in batch (only when features are loaded)
    const { isAuthenticated } = useAuth()
    // const { getThreadData } = useAgentThreads({
    //     features,
    //     enabled: isAuthenticated && !isLoading && features.length > 0
    // })

    const {
        experiences: watchAlongShorts,
        isLoading: isLoadingWatchAlong,
        hasMore: hasMoreWatchAlong,
        isLoadingMore: isLoadingMoreWatchAlong,
        loadMore: loadMoreWatchAlong
    } = useExperiencesWithShorts({
        countryId: countryId || null,
        limit: 12,
        enabled: !!countryId
    })

    // --------------------------------------------
    // 🚀 Onboarding Modal Logic
    // --------------------------------------------
    useEffect(() => {
        if (isGuideLoading) return
        if (!guide) return
        // if (!features.length) return

        const { home } = guide

        // SHOW FIRST MODAL IF NOT SEEN
        if (!home.set_criteria_guide) {
            setPickAnyModal(true)
            return
        }

        // If first modal already completed, show second if needed
        // if (home.set_criteria_guide && !home.customised_needs_guide) {
        //     setIsNeedModalOpen(true)
        // }
    }, [isGuideLoading, guide])

    // --------------------------------------------
    // 🚀 ON FIRST MODAL CLOSE → mark seen + show second if needed
    // --------------------------------------------
    const handleFirstModalClose = () => {
        setPickAnyModal(false)

        if (!guide) return
        const updated = {
            ...guide,
            home: {
                ...guide.home,
                set_criteria_guide: true
            }
        }

        updateGuide(updated)

        // if (!guide.home.customised_needs_guide) {
        //     setIsNeedModalOpen(true)
        // }
    }

    // --------------------------------------------
    // 🚀 ON SECOND MODAL CLOSE → mark as seen
    // --------------------------------------------

    // --------------------------------------------

    useEffect(() => {
            if (isAuthenticated) {
                TokenStorage.getUserInfo()
                    .then((userInfo) => setTravelerId(userInfo?.traveler_id))
                    .catch(() => setTravelerId(undefined))
            }
        }, [isAuthenticated])

    // const countryName = features[0]?.country?.name || ''

    return (
        <>
            <div className="flex flex-col items-center bg-white md:bg-grey-5 md:pt-12">
                <GuideTipper
                    isOpen={pickanyModal && !isTripCreationOpen}
                    title="Browse, shortlist & book!"
                    highlight={['shortlist']}
                    subtitle="Choose any option to start your planning journey."
                    onClose={handleFirstModalClose}
                    position="bottom">
                    <HeroContentContainer
                        onTileClick={onTileClick}
                        // getThreadData={getThreadData}
                        // heroFeatures={heroFeatures}
                        // isLoading={isLoading}
                        countryId={countryId}
                        watchAlongShorts={watchAlongShorts}
                        isLoadingWatchAlong={isLoadingWatchAlong}
                        travelerDetails={travelerDetails}
                    />
                </GuideTipper>
            </div>

            {( isLoadingWatchAlong || watchAlongShorts.length > 0) && (
                <div className="w-full bg-grey-5 flex flex-col md:pt-12 ">
                    <NeedSection
                        // isNeedModalOpen={isNeedModalOpen}
                        // features={features}
                        // isLoading={isLoading}
                        // onTileClick={onTileClick}
                        // getThreadData={getThreadData}
                        // categoryInfo={categoryInfo}
                        // countryName={countryName}
                        // countryId={countryId}
                        watchAlongShorts={watchAlongShorts}
                        isLoadingWatchAlong={isLoadingWatchAlong}
                        hasMoreWatchAlong={hasMoreWatchAlong}
                        isLoadingMoreWatchAlong={isLoadingMoreWatchAlong}
                        onLoadMoreWatchAlong={loadMoreWatchAlong}
                        onShortClick={(index) => {
                            setSelectedShortIndex(index)
                            setIsShortsModalOpen(true)
                        }}
                    />
                    {!isPremiumUser && <LandingPagePremiumCTA />}
                    <LandingCollectionCtaSection />
                    <RimigoFooter />


                </div>
            )}

            {/* SHORTS MODAL */}
            <ShortsModal
                isOpen={isShortsModalOpen}
                onClose={() => setIsShortsModalOpen(false)}
                experiences={watchAlongShorts}
                initialIndex={selectedShortIndex}
                hasMore={hasMoreWatchAlong}
                onLoadMore={loadMoreWatchAlong}
                isLoadingMore={isLoadingMoreWatchAlong}
            />
        </>
    )
}
