import { Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type {
    PdfMustHaveData,
    PdfMustHaveLink,
    PdfMustHaveTextBlock,
} from '../types'
import { LINK_ICON } from '@/constants/thiingsIcons'
import { colors, fonts, pageStyles, sizes } from '../theme'
import { renderMarkdownBold } from '../utils/renderMarkdownBold'

import { KindIcon } from './KindIcon'
import { PageChrome } from './PageChrome'
import { SiteFooter } from './SiteFooter'

const styles = StyleSheet.create({
    header: {
        marginTop: 56, // clear the fixed brand band
        marginBottom: 20,
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

    // Group block — icon + title with a faint divider, then a single
    // column of cards below.
    group: {
        marginBottom: 22,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    groupIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primaryPalePurple,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupTitle: {
        fontFamily: fonts.heading,
        fontSize: sizes.bodyLarge,
        fontWeight: 700,
        color: colors.grey0,
    },

    // Single-column card stack — much easier to scan than the previous
    // 2-col grid where dense paragraphs wrapped at ~200pt and looked
    // cramped.
    cardList: { flexDirection: 'column', gap: 8 },
    card: {
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.white,
    },
    cardIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primaryPalePurple,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    // White circle so the provider logo reads as a round avatar (matches the site).
    cardIconWrapImg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.grey4,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
    },
    cardIconImg: {
        width: 24,
        height: 24,
        borderRadius: 12,
        objectFit: 'cover',
    },
    cardBody: { flex: 1, minWidth: 0 },
    cardTitle: {
        fontFamily: fonts.heading,
        fontSize: sizes.body,
        fontWeight: 700,
        color: colors.grey0,
    },
    cardDesc: {
        marginTop: 3,
        fontSize: sizes.metaSmall,
        color: colors.grey1,
        lineHeight: 1.5,
    },
    cta: {
        marginTop: 8,
        fontSize: sizes.label,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: colors.primaryDefault,
        textDecoration: 'underline',
        alignSelf: 'flex-start',
    },
    bullet: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    bulletDot: {
        fontSize: sizes.metaSmall,
        color: colors.primaryDefault,
        fontWeight: 700,
    },
    bulletText: {
        flex: 1,
        fontSize: sizes.metaSmall,
        color: colors.grey1,
        lineHeight: 1.5,
    },
})

export function MustHaveAppendix({ data }: { data: PdfMustHaveData }) {
    const links = data.links ?? []
    const tips = data.tips ?? []
    const visa = data.visa ?? []
    const sim = data.sim ?? []
    if (!links.length && !tips.length && !visa.length && !sim.length) return null

    return (
        <Page size="A4" style={pageStyles.page}>
            <PageChrome subtitle="Appendix" />

            <View style={styles.header}>
                <Text style={styles.sectionLabel}>Appendix</Text>
                <Text style={styles.sectionTitle}>Must-have for your trip</Text>
                <View style={styles.accent} />
            </View>

            {links.length ? (
                <Group title="Useful Links" iconKind="link">
                    {links.map((link, i) => (
                        <LinkCard key={`${link.url}-${i}`} link={link} />
                    ))}
                </Group>
            ) : null}
            {tips.length ? (
                <Group title="Tips" iconKind="tips">
                    {tips.map((b, i) => (
                        <TipCard key={i} block={b} iconKind="tips" />
                    ))}
                </Group>
            ) : null}
            {visa.length ? (
                <Group title="Visa" iconKind="visa">
                    {visa.map((b, i) => (
                        <TipCard key={i} block={b} iconKind="visa" />
                    ))}
                </Group>
            ) : null}
            {sim.length ? (
                <Group title="SIM & Connectivity" iconKind="sim">
                    {sim.map((b, i) => (
                        <TipCard key={i} block={b} iconKind="sim" />
                    ))}
                </Group>
            ) : null}

            <SiteFooter pageLabel="Must Have" />
        </Page>
    )
}

interface GroupProps {
    title: string
    iconKind: string
    children: React.ReactNode
}

function Group({ title, iconKind, children }: GroupProps) {
    return (
        <View style={styles.group}>
            <View style={styles.groupHeader}>
                <View style={styles.groupIconWrap}>
                    <KindIcon kind={iconKind} size={16} color={colors.primaryDefault} />
                </View>
                <Text style={styles.groupTitle}>{title}</Text>
            </View>
            <View style={styles.cardList}>{children}</View>
        </View>
    )
}

function LinkCard({ link }: { link: PdfMustHaveLink }) {
    // Plain View (not Link) so only the CTA below carries the underline.
    const iconSrc = link.iconUrl || LINK_ICON
    return (
        <View style={styles.card} wrap={false}>
            <View style={styles.cardIconWrapImg}>
                <Image src={iconSrc} style={styles.cardIconImg} />
            </View>
            <View style={styles.cardBody}>
                {link.title ? (
                    <Text style={styles.cardTitle}>{renderMarkdownBold(link.title)}</Text>
                ) : null}
                {link.description ? (
                    <Text style={styles.cardDesc}>{renderMarkdownBold(link.description)}</Text>
                ) : null}
                <Link src={link.url} style={styles.cta}>
                    {(link.buttonLabel || 'Open').toUpperCase()} →
                </Link>
            </View>
        </View>
    )
}

function TipCard({
    block,
    iconKind,
}: {
    block: PdfMustHaveTextBlock
    iconKind: string
}) {
    return (
        <View style={styles.card} wrap={false}>
            <View style={styles.cardIconWrap}>
                <KindIcon kind={iconKind} size={18} color={colors.primaryDefault} />
            </View>
            <View style={styles.cardBody}>
                {block.title ? (
                    <Text style={styles.cardTitle}>{renderMarkdownBold(block.title)}</Text>
                ) : null}
                {block.description ? (
                    <Text style={styles.cardDesc}>{renderMarkdownBold(block.description)}</Text>
                ) : null}
                {block.items?.map((item, j) => (
                    <View key={j} style={styles.bullet}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{renderMarkdownBold(item)}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}
