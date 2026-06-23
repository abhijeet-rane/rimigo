import React, { useState } from 'react'
import { Plane, Clock, ExternalLink } from 'lucide-react'
import type { FlightSearchResultsData } from './types'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'

interface FlightSearchResultsCardProps {
    data: FlightSearchResultsData
}

/* ─── Sub-components ─── */

const AirlineLogo: React.FC<{ code?: string; name: string; size?: number }> = ({
    code,
    name,
    size = 36,
}) => {
    const [broken, setBroken] = useState(false)

    if (!code || broken) {
        return (
            <div
                style={{ width: size, height: size }}
                className="rounded-lg bg-grey_6 flex items-center justify-center flex-shrink-0">
                <span
                    className="font-bold text-grey_1 font-manrope"
                    style={{ fontSize: size * 0.38 }}>
                    {name.charAt(0).toUpperCase()}
                </span>
            </div>
        )
    }

    return (
        <img
            src={getAirlineLogo(code)}
            alt={name}
            style={{ width: size, height: size }}
            className="rounded-lg object-contain flex-shrink-0"
            onError={() => setBroken(true)}
        />
    )
}

const ProviderLogo: React.FC<{
    provider: string
    logoUrl?: string
    bookingUrl?: string
}> = ({ provider, logoUrl, bookingUrl }) => {
    const [broken, setBroken] = useState(false)

    // Prefer explicit logo URL → derive from booking URL → fallback text
    const resolvedUrl = (() => {
        if (logoUrl && !broken) return logoUrl
        if (provider.toLowerCase() === 'rimigo') return '/icons/logo-transparent-indigo.png'
        if (bookingUrl) {
            try {
                const host = new URL(bookingUrl).hostname.replace(/^www\./, '')
                return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null
            } catch {
                return null
            }
        }
        return null
    })()

    if (!resolvedUrl) {
        return (
            <span className="text-[10px] font-semibold text-green-700 font-manrope truncate max-w-[72px]">
                {provider}
            </span>
        )
    }

    return (
        <img
            src={resolvedUrl}
            alt={provider}
            className="h-4 max-w-[56px] object-contain"
            title={provider}
            onError={() => setBroken(true)}
        />
    )
}

/* ─── Main Card ─── */

