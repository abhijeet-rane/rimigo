import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    AlertTriangle,
    Calendar,
    FileSpreadsheet,
    FileText,
    FileType2,
    Hotel,
    Instagram,
    MapPin,
    Plane,
    Sheet,
    Sparkles,
    Star,
    UtensilsCrossed,
    X,
    Youtube,
} from 'lucide-react'

import { cn } from '@/lib/utils'

import type {
    AttachmentDraft,
    AttachmentInsights,
    AttachmentKind,
} from '@/modules/AtaAgent/types/Attachments'

export interface AttachmentPreviewPopoverProps {
    /** The chip the user clicked. We expect status='completed'. */
    draft: AttachmentDraft
    anchorRect: DOMRect | null
    onClose: () => void
}

const KIND_THEME: Record<
    AttachmentKind,
    {
        bg: string
        color: string
        icon: React.ReactNode
        label: string
    }
> = {
    youtube: {
        bg: 'bg-rose-50',
        color: 'text-rose-600',
        icon: <Youtube size={18} strokeWidth={2.25} />,
        label: 'YouTube',
    },
    instagram: {
        bg: 'bg-fuchsia-50',
        color: 'text-fuchsia-600',
        icon: <Instagram size={18} strokeWidth={2.25} />,
        label: 'Instagram',
    },
    pdf: {
        bg: 'bg-sky-50',
        color: 'text-sky-600',
        icon: <FileText size={18} strokeWidth={2.25} />,
        label: 'PDF',
    },
    docx: {
        bg: 'bg-indigo-50',
        color: 'text-indigo-600',
        icon: <FileType2 size={18} strokeWidth={2.25} />,
        label: 'Word doc',
    },
    xlsx: {
        bg: 'bg-emerald-50',
        color: 'text-emerald-600',
        icon: <FileSpreadsheet size={18} strokeWidth={2.25} />,
        label: 'Spreadsheet',
    },
    csv: {
        bg: 'bg-emerald-50',
        color: 'text-emerald-600',
        icon: <Sheet size={18} strokeWidth={2.25} />,
        label: 'CSV',
    },
}

const SECTION_META: Array<{
    key: keyof AttachmentInsights
    label: string
    icon: React.ReactNode
}> = [
    { key: 'hotels', label: 'Hotels', icon: <Hotel size={13} /> },
    { key: 'activities', label: 'Activities', icon: <Star size={13} /> },
    { key: 'destinations', label: 'Destinations', icon: <MapPin size={13} /> },
    { key: 'meals', label: 'Meals', icon: <UtensilsCrossed size={13} /> },
    { key: 'transport', label: 'Transport', icon: <Plane size={13} /> },
]

