import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { PdfStay, PdfTripContext } from '../types'
import { colors, fonts, sizes } from '../theme'
import { buildStayUrl } from '../utils/buildDeepLinks'
import { isUsableUrl } from '../utils/extractImage'
import { formatShortDate } from '../utils/format'
import type { StayDayRole } from '../utils/pickStayForDay'

import { KindIcon } from './KindIcon'
import { ProviderLogoStack, STAY_PROVIDERS } from './ProviderLogoStack'

// Stable Unsplash hotel-room photo used when stay.hotel_image_url is
// missing OR the real URL fails to fetch. Has CORS, won't expire.
const FALLBACK_HOTEL_IMG =
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        padding: 10,
        backgroundColor: colors.orange50,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fed7aa', // orange-200
    },
    // Image area is a layered container — three tiers of fallback so a
    // photo always appears:
    //   bottom  = orange-tinted icon block (last-resort if even Unsplash fails)
    //   middle  = Unsplash hotel photo (always loads)
    //   top     = real stay.hotel_image_url (when present + valid)
    imageWrap: {
        position: 'relative',
        width: 80,
        height: 60,
        flexShrink: 0,
    },
    imageFallback: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 6,
        backgroundColor: '#fed7aa', // orange-200
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 6,
        objectFit: 'cover',
    },
    body: { flex: 1, minWidth: 0 },
    kicker: {
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: colors.orange700,
        marginBottom: 3,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: sizes.title,
        fontWeight: 700,
        color: colors.grey0,
        lineHeight: 1.2,
    },
    meta: {
        fontSize: sizes.metaSmall,
        color: colors.grey1,
        marginTop: 3,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    cta: {
        fontSize: sizes.label,
        fontWeight: 700,
        color: colors.primaryDefault,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textDecoration: 'none',
    },
})

const ROLE_LABEL: Record<StayDayRole, string> = {
    'check-in': 'Check-in tonight',
    staying: 'Staying tonight',
    'check-out': 'Checking out',
}

interface StayBannerProps {
    stay: PdfStay
    role: StayDayRole
    trip: PdfTripContext
    origin: string
}

export function StayBanner({ stay, role, trip, origin }: StayBannerProps) {
    const url = buildStayUrl({ origin, stay, trip })
    const dates = [formatShortDate(stay.check_in_date), formatShortDate(stay.check_out_date)]
        .filter(Boolean)
        .join(' – ')
    const nightsLine = stay.nights
        ? `${stay.nights} night${stay.nights === 1 ? '' : 's'}`
        : ''
    const subline = [dates, nightsLine, stay.room_type].filter(Boolean).join('  ·  ')
    const realPhotoUrl = isUsableUrl(stay.hotel_image_url)
        ? stay.hotel_image_url
        : null

    return (
        <View style={styles.card} wrap={false}>
            <View style={styles.imageWrap}>
                {/* Tier 3 — colored block + bed icon (last resort) */}
                <View style={styles.imageFallback}>
                    <KindIcon kind="stay" size={28} color={colors.orange600} />
                </View>
                {/* Tier 2 — Unsplash hotel photo (always tries to load) */}
                <Image src={FALLBACK_HOTEL_IMG} style={styles.imageOverlay} />
                {/* Tier 1 — real photo overlay (when present + valid). If
                    it fails to fetch react-pdf renders empty, so the
                    Unsplash tier beneath remains visible. */}
                {realPhotoUrl ? (
                    <Image src={realPhotoUrl} style={styles.imageOverlay} />
                ) : null}
            </View>
            <View style={styles.body}>
                <Text style={styles.kicker}>{ROLE_LABEL[role]}</Text>
                <Text style={styles.title}>{stay.hotel_name}</Text>
                {subline ? <Text style={styles.meta}>{subline}</Text> : null}
                {url ? (
                    <View style={styles.ctaRow}>
                        <ProviderLogoStack logos={STAY_PROVIDERS} size={16} />
                        <Link src={url} style={styles.cta}>
                            View live rates on Rimigo →
                        </Link>
                    </View>
                ) : null}
            </View>
        </View>
    )
}
