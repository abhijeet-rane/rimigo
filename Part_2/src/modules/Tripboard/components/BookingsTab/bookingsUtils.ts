import type { TripBudget, BudgetFlight, BudgetStaySpan } from '../../api/budgetApi'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import type { UnifiedBooking, ProviderOption, BookingIcon } from './bookingsTypes'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'

/* ─── Currency & Date Formatters ─── */

export const formatCurrency = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export const formatCurrencyRange = (min: number, max: number) => {
    if (min === max || max === 0) return formatCurrency(min)
    return `${formatCurrency(min)} – ${formatCurrency(max)}`
}

/** Round to nearest 5000 when ≥ 1L, else nearest 500. Format in lakhs for cleaner display above 1L. */
const roundForDisplay = (n: number) => {
    const step = n >= 100000 ? 5000 : 500
    return Math.round(n / step) * step
}

const formatInLakhs = (n: number): string => {
    const lakhs = n / 100000
    // Show one decimal if not a whole number, e.g. 5.95L, 3L
    const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/0$/, '')
    return `₹${formatted}L`
}

export const formatCurrencyRangeRounded = (min: number, max: number) => {
    const rMin = roundForDisplay(min)
    const rMax = roundForDisplay(max)
    if (rMin === rMax || rMax === 0) return rMin >= 100000 ? formatInLakhs(rMin) : formatCurrency(rMin)
    const fMin = rMin >= 100000 ? formatInLakhs(rMin) : formatCurrency(rMin)
    const fMax = rMax >= 100000 ? formatInLakhs(rMax) : formatCurrency(rMax)
    return `${fMin} – ${fMax}`
}

export const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const formatDateRange = (start: string, end: string) => {
    if (!start) return ''
    if (!end || start === end) return formatDate(start)
    return `${formatDate(start)} – ${formatDate(end)}`
}

/* ─── Platform Logo Helpers ─── */

const PLATFORM_KEY_MAP: Record<string, string> = {
    klook: 'KLOOK',
    viator: 'VIATOR',
    gyg: 'GETYOURGUIDE',
    getyourguide: 'GETYOURGUIDE',
    agoda: 'AGODA',
    Agoda: 'AGODA',
    'booking.com': 'BOOKING_COM',
    'Booking.com': 'BOOKING_COM',
    'Trip.com': 'TRIP_COM',
    'Expedia.com': 'EXPEDIA',
    expedia: 'EXPEDIA',
    headout: 'HEADOUT',
    makemytrip: 'MAKE_MY_TRIP',
    kayak: 'KAYAK',
    Skyscanner: 'SKYSCANNER',
    skyscanner: 'SKYSCANNER',
    'Google Flights': 'GOOGLE_FLIGHTS',
}

const PLATFORM_LABELS: Record<string, string> = {
    klook: 'Klook',
    viator: 'Viator',
    gyg: 'GetYourGuide',
    getyourguide: 'GetYourGuide',
    agoda: 'Agoda',
    Agoda: 'Agoda',
    'booking.com': 'Booking.com',
    'Booking.com': 'Booking.com',
    'Trip.com': 'Trip.com',
    'Expedia.com': 'Expedia',
    expedia: 'Expedia',
    headout: 'Headout',
    makemytrip: 'MakeMyTrip',
    kayak: 'Kayak',
    Skyscanner: 'Skyscanner',
    skyscanner: 'Skyscanner',
    'Google Flights': 'Google Flights',
}

export const getPlatformLabel = (platform: string) => PLATFORM_LABELS[platform] || platform

export const getPlatformLogo = (platform: string): string | null => {
    const key = PLATFORM_KEY_MAP[platform]
    return key ? getPlatformLogoURL(key) : null
}

/* ─── Emoji Icon Mapping ─── */

const FLIGHT_ICONS: BookingIcon[] = [
    { emoji: '🛫', bg: '#EEF0FF', color: '#4A5AE8' },
    { emoji: '🛬', bg: '#EEF0FF', color: '#4A5AE8' },
]

