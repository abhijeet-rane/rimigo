import React, { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, ArrowRightLeft, ArrowUpDown } from 'lucide-react'
import AirportInput from './AirportInput'
import type { Airport } from '@/api/flights/airportSearchAPI'
import { useIsMobile } from '@/hooks/use-mobile'


interface FlightSearchBarProps {
    onSubmit: (data: {
        origin?: string[]
        destination?: string[]
        preferredDepartureTime?: string[]
        preferredReturnDepartureTime?: string[]
        adultCount?: string | number
        childCount?: string | number
        infantCount?: string | number
        journeyType?: number
        flightCabinClass?: number
    }) => void
    isLoading?: boolean
}

const cabins: Array<{ value: 1 | 2 | 3 | 4; label: string }> = [
    { value: 1, label: 'Economy' },
    { value: 2, label: 'Premium Economy' },
    { value: 3, label: 'Business' },
    { value: 4, label: 'First' }
]

const formatIso = (value: string) => {
    if (!value) return undefined
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return undefined
    return d.toISOString().split('T')[0]
}

const toDisplayDate = (value: string) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const FlightSearchBar: React.FC<FlightSearchBarProps> = ({ onSubmit, isLoading = false }) => {
    const [journeyType, setJourneyType] = useState<1 | 2>(1)
    const [origin, setOrigin] = useState<Airport | null>(null)
    const [destination, setDestination] = useState<Airport | null>(null)
    const [departureDate, setDepartureDate] = useState('')
    const [returnDate, setReturnDate] = useState('')
    const [adults, setAdults] = useState(1)
    const [children, setChildren] = useState(0)
    const [infants, setInfants] = useState(0)
    const [cabinClass, setCabinClass] = useState<1 | 2 | 3 | 4>(1)
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
    const [flexDays, setFlexDays] = useState<0 | 1 | 2 | 3>(0)
    const isMobile = useIsMobile()

    const canSearch = origin && destination && departureDate

    const travellersLabel = useMemo(() => {
        const total = adults + children + infants
        return `${total} traveller${total > 1 ? 's' : ''}`
    }, [adults, children, infants])

    const handleSwap = () => {
        const nextOrigin = destination
        const nextDestination = origin
        setOrigin(nextOrigin)
        setDestination(nextDestination)
    }

    const buildDateWindow = (baseDate?: string) => {
        if (!baseDate) return undefined
        const baseIso = formatIso(baseDate)
        if (!baseIso) return undefined
        if (flexDays === 0) return [baseIso]

        const date = new Date(baseDate)
        const variants = new Set<string>()
        for (let offset = -flexDays; offset <= flexDays; offset += 1) {
            const next = new Date(date)
            next.setDate(next.getDate() + offset)
            variants.add(next.toISOString().split('T')[0])
        }
        return Array.from(variants)
    }

    const handleSubmit = () => {
        if (!canSearch) return

        const departureWindow = buildDateWindow(departureDate)
        const returnWindow = journeyType === 2 ? buildDateWindow(returnDate) : undefined

        onSubmit({
            origin: origin?.code ? [origin.code] : undefined,
            destination: destination?.code ? [destination.code] : undefined,
            preferredDepartureTime: departureWindow,
            preferredReturnDepartureTime: returnWindow,
            adultCount: adults.toString(),
            childCount: children.toString(),
            infantCount: infants.toString(),
            journeyType,
            flightCabinClass: cabinClass
        })
    }

    return (
        <div className="w-full rounded-2xl bg-white p-2 sm:p-4 lg:p-0">
            <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
                <div className="relative inline-flex rounded-lg bg-grey-5 border border-grey-4 w-fit p-0.5 sm:p-1 overflow-hidden">
                    {/* Sliding background */}
                    <div
                        className={`absolute inset-y-0.5 sm:inset-y-1 w-[calc(50%-0.125rem)] sm:w-[calc(50%-0.25rem)] rounded-md bg-primary-default transition-all duration-300 ease-in-out ${journeyType === 1 ? 'left-0.5 sm:left-1' : 'right-0.5 sm:right-1'
                            }`}
                    />

                    <button
                        type="button"
                        onClick={() => setJourneyType(1)}
                        className={`relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-[13px] sm:text-[14px] font-semibold font-red-hat-display cursor-pointer transition-colors duration-300 ${journeyType === 1 ? 'text-white' : 'text-grey-2'
                            }`}
                    >
                        One way
                    </button>

                    <button
                        type="button"
                        onClick={() => setJourneyType(2)}
                        className={`relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-[13px] sm:text-[14px] font-semibold font-red-hat-display cursor-pointer transition-colors duration-300 ${journeyType === 2 ? 'text-white' : 'text-grey-2'
                            }`}
                    >
                        Return
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setIsAdvancedOpen((prev) => !prev)}
                    aria-label={isAdvancedOpen ? 'Hide flex options' : 'Show flex options'}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-grey-4 cursor-pointer text-[12px] sm:text-[13px] font-semibold text-grey-1 hover:border-primary-default/40 hover:text-primary-default transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isAdvancedOpen ? 'Hide flex options' : 'Flex options'}</span>
                    <span className="sm:hidden">Flex</span>
                </button>
            </div>

            {/* flex options section */}
            {isAdvancedOpen && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-grey-4 bg-grey-5 backdrop-blur-[1px]">
                    <div>
                        <label className="input-label">Adults</label>
                        <input
                            type="number"
                            min={1}
                            max={9}
                            value={adults}
                            onChange={(e) => setAdults(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                            className="w-full h-11 px-3 rounded-md border border-grey_4 bg-white input-placeholder"
                        />
                    </div>

                    <div>
                        <label className=" input-label">Children</label>
                        <input
                            type="number"
                            min={0}
                            max={8}
                            value={children}
                            onChange={(e) => setChildren(Math.min(8, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-full h-11 px-3 rounded-md border border-grey_4 bg-white input-placeholder"
                        />
                    </div>

                    <div>
                        <label className=" input-label">Infants</label>
                        <input
                            type="number"
                            min={0}
                            max={4}
                            value={infants}
                            onChange={(e) => setInfants(Math.min(4, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-full h-11 px-3 rounded-md border border-grey_4 bg-white input-placeholder" 
                        />
                    </div>

                    <div>
                        <label className="input-label">Cabin</label>
                        <select
                            value={cabinClass}
                            onChange={(e) => setCabinClass(Number(e.target.value) as 1 | 2 | 3 | 4)}
                            className="w-full h-11 px-3 rounded-md border border-grey_4 bg-white input-placeholder">
                            {cabins.map((cabin) => (
                                <option key={cabin.value} value={cabin.value}>
                                    {cabin.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-4 flex flex-col md:flex-row items-start md:items-center justify-start border w-full border-grey-4 md:w-fit px-4 rounded-md bg-white  py-2.5">
                        <p className="input-placeholder">Date flexibility for better fares</p>
                        <div className="inline-flex rounded-lg bg-grey_6  py-2 md:p-1 gap-2">
                            {[0, 1, 2, 3].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFlexDays(value as 0 | 1 | 2 | 3)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer  border border-grey-4 hover:bg-grey-5 hover:text-grey-0 ${flexDays === value ? 'bg-primary-default text-white' : 'text-grey-grey_2'
                                        }`}>
                                    {value === 0 ? 'Exact' : `+/- ${value}d`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="md:col-span-4 text-xs font-medium text-grey-grey-1 font-red-hat-display ">
                        Search summary: {origin?.code || 'FROM'} to {destination?.code || 'TO'} | {departureDate ? toDisplayDate(departureDate) : 'Select date'}
                        {journeyType === 2 && returnDate ? ` - ${toDisplayDate(returnDate)}` : ''} | {travellersLabel}, {cabins.find((c) => c.value === cabinClass)?.label}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_180px_180px_auto] gap-2 sm:gap-3 items-end lg:rounded-2xl lg:border lg:border-grey-4 lg:p-4 lg:bg-grey-5 mt-3 sm:mt-4">
                <AirportInput value={origin} onChange={setOrigin} placeholder="Departure city or airport" label="From" />

                <button
                    type="button"
                    onClick={handleSwap}
                    aria-label="Swap from and to"
                    className="h-9 w-9 lg:h-11 lg:w-11 rounded-full border border-grey-4 bg-white text-grey-1 hover:border-primary-default/40 hover:text-primary-default transition-colors flex items-center justify-center mx-auto lg:mx-0 cursor-pointer">
                    {isMobile ? (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowRightLeft className="w-4 h-4" />
                    )}
                </button>

                <AirportInput value={destination} onChange={setDestination} placeholder="Destination city or airport" label="To" />

                <div>
                    <label className="input-label">Depart</label>
                    <input
                        type="date"
                        value={departureDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full h-11 sm:h-[50px] px-3 rounded-md border border-grey_4 bg-white text-[14px] font-red-hat-display text-grey-0 placeholder:text-grey-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary-default [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit-text]:text-grey-2 [&::-webkit-datetime-edit-month-field]:text-grey-2 [&::-webkit-datetime-edit-day-field]:text-grey-2 [&::-webkit-datetime-edit-year-field]:text-grey-2"
                    />
                </div>

                {journeyType === 2 ? (
                    <div>
                        <label className="input-label">Return</label>
                        <input
                            type="date"
                            value={returnDate}
                            min={departureDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full h-11 sm:h-[50px] px-3 rounded-md border border-grey_4 bg-white text-[14px] font-red-hat-display text-grey-0 placeholder:text-grey-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary-default [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit-text]:text-grey-2 [&::-webkit-datetime-edit-month-field]:text-grey-2 [&::-webkit-datetime-edit-day-field]:text-grey-2 [&::-webkit-datetime-edit-year-field]:text-grey-2"
                        />
                    </div>
                ) : (
                    <div className="hidden lg:block" />
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !canSearch}
                    className="h-11 sm:h-[50px] px-5 rounded-xl bg-[var(--flight-indigo-strong)] text-white font-red-hat-display text-[14px] font-semibold hover:bg-[var(--flight-indigo-press)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 mt-1 lg:mt-0">
                    <Search className="w-4 h-4" />
                    <span className="lg:hidden">Search flights</span>
                </button>
            </div>

        </div>
    )
}

export default FlightSearchBar
