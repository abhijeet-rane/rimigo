import React from 'react'
import { useCuratedExperiences } from '../hooks/useCuratedExperiences'
import ExperiencesCarouselSection from './ExperiencesCarouselSection'
import { Wand } from 'lucide-react'

interface ForYouExperienceSectionProps {
    countryId: string | null
    preferences: string[]
    tripMonth?: string | number | null
    groupType?: string | null
    baseCityIds?: string[]
    onExperienceClick?: (id: string) => void
    onToggleShortlist?: (experienceId: string) => Promise<void> | void
    shortlistState?: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    titleIconUrl?: string
}

const ForYouExperienceSection: React.FC<ForYouExperienceSectionProps> = ({
    countryId,
    preferences,
    tripMonth,
    groupType,
    baseCityIds,
    onExperienceClick,
    onToggleShortlist,
    shortlistState,
    shortlistLoadingIds,
    titleIconUrl
}) => {
    const { experiences, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useCuratedExperiences({
        countryId,
        preferences,
        limit: 20,
        tripMonth,
        groupType,
        baseCityIds
    })

    if (preferences.length === 0) {
        return null
    }

    const headerContent = (
        <div className="flex items-center justify-between pb-[12px]">
            <div className="flex items-center gap-1">
                {titleIconUrl && <Wand className="w-4 h-4 text-primary-default" />}
                <div>
                    <span className="block text-[18px] font-medium font-red-hat-display text-grey-0">
                        <span className="capitalize text-primary-default italic">Handpicked</span> for you
                    </span>
                </div>
            </div>
        </div>
    )
    if (experiences.length < 3) {
        return null
    }
    return (
        <ExperiencesCarouselSection
            title="Suggested For You"
            experiences={experiences}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={fetchNextPage}
            onExperienceClick={onExperienceClick}
            onToggleShortlist={onToggleShortlist}
            shortlistState={shortlistState}
            shortlistLoadingIds={shortlistLoadingIds}
            containerClassName="border-0 bg-primary-default-80 rounded-[16px] px-4 sm:px-6 lg:px-5 py-5 text-grey-0"
            titleClassName="text-grey-0"
            gradientStartColor="primary-default-80"
            gradientEndColor="transparent"
            headerContent={headerContent}
        />
    )
}

export default ForYouExperienceSection
