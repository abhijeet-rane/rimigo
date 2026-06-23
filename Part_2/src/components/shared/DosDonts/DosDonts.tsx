import { NOTE_PAD_ICON } from '@/constants/thiingsIcons'
import { ThumbsUp, ThumbsDown, Plus, X, Laugh, Frown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

/**
 * Renders inline markdown (bold/italic only).
 * All other elements are unwrapped to plain text.
 */
const MarkdownText = ({ text, style }: { text: string; style?: React.CSSProperties }) => (
    <span style={style}>
        <ReactMarkdown
            allowedElements={['p', 'strong', 'em']}
            unwrapDisallowed
            components={{
                p: ({ children }) => <>{children}</>
            }}>
            {text}
        </ReactMarkdown>
    </span>
)

const DOS_BORDER = '2px solid #33C98B'
const DOS_ICON_COLOR = '#26BC6D'
const DONTS_BORDER = '2px solid #E73434'
const DONTS_ICON_COLOR = '#E73434'

export interface DosDontsProps {
    /** Section title (e.g. "Travel Dos & Don'ts") */
    title?: string
    /** Subtitle below title (e.g. "Quick guidance for your trip") */
    subtitle?: string
    /** List of DO items */
    dosItems: string[]
    /** List of DON'T items */
    dontsItems: string[]
    /** Label for the DOs column */
    dosLabel?: string
    /** Label for the DON'Ts column */
    dontsLabel?: string
    /** Show Add buttons in column headers */
    showAddButtons?: boolean
    /** Called when Add DO is clicked */
    onAddDo?: () => void
    /** Called when Add DON'T is clicked */
    onAddDont?: () => void
    /** Called when remove is clicked on a DO item */
    onRemoveDo?: (index: number) => void
    /** Called when remove is clicked on a DON'T item */
    onRemoveDont?: (index: number) => void
    /**
     * Items at indices < this in `dosItems` are read-only (no × button shown).
     * Used to render LP-master items above editable saved items in the same list.
     * Default 0 = every item is removable.
     */
    removableDosFromIndex?: number
    /** Same as `removableDosFromIndex` but for `dontsItems`. */
    removableDontsFromIndex?: number
    /** Disable add/remove actions (e.g. while submitting) */
    isSubmitting?: boolean
    /** Empty state message for DOs column */
    emptyMessageDos?: string
    /** Empty state message for DON'Ts column */
    emptyMessageDonts?: string
    /** Optional id for the section container */
    id?: string
    /** Optional className for the root */
    className?: string
    /** When true, show Add and remove (X) buttons; when false, hide them (read-only for non-internal users) */
    isRimigoInternal?: boolean
}

/**
 * Reusable Dos & Don'ts side-by-side layout, matching ReviewsHighlightsSection styling.
 * Use for travel tips, guidelines, or any DO/DON'T content.
 */
export const DosDonts: React.FC<DosDontsProps> = ({
    title,
    subtitle,
    dosItems,
    dontsItems,
    dosLabel = 'Keep in Mind',
    dontsLabel = 'Things to Avoid',
    showAddButtons = false,
    onAddDo,
    onAddDont,
    onRemoveDo,
    onRemoveDont,
    removableDosFromIndex = 0,
    removableDontsFromIndex = 0,
    isSubmitting = false,
    emptyMessageDos = 'No DOs added yet.',
    emptyMessageDonts = "No DON'Ts added yet.",
    id,
    className = '',
    isRimigoInternal = false
}) => {
    const hasContent = dosItems.length > 0 || dontsItems.length > 0
    if (!title && !subtitle && !hasContent) return null

    const headerStyle = {
        color: 'var(--grey-0, #101010)',
        fontFamily: 'Red Hat Display',
        fontSize: 18,
        fontStyle: 'normal' as const,
        fontWeight: 467,
        lineHeight: 'normal' as const,
        letterSpacing: '-0.18px'
    }

    const itemStyle = {
        color: 'var(--grey-0, #101010)',
        fontFamily: 'Red Hat Display',
        fontSize: 14,
        fontStyle: 'normal' as const,
        fontWeight: 550,
        lineHeight: '18px' as const,
        letterSpacing: '-0.14px'
    }

    return (
        <div id={id} className={` ${className}`}>
            {title && (
                <p className="text-grey-0 font-semibold font-red-hat-display text-[24px] flex items-center gap-2">
                    {title}
                    <img src={NOTE_PAD_ICON} alt="Tips" className="w-6 h-6" />
                </p>
            )}
            {/* {subtitle && (
                <p className="text-grey-2 font-manrope text-sm font-medium">
                    Quick guidance for your trip
                </p>
            )} */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mt-[39px] items-start">
                {/* DOs */}
                <div className="rounded-xl p-4 bg-white" style={{ border: DOS_BORDER }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div style={headerStyle}>{dosLabel}</div>
                            <Laugh className="w-5 h-5 shrink-0" />
                        </div>
                        {showAddButtons && onAddDo && isRimigoInternal && (
                            <button
                                type="button"
                                onClick={onAddDo}
                                disabled={isSubmitting}
                                className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 hover:opacity-90"
                                style={{ color: DOS_ICON_COLOR }}
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2 mt-4 gap-1">
                        {dosItems.length === 0 ? (
                            <div
                                className="text-sm"
                                style={{
                                    color: 'var(--grey-2, #747474)',
                                    fontFamily: 'Manrope'
                                }}>
                                {emptyMessageDos}
                            </div>
                        ) : (
                            dosItems.map((item, idx) => (
                                <div key={`do-${idx}`} className="flex items-center gap-3 group">
                                    <ThumbsUp
                                        className="w-4 h-5 min-w-5 shrink-0"
                                        style={{ color: DOS_ICON_COLOR }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div><MarkdownText text={item} style={itemStyle} /></div>
                                    </div>
                                    {onRemoveDo && isRimigoInternal && idx >= removableDosFromIndex && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveDo(idx)}
                                            disabled={isSubmitting}
                                            className="p-1 rounded hover:bg-grey-5 text-grey-2 transition-opacity shrink-0 disabled:opacity-50"
                                            aria-label="Remove"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DON'Ts */}
                <div className="rounded-xl p-4 bg-white" style={{ border: DONTS_BORDER }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div style={headerStyle}>{dontsLabel}</div>
                            <Frown className="w-5 h-5 shrink-0" />
                        </div>
                        {showAddButtons && onAddDont && isRimigoInternal && (
                            <button
                                type="button"
                                onClick={onAddDont}
                                disabled={isSubmitting}
                                className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 hover:opacity-90"
                                style={{ color: DONTS_ICON_COLOR }}
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2 mt-4 gap-2">
                        {dontsItems.length === 0 ? (
                            <div
                                className="text-sm"
                                style={{
                                    color: 'var(--grey-2, #747474)',
                                    fontFamily: 'Manrope'
                                }}>
                                {emptyMessageDonts}
                            </div>
                        ) : (
                            dontsItems.map((item, idx) => (
                                <div key={`dont-${idx}`} className="flex items-center gap-3 group">
                                    <ThumbsDown
                                        className="w-4 h-5 min-w-5 shrink-0"
                                        style={{ color: DONTS_ICON_COLOR }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div><MarkdownText text={item} style={itemStyle} /></div>
                                    </div>
                                    {onRemoveDont && isRimigoInternal && idx >= removableDontsFromIndex && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveDont(idx)}
                                            disabled={isSubmitting}
                                            className="p-1 rounded hover:bg-grey-5 text-grey-2 transition-opacity shrink-0 disabled:opacity-50"
                                            aria-label="Remove"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DosDonts