const FlightSearchResultsCard: React.FC<FlightSearchResultsCardProps> = ({ data }) => {
    if (!data.flights || data.flights.length === 0) {
        return (
            <div className="text-[13px] text-grey_1 font-manrope">
                No flights found for {data.origin} to {data.destination}.
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {/* Route header */}
            <div className="flex items-center gap-1.5 font-manrope">
                <span className="text-[13px] font-semibold text-grey_0">{data.origin}</span>
                <span className="text-grey_3 text-[11px]">&rarr;</span>
                <span className="text-[13px] font-semibold text-grey_0">{data.destination}</span>
                {data.travel_date && (
                    <span className="text-[11px] text-grey_2 font-normal ml-0.5">
                        &middot;&nbsp;{data.travel_date}
                    </span>
                )}
            </div>

            {/* Carousel */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {data.flights.map((flight, idx) => {
                    const id = flight.flight_number || `${flight.airline}-${idx}`

                    return (
                        <div
                            key={id}
                            className="flex-shrink-0 w-[256px] rounded-2xl border border-grey_4/60 bg-white hover:shadow-md hover:border-grey_3 transition-all duration-200 flex flex-col">

                            {/* ── Header: airline · price ── */}
                            <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <AirlineLogo code={flight.airline_code} name={flight.airline} />
                                    <div className="min-w-0">
                                        <h4 className="text-[12px] leading-[15px] font-semibold text-grey_0 font-manrope truncate">
                                            {flight.airline}
                                        </h4>
                                        {flight.flight_number && (
                                            <p className="text-[10px] text-grey_2 font-manrope leading-[13px] mt-px">
                                                {flight.flight_number}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {flight.price && (
                                    <span className="text-[16px] font-extrabold text-grey_0 font-manrope leading-tight whitespace-nowrap tabular-nums">
                                        {flight.price}
                                    </span>
                                )}
                            </div>

                            {/* ── Route: airport codes ── */}
                            {(flight.origin_code || flight.destination_code) && (
                                <div className="flex items-center px-3.5 pb-2">
                                    <span className="text-[15px] font-bold text-grey_0 font-manrope">
                                        {flight.origin_code}
                                    </span>
                                    <div className="flex-1 mx-2.5 flex items-center">
                                        <div className="flex-1 border-t border-dashed border-grey_4" />
                                        <Plane className="w-3.5 h-3.5 text-grey_3 mx-1.5" />
                                        <div className="flex-1 border-t border-dashed border-grey_4" />
                                    </div>
                                    <span className="text-[15px] font-bold text-grey_0 font-manrope">
                                        {flight.destination_code}
                                    </span>
                                </div>
                            )}

                            {/* ── Time strip ── */}
                            {(flight.departure_time || flight.arrival_time) && (
                                <div className="mx-3.5 mb-2.5 rounded-xl bg-grey_6/60 px-3 py-2.5">
                                    <div className="flex items-start justify-between">
                                        {/* Departure */}
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-bold text-grey_0 font-manrope leading-tight">
                                                {flight.departure_time || '--:--'}
                                            </p>
                                            {flight.departure_date && (
                                                <p className="text-[9px] text-grey_2 font-manrope mt-0.5 leading-none">
                                                    {flight.origin_code} &middot; {flight.departure_date}
                                                </p>
                                            )}
                                        </div>

                                        {/* Duration + stops */}
                                        <div className="flex flex-col items-center gap-1 px-1 pt-0.5">
                                            {flight.duration && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-grey_2 font-manrope whitespace-nowrap">
                                                    <Clock className="w-2.5 h-2.5 opacity-60" />
                                                    {flight.duration}
                                                </span>
                                            )}
                                            {flight.stops === 0 ? (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-semibold rounded-full font-manrope">
                                                    Direct
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-medium rounded-full font-manrope text-center leading-tight whitespace-nowrap">
                                                    {flight.stops === 1 ? '1 stop' : `${flight.stops} stops`}
                                                    {flight.layover_info && (
                                                        <> &middot; {flight.layover_info}</>
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Arrival */}
                                        <div className="text-right min-w-0">
                                            <p className="text-[14px] font-bold text-grey_0 font-manrope leading-tight">
                                                {flight.arrival_time || '--:--'}
                                            </p>
                                            {flight.destination_code && flight.departure_date && (
                                                <p className="text-[9px] text-grey_2 font-manrope mt-0.5 leading-none">
                                                    {flight.destination_code}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Cheapest provider row ── */}
                            {flight.cheapest_provider && flight.cheapest_price && (
                                <div className="mx-3.5 mb-2 flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-2.5 py-1.5">
                                    <span className="text-[10px] text-emerald-600 font-manrope whitespace-nowrap">
                                        Cheapest on
                                    </span>
                                    <ProviderLogo
                                        provider={flight.cheapest_provider}
                                        logoUrl={flight.cheapest_provider_logo}
                                        bookingUrl={flight.booking_url}
                                    />
                                    <span className="text-[11px] font-bold text-emerald-700 font-manrope ml-auto tabular-nums whitespace-nowrap">
                                        {flight.cheapest_price}
                                    </span>
                                </div>
                            )}

                            {/* ── AI recommendation ── */}
                            {flight.recommendation_reasons && flight.recommendation_reasons.length > 0 && (
                                <p className="mx-3.5 mb-2 text-[10px] leading-[14px] text-grey_2 font-manrope line-clamp-2">
                                    {flight.recommendation_reasons[0]}
                                </p>
                            )}

                            {/* ── Spacer → CTA pinned at bottom ── */}
                            <div className="flex-1" />
                            <div className="px-3.5 pb-3.5">
                                {flight.booking_url ? (
                                    <a
                                        href={flight.booking_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 w-full py-[9px] rounded-xl text-[11px] font-semibold font-manrope bg-primary-default text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
                                        View &amp; Book
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <div className="w-full py-[9px] rounded-xl text-[11px] font-semibold font-manrope text-center bg-grey_6 text-grey_2">
                                        Flight info
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default FlightSearchResultsCard
