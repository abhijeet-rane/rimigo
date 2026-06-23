import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Users, CalendarDays } from 'lucide-react'

import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import Typography from '@/components/shared/Typography'
import PlanTripButton from '@/components/PlanTripButton'
import Footer from '@/components/Footer/Footer'
import Navbar from '@/components/shared/Navbar'
import { LocationPersonalizationResponse, SeasonalInformation, getCountryBasicInfo, getLiveCountries } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { MONEY_ICON, SUNNY_ICON, CLOUDY_ICON, RAINY_ICON, CROWD_ICON } from '@/constants/thiingsIcons'

type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Generic'

type MonthKey =
    | 'january'
    | 'february'
    | 'march'
    | 'april'
    | 'may'
    | 'june'
    | 'july'
    | 'august'
    | 'september'
    | 'october'
    | 'november'
    | 'december'

const MONTHS: { key: MonthKey; label: string; short: string; index: number }[] = [
    { key: 'january', label: 'January', short: 'Jan', index: 0 },
    { key: 'february', label: 'February', short: 'Feb', index: 1 },
    { key: 'march', label: 'March', short: 'Mar', index: 2 },
    { key: 'april', label: 'April', short: 'Apr', index: 3 },
    { key: 'may', label: 'May', short: 'May', index: 4 },
    { key: 'june', label: 'June', short: 'Jun', index: 5 },
    { key: 'july', label: 'July', short: 'Jul', index: 6 },
    { key: 'august', label: 'August', short: 'Aug', index: 7 },
    { key: 'september', label: 'September', short: 'Sep', index: 8 },
    { key: 'october', label: 'October', short: 'Oct', index: 9 },
    { key: 'november', label: 'November', short: 'Nov', index: 10 },
    { key: 'december', label: 'December', short: 'Dec', index: 11 }
]

const getInitialMonthKey = (): MonthKey => {
    const index = new Date().getMonth()
    return MONTHS[index]?.key ?? 'january'
}

/**
 * Gets the weather icon based on weather type from description
 */
const getWeatherIcon = (description?: string): string => {
    if (!description) return SUNNY_ICON
    
    const desc = description.toLowerCase()
    if (desc.includes('rain') || desc.includes('rainy') || desc.includes('wet') || desc.includes('shower')) {
        return RAINY_ICON
    } else if (desc.includes('cloud') || desc.includes('cloudy') || desc.includes('overcast')) {
        return CLOUDY_ICON
    } else if (desc.includes('sun') || desc.includes('sunny') || desc.includes('clear') || desc.includes('dry')) {
        return SUNNY_ICON
    }
    return SUNNY_ICON // Default to sunny
}

/**
 * Gets the weather type from description
 */
const getWeatherType = (description?: string): WeatherType => {
    if (!description) return 'Generic'
    
    const desc = description.toLowerCase()
    if (desc.includes('rain') || desc.includes('rainy') || desc.includes('wet') || desc.includes('shower')) {
        return 'Rainy'
    } else if (desc.includes('cloud') || desc.includes('cloudy') || desc.includes('overcast')) {
        return 'Cloudy'
    } else if (desc.includes('sun') || desc.includes('sunny') || desc.includes('clear') || desc.includes('dry')) {
        return 'Sunny'
    }
    return 'Generic'
}

const getRatingFromSeason = (season: SeasonalInformation | undefined): 'best' | 'good' | 'mixed' | 'poor' => {
    if (!season) return 'mixed'

    const type = season.type?.toLowerCase?.() ?? ''
    const description = season.description?.toLowerCase() ?? ''
    const crowdLevel = season.crowd?.level?.toLowerCase() ?? ''
    const isPeak = season.crowd?.peak ?? false
    const cost = season.cost

    // Direct type mapping - highest priority
    if (type.includes('best') || type.includes('optimal') || type.includes('ideal')) return 'best'
    if (type.includes('poor') || type.includes('avoid') || type.includes('worst')) return 'poor'
    if (type.includes('mixed') || type.includes('variable')) return 'mixed'
    if (type.includes('good') || type.includes('great') || type.includes('excellent')) return 'good'

    // Analyze multiple factors for better rating
    // Check description for positive/negative indicators
    const hasPositiveIndicators = 
        description.includes('perfect') || 
        description.includes('ideal') || 
        description.includes('excellent') || 
        description.includes('best') ||
        description.includes('great') ||
        description.includes('optimal')
    
    const hasNegativeIndicators = 
        description.includes('poor') || 
        description.includes('bad') || 
        description.includes('worst') || 
        description.includes('avoid') ||
        description.includes('unfavorable') ||
        description.includes('extreme')

    // Best: Low crowd + good weather + reasonable cost + positive description
    if (!isPeak && crowdLevel.includes('low') && !hasNegativeIndicators && (hasPositiveIndicators || (!cost || (cost.min_price < cost.max_price * 0.7)))) {
        return 'best'
    }

    // Poor: High crowd + bad weather/conditions + high cost + negative description
    if ((isPeak || crowdLevel.includes('high') || crowdLevel.includes('peak')) && 
        (hasNegativeIndicators || (cost && cost.min_price > 1000)) && 
        (description.includes('rain') || description.includes('cold') || description.includes('extreme'))) {
        return 'poor'
    }

    // Good: Peak season with good conditions (popular for a reason)
    if (isPeak && !hasNegativeIndicators && (hasPositiveIndicators || !description.includes('rain'))) {
        return 'good'
    }

    // Good: Low crowd with decent conditions
    if (crowdLevel.includes('low') && !hasNegativeIndicators) {
        return 'good'
    }

    // Mixed: Peak season with mixed conditions
    if (isPeak && !hasPositiveIndicators && !hasNegativeIndicators) {
        return 'mixed'
    }
    
    // Default fallback
    return 'mixed'
}

