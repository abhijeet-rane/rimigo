// Body uses `flex: 1` (flexBasis 0) + `minWidth: 0` so it shrinks to
// leave room for the time column and thumbnail. react-pdf's default
// flexBasis: auto sizes to intrinsic content width, which made
// descriptions spill past the page boundary.
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer'

import { getAirlineLogoUrl } from '@/pages/Flights/utils/airlineLogoUtils'

import type { PdfDay, PdfSlot, PdfStay, PdfTourDeal, PdfTripContext } from '../types'
import { categoryColors, colors, fonts, sizes } from '../theme'
import {
    buildExperienceUrl,
    buildMapsUrl,
    buildStayUrl,
} from '../utils/buildDeepLinks'
import { extractSlotImage } from '../utils/extractImage'
import { formatTime } from '../utils/format'

import { DealCardList } from './DealCard'
import { KindIcon } from './KindIcon'
import {
    EXPERIENCE_PROVIDERS,
    ProviderLogoStack,
} from './ProviderLogoStack'

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        paddingLeft: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.grey4,
        position: 'relative',
    },
    // Full-height kind-color stripe down the left edge.
    stripe: {
        position: 'absolute',
        left: 0,
        top: 10,
        bottom: 10,
        width: 3,
        borderRadius: 2,
    },
    timeColumn: {
        width: 76,
        flexShrink: 0,
        flexGrow: 0,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    kindIconWrap: { marginBottom: 6 },
    timeLabel: {
        fontSize: sizes.label,
        color: colors.grey2,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    timeValue: {
        fontSize: sizes.bodyLarge,
        fontWeight: 700,
        color: colors.grey0,
    },
    timeSub: {
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        marginTop: 1,
    },
    body: { flex: 1, minWidth: 0 },
    kindPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 3,
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 5,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: sizes.title,
        fontWeight: 700,
        color: colors.grey0,
        lineHeight: 1.25,
    },
    meta: {
        fontSize: sizes.meta,
        color: colors.grey1,
        marginTop: 3,
    },
    notes: {
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        marginTop: 4,
        lineHeight: 1.4,
    },
    thumbnail: {
        width: 72,
        height: 54,
        borderRadius: 4,
        objectFit: 'cover',
        flexShrink: 0,
        marginTop: 2,
    },

    // ── Experience hero image — in body, full-width, big. Replaces
    //    the small right-side thumbnail so experience slots feel like
    //    the day's highlight rather than a list row.
    experienceHero: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        objectFit: 'cover',
        marginTop: 8,
        marginBottom: 6,
    },

    // ── Flight header — airline logo + kind pill side-by-side at top.
    flightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    flightLogo: {
        width: 26,
        height: 26,
        borderRadius: 6,
        objectFit: 'contain',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.grey4,
    },

    // ── CTA row — link + logo stack inline so the recipient sees
    //    which brands they're being routed through.
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    cta: {
        fontSize: sizes.label,
        fontWeight: 700,
        color: colors.primaryDefault,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textDecoration: 'none',
    },

    voucherChip: {
        fontSize: sizes.label,
        color: colors.emerald700,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 6,
    },
})

interface SlotRowProps {
    slot: PdfSlot
    day: PdfDay
    stay?: PdfStay | null
    trip: PdfTripContext
    origin: string
    /** Pre-fetched tour deals for this slot's experience_id. Only used
     *  for experience kinds — passed through SlotBody → ExperienceBody. */
    deals?: PdfTourDeal[]
}

