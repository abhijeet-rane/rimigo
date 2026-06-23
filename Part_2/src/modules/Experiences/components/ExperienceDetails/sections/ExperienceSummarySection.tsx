import type { LucideIcon } from 'lucide-react'
import { CalendarRange, Footprints, DollarSign, Clock } from 'lucide-react'
import { SeasonalInformationType } from '../../../types/experienceDetailTypes'
import { PlatformRating } from '../../../hooks/useToursForExperience'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'
import { Tour } from '../../../types/toursResponseTypes'
import Divider from '@/components/shared/Divider/Divider'
import PlatformRatings from '../components/PlatformRatings'
import { useIsMobile } from '@/hooks/use-mobile'
import { NOTEBOOK_PEN, TLDR_DESTOP, TLDR_MOBILE } from '@/constants/icons/svgUrls'

type HighlightCard = {
    id: string
    icon: LucideIcon
    label: string
    value: string
    description: string
    badge?: {
        label: string
        color: string
    }
}

type Constraints = {
    mobility: {
        walking_required: boolean
        description: string
    }
}

// Month names mapping for display
const MONTH_SHORT_NAMES: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec'
}

// Month order for sorting
const MONTH_ORDER: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
}

/**
 * Adapter function to transform seasonal information and constraints into highlight cards data
 */
const adaptSummaryData = (
    seasonalInformation: SeasonalInformationType | undefined,
    constraints: Constraints | undefined
): {
    bestMonths: HighlightCard | null
    walking: HighlightCard | null
} => {
    // Find best months: is_recommended === true AND is_peak_season === true
    const bestMonths: Array<{ monthKey: string; monthShortName: string; order: number }> = []

    if (seasonalInformation) {
        Object.entries(seasonalInformation).forEach(([monthKey, monthData]) => {
            if (monthData?.is_recommended === true && monthData.is_peak_season === true) {
                const shortName = MONTH_SHORT_NAMES[monthKey]
                if (shortName) {
                    bestMonths.push({
                        monthKey,
                        monthShortName: shortName,
                        order: MONTH_ORDER[monthKey] ?? 999
                    })
                }
            }
        })
    }

    // Sort by month order and limit to 3
    bestMonths.sort((a, b) => a.order - b.order)
    const top3Months = bestMonths.slice(0, 3)
    const bestMonthsValue = top3Months.map((m) => m.monthShortName).join(', ')

    // Build description from first best month's data
    let bestMonthsDescription = ''
    if (top3Months.length > 0 && seasonalInformation) {
        const firstMonthData = seasonalInformation[top3Months[0].monthKey]
        if (firstMonthData?.weather) {
            const tempMin = firstMonthData.weather.minimum_temperature
            const tempMax = firstMonthData.weather.maximum_temperature
            const tempUnit = firstMonthData.weather.temperature_unit === 'fahrenheit' ? '°F' : '°C'

            const parts: string[] = []
            if (tempMin !== null && tempMax !== null) {
                parts.push(`${Math.round(tempMin)}${tempUnit} – ${Math.round(tempMax)}${tempUnit}`)
            }
            if (firstMonthData.weather.description) {
                parts.push(firstMonthData.weather.description.split('.')[0].toLowerCase())
            }
            if (firstMonthData.crowd_levels?.level) {
                parts.push(`${firstMonthData.crowd_levels.level} crowds`)
            }
            if (firstMonthData.is_peak_season) {
                parts.push('peak season')
            }
            bestMonthsDescription = parts.join(', ')
        }
    }

    // Build walking required card from constraints
    let walkingCard: HighlightCard | null = null
    if (constraints?.mobility) {
        const walkingRequired = constraints.mobility.walking_required
        const description = constraints.mobility.description || ''

        // Show Yes/No based on walking_required
        const value = walkingRequired ? 'Yes' : 'No'

        walkingCard = {
            id: 'walking',
            icon: Footprints,
            label: 'Walking required',
            value,
            description: description || 'Walking may be required'
        }
    }

    const bestMonthsCard: HighlightCard | null = bestMonthsValue
        ? {
              id: 'best-months',
              icon: CalendarRange,
              label: 'Best months to visit',
              value: bestMonthsValue,
              description: bestMonthsDescription || 'Ideal conditions for visiting'
          }
        : null

    return {
        bestMonths: bestMonthsCard,
        walking: walkingCard
    }
}

