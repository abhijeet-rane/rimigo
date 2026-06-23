import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useCountryBasicInfo } from '../hooks/useCountryBasicInfo'
import { useCityBasicInfo } from '../hooks/useCityBasicInfo'
import CountryDetailsShimmer from './CountryDetailsShimmer'
import CustomShimmer from '@/components/shared/Shimmer'
import { CROWD_ICON, MONEY_ICON, SUNNY_ICON, CLOUDY_ICON, RAINY_ICON } from '@/constants/thiingsIcons'

export type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Generic'

export interface CountryHeroData {
    name: string
    description: string
    stats: {
        avgCost: {
            value: string
            note: string
        }
        weather: {
            value: string
            note: string
            type?: WeatherType
        }
        crowd: {
            level: string
            note: string
        }
    }
}

interface ActivitiesLocationInfoSectionProps {
    country_id?: string | null
    city_id?: string | null
    currentMonthLowerCase: string
    /** Extra classes merged onto the hero card (e.g. `bg-white` on the
     *  Tripboard country overview, where the default grey-5 card reads as
     *  a second surface against the tab's white background). */
    cardClassName?: string
}

const StatItem = ({
    icon: Icon,
    label,
    value,
    note,
    badge,
    badgeColor
}: {
    icon: React.ElementType | string
    label: string
    value?: string
    note: string
    badge?: string
    badgeColor?: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
}) => {
    const badgeColorClasses = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        gray: 'bg-gray-500'
    }

    const badgeBgColor = badgeColor ? badgeColorClasses[badgeColor] : 'bg-secondary-green'

    return (
        <div className="flex flex-col gap-2 flex-1 min-w-[200px] ">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                    {typeof Icon === 'string' ? (
                        <img
                            src={Icon}
                            alt={label}
                            className="w-5 h-5"
                        />
                    ) : (
                        <Icon
                            size={18}
                            className="text-grey-2"
                        />
                    )}
                </div>
                <span className="text-[12px] md:text-[14px] text-grey-1 leading-[16px] font-red-hat-display font-[550] ">{label}</span>
            </div>
            <div className="flex flex-col gap-1">
                {badge ? (
                    <div className={`${badgeBgColor} px-2 py-0.5 rounded-[16px] w-fit`}>
                        <span className="font-red-hat-display font-[500] text-[14px] text-white">{badge}</span>
                    </div>
                ) : (
                    <span className="font-manrope font-[600] text-[16px] md:text-[18px] leading-[24px] text-grey-1 uppercase tracking-[0px]">
                        {value}
                    </span>
                )}
                <span className="text-[12px] font-[500] font-manrope text-grey-2">{note}</span>
            </div>
        </div>
    )
}

/**
 * Capitalizes the first letter of a string
 */
const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Gets the weather icon based on weather type
 */
const getWeatherIcon = (weatherType?: WeatherType): string => {
    switch (weatherType) {
        case 'Sunny':
            return SUNNY_ICON
        case 'Cloudy':
            return CLOUDY_ICON
        case 'Rainy':
            return RAINY_ICON
        case 'Generic':
        default:
            return SUNNY_ICON // Default to sunny icon
    }
}

/**
 * Gets the badge color for crowd level based on the level value
 * Uses same color scheme as walking required in SneakPeekModal
 */
const getCrowdLevelBadgeColor = (level: string): 'green' | 'yellow' | 'orange' | 'red' | 'gray' => {
    const normalizedLevel = level.toUpperCase()
    if (normalizedLevel === 'LOW') {
        return 'green'
    } else if (normalizedLevel === 'MEDIUM') {
        return 'yellow'
    } else if (normalizedLevel === 'HIGH') {
        return 'orange'
    }
    return 'gray' // Default fallback
}

