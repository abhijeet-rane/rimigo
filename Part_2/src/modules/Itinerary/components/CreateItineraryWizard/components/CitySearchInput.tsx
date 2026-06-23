import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, ChevronDown, Clock, Plus } from 'lucide-react'
import { MAP_ICON } from '@/constants/thiingsIcons'
import { useQueries } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCountryCities } from '@/api/curation/locationPersonalizationAPI'
import { useCountries } from '@/hooks/useCountries'
import { ActivitiesAllCityData, ActivitiesCityCardData, adaptActivitiesCitiesResponse } from '@/modules/Acitvities/adapters/activitiesCitiesAdapter'
import { CityRouteItem } from '../types'

interface CitySearchInputProps {
    cities: CityRouteItem[]
    onAddCity: (city: ActivitiesCityCardData) => void
    onRemoveCity?: (cityId: string) => void
    /** Override trip countries for city search (used when no active trip exists, e.g. TripboardCreateFlow) */
    overrideCountries?: { id: string; name?: string }[]
}

const CitySearchInput = ({ cities, onAddCity, onRemoveCity, overrideCountries }: CitySearchInputProps) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const tripCountries = overrideCountries || activeTrip?.final_destination_countries || []

    // Fetch prioritized countries to know which are live
    const { allCountries: prioritizedCountries } = useCountries({ shouldUsePrioritized: true })

    // Build set of non-live country IDs among the trip's countries
    const nonLiveCountryIds = useMemo(() => {
        const set = new Set<string>()
        tripCountries.forEach((tc) => {
            const found = prioritizedCountries.find((c) => c.country_id === tc.id)
            if (found && found.is_live !== true) {
                set.add(tc.id)
            }
        })
        return set
    }, [prioritizedCountries, tripCountries])

    // Fetch all cities for the trip's countries
    const citiesQueries = useQueries({
        queries: tripCountries.map((country) => ({
            queryKey: ['countryCities', country.id],
            queryFn: () => getCountryCities(country.id),
            enabled: !!country.id,
            staleTime: 1000 * 60 * 60
        }))
    })

    const isLoading = citiesQueries.some((q) => q.isLoading)

    const mapAllCityToCardCity = (city: ActivitiesAllCityData): ActivitiesCityCardData => ({
        cityId: city.id,
        cityName: city.name ?? '',
        knownFor: '',
        image: city.image ?? '',
        suggestionPriority: 0,
        location: city.location ?? null
    })

    // Combine all cities and track which are from non-live countries
    const nonLiveCityIds = new Set<string>()
    const cityCountryMap = new Map<string, string>() // cityId → countryName
    const allCities: ActivitiesCityCardData[] = []
    citiesQueries.forEach((q, idx) => {
        if (!q.data) return
        const countryId = tripCountries[idx]?.id
        const countryName = tripCountries[idx]?.name ?? ''
        const isNonLive = countryId ? nonLiveCountryIds.has(countryId) : false
        const adapted = adaptActivitiesCitiesResponse(q.data)

        const topCities = adapted.topCities
        const otherCities = adapted.otherCities.map(mapAllCityToCardCity)

        if (isNonLive) {
            topCities.forEach((c) => nonLiveCityIds.add(c.cityId))
            otherCities.forEach((c) => nonLiveCityIds.add(c.cityId))
        }

        // Map each city to its country name
        topCities.forEach((c) => cityCountryMap.set(c.cityId, countryName))
        otherCities.forEach((c) => cityCountryMap.set(c.cityId, countryName))

        allCities.push(...topCities, ...otherCities)
    })

    const isMultiCountry = tripCountries.length > 1

    // Deduplicate
    const uniqueCities = Array.from(new Map(allCities.map((c) => [c.cityId, c])).values()).filter(
        (c) => (c.cityName?.trim() || '').toLowerCase() !== 'live'
    )

    // Filter by search query — keep added cities visible so user sees "Added" state
    const addedIds = new Set(cities.map((c) => c.city.cityId))
    const filtered = query.trim()
        ? uniqueCities.filter((c) => c.cityName?.toLowerCase().includes(query.toLowerCase()))
        : uniqueCities

    // Sort: live cities first, non-live at bottom
    const filteredCities = filtered.sort((a, b) => {
        const aIsNonLive = nonLiveCityIds.has(a.cityId) ? 1 : 0
        const bIsNonLive = nonLiveCityIds.has(b.cityId) ? 1 : 0
        return aIsNonLive - bIsNonLive
    })

    // Close dropdown only on click outside (keep open when adding cities for multi-select)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleSelect = (city: ActivitiesCityCardData) => {
        if (nonLiveCityIds.has(city.cityId)) return // Prevent selecting non-live cities
        onAddCity(city)
        // Keep dropdown open and query as-is so user can add more cities
    }

    // Count only live cities for the hint
    const liveCityCount = uniqueCities.filter((c) => !nonLiveCityIds.has(c.cityId)).length

    return (
        <div ref={containerRef} className="relative">
            {/* Search input */}
            <button
                type="button"
                onClick={() => {
                    setIsFocused(true)
                    inputRef.current?.focus()
                }}
                className={`w-full flex items-center gap-2.5 bg-white border rounded-xl px-3.5 py-3 transition-all cursor-pointer ${
                    isFocused ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-grey-4 hover:border-grey-3'
                }`}>
                <Search
                    size={18}
                    className="text-grey-0 shrink-0"
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Select or search cities..."
                    className="flex-1 font-manrope text-grey-0 placeholder:text-grey-3 outline-none bg-transparent cursor-pointer input-placeholder"
                    style={{ fontSize: '16px' }}
                />
                {query ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setQuery('')
                            inputRef.current?.focus()
                        }}
                        className="cursor-pointer">
                        <X
                            size={16}
                            className="text-grey-0"
                        />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsFocused(prev => !prev)
                        }}
                        className="shrink-0 cursor-pointer"
                    >
                        <ChevronDown
                            size={16}
                            className={`text-grey-0 shrink-0 transition-transform duration-200 ${isFocused ? 'rotate-180' : ''}`}
                        />
                    </button>
                )}
            </button>

            {/* Hint text when not focused */}
            {!isFocused && !isLoading && liveCityCount > 0 && cities.length === 0 && (
                <p className="mt-1.5 text-sm sm:text-xs text-grey-3 font-manrope pl-1 font-medium">
                    {liveCityCount} cities available — click to browse
                </p>
            )}

            {/* Dropdown — stays open when adding; closes on click outside */}
            {isFocused && (
                <div
                    className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-grey-4 rounded-xl shadow-lg max-h-60 overflow-y-auto z-20">
                    {isLoading ? (
                        <div
                            className="flex items-center justify-center py-6 gap-2 text-grey-2"
                            style={{ fontSize: '16px' }}>
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                            <span className="font-manrope font-medium">Loading cities...</span>
                        </div>
                    ) : filteredCities.length === 0 ? (
                        <div
                            className="py-6 text-center text-grey-2 font-manrope font-medium"
                            style={{ fontSize: '16px' }}>
                            {query ? 'No cities found' : 'No more cities to add'}
                        </div>
                    ) : (
                        filteredCities.map((city) => {
                            const isNonLive = nonLiveCityIds.has(city.cityId)
                            return (
                                <div
                                    key={city.cityId}
                                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                                        isNonLive ? 'opacity-45' : 'hover:bg-grey-5'
                                    }`}
                                    style={{ fontSize: '16px' }}>
                                    {city.image ? (
                                        <img
                                            src={city.image}
                                            alt={city.cityName || ''}
                                            className={`w-9 h-9 rounded-lg object-cover shrink-0 ${isNonLive ? 'grayscale' : ''}`}
                                        />
                                    ) : (
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                isNonLive ? 'bg-grey-4' : 'bg-grey-4'
                                            }`}>
                                            <img
                                                src={MAP_ICON}
                                                alt=""
                                                className={`w-4 h-4 object-contain ${isNonLive ? 'opacity-50' : 'opacity-70'}`}
                                            />
                                        </div>
                                    )}
                                    <span
                                        className={`flex-1 font-medium font-manrope text-grey-0 truncate min-w-0 ${isNonLive ? 'text-grey-3' : ''}`}>
                                        {city.cityName}
                                        {isMultiCountry && cityCountryMap.get(city.cityId) && (
                                            <span className="text-grey-3 text-[13px]">, {cityCountryMap.get(city.cityId)}</span>
                                        )}
                                    </span>
                                    {isNonLive ? (
                                        <span className="flex items-center gap-1 text-[11px] text-grey-3 font-manrope bg-grey-5 px-2 py-0.5 rounded-full shrink-0">
                                            <Clock size={10} />
                                            Coming soon
                                        </span>
                                    ) : (
                                        <CityToggleButton
                                            isAdded={addedIds.has(city.cityId)}
                                            onAdd={() => handleSelect(city)}
                                            onRemove={() => onRemoveCity?.(city.cityId)}
                                        />
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

/** Animated toggle pill — Add ↔ Remove (persistent) */
const CityToggleButton = ({
    isAdded,
    onAdd,
    onRemove,
}: {
    isAdded: boolean
    onAdd: () => void
    onRemove: () => void
}) => {
    return (
        <motion.button
            type="button"
            layout
            onClick={(e) => {
                e.stopPropagation()
                isAdded ? onRemove() : onAdd()
            }}
            className={`shrink-0 flex items-center gap-1.5 rounded-full font-manrope font-semibold cursor-pointer
                px-2.5 py-1.5 text-[13px] transition-colors duration-200
                ${isAdded
                    ? 'bg-red-50 text-red-500'
                    : 'bg-primary-default/[0.06] text-primary-default hover:bg-primary-default/[0.12]'
                }`}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
            <AnimatePresence mode="wait" initial={false}>
                {isAdded ? (
                    <motion.span
                        key="x"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center w-4 h-4">
                        <X size={13} strokeWidth={2.5} />
                    </motion.span>
                ) : (
                    <motion.span
                        key="plus"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center w-4 h-4">
                        <Plus size={13} strokeWidth={2.5} />
                    </motion.span>
                )}
            </AnimatePresence>
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={isAdded ? 'remove' : 'add'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.12 }}>
                    {isAdded ? 'Remove' : 'Add'}
                </motion.span>
            </AnimatePresence>
        </motion.button>
    )
}

export default CitySearchInput
