import React, { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getCountryBasicInfo, type CountryBasicInfoResponse } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { SUNNY_ICON, CLOUDY_ICON, RAINY_ICON } from '@/constants/thiingsIcons'
import type { WeatherType } from '@/modules/Acitvities/components/ActivitiesCountryHero'
import ActivitiesLocationInfoSection from '@/modules/Acitvities/components/ActivitiesCountryHero'
import CountryComparisonTable, { ShimmerRow } from './Countrycomparisontable'
import CustomShimmer from '@/components/shared/Shimmer'

interface TripboardCountryExploreSectionProps {
    countryIds: string[]
    /** Override month (lowercase, e.g. 'march'). Falls back to current month. */
    tripStartMonth?: string
    /** Show shimmer placeholder while waiting for month data */
    isLoadingMonth?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────

const getWeatherIcon = (type?: string): string => {
    const normalized = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : ''
    switch (normalized as WeatherType) {
        case 'Sunny': return SUNNY_ICON
        case 'Cloudy': return CLOUDY_ICON
        case 'Rainy': return RAINY_ICON
        default: return SUNNY_ICON
    }
}

const getCrowdBadgeColor = (level: string) => {
    const n = level.toUpperCase()
    if (n === 'LOW') return 'bg-green-500'
    if (n === 'MEDIUM') return 'bg-yellow-500'
    if (n === 'HIGH') return 'bg-orange-500'
    return 'bg-gray-500'
}

const formatTemp = (min: number, max: number, unit: string) => {
    const s = unit === 'celsius' ? '°C' : '°F'
    return `${min}${s} – ${max}${s}`
}

const formatCost = (min: number, max: number, currency: string) => {
    const s = currency === 'INR' ? '₹' : currency
    return `${s}${min.toLocaleString()} – ${s}${max.toLocaleString()}`
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)


// ── Multi-country table ───────────────────────────────────────────────

const MultiCountryTable: React.FC<{ countryIds: string[]; tripStartMonth?: string }> = ({ countryIds, tripStartMonth }) => {
    const currentMonth = useMemo(() => {
        if (tripStartMonth) return tripStartMonth
        const months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ]
        return months[new Date().getMonth()]
    }, [tripStartMonth])

    const monthDisplay = capitalize(currentMonth).slice(0, 3)

    // Fetch basic info for all countries in parallel
    const queries = useQueries({
        queries: countryIds.map((id) => ({
            queryKey: ['countryBasicInfo', id],
            queryFn: () => getCountryBasicInfo(id),
            staleTime: HOURS_24,
            gcTime: HOURS_24,
            refetchOnWindowFocus: false
        }))
    })

    const isAnyLoading = queries.some((q) => q.isLoading)
    const rows = useMemo(() => {
        return queries
            .map((q) => q.data)
            .filter((d): d is CountryBasicInfoResponse => !!d)
            .map((info) => {
                const month = info.seasonal_information[currentMonth]
                if (!month) return null
                return {
                    name: info.country_name,
                    cost: formatCost(month.cost.min_price, month.cost.max_price, month.cost.currency),
                    costNote: month.cost.description,
                    temp: formatTemp(month.min_temp, month.max_temp, month.temp_unit),
                    weatherNote: month.description,
                    weatherIcon: getWeatherIcon(month.type),
                    crowd: capitalize(month.crowd.level),
                    crowdNote: month.crowd.description,
                    crowdColor: getCrowdBadgeColor(month.crowd.level)
                }
            })
            .filter(Boolean) as Array<{
                name: string; cost: string; costNote: string
                temp: string; weatherNote: string; weatherIcon: string
                crowd: string; crowdNote: string; crowdColor: string
            }>
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queries.map((q) => q.data).join(','), currentMonth])

    return (
        <div className="w-full mb-12">
            <h3 className="text-[18px] font-bold text-grey-0 font-red-hat-display tracking-[-0.04em] mb-4 pl-5 md:pl-0">
                Country snapshot
            </h3>

            <CountryComparisonTable
                rows={rows} 
                monthDisplay={monthDisplay} 
                isAnyLoading={isAnyLoading}
                countryIds={countryIds}
            />
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────

const TripboardCountryExploreSection: React.FC<TripboardCountryExploreSectionProps> = ({
    countryIds,
    tripStartMonth,
    isLoadingMonth = false
}) => {
    const currentMonth = useMemo(() => {
        if (tripStartMonth) return tripStartMonth
        const months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ]
        return months[new Date().getMonth()]
    }, [tripStartMonth])

    if (countryIds.length === 0) return null

    // Show shimmer while waiting for itinerary data to determine the correct month
    if (isLoadingMonth) {
        return (
            <div className="rounded-2xl border border-grey-4 overflow-hidden mt-6">
                <div className="px-5 py-3 bg-grey-5 border-b border-grey-4">
                    <CustomShimmer height={16} radius={4} className="w-48" />
                </div>
                {countryIds.map((id) => <ShimmerRow key={id} />)}
            </div>
        )
    }

    // Single country: use the existing ActivitiesLocationInfoSection
    if (countryIds.length === 1) {
        return (
            <ActivitiesLocationInfoSection
                country_id={countryIds[0]}
                currentMonthLowerCase={currentMonth}
            />
        )
    }

    // Multiple countries: use the table view
    return <MultiCountryTable countryIds={countryIds} tripStartMonth={tripStartMonth} />
}

export default TripboardCountryExploreSection
