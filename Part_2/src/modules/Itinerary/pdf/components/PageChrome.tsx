// `fixed` makes react-pdf repeat the strip on every page break.
import { StyleSheet, Text, View } from '@react-pdf/renderer'

import { colors, fonts, sizes } from '../theme'

import { RimigoMark } from './RimigoMark'

const styles = StyleSheet.create({
    band: {
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
    sub: {
        fontFamily: fonts.body,
        color: colors.grey2,
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
})

export function PageChrome({ subtitle }: { subtitle?: string }) {
    return (
        <View style={styles.band} fixed>
            <RimigoMark variant="indigo" height={18} />
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
    )
}
