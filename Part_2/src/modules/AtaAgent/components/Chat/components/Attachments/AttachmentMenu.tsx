import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    FileText,
    FileType2,
    Instagram,
    Link2,
    Sheet,
    X,
    Youtube,
} from 'lucide-react'

import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import { cn } from '@/lib/utils'

import type { AttachmentKind } from '@/modules/AtaAgent/types/Attachments'

type LinkKind = 'youtube' | 'instagram'

export interface AttachmentMenuProps {
    open: boolean
    onClose: () => void
    onPickFile: (file: File) => void
    onPickLink: (url: string, kind: LinkKind) => void
    /** Anchor rect (relative to viewport) so we can place the menu above the chip. */
    anchorRect?: DOMRect | null
}

interface MenuItem {
    kind: AttachmentKind | 'spreadsheet'
    label: string
    helper: string
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    hint?: string
}

const ITEMS: MenuItem[] = [
    {
        kind: 'youtube',
        label: 'YouTube travel video',
        helper: 'Paste a link — we pull the key tips.',
        icon: <Youtube size={20} strokeWidth={2.25} />,
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-600',
    },
    {
        kind: 'instagram',
        label: 'Instagram travel reel',
        helper: 'Paste a public Reel — we read the highlights.',
        icon: <Instagram size={20} strokeWidth={2.25} />,
        iconBg: 'bg-fuchsia-50',
        iconColor: 'text-fuchsia-600',
        hint: '~30s',
    },
    {
        kind: 'pdf',
        label: 'Trip itinerary PDF',
        helper: 'Upload a PDF (≤25 MB) — we pull dates & hotels.',
        icon: <FileText size={20} strokeWidth={2.25} />,
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
    },
    {
        kind: 'docx',
        label: 'Trip plan in Word',
        helper: 'Drop a .docx — we lift the day-by-day plan.',
        icon: <FileType2 size={20} strokeWidth={2.25} />,
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
    },
    {
        kind: 'spreadsheet',
        label: 'Itinerary spreadsheet',
        helper: 'Upload .xlsx or .csv — we read each row.',
        icon: <Sheet size={20} strokeWidth={2.25} />,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
    },
]

const FILE_ACCEPT_BY_KIND: Record<string, string> = {
    pdf: 'application/pdf,.pdf',
    docx:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx',
    spreadsheet:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv',
}