const STAY_ICONS: BookingIcon[] = [
    { emoji: '🏰', bg: '#FFF7EC', color: '#C47A1A' },
    { emoji: '🏢', bg: '#EDF7F0', color: '#1A8C4A' },
    { emoji: '🏔️', bg: '#ECF4FF', color: '#2A6CB8' },
    { emoji: '🏨', bg: '#F3EEFF', color: '#6B3FA0' },
]

const ACTIVITY_ICONS: BookingIcon[] = [
    { emoji: '🚶', bg: '#FFF4EC', color: '#C4621A' },
    { emoji: '🏰', bg: '#F3EEFF', color: '#6B3FA0' },
    { emoji: '🍫', bg: '#F9F0E7', color: '#8B5E3C' },
    { emoji: '🗻', bg: '#EDF6FF', color: '#1A6FB5' },
    { emoji: '🎟️', bg: '#FEEFEF', color: '#C43A3A' },
    { emoji: '⛵', bg: '#ECF4FF', color: '#2A6CB8' },
    { emoji: '🚲', bg: '#ECFAF4', color: '#0F8847' },
    { emoji: '🎭', bg: '#FFF8EC', color: '#B8860B' },
]

const getFlightIcon = (index: number): BookingIcon => FLIGHT_ICONS[index % FLIGHT_ICONS.length]
const getStayIcon = (index: number): BookingIcon => STAY_ICONS[index % STAY_ICONS.length]
const getActivityIcon = (index: number): BookingIcon => ACTIVITY_ICONS[index % ACTIVITY_ICONS.length]

/* ─── Route Key for Flight Grouping ─── */

const getFlightRouteKey = (flight: BudgetFlight): string => {
    if (!flight.segments || flight.segments.length === 0) return flight.title || flight.section_id
    const origin = flight.segments[0].origin.city_name || flight.segments[0].origin.airport_code
    const dest = flight.segments[flight.segments.length - 1].destination.city_name || flight.segments[flight.segments.length - 1].destination.airport_code
    return `${origin}→${dest}`
}

/* ─── Build Unified Bookings from TripBudget ─── */

interface StayPriceData {
    displayPrice: number
    platforms: PlatformPrice[]
    isPriceLoading: boolean
    isPriceUnavailable: boolean
}

