import React from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'

interface CautionsSectionProps {
    hotelData: HotelDetailData
}

export const CautionsSection: React.FC<CautionsSectionProps> = ({ hotelData }) => {
    if (!hotelData.review_data?.cautions) {
        return null
    }

    return (
        <div className="my-6">
            <div className="mb-2" style={{ marginBottom: 40 }}>
                <div style={{ color: '#000', fontFamily: 'Red Hat Display', fontSize: 24, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: 'normal' }}>What you might not like</div>
                <div style={{ color: 'var(--grey-2, #747474)', fontFamily: 'Manrope', fontSize: 14, fontStyle: 'normal', fontWeight: 500 as any, lineHeight: 'normal', letterSpacing: '-0.28px' }}>Based on your preferences</div>
            </div>
            <div className="rounded-2xl border border-feature-card-border bg-white p-4" style={{ boxShadow: '0 2px 8px 0 var(--grey-5, #F8F8F8)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--secondary-red, #E73434)' }} />
                    <div style={{ color: 'var(--secondary-red, #E73434)', fontFamily: 'Red Hat Display', fontSize: 20, fontStyle: 'normal', fontWeight: 550 as any, lineHeight: '24px', letterSpacing: '-0.4px' }}>{hotelData.review_data.cautions.title}</div>
                </div>
                <p className="mb-4" style={{ color: '#000', fontFamily: 'Manrope', fontSize: 16, fontStyle: 'normal', fontWeight: 500 as any, lineHeight: '24px', letterSpacing: '-0.32px' }}>
                    {(hotelData.review_data.cautions.descriptions || []).join(' ')}
                </p>
                {(hotelData.review_data.cautions.mitigation_steps || []).length > 0 && (
                    <div className="mt-4">
                        <div className="mb-2 mt-[32px]" style={{ color: 'var(--grey-2, #747474)', fontFamily: 'Red Hat Display', fontSize: 12, fontStyle: 'normal', fontWeight: 759 as any, lineHeight: 'normal', letterSpacing: '0.24px' }}>WHAT WE RECOMMEND</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hotelData.review_data.cautions.mitigation_steps.map((step: string, idx: number) => (
                                <div key={idx} className="rounded-xl p-4" style={{ background: 'rgba(112, 17, 246, 0.08)' }}>
                                    <div style={{ color: 'var(--primary-indigo, #7011F6)', fontFamily: 'Manrope', fontSize: 14, fontStyle: 'normal', fontWeight: 500 as any, lineHeight: 'normal', letterSpacing: '-0.28px' }}>{step}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
