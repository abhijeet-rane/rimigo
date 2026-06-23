// import React, { useEffect, useMemo, useState } from 'react'
// import { SectionHeading } from './SectionHeading'
// import { CategoryTabs } from './CategoryTabs'
// import { CategorySection } from './CategorySection'

// import type { ATAFeature, CategoryInfo } from '@/api/ataAPI/types/featuresTypes'
import type { ExperienceWithShort } from '@/modules/WatchAlong/api/watchAlongApi'

import { DiscoverSection } from './DiscoverSection'
import { DiscoverWatchAlongPanel } from './DiscoverWatchAlongPanel'
// import GuideTipper from '@/modules/UserGuideModal/pages/GuideTipper'
// import { useOnboardingGuideContext } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'

// interface AgentThreadData {
//     id: string | null
//     entity_type: string | null
// }

interface NeedSectionProps {
    // features: ATAFeature[]
    // isLoading: boolean
    // isNeedModalOpen: boolean
    // onTileClick: (route: string) => void
    // getThreadData: (agentId: string, entityId: string | null) => AgentThreadData | null
    // categoryInfo: Record<string, CategoryInfo>
    // countryName: string
    // countryId?: string | null
    watchAlongShorts: ExperienceWithShort[]
    isLoadingWatchAlong: boolean
    hasMoreWatchAlong?: boolean
    isLoadingMoreWatchAlong?: boolean
    onLoadMoreWatchAlong?: () => void
    onShortClick?: (index: number) => void
}

/**
 * Generate section ID from category key
 * Format: section-{categoryKey}
 */
const getSectionIdFromCategoryKey = (categoryKey: string): string => {
    return `section-${categoryKey.toLowerCase()}`
}

const DISCOVER_SECTION_KEY = WEBSITE_CONFIG.WATCHALONG_TITLE
const discoverSectionId = getSectionIdFromCategoryKey(DISCOVER_SECTION_KEY)

/**
 * Replace template variables in description
 */
// const processDescription = (description: string, countryName: string): string => {
//     return description.replace(/\{\{country_name\}\}/g, countryName)
// }

/**
 * Group features by their API category key
 */
// const groupFeaturesByApiCategory = (features: ATAFeature[]): Record<string, ATAFeature[]> => {
//     const grouped: Record<string, ATAFeature[]> = {}

//     features.forEach((feature) => {
//         if ((feature.status === 'active' || feature.status === 'coming_soon') && feature.category && feature.category !== 'hero') {
//             const categoryKey = feature.category.toLowerCase()
//             if (!grouped[categoryKey]) {
//                 grouped[categoryKey] = []
//             }
//             grouped[categoryKey].push(feature)
//         }
//     })

//     return grouped
// }

/**
 * Main Help Section component
 * Displays all category sections (Featured, Stays, Experiences, Transport, Other) vertically
 * Each section only renders if it has features to display
 * Includes category tabs that scroll to the respective sections
 */
