import React, { useCallback, useMemo } from 'react'
import CarouselWithSeeAll from '@/modules/Experiences/components/CarouselWithSeeAll'
import CustomShimmer from '@/components/shared/Shimmer'
import { ChevronRight } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

type ItineraryDay = {
    date?: string
    base_city?: { name?: string } | null
    destination_city?: { name?: string } | null
    slots?: Array<{
        title?: string
        slot_data?: {
            display_props?: { landscape_image?: string; portrait_image?: string }
            verified_photos?: Array<{ url?: string }>
        }
    }>
}

function getAllImagesFromDays(days: ItineraryDay[]): string[] {
    const images: string[] = []
    for (const day of days) {
        for (const slot of day.slots || []) {
            const img =
                slot.slot_data?.display_props?.landscape_image ||
                slot.slot_data?.display_props?.portrait_image ||
                slot.slot_data?.verified_photos?.[0]?.url
            if (img) images.push(img)
        }
    }
    return images
}

/** Deduped pool of all trip images (order preserved). */
function getUniqueTripImages(days: ItineraryDay[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const url of getAllImagesFromDays(days)) {
        if (url && !seen.has(url)) {
            seen.add(url)
            out.push(url)
        }
    }
    return out
}

/**
 * Hero image per day when present; otherwise a fallback from the trip pool that does not
 * repeat an image already shown on another card (when enough unique URLs exist).
 */
function assignImagesForDays(days: ItineraryDay[]): string[] {
    const uniquePool = getUniqueTripImages(days)
    const n = days.length
    const final: string[] = new Array(n)
    const used = new Set<string>()

    for (let i = 0; i < n; i++) {
        const hero = getDayHeroImage(days[i])
        if (hero) {
            final[i] = hero
            used.add(hero)
        }
    }

    for (let i = 0; i < n; i++) {
        if (final[i]) continue
        const unused = uniquePool.find((url) => !used.has(url))
        if (unused) {
            final[i] = unused
            used.add(unused)
        } else if (uniquePool.length > 0) {
            // Not enough distinct images left — must reuse
            final[i] = uniquePool[i % uniquePool.length]
        } else {
            final[i] = ''
        }
    }

    return final
}

function getDayHeroImage(day: ItineraryDay): string | null {
    for (const slot of day.slots || []) {
        const img =
            slot.slot_data?.display_props?.landscape_image ||
            slot.slot_data?.display_props?.portrait_image ||
            slot.slot_data?.verified_photos?.[0]?.url
        if (img) return img
    }
    return null
}

function getDaySummary(day: ItineraryDay): string {
    const titles = (day.slots || [])
        .map((s) => s.title)
        .filter((t): t is string => Boolean(t?.trim()))
        .slice(0, 3)
    return titles.join(', ')
}

function getCityName(day: ItineraryDay): string {
    return day.base_city?.name || day.destination_city?.name || ''
}

export interface TripDailyHighlightsSectionProps {
    days: ItineraryDay[]
    isLoading?: boolean
    /** 0-based day index — parent switches to itinerary tab and scrolls to this day (desktop: map; mobile: list) */
    onDayClick: (dayIndex: number) => void
    onViewFullItinerary: () => void
}