// Stats shimmer component (only for stats section)
const StatsShimmer = () => {
    return (
        <div className="flex-1 flex flex-col md:flex-row items-start gap-6 w-full lg:w-auto">
            {/* Stat Item 1 */}
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                    <CustomShimmer
                        height={18}
                        radius={4}
                        className="w-5"
                    />
                    <CustomShimmer
                        height={14}
                        radius={4}
                        className="w-32"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <CustomShimmer
                        height={16}
                        radius={4}
                        className="w-24"
                    />
                    <CustomShimmer
                        height={12}
                        radius={4}
                        className="w-40"
                    />
                </div>
            </div>

            <div className="hidden md:block w-[1px] h-[52px] bg-[color:var(--color-grey-4)] self-center"></div>

            {/* Stat Item 2 */}
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                    <CustomShimmer
                        height={18}
                        radius={4}
                        className="w-5"
                    />
                    <CustomShimmer
                        height={14}
                        radius={4}
                        className="w-28"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <CustomShimmer
                        height={16}
                        radius={4}
                        className="w-20"
                    />
                    <CustomShimmer
                        height={12}
                        radius={4}
                        className="w-36"
                    />
                </div>
            </div>

            <div className="hidden md:block w-[1px] h-[52px] bg-[color:var(--color-grey-4)] self-center"></div>

            {/* Stat Item 3 */}
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                    <CustomShimmer
                        height={18}
                        radius={4}
                        className="w-5"
                    />
                    <CustomShimmer
                        height={14}
                        radius={4}
                        className="w-36"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <CustomShimmer
                        height={20}
                        radius={4}
                        className="w-16"
                    />
                    <CustomShimmer
                        height={12}
                        radius={4}
                        className="w-44"
                    />
                </div>
            </div>
        </div>
    )
}

const CountryDetails = ({ data, currentMonth, showStatsShimmer }: { data: CountryHeroData; currentMonth: string; showStatsShimmer?: boolean }) => {
    // Format month name for display (e.g., "june" -> "Jun")
    const monthDisplay = capitalizeFirst(currentMonth).slice(0, 3)

    return (
        <>
            {/* Country Info */}
            <div className="flex flex-col gap-1 max-w-[480px] max-md:pr-[20px] ">
                <h1 className="font-red-hat-display font-[550] text-[24px] md:text-[28px] text-grey-0 ">{data.name}</h1>
                <p className="font-manrope font-[500] text-[12px] md:text-[14px] text-grey-1  leading-[20px] ">{data.description}</p>
            </div>

            {/* Country Stats */}
            {showStatsShimmer ? (
                <StatsShimmer />
            ) : (
                <div className="relative flex-1 w-full lg:w-auto">
                    {/* LEFT FADE OVERLAY (mobile only) */}
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-[20%] z-10 bg-linear-to-r from-grey-5/30 to-grey-5/40 md:hidden" />

                    {/* Scrollable stats */}
                    <div className="flex max-md:overflow-x-auto items-start gap-3 md:gap-6 w-full scrollbar-hide">
                        <StatItem
                            icon={MONEY_ICON}
                            label="Avg. Cost (per day)"
                            value={data.stats.avgCost.value}
                            note={data.stats.avgCost.note}
                        />

                        <div className="self-stretch w-[1px] my-2 bg-[color:var(--color-grey-4)] shrink-0" />

                        <StatItem
                            icon={getWeatherIcon(data.stats.weather.type)}
                            label={`Weather (${monthDisplay})`}
                            value={data.stats.weather.value}
                            note={data.stats.weather.note}
                        />

                        <div className="self-stretch w-[1px] my-2 bg-[color:var(--color-grey-4)] shrink-0" />

                        <StatItem
                            icon={CROWD_ICON}
                            label={`Crowd Levels (${monthDisplay})`}
                            note={data.stats.crowd.note}
                            badge={data.stats.crowd.level}
                            badgeColor={getCrowdLevelBadgeColor(data.stats.crowd.level)}
                        />
                    </div>
                </div>
            )}
        </>
    )
}

