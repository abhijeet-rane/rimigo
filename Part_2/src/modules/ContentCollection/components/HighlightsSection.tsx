import React, { useRef } from 'react'
import { Globe, MapPin, Plane, Bed, Utensils, Activity } from 'lucide-react'

export interface HighlightsData {
    countries?: number
    cities?: number
    flights?: number
    activities?: number
    stays?: number
    restaurants?: number
    tripHighlights?: Array<{
        label: string
        description: string
    }>
}

/**
 * Get icon based on description text
 */
const getIconForDescription = (description: string): React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }> => {
    const lowerDesc = description?.toLowerCase()
    if (lowerDesc.includes('country') || lowerDesc.includes('countries')) {
        return Globe
    } else if (lowerDesc.includes('city') || lowerDesc.includes('cities')) {
        return MapPin
    } else if (lowerDesc.includes('flight')) {
        return Plane
    } else if (lowerDesc.includes('activit')) {
        return Activity
    } else if (lowerDesc.includes('stay') || lowerDesc.includes('hotel')) {
        return Bed
    } else if (lowerDesc.includes('restaurant') || lowerDesc.includes('food')) {
        return Utensils
    }
    return Globe // Default icon
}

interface HighlightsSectionProps {
    highlights?: HighlightsData | null
    /** Override the first line of the title (default: "Access our") */
    titleLine1?: string
    /** Override the second line of the title (default: "Recommendations") */
    titleLine2?: string
}

const HighlightsSection: React.FC<HighlightsSectionProps> = ({ highlights, titleLine1 = 'Access our', titleLine2 = 'Recommendations' }) => {
     // Add these state and ref hooks
    const scrollRef = useRef<HTMLDivElement>(null)

    if (!highlights) {
        return null
    }

    // Use tripHighlights array if available, otherwise fallback to individual fields
    let stats: Array<{
        icon: React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }>
        label: string
        value: string | number
        key: string
    }> = []

    if (highlights.tripHighlights && highlights.tripHighlights.length > 0) {
        // Use tripHighlights array directly.
        // Drop zero-value rows: the backend ships `label` as a string
        // (e.g. "0", "3"), so a naive `filter(stat.value)` lets "0" through
        // because it's a truthy string. Parse + compare instead.
        stats = highlights.tripHighlights
            .map((item, index) => ({
                icon: getIconForDescription(item.description),
                label: item.description,
                value: item.label,
                key: `trip-highlight-${index}`,
            }))
            .filter((stat) => {
                if (stat.value === undefined || stat.value === null) return false
                if (typeof stat.value === 'number') return stat.value !== 0
                const trimmed = String(stat.value).trim()
                if (!trimmed) return false
                const num = Number(trimmed)
                // Non-numeric labels (e.g. "4 nights") always render.
                return Number.isNaN(num) || num !== 0
            })
    } else {
        // Fallback to individual fields
        stats = [
            {
                icon: Globe,
                label: 'country',
                value: highlights.countries || 0,
                key: 'countries'
            },
            {
                icon: MapPin,
                label: 'cities',
                value: highlights.cities || 0,
                key: 'cities'
            },
            {
                icon: Plane,
                label: 'flights',
                value: highlights.flights || 0,
                key: 'flights'
            },
            {
                icon: Activity,
                label: 'activities',
                value: highlights.activities || 0,
                key: 'activities'
            },
            {
                icon: Bed,
                label: 'stays',
                value: highlights.stays || 0,
                key: 'stays'
            },
            {
                icon: Utensils,
                label: 'restaurants',
                value: highlights.restaurants || 0,
                key: 'restaurants'
            }
        ].filter((stat) => stat.value !== undefined && stat.value !== null && stat.value !== 0) // Only show stats with values
    }

    if (stats.length === 0) {
        return null
    }


    return (
        <div className="w-full">
            {/* Top divider */}
            <div className="h-px bg-primary-default-80 mb-6" />

            {/* Content */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-10 text-left text-[24px] text-primary-default font-caveat pl-4 md:px-0">
                {/* Title on left */}
                <div className="flex flex-col items-start justify-center">
                    <b className="relative tracking-[-0.02em] w-full text-3xl leading-7 italic" style={{ transform: 'rotate(0deg)' }}>
                        {titleLine1}
                    </b>
                    <div className="relative text-[20px] md:text-[25px] tracking-[-0.02em] leading-7  font-semibold font-red-hat-display text-grey-0">
                        {titleLine2}
                    </div>
                    
                </div>
                {/* Stats on right - horizontal row with carousel on mobile */}
                <div className="relative w-full md:w-auto ">

                    {/* Scrollable container */}
                    <div
                        ref={scrollRef}
                        className="flex items-start gap-8 md:gap-16 text-[27px] text-grey-0 font-red-hat-display overflow-x-auto md:overflow-visible scroll-smooth no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <div key={stat.key} className="flex flex-col items-center gap-[18px] min-w-[120px] md:min-w-[140px]">
                                {/* Icon */}
                                <div className="w-5 h-5 relative flex items-center justify-center ">
                                    <Icon className="w-5 h-5 text-primary-light" strokeWidth={2} fill="none" />
                                </div>
                                {/* Number and Label */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative tracking-[-0.04em] font-semibold">{stat.value}</div>
                                    <div className="relative text-[16px] tracking-[-0.04em] leading-[20px] font-semibold font-manrope text-grey-0-80">
                                        {stat.label}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
            </div>

            {/* Bottom divider */}
            <div className="h-px bg-primary-default-80 mt-6" />
        </div>
    )
}

export default HighlightsSection
