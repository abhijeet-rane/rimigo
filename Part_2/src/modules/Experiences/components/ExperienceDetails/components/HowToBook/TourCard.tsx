import { useMemo, useState } from 'react'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import { SVG_ICON_STAR } from '@/constants/icons/svgUrls'
import { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import { ArrowUpRight, Settings2 } from 'lucide-react'
import CustomShimmer from '@/components/shared/Shimmer'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useUserInfo, UserInfo } from '@/hooks/useUserInfo'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GA_EVENTS, GA_EVENT_CATEGORIES } from '@/constants/googleAnalytics'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { appendDateToTourLink } from '@/modules/Experiences/utils/tourLinkUtils'
import { createGuardedAffiliateWindowOpen } from '@/utils/guardedAffiliateWindowOpen'
import { useCollectionIdentifier, useTripOwnerName, useTourPriceOverride } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import TourCuratePopover from '@/modules/Tripboard/components/TourCuratePopover'

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
    getyourguide: 'GetYourGuide',
    tripadvisor: 'Tripadvisor',
    klook: 'Klook',
    headout: 'Headout',
    viator: 'Viator',
    booking: 'Booking.com',
    google: 'Google'
}

const formatPlatformDisplayName = (name: string): string => {
    return PLATFORM_DISPLAY_NAMES[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1)
}

// for minutes - send min
// for hours - send hour
const formatMinutes = (value: number) => {
    const hours = Math.floor(value / 60)
    const mins = value % 60
    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (mins > 0) parts.push(`${mins}m`)
    if (parts.length === 0) parts.push('0m')
    return parts.join(' ')
}

const formatDuration = (duration: { min_duration: number | string; max_duration: number | string; unit: string | null }) => {
    if (!duration.min_duration || !duration.max_duration || !duration.unit) return ''

    const unit = duration.unit?.toLowerCase() || ''
    const minNum = Number(duration.min_duration)
    const maxNum = Number(duration.max_duration)
    if (!Number.isFinite(minNum) || !Number.isFinite(maxNum)) return ''

    const isMinutes = unit.includes('minute') || unit.includes('millisec') || unit === 'ms'
    const isHours = unit.includes('hour')

    if (isMinutes) {
        const minLabel = formatMinutes(minNum)
        const maxLabel = formatMinutes(maxNum)
        return minNum === maxNum ? minLabel : `${minLabel} - ${maxLabel}`
    }

    if (isHours) {
        if (minNum === maxNum) return `${minNum}h`
        return `${minNum}h - ${maxNum}h`
    }

    return ''
}

const formatPriceDisplay = (price: { min_price: number | null; currency: string | null } | null): string => {
    if (!price || price.min_price == null) return ''
    const amount = Number(price.min_price)
    if (!Number.isFinite(amount)) return ''

    // Comma-separated currency string (no decimals per current design)
    const formattedAmount = amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return price.currency ? `${price.currency} ${formattedAmount}` : formattedAmount
}

type TourTagType = 'recommended_for_you' | 'recommended' | 'cheapest' | 'top_pick'

