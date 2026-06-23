// `fixed` makes react-pdf repeat the footer on every page break.
//
// No logo here — the brand band at the top of every page already
// carries it, so the previous version showed "Rimigo logo + © Rimigo"
// right next to each other, which read as accidental duplication.
import { Link, StyleSheet, Text, View } from '@react-pdf/renderer'

import { colors, fonts, sizes } from '../theme'

interface SiteFooterProps {
    pageLabel?: string
    /** Absolute URL used in the CTA link. Defaults to rimigo.com. */
    ctaUrl?: string
}

export function SiteFooter({
    pageLabel,
    ctaUrl = 'https://rimigo.com',
}: SiteFooterProps) {
    return (
        <View style={styles.wrap} fixed>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={styles.copyright}>
                    © Rimigo · Viareel Travel Pvt Ltd
                </Text>
                <View style={styles.right}>
                    <Link src={ctaUrl} style={styles.cta}>
                        Plan your trip on rimigo.com →
                    </Link>
                    {pageLabel ? (
                        <Text style={styles.pageLabel}>{pageLabel}</Text>
                    ) : null}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        bottom: 24,
        left: 48,
        right: 48,
    },
    divider: {
        height: 0.5,
        backgroundColor: colors.grey4,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    copyright: {
        fontFamily: fonts.body,
        fontSize: sizes.label,
        color: colors.grey2,
        letterSpacing: 0.2,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cta: {
        fontFamily: fonts.body,
        fontSize: sizes.label,
        fontWeight: 700,
        color: colors.primaryDefault,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textDecoration: 'none',
    },
    pageLabel: {
        fontFamily: fonts.body,
        fontSize: sizes.label,
        color: colors.grey3,
    },
})