type CountryWithRating = {
    country: LocationPersonalizationResponse
    rating: 'best' | 'good' | 'mixed' | 'poor'
    avgTemp: number
    costRange: { min: number; max: number; currency: string } | null
    seasonType?: string
    seasonDescription?: string
    crowdLevel?: string
    weatherType?: WeatherType
}

export const WhereToTravelPage: React.FC = () => {
    const { month: monthParam } = useParams<{ month?: string }>()
    const navigate = useNavigate()
    
    const [numTravelers, setNumTravelers] = useState<number>(2)
    const [numDays, setNumDays] = useState<number>(7)

    // Parse month from URL param (e.g., "december" -> "december")
    const getMonthKeyFromParam = (param: string | undefined): MonthKey => {
        if (!param) return getInitialMonthKey()
        const normalized = param.toLowerCase()
        const found = MONTHS.find(m => m.key === normalized || m.label.toLowerCase() === normalized)
        return found?.key ?? getInitialMonthKey()
    }

    const [activeMonthKey, setActiveMonthKey] = useState<MonthKey>(
        getMonthKeyFromParam(monthParam)
    )

    const {
        data: countries,
        isLoading: isCountriesLoading
    } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['locationPersonalization'],
        queryFn: () => getLiveCountries(),
        staleTime: HOURS_24
    })

    // Fetch country info for all countries in parallel (limited to first 20 for performance)
    const countryIds = useMemo(() => countries?.slice(0, 20).map(c => c.country_id) ?? [], [countries])

    const countryInfoQueries = useQuery({
        queryKey: ['countriesBasicInfo', countryIds, activeMonthKey],
        queryFn: async () => {
            const results = await Promise.allSettled(
                countryIds.map(id => getCountryBasicInfo(id))
            )
            return results.map((result, index) => ({
                countryId: countryIds[index],
                data: result.status === 'fulfilled' ? result.value : null
            }))
        },
        enabled: countryIds.length > 0,
        staleTime: HOURS_24
    })

    // Process countries with ratings for the selected month
    const countriesWithRatings = useMemo(() => {
        if (!countries || !countryInfoQueries.data) return []

        const results: CountryWithRating[] = []

        countries.slice(0, 20).forEach((country) => {
            const info = countryInfoQueries.data?.find(d => d.countryId === country.country_id)?.data
            if (!info?.seasonal_information) return

            const season = info.seasonal_information[activeMonthKey]
            if (!season) return

            const rating = getRatingFromSeason(season)
            const avgTemp = (season.min_temp + season.max_temp) / 2
            const costRange = season.cost ? {
                min: season.cost.min_price,
                max: season.cost.max_price,
                currency: season.cost.currency
            } : null

            results.push({
                country,
                rating,
                avgTemp,
                costRange,
                seasonType: season.type,
                seasonDescription: season.description,
                crowdLevel: season.crowd?.level,
                weatherType: getWeatherType(season.description)
            })
        })

        // Sort by rating (best > good > mixed > poor)
        const ratingOrder = { best: 0, good: 1, mixed: 2, poor: 3 }
        return results.sort((a, b) => ratingOrder[a.rating] - ratingOrder[b.rating])
    }, [countries, countryInfoQueries.data, activeMonthKey])

    const handleMonthSelect = (monthKey: MonthKey) => {
        setActiveMonthKey(monthKey)
        navigate(`/where-to-travel/${monthKey}`, { replace: true })
    }

    const handleCountrySelect = (_countryId: string, countryName: string) => {
        // Convert country name to URL-friendly slug
        const countrySlug = countryName.toLowerCase().replace(/\s+/g, '-')
        navigate(`/when-to-travel/${countrySlug}`)
    }

    // Sync with URL param on mount/change
    useEffect(() => {
        const monthFromUrl = getMonthKeyFromParam(monthParam)
        if (monthFromUrl !== activeMonthKey) {
            setActiveMonthKey(monthFromUrl)
        }
    }, [monthParam, activeMonthKey])

    // Redirect to default month if no month in URL
    useEffect(() => {
        if (!monthParam) {
            const defaultMonth = getInitialMonthKey()
            navigate(`/where-to-travel/${defaultMonth}`, { replace: true })
        }
    }, [monthParam, navigate])

    return (
        <>
            <ReactHelmet title="Rimigo | Where to travel" />
            <Navbar />
            <div className="min-h-screen bg-natural-white">
                {/* Main Content */}
                <div className="relative z-10 pt-24 md:pt-28 lg:pt-32 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Page Title */}
                        <div className="text-center mb-6 md:mb-8 lg:mb-10">
                            <h1 className="text-4xl md:text-6xl font-semibold leading-tight md:leading-tight text-careers-dark mb-6 font-red-hat-display">
                                Where to travel
                            </h1>
                            
                            {/* Month Selector - Below Title */}
                            <div className="flex items-center justify-center mb-4 md:mb-6">
                                <div className="flex items-center gap-2 bg-grey-5 border border-grey-4 rounded-[40px] p-0.5 max-w-full w-full sm:w-auto">
                                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide px-2 w-full sm:w-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                        {MONTHS.map((month) => {
                                            const isActive = month.key === activeMonthKey
                                            return (
                                                <button
                                                    key={month.key}
                                                    onClick={() => handleMonthSelect(month.key)}
                                                    className={`
                                                        flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap
                                                        transition-all duration-200 shrink-0 cursor-pointer
                                                    `}
                                                    style={{
                                                        border: isActive ? '2px solid #7011F6' : '1px solid transparent',
                                                        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                                    }}
                                                >
                                                    <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#7011F6]' : 'text-grey-2'}`} />
                                                    <span
                                                        className="font-manrope font-semibold text-xs sm:text-sm"
                                                        style={{
                                                            fontWeight: 600,
                                                            color: isActive ? '#101010' : '#747474'
                                                        }}
                                                    >
                                                        {month.short}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-lg md:text-xl text-grey-2 font-manrope max-w-2xl mx-auto px-2">
                                Select a month to see the best destinations to visit
                            </p>
                        </div>

                        {/* Travel Inputs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 md:mb-6 lg:mb-8">
                            <div className="flex items-center gap-2 sm:gap-3 bg-white border border-grey-4 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto">
                                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-default/10 shrink-0">
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-default" />
                                </div>
                                <label className="text-xs sm:text-sm font-semibold text-grey-0 font-redhat">Travelers</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={numTravelers}
                                    onChange={(e) => setNumTravelers(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                    className="w-14 sm:w-16 px-2 py-1.5 text-center border border-grey-4 rounded-lg text-xs sm:text-sm font-bold text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 bg-white border border-grey-4 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto">
                                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-default/10 shrink-0">
                                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary-default" />
                                </div>
                                <label className="text-xs sm:text-sm font-semibold text-grey-0 font-redhat">Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={numDays}
                                    onChange={(e) => setNumDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                                    className="w-14 sm:w-16 px-2 py-1.5 text-center border border-grey-4 rounded-lg text-xs sm:text-sm font-bold text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Countries Grid */}
                        {isCountriesLoading || countryInfoQueries.isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="h-32 bg-grey-5 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : countriesWithRatings.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {countriesWithRatings.map(({ country, rating, avgTemp, costRange, seasonDescription, crowdLevel, weatherType }, index) => {
                                    // Top 3 recommendation badges
                                    const rank = index + 1
                                    const isTop3 = rank <= 3
                                    const ratingColors = {
                                        best: 'border-[#2d5f3f] bg-[#2d5f3f]/5',
                                        good: 'border-[#6ba368] bg-[#6ba368]/5',
                                        mixed: 'border-[#e8a95d] bg-[#e8a95d]/5',
                                        poor: 'border-[#d47272] bg-[#d47272]/5'
                                    }

                                    // Calculate budget approximation
                                    const budgetMin = costRange ? costRange.min * numDays * numTravelers : null
                                    const budgetMax = costRange ? costRange.max * numDays * numTravelers : null


                                    return (
                                        <div key={country.country_id} className="flex flex-col group relative">
                                            {/* Top Recommendation Badge */}
                                            {isTop3 && (
                                                <div 
                                                    className="absolute -top-3 -right-3 z-10 flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white"
                                                    style={{
                                                        background: rank === 1 
                                                            ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' // Gold for #1
                                                            : rank === 2
                                                            ? 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)' // Silver for #2
                                                            : 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)' // Bronze for #3
                                                    }}
                                                >
                                                    <span 
                                                        className="text-base font-bold text-white"
                                                        style={{ 
                                                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                            fontFamily: 'Red Hat Display'
                                                        }}>
                                                        {rank}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <button
                                                onClick={() => handleCountrySelect(country.country_id, country.country_name)}
                                                className={`rounded-2xl p-6 border-2 transition-all hover:shadow-xl hover:scale-[1.02] text-left ${ratingColors[rating]} flex-1 flex flex-col relative`}
                                            >
                                                {/* Header with Flag and Country Name */}
                                                <div className="flex items-start gap-4 mb-4">
                                                    {country.flag_icon_url && (
                                                        <img
                                                            src={country.flag_icon_url}
                                                            alt={country.country_name}
                                                            className="w-12 h-12 rounded-full object-cover shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <Typography
                                                                size="20"
                                                                weight="bold"
                                                                color="grey-0"
                                                                family="redhat"
                                                                className="block">
                                                                {country.country_name}
                                                            </Typography>
                                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                                                                rating === 'best' ? 'bg-[#2d5f3f] text-white' :
                                                                rating === 'good' ? 'bg-[#6ba368] text-white' :
                                                                rating === 'mixed' ? 'bg-[#e8a95d] text-white' :
                                                                'bg-[#d47272] text-white'
                                                            }`}>
                                                                {rating === 'best' ? 'Best' :
                                                                 rating === 'good' ? 'Good' :
                                                                 rating === 'mixed' ? 'Mixed' : 'Avoid'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {seasonDescription && (
                                                    <div className="mb-5">
                                                        <Typography
                                                            size="14"
                                                            weight="medium"
                                                            color="grey-1"
                                                            family="manrope"
                                                            className="leading-relaxed">
                                                            {seasonDescription}
                                                        </Typography>
                                                    </div>
                                                )}

                                                {/* Stats Section */}
                                                <div className="space-y-3 mt-auto pt-4 border-t border-white/30">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                                                <img
                                                                    src={getWeatherIcon(seasonDescription)}
                                                                    alt={weatherType || 'Weather'}
                                                                    className="w-5 h-5"
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-grey-2 font-manrope">Avg. Temperature</span>
                                                        </div>
                                                        <span className="text-base font-bold text-grey-0 font-redhat">{Math.round(avgTemp)}°C</span>
                                                    </div>
                                                    {costRange && (
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                                                    <img
                                                                        src={MONEY_ICON}
                                                                        alt="Cost"
                                                                        className="w-5 h-5"
                                                                    />
                                                                </div>
                                                                <span className="text-sm font-medium text-grey-2 font-manrope">Cost per day</span>
                                                            </div>
                                                            <span className="text-base font-bold text-grey-0 font-redhat">
                                                                {costRange.currency}{costRange.min.toLocaleString()} - {costRange.currency}{costRange.max.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {crowdLevel && (
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                                                    <img
                                                                        src={CROWD_ICON}
                                                                        alt="Crowd"
                                                                        className="w-5 h-5"
                                                                    />
                                                                </div>
                                                                <span className="text-sm font-medium text-grey-2 font-manrope">Crowd Level</span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-grey-0 font-redhat capitalize">{crowdLevel}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                            
                                            {/* Budget Approximation */}
                                            {budgetMin && budgetMax && costRange && (
                                                <div className="mt-3 px-5 py-3.5 bg-white rounded-xl border-2 border-grey-4 shadow-sm">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                                            <img
                                                                src={MONEY_ICON}
                                                                alt="Budget"
                                                                className="w-5 h-5"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                            <span className="text-xs font-medium text-grey-2 font-manrope">
                                                                Est. Budget ({numTravelers} {numTravelers === 1 ? 'traveler' : 'travelers'} × {numDays} {numDays === 1 ? 'day' : 'days'})
                                                            </span>
                                                            <span className="text-lg font-bold text-grey-0 font-redhat">
                                                                {costRange.currency}{budgetMin.toLocaleString()} - {costRange.currency}{budgetMax.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-12 text-center border border-grey-4 shadow-sm">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    color="grey-0"
                                    family="redhat"
                                    className="mb-2">
                                    No destinations found
                                </Typography>
                                <Typography
                                    size="14"
                                    weight="medium"
                                    color="grey-2"
                                    family="manrope">
                                    Try selecting a different month
                                </Typography>
                            </div>
                        )}

                        {/* Start Planning CTA */}
                        <div className="mt-12 md:mt-16 text-center">
                            <PlanTripButton
                                buttonPage="where_to_travel_page"
                                buttonName="start_planning_cta"
                                buttonAction="cta_button_clicked"
                                location="bottom_section"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <Footer />
        </>
    )
}

export default WhereToTravelPage