export function SlotRow({ slot, day, stay, trip, origin, deals }: SlotRowProps) {
    const kind = (slot.kind || 'custom').toLowerCase()
    const visual = categoryColors[kind] ?? categoryColors.custom
    const startTime = formatTime(slot.start_time)
    const endTime = formatTime(slot.end_time)
    const thumbnailUrl = extractSlotImage(slot, stay)
    // Experience slots render their photo in-body (big), so the
    // right-side thumbnail is suppressed for those kinds.
    const isExperience =
        kind === 'experience' || kind === 'place' || kind === 'activity'

    return (
        <View style={styles.row} wrap={false}>
            <View style={[styles.stripe, { backgroundColor: visual.fg }]} />

            <View style={styles.timeColumn}>
                <View style={styles.kindIconWrap}>
                    <KindIcon kind={kind} size={18} color={visual.fg} />
                </View>
                <Text style={styles.timeLabel}>{deriveTimeLabel(kind)}</Text>
                {startTime ? (
                    <>
                        <Text style={styles.timeValue}>{startTime}</Text>
                        {endTime && endTime !== startTime ? (
                            <Text style={styles.timeSub}>to {endTime}</Text>
                        ) : null}
                    </>
                ) : (
                    <Text style={styles.timeSub}>All day</Text>
                )}
            </View>

            <View style={styles.body}>
                <SlotBody
                    slot={slot}
                    day={day}
                    stay={stay}
                    trip={trip}
                    origin={origin}
                    visual={visual}
                    deals={deals}
                />
            </View>

            {thumbnailUrl && !isExperience ? (
                <Image src={thumbnailUrl} style={styles.thumbnail} />
            ) : null}
        </View>
    )
}

function deriveTimeLabel(kind: string): string {
    if (kind === 'flight' || kind === 'transport' || kind === 'train' || kind === 'bus') return 'Departs'
    if (kind === 'transfer' || kind === 'car' || kind === 'taxi') return 'Pickup'
    if (kind === 'stay' || kind === 'hotel') return 'Check-in'
    if (kind === 'meal' || kind === 'restaurant') return 'Time'
    if (kind === 'experience' || kind === 'place' || kind === 'activity') return 'Starts'
    return 'Time'
}

// ────────────────────── body variants ──────────────────────

interface BodyProps {
    slot: PdfSlot
    day: PdfDay
    stay?: PdfStay | null
    trip: PdfTripContext
    origin: string
    visual: typeof categoryColors[string]
    deals?: PdfTourDeal[]
}

function SlotBody(props: BodyProps) {
    const kind = (props.slot.kind || 'custom').toLowerCase()
    if (kind === 'flight') return <FlightBody {...props} />
    if (kind === 'meal' || kind === 'restaurant') return <RestaurantBody {...props} />
    if (kind === 'stay' || kind === 'hotel') return <StayBody {...props} />
    if (kind === 'experience' || kind === 'place' || kind === 'activity') {
        return <ExperienceBody {...props} />
    }
    if (
        kind === 'transport'
        || kind === 'train'
        || kind === 'bus'
        || kind === 'transfer'
        || kind === 'car'
        || kind === 'taxi'
        || kind === 'boat'
        || kind === 'ferry'
    ) {
        return <TransportBody {...props} />
    }
    return <CustomBody {...props} />
}

function KindPill({ visual }: { visual: BodyProps['visual'] }) {
    return (
        <Text style={[styles.kindPill, { backgroundColor: visual.bg, color: visual.fg }]}>
            {visual.label}
        </Text>
    )
}

function FlightBody({ slot, trip, visual, origin }: BodyProps) {
    // Title like "Flight: AK 52: from: Bangalore to: Kuala Lumpur".
    // Extract the IATA code (AK) to fetch the Travclan airline logo —
    // same CDN the screen's flight cards use.
    const title = slot.title || 'Flight'
    const codeMatch = /\bFlight:\s*([A-Z0-9]{2,3})\b/i.exec(title)
    const airlineCode = codeMatch?.[1]?.toUpperCase()
    const airlineLogo = airlineCode ? getAirlineLogoUrl(airlineCode) : null
    // Deep-link to the tripboard's Flights tab so the recipient lands
    // in a contextual view (already filtered by trip dates / route) —
    // not the bare /flights explore page which has no trip context.
    const flightSearchUrl =
        origin && trip.trip_id
            ? `${origin}/tripboard/${trip.trip_id}?tab=flights`
            : null
    return (
        <>
            <View style={styles.flightHeader}>
                {airlineLogo ? (
                    <Image src={airlineLogo} style={styles.flightLogo} />
                ) : null}
                <KindPill visual={visual} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}
            {flightSearchUrl ? (
                <View style={styles.ctaRow}>
                    <Link src={flightSearchUrl} style={styles.cta}>
                        Search flights on Rimigo →
                    </Link>
                </View>
            ) : null}
            {hasVoucherAttachment(slot) ? (
                <Text style={styles.voucherChip}>✓ Voucher attached</Text>
            ) : null}
        </>
    )
}

