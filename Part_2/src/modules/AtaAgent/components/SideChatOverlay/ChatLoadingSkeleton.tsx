import React from 'react'
import { cn } from '@/lib/utils'

interface ChatLoadingSkeletonProps {
    /** Adds top padding on mobile so the placeholder clears the floating header. */
    isMobile?: boolean
}

/** A single shimmering placeholder line. */
const ShimmerLine: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
    <div className={cn('animate-skeleton h-3 rounded-[6px]', className)} style={style} aria-hidden />
)

/** A right-aligned user bubble placeholder — mirrors the real grey message bubble. */
const UserRow: React.FC<{ width: string }> = ({ width }) => (
    <div className="flex justify-end">
        <div
            className="animate-skeleton rounded-[16px] rounded-tr-[5px] px-3.5 py-2.5"
            style={{ width }}
            aria-hidden>
            <div className="h-3.5 w-full opacity-0" />
        </div>
    </div>
)

/** A left-railed assistant block placeholder — mirrors the real full-width reply. */
const AssistantRow: React.FC<{ widths: string[] }> = ({ widths }) => (
    <div className="border-l-2 border-primary-default/35 pl-3">
        <div className="space-y-2.5">
            {widths.map((w, i) => (
                <ShimmerLine key={i} className="rounded-[6px]" style={{ width: w }} />
            ))}
        </div>
    </div>
)

/**
 * ChatLoadingSkeleton
 *
 * A calm, on-brand placeholder that mimics a loading conversation: alternating
 * user bubbles and left-railed assistant replies with shimmering lines. Used as
 * a dedicated loading branch while threads/interactions are being fetched and
 * there is not yet any content to show — never overlaid on an existing chat.
 *
 * Container padding mirrors the live messages area (`px-4 py-5 space-y-5`) so the
 * real conversation slots in without a layout shift once it loads.
 */
const ChatLoadingSkeleton: React.FC<ChatLoadingSkeletonProps> = ({ isMobile = false }) => {
    return (
        <div
            className={cn(
                'flex-1 px-4 py-5 space-y-5 font-manrope',
                isMobile && 'pt-14',
            )}
            role="status"
            aria-label="Loading conversation"
            aria-live="polite">
            <span className="sr-only">Loading conversation…</span>

            <UserRow width="38%" />
            <AssistantRow widths={['90%', '75%', '55%']} />

            <UserRow width="44%" />
            <AssistantRow widths={['85%', '60%']} />

            <UserRow width="32%" />
            <AssistantRow widths={['92%', '78%', '50%']} />
        </div>
    )
}

export default ChatLoadingSkeleton
