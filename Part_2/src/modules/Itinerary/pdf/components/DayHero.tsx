import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'

import { colors, fonts, sizes } from '../theme'

const styles = StyleSheet.create({
    wrap: {
        marginTop: 56, // clear the fixed brand band
        marginBottom: 16,
        position: 'relative',
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
    },
    image: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        objectFit: 'cover',
    },
    // Bottom-anchored dark scrim so the white overlay text reads on any photo.
    scrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 90,
        backgroundColor: '#000',
        opacity: 0.45,
    },
    overlay: {
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: 14,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    badge: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primaryDefault,
    },
    badgeLabel: {
        color: colors.white,
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    badgeNumber: {
        color: colors.white,
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1,
        marginTop: 1,
    },
    textBlock: { flex: 1, flexDirection: 'column' },
    title: {
        fontFamily: fonts.heading,
        fontSize: sizes.h1,
        fontWeight: 700,
        color: colors.white,
        lineHeight: 1.1,
    },
    sub: {
        fontFamily: fonts.body,
        fontSize: sizes.meta,
        color: colors.white,
        opacity: 0.92,
        marginTop: 3,
    },
})

interface DayHeroProps {
    dayNumber: number
    dateLabel: string
    city?: string
    imageUrl: string
}

export function DayHero({ dayNumber, dateLabel, city, imageUrl }: DayHeroProps) {
    return (
        <View style={styles.wrap}>
            <Image src={imageUrl} style={styles.image} />
            <View style={styles.scrim} />
            <View style={styles.overlay}>
                <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>Day</Text>
                    <Text style={styles.badgeNumber}>{dayNumber}</Text>
                </View>
                <View style={styles.textBlock}>
                    <Text style={styles.title}>{dateLabel}</Text>
                    {city ? <Text style={styles.sub}>{city}</Text> : null}
                </View>
            </View>
        </View>
    )
}