function RestaurantBody({ slot, visual }: BodyProps) {
    const title = slot.title || 'Restaurant'
    const address = slot.location?.address || null
    const url = buildMapsUrl(slot.location, title)
    return (
        <>
            <KindPill visual={visual} />
            <Text style={styles.title}>{title}</Text>
            {address ? <Text style={styles.meta}>{address}</Text> : null}
            {url ? (
                <View style={styles.ctaRow}>
                    <Link src={url} style={styles.cta}>
                        Open in Maps →
                    </Link>
                </View>
            ) : null}
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}
            {hasVoucherAttachment(slot) ? (
                <Text style={styles.voucherChip}>✓ Voucher attached</Text>
            ) : null}
        </>
    )
}

function StayBody({ slot, stay, trip, origin, visual }: BodyProps) {
    const title = slot.title || stay?.hotel_name || 'Hotel'
    const url = buildStayUrl({ origin, slot, stay: stay ?? undefined, trip })
    const subline = [stay?.room_type, slot.location?.address].filter(Boolean).join(' · ')
    return (
        <>
            <KindPill visual={visual} />
            <Text style={styles.title}>{title}</Text>
            {subline ? <Text style={styles.meta}>{subline}</Text> : null}
            {url ? (
                <View style={styles.ctaRow}>
                    <Link src={url} style={styles.cta}>
                        View live rates on Rimigo →
                    </Link>
                </View>
            ) : null}
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}
            {hasVoucherAttachment(slot) ? (
                <Text style={styles.voucherChip}>✓ Voucher attached</Text>
            ) : null}
        </>
    )
}

function ExperienceBody({ slot, day, trip, origin, visual, deals }: BodyProps) {
    const kind = (slot.kind || '').toLowerCase()
    // Places aren't bookable on Rimigo — no detail page, no deals — so
    // they get the hero photo + notes but no CTA / provider stack. Only
    // experience / activity show the "View deals" route.
    const isPlace = kind === 'place'
    const title = slot.title || (isPlace ? 'Place' : 'Experience')
    const url = isPlace ? null : buildExperienceUrl({ origin, slot, day, trip })
    const meta = slot.location?.address || ''
    const heroUrl = extractSlotImage(slot)
    const dealList = !isPlace && deals && deals.length > 0 ? deals : null
    return (
        <>
            <KindPill visual={visual} />
            <Text style={styles.title}>{title}</Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            {heroUrl ? (
                <Image src={heroUrl} style={styles.experienceHero} />
            ) : null}
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}

            {/* Live deal cards (TourCard mirror) — only when we have any. */}
            {dealList ? <DealCardList deals={dealList} /> : null}

            {/* "View deals on Rimigo →" link kept as a fallback when the
                tours API returned nothing. When we have inline deal cards
                the dedicated link below is redundant. */}
            {url && !dealList ? (
                <View style={styles.ctaRow}>
                    <ProviderLogoStack logos={EXPERIENCE_PROVIDERS} size={18} />
                    <Link src={url} style={styles.cta}>
                        View deals on Rimigo →
                    </Link>
                </View>
            ) : null}
            {hasVoucherAttachment(slot) ? (
                <Text style={styles.voucherChip}>✓ Voucher attached</Text>
            ) : null}
        </>
    )
}

function TransportBody({ slot, visual }: BodyProps) {
    const title = slot.title || 'Transport'
    return (
        <>
            <KindPill visual={visual} />
            <Text style={styles.title}>{title}</Text>
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}
            {hasVoucherAttachment(slot) ? (
                <Text style={styles.voucherChip}>✓ Voucher attached</Text>
            ) : null}
        </>
    )
}

function CustomBody({ slot, visual }: BodyProps) {
    const title = slot.title || 'Free time'
    return (
        <>
            <KindPill visual={visual} />
            <Text style={styles.title}>{title}</Text>
            {slot.notes ? <Text style={styles.notes}>{slot.notes}</Text> : null}
        </>
    )
}

function hasVoucherAttachment(slot: PdfSlot): boolean {
    return Array.isArray(slot.attachments)
        && slot.attachments.some((a) => a?.type === 'voucher')
}