const ActivitiesLocationInfoSection = ({ country_id, city_id, currentMonthLowerCase, cardClassName }: ActivitiesLocationInfoSectionProps) => {
    // Conditionally fetch based on whether we have city_id or country_id
    const shouldFetchCity = !!city_id

    // Track previous month to detect changes
    const prevMonthRef = useRef<string>(currentMonthLowerCase)
    const shimmerTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [showMonthChangeShimmer, setShowMonthChangeShimmer] = useState(false)

    // Fetch city information if city_id is present
    const {
        data: cityData,
        isLoading: isCityLoading,
        isError: isCityError
    } = useCityBasicInfo({
        cityId: city_id ?? null,
        currentMonth: currentMonthLowerCase
    })

    // Fetch country information if only country_id is present (not city_id)
    const {
        data: countryData,
        isLoading: isCountryLoading,
        isError: isCountryError
    } = useCountryBasicInfo({
        countryId: country_id ?? null,
        currentMonth: currentMonthLowerCase
    })

    // Determine which data to use
    const data = shouldFetchCity ? cityData : countryData
    const isLoading = shouldFetchCity ? isCityLoading : isCountryLoading
    const isError = shouldFetchCity ? isCityError : isCountryError

    // Create refs to track data and isLoading without adding them to dependencies
    const dataRef = useRef(data)
    const isLoadingRef = useRef(isLoading)

    // Keep refs in sync with current values
    useEffect(() => {
        dataRef.current = data
        isLoadingRef.current = isLoading
    }, [data, isLoading])

    // Detect month changes and show shimmer for 100ms
    useEffect(() => {
        // Only trigger on month change, not on data changes
        if (prevMonthRef.current !== currentMonthLowerCase) {
            // Clear any existing timer first
            if (shimmerTimerRef.current) {
                clearTimeout(shimmerTimerRef.current)
                shimmerTimerRef.current = null
            }

            // Month changed - update ref
            prevMonthRef.current = currentMonthLowerCase

            // Show shimmer for stats only for 100ms (if data exists and not loading)
            // Use refs to get current values without adding them to dependencies
            if (dataRef.current && !isLoadingRef.current) {
                setShowMonthChangeShimmer(true)
                shimmerTimerRef.current = setTimeout(() => {
                    setShowMonthChangeShimmer(false)
                    shimmerTimerRef.current = null
                }, 100)
            } else {
                setShowMonthChangeShimmer(false)
            }
        }

        // Cleanup function
        return () => {
            if (shimmerTimerRef.current) {
                clearTimeout(shimmerTimerRef.current)
                shimmerTimerRef.current = null
            }
        }
    }, [currentMonthLowerCase]) // Only depend on month change

    if (!country_id && !city_id) {
        return null
    }

    // Show loading state with full shimmer (only on initial load)
    if (isLoading && !data) {
        return (
            <div className="w-full py-1 md:py-8">
                <div className={cn('mx-auto bg-[color:var(--color-grey-5)] border border-[color:var(--color-grey-4)] rounded-[16px] p-5 flex flex-col lg:flex-row items-start lg:items-center gap-10', cardClassName)}>
                    <CountryDetailsShimmer />
                </div>
            </div>
        )
    }

    // Show error state (silently fail - don't show the section if there's an error)
    if (isError || !data) {
        return null
    }

    return (
        <div className="w-full py-1 md:py-8">
            <div className={cn('mx-auto bg-grey-5 border border-grey-4 rounded-[16px] max-md:pr-0 px-5 py-3 flex max-md:m-4 max-md:overflow-hidden flex-col lg:flex-row items-start lg:items-start gap-4 md:gap-10', cardClassName)}>
                <CountryDetails
                    data={data}
                    currentMonth={currentMonthLowerCase}
                    showStatsShimmer={showMonthChangeShimmer}
                />
            </div>
        </div>
    )
}

export default ActivitiesLocationInfoSection