const TourCard = ({
    tour,
    isPolling = false,
    triggerType,
    userInfo,
    tagType,
    checkIn,
    containerClassName,
    experienceId,
    onCurate
}: {
    tour: AdaptedTourResponseType
    isPolling?: boolean
    triggerType: string
    userInfo?: UserInfo | null
    tagType?: TourTagType
    checkIn?: string | null // Check-in date in YYYY-MM-DD format
    containerClassName?: string
    experienceId?: string
    /**
     * When provided, the curate button delegates to this instead of opening TourCard's
     * own popover. Lets a parent (e.g. HorizontalListCard) host a single curate popover
     * that survives tour-list reordering — toggling a recommendation reorders the list
     * and remounts this card, which would otherwise close an inline popover.
     */
    onCurate?: (tour: AdaptedTourResponseType) => void
}) => {
    // Hooks first (rules-of-hooks: must be unconditional, before any early return).
    const { isRimigoInternal } = useUserInfo()
    const collectionIdentifier = useCollectionIdentifier()
    const tripOwnerName = useTripOwnerName()
    // Per-tripboard price override set by an internal user. When present it re-prices this card
    // so what the traveler sees matches the budget tab (which applies the same override server-side).
    const priceOverride = useTourPriceOverride(experienceId, tour?.id)
    // Internal curators see "FOR {NAME}" so they know who they recommended this tour for;
    // regular travelers (the recipient) see "FOR YOU".
    const personalRecLabel = isRimigoInternal && tripOwnerName ? `FOR ${tripOwnerName.toUpperCase()}` : 'FOR YOU'
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()
    const travelerTripsContext = useOptionalTravelerTrips()
    const [isCurateOpen, setIsCurateOpen] = useState(false)

    const linkWithDate = useMemo(() => {
        if (!tour?.link || !checkIn) return tour?.link ?? null
        return appendDateToTourLink(tour.link, tour.platform_name, checkIn)
    }, [tour?.link, tour?.platform_name, checkIn])

    if (!tour) return null
    const { name, platform_name, is_recommended, is_personally_recommended, duration, rating, price, link, cancellation_policy } = tour
    const canStaffToggle = isRimigoInternal && !!experienceId
    const activeTrip = travelerTripsContext?.activeTrip

    const platformLogoURL = getPlatformLogoURL(platform_name)
    // An override re-prices the card without touching tour selection (mirrors the budget). It also
    // gives a price to a tour that has none yet, so the card shows the curated number immediately.
    const effectivePrice = priceOverride
        ? {
              min_price: priceOverride.price,
              max_price: priceOverride.price,
              currency: priceOverride.currency ?? price?.currency ?? null,
              price_type: price?.price_type ?? null
          }
        : price
    // show unit aslo
    const formattedDuration = duration && duration.min_duration && duration.max_duration ? formatDuration(duration) : ''
    const formattedRating = rating ? `${rating.toFixed(1)}` : ''
    const formattedPrice = formatPriceDisplay(effectivePrice)
    const formattedPriceType = effectivePrice && effectivePrice.price_type ? `${effectivePrice.price_type}` : ''
    const hasPrice = Boolean(formattedPrice)
    const isKlook = platform_name?.toLowerCase() === 'klook'

    // Show shimmer for price while we're still polling and price is missing (except Klook)
    const showPriceShimmer = isPolling && !hasPrice && !isKlook

    // Get tag styling based on tag type — solid fills, white text.
    const getTagStyles = (type: TourTagType) => {
        switch (type) {
            case 'recommended_for_you':
                return {
                    bgColor: 'bg-primary-default',
                    textColor: 'text-white',
                    label: personalRecLabel
                }
            case 'recommended':
                return {
                    bgColor: 'bg-primary-default',
                    textColor: 'text-white',
                    label: 'RECOMMENDED'
                }
            case 'cheapest':
                return {
                    bgColor: 'bg-secondary-green',
                    textColor: 'text-white',
                    label: 'CHEAPEST'
                }
            case 'top_pick':
                return {
                    bgColor: 'bg-secondary-yellow',
                    textColor: 'text-grey-0',
                    label: 'TOP PICK'
                }
            default:
                return null
        }
    }

    const effectiveTagType: TourTagType | undefined =
        tagType ?? (is_personally_recommended ? 'recommended_for_you' : is_recommended ? 'recommended' : undefined)
    const tagStyles = effectiveTagType ? getTagStyles(effectiveTagType) : null

    /** Same pattern as stays `trackAffiliateClick`: PostHog → GA with guarded `event_callback` */
    const trackBookTourAffiliateClick = () => {
        if (!linkWithDate) return
        const openLink = createGuardedAffiliateWindowOpen(linkWithDate)

        trackGoogleEvent(GA_EVENTS.BOOK_TOUR_CLICK, {
            event_category: GA_EVENT_CATEGORIES.EXPERIENCE,
            event_label: name,
            platform: platform_name,
            price: price?.min_price ?? null,
            rating: rating ?? null,
            trigger_type: triggerType,
            traveler_id: userInfo?.id || null,
            trip_id: activeTrip?.trip_id || null,
            event_callback: openLink,
            event_timeout: 1000
        })

        trackButtonClickCustom({
            buttonPage: `${triggerType.toLowerCase()}_experience`,
            buttonName: 'Book_Tour',
            buttonAction: 'Clicked',
            location: 'Tours Card',
            extra: {
                tour_name: name,
                triggerType: triggerType,
                platform: platform_name,
                price: formattedPrice || null,
                rating: rating ?? null,
                is_recommended,
                tour_external_link: link
            }
        })
    }

    // Common chip shape — top-right inset corner cut, matches the existing tag aesthetic.
    // -mt-px / -mr-px pull the chip 1px up and right to overlap the card's purple border so
    // the chip's rounded-tr-2xl aligns flush with the card's outer rounded-2xl corner.
    const chipShapeClass =
        'h-[22px] shrink-0 whitespace-nowrap -mt-px -mr-px rounded-tl-none rounded-tr-2xl rounded-br-none rounded-bl-2xl flex items-center justify-center px-3 gap-1 text-[11px] font-bold tracking-num--0_01 leading-[14px]'

    const renderChip = () => {
        // Read-only state chip — shown for both staff and non-staff. For staff, the Settings2 icon
        // is the action affordance; the chip just reflects current state. No "+ RECOMMEND" ghost button.
        if (tagStyles) {
            return (
                <div className={`${chipShapeClass} ${tagStyles.bgColor} ${tagStyles.textColor}`}>
                    <span>{tagStyles.label}</span>
                </div>
            )
        }
        return null
    }

    return (
        <div
            className={`w-[280px] h-[240px] shrink-0 relative rounded-2xl bg-white border-primary-default border-solid border box-border flex flex-col items-start gap-4 text-left text-num-12 text-gray font-red-hat-display ${containerClassName || ''}`}>
            <div className="self-stretch flex items-start justify-between gap-5">
                <div className="self-stretch w-[103px] flex items-center pt-4 px-5 pb-0 box-border gap-2">
                    {platformLogoURL && (
                        <img
                            className="w-5 h-5 object-cover"
                            alt=""
                            src={platformLogoURL}
                        />
                    )}
                    {platform_name && <b className="relative tracking-num--0_01 leading-4">{formatPlatformDisplayName(platform_name)}</b>}
                </div>
                <div className="flex items-start gap-1">
                    {canStaffToggle && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (onCurate) onCurate(tour)
                                else setIsCurateOpen(true)
                            }}
                            aria-label="Open curation controls"
                            title="Curate this tour"
                            className="mt-1 mr-1 w-6 h-6 rounded-md text-grey-2 hover:text-primary-default hover:bg-primary-pale-purple/60 flex items-center justify-center transition-colors cursor-pointer">
                            <Settings2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {renderChip()}
                </div>
            </div>

            <div className="self-stretch flex-1 flex flex-col items-start justify-between pt-0 px-4 pb-4 gap-5 text-[16px] min-h-0">
                <div className="self-stretch flex flex-col items-start gap-3">
                    {/* truncate name to 2 lines */}
                    <div className="self-stretch relative tracking-num--0_01 leading-6 font-medium line-clamp-2">{name || 'Tour'}</div>
                    <div className="flex items-center gap-2.5 text-num-12">
                        {/* cancellation policy */}
                        {cancellation_policy ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1">
                                <b className=" tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    {cancellation_policy}
                                </b>
                            </div>
                        ) : !hasPrice ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1 opacity-0 pointer-events-none">
                                <b className=" tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    placeholder
                                </b>
                            </div>
                        ) : null}
                        {formattedDuration != '-' && formattedDuration != '' ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1">
                                <b className="tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    {formattedDuration}
                                </b>
                            </div>
                        ) : !hasPrice ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1 opacity-0 pointer-events-none">
                                <b className="tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    placeholder
                                </b>
                            </div>
                        ) : null}
                        {formattedRating ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1 gap-0.5">
                                <b className="tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    {formattedRating}
                                </b>
                                <img
                                    // className="w-3 relative max-h-full"
                                    alt=""
                                    src={SVG_ICON_STAR}
                                />
                            </div>
                        ) : !hasPrice ? (
                            <div className="rounded bg-grey-5 border-grey-4 border-solid border flex items-center py-0.5 px-1 gap-0.5 opacity-0 pointer-events-none">
                                <b className="tracking-[-1%] font-red-hat-display text-gray text-left text-[12px] font-[645] leading-[12px]">
                                    placeholder
                                </b>
                                <img
                                    alt=""
                                    src={SVG_ICON_STAR}
                                    className="opacity-0"
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
                {showPriceShimmer ? (
                    <div className="self-stretch flex items-end justify-between gap-5 text-num-12 font-manrope">
                        <div className="flex flex-col items-start gap-0.5 min-w-[100px] h-[64px] min-h-[64px]">
                            <CustomShimmer
                                height={12}
                                radius={4}
                                className="w-[10px]"
                            />
                            <CustomShimmer
                                height={32}
                                radius={4}
                                className="w-[100px]"
                            />
                            <CustomShimmer
                                height={12}
                                radius={4}
                                className="w-[60px]"
                            />
                        </div>
                        {/* Loading: keep BOOK button size/text stable */}
                        <div
                            className="rounded-md bg-white border-primary-default border-solid border flex items-center justify-center p-3 gap-1 text-[14px] text-primary-default font-red-hat-display pointer-events-none select-none opacity-70 animate-pulse"
                            aria-hidden>
                            <b className="text-[16px] font-bold tracking-[-0.01em] leading-[14px]">BOOK</b>
                            <ArrowUpRight className="w-[14px] h-[14px]" />
                        </div>
                    </div>
                ) : hasPrice ? (
                    <div className="self-stretch flex items-end justify-between gap-5 text-num-12 font-manrope">
                        <div className="flex flex-col items-start gap-0.5 h-[64px] min-h-[64px]">
                            <div className="self-stretch text-[13px] tracking-[-0.01em] font-medium font-manrope text-gray text-left inline-block h-3">
                                from
                            </div>
                            <div className="relative text-[24px] tracking-num--0_01 leading-8 font-semibold h-8 flex items-center gap-1.5">
                                {formattedPrice}
                                {isRimigoInternal && priceOverride && (
                                    <span className="rounded-sm bg-sky-100 px-1 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-[0.08em] text-sky-700">
                                        edited
                                    </span>
                                )}
                            </div>
                            <div className="relative text-[13px] tracking-[-0.01em] font-semibold font-manrope text-grey-2 text-left h-3">
                                {formattedPriceType}
                            </div>
                        </div>
                        {linkWithDate && (
                            <a
                                href={linkWithDate}
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    trackBookTourAffiliateClick()
                                }}
                                className="rounded-md bg-white border-primary-default border-solid border flex items-center justify-center p-3 gap-1 text-[14px] text-primary-default font-red-hat-display cursor-pointer">
                                <b className="text-[16px] font-bold tracking-[-0.01em] leading-[14px]">BOOK</b>
                                <ArrowUpRight className="w-[14px] h-[14px]" />
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="self-stretch flex items-end justify-between gap-5 text-num-12 font-manrope">
                        <div className="flex flex-col items-start justify-end gap-0.5 h-[64px] min-h-[64px]">
                            <div className="self-stretch text-xs tracking-[-0.01em] font-medium font-manrope text-gray text-left inline-block opacity-0 pointer-events-none h-3">
                                from
                            </div>
                            <div className="relative text-[24px] tracking-num--0_01 leading-8 font-semibold opacity-0 pointer-events-none h-8">
                                &nbsp;
                            </div>
                            <div className="self-stretch text-sm tracking-[-0.01em] font-medium font-manrope text-grey-0 text-left leading-4">
                                Prices may vary. Please check the latest price on the provider's website.
                            </div>
                        </div>
                        {linkWithDate && (
                            <a
                                href={linkWithDate}
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    trackBookTourAffiliateClick()
                                }}
                                className="rounded-md bg-white border-primary-default border-solid border flex items-center justify-center p-3 gap-1 text-[14px] text-primary-default font-red-hat-display cursor-pointer">
                                <b className="text-sm tracking-[-0.01em] leading-[14px]">BOOK</b>
                                <ArrowUpRight className="w-[14px] h-[14px]" />
                            </a>
                        )}
                    </div>
                )}
            </div>
            {/* Inline popover only when the parent isn't hosting a lifted one (onCurate). */}
            {canStaffToggle && experienceId && !onCurate && (
                <TourCuratePopover
                    open={isCurateOpen}
                    onOpenChange={setIsCurateOpen}
                    tour={tour}
                    experienceId={experienceId}
                    collectionIdentifier={collectionIdentifier}
                    checkIn={checkIn}
                />
            )}
        </div>
    )
}

export default TourCard