export const AttachmentPreviewPopover: React.FC<AttachmentPreviewPopoverProps> = ({
    draft,
    anchorRect,
    onClose,
}) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('[data-attachment-preview]')) return
            if (target.closest('[data-attachment-chip]')) return
            onClose()
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('mousedown', onClick)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('mousedown', onClick)
        }
    }, [onClose])

    const theme = KIND_THEME[draft.kind]
    const insights = draft.record?.insights || ({} as AttachmentInsights)
    const summary =
        draft.record?.summary || insights.summary || 'No summary available.'
    const title = draft.record?.title || draft.label
    const sourceUrl = draft.sourceUrl || draft.record?.source_url

    // Optional thumbnail (oEmbed lands here from BE source_metadata)
    const thumbnailUrl =
        (draft.record as any)?.thumbnail_url ||
        (insights as any)?.thumbnail_url ||
        null

    // Anchor to the chip with overflow protection.
    // On narrow viewports (mobile) the fixed 380px width overflowed past the
    // right edge — clamp width to the available viewport so the popover never
    // exits the screen.
    const SIDE_GUTTER = 12
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 380
    const POPOVER_WIDTH = Math.min(380, viewportWidth - SIDE_GUTTER * 2)
    const top = anchorRect ? anchorRect.top - 12 : 100
    const rawLeft = anchorRect ? anchorRect.left : SIDE_GUTTER
    const left = Math.max(
        SIDE_GUTTER,
        Math.min(rawLeft, viewportWidth - POPOVER_WIDTH - SIDE_GUTTER),
    )

    const sectionsWithData = SECTION_META.filter((s) => {
        const v = (insights as any)[s.key]
        return Array.isArray(v) ? v.length > 0 : !!v
    })

    const dates = insights.dates as
        | { trip_start?: string; trip_end?: string; durations?: string[] }
        | undefined

    const hasAnyContent =
        sectionsWithData.length > 0 ||
        Boolean(insights.summary) ||
        Boolean(dates?.trip_start || dates?.trip_end)

    // Portal to document.body so the popover's `position: fixed` stays
    // viewport-relative regardless of any transformed ancestors (the
    // assistant window's Framer Motion containers re-anchor every fixed
    // descendant otherwise).
    return createPortal(
        <div
            data-attachment-preview
            role="dialog"
            aria-label={`Preview of ${theme.label} attachment`}
            style={{ top, left, transform: 'translateY(-100%)', width: POPOVER_WIDTH }}
            className={cn(
                // z-[1300] matches AttachmentMenu — has to sit above the
                // AIAssistantWindow's panel (z-[1210]) and overlays.
                'fixed z-[1300] max-w-[92vw] overflow-hidden',
                'rounded-2xl border border-grey_4 bg-white',
                'shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18),0_8px_20px_-8px_rgba(99,102,241,0.12)]',
            )}
        >
            {/* Header */}
            <div
                className="flex items-start gap-3 px-4 py-3 border-b border-grey_5"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(168,85,247,0.04) 100%)',
                }}
            >
                <div
                    className={cn(
                        'shrink-0 h-10 w-10 rounded-xl flex items-center justify-center',
                        theme.bg,
                        theme.color,
                    )}
                >
                    {theme.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-primary-default shrink-0" />
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-grey_1 font-manrope">
                            Extracted from {theme.label}
                        </span>
                    </div>
                    {sourceUrl ? (
                        <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={sourceUrl}
                            className="text-sm font-semibold text-grey_0 hover:text-primary-default font-manrope truncate block mt-0.5 underline-offset-2 hover:underline"
                        >
                            {title}
                        </a>
                    ) : (
                        <div className="text-sm font-semibold text-grey_0 font-manrope truncate mt-0.5">
                            {title}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-white/70 text-grey_2 shrink-0"
                    aria-label="Close preview"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Thin-extraction banner — when the source had minimal
                extractable content (e.g. music-only IG reel). Sets
                expectations BEFORE the user reads sparse insights below. */}
            {draft.record?.thin_extraction && (
                <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-semibold text-amber-900 font-manrope">
                            Limited content
                        </span>
                        <span className="text-[11px] text-amber-800 leading-snug font-manrope">
                            We could only pull a small amount from this source — the agent will only have so much to work with. Try a richer source or paste the caption/notes directly.
                        </span>
                    </div>
                </div>
            )}

            {/* Optional thumbnail */}
            {thumbnailUrl && draft.kind === 'youtube' && (
                <div className="px-4 pt-3">
                    <img
                        src={thumbnailUrl}
                        alt=""
                        className="w-full rounded-lg border border-grey_5 object-cover aspect-video"
                    />
                </div>
            )}

            {/* Body */}
            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
                {!hasAnyContent ? (
                    <p className="text-sm text-grey_2 leading-snug">
                        We read the attachment but couldn't pull structured details.
                        You can still ask the AI about it.
                    </p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-grey_0 leading-relaxed font-manrope mb-4">
                            {summary}
                        </p>

                        <div className="flex flex-col gap-4">
                            {(dates?.trip_start || dates?.trip_end) && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-grey_1 shrink-0 inline-flex">
                                            <Calendar size={13} />
                                        </span>
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-grey_1 font-manrope">
                                            Trip dates
                                        </span>
                                    </div>
                                    <div className="text-xs font-medium text-grey_0 leading-snug font-manrope pl-[21px]">
                                        {dates?.trip_start || '?'} → {dates?.trip_end || '?'}
                                    </div>
                                </div>
                            )}

                            {sectionsWithData.map((s) => {
                                const items = (insights as any)[s.key] as Array<any>
                                if (!Array.isArray(items)) return null
                                return (
                                    <div key={s.key as string}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-grey_1 shrink-0 inline-flex">{s.icon}</span>
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-grey_1 font-manrope">
                                                {s.label}
                                                <span className="text-grey_2 normal-case font-medium ml-1">
                                                    ({items.length})
                                                </span>
                                            </span>
                                        </div>
                                        <ul className="space-y-1 pl-[21px]">
                                            {items.slice(0, 6).map((it: any, idx: number) => (
                                                <li
                                                    key={idx}
                                                    className="relative text-xs font-medium text-grey_0 leading-snug font-manrope pl-3"
                                                >
                                                    <span className="absolute left-0 top-[7px] h-1 w-1 rounded-full bg-grey_3" />
                                                    {renderItem(it)}
                                                </li>
                                            ))}
                                            {items.length > 6 && (
                                                <li className="text-[11px] text-grey_2 italic pt-0.5">
                                                    + {items.length - 6} more
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-grey_5 bg-grey_5/40">
                <p className="text-[11px] font-medium text-grey_1 leading-snug font-manrope">
                    Send a message to the AI — it'll use these details to compare against your itinerary, add activities, or revise plans.
                </p>
            </div>
        </div>,
        document.body,
    )
}

function renderItem(it: any): string {
    if (!it) return ''
    if (typeof it === 'string') return it
    const name = it.name || it.mode || it.type || it.place || ''
    const where = it.location || it.from || ''
    const note = it.notes || it.duration || (it.nights ? `${it.nights} nights` : '')
    return [name, where, note]
        .filter((x) => x && String(x).trim())
        .join(' — ')
}
