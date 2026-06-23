import { HotelDetailData } from '@/types/hotelDetailTypes'
import { Sparkles, ThumbsUp, ThumbsDown, Laugh, Frown } from 'lucide-react'
import { getLucideIcon } from '@/constants/lucideIconMap'

interface ReviewsHighlightsSectionProps {
    data: HotelDetailData['review_data'] | undefined
    attributes?: HotelDetailData['attributes']
}

export const ReviewsHighlightsSection = ({ data, attributes }: ReviewsHighlightsSectionProps) => {
    const positives = data?.ratings?.reviews?.positives || []
    const negatives = data?.ratings?.reviews?.negatives || []

    if (!positives.length && !negatives.length) return null

    return (
        <div id="reviewsSection" className="mt-10">
            <div style={{ color: '#000', fontFamily: 'Red Hat Display', fontSize: 24, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: 'normal' }}>Reviews</div>
            <div className="mb-4" style={{ color: 'var(--grey-2, #747474)', fontFamily: 'Manrope', fontSize: 14, fontStyle: 'normal', fontWeight: 500 as any, lineHeight: 'normal', letterSpacing: '-0.28px' }}>A quick glance at guest sentiment</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mt-[39px]">
                {/* Positives */}
                <div className="rounded-xl p-4" style={{ border: '2px solid #33C98B' }}>
                    <div className="items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 18, fontStyle: 'normal', fontWeight: 467 as any, lineHeight: 'normal', letterSpacing: '-0.18px' }}>What guests love, that you might too</div>
                            <Laugh className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <Sparkles className="w-4 h-4" color="#7011F6" />
                            <div style={{ color: 'var(--primary-indigo, #7011F6)', fontFamily: 'Red Hat Display', fontSize: 12, fontStyle: 'normal', fontWeight: 645 as any, lineHeight: 'normal', letterSpacing: '-0.12px' }}>Summarised by AI</div>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-4 mt-3 gap-2">
                        {positives.slice(0, 3).map((p, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <ThumbsUp className="w-4 h-5 mt-1 min-w-5" color="#26BC6D" />
                                <div>
                                    <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 14, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: '18px', letterSpacing: '-0.14px' }}>{p.summary}</div>
                                    <div style={{ color: 'var(--grey-1, #363636)', fontFamily: 'Manrope', fontSize: 12, fontStyle: 'normal', fontWeight: 400 as any, lineHeight: 'normal', letterSpacing: '-0.12px', display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{p.details}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Negatives */}
                <div className="rounded-xl p-4" style={{ border: '2px solid #E73434' }}>
                    <div className="items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 18, fontStyle: 'normal', fontWeight: 467 as any, lineHeight: 'normal', letterSpacing: '-0.18px' }}>What guests dislike, that you might too</div>
                            <Frown className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <Sparkles className="w-4 h-4" color="#7011F6" />
                            <div style={{ color: 'var(--primary-indigo, #7011F6)', fontFamily: 'Red Hat Display', fontSize: 12, fontStyle: 'normal', fontWeight: 645 as any, lineHeight: 'normal', letterSpacing: '-0.12px' }}>Summarised by AI</div>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-4 mt-3 gap-2">
                        {negatives.slice(0, 3).map((n, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <ThumbsDown className="w-4 h-5 mt-1 min-w-5"  color="#E73434" />
                                <div>
                                    <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 14, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: '18px', letterSpacing: '-0.14px' }}>{n.summary}</div>
                                    <div style={{ color: 'var(--grey-1, #363636)', fontFamily: 'Manrope', fontSize: 12, fontStyle: 'normal', fontWeight: 400 as any, lineHeight: 'normal', letterSpacing: '-0.12px', display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{n.details}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Attributes box */}
            {Array.isArray(attributes) && attributes.length > 0 ? (
                <div className="mt-6 rounded-xl border border-feature-card-border p-4">
                    <div className="mb-3" style={{ color: '#000', fontFamily: 'Red Hat Display', fontSize: 16, fontStyle: 'normal', fontWeight: 600 as any, lineHeight: '20px', letterSpacing: '0.16px' }}>Attributes</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-22 gap-y-5">
                        {attributes.slice(0, 9).map((attr, idx) => {
                            const rating5 = attr.score > 5 ? attr.score / 2 : attr.score
                            const pct = Math.max(0, Math.min(100, (rating5 / 5) * 100))
                            const IconEl = attr.icon ? getLucideIcon(attr.icon, 20, 20) : null
                            return (
                                <div key={`${attr.label}-${idx}`} className="space-y-2 mt-[28px]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {IconEl}
                                            <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 16, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: '20px', letterSpacing: '0.16px' }}>{attr.label}</div>
                                        </div>
                                        <div style={{ color: 'var(--grey-0, #101010)', fontFamily: 'Red Hat Display', fontSize: 14, fontStyle: 'normal', fontWeight: 759 as any, lineHeight: '18px', letterSpacing: '0.14px' }}>{rating5.toFixed(1)}</div>
                                    </div>
                                    <div className="h-[6px] w-full rounded-full bg-grey-grey_4 mt-[16px]">
                                        <div className="h-[6px] rounded-full bg-header-black" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    )
}


