import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plane, Sparkles, IndianRupee, Clock3, Route, SlidersHorizontal, ArrowUpRight, Loader } from 'lucide-react'
import { toast } from 'sonner'
import SearchHeader from '@/components/common/SearchHeader'
import type { CountryListItem } from '@/components/common/SearchHeader'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { searchFlights, type FlightSearchResponse } from '@/api/flights/flightSearchAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import FlightSearchBar from './components/FlightSearchBar'
import FlightDenseRow from './components/FlightDenseRow'
import FlightSearchAccordion from './components/FlightSearchAccordion'
import { getAirlineLogo } from './utils/airlineLogoUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import FlightFiltersRail, {
    EMPTY_FILTERS,
    MobileFiltersSheet,
    applyFilters,
    computeFacets,
    countActiveFilters,
    isFiltersEmpty,
    type FlightFilterState
} from '@/modules/ContentCollection/components/flights/FlightFiltersRail'
import type { ExploreFlight } from '@/modules/ContentCollection/components/flights/FlightExploreView'

const RIMIGO_LOGO_URL = '/icons/logo-transparent-indigo.png'
const FLIGHT_THEME_VARS: React.CSSProperties & Record<string, string> = {
    '--flight-bg-page': '#F5F4F7',
    '--flight-bg-card': '#FFFFFF',
    '--flight-bg-indigo-soft': '#7011F614',
    '--flight-indigo-strong': '#7011F6',
    '--flight-indigo-deep': '#4D1D91',
    '--flight-indigo-press': '#5B0FC7',
    '--flight-indigo-border': '#7011F633',
    '--flight-indigo-50': '#F5F0FE',
    '--flight-indigo-100': '#E2CFFD',
    '--flight-fg': '#101010',
    '--flight-fg-1': '#363636',
    '--flight-fg-2': '#747474',
    '--flight-fg-3': '#AEAEAE',
    '--flight-border': '#E0E0E0',
    '--flight-grey-5': '#F8F8F8',
    '--flight-shadow-soft': '0 8px 24px rgba(17,24,39,0.06)'
}

interface FlightResult {
    index: number
    reference_id: string
    result_index: string
    trace_id: string
    total_price: string
    base_fare: string
    service_fee: string
    stop_count: number
    total_layovers: number
    is_refundable: boolean
    is_live: boolean
    journey_type: number
    scores: {
        price_score: number
        duration_score: number
        final_score: number
    }
    total_duration: number
    formatted_duration: string
    segments: Array<{
        airline: {
            code: string
            name: string
            flight_number: string
        }
        origin: {
            airport_code: string
            airport_name: string
            city_code: string
            city_name: string
            departure_time: string
        }
        destination: {
            airport_code: string
            airport_name: string
            city_code: string
            city_name: string
            arrival_time: string
        }
        duration: {
            minutes: number
            formatted: string
        }
    }>
    is_multi_pnr: boolean
    recommendation_reasons: string[]
    departure_date: string
    return_date: string | null
    rimigo_price?: string
    best_offer?: {
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
        is_rimigo?: boolean
    }
    price_comparison?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
        is_rimigo?: boolean
        badges?: string[]
        is_self_transfer?: boolean
        cabin?: string
    }>
}

interface FlightOutputData {
    total_flights: number
    top_flights: FlightResult[]
    platform_prices?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
        source?: string
    }>
    source?: string
    comparison_source?: string
    extracted_params: {
        origin: string[]
        destination: string[]
        departure_date: string[]
        return_date: string[] | null
        journey_type: number
        adult_count: number
        child_count: number
        infant_count: number
        cabin_class: number
    }
    search_dates: string[]
    output_type: string
}

type RankingMode = 'best' | 'cheapest' | 'fastest' | 'fewest_stops'

interface LocalInteraction {
    id: string
    created_at: string
    output_status: 'queued' | 'in_progress' | 'completed' | 'failed'
    input_data: FlightInputData
    output_data?: FlightOutputData
}

interface FlightInputData {
    user_text_input?: string
    origin?: string[]
    destination?: string[]
    preferredDepartureTime?: string[]
    preferredReturnDepartureTime?: string[]
    adultCount?: string | number
    childCount?: string | number
    infantCount?: string | number
    journeyType?: number
    flightCabinClass?: number
    directFlight?: boolean
    preferred_airlines?: string[]
    group_type?: string
    purpose_type?: string
    budget_max?: number
    max_layovers?: number
}

const FlightsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const countryId = searchParams.get('country_id') || ''
    const countryName = searchParams.get('country_name') || ''

    const [interactions, setInteractions] = useState<LocalInteraction[]>([])
    const [isSending, setIsSending] = useState(false)
    const [rankingModes, setRankingModes] = useState<Record<string, RankingMode>>({})
    const [filterStates, setFilterStates] = useState<Record<string, FlightFilterState>>({})
    const [mobileFiltersOpenId, setMobileFiltersOpenId] = useState<string | null>(null)
    const [openSearchIds, setOpenSearchIds] = useState<string[]>([])
    const [expandedFlightIds, setExpandedFlightIds] = useState<string[]>([])
    const [selectedFlight, setSelectedFlight] = useState<{ flight: FlightResult; rankMode: RankingMode } | null>(null)
    const { trackButtonClickCustom } = usePostHog()
    const [addToCollectionFlight, setAddToCollectionFlight] = useState<{
        flight: FlightResult
        extractedParams: FlightOutputData['extracted_params']
    } | null>(null)

    // Get active trip from context
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const tripCountries = activeTrip?.tripProfile?.final_destination_countries || [] // Can be string[] or Array<{id: string, name: string}>

    // Fetch countries data
    const { data: locationPersonalizationData } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['locationPersonalization'],
        queryFn: () => getLiveCountries(),
        enabled: true,
        staleTime: HOURS_24
    })

    // Convert countries to CountryListItem format
    const metadataCountries: CountryListItem[] = useMemo(() => {
        if (locationPersonalizationData) {
            return locationPersonalizationData.map((c) => ({
                id: c.country_id,
                name: c.country_name,
                icon_url: c.icon_url
            }))
        }
        return []
    }, [locationPersonalizationData])

    // Get initial country data for SearchHeader
    const initialCountryData = useMemo(() => {
        if (!countryId) return undefined

        if (!locationPersonalizationData && metadataCountries.length === 0) {
            return undefined
        }

        const countryFromAPI = locationPersonalizationData?.find((c) => c.country_id === countryId)

        if (!countryFromAPI) {
            const readableCountryName = countryName ? countryName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : countryId
            return [
                {
                    id: countryId,
                    name: readableCountryName,
                    icon_url: undefined
                }
            ]
        }

        const resolvedCountryName = countryFromAPI?.country_name || countryName || ''
        const iconUrl = countryFromAPI?.icon_url

        return [
            {
                id: countryId,
                name: resolvedCountryName,
                icon_url: iconUrl
            }
        ]
    }, [countryId, metadataCountries, locationPersonalizationData, countryName])

    // Helper function to modify country name for URL
    const modifyCountryName = useCallback((countryName: string) => {
        return countryName.replace(/ /g, '-').toLowerCase()
    }, [])

    // Prefill country from trip's first final destination country if missing
    useEffect(() => {
        if (!activeTrip) return
        if (!tripCountries || tripCountries.length === 0) return
        // Only prefill if country_id missing
        if (countryId) return

        // Get first country - handle both string[] and Array<{id, name}>
        const firstCountry = tripCountries[0]
        const firstCountryId = typeof firstCountry === 'string' ? firstCountry : (firstCountry as any)?.id
        if (!firstCountryId) return

        const next = new URLSearchParams(searchParams)
        // Always set id
        next.set('country_id', firstCountryId)
        // Set name if we can resolve it
        // Try from locationPersonalizationData first, then from tripCountries if it's an object
        const fromAll = locationPersonalizationData?.find((c) => c.country_id === firstCountryId)
        const countryNameFromTrip = typeof firstCountry === 'object' && firstCountry !== null ? (firstCountry as any)?.name : undefined
        const countryName = fromAll?.country_name || countryNameFromTrip
        if (countryName) {
            next.set('country_name', modifyCountryName(countryName))
        }
        // Preserve existing params
        setSearchParams(next, { replace: true })
    }, [activeTrip, tripCountries, countryId, locationPersonalizationData, searchParams, setSearchParams, modifyCountryName])

    // Handle country selection changes
    const handleCountryChange = useCallback(
        (countries: CountryListItem[]) => {
            const selectedCountry = countries[0]
            if (selectedCountry) {
                const next = new URLSearchParams(searchParams)
                next.set('country_id', selectedCountry.id)

                const countryNameFromAPI =
                    locationPersonalizationData?.find((c) => c.country_id === selectedCountry.id)?.country_name || selectedCountry.name
                next.set('country_name', modifyCountryName(countryNameFromAPI))

                setSearchParams(next, { replace: true })
            } else {
                if (countryId && locationPersonalizationData) {
                    const next = new URLSearchParams(searchParams)
                    next.delete('country_id')
                    next.delete('country_name')
                    setSearchParams(next, { replace: true })
                }
            }
        },
        [searchParams, setSearchParams, locationPersonalizationData, countryId, modifyCountryName]
    )

    const sortFlightsForMode = useCallback((flights: FlightResult[], mode: RankingMode): FlightResult[] => {
        const next = [...flights]
        if (mode === 'cheapest') {
            return next.sort((a, b) => Number(a.total_price) - Number(b.total_price))
        }
        if (mode === 'fastest') {
            return next.sort((a, b) => a.total_duration - b.total_duration)
        }
        if (mode === 'fewest_stops') {
            return next.sort((a, b) => a.total_layovers - b.total_layovers || Number(a.total_price) - Number(b.total_price))
        }
        return next.sort((a, b) => (b.scores?.final_score || 0) - (a.scores?.final_score || 0))
    }, [])

    function toIsoDay(value?: string) {
        if (!value) return null
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return null
        return d.toISOString().split('T')[0]
    }

    // Reset results when country changes
    useEffect(() => {
        setInteractions([])
        setFilterStates({})
        setMobileFiltersOpenId(null)
    }, [countryId])

    const buildExtractedParams = useCallback((searchData: FlightInputData): FlightOutputData['extracted_params'] => {
        const toNum = (v: unknown) => {
            const n = Number(v)
            return Number.isFinite(n) ? n : 0
        }
        return {
            origin: searchData.origin ?? [],
            destination: searchData.destination ?? [],
            departure_date: searchData.preferredDepartureTime ?? [],
            return_date: searchData.preferredReturnDepartureTime ?? null,
            journey_type: searchData.journeyType ?? 1,
            adult_count: toNum(searchData.adultCount),
            child_count: toNum(searchData.childCount),
            infant_count: toNum(searchData.infantCount),
            cabin_class: searchData.flightCabinClass ?? 1
        }
    }, [])

    const submitSearch = useCallback(async (searchData: FlightInputData) => {
        if (!countryId) {
            toast.error('Please select a country first')
            return
        }

        setIsSending(true)

        const interactionId = `local-${Date.now()}`
        const createdAt = new Date().toISOString()
        const pendingInteraction: LocalInteraction = {
            id: interactionId,
            created_at: createdAt,
            output_status: 'in_progress',
            input_data: searchData
        }
        setInteractions([pendingInteraction])

        try {
            const response: FlightSearchResponse = await searchFlights(searchData)
            const completedInteraction: LocalInteraction = {
                id: interactionId,
                created_at: createdAt,
                output_status: 'completed',
                input_data: searchData,
                output_data: {
                    total_flights: response.total_flights,
                    top_flights: (response.top_flights as FlightOutputData['top_flights']) ?? [],
                    platform_prices: response.platform_prices,
                    source: response.source,
                    comparison_source: response.comparison_source,
                    extracted_params: buildExtractedParams(searchData),
                    search_dates: response.search_dates ?? [],
                    output_type: 'flight_recommendations'
                }
            }
            setInteractions([completedInteraction])
        } catch (error) {
            const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string }
            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Failed to search flights. Please try again.'
            toast.error(message)
            setInteractions([])
        } finally {
            setIsSending(false)
        }
    }, [countryId, buildExtractedParams])

    // Handle flight search submission
    const handleSearchSubmit = async (searchData: FlightInputData) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: POSTHOG_EVENTS.FLIGHT_SEARCH_SUBMIT,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { origin: searchData.origin, destination: searchData.destination, journeyType: searchData.journeyType }
        })
        await submitSearch(searchData)
    }

    // Get last 2 completed interactions with flight results
    const displayInteractions = useMemo(() => {
        return interactions
            .filter((i) => i.output_status === 'completed' && i.output_data?.output_type === 'flight_recommendations')
            .slice(0, 2)
    }, [interactions])

    // Auto-open the latest search whenever the displayed set changes.
    // Older searches stay collapsed by default; users can toggle individually.
    useEffect(() => {
        if (displayInteractions.length === 0) return
        const latestId = displayInteractions[0].id
        setOpenSearchIds((prev) => (prev.includes(latestId) ? prev : [...prev, latestId]))
    }, [displayInteractions])

    const toggleSearchOpen = useCallback((id: string) => {
        setOpenSearchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }, [])

    // Get in-progress interactions for display
    const inProgressInteractions = useMemo(() => {
        return interactions.filter((i) => i.output_status === 'queued' || i.output_status === 'in_progress')
    }, [interactions])

    // Build flight data for AddToCollectionModal
    const buildFlightDataForModal = useCallback((flight: FlightResult, extractedParams: FlightOutputData['extracted_params']) => {
        const firstSeg = flight.segments[0]
        const lastSeg = flight.segments[flight.segments.length - 1]
        const title = `${firstSeg?.origin?.airport_code || ''} → ${lastSeg?.destination?.airport_code || ''} | ${flight.departure_date || ''}`

        return {
            reference_id: flight.reference_id,
            title,
            metadata: {
                reference_id: flight.reference_id,
                segments: flight.segments,
                total_price: flight.total_price,
                stop_count: flight.stop_count,
                total_duration: flight.total_duration,
                formatted_duration: flight.formatted_duration,
                departure_date: flight.departure_date,
                return_date: flight.return_date,
                is_refundable: flight.is_refundable,
                journey_type: flight.journey_type,
                best_offer: flight.best_offer,
                search_params: {
                    origin: extractedParams.origin,
                    destination: extractedParams.destination,
                    departure_date: extractedParams.departure_date,
                    return_date: extractedParams.return_date,
                    adult_count: extractedParams.adult_count,
                    child_count: extractedParams.child_count,
                    infant_count: extractedParams.infant_count,
                    cabin_class: extractedParams.cabin_class,
                    journey_type: extractedParams.journey_type
                }
            }
        }
    }, [])

    // Determine if we should show landing state
    const showLandingState = !countryId
    const formatAmount = (value?: string | number) => {
        const n = typeof value === 'string' ? Number(value) : (value ?? 0)
        if (!Number.isFinite(n)) return '₹0'
        return `₹${Math.round(n).toLocaleString('en-IN')}`
    }
    const formatTime = (value?: string) => {
        if (!value) return '--:--'
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return '--:--'
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    }
    const formatDate = (value?: string) => {
        if (!value) return ''
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return ''
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
    const formatDurationMinutes = (minutes?: number) => {
        const value = Number(minutes || 0)
        if (!Number.isFinite(value) || value <= 0) return '--'
        const hrs = Math.floor(value / 60)
        const mins = value % 60
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
    }
    const formatRelativeTime = (isoDate: string) => {
        const created = new Date(isoDate).getTime()
        if (!Number.isFinite(created)) return ''
        const diffSec = Math.max(0, Math.floor((Date.now() - created) / 1000))
        if (diffSec < 60) return 'just now'
        const diffMin = Math.floor(diffSec / 60)
        if (diffMin < 60) return `${diffMin}m ago`
        const diffHr = Math.floor(diffMin / 60)
        if (diffHr < 24) return `${diffHr}h ago`
        const diffDay = Math.floor(diffHr / 24)
        if (diffDay < 7) return `${diffDay}d ago`
        return new Date(created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
    const getJourneyLegs = (flight: FlightResult) => {
        const segments = flight.segments || []
        const first = segments[0]
        const last = segments[segments.length - 1]
        const startsAndEndsSameAirport =
            !!first?.origin?.airport_code &&
            !!last?.destination?.airport_code &&
            first.origin.airport_code === last.destination.airport_code
        const depDay = toIsoDay(first?.origin?.departure_time)
        const arrDay = toIsoDay(last?.destination?.arrival_time)
        const spansMultipleDays = !!depDay && !!arrDay && depDay !== arrDay

        const likelyRoundTrip =
            Number(flight.journey_type) === 2 ||
            !!flight.return_date ||
            (segments.length > 1 && startsAndEndsSameAirport && spansMultipleDays)

        if (!likelyRoundTrip || segments.length <= 1) {
            return { outbound: segments, inbound: [] as typeof segments, isRoundTrip: false }
        }

        const returnIso = toIsoDay(flight.return_date || undefined)
        if (returnIso) {
            const outboundByReturnDate = segments.filter((segment) => {
                const depDay = toIsoDay(segment.origin?.departure_time)
                return !!depDay && depDay < returnIso
            })
            const inboundByReturnDate = segments.filter((segment) => {
                const depDay = toIsoDay(segment.origin?.departure_time)
                return !!depDay && depDay >= returnIso
            })
            if (outboundByReturnDate.length > 0 && inboundByReturnDate.length > 0) {
                return { outbound: outboundByReturnDate, inbound: inboundByReturnDate, isRoundTrip: true }
            }
        }

        let splitIndex = -1
        let maxGapMinutes = -1
        for (let i = 0; i < segments.length - 1; i += 1) {
            const currentArrival = new Date(segments[i]?.destination?.arrival_time || '')
            const nextDeparture = new Date(segments[i + 1]?.origin?.departure_time || '')
            if (Number.isNaN(currentArrival.getTime()) || Number.isNaN(nextDeparture.getTime())) continue
            const gapMinutes = (nextDeparture.getTime() - currentArrival.getTime()) / (1000 * 60)
            if (gapMinutes > maxGapMinutes) {
                maxGapMinutes = gapMinutes
                splitIndex = i
            }
        }
        if (splitIndex >= 0 && splitIndex < segments.length - 1 && maxGapMinutes >= 180) {
            return {
                outbound: segments.slice(0, splitIndex + 1),
                inbound: segments.slice(splitIndex + 1),
                isRoundTrip: true
            }
        }

        return { outbound: segments, inbound: [] as typeof segments, isRoundTrip: false }
    }
    const getLegSummary = (segments: FlightResult['segments']) => {
        if (!segments || segments.length === 0) {
            return {
                first: undefined,
                last: undefined,
                durationMinutes: 0,
                durationLabel: '--',
                stops: 0,
                stopsLabel: 'Direct'
            }
        }
        const first = segments[0]
        const last = segments[segments.length - 1]
        const durationMinutes = segments.reduce((sum, segment) => sum + Number(segment.duration?.minutes || 0), 0)
        const stops = Math.max(0, segments.length - 1)
        return {
            first,
            last,
            durationMinutes,
            durationLabel: formatDurationMinutes(durationMinutes),
            stops,
            stopsLabel: stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`
        }
    }
    const getConnectionMinutes = (currentArrival?: string, nextDeparture?: string) => {
        if (!currentArrival || !nextDeparture) return 0
        const a = new Date(currentArrival)
        const b = new Date(nextDeparture)
        if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
        return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60)))
    }
    const renderDetailedLeg = (title: string, segments: FlightResult['segments']) => {
        if (!segments || segments.length === 0) return null
        return (
            <div className="rounded-xl border border-feature-card-border bg-white">
                <div className="px-3 py-2 border-b border-feature-card-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-grey-grey_2 font-red-hat-display">{title}</p>
                </div>
                <div className="p-3 space-y-2">
                    {segments.map((segment, idx) => {
                        const next = segments[idx + 1]
                        const connectionMinutes = getConnectionMinutes(segment.destination?.arrival_time, next?.origin?.departure_time)
                        return (
                            <div key={`${title}-${idx}`} className="rounded-lg border border-feature-card-border bg-grey_6 px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <img
                                        src={getAirlineLogo(segment.airline?.code || '')}
                                        alt={segment.airline?.name || 'Airline'}
                                        className="w-9 h-9 rounded-lg object-contain border border-feature-card-border bg-white p-1"
                                        onError={(e) => {
                                            const target = e.currentTarget
                                            target.style.display = 'none'
                                        }}
                                    />
                                    <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                        {segment.airline?.code} {segment.airline?.flight_number}
                                    </p>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                    <div>
                                        <p className="text-base font-bold text-header-black font-red-hat-display">{formatTime(segment.origin?.departure_time)}</p>
                                        <p className="text-xs text-grey-grey_2 font-red-hat-display">{segment.origin?.airport_code} {segment.origin?.city_name}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-grey-grey_2 font-red-hat-display">{segment.duration?.formatted || '--'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-bold text-header-black font-red-hat-display">{formatTime(segment.destination?.arrival_time)}</p>
                                        <p className="text-xs text-grey-grey_2 font-red-hat-display">{segment.destination?.airport_code} {segment.destination?.city_name}</p>
                                    </div>
                                </div>
                                {next && (
                                    <div className="mt-2 rounded-md bg-primary-default-5 px-2 py-1.5">
                                        <p className="text-[11px] font-semibold text-primary-default font-red-hat-display">
                                            {formatDurationMinutes(connectionMinutes)} connect in {segment.destination?.airport_code}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
    const getProviderLogo = (offer: { provider?: string; provider_logo_url?: string | null; affiliate_url?: string | null; is_rimigo?: boolean }) => {
        if (offer.is_rimigo || (offer.provider || '').toLowerCase() === 'rimigo') return RIMIGO_LOGO_URL
        if (offer.provider_logo_url) return offer.provider_logo_url
        if (!offer.affiliate_url) return null
        try {
            const host = new URL(offer.affiliate_url).hostname.replace(/^www\./, '')
            if (!host) return null
            return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
        } catch {
            return null
        }
    }

    return (
        <div style={FLIGHT_THEME_VARS} className={`h-screen flex flex-col overflow-hidden relative ${showLandingState ? 'bg-natural-white' : 'bg-[var(--flight-bg-page)]'}`}>
            {/* Header */}
            <SearchHeader
                pageName="Flights"
                iconSrc={RIMIGO_LOGO_URL}
                countryConfig={{
                    enabled: false,
                    required: false,
                    label: 'Country',
                    placeholder: 'Search countries',
                    multiselect: false,
                    initialData: initialCountryData,
                    onChange: handleCountryChange,
                    metadata:
                        metadataCountries.length > 0
                            ? {
                                  countries: metadataCountries
                              }
                            : undefined
                }}
                whereConfig={{ enabled: false }}
                whenConfig={{ enabled: false }}
                preferencesConfig={{ enabled: false }}
                assistantConfig={{ enabled: false }}
                filterConfig={{ enabled: false }}
                sortConfig={{ enabled: false }}
                wishlistConfig={{ enabled: false }}
            />

            {/* Content */}
            {!showLandingState && (
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-6 lg:px-4 py-6">
                        {/* Flight Search Bar Section */}
                        <div className="bg-white rounded-xl lg:border lg:border-grey-4 lg:shadow-sm lg:p-4 mb-4 sm:mb-6">
                            <FlightSearchBar onSubmit={handleSearchSubmit} isLoading={isSending} />
                        </div>

                        {/* In-Progress Interactions */}
                        {inProgressInteractions.length > 0 && (
                            <div className="mb-8 space-y-4">
                                {inProgressInteractions.map((interaction) => {
                                    const inputData = interaction.input_data as any
                                    const originCode = inputData?.origin?.[0]
                                    const destCode = inputData?.destination?.[0]
                                    const routeLabel = originCode && destCode ? `${originCode} → ${destCode}` : null

                                    /*
                                     * Pre-Kayak migration this rendered an AI multi-stage loader
                                     * (scanning → analyzing → picking) via OutputLoadingComponent,
                                     * with criteria chips built from the input data. The search is
                                     * now a single Kayak round-trip with no LLM stages, so the
                                     * stage progression doesn't reflect anything real. Keeping
                                     * a simple spinner + progress bar instead.
                                     *
                                     * <OutputLoadingComponent
                                     *     status={interaction.output_status === 'failed' ? 'completed' : interaction.output_status}
                                     *     elapsedMs={elapsedMs}
                                     *     uiConfig={{ scanning: {...}, analyzing: {...}, picking: {...} }}
                                     * />
                                     */

                                    return (
                                        <div key={interaction.id} className="bg-white rounded-2xl border border-feature-card-border p-6">
                                            <div className="flex items-center gap-3">
                                                <Loader className="w-5 h-5 text-primary-default animate-spin shrink-0" />
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-header-black font-red-hat-display">
                                                        Searching flights{routeLabel ? ` · ${routeLabel}` : ''}
                                                    </h3>
                                                    <p className="text-sm text-grey-grey_2 font-red-hat-display mt-0.5">
                                                        Comparing live fares across booking partners. Usually takes ~30 seconds.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-grey_4">
                                                <div className="h-full w-1/3 rounded-full bg-[var(--flight-indigo-strong)] animate-[pulse_1.2s_ease-in-out_infinite]" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Last 2 Interactions Results — each collapsible */}
                        {displayInteractions.length > 0 && (
                            <div className="space-y-3">
                                {displayInteractions.map((interaction, idx) => {
                                    const outputData = interaction.output_data as FlightOutputData | undefined
                                    const inputData = interaction.input_data as any

                                    if (!outputData || !outputData.top_flights || outputData.top_flights.length === 0) {
                                        return null
                                    }

                                    // Format search terms for display
                                    const formatSearchTerms = () => {
                                        const terms: string[] = []
                                        
                                        if (inputData?.origin && inputData.origin.length > 0) {
                                            terms.push(`From: ${inputData.origin.join(', ')}`)
                                        }
                                        if (inputData?.destination && inputData.destination.length > 0) {
                                            terms.push(`To: ${inputData.destination.join(', ')}`)
                                        }
                                        if (inputData?.preferredDepartureTime && inputData.preferredDepartureTime.length > 0) {
                                            const dates = inputData.preferredDepartureTime.map((d: string) => {
                                                const date = new Date(d)
                                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            })
                                            if (dates.length <= 2) {
                                                terms.push(`Depart: ${dates.join(' - ')}`)
                                            } else {
                                                terms.push(`Depart: ${dates[0]} - ${dates[dates.length - 1]} (+${dates.length - 2})`)
                                            }
                                        }
                                        if (inputData?.preferredReturnDepartureTime && inputData.preferredReturnDepartureTime.length > 0) {
                                            const dates = inputData.preferredReturnDepartureTime.map((d: string) => {
                                                const date = new Date(d)
                                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            })
                                            if (dates.length <= 2) {
                                                terms.push(`Return: ${dates.join(' - ')}`)
                                            } else {
                                                terms.push(`Return: ${dates[0]} - ${dates[dates.length - 1]} (+${dates.length - 2})`)
                                            }
                                        }
                                        if (inputData?.adultCount) {
                                            const total = (parseInt(inputData.adultCount) || 0) + (parseInt(inputData.childCount) || 0) + (parseInt(inputData.infantCount) || 0)
                                            terms.push(`${total} ${total === 1 ? 'Traveller' : 'Travellers'}`)
                                        }
                                        
                                        return terms.length > 0 ? terms.join(' • ') : inputData?.user_text_input || 'Flight search results'
                                    }

                                    // Accordion summary values
                                    const firstFlight = outputData.top_flights[0]
                                    const firstSegOfFirst = firstFlight?.segments?.[0]
                                    const lastSegOfFirst = firstFlight?.segments?.[firstFlight.segments.length - 1]
                                    const originCode = firstSegOfFirst?.origin?.airport_code || (inputData?.origin?.[0] || '')
                                    const destCode = lastSegOfFirst?.destination?.airport_code || (inputData?.destination?.[0] || '')
                                    const isReturn = Number(inputData?.journeyType) === 2 || !!firstFlight?.return_date
                                    const summaryRoute = originCode && destCode ? `${originCode} ${isReturn ? '⇄' : '→'} ${destCode}` : formatSearchTerms()

                                    const depIso = Array.isArray(inputData?.preferredDepartureTime) ? inputData.preferredDepartureTime[0] : undefined
                                    const summaryDate = depIso ? formatDate(depIso) : undefined
                                    const paxCount = (parseInt(inputData?.adultCount) || 0) + (parseInt(inputData?.childCount) || 0) + (parseInt(inputData?.infantCount) || 0)
                                    const summaryTravellers = paxCount > 0 ? `${paxCount} ${paxCount === 1 ? 'traveller' : 'travellers'}` : undefined

                                    const prices = outputData.top_flights
                                        .map((f) => Number(f.best_offer?.price || f.total_price))
                                        .filter((p) => Number.isFinite(p) && p > 0)
                                    const cheapest = prices.length > 0 ? Math.min(...prices) : null
                                    const summaryFromPrice = cheapest !== null ? formatAmount(cheapest) : undefined
                                    const summaryResultsCount = `${outputData.top_flights.length} option${outputData.top_flights.length === 1 ? '' : 's'}`
                                    const summaryRecency = formatRelativeTime(interaction.created_at)

                                    const mode = rankingModes[interaction.id] || 'best'
                                    const filterState = filterStates[interaction.id] || EMPTY_FILTERS
                                    const flightsForFilters = outputData.top_flights as unknown as ExploreFlight[]
                                    const facets = computeFacets(flightsForFilters)
                                    const filteredFlights = applyFilters(flightsForFilters, filterState) as unknown as FlightResult[]
                                    const rankedFlights = sortFlightsForMode(filteredFlights, mode)
                                    const setInteractionFilters = (next: FlightFilterState) =>
                                        setFilterStates((prev) => ({ ...prev, [interaction.id]: next }))
                                    const hiddenDuplicates = Math.max(0, (outputData.total_flights || 0) - outputData.top_flights.length)
                                    const rankingOptions: Array<{ key: RankingMode; label: string; icon: React.ReactNode }> = [
                                        { key: 'best', label: 'Best Match', icon: <Sparkles className="w-3.5 h-3.5" /> },
                                        { key: 'cheapest', label: 'Cheapest', icon: <IndianRupee className="w-3.5 h-3.5" /> },
                                        { key: 'fastest', label: 'Fastest', icon: <Clock3 className="w-3.5 h-3.5" /> },
                                        { key: 'fewest_stops', label: 'Fewest Stops', icon: <Route className="w-3.5 h-3.5" /> }
                                    ]
                                    return (
                                        <FlightSearchAccordion
                                            key={interaction.id}
                                            isOpen={openSearchIds.includes(interaction.id)}
                                            onToggle={() => toggleSearchOpen(interaction.id)}
                                            route={summaryRoute}
                                            dateLabel={summaryDate}
                                            travellersLabel={summaryTravellers}
                                            resultsCountLabel={summaryResultsCount}
                                            fromPriceLabel={summaryFromPrice}
                                            recencyLabel={summaryRecency}
                                            isLatest={idx === 0}>
                                            {/*
                                                Split-panel scroll: on lg+, the accordion body is a fixed-height
                                                container so only the right column scrolls. Rail stays anchored
                                                because it's a flex item that fills the bounded panel height
                                                (default `align-items: stretch`) — sticky positioning is bypassed
                                                here since the parent motion.div in FlightSearchAccordion uses
                                                `overflow-hidden` for its open/close height animation, which
                                                breaks the sticky containing block.
                                            */}
                                            <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-220px)] lg:min-h-[480px]">
                                            <FlightFiltersRail
                                                facets={facets}
                                                filters={filterState}
                                                onChange={setInteractionFilters}
                                                onReset={() => setInteractionFilters(EMPTY_FILTERS)}
                                                positionClassName="lg:overflow-y-auto"
                                            />
                                            <div className="flex-1 min-w-0 lg:overflow-y-auto lg:pr-1">
                                            {/* Refine controls */}
                                            <div
                                                className="bg-white"
                                                style={{
                                                    border: '1px solid var(--flight-border)',
                                                    borderRadius: 14,
                                                    padding: '14px 16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 12
                                                }}>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <SlidersHorizontal className="w-[15px] h-[15px]" style={{ color: 'var(--flight-fg-1)' }} />
                                                    <span
                                                        className="font-red-hat-display"
                                                        style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
                                                        Refine results
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMobileFiltersOpenId(interaction.id)}
                                                        className="lg:hidden ml-auto font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer"
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 999,
                                                            border: `1px solid ${isFiltersEmpty(filterState) ? 'var(--flight-border)' : 'var(--flight-indigo-strong)'}`,
                                                            background: isFiltersEmpty(filterState) ? '#FFFFFF' : 'var(--flight-indigo-50)',
                                                            color: isFiltersEmpty(filterState) ? 'var(--flight-fg-1)' : 'var(--flight-indigo-strong)',
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                            letterSpacing: '-0.02em'
                                                        }}>
                                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                                        Filters
                                                        {!isFiltersEmpty(filterState) && (
                                                            <span
                                                                className="inline-flex items-center justify-center"
                                                                style={{
                                                                    minWidth: 16,
                                                                    height: 16,
                                                                    padding: '0 4px',
                                                                    borderRadius: 999,
                                                                    background: 'var(--flight-indigo-strong)',
                                                                    color: '#FFFFFF',
                                                                    fontSize: 10,
                                                                    fontWeight: 700
                                                                }}>
                                                                {countActiveFilters(filterState)}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {rankingOptions.map((opt) => {
                                                        const active = mode === opt.key
                                                        return (
                                                            <button
                                                                key={`${interaction.id}-${opt.key}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    trackButtonClickCustom?.({
                                                                        buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                                                                        buttonName: POSTHOG_EVENTS.FLIGHT_SORT_CLICK,
                                                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                        extra: { sortMode: opt.key, interactionId: interaction.id }
                                                                    })
                                                                    setRankingModes((prev) => ({ ...prev, [interaction.id]: opt.key }))
                                                                }}
                                                                className="font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                                                                style={{
                                                                    padding: '8px 14px',
                                                                    borderRadius: 999,
                                                                    background: active ? 'var(--flight-indigo-strong)' : 'transparent',
                                                                    color: active ? '#fff' : 'var(--flight-fg-1)',
                                                                    border: `1px solid ${active ? 'var(--flight-indigo-strong)' : 'var(--flight-border)'}`,
                                                                    fontWeight: 700,
                                                                    fontSize: 13,
                                                                    letterSpacing: '-0.02em'
                                                                }}>
                                                                {React.cloneElement(
                                                                    opt.icon as React.ReactElement<{ className?: string; style?: React.CSSProperties }>,
                                                                    {
                                                                        className: 'w-[13px] h-[13px]',
                                                                        style: { color: active ? '#fff' : 'var(--flight-fg-2)' }
                                                                    }
                                                                )}
                                                                {opt.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Results meta strip */}
                                            <div className="mt-3 px-3 md:px-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-manrope text-[11px] text-grey-3">
                                                <span>
                                                    {rankedFlights.length === outputData.top_flights.length
                                                        ? `${rankedFlights.length} option${rankedFlights.length === 1 ? '' : 's'}`
                                                        : `${rankedFlights.length} of ${outputData.top_flights.length} shown`}
                                                    {hiddenDuplicates > 0 && ` · ${hiddenDuplicates} duplicates removed`}
                                                    {!isFiltersEmpty(filterState) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setInteractionFilters(EMPTY_FILTERS)}
                                                            className="ml-2 text-primary-default hover:text-primary-deep cursor-pointer">
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </span>
                                                <span>Source: {(outputData.source || 'kayak').toUpperCase()}</span>
                                            </div>

                                            {/* Flight list */}
                                            <div className="mt-2 flex flex-col gap-2">
                                                {rankedFlights.map((flight, flightIndex) => (
                                                    <FlightDenseRow
                                                        key={flight.reference_id}
                                                        flight={flight}
                                                        rank={flightIndex + 1}
                                                        rankMode={mode}
                                                        expanded={expandedFlightIds.includes(flight.reference_id)}
                                                        onToggle={() => {
                                                            trackButtonClickCustom?.({
                                                                buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                                                                buttonName: POSTHOG_EVENTS.FLIGHT_CARD_CLICK,
                                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                extra: { referenceId: flight.reference_id, flightRank: flightIndex + 1 }
                                                            })
                                                            setExpandedFlightIds((prev) =>
                                                                prev.includes(flight.reference_id)
                                                                    ? prev.filter((id) => id !== flight.reference_id)
                                                                    : [...prev, flight.reference_id]
                                                            )
                                                        }}
                                                        onSelect={() => {
                                                            trackButtonClickCustom?.({
                                                                buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                                                                buttonName: POSTHOG_EVENTS.FLIGHT_SELECT_CLICK,
                                                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                extra: { referenceId: flight.reference_id }
                                                            })
                                                            setSelectedFlight({ flight, rankMode: mode })
                                                        }}
                                                        onAddToTrip={() => {
                                                            if (outputData?.extracted_params) {
                                                                trackButtonClickCustom?.({
                                                                    buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                                                                    buttonName: 'add_flight_to_trip_intent',
                                                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                    extra: { referenceId: flight.reference_id }
                                                                })
                                                                setAddToCollectionFlight({ flight, extractedParams: outputData.extracted_params })
                                                            }
                                                        }}
                                                    />
                                                ))}
                                                {rankedFlights.length === 0 && (
                                                    <div
                                                        className="bg-white text-center"
                                                        style={{
                                                            border: '1px solid var(--flight-border)',
                                                            borderRadius: 12,
                                                            padding: 24
                                                        }}>
                                                        <p
                                                            className="font-red-hat-display"
                                                            style={{ fontWeight: 700, fontSize: 14, color: 'var(--flight-fg)' }}>
                                                            {!isFiltersEmpty(filterState)
                                                                ? 'No flights match these filters'
                                                                : 'No flights on this date'}
                                                        </p>
                                                        {!isFiltersEmpty(filterState) ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setInteractionFilters(EMPTY_FILTERS)}
                                                                className="font-manrope text-[12px] text-primary-default hover:text-primary-deep mt-2 cursor-pointer">
                                                                Clear filters
                                                            </button>
                                                        ) : (
                                                            <p
                                                                className="font-manrope mt-1"
                                                                style={{ fontWeight: 500, fontSize: 12, color: 'var(--flight-fg-2)' }}>
                                                                Try another date or use Quick Refine above.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            </div>
                                            </div>
                                            <MobileFiltersSheet
                                                open={mobileFiltersOpenId === interaction.id}
                                                onClose={() => setMobileFiltersOpenId(null)}
                                                facets={facets}
                                                filters={filterState}
                                                onChange={setInteractionFilters}
                                                onReset={() => setInteractionFilters(EMPTY_FILTERS)}
                                                resultCount={rankedFlights.length}
                                            />
                                        </FlightSearchAccordion>
                                    )
                                })}
                            </div>
                        )}

                        {/* Empty State */}
                        {displayInteractions.length === 0 && !isSending && inProgressInteractions.length === 0 && (
                            <div className="text-center py-20">
                                <Plane className="w-16 h-16 text-grey-grey_2 mx-auto mb-4" />
                                <p className="text-lg text-grey-grey_2 font-red-hat-display mb-2">No flight searches yet</p>
                                <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                    Use the search form above to find flights for your trip
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Landing State */}
            {showLandingState && (
                <div className="flex-1 flex items-center justify-center px-8">
                    <div className="text-center max-w-md">
                        <Plane className="w-24 h-24 text-primary-default mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-header-black font-red-hat-display mb-4">
                            Find Your Perfect Flight
                        </h1>
                        <p className="text-base text-grey-grey_2 font-red-hat-display mb-6">
                            Select a country to start searching for flights with flexible dates and multiple options
                        </p>
                    </div>
                </div>
            )}

            {selectedFlight && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedFlight(null)} />
                    <div className="absolute inset-x-0 bottom-0 h-[82vh] rounded-t-2xl bg-white shadow-xl overflow-y-auto md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-full md:max-w-2xl md:rounded-none">
                        <div className="md:hidden flex justify-center pt-2 pb-1">
                            <div className="h-1 w-12 rounded-full bg-grey_4" />
                        </div>
                        <div className="p-5 border-b border-feature-card-border flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <p className="text-lg font-bold text-header-black font-red-hat-display">Flight details & prices</p>
                                <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                    Compare provider prices and continue to affiliate booking links
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFlight(null)}
                                className="w-9 h-9 rounded-full border border-feature-card-border text-grey-grey_2 hover:bg-grey_6">
                                X
                            </button>
                        </div>

                        <div className="p-5 space-y-4 pb-8 md:pb-5">
                            {(() => {
                                const { outbound, inbound, isRoundTrip } = getJourneyLegs(selectedFlight.flight)
                                const primaryOffer =
                                    (selectedFlight.flight.price_comparison || []).find((o) => !o.is_rimigo) ||
                                    (selectedFlight.flight.price_comparison || [])[0]
                                const badges = (primaryOffer?.badges || []).slice(0, 3)
                                return (
                                    <>
                                        <div className="rounded-xl border border-feature-card-border p-4 bg-white">
                                            <p className="text-sm font-semibold text-header-black font-red-hat-display mb-2">Good to know</p>
                                            <div className="flex flex-wrap gap-2">
                                                {primaryOffer?.is_self_transfer && (
                                                    <span className="px-2.5 py-1 rounded-full bg-primary-default-5 text-primary-default text-xs font-semibold font-red-hat-display">
                                                        Self-transfer
                                                    </span>
                                                )}
                                                {badges.map((badge) => (
                                                    <span
                                                        key={`badge-${badge}`}
                                                        className="px-2.5 py-1 rounded-full bg-grey_6 text-grey-grey_2 text-xs font-semibold font-red-hat-display">
                                                        {badge}
                                                    </span>
                                                ))}
                                                {primaryOffer?.cabin && (
                                                    <span className="px-2.5 py-1 rounded-full bg-grey_6 text-grey-grey_2 text-xs font-semibold font-red-hat-display">
                                                        {primaryOffer.cabin}
                                                    </span>
                                                )}
                                                {!primaryOffer?.is_self_transfer && badges.length === 0 && !primaryOffer?.cabin && (
                                                    <span className="text-xs text-grey-grey_2 font-red-hat-display">No additional booking constraints reported.</span>
                                                )}
                                            </div>
                                        </div>
                                        {renderDetailedLeg('Outbound', outbound)}
                                        {isRoundTrip && renderDetailedLeg('Return', inbound)}
                                    </>
                                )
                            })()}
                            <div className="rounded-xl border border-feature-card-border p-4">
                                {(() => {
                                    const { outbound, inbound, isRoundTrip } = getJourneyLegs(selectedFlight.flight)
                                    const outboundLeg = getLegSummary(outbound)
                                    const inboundLeg = getLegSummary(inbound)
                                    return (
                                        <>
                                            <p className="text-sm font-semibold text-header-black font-red-hat-display mb-1">
                                                {outboundLeg.first?.origin?.airport_code || '--'} → {outboundLeg.last?.destination?.airport_code || '--'}
                                                {isRoundTrip ? ` • ${inboundLeg.first?.origin?.airport_code || '--'} → ${inboundLeg.last?.destination?.airport_code || '--'}` : ''}
                                            </p>
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display mb-3">
                                                {isRoundTrip
                                                    ? `Outbound ${outboundLeg.durationLabel} (${outboundLeg.stopsLabel}) • Return ${inboundLeg.durationLabel} (${inboundLeg.stopsLabel})`
                                                    : `${outboundLeg.durationLabel} • ${outboundLeg.stopsLabel}`}
                                            </p>
                                        </>
                                    )
                                })()}
                                <p className="text-sm font-semibold text-header-black font-red-hat-display mb-3">All prices</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(selectedFlight.flight.price_comparison || []).map((offer) => {
                                        const validOffers = (selectedFlight.flight.price_comparison || []).filter((o) => Number.isFinite(Number(o.price)))
                                        const minPrice = validOffers.length > 0 ? Math.min(...validOffers.map((o) => Number(o.price))) : null
                                        const isCheapest = minPrice !== null && Number(offer.price) === minPrice
                                        const logoSrc = getProviderLogo(offer)
                                        return (
                                            <div
                                                key={`${selectedFlight.flight.reference_id}-${offer.provider}-${offer.price}`}
                                                className={`relative rounded-xl border box-border flex items-center gap-3 p-3 transition-all ${
                                                    isCheapest
                                                        ? 'bg-secondary-green/10 border-secondary-green'
                                                        : 'bg-white border-grey-4 hover:border-primary-default/30'
                                                }`}>

                                                {/* Cheapest badge */}
                                                {isCheapest && (
                                                    <div className="absolute -top-2 left-4 bg-secondary-green text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                                                        CHEAPEST
                                                    </div>
                                                )}

                                                {/* Provider logo + name */}
                                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                                    {logoSrc ? (
                                                        <img
                                                            src={logoSrc}
                                                            alt={offer.provider}
                                                            className="h-6 w-24 object-contain shrink-0"
                                                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-grey-4 flex items-center justify-center text-xs font-bold text-grey-2 shrink-0">
                                                            {offer.provider.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                                        {offer.is_rimigo && (
                                                            <span
                                                                className="text-xs text-grey-2 truncate block"
                                                                style={{ fontFamily: 'Manrope' }}>
                                                                Final price incl. taxes
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price + CTA */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="flex flex-col items-end">
                                                        <div
                                                            className="tracking-[-0.02em] leading-4 font-semibold whitespace-nowrap"
                                                            style={{ fontFamily: 'Manrope', fontSize: '11px', color: '#747474' }}>
                                                            starts from
                                                        </div>
                                                        <div
                                                            className="tracking-[-0.04em] font-semibold whitespace-nowrap"
                                                            style={{ fontFamily: 'Red Hat Display', fontSize: '18px', color: '#101010' }}>
                                                            {formatAmount(offer.price)}
                                                        </div>
                                                    </div>

                                                    {offer.affiliate_url ? (
                                                        <a
                                                            href={offer.affiliate_url}
                                                            onClick={() => {
                                                                trackButtonClickCustom?.({
                                                                    buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                                                                    buttonName: POSTHOG_EVENTS.FLIGHT_PROVIDER_BOOK_CLICK,
                                                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                                                    extra: { provider: offer.provider, price: offer.price, referenceId: selectedFlight.flight.reference_id }
                                                                })
                                                            }}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-8 h-8 shrink-0 rounded-full border border-primary-default flex items-center justify-center hover:bg-primary-default/10 transition touch-manipulation"
                                                            aria-label={`Book on ${offer.provider}`}>
                                                            <ArrowUpRight size={14} className="text-primary-default" />
                                                        </a>
                                                    ) : (
                                                        <div className="w-8 h-8 shrink-0 rounded-full border border-grey-4 flex items-center justify-center">
                                                            <span className="text-[9px] text-grey-2 font-semibold">OWN</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Add to Collection Modal for flights */}
            {addToCollectionFlight && (
                <AddToCollectionModal
                    isOpen={!!addToCollectionFlight}
                    onClose={() => setAddToCollectionFlight(null)}
                    experienceId={addToCollectionFlight.flight.reference_id}
                    experienceName={addToCollectionFlight.flight.segments[0]?.airline?.name || 'Flight'}
                    entityType="flights"
                    flightData={buildFlightDataForModal(addToCollectionFlight.flight, addToCollectionFlight.extractedParams)}
                    onSuccess={() => {
                        trackButtonClickCustom?.({
                            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
                            buttonName: 'add_flight_to_trip',
                            buttonAction: POSTHOG_ACTIONS.CLICK,
                            extra: { referenceId: addToCollectionFlight.flight.reference_id }
                        })
                    }}
                />
            )}
        </div>
    )
}

export default FlightsPage
