// Magazine-style cover. Big hero photo dominating the upper page with
// the trip name overlaid on a soft bottom scrim. Below the hero: a
// tight metadata strip, a single pill button, and a small caption with
// the secondary link.
import { Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { PdfDay, PdfStay, PdfTripContext } from '../types'
import { colors, fonts, pageStyles, sizes } from '../theme'
import { durationDays, formatLongDate, formatShortDate } from '../utils/format'
import { pickHeroImage } from '../utils/extractImage'

import { RimigoMark } from './RimigoMark'
import { SiteFooter } from './SiteFooter'

// A4 portrait is 842pt tall, page chrome ~150pt → ~690pt of content.
// 500 hero + ~30 meta + ~120 cta = 650 → fits with safe margin.
const HERO_HEIGHT = 500

const styles = StyleSheet.create({
    brandBand: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 2,
        borderBottomColor: colors.primaryDefault,
    },
    brandSub: {
        fontFamily: fonts.body,
        color: colors.grey2,
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },

    container: {
        marginTop: 56, // clear the absolute brand band
        flexDirection: 'column',
    },

    // ── Hero (image + overlay) ──────────────────────────────────
    heroWrap: {
        position: 'relative',
        width: '100%',
        height: HERO_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
    },
    heroImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        objectFit: 'cover',
    },
    heroFallback: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.primaryDefault,
    },
    scrimSoft: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 260,
        backgroundColor: '#000',
        opacity: 0.22,
    },
    scrimHard: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 150,
        backgroundColor: '#000',
        opacity: 0.55,
    },
    heroOverlay: {
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 26,
        flexDirection: 'column',
    },
    heroTitle: {
        fontFamily: fonts.heading,
        fontSize: 34,
        fontWeight: 700,
        color: colors.white,
        lineHeight: 1.1,
    },
    heroDates: {
        marginTop: 10,
        fontSize: sizes.bodyLarge,
        color: colors.white,
        opacity: 0.92,
        fontWeight: 500,
    },

    // ── Centered metadata strip ─────────────────────────────────
    metaStrip: {
        marginTop: 20,
        textAlign: 'center',
        fontSize: sizes.label,
        color: colors.grey1,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
    },

    // ── CTA stack: button + caption + secondary link ────────────
    ctaWrap: {
        marginTop: 20,
        flexDirection: 'column',
        alignItems: 'center',
    },
    // NB: no `fontFamily: fonts.heading` here — Red Hat Display doesn't
    // ship the → arrow glyph (U+2192), so the button was rendering ' in
    // its place. Body font (Manrope) covers the arrow correctly.
    ctaButton: {
        backgroundColor: colors.primaryDefault,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 28,
        color: colors.white,
        fontSize: sizes.bodyLarge,
        fontWeight: 700,
        letterSpacing: 0.3,
        textDecoration: 'none',
    },
    ctaCaption: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        letterSpacing: 0.2,
    },
})

interface CoverPageProps {
    trip: PdfTripContext
    /** Stays + days are passed through to pick a hero image. */
    stays?: PdfStay[]
    days?: PdfDay[]
    /** Absolute origin used to build the public tripboard deep-link. */
    origin?: string
}

export function CoverPage({ trip, stays = [], days = [], origin }: CoverPageProps) {
    const dayCount = durationDays(trip.start_date, trip.end_date)
    const heroUrl = pickHeroImage(stays, days)

    // Smart date line: show one date when start === end, range otherwise.
    const longStart = formatLongDate(trip.start_date)
    const longEnd = formatLongDate(trip.end_date)
    const datesLine =
        longStart && longEnd && longStart !== longEnd
            ? `${longStart} – ${longEnd}`
            : longStart || longEnd || ''
    const shortStart = formatShortDate(trip.start_date)
    const shortEnd = formatShortDate(trip.end_date)
    const datesShort =
        shortStart && shortEnd && shortStart !== shortEnd
            ? `${shortStart} – ${shortEnd}`
            : shortStart || shortEnd || ''

    // Tight metadata strip — `8 DAYS · 3 CITIES · 3 TRAVELLERS`.
    const metaParts: string[] = []
    if (dayCount && dayCount > 1) metaParts.push(`${dayCount} days`)
    else if (dayCount === 1) metaParts.push('1 day')
    if (trip.destinations?.length) {
        const n = trip.destinations.length
        metaParts.push(`${n} ${n === 1 ? 'city' : 'cities'}`)
    }
    const travellers = (trip.adults ?? 0) + (trip.children ?? 0) + (trip.infants ?? 0)
    if (travellers > 0) {
        metaParts.push(`${travellers} traveller${travellers === 1 ? '' : 's'}`)
    }
    const metaStrip = metaParts.join('   ·   ')

    // Public tripboard URL — semiProtected route, viewable without login.
    const tripboardUrl =
        origin && trip.trip_id ? `${origin}/tripboard/${trip.trip_id}` : null

    return (
        <Page size="A4" style={pageStyles.page}>
            <View style={styles.brandBand} fixed>
                <RimigoMark variant="indigo" height={20} />
                <Text style={styles.brandSub}>Trip Itinerary</Text>
            </View>

            <View style={styles.container}>
                {/* Hero with title overlay */}
                <View style={styles.heroWrap}>
                    {heroUrl ? (
                        <Image src={heroUrl} style={styles.heroImage} />
                    ) : (
                        <View style={styles.heroFallback} />
                    )}
                    <View style={styles.scrimSoft} />
                    <View style={styles.scrimHard} />
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroTitle}>{trip.name || 'Your trip'}</Text>
                        {(datesLine || datesShort) ? (
                            <Text style={styles.heroDates}>
                                {datesLine || datesShort}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {metaStrip ? (
                    <Text style={styles.metaStrip}>{metaStrip}</Text>
                ) : null}

                <View style={styles.ctaWrap}>
                    {tripboardUrl ? (
                        <>
                            <Link src={tripboardUrl} style={styles.ctaButton}>
                                View your trip on Rimigo  →
                            </Link>
                            <Text style={styles.ctaCaption}>
                                Live updates · No login required
                            </Text>
                        </>
                    ) : (
                        <>
                            <Link src="https://rimigo.com" style={styles.ctaButton}>
                                Plan a trip on Rimigo  →
                            </Link>
                            <Text style={styles.ctaCaption}>
                                Free · AI-powered · No logins
                            </Text>
                        </>
                    )}
                </View>
            </View>

            <SiteFooter />
        </Page>
    )
}
