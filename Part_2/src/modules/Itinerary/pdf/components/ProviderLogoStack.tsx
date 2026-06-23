// Cluster of overlapping platform logos shown next to "Book / View
// deals / View live rates" CTAs. Conveys "we compare across these
// brands" without needing live deal data inside the PDF.
//
// Logos come from src/constants/icons/platformIcons.ts — same source
// the website uses for the activities/stays tabs. Brandfetch CDN with
// permissive CORS, so they work in react-pdf's Image without extra
// validation.
import { Image, StyleSheet, View } from '@react-pdf/renderer'

import { PLATFORM_ICONS } from '@/constants/icons/platformIcons'

import { colors } from '../theme'

// Three providers per context — matches the typical compare-grid on
// the website. Order = least to most recognised so the overlap reads
// left → right.
export const EXPERIENCE_PROVIDERS: string[] = [
    PLATFORM_ICONS.KLOOK,
    PLATFORM_ICONS.HEADOUT,
    PLATFORM_ICONS.GETYOURGUIDE,
]
export const STAY_PROVIDERS: string[] = [
    PLATFORM_ICONS.AGODA,
    PLATFORM_ICONS.EXPEDIA,
    PLATFORM_ICONS.BOOKING_COM,
]

interface ProviderLogoStackProps {
    logos: string[]
    size?: number
}

export function ProviderLogoStack({ logos, size = 18 }: ProviderLogoStackProps) {
    if (!logos.length) return null
    const overlap = Math.round(size * 0.42)
    return (
        <View style={styles.stack}>
            {logos.map((url, i) => (
                <Image
                    key={i}
                    src={url}
                    style={[
                        styles.logo,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            marginLeft: i === 0 ? 0 : -overlap,
                        },
                    ]}
                />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    stack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        objectFit: 'cover',
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.white,
    },
})
