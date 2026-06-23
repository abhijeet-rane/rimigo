import { Image, StyleSheet, View } from '@react-pdf/renderer'

// react-pdf's <Image> loader uses fs.open in Node and fetch in the
// browser, so the two environments need different src shapes:
//   - Browser: URL like /rimigo_logo_indigo.png served by Vite
//   - Node:    absolute filesystem path (NOT a file:// URL — the Node
//              loader passes it directly to fs)
function resolveLogo(filename: string): string {
    if (typeof window !== 'undefined') return `/${filename}`
    const base = new URL('../../../../../public/', import.meta.url)
    return new URL(filename, base).pathname
}

const LOGOS = {
    indigo: resolveLogo('rimigo_logo_indigo.png'),
    dark: resolveLogo('rimigo_logo_dark.png'),
} as const

interface RimigoMarkProps {
    variant?: keyof typeof LOGOS
    /** Height in pt. Width is derived from the logo's ~3.2:1 ratio. */
    height?: number
}

export function RimigoMark({ variant = 'indigo', height = 16 }: RimigoMarkProps) {
    const width = height * (3044 / 952) // native aspect of the source file
    return (
        <View style={styles.wrap}>
            <Image src={LOGOS[variant]} style={{ width, height }} />
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
})
