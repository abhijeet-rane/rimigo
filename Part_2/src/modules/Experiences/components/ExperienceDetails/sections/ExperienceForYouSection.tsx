import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import ExperienceHighlightsSection from './ExperienceHighlightsSection'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import CustomShimmer from '@/components/shared/Shimmer'

const SECTION_TITLE = 'Analysed by Rimigo AI, for you'

const ExperienceForYouSection = ({
    highlights,
    summaryData,
    isSummaryLoading
}: {
    highlights: Array<{ order: number; text: string }>
    summaryData: any | null
    isSummaryLoading: boolean
}) => {
    if (isSummaryLoading) {
        return (
            <GenericCard className="w-full relative rounded-2xl flex flex-col items-start pt-0 px-4 pb-4 gap-2 text-left text-[12px] text-white font-red-hat-display py-4">
                {/* Header shimmer */}

                {/* Content shimmer */}
                <div className="flex items-center gap-4 text-center w-full">
                    {/* Thumbs icon shimmer */}
                    <CustomShimmer
                        height={120}
                        radius={12}
                        className="w-[120px] flex-none shrink-0"
                    />

                    {/* Highlights section shimmer */}
                </div>
            </GenericCard>
        )
    }

    const is_recommended = summaryData?.recommendation_details?.is_recommended ?? null
    const reasoning_for_recommendation = summaryData?.recommendation_details?.reasoning_for_recommendation ?? null
    const tags = summaryData?.tags ?? []

    return (
        <GenericCard className="w-full relative rounded-2xl flex flex-col items-start pt-0 px-4 pb-4 gap-2 text-left text-[12px] text-white font-red-hat-display border border-primary-default">
            <div className="rounded-t-none rounded-b-2xl bg-blue flex items-center py-0.5 px-3 bg-primary-default">
                <div className="text-xs tracking-[-0.01em] font-semibold font-red-hat-display text-white text-left">{SECTION_TITLE}</div>
            </div>
            {/* tags */}

            <div className="flex  items-center gap-4 text-center">
                {is_recommended != null && (
                    <div
                        className={cn(
                            'h-[120px] border-solid flex-none shrink-0 border-[2px] w-[120px]  rounded-xl flex flex-col items-center justify-center',
                            is_recommended
                                ? 'border-secondary-green bg-secondary-green-80 shadow-[0px_2px_8px_rgba(38,_188,_109,_0.32)]'
                                : 'border-secondary-red bg-secondary-red-80 shadow-[0px_2px_8px_rgba(231,_52,_52,_0.32)]'
                        )}>
                        <div className="  font-semibold flex flex-col items-center justify-center">
                            {is_recommended ? (
                                <ThumbsUp
                                    className="w-12 h-12 text-secondary-green"
                                    strokeWidth={1}
                                />
                            ) : (
                                <ThumbsDown
                                    className="w-12 h-12 text-secondary-red"
                                    strokeWidth={1}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* <HighlightTags /> */}
                <ExperienceHighlightsSection
                    tags={tags}
                    highlights={highlights}
                    reasoning_for_recommendation={reasoning_for_recommendation}
                />
                {/* <div className="self-stretch flex-1 rounded-xl bg-whitesmoke flex items-start py-4 px-3 gap-4 text-left text-[14px] text-gray">
                    <div className="flex-1 flex flex-col items-start gap-2">
                        <div className="self-stretch flex items-center justify-between gap-[18px]">
                            <div className="flex items-center gap-1">
                                <img
                                    className="w-6 relative max-h-full object-cover"
                                    alt=""
                                />
                                <div className="relative tracking-num--0_01  font-semibold">Couple friendly</div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex items-center gap-0.5">
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                                </div>
                            </div>
                        </div>
                        <div className="self-stretch flex items-center justify-between gap-5">
                            <div className="flex items-center gap-1">
                                <img
                                    className="w-6 relative max-h-full object-cover"
                                    alt=""
                                />
                                <div className="relative tracking-num--0_01 font-semibold">Leisurely stay</div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                            </div>
                        </div>
                        <div className="self-stretch flex items-center justify-between gap-5">
                            <div className="flex items-center gap-1">
                                <img
                                    className="w-6 relative max-h-full object-cover"
                                    alt=""
                                />
                                <div className="relative tracking-num--0_01 font-semibold">Nightlife</div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <div className="h-3 w-3 relative rounded-num-50 bg-goldenrod" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-goldenrod" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-goldenrod" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-start gap-2">
                        <div className="self-stretch flex items-center justify-between gap-5">
                            <div className="flex items-center gap-1">
                                <img
                                    className="w-6 relative max-h-full object-cover"
                                    alt=""
                                />
                                <div className="relative tracking-num--0_01 font-semibold">City Centre</div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex items-center gap-0.5">
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                    <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                                </div>
                            </div>
                        </div>
                        <div className="self-stretch flex items-center justify-between gap-5">
                            <div className="flex items-center gap-1">
                                <img
                                    className="w-6 relative max-h-full object-cover"
                                    alt=""
                                />
                                <div className="relative tracking-num--0_01 font-semibold">Location</div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-mediumseagreen" />
                                <div className="h-3 w-3 relative rounded-num-50 bg-gainsboro" />
                            </div>
                        </div>
                    </div>
                </div> */}
            </div>
        </GenericCard>
    )
}

export default ExperienceForYouSection
