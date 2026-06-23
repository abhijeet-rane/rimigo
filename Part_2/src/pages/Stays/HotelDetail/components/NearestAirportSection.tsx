import React from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { PlaneLanding } from 'lucide-react'

interface NearestAirportSectionProps {
    hotelData: HotelDetailData
}

export const NearestAirportSection: React.FC<NearestAirportSectionProps> = ({ hotelData }) => {
    if (!hotelData.nearest_airport) {
        return null
    }

    return (
        <div className="my-6 rounded-2xl border border-feature-card-border bg-white p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <PlaneLanding className="w-4 h-4 text-header-black" />
                    <h3
                        style={{
                            color: '#000',
                            fontFamily: 'Red Hat Display',
                            fontSize: '18px',
                            fontStyle: 'normal',
                            fontWeight: 467 as any,
                            lineHeight: '24px',
                            letterSpacing: '-0.36px'
                        }}>
                        Near the airports
                    </h3>
                </div>
                {hotelData.nearest_airport.airport_shuttle && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Shuttle service included</span>
                )}
            </div>
            <p
                className="mb-3"
                style={{
                    color: 'var(--grey-2, #747474)',
                    fontFamily: 'Manrope',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 500 as any,
                    lineHeight: '20px',
                    letterSpacing: '-0.28px'
                }}>
                This stay is located in central {hotelData.city} and has a direct shuttle access to airports.
            </p>

            <div className="space-y-2">
                <div
                    className="flex items-center justify-between rounded-xl bg-grey-5 px-2 md:px-4 py-3"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' }}>
                    <div
                        className="truncate max-w-[60%]"
                        style={{
                            color: '#000',
                            fontFamily: 'Manrope',
                            fontSize: '16px',
                            fontStyle: 'normal',
                            fontWeight: 500 as any,
                            lineHeight: '24px',
                            letterSpacing: '-0.32px'
                        }}>
                        {hotelData.nearest_airport.name}
                    </div>
                    <div
                        className="flex items-center gap-6 text-header-black whitespace-nowrap"
                        style={{ fontFamily: 'Manrope', fontSize: '16px', fontWeight: 500 as any, lineHeight: '24px', letterSpacing: '-0.32px' }}>
                        <span>
                            {hotelData.nearest_airport.avg_time_to_airport_min ? `${hotelData.nearest_airport.avg_time_to_airport_min}min` : '-'}
                        </span>
                        <span>·</span>
                        <span>{hotelData.nearest_airport.distance_km ? `${hotelData.nearest_airport.distance_km}km` : '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
