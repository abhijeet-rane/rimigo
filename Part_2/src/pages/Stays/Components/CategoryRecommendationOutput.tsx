import React, { useMemo, useState } from 'react'
import TourCard from '@/modules/Experiences/components/ExperienceDetails/components/HowToBook/TourCard'
import { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import WhyThisSection from './WhyThisSection'
import CategoryHeader from './CategoryHeader'
import GenericDropownButton from '@/modules/AtaAgent/components/Chat/components/Generics/GenericDropownButton'
import AccordionInChat from '@/modules/AtaAgent/components/Chat/components/Generics/AccordionInChat'
import WhatToExpectTimeline, {
    WhatToExpectDuration,
    WhatToExpectStep
} from '@/modules/AtaAgent/components/Chat/components/Generics/WhatToExpectTimeline'

interface BookingLink {
    tour_name?: string
    platform: string
    platformID: string
    affiliate_link: string
    cost_in_inr?: string
    price?: {
        amount?: number | null
        currency?: string | null
    } | null
    rating?: {
        rating: number
        review_count?: number
    }
    cancellation_policy?: string
    duration?: {
        start_duration?: number
        end_duration?: number
        unit?: string
    }
}

interface OtherTicketCategory {
    category_name: string
    key_highlights: string
    bookingLinks: BookingLink[]
}

interface ItineraryStep {
    itinerary_step?: {
        title: string
        description?: string
        image_url?: string | null
        highlights?: string[]
        bullet_points?: string[]
        duration?: WhatToExpectDuration | DurationRange
        duration_label?: string
        duration_text?: string
    }
    title?: string
    description?: string
    image_url?: string | null
    highlights?: string[]
    bullet_points?: string[]
    duration?: WhatToExpectDuration | DurationRange
    duration_label?: string
    duration_text?: string
}

type DurationRange = {
    min_duration?: number | string | null
    max_duration?: number | string | null
    unit?: string | null
    label?: string | null
    start_duration?: number | string | null
    end_duration?: number | string | null
    min?: number | string | null
    max?: number | string | null
    duration_unit?: string | null
}

interface Tip {
    tip_text: string
}

interface RecommendationData {
    recommended_ticket_category: string
    reasons_for_recommendation: string
    bookingLinks: BookingLink[]
    other_ticket_categories?: OtherTicketCategory[]
}

interface CategoryRecommendationOutputProps {
    recommendation: RecommendationData
    tips?: Tip[]
    high_level_itinerary?: ItineraryStep[]
    className?: string
}

const normalizeDuration = (duration?: WhatToExpectDuration | DurationRange, fallbackLabel?: string): WhatToExpectDuration | undefined => {
    if (!duration && !fallbackLabel) {
        return undefined
    }

    if (typeof duration === 'string') {
        return duration
    }

    const candidate = (duration ?? {}) as DurationRange

    const resolvedLabel = candidate.label ?? fallbackLabel ?? undefined
    const resolvedMin = candidate.min ?? candidate.min_duration ?? candidate.start_duration
    const resolvedMax = candidate.max ?? candidate.max_duration ?? candidate.end_duration
    const resolvedUnit = candidate.unit ?? candidate.duration_unit ?? undefined

    if (!resolvedLabel && resolvedMin == null && resolvedMax == null) {
        return undefined
    }

    return {
        label: resolvedLabel,
        min: resolvedMin ?? undefined,
        max: resolvedMax ?? undefined,
        unit: resolvedUnit ?? undefined
    }
}

const mapItineraryToWhatToExpectSteps = (itinerarySteps?: ItineraryStep[]): WhatToExpectStep[] => {
    if (!Array.isArray(itinerarySteps)) {
        return []
    }

    return itinerarySteps.reduce<WhatToExpectStep[]>((accumulator, rawStep) => {
        const scopedStep = rawStep?.itinerary_step ?? rawStep
        if (!scopedStep?.title) {
            return accumulator
        }

        const highlights = scopedStep.highlights ?? scopedStep.bullet_points ?? rawStep?.highlights ?? rawStep?.bullet_points ?? undefined
        const normalizedHighlights = Array.isArray(highlights) ? highlights : undefined
        const durationLabel = scopedStep.duration_text ?? scopedStep.duration_label ?? rawStep?.duration_text ?? rawStep?.duration_label
        const duration = normalizeDuration(scopedStep.duration ?? rawStep?.duration, durationLabel ?? undefined)

        const normalizedStep: WhatToExpectStep = {
            title: scopedStep.title,
            description: scopedStep.description ?? rawStep?.description ?? null,
            image_url: scopedStep.image_url ?? rawStep?.image_url ?? null,
            imageAlt: scopedStep.title,
            highlights: normalizedHighlights ?? null
        }

        if (duration) {
            normalizedStep.duration = duration
        }

        accumulator.push(normalizedStep)
        return accumulator
    }, [])
}

const CategoryRecommendationOutput: React.FC<CategoryRecommendationOutputProps> = ({
    recommendation,
    tips,
    high_level_itinerary,
    className = ''
}) => {
    // Helper function to check if price data is complete and get amount
    const getPriceAmount = (link: BookingLink): number | null => {
        // Only use price.amount if price object exists and has both amount and currency
        if (link?.price && link?.price?.amount != null && link?.price?.currency != null) {
            return link.price.amount
        }
        return null
    }

    // Helper function to get currency from price object
    const getPriceCurrency = (link: BookingLink): string | null => {
        // Only use price.currency if price object exists and has both amount and currency
        if (link?.price && link?.price?.amount != null && link?.price?.currency != null) {
            return link.price.currency
        }
        return null
    }

    // Helper function to check if price data is complete
    const hasCompletePriceData = (link: BookingLink): boolean => {
        // Price data is complete only if price object exists with both amount and currency
        return link?.price != null && link?.price?.amount != null && link?.price?.currency != null
    }

    const convertBookingLinksToTours = (bookingLinks: BookingLink[] = [], categoryName: string) => {
        if (bookingLinks.length === 0) return []

        // Calculate prices for finding cheapest option
        const prices = bookingLinks.map((link) => getPriceAmount(link)).filter((price): price is number => price != null)
        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const cheapestIndex = minPrice != null ? bookingLinks.findIndex((link) => getPriceAmount(link) === minPrice) : -1

        return bookingLinks.map((link, index) => {
            const hasPrice = hasCompletePriceData(link)
            const priceAmount = hasPrice ? getPriceAmount(link) : null
            const priceCurrency = hasPrice ? getPriceCurrency(link) : null
            const platformName = link.platform.toUpperCase().replace(/\s+/g, '_')
            const tourTitle = link.tour_name?.trim() || `${categoryName} Tickets`
            const rating = link?.rating?.rating ?? null
            const cancellation_policy = link?.cancellation_policy ?? null

            const isRecommended =
                (index === 0 && cheapestIndex !== 0 && cheapestIndex !== -1) ||
                (index === 1 && cheapestIndex === 0 && bookingLinks.length > 1) ||
                (index === 0 && cheapestIndex === 0 && bookingLinks.length === 1)

            const tourData: AdaptedTourResponseType = {
                id: link.platformID || `${categoryName}-${index}`,
                name: tourTitle,
                platform_name: platformName,
                is_recommended: isRecommended,
                is_personally_recommended: null,
                personal_recommendation_reason: null,
                duration: {
                    min_duration: link?.duration?.start_duration ?? '',
                    max_duration: link?.duration?.end_duration ?? '',
                    unit: link?.duration?.unit ?? null
                },
                cancellation_policy: cancellation_policy,
                rating: rating ?? null,
                link: link.affiliate_link,
                price: {
                    min_price: priceAmount ?? null,
                    max_price: null,
                    currency: priceCurrency ?? null,
                    price_type: 'per person'
                }
            }

            return tourData
        })
    }

    const primaryTourData = useMemo(
        () => convertBookingLinksToTours(recommendation.bookingLinks || [], recommendation.recommended_ticket_category),
        [recommendation.bookingLinks, recommendation.recommended_ticket_category]
    )

    const whatToExpectSteps = useMemo(() => mapItineraryToWhatToExpectSteps(high_level_itinerary), [high_level_itinerary])

    const otherCategoryTours = useMemo(() => {
        if (!recommendation.other_ticket_categories || recommendation.other_ticket_categories.length === 0) {
            return []
        }

        return recommendation.other_ticket_categories.map((category) => ({
            ...category,
            tours: convertBookingLinksToTours(category.bookingLinks || [], category.category_name)
        }))
    }, [recommendation.other_ticket_categories])

    const otherOptionsCount = recommendation.other_ticket_categories?.length ?? 0
    const [showOtherOptions, setShowOtherOptions] = useState(false)
    const dropdownTitle = showOtherOptions
        ? 'Hide options'
        : otherOptionsCount > 0
          ? `See ${otherOptionsCount} more option${otherOptionsCount > 1 ? 's' : ''}`
          : 'Other options'

    return (
        <div className={`relative   w-full flex flex-col items-start justify-center  gap-4 text-left  font-red-hat-display ${className}`}>
            <div className="flex flex-col gap-4 bg-grey-5 px-4 py-4 w-full rounded-[20px]">
                {/* Category Header */}
                <CategoryHeader
                    title={recommendation.recommended_ticket_category}
                    duration=""
                />

                {/* Why This Section */}
                {recommendation.reasons_for_recommendation && <WhyThisSection reason={recommendation.reasons_for_recommendation} />}

                {/* Booking Links - Scrollable Tour Cards using GenericCarousel */}
                {primaryTourData.length > 0 && (
                    <div className="w-full overflow-hidden">
                        <GenericCarousel
                            gap={22}
                            scrollAmount={284}>
                            {primaryTourData.map((tour) => (
                                <TourCard
                                    triggerType="AssistantWindow"
                                    key={tour.id}
                                    tour={tour}
                                />
                            ))}
                        </GenericCarousel>
                    </div>
                )}
            </div>

            {/* other options */}
            {otherOptionsCount > 0 && (
                <GenericDropownButton
                    title={dropdownTitle}
                    icon="arrow-down"
                    isOpen={showOtherOptions}
                    onClick={() => setShowOtherOptions((prev) => !prev)}
                />
            )}

            {/* Other Ticket Categories */}
            {showOtherOptions && otherCategoryTours.length > 0 && (
                <div className="flex flex-col gap-4 w-full">
                    <h4 className="text-lg font-semibold text-grey_0 font-red-hat-display">Other Options</h4>
                    {otherCategoryTours.map((category: OtherTicketCategory & { tours: AdaptedTourResponseType[] }, index: number) => (
                        <div
                            key={`category-${index}`}
                            className="bg-grey_5 rounded-lg p-4 flex flex-col gap-3">
                            <h5 className="text-base font-semibold text-grey_0 font-red-hat-display">{category.category_name}</h5>
                            {category.key_highlights && <p className="text-sm text-grey_1 leading-6 font-manrope">{category.key_highlights}</p>}
                            {category.tours.length > 0 && (
                                <GenericCarousel
                                    gap={22}
                                    scrollAmount={284}>
                                    {category.tours.map((tour) => (
                                        <TourCard
                                            triggerType="AssistantWindow"
                                            key={tour.id}
                                            tour={tour}
                                        />
                                    ))}
                                </GenericCarousel>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* High-Level Itinerary */}
            {whatToExpectSteps.length > 0 && (
                <AccordionInChat
                    title="What to expect"
                    defaultOpen={false}
                    bodyClassName="flex flex-col">
                    <WhatToExpectTimeline
                        steps={whatToExpectSteps}
                        showImagePlaceholder
                    />
                </AccordionInChat>
            )}

            {/* Tips Section */}
            {tips && tips.length > 0 && (
                <AccordionInChat
                    title="Tips for you"
                    defaultOpen={false}
                    bodyClassName="flex flex-col gap-3 text-grey_0">
                    <div className="flex flex-col gap-3">
                        {tips.map((tip: Tip, index: number) => (
                            <div
                                key={`tip-${index}`}
                                className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-grey_0 mt-2 shrink-0" />
                                <p className="text-[16px] text-grey-0 tracking-num--0_02 leading-6 font-manrope">{tip.tip_text}</p>
                            </div>
                        ))}
                    </div>
                </AccordionInChat>
            )}
        </div>
    )
}

export default CategoryRecommendationOutput