const DayCard: React.FC<{
    dayNumber: number
    image: string
    city: string
    summary: string
    onClick: () => void
    /** When true, only the “View Day N” button navigates (mobile). Desktop keeps whole-card click. */
    ctaOnlyNavigation: boolean
}> = ({ dayNumber, image, city, onClick, summary, ctaOnlyNavigation }) => {
    return (
        <div
            onClick={ctaOnlyNavigation ? undefined : onClick}
            className={`relative h-[350px] w-full max-w-[280px] min-w-[280px] rounded-2xl overflow-hidden group ${
                ctaOnlyNavigation ? 'cursor-default' : 'cursor-pointer'
            }`}
        >

            {/* Image layer */}
            <div className="absolute inset-0 overflow-hidden">
                <img
                    src={image}
                    alt={`Day image`}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
            </div>

            {/* Gradient — deepens on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

            {/* Bottom content block
                - Desktop: slides up on hover to reveal button
                - Mobile: always in resting position (button always visible below) */}
            <div
                className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-0.5
                    md:translate-y-0 md:group-hover:-translate-y-[52px]
                    -translate-y-[52px]
                    transition-transform duration-300 ease-out"
            >
                {/* Big "Day 1" — the focus */}
                <div className="flex items-center gap-1">

                    <h3 className="font-red-hat-display font-bold text-[28px] leading-tight tracking-tight text-white">
                        Day {dayNumber}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-white" />

                </div>


                {/* City as subtitle */}
                {city && (
                    <p className="font-manrope font-medium text-[13px] text-grey-5 tracking-wide">
                        {city} 
                    </p>
                )}

                {summary && (
                    <p className="font-manrope font-medium text-[13px] text-grey-4 line-clamp-1 mt-0.5">
                        {summary}
                    </p>
                )}
            </div>

            {/* CTA button
                - Desktop: hidden, slides up on hover
                - Mobile: always visible */}
            <div
                className="absolute inset-x-4 bottom-4
                    md:translate-y-full md:opacity-0
                    md:group-hover:translate-y-0 md:group-hover:opacity-100
                    translate-y-0 opacity-100
                    transition-all duration-300 ease-out delay-75"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick()
                    }}
                    className="w-full rounded-xl bg-primary-default py-2.5 text-center
                        active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                >
                    <span className="font-red-hat-display font-semibold text-[14px] text-white">
                        View Day {dayNumber}
                    </span>
                </button>
            </div>
        </div>
    )
}

const TripDailyHighlightsSection: React.FC<TripDailyHighlightsSectionProps> = ({
    days,
    isLoading = false,
    onDayClick,
    onViewFullItinerary
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const isMobile = useIsMobile()

    const handleDayCardClick = useCallback(
        (dayIndex: number) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: POSTHOG_EVENTS.TRIPBOARD_DAILY_HIGHLIGHTS_DAY_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { day: dayIndex + 1 }
            })
            onDayClick(dayIndex)
        },
        [onDayClick, trackButtonClickCustom]
    )

    const handleViewFullItinerary = useCallback(() => {
        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: POSTHOG_EVENTS.TRIPBOARD_DAILY_HIGHLIGHTS_VIEW_FULL_ITINERARY_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        onViewFullItinerary()
    }, [onViewFullItinerary, trackButtonClickCustom])

    const items = useMemo(() => {
        const images = assignImagesForDays(days)
        return days.map((day, index) => ({
            dayIndex: index,
            dayNumber: index + 1,
            image: images[index] ?? '',
            city: getCityName(day),
            summary: getDaySummary(day)
        }))
    }, [days])

    if (!isLoading && items.length === 0) return null

    if (isLoading && items.length === 0) {
        return (
            <div className="mb-16 w-full pl-4 md:pl-0">
                <CustomShimmer height={24} radius={4} className="w-48 mb-2" />
                <CustomShimmer height={14} radius={4} className="w-72 mb-5" />
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="min-w-[280px] max-w-[280px]">
                            <CustomShimmer height={350} radius={16} fill className="h-full w-full" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <CarouselWithSeeAll
            customTitle={
                <div>
                    <p className="text-[22px] md:text-[25px] leading-[100%] tracking-[-2%] font-bold font-red-hat-display text-grey-0">
                        Daily Highlights
                    </p>
                    <p className="mt-1.5 font-manrope text-[13px] font-medium text-grey-2 md:text-[14px]">
                        {isMobile
                            ? 'Tap View Day on a card to open that day in your itinerary'
                            : 'Tap to see the core experience of each day'}
                    </p>
                </div>
            }
            onSeeAllClick={handleViewFullItinerary}
            seeAllLabel="View Full Itinerary"
            containerClassName="md:pl-0! pl-4! md:p-0! mb-16"
            gradientStartColor="#ffffff"
            gradientEndColor="transparent"
            rightGradientStyle="w-10 bg-gradient-to-l"
            leftGradientStyle="w-10 bg-gradient-to-r"
            scrollControls={{ rightScrollBtn: 'hidden', leftScrollBtn: 'hidden' }}
        >
            {items.map((item) => (
                <DayCard
                    key={item.dayNumber}
                    dayNumber={item.dayNumber}
                    image={item.image}
                    city={item.city}
                    summary={item.summary}
                    ctaOnlyNavigation={isMobile}
                    onClick={() => handleDayCardClick(item.dayIndex)}
                />
            ))}
        </CarouselWithSeeAll>
    )
}

export default TripDailyHighlightsSection
