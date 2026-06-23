import React, { useRef, useEffect, useState } from 'react'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import ExperiencesListHeader from '@/modules/Experiences/components/ExperiencesExploreLandingPage/ExperiencesListHeader'
import LoadingMoreExperiences from '@/modules/Experiences/components/ExperiencesExploreLandingPage/LoadingMoreExperiences'
import EndOfList from '@/modules/Experiences/components/ExperiencesExploreLandingPage/EndOfList'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from './CardShortlistOverlay'
import ItineraryAddButton from './ItineraryAddButton'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import type { ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
// import { createCategoryIconMap, getCategoryIcon } from '../utils/categoryIconMapper'
import ExperiencesListShimmer from './ExperiencesListShimmer'
import { useIsMobile } from '@/hooks/use-mobile'

interface ExperiencesListSectionProps {
    experiences: ExperienceCardData[]
    totalExperiences: number
    locationName?: string
    isLoading: boolean
    error: unknown
    hasNextPage: boolean
    isFetchingNextPage: boolean
    fetchNextPage: () => void
    shortlistState: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds: Record<string, boolean>
    onExperienceClick: (experienceId: string) => void
    onShortlistToggle: (experienceId: string) => Promise<void>
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    experiencePreferences?: ExperiencePreferenceUI[] // Added for preference icon mapping
    selectedPreferences?: string[] // Selected preference filters
    selectedPriorities?: string[] // Selected priority filters
    showCity?: boolean // Show city name in cards
    id?: string // ID for scrolling to this section
    /** Label override for the sneak peek button on cards. Defaults to "Sneak Peek". */
    sneakPeekButtonLabel?: string
    /** When true, the section's internal `ExperiencesListHeader` is hidden on
     *  mobile (desktop still renders it). Useful when the parent renders the
     *  header above the filter bar on mobile — see Tripboard Activities tab. */
    hideHeaderOnMobile?: boolean
    /** Hide the internal header entirely — for parents that own the heading
     *  themselves (Tripboard Activities tab renders "Explore all activities
     *  in <city>" above the filter chips instead). */
    hideHeader?: boolean
}

const ExperiencesListSection: React.FC<ExperiencesListSectionProps> = ({
    experiences,
    totalExperiences,
    locationName,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    shortlistState,
    shortlistLoadingIds,
    onExperienceClick,
    onShortlistToggle,
    onSneakPeekClick,
    experiencePreferences,
    selectedPreferences = [],
    selectedPriorities = [],
    showCity = false,
    id,
    sneakPeekButtonLabel,
    hideHeaderOnMobile = false,
    hideHeader = false
}) => {
    const experiencesListSectionRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const isMobile = useIsMobile()

    // Infinite scroll using Intersection Observer
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isLoading) return

        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            {
                root: null, // Use viewport as root
                rootMargin: '200px', // Trigger 200px before the element comes into view
                threshold: 0.1
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

    // Show shimmer loading state
    if (isLoading) {
        return (
            <div ref={experiencesListSectionRef}>
                <ExperiencesListShimmer count={4} />
            </div>
        )
    }

    // Don't render if error or no experiences
    if (error || !experiences || experiences.length === 0) {
        return null
    }

    return (
        <div
            id={id}
            ref={experiencesListSectionRef}
            className="mx-auto  max-md:px-[20px]">
            {!hideHeader && (
                <div className={hideHeaderOnMobile ? 'hidden md:block' : ''}>
                    <ExperiencesListHeader
                        locationName={locationName}
                        totalExperiences={totalExperiences}
                        hasMultipleCities={false}
                        selectedPreferences={selectedPreferences}
                        selectedPriorities={selectedPriorities}
                        experiencePreferences={experiencePreferences}
                    />
                </div>
            )}
            {/* With the header gone the desktop top margin collapses — the
                parent's count/Sort row owns that spacing. Mobile keeps its
                margin (its spacing never came from the header). */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6 items-start ${hideHeader ? 'mt-2 md:mt-0' : 'mt-2 md:mt-4'}`}>
                {experiences.map((experience: ExperienceCardData) => {
                    const experienceId = experience.id
                    const shortlistEntry = shortlistState[experienceId]
                    const isShortlisted = shortlistEntry?.isShortlisted ?? false
                    const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                    // Format price
                    const { lower_bound, upper_bound, currency } = experience.price
                    const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

                    // Get priority badge styles
                    // const priorityStyles = getPriorityStyles(experience?.suggestion_priority)
                    // const topBadge = priorityStyles
                    //     ? {
                    //           label: priorityStyles.label,
                    //           bgColor: priorityStyles.bgColor,
                    //           textColor: priorityStyles.textColor,
                    //           shadowColor: priorityStyles.shadowColor,
                    //           icon: priorityStyles.icon
                    //       }
                    //     : undefined

                    // Category icon is already set in adapter, but can override with preference map if available
                    // const categoryIcon = experience.categoryIcon || getCategoryIcon(experience.categoryBackendValue, preferenceMetadataMap)

                    // Get first verified photo for sneak peek button
                    // Images array has landscape_image at index 0, then verified_photos starting at index 1
                    // So first verified photo is at index 1 (if it exists)
                    const firstVerifiedPhoto = experience.images && experience.images.length > 1 ? experience.images[1] : undefined

                    // Map categories to their icons for tags
                    // const categoryIconsMap: Record<string, string | undefined> | undefined = (() => {
                    //     if (!experience.categories || experience.categories.length === 0) return undefined
                    //     const iconsMap: Record<string, string | undefined> = {}
                    //     experience.categories.forEach((cat) => {
                    //         iconsMap[cat] = getCategoryIcon(cat, preferenceMetadataMap)
                    //     })
                    //     return iconsMap
                    // })()

                    const isHovered = hoveredCardId === experienceId || isMobile

                    return (
                        <div
                            key={experience.id}
                            className="relative w-full"
                            onMouseEnter={() => setHoveredCardId(experienceId)}
                            onMouseLeave={() => setHoveredCardId(null)}>
                            {/* Invisible placeholder to maintain grid cell size */}
                            <div className={isHovered ? 'invisible' : 'visible'}>
                                <ListCard
                                    image={experience.image}
                                    images={experience.images}
                                    imageAlt={experience.name || experience.title}
                                    fullHeight={true}
                                    className="group w-full"
                                    onClick={() => onExperienceClick(experienceId)}
                                    topBadge={undefined}
                                    title={experience.name || experience.title} // Use name for list pages
                                    city={showCity ? experience.city_name : undefined}
                                    price={formattedPrice}
                                    category={undefined} // Don't show category in placeholder
                                    categoryIcon={undefined} // Don't show category icon in placeholder
                                    categories={undefined} // Don't show categories in placeholder
                                    categoryIconsMap={undefined} // Don't show category icons in placeholder
                                    showShortlistButton={false}
                                    showSneakPeekButton={false} // Don't show sneak peek button in placeholder
                                    onSneakPeekClick={undefined}
                                    sneakPeekUserImage={undefined}
                                    titleTrailing={<ItineraryAddButton experienceId={experienceId} experienceName={experience.name || experience.title} experienceImage={experience.image} />}
                                />
                            </div>
                            {/* Absolutely positioned card on hover */}
                            {isHovered && (
                                <div className="absolute left-0 top-0 w-full md:z-20 shadow-2xl rounded-2xl">
                                    <ListCard
                                        image={experience.image}
                                        images={experience.images}
                                        imageAlt={experience.name || experience.title}
                                        fullHeight={true}
                                        className="group w-full"
                                        onClick={() => onExperienceClick(experienceId)}
                                        topBadge={undefined}
                                        title={experience.name || experience.title} // Use name for list pages
                                        city={showCity ? experience.city_name : undefined}
                                        price={formattedPrice}
                                        category={undefined}
                                        categoryIcon={undefined}
                                        categories={undefined} // Show categories as tags
                                        categoryIconsMap={undefined} // Icons for category tags
                                        showShortlistButton={false}
                                        showSneakPeekButton={!!onSneakPeekClick}
                                        onSneakPeekClick={onSneakPeekClick ? (e) => onSneakPeekClick(e, experienceId) : undefined}
                                        sneakPeekUserImage={firstVerifiedPhoto}
                                        sneakPeekButtonLabel={sneakPeekButtonLabel}
                                        titleTrailing={<ItineraryAddButton experienceId={experienceId} experienceName={experience.name || experience.title} experienceImage={experience.image} />}
                                    />
                                    <CardShortlistOverlay
                                        isShortlisted={isShortlisted}
                                        isShortlisting={isShortlisting}
                                        onToggle={() => onShortlistToggle(experienceId)}
                                    />
                                </div>
                            )}
                            {!isHovered && (
                                <CardShortlistOverlay
                                    isShortlisted={isShortlisted}
                                    isShortlisting={isShortlisting}
                                    onToggle={() => onShortlistToggle(experienceId)}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Sentinel element for infinite scroll */}
            {hasNextPage && (
                <div
                    ref={sentinelRef}
                    className="h-10 w-full"
                />
            )}

            {/* Infinite scroll loading indicator */}
            {isFetchingNextPage && <LoadingMoreExperiences />}

            {/* Load More Button (fallback - only show if Intersection Observer fails) */}
            {hasNextPage && !isFetchingNextPage && (
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <button
                            onClick={() => fetchNextPage()}
                            className="px-6 py-3 bg-primary-default-80 text-grey-0 rounded-lg hover:bg-primary-light transition-colors">
                            Load More Experiences
                        </button>
                    </div>
                </div>
            )}

            {/* End of results indicator */}
            {!hasNextPage && experiences.length > 0 && <EndOfList />}
        </div>
    )
}

export default ExperiencesListSection
