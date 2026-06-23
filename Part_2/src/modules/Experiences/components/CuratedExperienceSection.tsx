import React from 'react'
import { useCuratedExperiences } from '../hooks/useCuratedExperiences'
import ExperiencesCarouselSection from './ExperiencesCarouselSection'

interface CuratedExperienceSectionProps {
    countryId: string | null
    preference: string
    preferenceLabel?: string
    preferenceIcon?: string
    baseCityIds?: string[]
    onExperienceClick?: (id: string) => void
    onToggleShortlist?: (experienceId: string) => Promise<void> | void
    shortlistState?: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    tripMonth?: string | number | null
}

const CuratedExperienceSection: React.FC<CuratedExperienceSectionProps> = ({
    countryId,
    preference,
    preferenceLabel,
    preferenceIcon,
    baseCityIds,
    onExperienceClick,
    onToggleShortlist,
    shortlistState,
    shortlistLoadingIds,
    tripMonth
}) => {
    const { experiences, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useCuratedExperiences({
        countryId,
        preferences: [preference],
        limit: 20,
        tripMonth,
        baseCityIds
    })

    const sectionTitle = preferenceLabel ? `Suggested · ${preferenceLabel}` : 'Suggested For You'

    const headerContent = (
        <div className="flex items-center justify-between pb-[12px]">
            <div className="flex items-center gap-1">
                <span className="text-[18px] font-medium font-red-hat-display text-grey-grey-0">Because you selected</span>
                {preferenceIcon && (
                    <img
                        src={preferenceIcon}
                        alt={preferenceLabel || preference}
                        className="h-6 w-6 rounded-full object-contain"
                        loading="lazy"
                    />
                )}
                <span className="text-lg font-semibold text-grey-0">{preferenceLabel ?? preference}</span>
            </div>
        </div>
    )

    return (
        <ExperiencesCarouselSection
            title={sectionTitle}
            experiences={experiences}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={fetchNextPage}
            onExperienceClick={onExperienceClick}
            onToggleShortlist={onToggleShortlist}
            shortlistState={shortlistState}
            shortlistLoadingIds={shortlistLoadingIds}
            containerClassName="bg-white rounded-[16px] shadow-sm px-4 sm:px-6 lg:px-5 py-5 text-grey-0"
            titleClassName="text-grey-0"
            headerContent={headerContent}
            gradientStartColor="rgba(255, 255, 255, 1)"
            gradientEndColor="rgba(255, 255, 255, 0)"
        />
    )
}

export default CuratedExperienceSection