type View =
    | { kind: 'list' }
    | { kind: 'url'; linkKind: LinkKind }

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
    open,
    onClose,
    onPickFile,
    onPickLink,
    anchorRect,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [view, setView] = useState<View>({ kind: 'list' })
    const [linkValue, setLinkValue] = useState('')
    const [pendingAccept, setPendingAccept] = useState<string>('')
    const urlInputRef = useRef<HTMLInputElement>(null)

    // Reset state whenever the menu closes.
    useEffect(() => {
        if (!open) {
            setView({ kind: 'list' })
            setLinkValue('')
        }
    }, [open])

    // Auto-focus the URL input when entering url view.
    useEffect(() => {
        if (view.kind === 'url') {
            const id = window.setTimeout(() => urlInputRef.current?.focus(), 30)
            return () => window.clearTimeout(id)
        }
    }, [view])

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('[data-attachment-menu]')) return
            if (target.closest('[data-attachment-trigger]')) return
            onClose()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (view.kind === 'url') {
                    setView({ kind: 'list' })
                } else {
                    onClose()
                }
            }
        }
        document.addEventListener('mousedown', onClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, onClose, view])

    if (!open) return null

    const top = anchorRect ? anchorRect.top - 12 : 100
    // Clamp menu inside viewport with 12px gutters (paperclip can sit near right edge).
    const GUTTER = 12
    const MENU_WIDTH = 360
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
    const desiredWidth = Math.min(MENU_WIDTH, viewportWidth - GUTTER * 2)
    const rawLeft = anchorRect ? anchorRect.left : GUTTER
    const maxLeft = viewportWidth - desiredWidth - GUTTER
    const left = Math.max(GUTTER, Math.min(rawLeft, maxLeft))

    const onPick = (item: MenuItem) => {
        if (item.kind === 'pdf' || item.kind === 'docx' || item.kind === 'spreadsheet') {
            const accept = FILE_ACCEPT_BY_KIND[item.kind]
            setPendingAccept(accept)
            // Defer to ensure accept is updated before opening picker.
            setTimeout(() => fileInputRef.current?.click(), 0)
            return
        }
        if (item.kind === 'youtube' || item.kind === 'instagram') {
            setView({ kind: 'url', linkKind: item.kind })
            setLinkValue('')
        }
    }

    const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onPickFile(file)
            onClose()
        }
        // Reset so picking the same file twice still fires onChange.
        e.target.value = ''
    }

    const submitLink = () => {
        if (view.kind !== 'url') return
        const value = linkValue.trim()
        if (!value) return
        onPickLink(value, view.linkKind)
        onClose()
    }

    const linkTheme =
        view.kind === 'url' && view.linkKind === 'youtube'
            ? {
                  bg: 'bg-rose-50',
                  color: 'text-rose-600',
                  ring: 'focus-within:ring-rose-200 focus-within:border-rose-400',
                  buttonGradient:
                      'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
                  icon: <Youtube size={16} />,
                  title: 'Add a YouTube link',
                  inputLabel: 'Paste the video or Short URL',
                  placeholder: 'https://youtube.com/shorts/…',
                  helperIcon: <Clock size={11} />,
                  helperText: 'Usually ~10 seconds. We pull hotels, activities, and dates from the transcript.',
                  ctaLabel: 'Attach video',
              }
            : view.kind === 'url' && view.linkKind === 'instagram'
                ? {
                      bg: 'bg-fuchsia-50',
                      color: 'text-fuchsia-600',
                      ring: 'focus-within:ring-fuchsia-200 focus-within:border-fuchsia-400',
                      buttonGradient:
                          'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700',
                      icon: <Instagram size={16} />,
                      title: 'Add an Instagram Reel',
                      inputLabel: 'Paste the public Reel URL',
                      placeholder: 'https://instagram.com/reel/…',
                      helperIcon: <Clock size={11} />,
                      helperText: 'Usually ~30 seconds. If the reel is private, paste the caption directly into chat instead.',
                      ctaLabel: 'Attach reel',
                  }
                : null

    // Portal to document.body so the menu's `position: fixed` stays
    // viewport-relative regardless of any transformed ancestors
    // (Framer Motion ``motion.div`` containers in the assistant window
    // re-anchor every fixed descendant, otherwise).
    return createPortal(
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={pendingAccept}
                onChange={onFileChosen}
                className="hidden"
                aria-hidden
            />

            <div
                data-attachment-menu
                role="menu"
                style={{ top, left, transform: 'translateY(-100%)' }}
                className={cn(
                    // z-[1300] sits above the AIAssistantWindow's panel
                    // (z-[1210]), backdrop (z-[1200]), streaming overlay
                    // (z-[1220]), and the FloatingAssistantChip
                    // (z-[120]). Anything that beats this in the
                    // future should be a dedicated system modal
                    // (toast / alert) and live above us.
                    'fixed z-[1300] w-[360px] max-w-[92vw] overflow-hidden',
                    'rounded-2xl border border-grey_4 bg-white',
                    // Heavier shadow than before — earlier one was too faint on photo bgs.
                    'shadow-[0_30px_70px_-12px_rgba(15,23,42,0.35),0_14px_30px_-10px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.04),0_4px_18px_-4px_rgba(112,17,246,0.18)]',
                )}
            >
                {/* Header (changes with view) */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-grey_5/60"
                    style={{
                        background:
                            'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 50%, rgba(168,85,247,0.06) 100%)',
                    }}
                >
                    {view.kind === 'list' ? (
                        <div className="flex items-center gap-2">
                            <img
                                src={STAR_PRIMARY_DEFAULT}
                                alt=""
                                aria-hidden
                                className="h-3.5 w-3.5"
                            />
                            <span className="text-[14px] font-semibold text-grey_1 font-manrope">
                                Add documents to your trip
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                onClick={() => setView({ kind: 'list' })}
                                className="rounded-full p-1 hover:bg-white/70 text-grey_1"
                                aria-label="Back to list"
                            >
                                <ArrowLeft size={14} />
                            </button>
                            <span
                                className={cn(
                                    'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                                    linkTheme?.bg,
                                    linkTheme?.color,
                                )}
                            >
                                {linkTheme?.icon}
                            </span>
                            <span className="text-sm font-semibold text-grey_0 font-manrope truncate">
                                {linkTheme?.title}
                            </span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-white/70 text-grey_2"
                        aria-label="Close attachment menu"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                {view.kind === 'list' ? (
                    <div className="flex flex-col p-1.5">
                        {ITEMS.map((item) => (
                            <button
                                key={item.kind}
                                type="button"
                                onClick={() => onPick(item)}
                                className={cn(
                                    'group flex items-start gap-3 px-3 py-3 rounded-xl text-left',
                                    'transition-all duration-150',
                                    'hover:bg-grey_5 active:scale-[0.99]',
                                )}
                            >
                                <div
                                    className={cn(
                                        'shrink-0 h-10 w-10 rounded-xl flex items-center justify-center',
                                        'transition-transform duration-150 group-hover:scale-105',
                                        item.iconBg,
                                        item.iconColor,
                                    )}
                                >
                                    {item.icon}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[15px] sm:text-sm font-semibold text-grey_0 font-manrope">
                                            {item.label}
                                        </span>
                                        {item.hint && (
                                            <span className="text-[11px] sm:text-[10px] font-medium text-grey_2 px-1.5 py-0.5 rounded-full bg-grey_5">
                                                {item.hint}
                                            </span>
                                        )}
                                    </div>
                                    <span className="mt-1 text-[11px] sm:text-xs font-medium text-grey_1 leading-snug font-manrope">
                                        {item.helper}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 p-4">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-grey_1 font-manrope">
                            {linkTheme?.inputLabel}
                        </label>

                        {/* Custom input row with link icon prefix and
                            kind-themed focus ring. Plain shadcn Input was
                            too generic for an action that's the focal
                            point of the popover. */}
                        <div
                            className={cn(
                                'flex items-center gap-2 rounded-xl border border-grey_4 bg-grey_5/40 px-3 py-2.5',
                                'transition-all duration-150',
                                'focus-within:bg-white focus-within:ring-4 focus-within:border-2',
                                linkTheme?.ring,
                            )}
                        >
                            <Link2 size={14} className="text-grey_2 shrink-0" />
                            <input
                                ref={urlInputRef}
                                value={linkValue}
                                onChange={(e) => setLinkValue(e.target.value)}
                                placeholder={linkTheme?.placeholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitLink()
                                }}
                                // 16px blocks iOS focus zoom.
                                style={{ fontSize: 16 }}
                                className="flex-1 bg-transparent border-0 outline-none text-grey_0 placeholder:text-grey_3 font-manrope"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 px-1">
                            <span className="text-grey_2">
                                {linkTheme?.helperIcon}
                            </span>
                            <p className="text-[11px] text-grey_2 leading-snug font-manrope">
                                {linkTheme?.helperText}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setView({ kind: 'list' })}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium font-manrope',
                                    'text-grey_1 hover:bg-grey_5 transition-colors',
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitLink}
                                disabled={!linkValue.trim()}
                                className={cn(
                                    'flex-1 inline-flex items-center justify-center gap-2',
                                    'px-4 py-2.5 rounded-xl text-sm font-semibold font-manrope text-white',
                                    'shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]',
                                    'transition-all duration-150 active:scale-[0.98]',
                                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                                    !linkValue.trim()
                                        ? 'bg-grey_3'
                                        : linkTheme?.buttonGradient,
                                )}
                            >
                                {linkTheme?.ctaLabel}
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>,
        document.body,
    )
}
