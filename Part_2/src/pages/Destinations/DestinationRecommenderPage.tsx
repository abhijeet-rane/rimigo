import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Thermometer, Users, DollarSign, Calendar } from 'lucide-react'

import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import WeatherChart from '@/modules/Experiences/components/WeatherReport'
import Typography from '@/components/shared/Typography'
import Navbar from '@/components/shared/Navbar'
import { CountrySwitcher } from '@/pages/Landing/Components/CountrySwitcher'
import { HeroContentContainer } from '@/pages/Landing/Components/HeroContentContainer'
import { useImageShowCase } from '@/pages/Landing/hooks/useImageShowCase'
import { useWatchAlongShorts } from '@/pages/Landing/hooks/useWatchAlongShorts'
import { HERO_CARD_COPY } from '@/pages/Landing/Constants/heroCards'
import Footer from '@/components/Footer/Footer'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { CountryBasicInfoResponse, SeasonalInformation, getCountryBasicInfo, getCitiesByCountry } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
// import { useAgentThreads } from '@/pages/Landing/hooks/useAgentThreads'
// import { useATAFeatures } from '@/pages/Landing/hooks/useATAFeatures'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { getPrioritizedCountries, LocationResponse } from '@/modules/Onboarding/api'

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

const MONTHS: { key: MonthKey; label: string; short: string }[] = [
    { key: 'january', label: 'January', short: 'Jan' },
    { key: 'february', label: 'February', short: 'Feb' },
    { key: 'march', label: 'March', short: 'Mar' },
    { key: 'april', label: 'April', short: 'Apr' },
    { key: 'may', label: 'May', short: 'May' },
    { key: 'june', label: 'June', short: 'Jun' },
    { key: 'july', label: 'July', short: 'Jul' },
    { key: 'august', label: 'August', short: 'Aug' },
    { key: 'september', label: 'September', short: 'Sep' },
    { key: 'october', label: 'October', short: 'Oct' },
    { key: 'november', label: 'November', short: 'Nov' },
    { key: 'december', label: 'December', short: 'Dec' }
]

const getInitialMonthKey = (): MonthKey => {
    const index = new Date().getMonth()
    return MONTHS[index]?.key ?? 'january'
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

    // Poor: Bad weather/conditions + negative indicators (more lenient criteria)
    // If explicitly marked as poor/avoid/worst, return poor
    if (hasNegativeIndicators && (description.includes('rain') || description.includes('extreme') || description.includes('unfavorable') || description.includes('harsh'))) {
        return 'poor'
    }
    
    // Poor: Very high cost + bad weather + peak crowd
    if ((isPeak || crowdLevel.includes('high') || crowdLevel.includes('peak')) && 
        hasNegativeIndicators && 
        (cost && cost.min_price > 1500) &&
        (description.includes('rain') || description.includes('extreme') || description.includes('unfavorable'))) {
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

type EnrichedMonth = {
    monthKey: MonthKey
    label: string
    short: string
    temp: number
    rating: 'best' | 'good' | 'mixed' | 'poor'
}

const buildSeasonMonths = (countryInfo?: CountryBasicInfoResponse): EnrichedMonth[] => {
    if (!countryInfo?.seasonal_information) {
        // fallback to WeatherChart default data
        return []
    }

    return MONTHS.map((m) => {
        const season = countryInfo.seasonal_information[m.key]
        if (!season) {
            return {
                monthKey: m.key,
                label: m.label,
                short: m.short,
                temp: 0,
                rating: 'mixed'
            }
        }

        const temp = (season.min_temp + season.max_temp) / 2
        const rating = getRatingFromSeason(season)

        return {
            monthKey: m.key,
            label: m.label,
            short: m.short,
            temp,
            rating
        }
    })
}

const getPrimaryCopyForMonth = (season: SeasonalInformation | undefined): string => {
    if (!season) return 'We are still learning about this month here. Try exploring neighbouring months for more colour.'

    if (season.description) return season.description
    if (season.crowd?.description) return season.crowd.description
    if (season.cost?.description) return season.cost.description

    return 'Great month to explore if the dates line up – use this as a starting point, not a rule.'
}

// Get temperature-based colors - subtle brand colors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTemperatureColors = (_avgTemp: number): { bg: string; border: string; fill: string; icon: string; text: string } => {
    return {
        bg: '#FFF8E7', // Light cream/yellow background
        border: '#E0E0E0', // Subtle grey border (matching brand)
        fill: '#E73434', // Red fill (matching brand secondary-red)
        icon: '#E73434', // Red icon
        text: '#E73434' // Red text
    }
}

// Get crowd-based colors - subtle brand colors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getCrowdColors = (_crowdLevel?: string): { bg: string; border: string; fill: string; icon: string; text: string } => {
    return {
        bg: '#F0F4FF', // Very light blue background
        border: '#E0E0E0', // Subtle grey border
        fill: '#1588CF', // Blue fill (matching brand secondary-blue)
        icon: '#1588CF', // Blue icon
        text: '#1588CF' // Blue text
    }
}

