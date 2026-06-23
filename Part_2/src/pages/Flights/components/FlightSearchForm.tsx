import React, { useState } from 'react'
import { Send, Calendar, Users, ChevronDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AirportInput from './AirportInput'
import type { Airport } from '@/api/flights/airportSearchAPI'

interface FlightSearchFormProps {
    onSubmit: (data: {
        user_text_input: string
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
    }) => void
    isLoading?: boolean
}

const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSubmit, isLoading = false }) => {
    const [userTextInput, setUserTextInput] = useState('')
    const [origins, setOrigins] = useState<Airport[]>([])
    const [destinations, setDestinations] = useState<Airport[]>([])
    const [departureDateStart, setDepartureDateStart] = useState('')
    const [departureDateEnd, setDepartureDateEnd] = useState('')
    const [returnDateStart, setReturnDateStart] = useState('')
    const [returnDateEnd, setReturnDateEnd] = useState('')
    const [journeyType, setJourneyType] = useState<1 | 2>(1)
    const [adultCount, setAdultCount] = useState('1')
    const [childCount, setChildCount] = useState('0')
    const [infantCount, setInfantCount] = useState('0')
    const [cabinClass, setCabinClass] = useState<1 | 2 | 3 | 4>(1)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const cabinClassOptions = [
        { value: 1, label: 'Economy' },
        { value: 2, label: 'Premium Economy' },
        { value: 3, label: 'Business' },
        { value: 4, label: 'First Class' }
    ]

    const handleRemoveOrigin = (index: number) => {
        setOrigins(origins.filter((_, i) => i !== index))
    }

    const handleOriginChange = (index: number, airport: Airport | null) => {
        if (airport) {
            const updated = [...origins]
            if (index >= updated.length) {
                updated.push(airport)
            } else {
                updated[index] = airport
            }
            setOrigins(updated)
        } else if (index < origins.length) {
            setOrigins(origins.filter((_, i) => i !== index))
        }
    }

    const handleRemoveDestination = (index: number) => {
        setDestinations(destinations.filter((_, i) => i !== index))
    }

    const handleDestinationChange = (index: number, airport: Airport | null) => {
        if (airport) {
            const updated = [...destinations]
            if (index >= updated.length) {
                updated.push(airport)
            } else {
                updated[index] = airport
            }
            setDestinations(updated)
        } else if (index < destinations.length) {
            setDestinations(destinations.filter((_, i) => i !== index))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const preferredDepartureTime: string[] = []
        if (departureDateStart) {
            preferredDepartureTime.push(departureDateStart)
        }
        if (departureDateEnd && departureDateEnd !== departureDateStart) {
            preferredDepartureTime.push(departureDateEnd)
        }

        const preferredReturnDepartureTime: string[] = []
        if (journeyType === 2) {
            if (returnDateStart) {
                preferredReturnDepartureTime.push(returnDateStart)
            }
            if (returnDateEnd && returnDateEnd !== returnDateStart) {
                preferredReturnDepartureTime.push(returnDateEnd)
            }
        }

        const finalUserTextInput =
            userTextInput.trim() ||
            `Find flights${origins.length > 0 ? ` from ${origins.map((o) => o.city_name).join(', ')}` : ''}${
                destinations.length > 0 ? ` to ${destinations.map((d) => d.city_name).join(', ')}` : ''
            }${departureDateStart ? ` departing ${new Date(departureDateStart).toLocaleDateString()}` : ''}${
                journeyType === 2 && returnDateStart ? ` returning ${new Date(returnDateStart).toLocaleDateString()}` : ''
            }`

        onSubmit({
            user_text_input: finalUserTextInput,
            origin: origins.length > 0 ? origins.map((o) => o.code) : undefined,
            destination: destinations.length > 0 ? destinations.map((d) => d.code) : undefined,
            preferredDepartureTime: preferredDepartureTime.length > 0 ? preferredDepartureTime : undefined,
            preferredReturnDepartureTime: preferredReturnDepartureTime.length > 0 ? preferredReturnDepartureTime : undefined,
            adultCount,
            childCount,
            infantCount,
            journeyType,
            flightCabinClass: cabinClass
        })
    }

    const today = new Date().toISOString().split('T')[0]
    const minReturnDate = departureDateEnd || departureDateStart || today

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-feature-card-border">
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Natural Language Input - Compact Single Line */}
                <div>
                    <input
                        type="text"
                        value={userTextInput}
                        onChange={(e) => setUserTextInput(e.target.value)}
                        placeholder="Describe your flight needs (optional)"
                        className="w-full px-4 py-2.5 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm transition-all"
                    />
                </div>

                {/* Journey Type */}
                <div className="flex items-center gap-3 pb-3 border-b border-grey_4">
                    <span className="text-sm font-medium text-grey-grey_1 font-red-hat-display">Trip Type:</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setJourneyType(1)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors font-red-hat-display ${
                                journeyType === 1
                                    ? 'bg-primary-default text-white'
                                    : 'bg-grey_5 text-grey-grey_2 hover:bg-grey_4'
                            }`}>
                            One Way
                        </button>
                        <button
                            type="button"
                            onClick={() => setJourneyType(2)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors font-red-hat-display ${
                                journeyType === 2
                                    ? 'bg-primary-default text-white'
                                    : 'bg-grey_5 text-grey-grey_2 hover:bg-grey_4'
                            }`}>
                            Round Trip
                        </button>
                    </div>
                </div>

                {/* Origins - Multiple with Clear Messaging */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-header-black font-red-hat-display">From</label>
                    </div>
                    <div className="space-y-2">
                        {origins.length === 0 ? (
                            <AirportInput
                                value={null}
                                onChange={(airport) => {
                                    if (airport) {
                                        setOrigins([airport])
                                    }
                                }}
                                placeholder="City or airport (add multiple for flexibility)"
                                label=""
                            />
                        ) : (
                            <>
                                {origins.map((origin, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <AirportInput
                                                value={origin}
                                                onChange={(airport) => handleOriginChange(index, airport)}
                                                placeholder={index === 0 ? 'City or airport' : 'Add another origin'}
                                                label=""
                                            />
                                        </div>
                                        {origins.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOrigin(index)}
                                                className="mt-7 p-1.5 text-grey-grey_2 hover:text-header-black transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <AirportInput
                                    value={null}
                                    onChange={(airport) => {
                                        if (airport) {
                                            setOrigins([...origins, airport])
                                        }
                                    }}
                                    placeholder="Add another origin (optional)"
                                    label=""
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Destinations - Multiple with Clear Messaging */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-header-black font-red-hat-display">To</label>
                    </div>
                    <div className="space-y-2">
                        {destinations.length === 0 ? (
                            <AirportInput
                                value={null}
                                onChange={(airport) => {
                                    if (airport) {
                                        setDestinations([airport])
                                    }
                                }}
                                placeholder="City or airport (add multiple for flexibility)"
                                label=""
                            />
                        ) : (
                            <>
                                {destinations.map((destination, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <AirportInput
                                                value={destination}
                                                onChange={(airport) => handleDestinationChange(index, airport)}
                                                placeholder={index === 0 ? 'City or airport' : 'Add another destination'}
                                                label=""
                                            />
                                        </div>
                                        {destinations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDestination(index)}
                                                className="mt-7 p-1.5 text-grey-grey_2 hover:text-header-black transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <AirportInput
                                    value={null}
                                    onChange={(airport) => {
                                        if (airport) {
                                            setDestinations([...destinations, airport])
                                        }
                                    }}
                                    placeholder="Add another destination (optional)"
                                    label=""
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-semibold text-header-black mb-2 font-red-hat-display">
                            Departure
                        </label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                                <input
                                    type="date"
                                    value={departureDateStart}
                                    onChange={(e) => setDepartureDateStart(e.target.value)}
                                    min={today}
                                    className="w-full pl-10 pr-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white"
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                                <input
                                    type="date"
                                    value={departureDateEnd}
                                    onChange={(e) => setDepartureDateEnd(e.target.value)}
                                    min={departureDateStart || today}
                                    placeholder="End (optional)"
                                    className="w-full pl-10 pr-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>
                    {journeyType === 2 && (
                        <div>
                            <label className="block text-sm font-semibold text-header-black mb-2 font-red-hat-display">
                                Return
                            </label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={returnDateStart}
                                        onChange={(e) => setReturnDateStart(e.target.value)}
                                        min={minReturnDate}
                                        className="w-full pl-10 pr-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white"
                                    />
                                </div>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={returnDateEnd}
                                        onChange={(e) => setReturnDateEnd(e.target.value)}
                                        min={returnDateStart || minReturnDate}
                                        placeholder="End (optional)"
                                        className="w-full pl-10 pr-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Passengers and Cabin */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-semibold text-header-black mb-2 font-red-hat-display">
                            Passengers
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                            <input
                                type="number"
                                value={adultCount}
                                onChange={(e) => setAdultCount(e.target.value)}
                                min="1"
                                placeholder="Adults"
                                className="w-full pl-10 pr-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-header-black mb-2 font-red-hat-display">
                            Cabin Class
                        </label>
                        <div className="relative">
                            <select
                                value={cabinClass}
                                onChange={(e) => setCabinClass(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                                className="w-full pl-4 pr-10 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm bg-white appearance-none cursor-pointer">
                                {cabinClassOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Advanced Options */}
                <div>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-grey-grey_1 hover:text-header-black font-red-hat-display transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                        Advanced Options
                    </button>
                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 space-y-3 pt-3 border-t border-grey_4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-grey-grey_2 mb-1.5 font-red-hat-display">
                                            Children
                                        </label>
                                        <input
                                            type="number"
                                            value={childCount}
                                            onChange={(e) => setChildCount(e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-grey-grey_2 mb-1.5 font-red-hat-display">
                                            Infants
                                        </label>
                                        <input
                                            type="number"
                                            value={infantCount}
                                            onChange={(e) => setInfantCount(e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 border border-grey_4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent font-red-hat-display text-sm"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Submit Button */}
                <div className="pt-3 border-t border-grey_4">
                    <button
                        type="submit"
                        disabled={isLoading || (!userTextInput.trim() && origins.length === 0 && destinations.length === 0)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-default text-white rounded-lg hover:bg-primary-hover transition-colors font-red-hat-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Searching...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Search Flights
                            </>
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    )
}

export default FlightSearchForm
