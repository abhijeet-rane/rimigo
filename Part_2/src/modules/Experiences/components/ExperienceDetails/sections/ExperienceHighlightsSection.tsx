import SectionParagraphText from '@/components/shared/Sections/SectionParagraphText'
import { Spotlight } from 'lucide-react'
import HighlightTags from '../components/Highlights/HighlightTags'
interface ExperienceHighlightsSectionProps {
    highlights?: Array<{
        order: number
        text: string
    }>
    reasoning_for_recommendation?: string[]
    tags?: string[]
}

const ExperienceHighlightsSection = ({ highlights, reasoning_for_recommendation, tags }: ExperienceHighlightsSectionProps) => {
    // const SECTION_TITLE = reasoning_for_recommendation && reasoning_for_recommendation.length > 0 ? 'Reasoning for recommendation' : 'Highlights'

    return (
        <div>
            {tags && tags.length > 0 && <HighlightTags tags={tags} />}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                {/* <SectionTitle title={SECTION_TITLE} /> */}
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                    {/* <span className="font-medium">@SuitableForSmallies</span> */}
                </div>
            </div>
            {reasoning_for_recommendation && reasoning_for_recommendation.length > 0 ? (
                <div className="space-y-2 sm:space-y-3 text-left bg-primary-default-80 py-4 px-4 rounded-lg">
                    {reasoning_for_recommendation.map((item) => (
                        <SectionParagraphText
                            text={item}
                            textStyle={{
                                margin: 0,
                                color: '#4B2CF9',
                                fontFamily: 'Manrope',
                                fontSize: 16,
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 6 as any,
                                WebkitBoxOrient: 'vertical' as any,
                                wordBreak: 'break-word',
                                maxWidth: '100%'
                            }}
                        />
                    ))}
                </div>
            ) : highlights && highlights.length > 0 ? (
                <div className="space-y-2 sm:space-y-3  ">
                    {highlights.map((item) => (
                        <div
                            key={item.order}
                            className="flex gap-2 sm:gap-3 p-2 sm:p-3 lg:p-0 items-start justify-start">
                            <div className="w-6 h-6 flex-none flex items-center justify-center">
                                <Spotlight className="w-[20px] h-[20px] text-primary-default shrink-0" />
                            </div>
                            <SectionParagraphText text={item.text} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="px-4 pb-4">
                    <p className="text-slate-500 text-sm">No highlights available</p>
                </div>
            )}
        </div>
    )
}

export default ExperienceHighlightsSection
