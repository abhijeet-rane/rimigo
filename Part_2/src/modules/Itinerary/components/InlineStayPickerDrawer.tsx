import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Hotel,
    Loader2,
    BadgeCheck,
    BedDouble,
    Replace,
    Sparkles,
    Trash2
} from 'lucide-react'
import AddStayToItineraryModal from '@/modules/ContentCollection/components/AddStayToItineraryModal'
import { getAccommodations } from '@/pages/Stays/Apis/accommodationsAPI'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import type { ItineraryStay } from '@/api/itineraryApi'
import { useStayPriceAndDeals } from '@/pages/Stays/hooks/useStayPriceAndDeals'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

/** One row's worth of hotel data the drawer needs to render + launch
 *  the add-stay modal. Built by the parent page (Tripboard / Traveler
 *  Collection Details) from the collection sections + enriched
 *  ``AccommodationMetadataItem`` list, so the drawer never has to
 *  project section metadata itself. */
export interface DrawerHotel {
    id: string
    zentrumHubId: string
    name: string
    bannerImg: string
    ratePerNight: number | null
    cityId: string
    cityName?: string
    isVerified: boolean
}

interface InlineStayPickerDrawerProps {
    isOpen: boolean
    onClose: () => void
    cityId: string
    cityName: string
    /** YMD (YYYY-MM-DD) check-in used by the modal's prefilled dates. */
    checkIn: string
    /** YMD exclusive check-out. */
    checkOut: string
    /**
     * Trip id used by ``useStayPriceAndDeals`` to fetch the live
     * cheapest deal per hotel. Without it the compare-API early-
     * returns an empty deal list and the drawer falls back to
     * rate-on-request.
     */
    tripId?: string
    /**
     * Pre-built hotel list covering every city in the collection.
     * When provided, the drawer filters by ``cityId`` and renders
     * without hitting any additional metadata endpoint. Each row
     * fetches its own live cheapest rate via ``useStayPriceAndDeals``
     * (same hook the Stays-tab cards use).
     */
    drawerHotels?: DrawerHotel[]
    /**
     * When set, the drawer opens in **Change mode**: header reframes
     * from "Pick a hotel" to "Change hotel", a "Currently staying"
     * card lands above the list as an anchor for the replacement, and
     * the current hotel's ``zentrum_hub_id`` is filtered out of the
     * alternatives so the user can't self-replace. When null/undefined
     * the drawer behaves as before (Add mode).
     */
    currentStay?: ItineraryStay | null
    /**
     * Inline "Remove" affordance on the Currently-staying card. Only
     * rendered when the drawer is in Change mode. Fires the same
     * remove-stay flow the chip menu uses so the user doesn't have to
     * back out of the drawer to delete instead of change.
     */
    onRemoveStay?: (stayId: string) => void
}

// ───────────────────────────────────────────────────────────────────────
// Hotel row — compact list item with lazy hover reveal and staggered
// entry. Click anywhere to launch the add-stay modal for this hotel.
// Fetches live cheapest rate + provider per-row via the shared pricing
// hook so the drawer matches the Stays tab's numbers exactly.
// ───────────────────────────────────────────────────────────────────────

interface HotelRowProps {
    hotel: DrawerHotel
    index: number
    checkIn: string
    checkOut: string
    tripId?: string
    onPick: (hotel: DrawerHotel) => void
}

const formatInr = (value: number): string =>
    `₹${Math.round(value).toLocaleString('en-IN')}`

// Pretty-print a platform id. The API returns slugs like "booking",
// "expedia", "agoda"; Title-case them for display.
const formatPlatform = (platform: string): string => {
    if (!platform) return ''
    const words = platform.replace(/[_-]+/g, ' ').split(' ')
    return words
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
}

