import ExperienceDetailsTiming from './ExperienceDetailsTiming'
import ExperienceForYouSection from './ExperienceForYouSection'
import ExperienceYoutubeShortsSection from './ExperienceYoutubeShortsSection'
import StickyAside from '@/components/shared/Sticky/StickyAside'

interface TimingInfo {
    start_time?: string | null
    end_time?: string | null
    description?: string
    is_closed?: boolean
}

interface ExperienceDetailsYTHightlightsTimeSectionProps {
    timing_guide?: Record<string, TimingInfo | string[]>
    highlights?: Array<{
        order: number
        text: string
    }>
    youtubeShorts?: Array<{
        id: string
        url: string
        description: string
    }>
}

const ExperienceDetailsYTHightlightsTimeSection = ({ timing_guide, highlights, youtubeShorts }: ExperienceDetailsYTHightlightsTimeSectionProps) => {
    return (
        <div>
            <div className="container mx-auto lg:px-0 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto">
                    {/* Left Column - 2 Rows - Takes 2/3 width */}
                    <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:col-span-2">
                        {/* Why for You Section */}
                        {/* @ts-expect-error - this is a temporary fix to allow the highlights to be passed to the ExperienceForYouSection */}
                        <ExperienceForYouSection highlights={highlights || []} />
                        {/* Timing Section */}
                        <ExperienceDetailsTiming timing_guide={timing_guide} />
                    </div>

                    {/* Right Column - YouTube Shorts (Sticky) - Takes 1/3 width */}
                    <StickyAside top={16}>
                        <ExperienceYoutubeShortsSection youtubeShorts={youtubeShorts || []} />
                    </StickyAside>
                </div>
            </div>
        </div>
    )
}

export default ExperienceDetailsYTHightlightsTimeSection