export const NeedSection: React.FC<NeedSectionProps> = ({
    // features,
    // isLoading,
    // onTileClick,
    // getThreadData,
    // categoryInfo,
    // countryName,
    // isNeedModalOpen,
    watchAlongShorts,
    isLoadingWatchAlong,
    hasMoreWatchAlong = false,
    isLoadingMoreWatchAlong = false,
    onLoadMoreWatchAlong,
    onShortClick
}) => {
    // const contentContainerRef = React.useRef<HTMLDivElement>(null)
    // const [_isNeedModalOpenIntenal, setIsNeedModalOpenInternal] = useState(false)

    // Group features by API category key
    // const featuresByCategory = useMemo(() => {
    //     return groupFeaturesByApiCategory(features)
    // }, [features])

    // Get available categories from category_info (excluding "hero")
    // Only include categories that have features
    // const availableCategories = useMemo(() => {
    //     return Object.keys(categoryInfo)
    //         .filter((categoryKey) => {
    //             // Exclude "hero" category
    //             if (categoryKey.toLowerCase() === 'hero') return false
    //             // Only include if it has features
    //             return featuresByCategory[categoryKey.toLowerCase()]?.length > 0
    //         })
    //         .sort() // Sort for consistent ordering
    // }, [categoryInfo, featuresByCategory])

    // const tabCategories = useMemo(() => {
    //     return [DISCOVER_SECTION_KEY, ...availableCategories]
    // }, [availableCategories])

    // Get category titles for tabs from API
    // const categoryTitles = useMemo(() => {
    //     const titles: Record<string, string> = {
    //         [DISCOVER_SECTION_KEY]: 'Discover'
    //     }

    //     availableCategories.forEach((categoryKey) => {
    //         const info = categoryInfo[categoryKey]
    //         if (info) {
    //             titles[categoryKey] = info.title
    //         }
    //     })
    //     return titles
    // }, [categoryInfo, availableCategories])
    // useEffect(() => {
    //     if (isNeedModalOpen) {
    //         setIsNeedModalOpenInternal(true)
    //     }
    // }, [isNeedModalOpen])
    // Set initial active tab to first available category
    // const [activeTab, setActiveTab] = React.useState<string>(tabCategories[0] || '')

    // Update active tab when available categories change
    // React.useEffect(() => {
    //     if (tabCategories.length > 0 && !tabCategories.includes(activeTab)) {
    //         setActiveTab(tabCategories[0])
    //     }
    // }, [tabCategories, activeTab])

    // Handle tab change and update active tab
    // const handleTabChange = React.useCallback((tab: string) => {
    //     setActiveTab(tab)
    // }, [])

    // // Update active tab based on visible sections (optional - for scroll spy)
    // React.useEffect(() => {
    //     const handleScroll = () => {
    //         // Optional: Update active tab based on scroll position
    //         // This can be implemented later if needed
    //     }

    //     window.addEventListener('scroll', handleScroll)
    //     return () => window.removeEventListener('scroll', handleScroll)
    // }, [])
    // const { guide, updateGuide } = useOnboardingGuideContext()

    // const handleSecondModalClose = () => {
    //     setIsNeedModalOpenInternal(false)

    //     if (!guide) return
    //     const updated = {
    //         ...guide,
    //         home: {
    //             ...guide.home,
    //             customised_needs_guide: true
    //         }
    //     }

    //     updateGuide(updated)
    // }

    // if (isLoading) {
    //     return (
    //         <div className="w-full max-w-[90%] md:max-w-[95%] lg:max-w-[90%] mx-auto">
    //             <div className="animate-pulse">
    //                 <div className="h-12 bg-gray-200 rounded w-3/4 mb-8"></div>
    //                 <div className="h-10 bg-gray-200 rounded w-full mb-8"></div>
    //                 <div className="space-y-12">
    //                     {[1, 2, 3].map((i) => (
    //                         <div key={i}>
    //                             <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
    //                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    //                                 {[1, 2, 3, 4].map((j) => (
    //                                     <div
    //                                         key={j}
    //                                         className="h-48 bg-gray-200 rounded-xl"></div>
    //                                 ))}
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>
    //             </div>
    //         </div>
    //     )
    // }

    // Hide NeedSection completely if there are no features for this country
    // if (!isLoading && features.length === 0) {
    //     return null
    // }

    // Check if DiscoverSection should be visible
    const shouldShowDiscoverSection = isLoadingWatchAlong || watchAlongShorts.length > 0

    // Check if we should show features-related content
    // Only show if we have available categories (active/coming_soon features)
    // This handles the case where all features are inactive
    // const hasAvailableCategories = availableCategories.length > 0

    // const _getTitleForActivity = (categoryKey: string, countryName: string) => {
    //     if (categoryKey === 'activities') {
    //         return `Most important things travelers plan for ${countryName ? countryName : ''}`
    //     }
    //     return categoryInfo[categoryKey]?.title || categoryKey
    // }

    return (
        <div className="w-full bg-grey-5">
            {/* Header Area (constrained) */}
            <div
                // ref={contentContainerRef}
                className="w-full max-w-[90%] md:max-w-[95%] lg:max-w-[90%] mx-auto bg-grey-5 md:pt-1 max-md:pb-0 pb-10"
                data-content-width="true">
                {/* Only show these when we have available categories (active/coming_soon features) */}
                {/* {hasAvailableCategories && (
                    <>
                        <SectionHeading countryName={countryName} />
                        <GuideTipper
                            isOpen={isNeedModalOpenIntenal}
                            subtitle=" We’ve curated a list of common tasks, to help plan your vacation."
                            title="Customised needs for you"
                            position="top"
                            onClose={handleSecondModalClose}
                            highlight={['needs']}>
                            <CategoryTabs
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                availableCategories={tabCategories}
                                categoryTitles={categoryTitles}
                            />
                        </GuideTipper>
                    </>
                )} */}

                {/* DiscoverSection always visible when watchAlong data exists - independent of features */}
                {shouldShowDiscoverSection && (
                    <>
                    <div className="max-md:w-screen max-md:relative max-md:left-[50%] max-md:-translate-x-1/2">
                        <DiscoverSection
                            sectionId={discoverSectionId}
                            showTitleAndDescription={true}
                            onTitleClick={() => {
                                const element = document.getElementById(discoverSectionId)
                                element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}>
                            <DiscoverWatchAlongPanel
                                shorts={watchAlongShorts}
                                isLoading={isLoadingWatchAlong}
                                hasMore={hasMoreWatchAlong}
                                onLoadMore={onLoadMoreWatchAlong}
                                isLoadingMore={isLoadingMoreWatchAlong}
                                onShortClick={onShortClick}
                                PageName='ata_landing_page'
                            />
                        </DiscoverSection>
                        

                    </div>
                    </>
                )}
            </div>

            {/* FULL-WIDTH BACKGROUND SECTIONS - Only when we have available categories */}
            {/* {hasAvailableCategories &&
                availableCategories.map((categoryKey, index) => {
                    const categoryFeatures = featuresByCategory[categoryKey.toLowerCase()] || []
                    const sectionId = getSectionIdFromCategoryKey(categoryKey)
                    const info = categoryInfo[categoryKey]

                    if (!info || categoryFeatures.length === 0) return null

                    const title = getTitleForActivity(categoryKey, countryName)
                    // const description = processDescription(info.description, countryName)
                    const description = 'Explore these actions to find perfect experiences'
                    const background = index % 2 === 0 ? 'white' : 'grey-5'

                    return (
                        <CategorySection
                            key={categoryKey}
                            title={title}
                            description={description}
                            listings={categoryFeatures}
                            background={background}
                            onTileClick={onTileClick}
                            sectionId={sectionId}
                            getThreadData={getThreadData}
                            onTitleClick={() => {
                                const element = document.getElementById(sectionId)
                                element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                        />
                    )
                })} */}
        </div>
    )
}