const formatDurationLabel = (minutes: number, options?: { showMinutes?: boolean }): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 'Less than 5 mins'
    }

    const roundedMinutes = Math.max(5, Math.round(minutes / 5) * 5)
    const hours = Math.floor(roundedMinutes / 60)
    const remainingMinutes = roundedMinutes % 60
    const includeMinutes = options?.showMinutes ?? true

    const parts: string[] = []
    if (hours > 0) {
        parts.push(`${hours} hr${hours > 1 ? 's' : ''}`)
    }
    if ((hours === 0 || includeMinutes) && remainingMinutes > 0) {
        parts.push(`${remainingMinutes} min`)
    }

    return parts.length > 0 ? parts.join(' ') : 'Less than 5 mins'
}

type ExperienceSummarySectionProps = {
    seasonalInformation?: SeasonalInformationType
    constraints?: Constraints
    platformRatings?: PlatformRating[]
    travelerReviews?: {
        group_reviews?: {
            [key: string]: {
                is_value_for_money?: {
                    value: 'low' | 'medium' | 'high'
                    reason: string
                }
            }
        }
    }
    groupType?: string
    rawTours?: Tour[]
}

const ExperienceSummarySection = ({
    seasonalInformation,
    constraints,
    platformRatings = [],
    travelerReviews,
    groupType,
    rawTours = []
}: ExperienceSummarySectionProps) => {
    // Use adapter to get best months and walking data
    const { bestMonths, walking } = adaptSummaryData(seasonalInformation, constraints)
    const isMobile = useIsMobile()
    

    // Calculate average duration from tours
    const calculateAverageDuration = (): HighlightCard | null => {
        if (!rawTours || rawTours.length === 0) return null

        // Collect min and max durations separately in minutes
        const convertedDurations = rawTours
            .map((tour) => tour.platform_product_details?.duration)
            .map((duration) => {
                if (!duration || !duration.unit) return null
                const normalizedUnit = duration.unit.toLowerCase()
                if (!['milliseconds', 'seconds', 'minutes', 'hours'].includes(normalizedUnit)) {
                    return null
                }

                const convertToMinutes = (value: number) => {
                    switch (normalizedUnit) {
                        case 'milliseconds':
                            return value / (1000 * 60)
                        case 'seconds':
                            return value / 60
                        case 'minutes':
                            return value
                        case 'hours':
                            return value * 60
                        default:
                            return 0
                    }
                }

                const minDuration =
                    typeof duration.min_duration === 'number' && duration.min_duration > 0 ? convertToMinutes(duration.min_duration) : null
                const maxDuration =
                    typeof duration.max_duration === 'number' && duration.max_duration > 0 ? convertToMinutes(duration.max_duration) : null

                if (minDuration === null && maxDuration === null) return null

                return { min: minDuration, max: maxDuration }
            })
            .filter((duration): duration is { min: number | null; max: number | null } => duration !== null)

        if (convertedDurations.length === 0) return null

        const minDurations = convertedDurations
            .map((d) => d.min)
            .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)
        const maxDurations = convertedDurations
            .map((d) => d.max)
            .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)

        if (minDurations.length === 0 && maxDurations.length === 0) return null

        const avgMin =
            minDurations.length > 0
                ? minDurations.reduce((sum, value) => sum + value, 0) / minDurations.length
                : maxDurations.reduce((sum, value) => sum + value, 0) / maxDurations.length

        const avgMax =
            maxDurations.length > 0
                ? maxDurations.reduce((sum, value) => sum + value, 0) / maxDurations.length
                : minDurations.reduce((sum, value) => sum + value, 0) / minDurations.length

        // Check if there's actual variation in durations across tours
        const allDurations = [...minDurations, ...maxDurations]
        const actualMinDuration = Math.min(...allDurations)
        const actualMaxDuration = Math.max(...allDurations)
        const hasVariation = Math.abs(actualMaxDuration - actualMinDuration) >= 5

        // Show range if there's variation OR if averages differ
        const showRange = hasVariation || Math.abs(avgMax - avgMin) >= 5

        // Use averages for the range, but if they're the same and there's variation, use actual min/max
        const displayMin = showRange && Math.abs(avgMax - avgMin) < 5 ? actualMinDuration : avgMin
        const displayMax = showRange && Math.abs(avgMax - avgMin) < 5 ? actualMaxDuration : avgMax

        const minDurationLabel = formatDurationLabel(displayMin, { showMinutes: !showRange })
        const maxDurationLabel = formatDurationLabel(displayMax, { showMinutes: true })

        const value = showRange ? `${minDurationLabel} - ${maxDurationLabel}` : minDurationLabel
        const description = showRange ? 'Travellers usually spend this long here' : 'Typical time travelers spend here'

        return {
            id: 'duration-spent',
            icon: Clock,
            label: 'Duration spent',
            value,
            description
        }
    }

    // Get value for money data based on group type
    let valueForMoneyCard: HighlightCard | null = null
    if (travelerReviews?.group_reviews && groupType) {
        // Try to get the group review, with fallback to 'couple' if groupType doesn't match
        const groupReview =
            travelerReviews.group_reviews[groupType] ||
            travelerReviews.group_reviews['couple'] ||
            travelerReviews.group_reviews['couples'] ||
            undefined

        const valueForMoney = groupReview?.is_value_for_money

        if (valueForMoney) {
            const value = valueForMoney.value.charAt(0).toUpperCase() + valueForMoney.value.slice(1)
            valueForMoneyCard = {
                id: 'value-for-money',
                icon: DollarSign,
                label: 'Value for money',
                value: '',
                description: valueForMoney.reason || 'Based on traveler reviews',
                badge: {
                    label: value,
                    color:
                        value.toLowerCase() === 'low'
                            ? 'var(--color-secondary-red)'
                            : value.toLowerCase() === 'medium'
                              ? 'var(--color-secondary-yellow)'
                              : value.toLowerCase() === 'high'
                                ? 'var(--color-secondary-green)'
                                : ''
                }
            }
        }
    }

    // Get duration card
    const durationCard = calculateAverageDuration()

    // Build highlight cards array with only real data (no dummy data)
    const highlightCards: HighlightCard[] = [
        bestMonths, // Column 1
        durationCard, // Column 2
        walking, // Column 3
        valueForMoneyCard // Column 4
    ].filter((card): card is HighlightCard => card !== null)

    return (
        <div
            id="experienceSummarySection"
            className="md:rounded-2xl border border-feature-card-border bg-white p-4 md:fmy-8">
            <div
                className="md:grid  items-start  md:gap-1"
                style={{
                    gridTemplateColumns: '60px minmax(0, 1fr)'
                }}>
                <div className="flex md:flex-col mb-4 items-start gap-2 w-full md:w-auto shrink-0">
                    <img
                        src={NOTEBOOK_PEN}
                        alt="Experience highlights"
                        className="w-[24px] md:w-[35px] h-[24px] md:h-[35px] object-contain"
                    />
                    {isMobile ?
                        <img
                            src={TLDR_MOBILE}
                            alt="Experience highlights"
                            className="h-[24px]  w-[64px] object-contain"
                        /> : 
                        <img
                            src={TLDR_DESTOP}
                            alt="Experience highlights"
                            className="h-full w-full object-cover"
                        />
                    }
                </div>

                <div
                    className={`grid max-md:flex max-md:overflow-x-auto max-md:overflow-y-hidden max-md:flex-row md:grid-cols-2 ${
                        highlightCards.length >= 4
                            ? 'lg:grid-cols-4'
                            : highlightCards.length === 3
                              ? 'lg:grid-cols-3'
                              : highlightCards.length === 2
                                ? 'lg:grid-cols-2'
                                : 'lg:grid-cols-1'
                    }`}>
                    {highlightCards.map((card, idx) => {
                        const Icon = card.icon
                        return (
                            <div
                                key={card.id}
                                className={`flex items-start pt-2 gap-1 px-4  ${idx !== 0 ? 'border-l border-feature-card-border' : ''} ${idx === 0 ? 'max-md:pl-0' : ''}  `}
                                style={{
                                    fontFamily: 'Red Hat Display, ui-sans-serif, system-ui'
                                }}>
                                <div className=" text-header-black">
                                    <Icon
                                        className="h-5 w-5"
                                        strokeWidth={1.5}
                                    />
                                </div>
                                <div className="flex flex-col  flex-1">
                                    <div className="flex flex-col gap-2">
                                        <div className="max-md:flex-none max-md:whitespace-nowrap text-[14px] tracking-[0.01em] leading-[18px] font-medium font-red-hat-display">
                                            {card.label}
                                        </div>
                                        {card.badge ? (
                                            <div
                                                className=" rounded-lg px-3 py-1.5 text-[14px] font-bold text-white uppercase tracking-[0.01em] leading-[18px] font-red-hat-display w-fit"
                                                style={{ backgroundColor: card.badge.color }}>
                                                {card.badge.label}
                                            </div>
                                        ) : null}
                                        <div className="max-md:flex-none max-md:whitespace-nowrap text-[18px] font-semibold text-header-black">
                                            {card.value}
                                        </div>
                                    </div>
                                    <DescriptionWithShowMore
                                        description={card.description}
                                        className="text-grey-2 tracking-[-0.01em] font-semibold font-manrope"
                                        textSize="12px"
                                        lineHeight="18px"
                                        maxLines={2}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {platformRatings.length > 0 && (
                <>
                    <Divider className="my-4" />
                    <PlatformRatings platformRatings={platformRatings} />
                </>
            )}
        </div>
    )
}

export default ExperienceSummarySection
