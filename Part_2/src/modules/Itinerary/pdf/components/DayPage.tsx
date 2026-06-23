import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { PdfData, PdfDay, PdfStay, PdfTripContext } from '../types'
import { colors, fonts, pageStyles, sizes } from '../theme'
import { pickDayHero } from '../utils/extractImage'
import { formatWeekdayShort } from '../utils/format'
import { pickStayForDay, stayRoleForDay } from '../utils/pickStayForDay'

import { DayHero } from './DayHero'
import { PageChrome } from './PageChrome'
import { SiteFooter } from './SiteFooter'
import { SlotRow } from './SlotRow'
import { StayBanner } from './StayBanner'

const styles = StyleSheet.create({
    header: {
        marginTop: 56, // clear the fixed brand band
        marginBottom: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.grey4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    dayBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primaryDefault,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayBadgeLabel: {
        color: colors.white,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    dayBadgeNumber: {
        color: colors.white,
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1,
        marginTop: 1,
    },
    headerText: {
        flexGrow: 1,
    },
    dayTitle: {
        fontFamily: fonts.heading,
        fontSize: sizes.sectionTitle,
        fontWeight: 700,
        color: colors.grey0,
    },
    citySub: {
        fontSize: sizes.body,
        color: colors.primaryDefault,
        fontWeight: 600,
        marginTop: 4,
    },

    slotList: {
        flexDirection: 'column',
    },
    empty: {
        fontSize: sizes.meta,
        color: colors.grey2,
        marginTop: 12,
    },
})

interface DayPageProps {
    day: PdfDay
    dayIndex: number // 0-based; we show day_number = index + 1
    totalDays: number
    stays: PdfStay[]
    trip: PdfTripContext
    origin: string
    /** Tour deals keyed by experience_id — passed to SlotRow so
     *  experience slots can render the per-experience deal cards. */
    deals?: PdfData['deals']
}

export function DayPage({ day, dayIndex, totalDays, stays, trip, origin, deals }: DayPageProps) {
    const slots = day.slots ?? []
    const dayNumber = dayIndex + 1
    const cityName =
        day.base_city?.name
        || day.destination_city?.name
        || ''

    const stayBySlotId = buildStayLookup(slots, stays)
    const dayStay = pickStayForDay(day, stays)
    const heroUrl = pickDayHero(day)
    const dateLabel = formatWeekdayShort(day.date) || `Day ${dayNumber}`
    // Hide the banner on check-in days when the stay also appears as a slot —
    // avoids showing the same hotel twice (once at top, once inline).
    const stayAlsoInSlots = !!dayStay
        && slots.some(
            (s) =>
                (s.kind || '').toLowerCase() === 'stay'
                && (s.entity_id === dayStay.accommodation_id
                    || (s.title && dayStay.hotel_name && s.title.includes(dayStay.hotel_name))),
        )

    return (
        <Page size="A4" style={pageStyles.page}>
            <PageChrome subtitle="Trip Itinerary" />

            {heroUrl ? (
                <DayHero
                    dayNumber={dayNumber}
                    dateLabel={dateLabel}
                    city={cityName}
                    imageUrl={heroUrl}
                />
            ) : (
                <View style={styles.header}>
                    <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeLabel}>Day</Text>
                        <Text style={styles.dayBadgeNumber}>{dayNumber}</Text>
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.dayTitle}>{dateLabel}</Text>
                        {cityName ? <Text style={styles.citySub}>{cityName}</Text> : null}
                    </View>
                </View>
            )}

            {dayStay && !stayAlsoInSlots ? (
                <StayBanner
                    stay={dayStay}
                    role={stayRoleForDay(day, dayStay)}
                    trip={trip}
                    origin={origin}
                />
            ) : null}

            <View style={styles.slotList}>
                {slots.length === 0 ? (
                    <Text style={styles.empty}>No plans yet for this day.</Text>
                ) : (
                    slots.map((slot, i) => (
                        <SlotRow
                            key={slot.slot_id || `${dayIndex}-${i}`}
                            slot={slot}
                            day={day}
                            stay={stayBySlotId.get(slot.slot_id || '') ?? null}
                            trip={trip}
                            origin={origin}
                            deals={
                                slot.entity_id ? deals?.[slot.entity_id] : undefined
                            }
                        />
                    ))
                )}
            </View>

            <SiteFooter pageLabel={`Day ${dayNumber} of ${totalDays}`} />
        </Page>
    )
}

function buildStayLookup(
    slots: PdfDay['slots'],
    stays: PdfStay[],
): Map<string, PdfStay> {
    const out = new Map<string, PdfStay>()
    if (!slots) return out
    const byAccommodationId = new Map<string, PdfStay>()
    for (const s of stays) {
        if (s.accommodation_id) byAccommodationId.set(s.accommodation_id, s)
    }
    // Sort stays by hotel_name length desc so a substring fallback prefers
    // the most specific match ("Hyatt Bangkok Sukhumvit" over "Hyatt Bangkok").
    const byNameDesc = stays
        .filter((s) => s.hotel_name)
        .slice()
        .sort((a, b) => b.hotel_name.length - a.hotel_name.length)

    for (const slot of slots) {
        if ((slot.kind || '').toLowerCase() !== 'stay') continue
        if (!slot.slot_id) continue
        const byId = slot.entity_id ? byAccommodationId.get(slot.entity_id) : undefined
        const match = byId
            ?? (slot.title
                ? byNameDesc.find((s) => slot.title!.includes(s.hotel_name))
                : undefined)
        if (match) out.set(slot.slot_id, match)
    }
    return out
}
