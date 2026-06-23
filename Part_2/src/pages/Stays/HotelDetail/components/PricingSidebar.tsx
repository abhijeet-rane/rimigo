import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { useSearchParams } from 'react-router-dom'
import { WhenModal } from '@/components/common/SearchBar/modals/WhenModal'
import { GuestsModal, type GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import { useHotelDeals } from '@/hooks/useHotelDeals'
import PriceComparisonCard from './PriceComparisonCard'
import { toast } from 'sonner'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUserInfo } from '@/hooks/useUserInfo'

interface PricingSidebarProps {
    hotelData: HotelDetailData
    checkIn: string
    checkOut: string
    affiliateAgodaUrl?: string
    /** When false, disables auto-fetch on mount and input-change re-fetch. Use for hidden/inactive instances. */
    active?: boolean
}

export interface PricingSidebarRef {
    findCheapestDeal: () => void
}

export const PricingSidebar = forwardRef<PricingSidebarRef, PricingSidebarProps>(({ hotelData, checkIn, checkOut, active = true }, ref) => {
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const { trackButtonClickCustom } = usePostHog()
    const isMobile = useIsMobile()
    const { user, isRimigoInternal } = useUserInfo()
    const isUserInfoLoaded = !!user

    // Local reactive state for deals inputs (initialized from URL or props)
    const [dealCheckIn, setDealCheckIn] = useState<string>(searchParams.get('check_in') || checkIn || '')
    const [dealCheckOut, setDealCheckOut] = useState<string>(searchParams.get('check_out') || checkOut || '')
    const [dealAdults, setDealAdults] = useState<number>(parseInt(searchParams.get('adults') || '2', 10))
    const [dealChildren, setDealChildren] = useState<number>(parseInt(searchParams.get('children') || '0', 10))
    const [dealInfants, setDealInfants] = useState<number>(parseInt(searchParams.get('infants') || '0', 10))
    const [dealChildrenAges, setDealChildrenAges] = useState<number[]>(
        (searchParams.get('children_age') || '')
            .split(',')
            .filter(Boolean)
            .map((a) => parseInt(a, 10))
            .filter((n) => !Number.isNaN(n))
    )
    const [dealRooms, setDealRooms] = useState<number>(parseInt(searchParams.get('rooms') || '1', 10) || 1)

    // Modals state
    const [isWhenOpen, setIsWhenOpen] = useState(false)
    const [isGuestsOpen, setIsGuestsOpen] = useState(false)

    // Price comparison state (using SSE-based hook)
    const { fetchSingleDeal, loading: dealsLoading, deals, clearDeals } = useHotelDeals()
    const [showPriceComparison, setShowPriceComparison] = useState(false)
    const [usedFallbackSetup, setUsedFallbackSetup] = useState(false)
    const zentrumHubId = searchParams.get('zentrum_hub_id') || ''
    const cityName = searchParams.get('city_name') || ''
    const isLoadingPrices = Boolean(dealsLoading[zentrumHubId])
    const platforms = deals[zentrumHubId] ?? []

    // Sync from props/URL changes
    useEffect(() => {
        setDealCheckIn(searchParams.get('check_in') || checkIn || '')
        setDealCheckOut(searchParams.get('check_out') || checkOut || '')
        setDealAdults(parseInt(searchParams.get('adults') || '2', 10))
        setDealChildren(parseInt(searchParams.get('children') || '0', 10))
        setDealInfants(parseInt(searchParams.get('infants') || '0', 10))
        const ages = (searchParams.get('children_age') || '')
            .split(',')
            .filter(Boolean)
            .map((a) => parseInt(a, 10))
            .filter((n) => !Number.isNaN(n))
        setDealChildrenAges(ages)
        setDealRooms(parseInt(searchParams.get('rooms') || '1', 10) || 1)
    }, [searchParams, checkIn, checkOut])

    const guestsSummary = (() => {
        const parts: string[] = []
        parts.push(`${dealAdults} adult${dealAdults === 1 ? '' : 's'}`)
        if (dealChildren > 0) parts.push(`${dealChildren} child${dealChildren === 1 ? '' : 'ren'}`)
        if (dealInfants > 0) parts.push(`${dealInfants} infant${dealInfants === 1 ? '' : 's'}`)
        return parts.join(', ') || 'Add guests'
    })()

    // When rooms change, ensure at least 1 adult per room
    const handleRoomsChange = (newRooms: number) => {
        const clamped = Math.max(1, Math.min(9, newRooms))
        setDealRooms(clamped)
        if (dealAdults < clamped) {
            setDealAdults(clamped)
        }
    }

    // WhenModal driving state
    const [selectedDates, setSelectedDates] = useState<{ checkIn?: Date; checkOut?: Date }>(() => ({
        checkIn: dealCheckIn ? new Date(dealCheckIn) : undefined,
        checkOut: dealCheckOut ? new Date(dealCheckOut) : undefined
    }))
    const [currentMonth, setCurrentMonth] = useState<Date>(() => (dealCheckIn ? new Date(dealCheckIn) : new Date()))
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

    const formatYmd = (d: Date) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    const onDateClick = (date: Date) => {
        const { checkIn: ci, checkOut: co } = selectedDates
        if (!ci || (ci && co)) {
            setSelectedDates({ checkIn: date, checkOut: undefined })
        } else if (ci && !co) {
            if (date < ci) {
                setSelectedDates({ checkIn: date, checkOut: ci })
                setDealCheckIn(formatYmd(date))
                setDealCheckOut(formatYmd(ci))
                setIsWhenOpen(false)
            } else if (date.getTime() === ci.getTime()) {
                const out = new Date(ci)
                out.setDate(out.getDate() + 1)
                setSelectedDates({ checkIn: ci, checkOut: out })
                setDealCheckIn(formatYmd(ci))
                setDealCheckOut(formatYmd(out))
                setIsWhenOpen(false)
            } else {
                setSelectedDates({ checkIn: ci, checkOut: date })
                setDealCheckIn(formatYmd(ci))
                setDealCheckOut(formatYmd(date))
                setIsWhenOpen(false)
            }
        }
    }
    const onNavigateMonth = (direction: 'prev' | 'next') => {
        setSlideDirection(direction === 'prev' ? 'right' : 'left')
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'prev' ? -1 : 1), 1))
    }
    const isPrevDisabled = () => {
        const today = new Date()
        const firstOfCurrent = new Date(today.getFullYear(), today.getMonth(), 1)
        return currentMonth <= firstOfCurrent
    }

    const onApplyGuests = (data: GuestsData) => {
        setDealAdults(data.adults)
        setDealChildren(data.children)
        setDealInfants(data.infants)
        setDealChildrenAges(data.children_age)
        // If adults dropped below rooms, reduce rooms to match
        if (data.adults < dealRooms) {
            setDealRooms(data.adults)
        }
        setIsGuestsOpen(false)
    }

    const handleFindCheapest = useCallback(async () => {
        // Validate required fields
        if (!dealCheckIn || !dealCheckOut) {
            toast.error('Please select check-in and check-out dates', { position: 'bottom-center' })
            return
        }

        if (!zentrumHubId) {
            toast.error('Hotel information is missing', { position: 'bottom-center' })
            return
        }
        trackButtonClickCustom({
            buttonPage: 'stay_detail_v1',
            buttonName: 'find_cheapest_deal',
            buttonAction: 'price_compare_click',
            extra: {
                check_in: dealCheckIn,
                check_out: dealCheckOut,
                adults: dealAdults,
                children: dealChildren
            }
        })
        // Show comparison card
        setShowPriceComparison(true)
        setUsedFallbackSetup(false)

        try {
            // Use SSE-based fetch (fallback is handled internally)
            const result = await fetchSingleDeal({
                zentrumHubId,
                hotelName: hotelData.hotel_name,
                city: cityName,
                checkIn: dealCheckIn,
                checkOut: dealCheckOut,
                adults: dealAdults,
                children: dealChildren,
                childAges: dealChildrenAges,
                tripId: activeTrip?.trip_id || '',
                noOfRooms: dealRooms,
                rimigoPrice: isRimigoInternal
            })

            if (!result || result.length === 0) {
                toast.error('No prices available at this time', { position: 'bottom-center' })
                setShowPriceComparison(false)
            }
        } catch (error) {
            console.error('Error fetching hotel prices:', error)
            toast.error('Failed to compare prices. Please try again.', { position: 'bottom-center' })
            setShowPriceComparison(false)
        }
    }, [
        dealCheckIn,
        dealCheckOut,
        zentrumHubId,
        dealAdults,
        dealChildren,
        dealChildrenAges,
        dealInfants,
        dealRooms,
        hotelData.hotel_name,
        cityName,
        activeTrip?.trip_id,
        trackButtonClickCustom,
        fetchSingleDeal,
        isRimigoInternal
    ])

    useImperativeHandle(
        ref,
        () => ({
            findCheapestDeal: handleFindCheapest
        }),
        [handleFindCheapest]
    )

    // Auto-fetch deals once on mount when dates and hotel ID are available
    const hasAutoFetchedRef = useRef(false)
    useEffect(() => {
        if (!active || hasAutoFetchedRef.current) return
        // Wait for user info before the first fetch — `isRimigoInternal` flips from
        // false→true once the async load resolves, and we need the correct value baked
        // into the request so the backend appends the Rimigo price.
        if (!isUserInfoLoaded) return
        if (dealCheckIn && dealCheckOut && zentrumHubId) {
            hasAutoFetchedRef.current = true
            handleFindCheapest()
        }
    }, [active, dealCheckIn, dealCheckOut, zentrumHubId, handleFindCheapest, isUserInfoLoaded])

    // Re-fetch when inputs change (from SearchHeader search on desktop or mobile)
    // Debounced to avoid double-calls when multiple states update together (e.g. guests + rooms)
    const prevInputsRef = useRef('')
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        const inputsKey = `${dealCheckIn}|${dealCheckOut}|${dealAdults}|${dealChildren}|${dealInfants}|${dealRooms}|${JSON.stringify(dealChildrenAges)}`
        // Skip first render (handled by auto-fetch above)
        if (!prevInputsRef.current) {
            prevInputsRef.current = inputsKey
            return
        }
        // Re-trigger whenever inputs actually change (user searched with new values)
        if (active && inputsKey !== prevInputsRef.current && dealCheckIn && dealCheckOut && zentrumHubId) {
            prevInputsRef.current = inputsKey
            // Clear any pending refetch to debounce rapid state changes
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
            refetchTimerRef.current = setTimeout(() => {
                clearDeals()
                setShowPriceComparison(true)
                setUsedFallbackSetup(false)
                fetchSingleDeal({
                    zentrumHubId,
                    hotelName: hotelData.hotel_name,
                    city: cityName,
                    checkIn: dealCheckIn,
                    checkOut: dealCheckOut,
                    adults: dealAdults,
                    children: dealChildren,
                    childAges: dealChildrenAges,
                    tripId: activeTrip?.trip_id || '',
                    noOfRooms: dealRooms,
                    rimigoPrice: isRimigoInternal
                }).then((result) => {
                    if (!result || result.length === 0) {
                        setShowPriceComparison(false)
                    }
                }).catch(() => {
                    setShowPriceComparison(false)
                })
            }, 100)
        } else {
            prevInputsRef.current = inputsKey
        }
        return () => {
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dealCheckIn, dealCheckOut, dealAdults, dealChildren, dealInfants, dealRooms, JSON.stringify(dealChildrenAges)])

    const handleClosePriceComparison = () => {
        setShowPriceComparison(false)
        clearDeals()
        setUsedFallbackSetup(false)
    }

    return (
        <div className="md:col-span-1 mt-6">
            {/* Show price comparison or normal pricing card */}
            {showPriceComparison ? (
                <PriceComparisonCard
                    platforms={platforms}
                    isLoading={isLoadingPrices}
                    onClose={handleClosePriceComparison}
                    usedFallbackSetup={usedFallbackSetup}
                />
            ) : (
                <div
                    className="rounded-2xl shadow-sm border border-feature-card-border bg-white p-5 max-md:p-4"
                    style={{ boxShadow: '0 2px 8px 0 var(--grey-5, #F8F8F8)' }}>
                    <div className="flex flex-col gap-2 items-start justify-between">
                        <div className="flex flex-wrap gap-1 items-start justify-between w-full">
                            <div
                                style={{
                                    color: 'var(--grey-0, #101010)',
                                    fontFamily: 'Red Hat Display',
                                    fontSize: '16px',
                                    fontStyle: 'normal',
                                    fontWeight: 550 as any,
                                    lineHeight: '20px',
                                    letterSpacing: '-0.16px'
                                }}>
                                Find the best deals
                            </div>
                            <div className="flex items-center gap-1">
                                {(hotelData.review_data?.ratings?.top_platforms || []).slice(0, 4).map((p) => (
                                    <img
                                        key={p.platform}
                                        src={p.logo_url}
                                        alt={p.platform}
                                        className="h-5 w-5 object-contain rounded-sm"
                                    />
                                ))}
                            </div>
                        </div>
                        <div
                            style={{
                                color: 'var(--grey-1, #363636)',
                                fontFamily: 'Manrope',
                                fontSize: '12px',
                                fontStyle: 'normal',
                                fontWeight: 400 as any,
                                lineHeight: '16px',
                                letterSpacing: '-0.12px'
                            }}>
                            We've compared rates across platforms, so you don't have to!
                        </div>
                    </div>

                    {/* Date & Rooms Card — matches Figma node 8309:22269 */}
                    <div className="mt-4 rounded-2xl border border-[var(--grey-4,#e0e0e0)] overflow-hidden bg-white">
                        {/* CHECK-IN / CHECK-OUT row */}
                        <div className="flex items-center border-b border-[var(--grey-4,#e0e0e0)]">
                            <button
                                type="button"
                                className="cursor-pointer flex-1 border-r border-[var(--grey-4,#e0e0e0)] px-4 py-3 text-left"
                                onClick={() => setIsWhenOpen(true)}>
                                <p
                                    className="mb-2"
                                    style={{
                                        fontFamily: 'Red Hat Display',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        lineHeight: '16px',
                                        letterSpacing: '-0.12px',
                                        color: 'var(--grey-2, #747474)'
                                    }}>
                                    CHECK-IN
                                </p>
                                <p
                                    style={{
                                        fontFamily: 'Manrope',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        letterSpacing: '-0.32px',
                                        color: 'var(--grey-0, #101010)'
                                    }}>
                                    {dealCheckIn || 'Add date'}
                                </p>
                            </button>
                            <button
                                type="button"
                                className="cursor-pointer flex-1 px-4 py-3 text-left"
                                onClick={() => setIsWhenOpen(true)}>
                                <p
                                    className="mb-2"
                                    style={{
                                        fontFamily: 'Red Hat Display',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        lineHeight: '16px',
                                        letterSpacing: '-0.12px',
                                        color: 'var(--grey-2, #747474)'
                                    }}>
                                    CHECK-OUT
                                </p>
                                <p
                                    style={{
                                        fontFamily: 'Manrope',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        letterSpacing: '-0.32px',
                                        color: 'var(--grey-0, #101010)'
                                    }}>
                                    {dealCheckOut || 'Add date'}
                                </p>
                            </button>
                        </div>

                        {/* GUESTS | ROOMS row — side by side like CHECK-IN | CHECK-OUT */}
                        <div className="flex items-stretch">
                            <button
                                type="button"
                                className="cursor-pointer flex-1 border-r border-[var(--grey-4,#e0e0e0)] px-4 py-3 text-left"
                                onClick={() => setIsGuestsOpen(true)}>
                                <p
                                    className="mb-2"
                                    style={{
                                        fontFamily: 'Red Hat Display',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        lineHeight: '16px',
                                        letterSpacing: '-0.12px',
                                        color: 'var(--grey-2, #747474)'
                                    }}>
                                    GUESTS
                                </p>
                                <p
                                    className="truncate max-md:text-[14px]"
                                    style={{
                                        fontFamily: 'Manrope',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        letterSpacing: '-0.32px',
                                        color: 'var(--grey-0, #101010)'
                                    }}>
                                    {guestsSummary}
                                </p>
                            </button>
                            <div className="flex-1 flex flex-col gap-2 px-4 py-3">
                                <p
                                    style={{
                                        fontFamily: 'Red Hat Display',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        lineHeight: '16px',
                                        letterSpacing: '-0.12px',
                                        color: 'var(--grey-2, #747474)'
                                    }}>
                                    ROOMS
                                </p>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleRoomsChange(dealRooms - 1)}
                                        disabled={dealRooms <= 1}
                                        className={`w-7 h-7 flex items-center justify-center transition-colors ${
                                            dealRooms <= 1
                                                ? 'rounded-full border border-[var(--grey-4,#e0e0e0)] bg-[var(--grey-5,#f8f8f8)] cursor-not-allowed opacity-40'
                                                : 'rounded-full border border-[var(--primary-default,#7011F6)] bg-white text-[var(--primary-default,#7011F6)] hover:bg-[var(--primary-default-80,#f3e8ff)] cursor-pointer'
                                        }`}>
                                        <span className="text-sm font-medium leading-none">−</span>
                                    </button>
                                    <span
                                        className="w-5 text-center"
                                        style={{
                                            fontFamily: 'Manrope',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            letterSpacing: '-0.32px',
                                            color: 'var(--grey-0, #101010)'
                                        }}>
                                        {dealRooms}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRoomsChange(dealRooms + 1)}
                                        disabled={dealRooms >= 9}
                                        className={`w-7 h-7 flex items-center justify-center transition-colors ${
                                            dealRooms >= 9
                                                ? 'rounded-full border border-[var(--grey-4,#e0e0e0)] bg-[var(--grey-5,#f8f8f8)] cursor-not-allowed opacity-40'
                                                : 'rounded-full border border-[var(--primary-default,#7011F6)] bg-white text-[var(--primary-default,#7011F6)] hover:bg-[var(--primary-default-80,#f3e8ff)] cursor-pointer'
                                        }`}>
                                        <span className="text-sm font-medium leading-none">+</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            handleFindCheapest()
                        }}
                        disabled={!dealCheckIn || !dealCheckOut}
                        className={`mt-4 w-full transition-opacity max-md:text-[13px] max-md:py-3 ${!dealCheckIn || !dealCheckOut ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                        style={{
                            color: 'var(--full-white, #FFF)',
                            fontFamily: 'Red Hat Display',
                            fontSize: '14px',
                            fontStyle: 'normal',
                            fontWeight: 645 as any,
                            lineHeight: '16px',
                            letterSpacing: '-0.14px',
                            display: 'flex',
                            padding: '16px 10px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            alignSelf: 'stretch',
                            borderRadius: '12px',
                            background: 'linear-gradient(89deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)',
                            boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.12)'
                        }}>
                        FIND CHEAPEST DEAL ONLINE
                    </button>
                </div>
            )}

            {/* Modals */}
            <div className={`absolute max-md:left-0 max-md:right-0 max-md:w-full max-md:z-[100] ${isWhenOpen ? 'md:left-[60px] md:top-[230px]' : 'md:right-[80%] md:top-[300px]'}`}>
                <WhenModal
                    isOpen={isWhenOpen}
                    onClose={() => setIsWhenOpen(false)}
                    selectedDates={selectedDates}
                    currentMonth={currentMonth}
                    slideDirection={slideDirection}
                    onDateClick={onDateClick}
                    onNavigateMonth={onNavigateMonth}
                    isPrevDisabled={isPrevDisabled}
                    type="date_range"
                    allowScrollBehind={!isMobile}
                    usePortal={isMobile}
                />
                <GuestsModal
                    isOpen={isGuestsOpen}
                    onClose={() => setIsGuestsOpen(false)}
                    initialData={{ adults: dealAdults, children: dealChildren, infants: dealInfants, children_age: dealChildrenAges }}
                    onApply={onApplyGuests}
                    allowScrollBehind={!isMobile}
                    usePortal={isMobile}
                />
            </div>
        </div>
    )
})

PricingSidebar.displayName = 'PricingSidebar'
