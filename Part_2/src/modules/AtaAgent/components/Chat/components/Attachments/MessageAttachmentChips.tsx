import {
    FileSpreadsheet,
    FileText,
    FileType2,
    Instagram,
    Sheet,
    Youtube,
} from 'lucide-react'

import { cn } from '@/lib/utils'

import type { AttachmentKind } from '@/modules/AtaAgent/types/Attachments'

export interface MessageAttachmentSummary {
    attachment_id: string
    kind: AttachmentKind
    title?: string
    source_url?: string | null
    filename?: string | null
}

export interface MessageAttachmentChipsProps {
    attachments: MessageAttachmentSummary[]
    /** Visual side — `right` aligns chips to the right edge under user bubbles. */
    align?: 'left' | 'right'
}

const KIND_VISUAL: Record<
    AttachmentKind,
    { icon: React.ReactNode; bg: string; label: string }
> = {
    youtube: {
        icon: <Youtube size={11} strokeWidth={2.25} />,
        bg: 'bg-rose-50 text-rose-700 border-rose-100',
        label: 'YouTube',
    },
    instagram: {
        icon: <Instagram size={11} strokeWidth={2.25} />,
        bg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
        label: 'Instagram',
    },
    pdf: {
        icon: <FileText size={11} strokeWidth={2.25} />,
        bg: 'bg-sky-50 text-sky-700 border-sky-100',
        label: 'PDF',
    },
    docx: {
        icon: <FileType2 size={11} strokeWidth={2.25} />,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        label: 'Word',
    },
    xlsx: {
        icon: <FileSpreadsheet size={11} strokeWidth={2.25} />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        label: 'Excel',
    },
    csv: {
        icon: <Sheet size={11} strokeWidth={2.25} />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        label: 'CSV',
    },
}

const truncate = (s: string, n: number) =>
    s && s.length > n ? `${s.slice(0, n - 1)}\u2026` : s

export const MessageAttachmentChips: React.FC<MessageAttachmentChipsProps> = ({
    attachments,
    align = 'right',
}) => {
    if (!attachments || attachments.length === 0) return null
    return (
        <div
            className={cn(
                'flex flex-wrap gap-1.5 mt-1.5',
                align === 'right' ? 'justify-end' : 'justify-start',
            )}
        >
            {attachments.map((a) => {
                const v = KIND_VISUAL[a.kind] || KIND_VISUAL.pdf
                const display = a.title || a.filename || a.source_url || v.label
                const tooltip = a.source_url || a.filename || display
                const inner = (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 max-w-[220px]',
                            'rounded-full px-2 py-1 text-[11px] font-medium border',
                            v.bg,
                        )}
                        title={tooltip}
                    >
                        <span className="shrink-0">{v.icon}</span>
                        <span className="truncate">{truncate(display, 32)}</span>
                    </span>
                )
                if (a.source_url) {
                    return (
                        <a
                            key={a.attachment_id}
                            href={a.source_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="hover:opacity-90 transition-opacity"
                        >
                            {inner}
                        </a>
                    )
                }
                return <span key={a.attachment_id}>{inner}</span>
            })}
        </div>
    )
}
