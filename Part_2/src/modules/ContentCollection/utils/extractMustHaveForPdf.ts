// Walks a ContentCollection's sections and flattens the four Must Have
// section types into the shape the PDF module consumes. The PDF should
// not need to know the Section/Block structure.
import type { Block, Section } from '../types/contentCollection'
import type {
    PdfMustHaveData,
    PdfMustHaveLink,
    PdfMustHaveTextBlock,
} from '@/modules/Itinerary/pdf/types'
import { extractPlatformNameFromUrl, getPlatformLogoURL } from '@/constants/icons/platformIcons'

const isHttp = (s: unknown): s is string =>
    typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))

// Only emit raster URLs we trust: react-pdf can't render SVG, and a failed
// <Image> fetch aborts the whole PDF render. Unknown URL → undefined, and
// the appendix falls back to LINK_ICON.
function resolveLinkIconUrl(url: string): string | undefined {
    const platformLogo = getPlatformLogoURL(extractPlatformNameFromUrl(url))
    const isRaster =
        !!platformLogo &&
        (platformLogo.startsWith('data:') || /\.(png|jpe?g)(\?|$)/i.test(platformLogo))
    return isRaster ? platformLogo : undefined
}

function extractLinks(sections: Section[]): PdfMustHaveLink[] {
    const out: PdfMustHaveLink[] = []
    for (const section of sections) {
        if (section.section_type !== 'links') continue
        const block = section.blocks?.find(
            (b) => b.block_type === 'links' && Array.isArray(b.value?.items),
        )
        if (!block) continue
        const items = (block.value.items ?? []) as Array<{ url?: string }>
        const buttonLabel = (block.value.button_label as string) || undefined
        for (const item of items) {
            if (!isHttp(item?.url)) continue
            out.push({
                url: item.url,
                title: block.label ?? undefined,
                description: block.description ?? undefined,
                buttonLabel,
                iconUrl: resolveLinkIconUrl(item.url),
            })
        }
    }
    return out
}

function blocksToText(blocks: Block[] | undefined): PdfMustHaveTextBlock[] {
    const out: PdfMustHaveTextBlock[] = []
    for (const b of blocks ?? []) {
        if (b.block_type === 'text') {
            const desc = (b.value?.content ?? b.value?.text) as string | undefined
            if (b.label || desc) out.push({ title: b.label ?? undefined, description: desc })
        } else if (b.block_type === 'text_list') {
            const items = (b.value?.items ?? []) as unknown as string[]
            const cleaned = items.filter((s) => typeof s === 'string' && s.trim())
            if (cleaned.length) out.push({ title: b.label ?? undefined, items: cleaned })
        }
    }
    return out
}

// We only emit the inner blocks — the outer section.title (which is
// typically just the section type, e.g. "Tips" repeated for every row)
// would create a noisy "Tips → block → Tips → block" pattern in the PDF.
// The group header in the appendix already says "Tips" once.
function extractTextSections(sections: Section[], type: string): PdfMustHaveTextBlock[] {
    const out: PdfMustHaveTextBlock[] = []
    for (const section of sections) {
        if (section.section_type !== type) continue
        out.push(...blocksToText(section.blocks))
    }
    return out
}

export function extractMustHaveForPdf(sections: Section[] | undefined): PdfMustHaveData {
    if (!sections?.length) return {}
    return {
        links: extractLinks(sections),
        tips: extractTextSections(sections, 'tips'),
        visa: extractTextSections(sections, 'visa'),
        sim: extractTextSections(sections, 'sim'),
    }
}
