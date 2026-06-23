import React, { useState, useEffect, useRef } from 'react'
import { X, ArrowLeftRight, Plane, MapPin, Search } from 'lucide-react'
import { searchAirports, type Airport } from '@/api/flights/airportSearchAPI'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import CustomShimmer from '@/components/shared/Shimmer'

// "Île-de-France, France" / "France". Region drops if it duplicates country.
const buildSublocationLabel = (a: Airport): string => {
    const parts: string[] = []
    if (a.region_name && a.region_name !== a.city_name && a.region_name !== a.country_name) {
        parts.push(a.region_name)
    }
    if (a.country_name && a.country_name !== a.city_name) parts.push(a.country_name)
    return parts.join(', ')
}

interface AirportGroup {
    key: string
    city: string
    sublocation: string
    items: Airport[]
}

// Group results by city + country (city alone collides on names like Cambridge).
// Within a group, metro entries (is_metro) sort first so "All airports" sits
// above its specific airports.
const groupByCity = (airports: Airport[]): AirportGroup[] => {
    const order: string[] = []
    const map: Record<string, AirportGroup> = {}
    airports.forEach((a) => {
        const key = `${a.city_name}|${a.country_name}`
        if (!map[key]) {
            map[key] = {
                key,
                city: a.city_name || a.code,
                sublocation: buildSublocationLabel(a),
                items: []
            }
            order.push(key)
        }
        map[key].items.push(a)
    })
    return order.map((k) => ({
        ...map[k],
        items: [...map[k].items].sort((x, y) => Number(!!y.is_metro) - Number(!!x.is_metro))
    }))
}

interface AirportInputProps {
    value: Airport | null
    onChange: (airport: Airport | null) => void
    placeholder: string
    label: string
    onSwap?: () => void
    showSwap?: boolean
}

const AirportInput: React.FC<AirportInputProps> = ({ value, onChange, placeholder, label, onSwap, showSwap = false }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Debounced search query
    const [debouncedQuery, setDebouncedQuery] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Fetch airports when debounced query changes
    const { data: airportsData, isLoading } = useQuery({
        queryKey: ['airportSearch', debouncedQuery],
        queryFn: () => searchAirports(debouncedQuery, 8),
        enabled: debouncedQuery.length >= 2 && isOpen,
        staleTime: 5 * 60 * 1000 // 5 minutes
    })

    const airports = airportsData?.data?.airports || []

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (airport: Airport) => {
        onChange(airport)
        setSearchQuery('')
        setIsOpen(false)
        setIsFocused(false)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
        setSearchQuery('')
        setIsOpen(false)
    }

    const displayValue = value ? `${value.city_name} (${value.code})` : ''

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label className="input-label">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    className={`flex h-11 sm:h-[50px] items-center gap-2 px-3 sm:px-4 border rounded-xl bg-white cursor-text transition-all ${
                        isFocused ? 'border-primary-default shadow-sm' : 'border-grey-4 hover:border-grey-3'
                    }`}
                    onClick={() => {
                        inputRef.current?.focus()
                        setIsOpen(true)
                    }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={isFocused ? searchQuery : displayValue}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setIsOpen(true)
                            if (!isFocused) setIsFocused(true)
                        }}
                        onFocus={() => {
                            setIsFocused(true)
                            setIsOpen(true)
                            if (value) {
                                setSearchQuery('')
                            }
                        }}
                        onBlur={() => {
                            // Delay to allow click on dropdown item
                            setTimeout(() => {
                                setIsFocused(false)
                                if (!value) {
                                    setSearchQuery('')
                                }
                            }, 200)
                        }}
                        placeholder={placeholder}
                        className="flex-1 outline-none  input-placeholder "

                    />
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Clear"
                            className="p-1 hover:bg-grey-5 rounded-full transition-colors cursor-pointer">
                            <X className="w-3.5 h-3.5 text-grey-2" />
                        </button>
                    )}
                    {showSwap && onSwap && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onSwap()
                            }}
                            aria-label="Swap from and to"
                            className="p-1.5 hover:bg-grey-5 rounded-lg transition-colors cursor-pointer">
                            <ArrowLeftRight className="w-4 h-4 text-primary-default" />
                        </button>
                    )}
                </div>

                {/* Dropdown */}
                <AnimatePresence>
                    {isOpen && (searchQuery.length >= 2 || airports.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 w-full mt-1 bg-white border border-grey_4 rounded-xl shadow-lg max-h-[440px] overflow-y-auto">
                            {isLoading ? (
                                <div className="py-1">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                                            <div className="w-8 flex-shrink-0">
                                                <CustomShimmer height={32} radius={8} />
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1.5">
                                                <CustomShimmer height={14} radius={4} />
                                                <div className="w-2/5">
                                                    <CustomShimmer height={11} radius={4} />
                                                </div>
                                            </div>
                                            <div className="w-12 flex-shrink-0">
                                                <CustomShimmer height={24} radius={6} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : airports.length > 0 ? (
                                <div className="py-1">
                                    {groupByCity(airports).map((group) => {
                                        const specificCount = group.items.filter((a) => !a.is_metro).length
                                        return (
                                            <div key={group.key}>
                                                <div className="px-4 pt-3 pb-1 flex items-baseline gap-2 min-w-0">
                                                    <span className="text-base font-bold text-header-black font-red-hat-display truncate">
                                                        {group.city}
                                                    </span>
                                                    {group.sublocation && (
                                                        <span className="text-xs text-grey-grey_2 font-red-hat-display truncate">
                                                            {group.sublocation}
                                                        </span>
                                                    )}
                                                </div>
                                                {group.items.map((airport) => {
                                                    const isMetro = !!airport.is_metro
                                                    return (
                                                        <button
                                                            key={airport.code}
                                                            type="button"
                                                            onClick={() => handleSelect(airport)}
                                                            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-primary-pale-purple transition-colors cursor-pointer">
                                                            <span
                                                                className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${
                                                                    isMetro
                                                                        ? 'bg-primary-pale-purple text-primary-default'
                                                                        : 'bg-grey_5 text-header-black'
                                                                }`}>
                                                                {isMetro ? <MapPin className="w-4 h-4" /> : <Plane className="w-4 h-4" />}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-semibold text-header-black font-red-hat-display truncate">
                                                                    {isMetro ? 'All airports' : airport.name || airport.full_name || airport.code}
                                                                </div>
                                                                {isMetro && specificCount > 0 && (
                                                                    <div className="text-xs text-grey-grey_2 font-red-hat-display truncate mt-0.5">
                                                                        {specificCount} airport{specificCount === 1 ? '' : 's'} nearby
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`text-xs font-extrabold tracking-widest tabular-nums px-2.5 py-1.5 rounded-md flex-shrink-0 ${
                                                                    isMetro
                                                                        ? 'bg-primary-pale-purple text-primary-default'
                                                                        : 'bg-grey_5 text-header-black'
                                                                }`}>
                                                                {airport.code}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : debouncedQuery.length >= 2 ? (
                                <div className="px-5 py-8 text-center">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-pale-purple text-primary-default mb-2.5">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <div className="text-sm font-semibold text-header-black font-red-hat-display">
                                        No airports match that
                                    </div>
                                    <div className="text-xs text-grey-grey_2 font-red-hat-display mt-1">
                                        Try a city name or 3-letter IATA code
                                    </div>
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default AirportInput
