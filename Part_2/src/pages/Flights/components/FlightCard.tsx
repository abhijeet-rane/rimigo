import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plane, Clock, Sparkles } from 'lucide-react'
import { getAirlineLogo } from '../utils/airlineLogoUtils'

interface FlightSegment {
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
    segments: FlightSegment[]
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
        is_rimigo?: boolean
    }
    price_comparison?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        is_rimigo?: boolean
    }>
}

interface FlightCardProps {
    flight: FlightResult
    rankMode?: 'best' | 'cheapest' | 'fastest' | 'fewest_stops'
    onClick?: () => void
}

// Airline Logo Component with Fallback
const AirlineLogoWithFallback: React.FC<{
    airlineName: string
    logoUrl: string
}> = ({ airlineName, logoUrl }) => {
    const [hasError, setHasError] = useState(false)

    if (hasError) {
        return (
            <div className="w-12 h-12 flex items-center justify-center">
                <span className="text-sm font-semibold text-grey-grey_2 font-red-hat-display">
                    {airlineName.charAt(0).toUpperCase()}
                </span>
            </div>
        )
    }

    return (
        <img
            src={logoUrl}
            alt={airlineName}
            className="w-12 h-12 object-contain"
            onError={() => setHasError(true)}
        />
    )
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, rankMode = 'best', onClick }) => {
    const formatPrice = (price: string | number) => {
        const numPrice = typeof price === 'number' ? price : parseFloat(price)
        return `₹${numPrice.toLocaleString('en-IN')}`
    }

    const formatDateTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString)
        return {
            time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        }
    }

    // Split segments into outbound and return for round-trip flights
    const isRoundTrip = flight.journey_type === 2
    const getOutboundAndReturnSegments = () => {
        if (!isRoundTrip) {
            return {
                outbound: flight.segments,
                return: []
            }
        }
        
        // Find where return journey starts (when destination goes back to origin city)
        const originCity = flight.segments[0]?.origin.city_code
        let returnStartIndex = flight.segments.length
        
        for (let i = 0; i < flight.segments.length; i++) {
            // If destination is back to origin city, this is the start of return
            if (flight.segments[i].destination.city_code === originCity) {
                returnStartIndex = i
                break
            }
        }
        
        return {
            outbound: flight.segments.slice(0, returnStartIndex),
            return: flight.segments.slice(returnStartIndex)
        }
    }

    const { outbound, return: returnSegments } = getOutboundAndReturnSegments()
    
    const firstSegment = outbound[0]
    const lastOutboundSegment = outbound[outbound.length - 1]
    const firstReturnSegment = returnSegments[0]
    const lastReturnSegment = returnSegments[returnSegments.length - 1]

    const outboundDeparture = firstSegment ? formatDateTime(firstSegment.origin.departure_time) : null
    const outboundArrival = lastOutboundSegment ? formatDateTime(lastOutboundSegment.destination.arrival_time) : null
    const returnDeparture = firstReturnSegment ? formatDateTime(firstReturnSegment.origin.departure_time) : null
    const returnArrival = lastReturnSegment ? formatDateTime(lastReturnSegment.destination.arrival_time) : null

    // Calculate outbound and return durations
    const calculateSegmentDuration = (segments: FlightSegment[]) => {
        if (segments.length === 0) return { minutes: 0, formatted: '0m' }
        const first = segments[0]
        const last = segments[segments.length - 1]
        const start = new Date(first.origin.departure_time)
        const end = new Date(last.destination.arrival_time)
        const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return {
            minutes,
            formatted: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
        }
    }

    const outboundDuration = calculateSegmentDuration(outbound)
    const returnDuration = calculateSegmentDuration(returnSegments)


    // Get unique airlines (avoid duplicates) with codes
    const uniqueAirlines = flight.segments
        .map((s) => ({ code: s.airline.code, name: s.airline.name }))
        .filter((airline, index, self) => self.findIndex((a) => a.code === airline.code) === index)
        .slice(0, 2) // Show max 2 airlines

    // Calculate layover times between segments for a given segment array
    const getLayoverTimes = (segments: FlightSegment[]) => {
        if (segments.length < 2) return []
        
        const layovers: string[] = []
        for (let i = 0; i < segments.length - 1; i++) {
            const currentSegment = segments[i]
            const nextSegment = segments[i + 1]
            
            const arrivalTime = new Date(currentSegment.destination.arrival_time)
            const departureTime = new Date(nextSegment.origin.departure_time)
            
            const layoverMinutes = Math.floor((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60))
            
            if (layoverMinutes > 0) {
                const hours = Math.floor(layoverMinutes / 60)
                const minutes = layoverMinutes % 60
                if (hours > 0) {
                    layovers.push(`${hours}h ${minutes}m`)
                } else {
                    layovers.push(`${minutes}m`)
                }
            }
        }
        return layovers
    }

    const outboundLayovers = getLayoverTimes(outbound)
    const returnLayovers = getLayoverTimes(returnSegments)
    
    // Count stops for each leg
    const countStops = (segments: FlightSegment[]) => {
        return Math.max(0, segments.length - 1)
    }

    const outboundStops = countStops(outbound)
    const returnStops = countStops(returnSegments)
    const comparison = flight.price_comparison || []
    const bestOffer = flight.best_offer
    const displayPrice = flight.rimigo_price || flight.total_price

    return (
        <motion.div
            layout
            className="group rounded-2xl overflow-hidden border border-feature-card-border hover:shadow-lg transition-shadow bg-natural-white flex flex-col cursor-pointer w-full h-full"
            onClick={onClick}>
            {/* Top Section - Airline on left, Price on right */}
            <div className="p-5 border-b border-feature-card-border">
                <div className="flex items-start justify-between mb-3">
                    {/* Airline Logo and Name - Left side */}
                    {uniqueAirlines.length > 0 && (
                        <div className="flex items-center gap-3 flex-1">
                            {uniqueAirlines.map((airline, idx) => {
                                const logoUrl = getAirlineLogo(airline.code)
                                return (
                                    <React.Fragment key={idx}>
                                        <div className="flex items-center gap-3">
                                            <AirlineLogoWithFallback airlineName={airline.name} logoUrl={logoUrl} />
                                            <span className="text-sm font-semibold text-header-black font-red-hat-display">
                                                {airline.name}
                                            </span>
                                        </div>
                                        {idx < uniqueAirlines.length - 1 && (
                                            <span className="text-xs text-grey-grey_2 mx-1">+</span>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    )}

                    {/* Price - Right side */}
                    <div className="text-right">
                        <div className="text-2xl font-bold text-header-black font-red-hat-display">
                            {formatPrice(displayPrice)}
                        </div>
                        <div className="text-xs text-grey-grey_2 font-red-hat-display">Rimigo price</div>
                    </div>
                </div>
                {bestOffer && (
                    <p className="text-xs text-grey-grey_2 font-red-hat-display">
                        Best offer: <span className="font-semibold text-primary-default">{bestOffer.provider}</span> {formatPrice(bestOffer.price)}
                    </p>
                )}
                <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-grey_6 text-grey-grey_2 uppercase tracking-wide">
                        Ranked by {rankMode.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Flight Details */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4 space-y-4">
                    {/* Outbound Flight */}
                    <div>
                        {isRoundTrip && (
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-primary-default font-red-hat-display uppercase tracking-wide">
                                    Outbound
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-lg font-bold text-header-black font-red-hat-display">
                                    {firstSegment?.origin.airport_code}
                                </div>
                                <div className="text-xs text-grey-grey_2 font-red-hat-display truncate max-w-[120px]">
                                    {firstSegment?.origin.airport_name.split(' ')[0]}
                                </div>
                            </div>

                            <div className="flex-1 px-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-grey_4"></div>
                                    <Plane className="w-4 h-4 text-grey-grey_2" />
                                    <div className="flex-1 h-px bg-grey_4"></div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-lg font-bold text-header-black font-red-hat-display">
                                    {lastOutboundSegment?.destination.airport_code}
                                </div>
                                <div className="text-xs text-grey-grey_2 font-red-hat-display truncate max-w-[120px]">
                                    {lastOutboundSegment?.destination.airport_name.split(' ')[0]}
                                </div>
                            </div>
                        </div>

                        {/* Outbound Time and Duration */}
                        {outboundDeparture && outboundArrival && (
                            <div className="bg-grey_6 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-lg font-bold text-header-black font-red-hat-display">{outboundDeparture.time}</div>
                                        <div className="text-xs text-grey-grey_2 font-red-hat-display">{outboundDeparture.date}</div>
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-1.5 text-xs text-grey-grey_2 font-red-hat-display">
                                                <Clock className="w-3.5 h-3.5" />
                                                {outboundDuration.formatted}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                                {outboundStops === 0 && (
                                                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full font-red-hat-display">
                                                        Direct
                                                    </span>
                                                )}
                                                {outboundStops > 0 && outboundLayovers.length > 0 && (
                                                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full font-red-hat-display">
                                                        {outboundStops === 1 ? '1 Stop' : `${outboundStops} Stops`} • {outboundLayovers[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-header-black font-red-hat-display">{outboundArrival.time}</div>
                                        <div className="text-xs text-grey-grey_2 font-red-hat-display">{outboundArrival.date}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Return Flight (only for round-trip) */}
                    {isRoundTrip && returnSegments.length > 0 && (
                        <div>
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-primary-default font-red-hat-display uppercase tracking-wide">
                                    Return
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-lg font-bold text-header-black font-red-hat-display">
                                        {firstReturnSegment?.origin.airport_code}
                                    </div>
                                    <div className="text-xs text-grey-grey_2 font-red-hat-display truncate max-w-[120px]">
                                        {firstReturnSegment?.origin.airport_name.split(' ')[0]}
                                    </div>
                                </div>

                                <div className="flex-1 px-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-grey_4"></div>
                                        <Plane className="w-4 h-4 text-grey-grey_2" />
                                        <div className="flex-1 h-px bg-grey_4"></div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-header-black font-red-hat-display">
                                        {lastReturnSegment?.destination.airport_code}
                                    </div>
                                    <div className="text-xs text-grey-grey_2 font-red-hat-display truncate max-w-[120px]">
                                        {lastReturnSegment?.destination.airport_name.split(' ')[0]}
                                    </div>
                                </div>
                            </div>

                            {/* Return Time and Duration */}
                            {returnDeparture && returnArrival && (
                                <div className="bg-grey_6 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-lg font-bold text-header-black font-red-hat-display">{returnDeparture.time}</div>
                                            <div className="text-xs text-grey-grey_2 font-red-hat-display">{returnDeparture.date}</div>
                                        </div>
                                        <div className="flex-1 px-4">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-xs text-grey-grey_2 font-red-hat-display">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {returnDuration.formatted}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                                    {returnStops === 0 && (
                                                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full font-red-hat-display">
                                                            Direct
                                                        </span>
                                                    )}
                                                    {returnStops > 0 && returnLayovers.length > 0 && (
                                                        <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full font-red-hat-display">
                                                            {returnStops === 1 ? '1 Stop' : `${returnStops} Stops`} • {returnLayovers[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-header-black font-red-hat-display">{returnArrival.time}</div>
                                            <div className="text-xs text-grey-grey_2 font-red-hat-display">{returnArrival.date}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {comparison.length > 0 && (
                    <div className="mb-4 rounded-xl border border-feature-card-border p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-grey-grey_2 uppercase tracking-wide">Compare prices</p>
                            <p className="text-[11px] text-grey-grey_2">Affiliate links</p>
                        </div>
                        <div className="space-y-2">
                            {comparison.slice(0, 4).map((offer) => (
                                <div key={`${flight.reference_id}-${offer.provider}`} className="flex items-center justify-between bg-grey_6 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-header-black font-red-hat-display">{offer.provider}</span>
                                        {offer.is_rimigo && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-default-10 text-primary-default font-semibold">
                                                Rimigo
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-header-black font-red-hat-display">{formatPrice(offer.price)}</span>
                                        {offer.affiliate_url && (
                                            <a
                                                href={offer.affiliate_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-xs font-semibold text-primary-default hover:underline">
                                                Book
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendation Reasons - Fixed height for consistency */}
                {flight.recommendation_reasons && flight.recommendation_reasons.length > 0 && (
                    <div className="mt-auto bg-primary-default-80 rounded-xl p-3 min-h-[80px] flex items-start">
                        <div className="w-5 h-5 rounded-full bg-primary-default-12 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3 h-3 text-primary-default" />
                        </div>
                        <div className="flex-1 space-y-1">
                            {flight.recommendation_reasons.slice(0, 2).map((reason, idx) => (
                                <p key={idx} className="text-xs text-secondary-purple font-medium font-red-hat-display leading-relaxed line-clamp-2">
                                    {reason}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default FlightCard
