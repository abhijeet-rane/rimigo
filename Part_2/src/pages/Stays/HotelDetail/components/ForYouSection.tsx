import React from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { MatchSummary } from './MatchSummary'
import { SurroundingsSection } from './SurroundingsSection'
import { NearestAirportSection } from './NearestAirportSection'
import { CautionsSection } from './CautionsSection'

interface ForYouSectionProps {
    hotelData: HotelDetailData
    nearbyTab: string
    setNearbyTab: (tab: string) => void
    nearbySelectedIdx: number
    setNearbySelectedIdx: (idx: number) => void
    onOpenAssistant: (question: string) => void
}

export const ForYouSection: React.FC<ForYouSectionProps> = ({
    hotelData,
    nearbyTab,
    setNearbyTab,
    nearbySelectedIdx,
    setNearbySelectedIdx,
    onOpenAssistant
}) => {
    return (
        <div>
            {/* Match summary */}
            <MatchSummary hotelData={hotelData} />
            <div className="border-t border-feature-card-border my-4" />
            <div
                className="md:rounded-2xl"
                style={{
                    background: '#7011F614',
                    padding: '16px 16px',
                    marginTop: '16px'
                }}>
                <div
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'SemiBold',
                        fontSize: 14,
                        lineHeight: '100%',
                        color: 'var(--primary-indigo, #7011F6)',
                        letterSpacing: '-1%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%'
                    }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <img
                            src="/illustrations/wand.png"
                            alt="wand"
                            className="w-4 h-4"
                        />
                        Highlights we curated for you
                    </span>
                    <div
                        style={{ textDecoration: 'underline' }}
                        onClick={() => onOpenAssistant('Why is this hotel suitable for me?')}
                        className="max-md:hidden cursor-pointer">
                        Why is this hotel suitable for me?
                    </div>
                </div>

                {/* Surrounding this stay - rich section */}
                <SurroundingsSection
                    hotelData={hotelData}
                    nearbyTab={nearbyTab}
                    setNearbyTab={setNearbyTab}
                    nearbySelectedIdx={nearbySelectedIdx}
                    setNearbySelectedIdx={setNearbySelectedIdx}
                />

                {/* Airports section */}
                <NearestAirportSection hotelData={hotelData} />

                {/* What you might not like (Cautions) */}
                <CautionsSection hotelData={hotelData} />
            </div>
        </div>
    )
}
