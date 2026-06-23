import React, { useEffect, useState } from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { getLucideIcon } from '../../../../constants/lucideIconMap'
import { getReviewSummary } from '../../Apis/staysAPI'

interface MatchSummaryProps {
    hotelData: HotelDetailData
}

interface TagItem {
    key: string
    tag: string
}

interface SummaryData {
    group_type_tag: TagItem[]
    purpose_tag: TagItem[]
    preference_tag: TagItem[]
    personalised_summary: string
    score_reasoning: string | string[]
}

export const MatchSummary: React.FC<MatchSummaryProps> = ({ hotelData }) => {
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [useFallback, setUseFallback] = useState(false)
    const urlParams = new URLSearchParams(window.location.search)

    const urlMatchPercentage = urlParams.get('match_percentage')
    const urlTags = urlParams.get('tags') // comma-separated
    // Parse tags: "family friendly:true,birthday celebration:false"
    const parsedUrlTags = urlTags
        ? urlTags.split(',').map((item) => {
              const [labelRaw, valueRaw] = item.split(':')
              const label = labelRaw.trim()
              const value = valueRaw?.trim() === 'true'
              return { label, value }
          })
        : null

    useEffect(() => {
        const fetchSummary = async () => {
            if (!hotelData.review_data?.summary_request_id) {
                setUseFallback(true)
                setIsLoading(false)
                return
            }

            const pollingIntervals = [3000, 3000, 2000, 2000, 2000, 2000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
            let attemptCount = 0

            const poll = async () => {
                try {
                    const response = await getReviewSummary(hotelData.review_data.summary_request_id)

                    if (response.status === 200 && response.data?.data?.status === 'completed') {
                        setSummaryData(response.data.data.result)
                        setIsLoading(false)
                        setUseFallback(false)
                        return
                    }

                    if (response.status === 202 && attemptCount < pollingIntervals.length) {
                        setTimeout(() => {
                            attemptCount++
                            poll()
                        }, pollingIntervals[attemptCount])
                    } else {
                        // Max attempts reached or unexpected status
                        setUseFallback(true)
                        setIsLoading(false)
                    }
                } catch (error: any) {
                    // If 404 or 5xx error, use fallback
                    if (error.response?.status === 404 || (error.response?.status >= 500 && error.response?.status < 600)) {
                        setUseFallback(true)
                        setIsLoading(false)
                    } else if (attemptCount < pollingIntervals.length) {
                        // Continue polling for other errors
                        setTimeout(() => {
                            attemptCount++
                            poll()
                        }, pollingIntervals[attemptCount])
                    } else {
                        setUseFallback(true)
                        setIsLoading(false)
                    }
                }
            }

            poll()
        }

        fetchSummary()
    }, [hotelData.review_data?.summary_request_id])

    if (!hotelData.review_data?.hot_picks?.length) {
        return null
    }

    let percent = 0

    if (urlMatchPercentage) {
        percent = Number(urlMatchPercentage)
    } else {
        const score10 = hotelData.curated_overall_score || hotelData.review_data?.ratings?.overall_rating?.score || 0

        percent = Math.round(Number(score10) * 10)
    }
    const getMatchMeta = (value: number) => {
        if (value >= 70) {
            return {
                label: 'Excellent match',
                tag: 'Ideal',
                badge: '🌟',
                bgColor: 'rgba(38, 188, 109, 0.14)',
                accent: '#1F9E60'
            }
        }
        if (value >= 55) {
            return {
                label: 'Worth considering',
                tag: 'Good fit',
                badge: '🙂',
                bgColor: 'rgba(255, 196, 0, 0.18)',
                accent: '#C97B02'
            }
        }
        return {
            label: 'Not ideal for this trip',
            tag: 'Not ideal',
            badge: '⚠️',
            bgColor: 'rgba(220, 177, 0, 0.2)',
            accent: '#A07900'
        }
    }

    const matchMeta = getMatchMeta(percent)

    return (
        <div className="mb-12 md:mb-6 pt-1">
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
                className="relative rounded-2xl bg-white max-md:px-1 p-4 flex items-stretch gap-4 max-md:mx-[20px]"
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
                            className="flex flex-col justify-between rounded-3xl px-3 py-3 max-md:w-full"
                            style={{ minWidth: 200, background: matchMeta.bgColor }}>
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex items-end justify-center rounded-2xl text-white p-3 py-4"
                                    style={{
                                        background: matchMeta.accent,
                                        fontFamily: 'Red Hat Display',
                                        fontWeight: 700,
                                        fontSize: 34
                                    }}>
                                    {percent}
                                    <span className="text-lg mb-2 pl-1">%</span>
                                </div>
                                <div className="flex flex-col">
                                    <span
                                        style={{
                                            fontFamily: 'Red Hat Display',
                                            fontWeight: 800,
                                            fontSize: 18,
                                            color: matchMeta.accent
                                        }}>
                                        {matchMeta.tag}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: 'Manrope',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: 'rgba(25, 8, 32, 0.68)'
                                        }}>
                                        {matchMeta.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex flex-wrap gap-3">
                                {isLoading ? (
                                    <>
                                        <div className="h-7 w-32 rounded-full shrink-0 bg-gray-200 shimmer-pulse" />
                                        <div className="h-7 w-32 rounded-full shrink-0 bg-gray-200 shimmer-pulse" />
                                        <div className="h-7 w-32 rounded-full shrink-0 bg-gray-200 shimmer-pulse" />
                                    </>
                                ) : useFallback || !summaryData ? (
                                    hotelData.review_data.hot_picks.slice(0, 3).map((pick) => {
                                        const iconName = (pick.icon || '').trim()
                                        const IconEl = getLucideIcon(iconName, 18, 18)
                                        return (
                                            <span
                                                key={pick.label}
                                                className="inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-white text-[14px] font-medium text-grey-0 whitespace-nowrap shrink-0">
                                                {IconEl}
                                                <span>{pick.label}</span>
                                            </span>
                                        )
                                    })
                                ) : (
                                    <>
                                        {console.log({ summaryData })}
                                        {parsedUrlTags ? (
                                            parsedUrlTags?.map((item, idx) => {
                                                const Icon = item.value ? getLucideIcon('Check', 12, 12) : getLucideIcon('X', 12, 12)

                                                return (
                                                    <span
                                                        key={`urltag-${idx}`}
                                                        className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white
        text-sm font-medium whitespace-nowrap shrink-0 border-grey-4
       text-grey-0
    `}>
                                                        {/* ICON CIRCLE */}
                                                        <span
                                                            className={`
            flex items-center justify-center rounded-full w-4 h-4
            ${item.value ? 'bg-secondary-green' : 'bg-secondary-red'}
        `}>
                                                            <span className="text-white flex items-center justify-center">{Icon}</span>
                                                        </span>

                                                        {/* LABEL */}
                                                        <span className="leading-none">{item.label}</span>
                                                    </span>
                                                )
                                            })
                                        ) : (
                                            <>
                                                {summaryData?.preference_tag?.map((item) => (
                                                    <span
                                                        key={`pref-${item.key}`}
                                                        className="inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-white text-[14px] font-medium text-grey-0 whitespace-nowrap shrink-0">
                                                        <span>{item.tag}</span>
                                                    </span>
                                                ))}

                                                {summaryData?.group_type_tag?.map((item) => (
                                                    <span
                                                        key={`group-${item.key}`}
                                                        className="inline-flex text-[14px] items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-white font-medium text-grey-0 whitespace-nowrap shrink-0">
                                                        <span>{item.tag}</span>
                                                    </span>
                                                ))}

                                                {summaryData?.purpose_tag?.map((item) => (
                                                    <span
                                                        key={`purpose-${item.key}`}
                                                        className="inline-flex text-[14px] items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-white font-medium text-grey-0 whitespace-nowrap shrink-0">
                                                        <span>{item.tag}</span>
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
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
                                {isLoading
                                    ? 'We are analysing recent guest reviews & your preferences...'
                                    : useFallback || !summaryData
                                      ? hotelData.review_data.hot_picks
                                            .map((p) => p.description)
                                            .filter(Boolean)
                                            .join(' ')
                                      : summaryData.personalised_summary}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