const HotelRow: React.FC<HotelRowProps> = ({
    hotel,
    index,
    checkIn,
    checkOut,
    tripId,
    onPick
}) => {
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

    const cheapestDeal = useMemo(() => {
        if (!deals || deals.length === 0) return null
        return deals.reduce(
            (cheapest, current) =>
                current.price < cheapest.price ? current : cheapest
        )
    }, [deals])

    const [imageFailed, setImageFailed] = useState(false)

    return (
        <motion.button
            type="button"
            onClick={() => onPick(hotel)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + index * 0.04, duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group font-manrope relative flex w-full cursor-pointer overflow-hidden rounded-xl border border-grey-4 bg-natural-white text-left transition-all hover:border-primary-default/60 hover:shadow-[0_12px_32px_-16px_rgba(125,92,255,0.35)]">
            {/* Left thumbnail with soft gradient veil on hover */}
            <div className="relative h-[88px] w-[104px] shrink-0 overflow-hidden bg-grey-5">
                {hotel.bannerImg && !imageFailed ? (
                    <img
                        src={hotel.bannerImg}
                        alt={hotel.name}
                        onError={() => setImageFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-pale-purple">
                        <Hotel className="h-5 w-5 text-primary-default/50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            {/* Body — dense two-line layout */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <p className="font-red-hat-display line-clamp-1 flex-1 text-[13px] font-bold leading-tight tracking-tight text-header-black">
                        {hotel.name}
                    </p>
                    {hotel.isVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary-default" />
                    )}
                </div>

                {/* Cheapest rate + provider — single flush line */}
                {isDealsLoading ? (
                    <p className="flex items-center gap-1 text-[10px] leading-none text-grey-2">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>Checking rates…</span>
                    </p>
                ) : cheapestDeal ? (
                    <div className="flex items-baseline justify-between gap-2 leading-none">
                        <div className="flex items-baseline gap-1">
                            <span className="text-[9px] text-grey-2">from</span>
                            <span className="font-red-hat-display text-[14px] font-bold text-header-black">
                                {formatInr(cheapestDeal.price)}
                            </span>
                            <span className="text-[9px] text-grey-2">/ night</span>
                        </div>
                        {cheapestDeal.logo_url ? (
                            <img
                                src={cheapestDeal.logo_url}
                                alt={cheapestDeal.platform}
                                className="h-3 w-auto max-w-[44px] object-contain opacity-80"
                            />
                        ) : (
                            <span className="font-caveat text-[13px] leading-none text-primary-default/70">
                                {formatPlatform(cheapestDeal.platform)}
                            </span>
                        )}
                    </div>
                ) : displayPrice > 0 ? (
                    <div className="flex items-baseline gap-1 leading-none">
                        <span className="text-[9px] text-grey-2">from</span>
                        <span className="font-red-hat-display text-[14px] font-bold text-header-black">
                            {formatInr(displayPrice)}
                        </span>
                        <span className="text-[9px] text-grey-2">/ night</span>
                    </div>
                ) : (
                    <p className="text-[10px] leading-none text-grey-2">
                        Rate on request
                    </p>
                )}
            </div>
        </motion.button>
    )
}

// ───────────────────────────────────────────────────────────────────────
// Main drawer
// ───────────────────────────────────────────────────────────────────────

const InlineStayPickerDrawer: React.FC<InlineStayPickerDrawerProps> = ({
    isOpen,
    onClose,
    cityId,
    cityName,
    checkIn,
    checkOut,
    tripId,
    drawerHotels,
    currentStay,
    onRemoveStay
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const isChangeMode = Boolean(currentStay)
    const [selectedHotel, setSelectedHotel] =
        useState<AccommodationMetadataItem | null>(null)

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    // Clear selection when drawer closes so reopening doesn't resurrect
    // the previously-picked hotel's modal.
    useEffect(() => {
        if (!isOpen) setSelectedHotel(null)
    }, [isOpen])

    // Parent-provided curated list filtered by city_id. This is the
    // primary data path when the drawer lives inside a traveler-
    // collection context.
    const curatedHotels = useMemo(() => {
        if (!drawerHotels || drawerHotels.length === 0) return null
        return drawerHotels.filter((h) => h.cityId === cityId)
    }, [drawerHotels, cityId])
    const hasCuratedList = curatedHotels !== null

    // Standalone fallback — hit the curated city accommodations API
    // with the same handpicked threshold the Stays Explore page uses
    // (``min_match_score: 7``) so the drawer surfaces the handpicked
    // set instead of the flat metadata list. Only runs outside a
    // collection context (e.g. the standalone /itinerary route).
    const {
        data: fetchedHotels,
        isLoading: isFetchLoading,
        isError: isFetchError,
        refetch
    } = useQuery({
        queryKey: ['inline-stay-picker-handpicked', cityId, checkIn, checkOut],
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
                limit: 6,
                order_by: { relevance: -1 },
                min_match_score: 7
            })
            return res?.data?.data ?? []
        },
        enabled:
            !hasCuratedList && isOpen && !!cityId && !!checkIn && !!checkOut,
        staleTime: 5 * 60 * 1000
    })

    // Normalise the fallback list into ``DrawerHotel`` rows so both
    // paths feed the same renderer.
    const fallbackHotels = useMemo((): DrawerHotel[] => {
        if (hasCuratedList) return []
        return (fetchedHotels ?? []).map((stay) => ({
            id: stay.id,
            zentrumHubId: stay.zentrum_hub_id || stay.id,
            name: stay.name,
            bannerImg: stay.content?.[0] || '',
            ratePerNight: stay.rate_per_night ?? null,
            cityId,
            cityName,
            isVerified: stay.is_verified === true
        }))
    }, [hasCuratedList, fetchedHotels, cityId, cityName])

    const isLoading = !hasCuratedList && isFetchLoading
    const isError = !hasCuratedList && isFetchError

    const sortedHotels = useMemo((): DrawerHotel[] => {
        const source = curatedHotels ?? fallbackHotels
        // In Change mode, drop the hotel the user is replacing. Selecting
        // it would dead-end into a no-op Replace round-trip in the modal.
        const currentHubId = currentStay?.zentrum_hub_id
        const filtered = currentHubId
            ? source.filter((h) => h.zentrumHubId !== currentHubId)
            : source
        return [...filtered].sort((a, b) => {
            const ra = a.ratePerNight ?? Number.POSITIVE_INFINITY
            const rb = b.ratePerNight ?? Number.POSITIVE_INFINITY
            return ra - rb
        })
    }, [curatedHotels, fallbackHotels, currentStay])

    // When the user picks a hotel we project ``DrawerHotel`` back into
    // the ``AccommodationMetadataItem`` shape the add-stay modal expects.
    const handlePickHotel = (hotel: DrawerHotel) => {
        trackButtonClickCustom({
            buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
            buttonName: POSTHOG_EVENTS.ITINERARY_STAY_HOTEL_PICKED,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { hotel_name: hotel.name, zentrum_hub_id: hotel.zentrumHubId, city_id: cityId, city_name: cityName, is_change_mode: isChangeMode }
        })
        setSelectedHotel({
            id: hotel.id,
            name: hotel.name,
            geo_location: { lat: '0', long: '0' },
            rate_per_night: hotel.ratePerNight,
            banner_img: hotel.bannerImg,
            zentrum_hub_id: hotel.zentrumHubId,
            is_verified: hotel.isVerified
        })
    }

    // When a hotel is picked the confirm modal takes over the viewport as
    // the single focused surface; collapse the drawer so the two don't
    // stack + compete. The modal's onClose clears ``selectedHotel`` and
    // the drawer re-expands, ready for another pick.
    const showList = isOpen && !selectedHotel

    const container =
        typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const drawer = (
        <AnimatePresence>
            {showList && (
                <motion.div
                    className="fixed inset-0 z-[110] font-manrope"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-slate-900/55 to-slate-900/50 backdrop-blur-[2px]"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer panel */}
                    <motion.aside
                        role="dialog"
                        aria-label={
                            isChangeMode
                                ? `Change hotel in ${cityName || 'this city'}`
                                : `Pick a hotel in ${cityName || 'this city'}`
                        }
                        initial={{ x: 48, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 48, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 flex h-full w-[min(440px,92vw)] flex-col overflow-hidden border-l border-grey-4 bg-natural-white shadow-[-24px_0_60px_-12px_rgba(15,23,42,0.28)]">
                        {/* Header — compact, one block. The kicker + caveat
                            swap in Change mode so the drawer visibly reframes
                            from "discover & add" to "decisive swap". */}
                        <div className="relative shrink-0 border-b border-grey-4 bg-[linear-gradient(180deg,#FAFAFC_0%,#FFFFFF_100%)] px-4 pb-3 pt-4">
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-default/6 blur-3xl"
                            />
                            <div className="relative flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        {isChangeMode ? (
                                            <Replace
                                                className="h-3.5 w-3.5 shrink-0 text-primary-default"
                                                strokeWidth={2.5}
                                            />
                                        ) : (
                                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-default" />
                                        )}
                                        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary-default">
                                            {isChangeMode ? 'Change hotel' : 'Pick a hotel'}
                                        </span>
                                    </div>
                                    <h2 className="font-red-hat-display mt-1 line-clamp-1 text-[18px] font-bold leading-[1.1] tracking-tight text-header-black">
                                        {cityName ?? 'Hotels'}
                                        {cityName && (
                                            <span className="font-caveat ml-1.5 text-[15px] font-normal text-primary-default/70">
                                                {isChangeMode ? '— pick a replacement' : '— tap to add'}
                                            </span>
                                        )}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close hotel picker"
                                    className="shrink-0 cursor-pointer rounded-full border border-grey-4 p-1.5 text-grey-1 transition hover:border-primary-default/50 hover:text-primary-default">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-3">
                            {/* Change mode — "Currently staying" anchor card.
                                Sits above the list so the user always has a
                                visual reference for what they're replacing,
                                and carries an inline Remove fast-exit so they
                                can delete without hopping back to the chip
                                menu. */}
                            {isChangeMode && currentStay ? (
                                <div className="mb-3 overflow-hidden rounded-xl border border-primary-default/20 bg-primary-default/[0.05]">
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-default/10 ring-1 ring-primary-default/20">
                                            <BedDouble className="h-4 w-4 text-primary-default" strokeWidth={2.25} />
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-sm bg-primary-default px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                                    Current
                                                </span>
                                                {currentStay.nights ? (
                                                    <span className="text-[10px] font-semibold text-grey-2">
                                                        {currentStay.nights}{' '}
                                                        {currentStay.nights === 1 ? 'night' : 'nights'}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p
                                                className="font-red-hat-display truncate text-[13px] font-bold leading-tight text-header-black"
                                                title={currentStay.hotel_name ?? ''}>
                                                {currentStay.hotel_name ?? 'Current hotel'}
                                            </p>
                                        </div>
                                        {onRemoveStay ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onRemoveStay(currentStay.stay_id)
                                                    onClose()
                                                }}
                                                className="group/remove inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-secondary-red/25 bg-white px-2 py-1 text-secondary-red transition-colors hover:bg-secondary-red/5"
                                                aria-label="Remove hotel from trip">
                                                <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                                                <span className="font-manrope text-[10px] font-bold uppercase tracking-[0.08em]">
                                                    Remove
                                                </span>
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {/* Change mode — quiet section divider. Anchors the
                                "these are what you could swap to" intent
                                without adding another sticky header. */}
                            {isChangeMode && !isLoading && !isError && sortedHotels.length > 0 ? (
                                <div
                                    className="mb-2 flex items-center gap-2 px-1"
                                    aria-hidden="true">
                                    <div className="h-px flex-1 bg-grey-4" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-grey-2">
                                        Alternatives
                                    </span>
                                    <div className="h-px flex-1 bg-grey-4" />
                                </div>
                            ) : null}
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary-default" />
                                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-grey-2">
                                        Finding hotels…
                                    </p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <p className="font-red-hat-display text-[14px] font-bold text-header-black">
                                        Couldn't load hotels
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => refetch()}
                                        className="font-caveat mt-2 cursor-pointer text-[17px] text-primary-default hover:underline">
                                        — try again
                                    </button>
                                </div>
                            ) : sortedHotels.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-grey-5">
                                        <Hotel className="h-6 w-6 text-grey-2" />
                                    </div>
                                    <p className="font-red-hat-display text-[14px] font-bold text-header-black">
                                        No hotels found for{' '}
                                        {cityName ?? 'this city'}
                                    </p>
                                    <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-grey-2">
                                        Try broadening your dates or add a stay
                                        from the Stays tab.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {sortedHotels.map((hotel, idx) => (
                                        <HotelRow
                                            key={hotel.zentrumHubId || hotel.id || idx}
                                            hotel={hotel}
                                            index={idx}
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            tripId={tripId}
                                            onPick={handlePickHotel}
                                        />
                                    ))}
                                    <p className="font-caveat mt-1 text-center text-[14px] leading-none text-grey-2">
                                        — {sortedHotels.length}{' '}
                                        {sortedHotels.length === 1
                                            ? 'hotel'
                                            : 'hotels'}{' '}
                                        in {cityName ?? 'this city'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    )

    // Launch the existing add-stay modal prefilled with the clicked hotel.
    //
    // ``onClose`` = user cancelled; clear the selection so the drawer
    // re-expands and the list is visible for another pick.
    //
    // ``onSuccess`` = add/replace committed; collapse the entire drawer.
    // Otherwise the picker would linger behind the confirm modal and the
    // user would see it on their next add-stay click even though the task
    // is already done.
    const modal = selectedHotel && (
        <AddStayToItineraryModal
            isOpen={!!selectedHotel}
            onClose={() => setSelectedHotel(null)}
            onSuccess={() => {
                setSelectedHotel(null)
                onClose()
            }}
            hotelTitle={selectedHotel.name}
            hotelImage={selectedHotel.banner_img}
            zentrumHubId={selectedHotel.zentrum_hub_id}
            cityId={cityId}
            cityName={cityName}
            pricePerNight={selectedHotel.rate_per_night ?? undefined}
            currency="INR"
            preferredCheckIn={checkIn}
        />
    )

    return (
        <>
            {createPortal(drawer, container)}
            {modal}
        </>
    )
}

export default InlineStayPickerDrawer