export function buildUnifiedBookings(
    budget: TripBudget,
    stayPricesMap: Map<string, StayPriceData>,
    excludedActivities: Set<string>,
    excludedFlights: Set<string>,
): UnifiedBooking[] {
    const bookings: UnifiedBooking[] = []

    // ── Flights ──
    const flightRouteGroups = new Map<string, BudgetFlight[]>()
    for (const flight of budget.flights || []) {
        const routeKey = getFlightRouteKey(flight)
        const existing = flightRouteGroups.get(routeKey) || []
        existing.push(flight)
        flightRouteGroups.set(routeKey, existing)
    }

    let flightIndex = 0
    for (const [routeKey, flights] of flightRouteGroups) {
        const isGroup = flights.length > 1
        const groupKey = isGroup ? `flights-${routeKey}` : null

        for (const flight of flights) {
            const options: ProviderOption[] = []
            if (flight.best_offer) {
                options.push({
                    provider: flight.best_offer.provider,
                    price: flight.best_offer.price,
                    cheapest: true,
                    url: flight.best_offer.affiliate_url,
                    logoUrl: flight.best_offer.provider_logo_url,
                })
            } else if (flight.total_price > 0) {
                options.push({
                    provider: 'Best price',
                    price: flight.total_price,
                    cheapest: true,
                })
            }

            for (const offer of (flight.price_comparison || [])) {
                if (flight.best_offer && offer.provider === flight.best_offer.provider && offer.price === flight.best_offer.price) continue
                options.push({
                    provider: offer.provider,
                    price: offer.price,
                    cheapest: false,
                    url: offer.affiliate_url,
                    logoUrl: offer.provider_logo_url,
                })
            }

            const stopLabel = flight.stop_count === 0 ? 'Direct' : `${flight.stop_count} stop${flight.stop_count > 1 ? 's' : ''}`
            const details = [stopLabel, flight.formatted_duration, flight.is_refundable ? 'Refundable' : ''].filter(Boolean).join(' · ')

            bookings.push({
                id: `flight-${flight.section_id}`,
                category: 'flights',
                name: flight.title,
                day: {
                    num: null,
                    date: formatDate(flight.departure_date),
                },
                groupKey,
                groupMode: isGroup ? 'pick' : undefined,
                icon: getFlightIcon(flightIndex),
                details,
                options,
                _sectionId: flight.section_id,
                _isExcluded: excludedFlights.has(flight.section_id),
            })
            flightIndex++
        }
    }

    // ── Stays ──
    // Group stays by city — available_hotels within a city are pick-one alternatives
    const staysByCityMap = new Map<string, BudgetStaySpan[]>()
    for (const stay of budget.stays || []) {
        const existing = staysByCityMap.get(stay.city_id) || []
        existing.push(stay)
        staysByCityMap.set(stay.city_id, existing)
    }

    let stayIndex = 0
    for (const [cityId, cityStays] of staysByCityMap) {
        for (const stay of cityStays) {
            const hasAlternatives = stay.available_hotels && stay.available_hotels.length > 1
            const groupKey = hasAlternatives ? `stays-${cityId}` : null

            // Build options from live platform prices or fallback
            const livePrices = stayPricesMap.get(stay.zentrum_hub_id)
            const options: ProviderOption[] = []

            if (livePrices && livePrices.platforms.length > 0) {
                const sorted = [...livePrices.platforms].sort((a, b) => a.price - b.price)
                sorted.forEach((p, i) => {
                    options.push({
                        provider: getPlatformLabel(p.platform),
                        price: p.price,
                        cheapest: i === 0,
                        unit: '/night',
                        url: p.url,
                        logoUrl: getPlatformLogo(p.platform),
                    })
                })
            } else if (stay.booking_link && stay.platform) {
                options.push({
                    provider: getPlatformLabel(stay.platform),
                    price: stay.rate_per_night,
                    cheapest: true,
                    unit: '/night',
                    url: stay.booking_link,
                    logoUrl: getPlatformLogo(stay.platform),
                })
            } else if (stay.rate_per_night > 0) {
                options.push({
                    provider: 'Estimated',
                    price: stay.rate_per_night,
                    cheapest: true,
                    unit: '/night',
                })
            }

            const details = [
                stay.location_tag || stay.city_name,
                stay.kayak_star_rating ? `${stay.kayak_star_rating}-star` : '',
                `${stay.nights} night${stay.nights !== 1 ? 's' : ''}`,
            ].filter(Boolean).join(' · ')

            // Determine highlight for grouped stays
            let highlight: string | undefined
            if (hasAlternatives) {
                const allRates = stay.available_hotels.map((h: { rate_per_night: number }) => h.rate_per_night).filter((r: number) => r > 0)
                if (allRates.length > 0) {
                    const minRate = Math.min(...allRates)
                    if (stay.rate_per_night === minRate) {
                        highlight = 'Cheapest'
                    } else if (stay.rate_per_night > minRate) {
                        highlight = 'Premium pick'
                    }
                }
            }

            bookings.push({
                id: `stay-${stay.zentrum_hub_id}`,
                category: 'stays',
                name: stay.hotel_name,
                day: {
                    num: null,
                    date: formatDateRange(stay.check_in, stay.check_out),
                },
                groupKey,
                groupMode: hasAlternatives ? 'pick' : undefined,
                icon: getStayIcon(stayIndex),
                details,
                highlight,
                options,
                landscapeImage: stay.image,
                _cityId: stay.city_id,
                _zentrumHubId: stay.zentrum_hub_id,
            })
            stayIndex++
        }
    }

    // ── Activities (grouped by day → browse mode) ──
    let activityIndex = 0
    for (const day of budget.days || []) {
        if (day.items.length === 0) continue

        const isGroup = day.items.length > 1
        const groupKey = isGroup ? `act-day${day.day_number}` : null

        for (const item of day.items) {
            const options: ProviderOption[] = []
            if (item.booking_link && item.platform) {
                options.push({
                    provider: getPlatformLabel(item.platform),
                    price: item.per_person_cost > 0 ? item.per_person_cost : item.cost,
                    cheapest: true,
                    url: item.booking_link,
                    logoUrl: getPlatformLogo(item.platform),
                })
            } else if (item.cost > 0) {
                options.push({
                    provider: item.price_source === 'tours' ? 'Tour provider' : 'Estimated',
                    price: item.per_person_cost > 0 ? item.per_person_cost : item.cost,
                    cheapest: true,
                })
            }

            bookings.push({
                id: `activity-${item.slot_id}`,
                category: 'activities',
                name: item.title,
                day: {
                    num: day.day_number,
                    date: formatDate(day.date),
                },
                groupKey,
                groupMode: isGroup ? 'browse' : undefined,
                icon: getActivityIcon(activityIndex),
                details: day.city_name,
                options,
                landscapeImage: item.landscape_image,
                _slotId: item.slot_id,
                _entityId: item.entity_id,
                _isExcluded: excludedActivities.has(item.slot_id),
            })
            activityIndex++
        }
    }

    // ── Must Haves (placeholder — backend support TBD) ──
    // TODO: When backend provides must-have items (eSIM, visa, insurance),
    // map them here with category: 'mustHaves'
    // Example shape:
    // bookings.push({
    //     id: 'musthave-esim',
    //     category: 'mustHaves',
    //     name: 'Europe eSIM — 10 GB',
    //     day: { num: 1, date: formatDate(budget.days?.[0]?.date || '') },
    //     groupKey: null,
    //     icon: { emoji: '📶', bg: '#ECFAF4', color: '#0F8847' },
    //     details: '30 days · 40+ countries · 5G/LTE',
    //     options: [
    //         { provider: 'Airalo', price: 850, cheapest: true },
    //         { provider: 'Holafly', price: 1590, cheapest: false },
    //     ],
    // })

    return bookings
}

