import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Calendar, Lightbulb, AlertCircle, ChevronDown, Wand } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getFlightInsights, type FlightInsightsData } from '@/api/flights/flightInsightsAPI'
import FlightVideoCard from './FlightVideoCard'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

interface FlightInsightsBoxProps {
    countryId?: string
}

const FlightInsightsBox: React.FC<FlightInsightsBoxProps> = ({ countryId }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    // Fetch flight insights from API
    const { data: insightsData, isLoading, error } = useQuery<FlightInsightsData>({
        queryKey: ['flightInsights', countryId],
        queryFn: () => getFlightInsights(countryId!),
        enabled: !!countryId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1
    })

    // Reset expanded state when country changes
    useEffect(() => {
        setIsExpanded(false)
    }, [countryId])

    // Don't render if no country selected or loading/error
    if (!countryId) return null
    if (isLoading) {
        return (
            <div className="rounded-xl border border-primary-default-20 bg-gradient-to-br from-primary-default-5 to-primary-default-12 p-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-default border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-grey-grey_2 font-red-hat-display">Loading flight insights...</p>
                </div>
            </div>
        )
    }
    if (error || !insightsData) {
        return null // Silently fail - don't show error state
    }

    const formatPrice = (price: number) => {
        return `₹${price.toLocaleString('en-IN')}`
    }

    const getTrendIcon = () => {
        if (insightsData.price_trend === 'rising') {
            return <TrendingUp className="w-4 h-4 text-orange-600" />
        } else if (insightsData.price_trend === 'falling') {
            return <TrendingDown className="w-4 h-4 text-green-600" />
        }
        return null
    }

    // Map day names to indices
    const dayMap: Record<string, number> = {
        Monday: 0,
        Tuesday: 1,
        Wednesday: 2,
        Thursday: 3,
        Friday: 4,
        Saturday: 5,
        Sunday: 6
    }

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Create week data
    const weekData = dayLabels.map((day, index) => {
        const fullDayName = Object.keys(dayMap).find((key) => dayMap[key] === index) || ''
        const isBestDay = insightsData.best_days_to_fly?.some((bestDay) =>
            bestDay.toLowerCase().includes(fullDayName.toLowerCase())
        )
        return {
            day,
            fullDayName,
            isBestDay
        }
    })

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl overflow-hidden ${
                isExpanded ? 'bg-white shadow-sm' : 'bg-gradient-to-br from-primary-default-5 to-primary-default-12'
            }`}>
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center justify-between p-4 transition-colors ${
                    isExpanded ? 'hover:bg-grey_5' : 'hover:bg-primary-default-12'
                }`}>
                <div className="flex items-center gap-2">
                    <Wand className="w-4 h-4 text-primary-default" />
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-header-black font-red-hat-display">
                            <span className="text-primary-default italic">Flight Insights</span> for {insightsData.route}
                        </h3>
                        {!isExpanded && (
                            <p className="text-xs text-grey-grey_2 font-red-hat-display mt-0.5">
                                Round trip: {formatPrice(insightsData.average_round_trip_fare_inr)} • Cheapest: {insightsData.cheapest_month}
                            </p>
                        )}
                    </div>
                </div>
                <ChevronDown
                    className={`w-5 h-5 text-grey-grey_2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 pt-2">
                            <GenericCarousel gap={12}>
                                {/* Card 1: Price Overview */}
                                <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-4 h-4 text-primary-default" />
                                        <h4 className="text-sm font-semibold text-header-black font-red-hat-display">Price Overview</h4>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center justify-between p-2 bg-grey_6 rounded-lg">
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display">Round Trip</p>
                                            <div className="text-right">
                                                <p className="text-[10px] text-grey-grey_2 font-red-hat-display">Starting from</p>
                                                <p className="text-sm font-bold text-header-black font-red-hat-display">
                                                    {formatPrice(insightsData.average_round_trip_fare_inr)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-grey_6 rounded-lg">
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display">One Way</p>
                                            <div className="text-right">
                                                <p className="text-[10px] text-grey-grey_2 font-red-hat-display">Starting from</p>
                                                <p className="text-sm font-bold text-header-black font-red-hat-display">
                                                    {formatPrice(insightsData.average_one_way_fare_inr)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-primary-default-5 rounded-lg">
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display">Cheapest Month</p>
                                            <p className="text-sm font-bold text-header-black font-red-hat-display">
                                                {insightsData.cheapest_month}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display">Most Expensive</p>
                                            <p className="text-sm font-bold text-header-black font-red-hat-display">
                                                {insightsData.most_expensive_month}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-grey_6 rounded-lg">
                                            <div className="flex items-center gap-1.5">
                                                {getTrendIcon()}
                                                <p className="text-xs text-grey-grey_2 font-red-hat-display">Price Trend</p>
                                            </div>
                                            <p className="text-sm font-bold text-header-black font-red-hat-display capitalize">
                                                {insightsData.price_trend}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Cheapest Days to Fly */}
                                {insightsData.best_days_to_fly && insightsData.best_days_to_fly.length > 0 && (
                                    <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar className="w-4 h-4 text-primary-default" />
                                            <h4 className="text-sm font-semibold text-header-black font-red-hat-display">Cheapest Days to Fly</h4>
                                        </div>

                                        {/* Week Grid - Vertical Layout */}
                                        <div className="flex flex-col gap-2 mb-4 flex-1">
                                            {weekData.map((dayData, index) => (
                                                <div
                                                    key={index}
                                                    className={`rounded-lg p-2.5 text-center flex items-center justify-center ${
                                                        dayData.isBestDay
                                                            ? 'bg-primary-default text-white'
                                                            : 'bg-grey_6 text-grey-grey_2'
                                                    }`}>
                                                    <p className={`text-xs font-semibold font-red-hat-display ${
                                                        dayData.isBestDay ? 'text-white' : ''
                                                    }`}>
                                                        {dayData.day}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Booking Window */}
                                        <div className="p-2.5 bg-grey_6 rounded-lg mt-auto">
                                            <div className="flex items-start gap-1.5 mb-1">
                                                <Calendar className="w-3 h-3 text-primary-default flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-grey-grey_2 font-red-hat-display">Booking Window</p>
                                            </div>
                                            <p className="text-xs font-semibold text-header-black font-red-hat-display leading-tight">
                                                {insightsData.best_booking_window}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Card 3: Recommended Airports */}
                                {insightsData.airport_suggestions && (
                                    <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="w-4 h-4 text-primary-default" />
                                            <h4 className="text-sm font-semibold text-header-black font-red-hat-display">Recommended Airports</h4>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {insightsData.airport_suggestions.india_airports && insightsData.airport_suggestions.india_airports.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-grey-grey_2 font-red-hat-display mb-1.5">Departure</p>
                                                    <div className="space-y-1.5">
                                                        {insightsData.airport_suggestions.india_airports.map((airport, index) => (
                                                            <div key={`origin-${index}`} className="p-2 bg-blue-50 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                                                    <p className="text-sm font-bold text-header-black font-red-hat-display">{airport.code}</p>
                                                                </div>
                                                                <p className="text-[10px] text-grey-grey_2 font-red-hat-display leading-tight ml-3.5">
                                                                    {airport.reason}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {insightsData.airport_suggestions.destination_airports && insightsData.airport_suggestions.destination_airports.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-grey-grey_2 font-red-hat-display mb-1.5 mt-2">Arrival</p>
                                                    <div className="space-y-1.5">
                                                        {insightsData.airport_suggestions.destination_airports.map((airport, index) => (
                                                            <div key={`dest-${index}`} className="p-2 bg-green-50 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                                    <p className="text-sm font-bold text-header-black font-red-hat-display">{airport.code}</p>
                                                                </div>
                                                                <p className="text-[10px] text-grey-grey_2 font-red-hat-display leading-tight ml-3.5">
                                                                    {airport.reason}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Card 4: Price-Saving Tips */}
                                {insightsData.tips_and_hacks && insightsData.tips_and_hacks.length > 0 && (
                                    <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lightbulb className="w-4 h-4 text-yellow-600" />
                                            <h4 className="text-sm font-semibold text-header-black font-red-hat-display">Price-Saving Tips</h4>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {insightsData.tips_and_hacks.map((tip, index) => {
                                                // Parse markdown-style links [text](url)
                                                const parseTip = (text: string) => {
                                                    const parts: React.ReactNode[] = []
                                                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
                                                    let lastIndex = 0
                                                    let match

                                                    while ((match = linkRegex.exec(text)) !== null) {
                                                        if (match.index > lastIndex) {
                                                            parts.push(text.substring(lastIndex, match.index))
                                                        }
                                                        parts.push(
                                                            <a
                                                                key={match.index}
                                                                href={match[2]}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary-default hover:text-primary-hover underline">
                                                                {match[1]}
                                                            </a>
                                                        )
                                                        lastIndex = match.index + match[0].length
                                                    }
                                                    if (lastIndex < text.length) {
                                                        parts.push(text.substring(lastIndex))
                                                    }
                                                    return parts.length > 0 ? parts : [text]
                                                }

                                                return (
                                                    <div key={index} className="p-2 bg-primary-default-5 rounded-lg">
                                                        <p className="text-xs text-grey-grey_1 font-red-hat-display leading-snug">
                                                            {parseTip(tip)}
                                                        </p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Card 5: AI Price Forecasts */}
                                {insightsData.ai_insights && insightsData.ai_insights.length > 0 && (
                                    <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Wand className="w-4 h-4 text-primary-default" />
                                            <h4 className="text-sm font-semibold text-header-black font-red-hat-display">AI Price Forecasts</h4>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {insightsData.ai_insights.map((insight, index) => {
                                                const Icon =
                                                    insight.type === 'forecast'
                                                        ? TrendingUp
                                                        : insight.type === 'tip'
                                                          ? Lightbulb
                                                          : AlertCircle
                                                const iconColor =
                                                    insight.type === 'forecast'
                                                        ? 'text-blue-600'
                                                        : insight.type === 'tip'
                                                          ? 'text-yellow-600'
                                                          : 'text-orange-600'
                                                const bgColor =
                                                    insight.type === 'forecast'
                                                        ? 'bg-blue-50'
                                                        : insight.type === 'tip'
                                                          ? 'bg-yellow-50'
                                                          : 'bg-orange-50'
                                                return (
                                                    <div key={index} className={`p-2 rounded-lg ${bgColor}`}>
                                                        <div className="flex items-start gap-2">
                                                            <Icon className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0 mt-0.5`} />
                                                            <p className="text-xs text-grey-grey_1 font-red-hat-display leading-snug flex-1">
                                                                {insight.text}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Card 6: Flight Tips & Guides Videos */}
                                {insightsData.travel_content && insightsData.travel_content.length > 0 && (
                                    <div className="shrink-0 w-[320px] bg-white border border-feature-card-border rounded-xl p-4 flex flex-col min-h-[400px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle className="w-4 h-4 text-primary-default" />
                                            <h4 className="text-sm font-semibold text-header-black font-red-hat-display">Flight Tips & Guides</h4>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {insightsData.travel_content.map((video) => (
                                                <div key={video.id}>
                                                    <FlightVideoCard video={video} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </GenericCarousel>

                            {/* Powered by Rimigo Realtime - Bottom Right */}
                            <div className="flex justify-end pt-3 border-t border-feature-card-border mt-2">
                                <p className="text-[10px] text-grey-grey_2 font-red-hat-display">
                                    Powered by{' '}
                                    <span className="font-semibold text-primary-default">Rimigo Realtime</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default FlightInsightsBox
