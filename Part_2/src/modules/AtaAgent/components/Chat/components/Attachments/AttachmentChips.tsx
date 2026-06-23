import { useRef, useState } from 'react'
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    FileSpreadsheet,
    FileText,
    FileType2,
    Info,
    Instagram,
    Loader2,
    Sheet,
    X,
    Youtube,
} from 'lucide-react'

import { cn } from '@/lib/utils'

import type {
    AttachmentDraft,
    AttachmentKind,
} from '@/modules/AtaAgent/types/Attachments'

import { AttachmentPreviewPopover } from './AttachmentPreviewPopover'

export interface AttachmentChipsProps {
    attachments: AttachmentDraft[]
    onRemove: (localId: string) => void
}

const KIND_THEME: Record<
    AttachmentKind,
    { icon: React.ReactNode; bg: string; ring: string }
> = {
    youtube: {
        icon: <Youtube size={12} strokeWidth={2.25} />,
        bg: 'bg-rose-50 text-rose-600',
        ring: 'ring-rose-200',
    },
    instagram: {
        icon: <Instagram size={12} strokeWidth={2.25} />,
        bg: 'bg-fuchsia-50 text-fuchsia-600',
        ring: 'ring-fuchsia-200',
    },
    pdf: {
        icon: <FileText size={12} strokeWidth={2.25} />,
        bg: 'bg-sky-50 text-sky-600',
        ring: 'ring-sky-200',
    },
    docx: {
        icon: <FileType2 size={12} strokeWidth={2.25} />,
        bg: 'bg-indigo-50 text-indigo-600',
        ring: 'ring-indigo-200',
    },
    xlsx: {
        icon: <FileSpreadsheet size={12} strokeWidth={2.25} />,
        bg: 'bg-emerald-50 text-emerald-600',
        ring: 'ring-emerald-200',
    },
    csv: {
        icon: <Sheet size={12} strokeWidth={2.25} />,
        bg: 'bg-emerald-50 text-emerald-600',
        ring: 'ring-emerald-200',
    },
}

const PROCESSING_LABEL: Record<AttachmentKind, string> = {
    youtube: 'Watching the video…',
    instagram: 'Reading the reel…',
    pdf: 'Reading the PDF…',
    docx: 'Reading the document…',
    xlsx: 'Reading the spreadsheet…',
    csv: 'Reading the CSV…',
}

const truncate = (s: string, n = 28) =>
    s && s.length > n ? `${s.slice(0, n - 1)}\u2026` : s

export const AttachmentChips: React.FC<AttachmentChipsProps> = ({
    attachments,
    onRemove,
}) => {
    const [openPreviewLocalId, setOpenPreviewLocalId] = useState<string | null>(
        null,
    )
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
    const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    if (!attachments.length) return null

    const openDraft = openPreviewLocalId
        ? attachments.find((a) => a.localId === openPreviewLocalId) || null
        : null

    return (
        <>
            <div className="flex flex-wrap items-center gap-2 px-5 pt-2">
                {attachments.map((a) => {
                    const completed = a.status === 'completed'
                    const failed = a.status === 'failed'
                    const thin = completed && Boolean(a.record?.thin_extraction)
                    const inFlight = !completed && !failed
                    const theme = KIND_THEME[a.kind]
                    const interactive = completed
                    return (
                        <button
                            key={a.localId}
                            type="button"
                            data-attachment-chip
                            ref={(el) => {
                                chipRefs.current[a.localId] = el
                            }}
                            onClick={() => {
                                if (!completed) return
                                const el = chipRefs.current[a.localId]
                                if (el) setAnchorRect(el.getBoundingClientRect())
                                setOpenPreviewLocalId(
                                    openPreviewLocalId === a.localId ? null : a.localId,
                                )
                            }}
                            title={
                                failed
                                    ? a.error || 'Failed to read attachment'
                                    : thin
                                        ? "We could only pull a tiny bit from this. Click to preview — the agent won't have detailed info."
                                        : completed
                                            ? 'Click to preview what we extracted'
                                            : a.label
                            }
                            className={cn(
                                'relative inline-flex items-center gap-2 max-w-[280px] rounded-full pl-1 pr-2 py-1 text-xs border transition-all overflow-hidden',
                                interactive && 'hover:shadow-sm cursor-pointer',
                                !interactive && 'cursor-default',
                                completed && !thin &&
                                    'bg-emerald-50 border-emerald-200 text-emerald-900',
                                thin &&
                                    'bg-amber-50 border-amber-200 text-amber-900',
                                failed &&
                                    'bg-amber-50 border-amber-300 text-amber-900',
                                inFlight &&
                                    'bg-sky-50/70 border-sky-200 text-grey_0 shadow-[0_1px_4px_-1px_rgba(56,189,248,0.25)]',
                            )}
                        >
                            <span
                                className={cn(
                                    'shrink-0 h-6 w-6 rounded-full flex items-center justify-center',
                                    theme.bg,
                                )}
                            >
                                {theme.icon}
                            </span>

                            <span className="flex flex-col items-start min-w-0">
                                <span className="truncate font-semibold leading-tight max-w-[180px] font-manrope">
                                    {truncate(
                                        completed
                                            ? a.record?.title || a.label
                                            : a.label,
                                        32,
                                    )}
                                </span>
                                {inFlight && (
                                    <span className="flex items-center gap-1 text-[10px] text-sky-700 font-medium leading-tight font-manrope">
                                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                                        {a.status === 'uploading' &&
                                        typeof a.uploadProgress === 'number'
                                            ? `Uploading ${a.uploadProgress}%`
                                            : PROCESSING_LABEL[a.kind]}
                                    </span>
                                )}
                                {thin && !failed && (
                                    <span className="text-[10px] text-amber-700 font-normal leading-tight">
                                        Limited content — preview to see
                                    </span>
                                )}
                                {failed && (
                                    <span className="text-[10px] text-amber-700 font-normal leading-tight truncate max-w-[180px]">
                                        {a.error || 'Could not read'}
                                    </span>
                                )}
                            </span>

                            <span className="shrink-0 ml-1">
                                {failed ? (
                                    <AlertCircle size={14} className="text-amber-600" />
                                ) : thin ? (
                                    <AlertTriangle size={14} className="text-amber-600" />
                                ) : completed ? (
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                    <Loader2 size={14} className="animate-spin text-sky-500" />
                                )}
                            </span>

                            {/* Info hint — signals chip is clickable for a summary preview. */}
                            {completed && (
                                <span
                                    aria-label="Click to view summary"
                                    title="Click to view summary"
                                    className={cn(
                                        'shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full',
                                        thin
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700',
                                    )}>
                                    <Info size={11} strokeWidth={2.5} />
                                </span>
                            )}

                            <span
                                role="button"
                                aria-label="Remove attachment"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (openPreviewLocalId === a.localId) {
                                        setOpenPreviewLocalId(null)
                                    }
                                    onRemove(a.localId)
                                }}
                                className="shrink-0 rounded-full p-0.5 hover:bg-black/5 transition-colors"
                            >
                                <X size={12} />
                            </span>
                        </button>
                    )
                })}
            </div>

            {openDraft && openDraft.status === 'completed' && (
                <AttachmentPreviewPopover
                    draft={openDraft}
                    anchorRect={anchorRect}
                    onClose={() => setOpenPreviewLocalId(null)}
                />
            )}
        </>
    )
}
