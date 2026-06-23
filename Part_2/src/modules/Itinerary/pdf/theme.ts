// Mirrors the screen palette in src/index.css — single source of truth
// for every PDF component. Update here when the screen palette shifts.
import { Font, StyleSheet } from '@react-pdf/renderer'

// Self-host TTFs from public/fonts/. A prior attempt registered Google's
// `/v15/…ttf` URLs, which 404 silently when Google bumps the version hash.
export const fonts = {
    body: 'Manrope',
    heading: 'RedHatDisplay',
} as const

// Node (scripts/render-pdf-preview.tsx) has no fetch baseUrl, so we
// hand react-pdf a file:// URL it can read directly; in the browser
// /fonts/* is served by Vite from public/.
const FONT_BASE = typeof window === 'undefined'
    ? new URL('../../../../public/fonts/', import.meta.url).href
    : '/fonts/'

Font.register({
    family: fonts.body,
    fonts: [
        { src: `${FONT_BASE}Manrope-Regular.ttf`, fontWeight: 400 },
        { src: `${FONT_BASE}Manrope-Medium.ttf`, fontWeight: 500 },
        { src: `${FONT_BASE}Manrope-Semibold.ttf`, fontWeight: 600 },
        { src: `${FONT_BASE}Manrope-Bold.ttf`, fontWeight: 700 },
    ],
})

Font.register({
    family: fonts.heading,
    fonts: [
        { src: `${FONT_BASE}RedHatDisplay-Regular.ttf`, fontWeight: 400 },
        { src: `${FONT_BASE}RedHatDisplay-Medium.ttf`, fontWeight: 500 },
        { src: `${FONT_BASE}RedHatDisplay-SemiBold.ttf`, fontWeight: 600 },
        { src: `${FONT_BASE}RedHatDisplay-Bold.ttf`, fontWeight: 700 },
    ],
})

// Disable hyphenation: react-pdf's default inserts hyphens into proper
// nouns (e.g. "Bang-aluru"). Prefer word-boundary wraps.
Font.registerHyphenationCallback((word) => [word])

export const colors = {
    // Greys (from --color-grey-0..6)
    grey0: '#101010',
    grey1: '#363636',
    grey2: '#747474',
    grey3: '#aeaeae',
    grey4: '#e0e0e0',
    grey5: '#f8f8f8',

    // Brand
    primaryDefault: '#7011f6',
    primaryLight: '#ab72fb',
    primaryPalePurple: '#f5edff',

    // Kanban / website kind palette. Hex from DesktopKanbanView's
    // TRANSPORT_PILL_STYLES + STAY_PILL_STYLES so PDF kind colors
    // track the screen.
    blue50: '#eff6ff',
    blue600: '#2563eb',
    blue700: '#1d4ed8',
    teal50: '#f0fdfa',
    teal600: '#0d9488',
    teal700: '#0f766e',
    cyan50: '#ecfeff',
    cyan600: '#0891b2',
    orange50: '#fff7ed',
    orange600: '#ea580c',
    orange700: '#c2410c',
    amber50: '#fffbeb',
    amber700: '#b45309',
    emerald50: '#ecfdf5',
    emerald700: '#047857',
    rose50: '#fff1f2',
    rose700: '#be123c',
    indigo50: '#eef2ff',
    indigo700: '#4338ca',
    sky50: '#f0f9ff',
    sky700: '#0369a1',

    // Page / surface
    white: '#ffffff',
    cardBorder: '#ebecef',
}

// react-pdf size units are points, not pixels. 11pt body / 9pt label
// is the legibility floor for print.
export const sizes = {
    label: 9,           // small uppercase pills
    metaSmall: 10,      // sub-line
    meta: 11,           // primary meta
    body: 12,           // standard body
    bodyLarge: 13,      // emphasised body
    title: 14,          // slot title
    sectionTitle: 16,   // day header
    h1: 22,             // page titles
    h0: 32,             // cover hero
}

export const pageStyles = StyleSheet.create({
    page: {
        backgroundColor: colors.white,
        fontFamily: fonts.body,
        fontSize: sizes.body,
        color: colors.grey0,
        paddingTop: 48,
        paddingBottom: 80, // extra room for the website-style footer
        paddingHorizontal: 48,
    },
    pageFooter: {
        position: 'absolute',
        bottom: 28,
        left: 48,
        right: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: sizes.label,
        color: colors.grey3,
    },
})

export const sharedStyles = StyleSheet.create({
    pill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    hairline: {
        borderBottomWidth: 0.5,
        borderBottomColor: colors.grey4,
        marginVertical: 8,
    },
    cardTitle: {
        fontFamily: fonts.heading,
        fontSize: sizes.title,
        fontWeight: 700,
        color: colors.grey0,
    },
    metaLine: {
        fontSize: sizes.meta,
        color: colors.grey1,
        marginTop: 2,
    },
    label: {
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: colors.grey2,
    },
    link: {
        color: colors.primaryDefault,
        textDecoration: 'none',
    },
})

// Mirrors DesktopKanbanView.TRANSPORT_PILL_STYLES + STAY_PILL_STYLES
// so PDF kind colors read the same as the website. Update both if
// either drifts.
export const categoryColors: Record<string, { bg: string; fg: string; label: string }> = {
    // Transport — blue family (flight/bus/car/taxi/transfer), teal
    // (train/private), cyan (boat/ferry).
    flight: { bg: colors.blue50, fg: colors.blue600, label: 'Flight' },
    transport: { bg: colors.blue50, fg: colors.blue700, label: 'Transport' },
    bus: { bg: colors.blue50, fg: colors.blue600, label: 'Bus' },
    shuttle: { bg: colors.blue50, fg: colors.blue600, label: 'Shuttle' },
    car: { bg: colors.blue50, fg: colors.blue700, label: 'Car' },
    transfer: { bg: colors.blue50, fg: colors.blue700, label: 'Transfer' },
    taxi: { bg: colors.blue50, fg: colors.blue700, label: 'Taxi' },
    train: { bg: colors.teal50, fg: colors.teal700, label: 'Train' },
    private_transport: { bg: colors.teal50, fg: colors.teal700, label: 'Private transport' },
    boat: { bg: colors.cyan50, fg: colors.cyan600, label: 'Boat' },
    ferry: { bg: colors.cyan50, fg: colors.cyan600, label: 'Ferry' },

    // Stays — orange family.
    stay: { bg: colors.orange50, fg: colors.orange600, label: 'Hotel' },
    hotel: { bg: colors.orange50, fg: colors.orange600, label: 'Hotel' },

    // Experiences — emerald.
    experience: { bg: colors.emerald50, fg: colors.emerald700, label: 'Experience' },
    place: { bg: colors.emerald50, fg: colors.emerald700, label: 'Place' },
    activity: { bg: colors.emerald50, fg: colors.emerald700, label: 'Activity' },

    // Meals — amber.
    meal: { bg: colors.amber50, fg: colors.amber700, label: 'Meal' },
    restaurant: { bg: colors.amber50, fg: colors.amber700, label: 'Restaurant' },

    visa: { bg: colors.rose50, fg: colors.rose700, label: 'Visa' },

    custom: { bg: colors.grey5, fg: colors.grey1, label: 'Free time' },
    free_time: { bg: colors.grey5, fg: colors.grey1, label: 'Free time' },
}