/* ─── Budget Breakdown for Cost Overview ─── */

export interface CategoryBreakdown {
    min: number
    max: number
}

/** All category breakdowns are PER-PERSON.
 *  Stay room totals are divided by 2 (double occupancy default) to get per-person.
 *  Flight and activity per-person costs are used as-is.
 *  Per-person total = sum(min).
 */
const STAY_DIVISOR = 2

export function getBudgetBreakdown(
    budget: TripBudget,
    stayPricesMap: Map<string, StayPriceData>,
): Record<string, CategoryBreakdown> {
    const bd: Record<string, CategoryBreakdown> = {
        flights: { min: 0, max: 0 },
        stays: { min: 0, max: 0 },
        activities: { min: 0, max: 0 },
    }

    // Flights — already per-person from the flight price_comparison
    for (const flight of budget.flights || []) {
        const allPrices = [
            ...(flight.price_comparison || []).map(o => o.price).filter(p => p > 0),
        ]
        if (flight.best_offer?.price && flight.best_offer.price > 0) {
            allPrices.push(flight.best_offer.price)
        }
        if (allPrices.length === 0 && flight.total_price > 0) {
            allPrices.push(flight.total_price)
        }
        const cheapest = allPrices.length > 0 ? Math.min(...allPrices) : (flight.total_price || 0)
        bd.flights.min += cheapest
        bd.flights.max += Math.round(cheapest * 1.2)
    }

    // Stays — only the selected hotel. min = selected rate × nights / 2, max = min × 1.2
    for (const stay of budget.stays || []) {
        const live = stayPricesMap.get(stay.zentrum_hub_id)
        let rate = stay.rate_per_night
        if (live && live.platforms.length > 0) {
            // Use selected provider if set, otherwise cheapest
            const selectedPlatform = stay.selected_provider
                ? live.platforms.find(p => p.platform.toLowerCase() === stay.selected_provider!.toLowerCase())
                : null
            rate = selectedPlatform ? selectedPlatform.price : Math.min(...live.platforms.map(p => p.price))
        }

        const nights = stay.nights || 1
        const perPerson = Math.round((rate * nights) / STAY_DIVISOR)
        bd.stays.min += perPerson
        bd.stays.max += Math.round(perPerson * 1.2)
    }

    // Activities — already per-person from item.per_person_cost
    for (const day of budget.days || []) {
        for (const item of day.items) {
            const cheapest = item.per_person_cost > 0 ? item.per_person_cost : item.cost
            bd.activities.min += cheapest
            bd.activities.max += Math.round(cheapest * 1.2)
        }
    }

    return bd
}
