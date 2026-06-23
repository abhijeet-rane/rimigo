// `file_url` is a presigned URL (~6h expiry) — older PDFs will need a
// re-export to get fresh links.
import { Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { Voucher } from '@/api/voucherAPI/voucherAPI'

import { categoryColors, colors, pageStyles, sharedStyles, sizes } from '../theme'
import { formatShortDate, formatTime } from '../utils/format'

import { PageChrome } from './PageChrome'
import { SiteFooter } from './SiteFooter'

const styles = StyleSheet.create({
    header: {
        marginTop: 56, // clear the fixed brand band
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.grey4,
    },
    accent: {
        marginTop: 10,
        height: 3,
        width: 60,
        backgroundColor: colors.primaryDefault,
    },
    sectionLabel: {
        fontSize: sizes.label,
        color: colors.grey2,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionTitle: {
        fontSize: sizes.sectionTitle,
        fontWeight: 700,
        color: colors.grey0,
        marginTop: 4,
    },
    sub: {
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.grey4,
    },
    body: { flexGrow: 1, flexShrink: 1 },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    meta: {
        fontSize: sizes.meta,
        color: colors.grey1,
        marginTop: 3,
    },
    refs: {
        fontSize: sizes.metaSmall,
        color: colors.grey2,
        marginTop: 3,
    },
    categoryPill: {
        flexShrink: 0,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    empty: {
        fontSize: sizes.meta,
        color: colors.grey2,
        marginTop: 12,
    },
})

export function VouchersAppendix({ vouchers }: { vouchers: Voucher[] }) {
    if (!vouchers || vouchers.length === 0) return null

    // Chronological by extracted start; pending rows fall to the bottom.
    const sorted = [...vouchers].sort((a, b) => {
        const aStart = a.extracted?.start_datetime || ''
        const bStart = b.extracted?.start_datetime || ''
        if (aStart && bStart) return aStart.localeCompare(bStart)
        if (aStart) return -1
        if (bStart) return 1
        return (a.created_at || '').localeCompare(b.created_at || '')
    })

    return (
        <Page size="A4" style={pageStyles.page}>
            <PageChrome subtitle="Appendix" />

            <View style={styles.header}>
                <Text style={styles.sectionLabel}>Appendix</Text>
                <Text style={styles.sectionTitle}>All booking vouchers</Text>
                <View style={styles.accent} />
                <Text style={styles.sub}>
                    {sorted.length} {sorted.length === 1 ? 'voucher' : 'vouchers'} ·
                    Open links may expire — refresh from the Rimigo app if a link doesn't load.
                </Text>
            </View>

            <View>
                {sorted.map((v) => (
                    <VoucherRow key={v.voucher_id} voucher={v} />
                ))}
            </View>

            <SiteFooter pageLabel="Vouchers" />
        </Page>
    )
}

function VoucherRow({ voucher }: { voucher: Voucher }) {
    const e = voucher.extracted || {}
    const category = (voucher.category || 'other').toLowerCase()
    const visual = categoryColors[category] ?? categoryColors.custom
    const title = e.title || voucher.filename || 'Voucher'
    const provider = e.provider || ''
    const date = formatShortDate(e.start_datetime) || ''
    const time = formatTime(e.start_datetime) || ''
    const dateLine = [date, time].filter(Boolean).join(' · ')

    const refs: string[] = []
    if (e.pnr) refs.push(`PNR ${e.pnr}`)
    if (e.booking_ref && e.booking_ref !== e.pnr) refs.push(`Ref ${e.booking_ref}`)
    const cd = e.category_data || {}
    if (cd.flight_number) refs.push(`Flight ${cd.flight_number}`)
    if (cd.seat) refs.push(`Seat ${cd.seat}`)
    if (cd.gate) refs.push(`Gate ${cd.gate}`)
    if (cd.room_no) refs.push(`Room ${cd.room_no}`)

    return (
        <View style={styles.row} wrap={false}>
            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <Text style={[sharedStyles.cardTitle, { flexGrow: 1 }]}>{title}</Text>
                    <Text style={[styles.categoryPill, { backgroundColor: visual.bg, color: visual.fg }]}>
                        {visual.label}
                    </Text>
                </View>
                {provider || dateLine ? (
                    <Text style={styles.meta}>
                        {[provider, dateLine].filter(Boolean).join(' · ')}
                    </Text>
                ) : null}
                {refs.length > 0 ? <Text style={styles.refs}>{refs.join(' · ')}</Text> : null}
                {voucher.file_url ? (
                    <Text style={styles.meta}>
                        <Link src={voucher.file_url} style={sharedStyles.link}>
                            Open file
                        </Link>
                    </Text>
                ) : null}
            </View>
        </View>
    )
}
