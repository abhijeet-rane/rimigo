import React, { useMemo, useState } from 'react'
import type { DiscoveryData, DiscoveryResultItem } from './types'
import GenericMap, { type MapMarker } from '@/components/shared/Map/GenericMap'
import PlaceCard from './primitives/PlaceCard'

interface DiscoveryMapPanelProps {
    data: DiscoveryData
    onSendAgentMessage?: (message: string) => void
}

const RESTAURANT_KEYWORDS = ['restaurant', 'cafe', 'food', 'dessert', 'bakery', 'bar', 'dining']

const getMarkerType = (category?: string): MapMarker['type'] => {
    if (!category) return 'experience'
    const lower = category.toLowerCase()
    return RESTAURANT_KEYWORDS.some((kw) => lower.includes(kw)) ? 'restaurant' : 'experience'
}

const toMapMarkers = (results: DiscoveryResultItem[]): MapMarker[] =>
    results
        .map((r, idx) => {
            if (r.latitude == null || r.longitude == null) return null
            return {
                id: r.entity_id || `discovery-${idx}`,
                name: r.name,
                geo_location: { lat: r.latitude, long: r.longitude },
                image: r.image_url,
                type: getMarkerType(r.category),
                sequenceNumber: idx + 1,
            } satisfies MapMarker
        })
        .filter(Boolean) as MapMarker[]

const DiscoveryMapPanel: React.FC<DiscoveryMapPanelProps> = ({ data }) => {
    const [hoveredResultIdx, setHoveredResultIdx] = useState<number | null>(null)

    // Guard against undefined/empty data from text-only responses
    if (!data) return null

    const markers = useMemo(() => toMapMarkers(data.results || []), [data.results])

    const hoveredMarkerId = useMemo(() => {
        if (hoveredResultIdx == null || !data.results?.[hoveredResultIdx]) return null
        const r = data.results[hoveredResultIdx]
        return r.entity_id || `discovery-${hoveredResultIdx}`
    }, [hoveredResultIdx, data.results])

    return (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] bg-gradient-to-b from-primary-default/[0.03] to-transparent">
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6">{data.response}</p>
            )}

            {/* Query context */}
            <p className="text-xs text-grey_2 font-manrope">
                Searched for: <span className="font-medium text-primary-default">{data.query}</span>
            </p>

            {/* Map */}
            {markers.length > 0 && (
                <GenericMap
                    markers={markers}
                    hoveredMarkerId={hoveredMarkerId}
                    hideExpandButton={true}
                    height="200px"
                    className="rounded-[12px] overflow-hidden"
                />
            )}

            {/* Results list */}
            {(!data.results || data.results.length === 0) && (
                <p className="text-sm text-gray-500 py-4 text-center">No results found for this search.</p>
            )}
            <div className="flex flex-col gap-2">
                {(data.results || []).map((result, idx) => (
                    <PlaceCard
                        key={result.entity_id || idx}
                        place={result}
                        highlighted={hoveredResultIdx === idx}
                        onMouseEnter={() => setHoveredResultIdx(idx)}
                        onMouseLeave={() => setHoveredResultIdx(null)}
                    />
                ))}
            </div>
        </div>
    )
}

export default DiscoveryMapPanel
