import { Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { PdfDay, PdfStay, PdfTripContext } from '../types'
import { colors, fonts, pageStyles, sharedStyles, sizes } from '../theme'
import {
    buildGoogleMapsDirectionsUrl,
    buildMapboxRouteUrl,
    extractCityPoints,
} from '../utils/extractCityPoints'
import { isUsableUrl, pickDayHero } from '../utils/extractImage'

import { KindIcon } from './KindIcon'
import { PageChrome } from './PageChrome'
import { SiteFooter } from './SiteFooter'

// Stable Unsplash travel/cityscape photo used when a city has no slot
// image of its own. Hotel-room scene reads as "destination" without
// implying it's a real photo of any specific place. Has CORS, won't
// expire.
const FALLBACK_CITY_IMG =
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=200&q=80'

const styles = StyleSheet.create({
    header: {
        marginTop: 56, // clear the fixed brand band
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.grey4,
    },
    sectionLabel: {
        fontSize: sizes.label,
        color: colors.grey2,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: sizes.sectionTitle,
        fontWeight: 700,
        color: colors.grey0,
        marginTop: 4,
    },
    accent: {
        marginTop: 10,
        height: 3,
        width: 60,
        backgroundColor: colors.primaryDefault,
    },

    map: {
        width: '100%',
        height: 220,
        borderRadius: 10,
        marginBottom: 8,
        objectFit: 'cover',
    },
    mapCta: {
        alignSelf: 'flex-end',
        fontSize: sizes.label,
        fontWeight: 700,
        color: colors.primaryDefault,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 20,
        textDecoration: 'none',
    },

    citiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 22,
    },
    cityCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.white,
    },
    // Image area is a layered container — colored map-pin placeholder
    // underneath, real city photo (or Unsplash fallback) overlaid. If
    // both image fetches fail, the placeholder remains visible so the
    // card never renders as a blank box.
    cityThumbWrap: {
        position: 'relative',
        width: 56,
        height: 56,
        flexShrink: 0,
    },
    cityThumbFallback: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 8,
        backgroundColor: colors.primaryPalePurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cityThumb: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 8,
        objectFit: 'cover',
    },
    cityBadge: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primaryDefault,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    cityBadgeText: {
        color: colors.white,
        fontSize: 9,
        fontWeight: 700,
    },
    cityTextBlock: { flex: 1, minWidth: 0 },
    cityName: {
        fontFamily: fonts.heading,
        fontSize: sizes.body,
        fontWeight: 700,
        color: colors.grey0,
    },
    cityNights: {
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        marginTop: 2,
    },

    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        flexGrow: 1,
        flexBasis: 100,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.primaryPalePurple,
    },
    statValue: {
        fontFamily: fonts.heading,
        fontSize: 22,
        fontWeight: 700,
        color: colors.primaryDefault,
    },
    statLabel: {
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: colors.grey2,
        marginTop: 4,
    },
})

interface TripOverviewPageProps {
    trip: PdfTripContext
    days: PdfDay[]
    stays: PdfStay[]
    mapboxToken?: string
}

export function TripOverviewPage({ days, stays, mapboxToken }: TripOverviewPageProps) {
    const cities = extractCityPoints(days, stays)
    const mapUrl = mapboxToken ? buildMapboxRouteUrl(cities, mapboxToken) : null
    const gmapsUrl = buildGoogleMapsDirectionsUrl(cities)
    const cityThumbs = pickCityThumbnails(days, stays)
    const stats = countTripStats(days, stays)

    return (
        <Page size="A4" style={pageStyles.page}>
            <PageChrome subtitle="Trip Overview" />

            <View style={styles.header}>
                <Text style={styles.sectionLabel}>At a glance</Text>
                <Text style={styles.sectionTitle}>Your route</Text>
                <View style={styles.accent} />
            </View>

            {mapUrl ? <Image src={mapUrl} style={styles.map} /> : null}
            {gmapsUrl ? (
                <Link src={gmapsUrl} style={[sharedStyles.link, styles.mapCta]}>
                    Open route in Google Maps →
                </Link>
            ) : null}

            {cities.length > 0 ? (
                <View style={styles.citiesGrid}>
                    {cities.map((city, i) => {
                        const thumb = cityThumbs.get(city.name)
                        // Real city thumbnail if we have one, else the
                        // Unsplash fallback. The colored map-pin block
                        // sits underneath as a third-tier safety net.
                        const imageSrc = isUsableUrl(thumb)
                            ? thumb
                            : FALLBACK_CITY_IMG
                        return (
                            <View
                                key={`${city.name}-${i}`}
                                style={styles.cityCard}
                                wrap={false}>
                                <View style={styles.cityThumbWrap}>
                                    <View style={styles.cityThumbFallback}>
                                        <KindIcon
                                            kind="place"
                                            size={22}
                                            color={colors.primaryDefault}
                                        />
                                    </View>
                                    <Image src={imageSrc} style={styles.cityThumb} />
                                    <View style={styles.cityBadge}>
                                        <Text style={styles.cityBadgeText}>{i + 1}</Text>
                                    </View>
                                </View>
                                <View style={styles.cityTextBlock}>
                                    <Text style={styles.cityName}>{city.name}</Text>
                                    <Text style={styles.cityNights}>
                                        {city.nights} day{city.nights === 1 ? '' : 's'}
                                    </Text>
                                </View>
                            </View>
                        )
                    })}
                </View>
            ) : null}

            {/* Stats — only render cards with non-zero values. A "0 Stays"
                card looks like a missing field, not a fact. */}
            <View style={styles.statsRow}>
                {stats.stays > 0 ? (
                    <StatCard
                        value={stats.stays}
                        label={stats.stays === 1 ? 'Stay' : 'Stays'}
                    />
                ) : null}
                {stats.experiences > 0 ? (
                    <StatCard
                        value={stats.experiences}
                        label={stats.experiences === 1 ? 'Experience' : 'Experiences'}
                    />
                ) : null}
                {stats.meals > 0 ? (
                    <StatCard
                        value={stats.meals}
                        label={stats.meals === 1 ? 'Restaurant' : 'Restaurants'}
                    />
                ) : null}
                {stats.flights > 0 ? (
                    <StatCard
                        value={stats.flights}
                        label={stats.flights === 1 ? 'Flight' : 'Flights'}
                    />
                ) : null}
            </View>

            <SiteFooter pageLabel="Overview" />
        </Page>
    )
}

function StatCard({ value, label }: { value: number; label: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    )
}

interface TripStats {
    stays: number
    experiences: number
    meals: number
    flights: number
}

function countTripStats(days: PdfDay[], stays: PdfStay[]): TripStats {
    let experiences = 0
    let meals = 0
    let flights = 0
    for (const day of days) {
        for (const slot of day.slots ?? []) {
            const k = (slot.kind || '').toLowerCase()
            if (k === 'experience' || k === 'place' || k === 'activity') experiences++
            else if (k === 'meal' || k === 'restaurant') meals++
            else if (k === 'flight' || k === 'train' || k === 'bus') flights++
        }
    }
    return { stays: stays.length, experiences, meals, flights }
}

// Per-city thumbnail = first day's hero in that city. Lets each card
// show a real photo of where the trip's going instead of an empty box.
function pickCityThumbnails(days: PdfDay[], _stays: PdfStay[]): Map<string, string> {
    const out = new Map<string, string>()
    for (const day of days) {
        const city = day.base_city?.name || day.destination_city?.name
        if (!city || out.has(city)) continue
        const url = pickDayHero(day)
        if (url) out.set(city, url)
    }
    return out
}
