// PDF mirror of TourCard from the Activities tab. Layout intentionally
// matches the website's card so the brand feel carries over:
//   - Border: purple-default, rounded corners
//   - Top-right corner: "RECOMMENDED" pill on highlighted cards
//   - Top-left:  platform logo + name
//   - Title (2-line max — react-pdf clamps via maxLines on <Text>)
//   - Chip row: duration · cancellation · rating
//   - Price ("from $X") + BOOK pill at the bottom
//
// Deals come pre-fetched into PdfData.deals by handleDownloadPDF; we
// take up to 3 per experience to keep the PDF compact.
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer'

import { getPlatformLogoURL } from '@/constants/icons/platformIcons'

import type { PdfTourDeal } from '../types'
import { colors, fonts, sizes } from '../theme'

const styles = StyleSheet.create({
    list: {
        flexDirection: 'column',
        gap: 8,
        marginTop: 8,
    },

    card: {
        position: 'relative',
        flexDirection: 'column',
        padding: 12,
        paddingRight: 100, // reserve room for the absolute price/CTA block
        borderRadius: 10,
        borderWidth: 1.2,
        borderColor: colors.cardBorder,
        backgroundColor: colors.white,
    },
    cardRecommended: {
        borderColor: colors.primaryDefault,
    },

    // Top-right corner badge — only on recommended tours.
    badge: {
        position: 'absolute',
        top: -1,
        right: -1,
        backgroundColor: colors.primaryDefault,
        color: colors.white,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderTopRightRadius: 9,
        borderBottomLeftRadius: 6,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    platformLogo: {
        width: 16,
        height: 16,
        borderRadius: 8,
        objectFit: 'contain',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.grey4,
    },
    platformName: {
        fontSize: sizes.label,
        color: colors.grey2,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    title: {
        fontFamily: fonts.heading,
        fontSize: sizes.body,
        fontWeight: 700,
        color: colors.grey0,
        lineHeight: 1.25,
        marginBottom: 6,
    },

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 2,
    },
    chip: {
        fontSize: 8.5,
        color: colors.grey1,
        fontWeight: 600,
        backgroundColor: colors.grey5,
        borderWidth: 0.5,
        borderColor: colors.grey4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
    },

    // Right rail — absolute so price + button stay aligned regardless
    // of card height when title wraps.
    rightRail: {
        position: 'absolute',
        right: 12,
        top: 12,
        bottom: 12,
        width: 84,
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    priceFromLabel: {
        fontSize: 8.5,
        color: colors.grey2,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    price: {
        fontFamily: fonts.heading,
        fontSize: sizes.bodyLarge,
        fontWeight: 700,
        color: colors.grey0,
        marginTop: 1,
    },
    priceType: {
        fontSize: 8,
        color: colors.grey2,
        marginTop: 1,
    },
    bookButton: {
        alignSelf: 'flex-end',
        backgroundColor: colors.white,
        borderRadius: 6,
        borderWidth: 1.2,
        borderColor: colors.primaryDefault,
        paddingVertical: 5,
        paddingHorizontal: 9,
        color: colors.primaryDefault,
        fontSize: 8.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textDecoration: 'none',
    },
})

interface DealCardListProps {
    deals: PdfTourDeal[]
}

export function DealCardList({ deals }: DealCardListProps) {
    if (!deals.length) return null
    return (
        <View style={styles.list}>
            {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
            ))}
        </View>
    )
}

function DealCard({ deal }: { deal: PdfTourDeal }) {
    const logoUrl = getPlatformLogoURL(deal.platform_name)
    const priceLabel = formatPrice(deal.price)
    const durationLabel = formatDuration(deal.duration_minutes)
    const cancellationLabel = formatCancellation(deal.cancellation_policy)
    const ratingLabel = deal.rating ? `★ ${deal.rating.toFixed(1)}` : null

    return (
        <View
            style={
                deal.is_recommended
                    ? [styles.card, styles.cardRecommended]
                    : styles.card
            }
            wrap={false}>
            {deal.is_recommended ? (
                <Text style={styles.badge}>Recommended</Text>
            ) : null}

            <View style={styles.headerRow}>
                {logoUrl ? <Image src={logoUrl} style={styles.platformLogo} /> : null}
                <Text style={styles.platformName}>
                    {humanisePlatform(deal.platform_name)}
                </Text>
            </View>

            <Text style={styles.title}>{deal.name || 'View tour'}</Text>

            <View style={styles.chipRow}>
                {cancellationLabel ? (
                    <Text style={styles.chip}>{cancellationLabel}</Text>
                ) : null}
                {durationLabel ? (
                    <Text style={styles.chip}>{durationLabel}</Text>
                ) : null}
                {ratingLabel ? <Text style={styles.chip}>{ratingLabel}</Text> : null}
            </View>

            <View style={styles.rightRail}>
                <View style={{ alignItems: 'flex-end' }}>
                    {priceLabel ? (
                        <>
                            <Text style={styles.priceFromLabel}>From</Text>
                            <Text style={styles.price}>{priceLabel}</Text>
                            {deal.price?.price_type ? (
                                <Text style={styles.priceType}>
                                    {humanisePriceType(deal.price.price_type)}
                                </Text>
                            ) : null}
                        </>
                    ) : null}
                </View>
                {deal.link ? (
                    <Link src={deal.link} style={styles.bookButton}>
                        Book →
                    </Link>
                ) : null}
            </View>
        </View>
    )
}

// ────────────────────── formatters ──────────────────────

function formatPrice(price: PdfTourDeal['price']): string | null {
    if (!price || price.min_price == null) return null
    const symbol = CURRENCY_SYMBOLS[price.currency ?? ''] ?? `${price.currency ?? ''} `
    // Round to nearest integer for headline pricing — the .99 noise
    // doesn't help on a 18pt headline.
    return `${symbol}${Math.round(price.min_price).toLocaleString('en-IN')}`
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    AED: 'AED ',
    MYR: 'RM',
    THB: '฿',
    JPY: '¥',
}

function formatDuration(minutes: number | null): string | null {
    if (!minutes || minutes <= 0) return null
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h}h ${m}m` : `${h}h`
}

function formatCancellation(policy: string | null): string | null {
    if (!policy) return null
    const norm = policy.toLowerCase()
    if (norm.includes('non')) return 'Non-refundable'
    if (norm.includes('refund')) return 'Refundable'
    return policy
}

function humanisePlatform(name: string): string {
    return name
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanisePriceType(type: string): string {
    return type.replace(/_/g, ' ')
}
