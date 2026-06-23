import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { closeAssistantWindow } from './assistantController'
import UpdateDiffCard from '@/modules/Itinerary/components/chat/UpdateDiffCard'

/** Lightweight inline markdown: bold, italic, bold+italic, inline code, paragraphs */
const parseInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`[^`]+`)/)
    return parts.map((part, i) => {
        if (part.startsWith('***') && part.endsWith('***')) {
            return <strong key={i}><em>{part.slice(3, -3)}</em></strong>
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={i}>{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="px-1 py-0.5 bg-grey_5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
        }
        return part
    })
}

/** Parse text with paragraph breaks (\n\n) and inline markdown */
const parseSimpleMarkdown = (text: string): React.ReactNode => {
    if (!text) return null
    const paragraphs = text.split(/\n\n+/)
    if (paragraphs.length <= 1) return parseInlineMarkdown(text)
    return paragraphs.map((para, i) => (
        <span key={i} className={i > 0 ? 'block mt-2' : ''}>
            {parseInlineMarkdown(para.trim())}
        </span>
    ))
}

interface SwapDiffEntry {
    day_index: number
    day_number: number
    city?: string
    before_titles: string[]
    after_titles: string[]
}

interface ItineraryUpdateData {
    response: string
    understood: string
    changes: {
        days_updated?: number
        summaries?: string[]
        updated_slots_count?: number
        updated_slot_paths?: Array<{
            day_index: number
            slot_index: number
            path: string
            title?: string
            kind?: string
            change_type?: string
        }>
        // Route operation fields
        type?: string
        city_moved?: string
        new_route?: string
        empty_days?: number[]
        // Day swap before/after diff
        swap_diff?: SwapDiffEntry[]
    }
    itinerary_id?: string
    feasibility_warnings?: string[]
}

interface ItineraryUpdateOutputProps {
    data: ItineraryUpdateData
    className?: string
    onViewChangeClick?: (changes?: ItineraryUpdateData['changes']) => void
    onNavigateToSlot?: (dayIndex: number, slotIndex: number) => void
    onRefreshItinerary?: () => void
    onClose?: () => void
}

const ItineraryUpdateOutput: React.FC<ItineraryUpdateOutputProps> = ({ data, className = '', onViewChangeClick, onNavigateToSlot, onRefreshItinerary, onClose }) => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()

    /** Check if we're already on a page that has the itinerary view listener */
    const isOnItineraryPage = location.pathname.includes('/itinerary')

    return (
        <div className={`w-full flex flex-col gap-4 bg-grey-5 px-4 py-4 rounded-[20px] ${className}`}>
            {/* Response Message */}
            {data.response && (
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-grey_0 font-red-hat-display leading-6">{parseSimpleMarkdown(data.response)}</p>
                </div>
            )}

            {/* Changes Summary — skip "Changes Made" header for swaps (redundant) */}
            {data.changes && (data.changes.type === 'day_swap' ? (
                /* Swap: just show the before/after diff, no noisy header */
                <div className="pt-2 border-t border-grey_4">
                    <UpdateDiffCard changes={data.changes} />
                </div>
            ) : (data.changes?.days_updated ?? 0) > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-grey_4">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-grey_1 font-red-hat-display uppercase tracking-wide">Changes Made</p>
                        {(data.changes.days_updated ?? 0) > 0 && (
                            <span className="text-xs font-medium text-grey_2 font-red-hat-display">
                                ({data.changes.days_updated} day{(data.changes.days_updated ?? 0) > 1 ? 's' : ''} updated)
                            </span>
                        )}
                    </div>
                    {data.changes.summaries && data.changes.summaries.length > 0 && (
                        <div className="list-none space-y-2">
                            {data.changes.summaries.map((summary, index) => (
                                <p
                                    key={index}
                                    className="flex items-center gap-2.5">
                                    <span className="text-primary-default font-bold flex-shrink-0">•</span>
                                    <span className="text-sm font-medium leading-6 text-grey_0 font-red-hat-display flex-1">{summary}</span>
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Slot-level diff */}
                    {data.changes.updated_slot_paths && data.changes.updated_slot_paths.length > 0 && (
                        <UpdateDiffCard changes={data.changes} />
                    )}
                </div>
            ))}

            {/* Route Change Summary — for day_reorder / day_add_remove (NOT for day_swap) */}
            {data.changes?.type && data.changes?.type !== 'day_swap' && data.changes?.new_route && (
                <div className="flex flex-col gap-2 pt-2 border-t border-grey_4">
                    <p className="text-xs font-semibold text-grey_1 font-red-hat-display uppercase tracking-wide">
                        {data.changes.type === 'day_reorder' ? 'Route Updated' : 'Itinerary Updated'}
                    </p>
                    <p className="text-sm font-medium text-grey_0 font-red-hat-display">{data.changes.new_route}</p>
                </div>
            )}

            {/* Feasibility Warnings */}
            {data.feasibility_warnings && data.feasibility_warnings.length > 0 && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-600 text-sm">&#9888;</span>
                        <p className="text-xs font-semibold text-amber-700 font-red-hat-display uppercase tracking-wide">
                            Schedule Warning
                        </p>
                    </div>
                    <div className="space-y-1">
                        {data.feasibility_warnings.map((warning, idx) => (
                            <p key={idx} className="text-[12px] leading-[18px] text-amber-800 font-manrope">
                                {warning}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* View Changes — always shown for any update. Smart routing:
                - Has specific slot paths → scroll + highlight those slots
                - No slot paths (reorder, removal, compound) → refresh itinerary and navigate to itinerary tab */}
            {((data.changes?.days_updated ?? 0) > 0 || data.changes?.type) && (
                <div className="pt-2 border-t border-grey_4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'itineraryCompleted' })

                            // Check if we have specific slots to scroll/highlight
                            const scrollableSlots = (data.changes?.updated_slot_paths ?? []).filter(
                                (p) => p.day_index != null && p.change_type !== 'remove_slot' && p.change_type !== 'slot_removed'
                            )

                            if (scrollableSlots.length > 0) {
                                // Slot-level changes: scroll + highlight
                                if (onViewChangeClick) {
                                    onViewChangeClick(data.changes)
                                } else if (onNavigateToSlot) {
                                    onNavigateToSlot(scrollableSlots[0].day_index, scrollableSlots[0].slot_index)
                                } else if (isOnItineraryPage) {
                                    window.dispatchEvent(new CustomEvent('rimigo:viewChanges', { detail: data.changes }))
                                } else {
                                    try {
                                        sessionStorage.setItem('rimigo:pendingViewChanges', JSON.stringify(data.changes))
                                    } catch { /* quota exceeded */ }
                                    navigate('/tripboard?tab=itinerary&view_changes=1')
                                }
                            } else {
                                // Structural changes (reorder, removal, day add/remove, compound):
                                // refresh data and take user to itinerary tab
                                if (onRefreshItinerary) {
                                    onRefreshItinerary()
                                }
                                navigate('/tripboard?tab=itinerary')
                            }

                            onClose?.()
                            closeAssistantWindow()
                        }}
                        className="group w-fit inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-default to-primary-dark text-white text-sm font-semibold font-red-hat-display shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
                        View Changes
                        <span className="inline-block transition-transform group-hover:translate-x-0.5">{'\u2192'}</span>
                    </button>
                </div>
            )}
        </div>
    )
}

export default ItineraryUpdateOutput
