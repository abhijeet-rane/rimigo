import SectionParagraphText from '@/components/shared/Sections/SectionParagraphText'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import { formatTimingGuide } from '@/modules/Experiences/utils/timingGuideFormatter'

interface TimingInfo {
    start_time?: string | null
    end_time?: string | null
    description?: string
    is_closed?: boolean
}

interface ExperienceDetailsTimingProps {
    timing_guide?: Record<string, TimingInfo | string[]>
}

const ExperienceDetailsTiming = ({ timing_guide }: ExperienceDetailsTimingProps) => {
    // Use the existing formatter to format timing guide data
    const timingSlots = formatTimingGuide(timing_guide || null)

    return (
        <div className="bg-white rounded-2xl border border-feature-card-border">
            <div className="pt-4 px-4 mb-3 sm:mb-4">
                <SectionTitle title="Opening Hours" />
            </div>

            {timingSlots.length > 0 ? (
                <div className="space-y-2 px-4 pb-4">
                    {timingSlots.map((slot, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between px-2 rounded-lg transition-colors">
                            <SectionParagraphText text={slot.dayRange} />
                            <SectionParagraphText text={`(${slot.time})`} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="px-4 pb-4">
                    <SectionParagraphText text="No timing information available" />
                </div>
            )}
        </div>
    )
}

export default ExperienceDetailsTiming
