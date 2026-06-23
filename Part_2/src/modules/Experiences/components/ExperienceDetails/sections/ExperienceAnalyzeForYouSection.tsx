import React from 'react'

interface SummaryData {
    recommendation_details: {
        is_recommended: boolean
        reasoning_for_recommendation: string[]
    }
    tags: string[]
    curated_overall_score?: number
}

type ExperienceAnalyzeForYouProps = {
    summaryData: SummaryData | null
    isLoading?: boolean
}

const ExperienceAnalyzeForYouSection: React.FC<ExperienceAnalyzeForYouProps> = ({ summaryData, isLoading = false }) => {
    // Calculate percentage from score (score is 0-10, convert to 0-100)
    const score10 = summaryData?.curated_overall_score ?? null
    const percent = Number.isFinite(score10) ? Math.round(Number(score10) * 10) : null

    const getMatchMeta = (value: number) => {
        if (value >= 90) {
            return {
                title: "You'll love this",
                subtitle: 'Perfect match for your trip',
                emoji: '👌',
                bgColor: 'var(--color-secondary-green)'
            }
        }
        if (value >= 70) {
            return {
                title: 'Good choice',
                subtitle: 'Great pick for your plans',
                emoji: '👍',
                bgColor: 'var(--color-secondary-green)'
            }
        }
        return {
            title: 'Not ideal',
            subtitle: 'Consider exploring other options',
            emoji: '-',
            bgColor: 'var(--color-secondary-yellow)'
        }
    }

    const matchMeta = getMatchMeta(percent ?? 0)

    // Get reasoning text
    const reasoningText = summaryData?.recommendation_details?.reasoning_for_recommendation
        ? Array.isArray(summaryData.recommendation_details.reasoning_for_recommendation)
            ? summaryData.recommendation_details.reasoning_for_recommendation.join(' ')
            : summaryData.recommendation_details.reasoning_for_recommendation
        : undefined

    if (isLoading) {
        return (
            <div
                className="relative rounded-2xl bg-white p-4"
                style={{ border: '2px solid var(--color-primary-default, #7011F6)' }}>
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div
                            className="text-sm font-medium"
                            style={{
                                fontFamily: 'Manrope',
                                color: 'var(--color-grey-2, #747474)'
                            }}>
                            Analysing for you...
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mb-6 pt-1">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .shimmer-pulse {
                    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.4;
                    }
                }
            `}</style>
            <div
                className="relative rounded-2xl bg-white p-4 flex items-stretch gap-4 max-md:m-5"
                style={{ border: '2px solid var(--primary-indigo, #7011F6)', boxShadow: '0 2px 8px 0 var(--grey-5, #F8F8F8)', overflow: 'hidden' }}>
                {/* Rimigo AI badge */}
                <div
                    style={{
                        position: 'absolute',
                        width: '210px',
                        height: '20px',
                        top: '0px',
                        left: '12px',
                        background: 'var(--primary-indigo, #7011F6)',
                        color: 'white',
                        borderBottomLeftRadius: '16px',
                        borderBottomRightRadius: '16px',
                        paddingTop: '2px',
                        paddingRight: '12px',
                        paddingBottom: '2px',
                        paddingLeft: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: 550,
                        fontFamily: 'Red Hat Display',
                        letterSpacing: '-0.01em',
                        zIndex: 10
                    }}>
                    Analysed by Rimigo AI, for you!
                </div>

                <div className="relative rounded-3xl bg-white px-2 py-3 flex flex-col gap-5">
                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                        <div
                            className="flex flex-col max-md:w-full items-center justify-center rounded-3xl text-white text-center gap-3 w-[120px] h-[120px]"
                            style={{ background: matchMeta.bgColor }}>
                            <div className="text-5xl leading-none">{matchMeta.emoji}</div>
                            <div
                                style={{
                                    fontFamily: 'Red Hat Display',
                                    fontWeight: 759,
                                    fontSize: 14,
                                    color: 'white',
                                    lineHeight: '100%',
                                    letterSpacing: '-0.01em'
                                }}>
                                {matchMeta.title}
                            </div>
                            {/* <div
                                style={{
                                    fontFamily: 'Manrope',
                                    fontSize: 14,
                                    fontWeight: 600
                                }}>
                                {matchMeta.subtitle}
                            </div> */}
                        </div>

                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex flex-wrap gap-3">
                                {summaryData?.tags && summaryData.tags.length > 0
                                    ? summaryData.tags.map((tag, idx) => (
                                          <span
                                              key={`tag-${idx}`}
                                              className="inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-white text-[14px] font-medium text-grey-0 whitespace-nowrap shrink-0">
                                              <span>{tag}</span>
                                          </span>
                                      ))
                                    : null}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[rgba(112,17,246,0.16)] pt-5 flex flex-col gap-4">
                        <div>
                            <div
                                style={{
                                    fontFamily: 'Caveat, cursive',
                                    fontSize: 26,
                                    fontWeight: 600,
                                    color: '#190820',
                                    marginBottom: 6
                                }}>
                                Our analysis
                            </div>
                            <p
                                style={{
                                    margin: 0,
                                    fontFamily: 'Manrope',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: 'rgba(25, 8, 32, 0.78)',
                                    lineHeight: 1.6
                                }}>
                                {reasoningText || 'No analysis available'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExperienceAnalyzeForYouSection
