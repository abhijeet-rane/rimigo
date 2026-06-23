import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Hotel, Loader2, BadgeCheck, BedDouble, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAccommodations } from '@/pages/Stays/Apis/accommodationsAPI'
import type { ItineraryStay } from '@/api/itineraryApi'
import { addStayToItinerary, deleteStayFromItinerary } from '@/api/itineraryApi'
import { useStayPriceAndDeals } from '@/pages/Stays/hooks/useStayPriceAndDeals'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'

// ───────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────

interface HotelOption {
    id: string
    zentrumHubId: string
    name: string
    bannerImg: string
    ratePerNight: number | null
    cityId: string
    cityName?: string
    isVerified: boolean
}

interface StayPickerModalProps {
    isOpen: boolean
    onClose: () => void
    cityId: string
    cityName: string
    checkIn: string
    checkOut: string
    tripId?: string
    itineraryId?: string
    currentStay?: ItineraryStay | null
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

const formatInr = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`

const formatPlatform = (platform: string): string => {
    if (!platform) return ''
    return platform
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
}

const nightsBetween = (start: string, end: string): number => {
    if (!start || !end) return 0
    const s = new Date(`${start}T00:00:00Z`).getTime()
    const e = new Date(`${end}T00:00:00Z`).getTime()
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
}

const formatDateShort = (ymd: string): string => {
    if (!ymd) return ''
    const d = new Date(`${ymd}T00:00:00Z`)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ───────────────────────────────────────────────────────────────────────
// Hotel row — compact card with live pricing
// ───────────────────────────────────────────────────────────────────────

interface HotelCardProps {
    hotel: HotelOption
    checkIn: string
    checkOut: string
    tripId?: string
    isAdding: boolean
    onSelect: (hotel: HotelOption) => void
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, checkIn, checkOut, tripId, isAdding, onSelect }) => {
    const { displayPrice, deals, isDealsLoading } = useStayPriceAndDeals({
        zentrumHubId: hotel.zentrumHubId,
        stayName: hotel.name,
        ratePerNight: hotel.ratePerNight,
        cityName: hotel.cityName,
        tripId,
        checkIn,
        checkOut,
        rimigoPrice: false
    })

    // Sort deals by price for display
    const sortedDeals = useMemo(() => {
        if (!deals || deals.length === 0) return []
        return [...deals].sort((a, b) => a.price - b.price)
    }, [deals])

    const cheapestDeal = sortedDeals[0] ?? null

    const [imageFailed, setImageFailed] = useState(false)
    const [slowLoad, setSlowLoad] = useState(false)

    useEffect(() => {
        if (!isDealsLoading) {
            setSlowLoad(false)
            return
        }
        const timer = setTimeout(() => setSlowLoad(true), 5000)
        return () => clearTimeout(timer)
    }, [isDealsLoading])

    return (
        <button
            type="button"
            disabled={isAdding}
            onClick={() => onSelect(hotel)}
            className="group font-manrope relative flex h-[76px] w-full cursor-pointer overflow-hidden rounded-xl border border-grey-4 bg-natural-white text-left transition-all hover:border-primary-default/60 hover:shadow-[0_12px_32px_-16px_rgba(125,92,255,0.25)] disabled:cursor-wait disabled:opacity-60">
            {/* Thumbnail */}
            <div className="relative h-full w-[96px] shrink-0 overflow-hidden bg-grey-5">
                {hotel.bannerImg && !imageFailed ? (
                    <img
                        src={hotel.bannerImg}
                        alt={hotel.name}
                        onError={() => setImageFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-pale-purple">
                        <Hotel className="h-5 w-5 text-primary-default/50" />
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-2.5">
                {/* Row 1: hotel name + provider logo top-right */}
                <div className="flex items-center gap-2">
                    <p className="font-manrope min-w-0 flex-1 truncate text-[12px] font-medium leading-tight text-grey-1">{hotel.name}</p>
                    {!isDealsLoading && cheapestDeal ? (
                        cheapestDeal.logo_url ? (
                            <img
                                src={cheapestDeal.logo_url}
                                alt={cheapestDeal.platform}
                                className="h-[22px] w-auto max-w-[100px] shrink-0 object-contain"
                            />
                        ) : (
                            <span className="shrink-0 text-[11px] font-semibold text-grey-1">{formatPlatform(cheapestDeal.platform)}</span>
                        )
                    ) : hotel.isVerified ? (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary-default" />
                    ) : null}
                </div>

                {/* Row 2: price or loading */}
                {isDealsLoading ? (
                    <p className="flex items-center gap-1.5 text-[12px] leading-none text-grey-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>{slowLoad ? 'Comparing rates (this might take a while)' : 'Comparing rates...'}</span>
                    </p>
                ) : cheapestDeal ? (
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] text-grey-2">from</span>
                        <span className="font-red-hat-display text-[16px] font-bold leading-none text-header-black">
                            {formatInr(cheapestDeal.price)}
                        </span>
                        <span className="text-[10px] text-grey-2">/ night</span>
                    </div>
                ) : displayPrice > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-grey-2">from</span>
                        <span className="font-red-hat-display text-[17px] font-bold leading-none text-header-black">{formatInr(displayPrice)}</span>
                        <span className="text-[11px] text-grey-2">/ night</span>
                    </div>
                ) : null}
            </div>
        </button>
    )
}

// ───────────────────────────────────────────────────────────────────────
// Main modal
// ───────────────────────────────────────────────────────────────────────

const StayPickerModal: React.FC<StayPickerModalProps> = ({
    isOpen,
    onClose,
    cityId,
    cityName,
    checkIn,
    checkOut,
    tripId,
    itineraryId: itineraryIdProp,
    currentStay
}) => {
    const queryClient = useQueryClient()
    const ctx = useOptionalTravelerTrips()
    const activeItineraryId = itineraryIdProp || ctx?.activeTrip?.tripItinerary?.id
    const [isSubmitting, setIsSubmitting] = useState(false)
    const nights = nightsBetween(checkIn, checkOut)

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    // Fetch handpicked hotels for the city
    const {
        data: fetchedHotels,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['stay-picker-modal', cityId, checkIn, checkOut],
        queryFn: async () => {
            const res = await getAccommodations({
                cityId,
                check_in_date: checkIn,
                check_out_date: checkOut,
                travel_purpose: 'leisure_relaxation',
                group_type: 'solo_traveler',
                city_preferences: ['station_nearby', 'city_center', 'nightlife'],
                include_hot_picks: true,
                page: 1,
                limit: 8,
                order_by: { relevance: -1 },
                min_match_score: 7
            })
            return res?.data?.data ?? []
        },
        enabled: isOpen && !!cityId && !!checkIn && !!checkOut,
        staleTime: 5 * 60 * 1000
    })

    const hotels = useMemo((): HotelOption[] => {
        const source = fetchedHotels ?? []
        // Filter out current hotel so user can't self-replace
        const currentHubId = currentStay?.zentrum_hub_id
        const filtered = currentHubId ? source.filter((s) => s.zentrum_hub_id !== currentHubId) : source
        return filtered
            .map((stay) => ({
                id: stay.id,
                zentrumHubId: stay.zentrum_hub_id || stay.id,
                name: stay.name,
                bannerImg: stay.content?.[0] || '',
                ratePerNight: stay.rate_per_night ?? null,
                cityId,
                cityName,
                isVerified: stay.is_verified === true
            }))
            .sort((a, b) => {
                const ra = a.ratePerNight ?? Number.POSITIVE_INFINITY
                const rb = b.ratePerNight ?? Number.POSITIVE_INFINITY
                return ra - rb
            })
    }, [fetchedHotels, cityId, cityName, currentStay])

    const handleSelect = async (hotel: HotelOption) => {
        if (!activeItineraryId || isSubmitting) return
        setIsSubmitting(true)
        try {
            await addStayToItinerary(activeItineraryId, {
                zentrum_hub_id: hotel.zentrumHubId,
                city_id: cityId,
                check_in_date: checkIn,
                check_out_date: checkOut,
                currency: 'INR'
            })
            await queryClient.invalidateQueries({
                queryKey: ['itineraryCompleted', activeItineraryId]
            })
            // Bug 7 — invalidate budget so Budget Tab auto-updates after add.
            await queryClient.invalidateQueries({
                queryKey: ['tripBudget']
            })
            toast.success(hotel.name, {
                description: `${nights} ${nights === 1 ? 'night' : 'nights'} added to ${cityName ?? 'your trip'}`
            })
            onClose()
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not add this stay'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemove = async () => {
        if (!activeItineraryId || !currentStay || isSubmitting) return
        setIsSubmitting(true)
        try {
            await deleteStayFromItinerary(activeItineraryId, currentStay.stay_id)
            await queryClient.invalidateQueries({
                queryKey: ['itineraryCompleted', activeItineraryId]
            })
            // Bug 7 — invalidate budget so Budget Tab auto-updates after delete.
            await queryClient.invalidateQueries({
                queryKey: ['tripBudget']
            })
            toast.success('Hotel removed from itinerary')
            onClose()
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not remove stay'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 font-manrope"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}>
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-label={`Hotels in ${cityName || 'this city'}`}
                        initial={{ scale: 0.96, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0, y: 12 }}
                        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex w-full max-w-[480px] max-h-[min(640px,85vh)] flex-col overflow-hidden rounded-2xl border border-grey-4 bg-natural-white shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)]">
                        {/* Header */}
                        <div className="shrink-0 border-b border-grey-4 bg-[linear-gradient(180deg,#FAFAFC_0%,#FFFFFF_100%)] px-5 pb-3.5 pt-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-red-hat-display line-clamp-1 text-[18px] font-bold leading-[1.1] tracking-tight text-header-black">
                                        Hotels in {cityName ?? 'this city'}
                                    </h2>
                                    <p className="mt-1 text-[12px] font-medium text-grey-2">
                                        {formatDateShort(checkIn)} → {formatDateShort(checkOut)}
                                        {nights > 0 && (
                                            <span className="ml-1.5 text-grey-3">
                                                · {nights} {nights === 1 ? 'night' : 'nights'}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="shrink-0 cursor-pointer rounded-full border border-grey-4 p-1.5 text-grey-1 transition hover:border-primary-default/50 hover:text-primary-default">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-3">
                            {/* Current stay card */}
                            {currentStay ? (
                                <div className="mb-3 overflow-hidden rounded-xl border border-primary-default/20 bg-primary-default/[0.04]">
                                    <div className="flex items-center gap-3 px-3.5 py-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-default/10">
                                            <BedDouble
                                                className="h-4 w-4 text-primary-default"
                                                strokeWidth={2.25}
                                            />
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-sm bg-primary-default px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                                    Current
                                                </span>
                                                {currentStay.nights ? (
                                                    <span className="text-[10px] font-semibold text-grey-2">
                                                        {currentStay.nights} {currentStay.nights === 1 ? 'night' : 'nights'}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="font-red-hat-display truncate text-[13px] font-bold leading-tight text-header-black">
                                                {currentStay.hotel_name ?? 'Current hotel'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={handleRemove}
                                            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-secondary-red/25 bg-white px-2 py-1 text-secondary-red transition-colors hover:bg-secondary-red/5 disabled:cursor-wait disabled:opacity-50"
                                            aria-label="Remove hotel">
                                            <Trash2
                                                className="h-3 w-3"
                                                strokeWidth={2.25}
                                            />
                                            <span className="font-manrope text-[10px] font-bold uppercase tracking-[0.08em]">Remove</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {/* Section divider when current stay exists */}
                            {currentStay && !isLoading && !isError && hotels.length > 0 ? (
                                <div
                                    className="mb-2.5 flex items-center gap-2 px-0.5"
                                    aria-hidden="true">
                                    <div className="h-px flex-1 bg-grey-4" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-grey-2">Alternatives</span>
                                    <div className="h-px flex-1 bg-grey-4" />
                                </div>
                            ) : null}

                            {/* Hotel list */}
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary-default" />
                                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-grey-2">Finding hotels...</p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <p className="font-red-hat-display text-[14px] font-bold text-header-black">Couldn't load hotels</p>
                                    <button
                                        type="button"
                                        onClick={() => refetch()}
                                        className="font-manrope mt-2 cursor-pointer text-[13px] font-semibold text-primary-default hover:underline">
                                        try again
                                    </button>
                                </div>
                            ) : hotels.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-grey-5">
                                        <Hotel className="h-6 w-6 text-grey-2" />
                                    </div>
                                    <p className="font-red-hat-display text-[14px] font-bold text-header-black">No hotels found</p>
                                    <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-grey-2">
                                        Try broadening your dates or check the Stays tab for more options.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {hotels.map((hotel, idx) => (
                                        <motion.div
                                            key={hotel.zentrumHubId || hotel.id || idx}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 + idx * 0.03, duration: 0.24 }}>
                                            <HotelCard
                                                hotel={hotel}
                                                checkIn={checkIn}
                                                checkOut={checkOut}
                                                tripId={tripId}
                                                isAdding={isSubmitting}
                                                onSelect={handleSelect}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        container
    )
}

export default StayPickerModal
