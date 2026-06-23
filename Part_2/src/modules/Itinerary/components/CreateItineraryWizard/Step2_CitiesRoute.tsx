import { useState, useEffect, useRef, useMemo, useCallback, type RefObject } from 'react'
import { Plane, ArrowLeft, Sparkles, X, Loader2, ChevronDown, AlertTriangle } from 'lucide-react'
import FormSectionCard from '@/components/shared/FormSectionCard'
import { ActivitiesCityCardData } from '@/modules/Acitvities/adapters/activitiesCitiesAdapter'
import { Airport, searchAirports } from '@/api/flights/airportSearchAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import GenericMap from '@/components/shared/Map/GenericMap'
import { MapMarker } from '@/components/shared/Map/GenericMap'
import CitySearchInput from './components/CitySearchInput'
import CityRouteList from './components/CityRouteList'
import { StepProps, CityRouteItem } from './types'
import { WIZARD_CONTENT_MAX_WIDTH } from '@/modules/Tripboard/components/createFlow/wizardConstants'
import { useIsMobile } from '../../hooks/ItineraryHook'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

// Geocode a city name using Mapbox forward geocoding
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
    if (!MAPBOX_TOKEN || !cityName) return null
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`
        )
        const data = await res.json()
        const feature = data?.features?.[0]
        if (feature?.center) {
            return { lat: feature.center[1], lng: feature.center[0] }
        }
    } catch {
        // Geocoding failed — silently ignore
    }
    return null
}

const Step2CitiesRoute = ({ state, onChange, onNext, onBack, overrideCountries }: StepProps & { overrideCountries?: { id: string; name?: string }[] }) => {
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const [departureError, setDepartureError] = useState<string | null>(null)
    const [citiesError, setCitiesError] = useState<string | null>(null)
    const departureRef = useRef<HTMLDivElement>(null)
    const citiesRef = useRef<HTMLDivElement>(null)

    // Total trip nights derived from date selection (step 1)
    const totalTripNights = useMemo(() => {
        if (state.dateMode === 'exact' && state.startDate && state.endDate) {
            const diffMs = state.endDate.getTime() - state.startDate.getTime()
            return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
        }
        if (state.dateMode === 'flexible' && state.flexibleDuration) {
            return state.flexibleDuration - 1 // duration is in days, nights = days - 1
        }
        return null
    }, [state.dateMode, state.startDate, state.endDate, state.flexibleDuration])

    // Fallback city name for map centering — use first trip country so the map has something to show
    const fallbackCityName = useMemo(() => {
        if (state.cities.length > 0) return undefined // markers will handle centering
        const countries = overrideCountries || activeTrip?.final_destination_countries || []
        return countries[0]?.name || undefined
    }, [state.cities.length, activeTrip, overrideCountries])

    // Airport search state
    const [departureQuery, setDepartureQuery] = useState(state.departureCity?.city_name || '')
    const [departureResults, setDepartureResults] = useState<Airport[]>([])
    const [showDepartureDropdown, setShowDepartureDropdown] = useState(false)
    const [isSearchingDeparture, setIsSearchingDeparture] = useState(false)

    // Airport search with debounce
    useEffect(() => {
        if (departureQuery.trim().length < 2) {
            setDepartureResults([])
            return
        }
        setIsSearchingDeparture(true)
        const timeout = setTimeout(async () => {
            try {
                const response = await searchAirports(departureQuery, 8)
                setDepartureResults(response.data.airports)
            } catch {
                setDepartureResults([])
            } finally {
                setIsSearchingDeparture(false)
            }
        }, 300)
        return () => clearTimeout(timeout)
    }, [departureQuery])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (departureRef.current && !departureRef.current.contains(e.target as Node)) {
                setShowDepartureDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleSelectDeparture = (airport: Airport) => {
        onChange({ departureCity: airport })
        setDepartureQuery(airport.city_name)
        setShowDepartureDropdown(false)
        setDepartureError(null)
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'departure_airport_select',
            buttonAction: 'select',
            extra: { airport_code: airport.code }
        })
    }

    const clearDeparture = () => {
        onChange({ departureCity: null })
        setDepartureQuery('')
        setDepartureResults([])
        setDepartureError(null)
    }

    // Add city + geocode its coordinates
    const handleAddCity = useCallback(
        async (city: ActivitiesCityCardData) => {
            const apiLat = city.location?.latitude
            const apiLng = city.location?.longitude
            const apiGeo =
                typeof apiLat === 'number' && Number.isFinite(apiLat) && typeof apiLng === 'number' && Number.isFinite(apiLng)
                    ? { lat: apiLat, lng: apiLng }
                    : undefined

            const newItem: CityRouteItem = { city, nights: 'auto', geoLocation: apiGeo }
            // Add city immediately (coordinates will update after geocoding)
            const updatedCities = [...state.cities, newItem]
            onChange({ cities: updatedCities })
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'city_add',
                buttonAction: 'add',
                extra: { city_name: city.cityName || '' }
            })

            // Geocode in background and update (fallback only if API location is missing)
            if (!apiGeo) {
                const geo = await geocodeCity(city.cityName || '')
                if (geo) {
                    onChange({
                        cities: updatedCities.map((c) => (c.city.cityId === city.cityId ? { ...c, geoLocation: geo } : c))
                    })
                }
            }
        },
        [state.cities, onChange]
    )

    const handleCitiesChange = useCallback(
        (cities: CityRouteItem[]) => {
            onChange({ cities })
        },
        [onChange]
    )

    // Map markers from cities — only include those with geo coordinates
    const mapMarkers: MapMarker[] = useMemo(() => {
        return state.cities
            .filter((item) => item.city.cityName && item.geoLocation)
            .map((item, i) => ({
                id: item.city.cityId,
                name: item.city.cityName || '',
                image: item.city.image || undefined,
                type: 'city' as const,
                sequenceNumber: i + 1,
                sequenceLabel: `${i + 1}`,
                geo_location: {
                    lat: item.geoLocation!.lat,
                    long: item.geoLocation!.lng
                }
            }))
    }, [state.cities])

    // Route line coordinates from city geo locations (in order)
    const routeCoordinates: [number, number][] = useMemo(() => {
        return state.cities.filter((item) => item.geoLocation).map((item) => [item.geoLocation!.lng, item.geoLocation!.lat] as [number, number])
    }, [state.cities])

    const isStep2Complete = state.departureCity !== null && state.cities.length > 0

    const handleNext = () => {
        const departureInvalid = state.departureCity === null
        const citiesInvalid = state.cities.length === 0

        setDepartureError(departureInvalid ? 'Please select a departure airport' : null)
        setCitiesError(citiesInvalid ? 'Please add at least one city to visit' : null)

        if (departureInvalid || citiesInvalid) {
            const firstErrorRef: RefObject<HTMLDivElement | null> = departureInvalid ? departureRef : citiesRef
            setTimeout(() => {
                firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 100)
            return
        }

        onNext()
    }

    return (
        <div className={`mt-6 sm:mt-10 ${WIZARD_CONTENT_MAX_WIDTH} mx-auto pb-20`}>
            <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
                {/* ── Left panel: Form ── */}
                <div className={`${isMobile ? 'w-full' : 'w-1/2'} space-y-5`}>
                    {/* Departure city */}
                    <FormSectionCard error={departureError} ref={departureRef}>
                        <p className="itinerary-heading mb-2 block">Where are you flying from?</p>
                        <div
                            className="relative">
                            <div
                                className={`flex items-center gap-2.5 bg-white border rounded-xl px-3.5 py-3 transition-all ${
                                    showDepartureDropdown ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-grey-4'
                                }`}
                                onClick={() =>
                                    state.departureCity && (setShowDepartureDropdown(true), setDepartureQuery(''), onChange({ departureCity: null }))
                                }>
                                <Plane
                                    size={18}
                                    className="text-grey-0 shrink-0"
                                />
                                {state.departureCity ? (
                                    <>
                                        <div className="flex-1 flex items-center gap-2 min-w-0">
                                            <span className="input-placeholder truncate">
                                                {state.departureCity.city_name} {state.departureCity.country_name}
                                            </span>
                                            <span className="shrink-0 px-2 py-0.5 rounded-sm bg-primary-default/10 text-primary-default text-xs font-semibold font-manrope ">
                                                {state.departureCity.code}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                clearDeparture()
                                            }}
                                            className="cursor-pointer p-0.5"
                                            aria-label="Clear departure">
                                            <X
                                                size={16}
                                                className="text-grey-3 hover:text-grey-1"
                                            />
                                        </button>
                                        <ChevronDown
                                            size={18}
                                            className="text-grey-0 shrink-0"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            value={departureQuery}
                                            onChange={(e) => {
                                                setDepartureQuery(e.target.value)
                                                setShowDepartureDropdown(true)
                                            }}
                                            onFocus={() => setShowDepartureDropdown(true)}
                                            placeholder="Search airport or city..."
                                            className="flex-1 font-manrope text-grey-0 placeholder:text-grey-3 outline-none bg-transparent input-placeholder min-w-0"
                                            style={{ fontSize: '16px' }}
                                        />
                                        {isSearchingDeparture && (
                                            <Loader2
                                                size={16}
                                                className="text-grey-3 animate-spin shrink-0"
                                            />
                                        )}
                                        {departureQuery && !isSearchingDeparture && (
                                            <button
                                                type="button"
                                                onClick={clearDeparture}
                                                className="cursor-pointer shrink-0">
                                                <X
                                                    size={16}
                                                    className="text-grey-0"
                                                />
                                            </button>
                                        )}
                                        {/* {!departureQuery && !isSearchingDeparture && (
                                            <ChevronDown
                                                size={18}
                                                className="text-grey-0 shrink-0"
                                            />
                                        )} */}
                                    </>
                                )}
                            </div>

                            {/* Departure dropdown */}
                            {showDepartureDropdown && departureResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-grey-4 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
                                    {departureResults.map((airport) => (
                                        <button
                                            key={airport.code}
                                            type="button"
                                            onClick={() => handleSelectDeparture(airport)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-grey-5 transition-colors cursor-pointer text-left"
                                            style={{ fontSize: '16px' }}>
                                            <span className="shrink-0 px-2 py-0.5 rounded-sm bg-primary-default/10 text-primary-default text-xs font-semibold font-manrope ">
                                                {airport.code}
                                            </span>
                                            <div className="min-w-0">
                                                <p
                                                    className="font-medium font-manrope text-grey-0 truncate"
                                                    style={{ fontSize: '16px' }}>
                                                    {airport.city_name}
                                                </p>
                                                <p
                                                    className="itinerary-subheading"
                                                    style={{ fontSize: '16px' }}>
                                                    {airport.name}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                        </div>
                    </FormSectionCard>

                    {/* City search */}
                    <FormSectionCard error={citiesError} ref={citiesRef}>
                        <label className="itinerary-heading mb-2 block">Cities to visit</label>
                        <CitySearchInput
                            cities={state.cities}
                            onAddCity={(city) => {
                                handleAddCity(city)
                                setCitiesError(null)
                            }}
                            onRemoveCity={(cityId) => {
                                const removedCity = state.cities.find((c) => c.city.cityId === cityId)
                                handleCitiesChange(state.cities.filter((c) => c.city.cityId !== cityId))
                                trackButtonClickCustom({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'city_remove',
                                    buttonAction: 'remove',
                                    extra: { city_name: removedCity?.city.cityName || '' }
                                })
                            }}
                            overrideCountries={overrideCountries}
                        />
                    </FormSectionCard>

                    {/* Warning when city nights exceed trip duration */}
                    {totalTripNights != null && (() => {
                        const fixedNights = state.cities.reduce((s, c) => s + (typeof c.nights === 'number' ? c.nights : 0), 0)
                        return fixedNights > totalTripNights ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <p className="text-xs font-medium font-manrope text-amber-700">
                                    Your number of nights ({fixedNights}) exceed selected date range ({totalTripNights} nights)
                                </p>
                            </div>
                        ) : null
                    })()}

                    {/* City route list — scrollable when many cities */}
                    <div className={state.cities.length > 3 ? 'max-h-[280px] overflow-y-auto rounded-xl' : ''}>
                        <CityRouteList
                            cities={state.cities}
                            onChange={(cities) => {
                                // Track city removal from route list
                                if (cities.length < state.cities.length) {
                                    const removedCity = state.cities.find(
                                        (c) => !cities.some((nc) => nc.city.cityId === c.city.cityId)
                                    )
                                    if (removedCity) {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'city_remove',
                                            buttonAction: 'remove',
                                            extra: { city_name: removedCity.city.cityName || '' }
                                        })
                                    }
                                }
                                // Track city nights change
                                if (cities.length === state.cities.length) {
                                    const changedCity = cities.find((c, i) => c.nights !== state.cities[i]?.nights)
                                    if (changedCity) {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'city_nights_change',
                                            buttonAction: 'change',
                                            extra: { city_name: changedCity.city.cityName || '', nights: changedCity.nights }
                                        })
                                    }
                                }
                                handleCitiesChange(cities)
                                if (cities.length > 0) setCitiesError(null)
                            }}
                            totalTripNights={totalTripNights}
                        />
                    </div>

                    {/* AI Route Optimize toggle */}
                    {state.cities.length >= 2 && (
                        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-white border border-purple-200/50 rounded-xl p-3.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-default/10 flex items-center justify-center shrink-0">
                                <Sparkles
                                    size={16}
                                    className="text-primary-default"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="itinerary-heading font-semibold">AI Route Optimization</p>
                                <p className="itinerary-subheading">Let AI find the best route order</p>
                            </div>
                            <button
                                onClick={() => {
                                    onChange({ aiRouteOptimize: !state.aiRouteOptimize })
                                    trackButtonClickCustom({
                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                        buttonName: 'ai_route_optimize_toggle',
                                        buttonAction: 'click',
                                        extra: { enabled: !state.aiRouteOptimize }
                                    })
                                }}
                                className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer relative ${
                                    state.aiRouteOptimize ? 'bg-primary-default' : 'bg-grey-4'
                                }`}>
                                <div
                                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                                        state.aiRouteOptimize ? 'translate-x-5.5' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Right panel: Map Preview (desktop) ── */}
                {!isMobile && (
                    <div className="w-1/2">
                        <div className="sticky top-4 bg-white border border-grey-4/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="h-[420px]">
                                <GenericMap
                                    cityName={fallbackCityName}
                                    markers={mapMarkers}
                                    routeCoordinates={routeCoordinates.length >= 2 ? routeCoordinates : undefined}
                                    height="100%"
                                    className="rounded-2xl"
                                    minZoom={2}
                                    initialPitch={0}
                                    emptyZoom={4}
                                    expandbtnClassName='hidden'
                                />
                            </div>
                            {state.cities.length > 0 && (
                                <div className="px-4 py-3 border-t border-grey-4/50 bg-grey-5/30">
                                    <p className="text-xs text-grey-2 font-manrope text-center font-medium">
                                        {state.cities.length} {state.cities.length === 1 ? 'city' : 'cities'} •{' '}
                                        {(() => {
                                            const fixed = state.cities.reduce((s, c) => s + (typeof c.nights === 'number' ? c.nights : 0), 0)
                                            const autoCount = state.cities.filter((c) => c.nights === 'auto').length
                                            if (autoCount === state.cities.length) return 'AI optimized'
                                            if (autoCount === 0) return `${fixed} nights total`
                                            return `${fixed} nights + ${autoCount} flexible`
                                        })()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation buttons — floating on both mobile and desktop */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey-4/50 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-50">
                <div className={`${WIZARD_CONTENT_MAX_WIDTH} mx-auto flex items-center justify-between gap-4`}>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-grey-4 text-grey-1 font-medium font-manrope hover:bg-grey-5 cursor-pointer transition-all">
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <button
                        onClick={handleNext}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-default text-white font-medium font-manrope cursor-pointer transition-all duration-200 ${isStep2Complete ? 'hover:shadow-lg hover:scale-105 active:scale-95' : 'opacity-50'}`}>
                        <span>Next</span>
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Step2CitiesRoute