// Get cost-based colors - subtle brand colors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getCostColors = (_minPrice: number, _maxPrice: number): { bg: string; border: string; fill: string; icon: string; text: string } => {
    return {
        bg: '#F0F9F4', // Very light green background
        border: '#E0E0E0', // Subtle grey border
        fill: '#26BC6D', // Green fill (matching brand secondary-green)
        icon: '#26BC6D', // Green icon
        text: '#26BC6D' // Green text
    }
}

export const DestinationRecommenderPage: React.FC = () => {
    const { country: countrySlug } = useParams<{ country?: string }>()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()

    const [selectedCountryId, setSelectedCountryId] = useState<string | undefined>(undefined)
    const [activeMonthKey, setActiveMonthKey] = useState<MonthKey>(getInitialMonthKey)

    const { data: countries ,         
                isLoading: isCountriesLoading,
            } = useQuery<LocationResponse[]>({
            queryKey: ['prioritizedCountries'],
            queryFn: getPrioritizedCountries,
            staleTime: HOURS_24,
            gcTime: HOURS_24
        })       

    // Helper to convert country name to slug
    const countryNameToSlug = (name: string): string => {
        return name.toLowerCase().replace(/\s+/g, '-')
    }

    // Helper to find country by slug
    const findCountryBySlug = (slug: string | undefined): LocationResponse | undefined => {
        if (!slug || !countries) return undefined
        return countries.find(c => 
            countryNameToSlug(c.country_name) === slug.toLowerCase() ||
            c.country_name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
        )
    }

    const handleCountrySelect = (countryId: string, countryName: string) => {
        setSelectedCountryId(countryId)
        const slug = countryNameToSlug(countryName)
        navigate(`/when-to-travel/${slug}`, { replace: true })
    }

    // Find country from URL slug
    useEffect(() => {
        if (countrySlug && countries) {
            const country = findCountryBySlug(countrySlug)
            if (country && country.country_id !== selectedCountryId) {
                setSelectedCountryId(country.country_id)
            }
        }
    }, [countrySlug, countries, selectedCountryId])

    // Set default country on initial load if no country in URL
    useEffect(() => {
        if (!countrySlug && !selectedCountryId && countries && countries.length > 0) {
            const firstCountry = countries[0]
            const slug = countryNameToSlug(firstCountry.country_name)
            navigate(`/when-to-travel/${slug}`, { replace: true })
        }
    }, [countries, selectedCountryId, countrySlug, navigate])

    // Fetch images using same hooks as LandingPage
    const {
        images: showCaseImages
    } = useImageShowCase({
        countryId: selectedCountryId || null,
        enabled: !!selectedCountryId
    })

    const {
        shorts: watchAlongShorts,
        isLoading: isLoadingWatchAlong
    } = useWatchAlongShorts({
        countryId: selectedCountryId || null,
        limit: 12,
        enabled: !!selectedCountryId
    })

    const location = useLocation()
    const { trackButtonClickCustom } = usePostHog()

    // Fetch ATA features for HeroContentContainer
    // const { features, heroFeatures, isLoading: isLoadingFeatures } = useATAFeatures({ 
    //     countryId: selectedCountryId || undefined 
    // })

    // // Fetch agent threads
    // const { getThreadData } = useAgentThreads({
    //     features,
    //     enabled: isAuthenticated && !isLoadingFeatures && features.length > 0
    // })

    // Handle tile click - redirect to login if not authenticated
    const handleTileClick = async (route: string) => {
        if (!isAuthenticated) {
            const redirectUrl = `${location.pathname}${location.search}`
            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
            return
        }

        const params = new URLSearchParams()
        if (selectedCountryId) {
            params.set('country_id', selectedCountryId)
        }
        if (selectedCountry) {
            params.set('country_name', selectedCountry.country_name)
        }

        // For stays route, use city_id instead
        if (route === '/stays' && selectedCountryId) {
            try {
                const citiesResponse = await getCitiesByCountry(selectedCountryId)
                const cities = citiesResponse.results || []
                if (cities.length > 0) {
                    params.set('city_id', cities[0].city)
                    params.set('city', cities[0].city_name)
                }
            } catch {
                // Fallback to country
            }
        }

        const destinationRoute = params.toString() ? `${route}?${params.toString()}` : route

        trackButtonClickCustom({
            buttonPage: 'when_to_travel_page',
            buttonName: 'tile_clicked',
            buttonAction: 'tile_clicked',
            extra: { route: destinationRoute }
        })

        window.open(destinationRoute, '_blank')
    }

    const {
        data: countryInfo
    } = useQuery<CountryBasicInfoResponse>({
        queryKey: ['countryBasicInfo', selectedCountryId],
        queryFn: () => getCountryBasicInfo(selectedCountryId as string),
        enabled: !!selectedCountryId
    })

    const enrichedMonths = useMemo(() => buildSeasonMonths(countryInfo), [countryInfo])

    const selectedCountry = useMemo(
        () => countries?.find((c) => c.country_id === selectedCountryId),
        [countries, selectedCountryId]
    )



    // Use images from "Select activities worth your time" (experiences) section
    const heroImageUrls = useMemo(() => {
        // Use experiences images (landscape images from activities)
        const experiences = showCaseImages.experiences || []
        
        // Fallback to static hero images if no country-specific images available
        if (experiences.length === 0) {
            const fallbackExperiences = HERO_CARD_COPY.find((card) => card.key === 'experiences')?.images ?? []
            return fallbackExperiences.slice(0, 3)
        }
        
        return experiences.slice(0, 3)
    }, [showCaseImages])

    const activeSeason = useMemo(() => {
        if (!countryInfo?.seasonal_information) return undefined
        return countryInfo.seasonal_information[activeMonthKey]
    }, [countryInfo, activeMonthKey])


    return (
        <>
            <ReactHelmet title="Rimigo | When to travel" />
            <Navbar />
            <div className="min-h-screen bg-natural-white">
                {/* Country Selector - Below Navbar */}
                {countries && countries.length > 0 && (
                    <div className="bg-white border-b border-grey-4 w-full pt-24 md:pt-28 lg:pt-32">
                        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
                            <div className="flex items-center justify-center">
                                <CountrySwitcher
                                    countries={countries || []}
                                    selectedCountryId={selectedCountryId || null}
                                    onCountrySelect={handleCountrySelect}
                                    isLoading={isCountriesLoading}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="relative z-10 pt-6 md:pt-8 lg:pt-12 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Page Title */}
                        <div className="text-center mb-6 md:mb-8 lg:mb-10">
                            <h1 className="text-4xl md:text-6xl font-semibold leading-tight md:leading-tight text-careers-dark mb-6 font-red-hat-display">
                                When to travel
                            </h1>
                            {!selectedCountryId && (
                                <p className="text-lg md:text-xl text-grey-2 font-manrope max-w-2xl mx-auto">
                                    Select a country to see the best months to visit
                                </p>
                            )}
                        </div>

                        {/* Graph and Info Section - Side by side on desktop */}
                        {selectedCountryId ? (
                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-6 md:gap-8 items-start">
                                <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-4 sm:p-5 md:p-6 shadow-[0px_18px_60px_rgba(112,17,246,0.08)] border border-grey-4 relative" style={{ overflow: 'visible' }}>
                                    {/* Subtle background elements */}
                                    {heroImageUrls.length > 0 && (
                                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                                            <div className="absolute inset-0" style={{
                                                backgroundImage: `url(${heroImageUrls[0]})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat',
                                                filter: 'blur(20px)'
                                            }} />
                                        </div>
                                    )}
                                    <div className="relative z-10">
                                {countryInfo && enrichedMonths.length > 0 ? (
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                            <div className="flex flex-col gap-1">
                                                <Typography
                                                    size="16"
                                                    weight="bold"
                                                    color="grey-0"
                                                    family="redhat">
                                                    Weather & seasonality
                                                </Typography>
                                                {selectedCountry && (
                                                    <Typography
                                                        size="12"
                                                        weight="medium"
                                                        color="grey-2"
                                                        family="manrope">
                                                        {selectedCountry.country_name}
                                                    </Typography>
                                                )}
                                            </div>
                                        </div>

                                        {/* Aesthetic chart with narrower bars - matching brand design */}
                                        <div className="relative rounded-xl bg-white border border-grey-4 p-3 sm:p-5 md:p-6">
                                            <div className="relative flex items-end justify-between gap-0.5 sm:gap-1.5 md:gap-2 h-52 sm:h-60 md:h-64 overflow-x-auto scrollbar-hide -mx-2 px-2" style={{ overflowY: 'visible', position: 'relative' }}>
                                                {enrichedMonths.map((m) => {
                                                    const minTemp = Math.min(...enrichedMonths.map((mm) => mm.temp))
                                                    const maxTemp = Math.max(...enrichedMonths.map((mm) => mm.temp))
                                                    const tempRange = maxTemp - minTemp || 1
                                                    const normalizedHeight = ((m.temp - minTemp) / tempRange) * 100
                                                    // Tall bars: min 75%, max 95% of container height
                                                    const barHeight = Math.max(75, 75 + normalizedHeight * 0.2)
                                                    const isActive = m.monthKey === activeMonthKey

                                                    const ratingColors = {
                                                        best: '#2d5f3f',
                                                        good: '#6ba368',
                                                        mixed: '#e8a95d',
                                                        poor: '#d47272'
                                                    }

                                                    return (
                                                        <div key={m.monthKey} className="relative flex flex-col items-center shrink-0" style={{ width: 'calc((100% - 11 * 0.125rem) / 12)', minWidth: '20px' }}>
                                                            {/* Active indicator - pulsing dot above selected bar */}
                                                            {isActive && (
                                                                <div 
                                                                    className="absolute pointer-events-none -top-6 left-1/2 -translate-x-1/2 z-[1000]"
                                                                    style={{ width: 'max-content' }}>
                                                                    <div 
                                                                        className="rounded-full bg-primary-default animate-pulse"
                                                                        style={{
                                                                            width: '12px',
                                                                            height: '12px',
                                                                            boxShadow: '0 0 0 4px rgba(112, 17, 246, 0.2), 0 0 0 8px rgba(112, 17, 246, 0.1)'
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            <button
                                                                type="button"
                                                                className={`flex flex-col items-center justify-end h-full group transition-all relative cursor-pointer w-full ${
                                                                    isActive ? 'z-10' : ''
                                                                }`}
                                                                onClick={() => setActiveMonthKey(m.monthKey)}
                                                                style={{
                                                                    position: 'relative'
                                                                }}>

                                                            {/* Labels above bar - always visible but subtle */}
                                                            <div className="flex flex-col items-center mb-1.5 sm:mb-2 w-full">
                                                                <span 
                                                                    className={`text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide mb-0.5 transition-opacity ${
                                                                        isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                                                                    }`}
                                                                    style={{ 
                                                                        color: ratingColors[m.rating],
                                                                        fontFamily: 'Manrope'
                                                                    }}>
                                                                    {m.rating === 'best' ? 'Best' :
                                                                     m.rating === 'good' ? 'Good' :
                                                                     m.rating === 'mixed' ? 'Mixed' : 'Avoid'}
                                                                </span>
                                                                <span 
                                                                    className={`text-[10px] sm:text-[11px] font-bold transition-opacity ${
                                                                        isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                                                                    }`}
                                                                    style={{ 
                                                                        color: '#101010',
                                                                        fontFamily: 'Red Hat Display'
                                                                    }}>
                                                                    {Math.round(m.temp)}°C
                                                                </span>
                                                            </div>

                                                            {/* Bar - much taller with enhanced active state */}
                                                            <div 
                                                                className="rounded-t transition-all duration-300 relative"
                                                                style={{ 
                                                                    height: `${barHeight}%`,
                                                                    backgroundColor: ratingColors[m.rating],
                                                                    borderTop: isActive ? '4px solid #7011F6' : 'none',
                                                                    borderLeft: isActive ? '3px solid #7011F6' : 'none',
                                                                    borderRight: isActive ? '3px solid #7011F6' : 'none',
                                                                    minHeight: '80px',
                                                                    width: isActive ? '100%' : 'calc(100% - 2px)',
                                                                    maxWidth: '32px',
                                                                    boxShadow: isActive ? '0 6px 20px rgba(112, 17, 246, 0.4), 0 0 0 2px rgba(112, 17, 246, 0.1)' : 'none',
                                                                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                                                    zIndex: isActive ? 10 : 1
                                                                }}
                                                            />

                                                            {/* Month label */}
                                                            <div 
                                                                className={`text-[9px] sm:text-[10px] font-semibold mt-1.5 sm:mt-2 transition-colors ${
                                                                    isActive ? 'text-primary-default font-bold scale-110' : 'text-grey-2'
                                                                }`}
                                                                style={{ fontFamily: 'Red Hat Display' }}>
                                                                {m.short}
                                                            </div>
                                                        </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#2d5f3f]" />
                                                <span className="text-grey-2">Best</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#6ba368]" />
                                                <span className="text-grey-2">Good</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#e8a95d]" />
                                                <span className="text-grey-2">Mixed</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#d47272]" />
                                                <span className="text-grey-2">Poor / avoid</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                                        <Typography
                                            size="14"
                                            weight="medium"
                                            color="grey-1"
                                            family="manrope">
                                            Pick a destination above to see how the year looks there.
                                        </Typography>
                                        <WeatherChart />
                                    </div>
                                )}
                                    </div>
                                </div>

                                {/* Month detail + info graphics - Right column on desktop */}
                                <div className="space-y-4">
                                <div className="rounded-2xl bg-white p-5 sm:p-6 md:p-7 border border-grey-4 relative overflow-hidden">
                                    {/* Subtle background elements */}
                                    {heroImageUrls.length > 1 && (
                                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                                            <div className="absolute inset-0" style={{
                                                backgroundImage: `url(${heroImageUrls[1]})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat',
                                                filter: 'blur(20px)'
                                            }} />
                                        </div>
                                    )}
                                    <div className="relative z-10">
                                    {/* Header with icon */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div 
                                            className="inline-flex items-center justify-center rounded-xl w-10 h-10 shadow-sm"
                                            style={{
                                                background: 'linear-gradient(135deg, #7011F6 0%, #4D1D91 100%)'
                                            }}>
                                            <Calendar className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <Typography
                                                size="16"
                                                weight="bold"
                                                color="grey-0"
                                                family="redhat"
                                                className="block">
                                                {selectedCountry ? selectedCountry.country_name : 'Choose a country'}
                                            </Typography>
                                            <Typography
                                                size="12"
                                                weight="medium"
                                                color="grey-2"
                                                family="manrope"
                                                className="block">
                                                {MONTHS.find((m) => m.key === activeMonthKey)?.label || 'Month view'}
                                            </Typography>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {activeSeason && (
                                        <div 
                                            className="rounded-xl p-4 mb-5 border shadow-sm"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(112, 17, 246, 0.08) 0%, rgba(77, 29, 145, 0.05) 100%)',
                                                borderColor: 'rgba(112, 17, 246, 0.2)'
                                            }}>
                                            <Typography
                                                size="sm"
                                                weight="medium"
                                                color="grey-0"
                                                family="manrope"
                                                className="block leading-relaxed"
                                                style={{ fontSize: '13px' }}>
                                                {getPrimaryCopyForMonth(activeSeason)}
                                            </Typography>
                                        </div>
                                    )}

                                    {activeSeason ? (
                                        <div className="space-y-4">
                                            {/* Temperature Visualization */}
                                            {(() => {
                                                const avgTemp = (activeSeason.min_temp + activeSeason.max_temp) / 2
                                                const tempColors = getTemperatureColors(avgTemp)
                                                const tempRange = 50 // Assume 0-50°C range for visualization
                                                const tempPercentage = Math.min(Math.max((avgTemp / tempRange) * 100, 0), 100)
                                                
                                                return (
                                                    <div 
                                                        className="rounded-xl p-4 border bg-white"
                                                        style={{
                                                            borderColor: tempColors.border
                                                        }}>
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                                                <Thermometer className="w-5 h-5" style={{ color: tempColors.icon }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <Typography
                                                                    size="11"
                                                                    weight="semibold"
                                                                    color="grey-2"
                                                                    family="manrope"
                                                                    className="block uppercase tracking-wide mb-1">
                                                                    Typical Temperature
                                                                </Typography>
                                                                <Typography
                                                                    size="18"
                                                                    weight="bold"
                                                                    family="redhat"
                                                                    className="block"
                                                                    style={{ color: tempColors.text }}>
                                                                    {activeSeason.min_temp}–{activeSeason.max_temp}°
                                                                    {activeSeason.temp_unit}
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Temperature progress bar - subtle design */}
                                                        <div className="mt-4">
                                                            <div className="h-[6px] w-full rounded-full bg-grey-4">
                                                                <div
                                                                    className="h-[6px] rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${tempPercentage}%`,
                                                                        background: tempColors.fill
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* Temperature scale labels */}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Moderate</span>
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Hot</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}

                                            {/* Crowd & Vibe Visualization */}
                                            {(() => {
                                                const crowdColors = getCrowdColors(activeSeason.crowd?.level)
                                                const crowdLevel = activeSeason.crowd?.level?.toLowerCase() || 'medium'
                                                const crowdPercentage = 
                                                    crowdLevel.includes('low') ? 33 :
                                                    crowdLevel.includes('medium') ? 66 : 100
                                                
                                                return (
                                                    <div 
                                                        className="rounded-xl p-4 border bg-white"
                                                        style={{
                                                            borderColor: crowdColors.border
                                                        }}>
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                                                <Users className="w-5 h-5" style={{ color: crowdColors.icon }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <Typography
                                                                    size="11"
                                                                    weight="semibold"
                                                                    color="grey-2"
                                                                    family="manrope"
                                                                    className="block uppercase tracking-wide mb-1">
                                                                    Crowd & Vibe
                                                                </Typography>
                                                                <Typography
                                                                    size="16"
                                                                    weight="bold"
                                                                    family="redhat"
                                                                    className="block capitalize"
                                                                    style={{ color: crowdColors.text }}>
                                                                    {activeSeason.crowd?.level || 'Balanced'}
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Crowd level progress bar - subtle design */}
                                                        <div className="mt-4">
                                                            <div className="h-[6px] w-full rounded-full bg-grey-4">
                                                                <div
                                                                    className="h-[6px] rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${crowdPercentage}%`,
                                                                        background: crowdColors.fill
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* Crowd level labels */}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Low</span>
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Medium</span>
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">High</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {activeSeason.crowd?.description && (
                                                            <Typography
                                                                size="11"
                                                                weight="medium"
                                                                color="grey-1"
                                                                family="manrope"
                                                                className="block mt-3">
                                                                {activeSeason.crowd.description}
                                                            </Typography>
                                                        )}
                                                    </div>
                                                )
                                            })()}

                                            {/* Cost Visualization */}
                                            {activeSeason.cost?.min_price && activeSeason.cost?.max_price && (() => {
                                                const costColors = getCostColors(activeSeason.cost.min_price, activeSeason.cost.max_price)
                                                const maxCostRange = 30000 // Assume max range for visualization
                                                const costPercentage = Math.min((activeSeason.cost.max_price / maxCostRange) * 100, 100)
                                                
                                                return (
                                                    <div 
                                                        className="rounded-xl p-4 border bg-white"
                                                        style={{
                                                            borderColor: costColors.border
                                                        }}>
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                                                <DollarSign className="w-5 h-5" style={{ color: costColors.icon }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <Typography
                                                                    size="11"
                                                                    weight="semibold"
                                                                    color="grey-2"
                                                                    family="manrope"
                                                                    className="block uppercase tracking-wide mb-1">
                                                                    Typical Trip Cost
                                                                </Typography>
                                                                <Typography
                                                                    size="16"
                                                                    weight="bold"
                                                                    family="redhat"
                                                                    className="block"
                                                                    style={{ color: costColors.text }}>
                                                                    {activeSeason.cost?.currency || '$'}
                                                                    {activeSeason.cost?.min_price?.toLocaleString() || '—'} –{' '}
                                                                    {activeSeason.cost?.currency || '$'}
                                                                    {activeSeason.cost?.max_price?.toLocaleString() || '—'}
                                                                    <span className="text-xs font-normal text-grey-2 ml-1">per day</span>
                                                                </Typography>
                                                                {activeSeason.cost?.description && (
                                                                    <Typography
                                                                        size="11"
                                                                        weight="medium"
                                                                        color="grey-1"
                                                                        family="manrope"
                                                                        className="block mt-1">
                                                                        {activeSeason.cost.description}
                                                                    </Typography>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Cost progress bar - subtle design */}
                                                        <div className="mt-4">
                                                            <div className="h-[6px] w-full rounded-full bg-grey-4">
                                                                <div
                                                                    className="h-[6px] rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${costPercentage}%`,
                                                                        background: costColors.fill
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* Cost scale labels */}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Budget-friendly</span>
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Moderate</span>
                                                                <span className="text-[10px] font-medium text-grey-2 font-manrope">Premium</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Season indicators */}
                                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-grey-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-3 h-3 rounded-full" style={{ background: '#26BC6D' }} />
                                                                <Typography
                                                                    size="10"
                                                                    weight="medium"
                                                                    color="grey-2"
                                                                    family="manrope">
                                                                    Value window
                                                                </Typography>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-3 h-3 rounded-full" style={{ background: '#CDAE00' }} />
                                                                <Typography
                                                                    size="10"
                                                                    weight="medium"
                                                                    color="grey-2"
                                                                    family="manrope">
                                                                    Shoulder season
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-grey-5/70 p-6 text-center">
                                            <Typography
                                                size="14"
                                                weight="medium"
                                                color="grey-2"
                                                family="manrope">
                                                Select a destination above to see detailed monthly insights
                                            </Typography>
                                        </div>
                                    )}
                                    </div>
                                </div>
                                </div>
                            </div>
                        ) : (
                            <div className="col-span-1 lg:col-span-2">
                                <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-8 md:p-12 text-center border border-grey-4 shadow-sm">
                                    <Typography
                                        size="18"
                                        weight="semibold"
                                        color="grey-0"
                                        family="redhat"
                                        className="mb-2">
                                        Select a country to explore
                                    </Typography>
                                    <Typography
                                        size="14"
                                        weight="medium"
                                        color="grey-2"
                                        family="manrope">
                                        Choose a destination from the header to see detailed monthly insights
                                    </Typography>
                                </div>
                            </div>
                        )}

                        {/* HeroContentContainer for user capture - shown when country is selected, below graph and data */}
                        {selectedCountryId && (
                            <div className="mt-12 md:mt-16 flex justify-center">
                                <HeroContentContainer
                                    onTileClick={handleTileClick}
                                    // getThreadData={getThreadData}
                                    // heroFeatures={heroFeatures}
                                    // isLoading={isLoadingFeatures}
                                    countryId={selectedCountryId}
                                    watchAlongShorts={watchAlongShorts}
                                    isLoadingWatchAlong={isLoadingWatchAlong}
                                />
                            </div>
                        )}

                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <Footer />
        </>
    )
}

export default DestinationRecommenderPage

