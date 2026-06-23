import React, { useState } from 'react'
import type { HotelSearchResultsData } from './types'

interface HotelSearchResultsCardProps {
    data: HotelSearchResultsData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    sourceInteractionId?: string
}

const HotelSearchResultsCard: React.FC<HotelSearchResultsCardProps> = ({
    data,
    onSendAgentMessage,
    sourceInteractionId,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const handleSelectHotel = (hotel: HotelSearchResultsData['hotels'][number], dayIndex?: number) => {
        if (selectedId) return
        const id = hotel.zentrum_hub_id || hotel.name
        setSelectedId(id)

        // Concierge rebuild: structured intent envelope (action =
        // direct_replacement_add) replaces the legacy direct-replacement
        // task_data dict shape.
        onSendAgentMessage?.(`Add ${hotel.name} to itinerary`, {
            action: 'direct_replacement_add',
            slot_ref: {
                day_index: dayIndex ?? 0,
                slot_index: -1,
            },
            replacement: {
                type: 'stay',
                title: hotel.name,
                name: hotel.name,
                zentrum_hub_id: hotel.zentrum_hub_id,
                image_url: hotel.image_url,
                city: hotel.city,
            },
            source_interaction_id: sourceInteractionId,
        })
    }

    if (!data.hotels || data.hotels.length === 0) {
        return (
            <div className="text-[13px] text-grey_1 font-manrope">
                No hotels found for {data.city_name}.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Horizontal scrollable carousel */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {data.hotels.map((hotel, idx) => {
                    const id = hotel.zentrum_hub_id || hotel.name
                    const isSelected = selectedId === id

                    return (
                        <div
                            key={id + idx}
                            className={`flex-shrink-0 w-[220px] rounded-xl border overflow-hidden transition-all ${
                                isSelected
                                    ? 'border-primary-default ring-2 ring-primary-default/20'
                                    : selectedId
                                      ? 'border-grey_4 opacity-50'
                                      : 'border-grey_4 hover:border-grey_2'
                            }`}>
                            {/* Hotel image */}
                            {hotel.image_url ? (
                                <div className="w-full h-[120px] bg-grey_5 overflow-hidden">
                                    <img
                                        src={hotel.image_url}
                                        alt={hotel.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            ;(e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-[120px] bg-grey_5 flex items-center justify-center">
                                    <span className="text-grey_3 text-[24px]">🏨</span>
                                </div>
                            )}

                            {/* Hotel info */}
                            <div className="p-3 space-y-2">
                                <h4 className="text-[13px] leading-[18px] font-semibold text-grey_0 font-manrope line-clamp-2">
                                    {hotel.name}
                                </h4>

                                <div className="flex items-center gap-2">
                                    {hotel.rating && (
                                        <span className="text-[11px] text-grey_1 font-manrope">
                                            ⭐ {hotel.rating.toFixed(1)}
                                        </span>
                                    )}
                                    {hotel.price_range && (
                                        <span className="text-[11px] text-grey_1 font-manrope">
                                            {hotel.price_range}
                                        </span>
                                    )}
                                </div>

                                {hotel.short_description && (
                                    <p className="text-[11px] leading-[16px] text-grey_2 font-manrope line-clamp-2">
                                        {hotel.short_description}
                                    </p>
                                )}

                                {hotel.address && (
                                    <p className="text-[10px] leading-[14px] text-grey_3 font-manrope line-clamp-1">
                                        📍 {hotel.address}
                                    </p>
                                )}

                                {/* Add to itinerary button */}
                                <button
                                    className={`w-full mt-1 py-2 px-3 rounded-lg text-[11px] font-semibold font-manrope transition-colors ${
                                        isSelected
                                            ? 'bg-primary-default text-white cursor-default'
                                            : selectedId
                                              ? 'bg-grey_5 text-grey_3 cursor-not-allowed'
                                              : 'bg-primary-default/10 text-primary-default hover:bg-primary-default/20 cursor-pointer'
                                    }`}
                                    disabled={!!selectedId}
                                    onClick={() => handleSelectHotel(hotel)}>
                                    {isSelected ? '✓ Added' : 'Add to Itinerary'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Dates info */}
            {data.dates && (
                <p className="text-[11px] text-grey_2 font-manrope">
                    📅 {data.dates}
                </p>
            )}
        </div>
    )
}

export default HotelSearchResultsCard
