import { useState, useLayoutEffect, useRef } from 'react'

/**
 * Renders the free-form ``slot_data.description`` on a custom
 * slot card — clamped to 6 lines with an inline "Show more" /
 * "Show less" CTA. Returns null when the slot has no description
 * so callers don't need to guard themselves.
 *
 * Lives in a dedicated file so the kanban, calendar, and mobile
 * custom-card renderers all share the same clamp + expand
 * behaviour without duplicating state.
 */
export function CustomSlotDescription({
    description,
    className,
}: {
    description?: string | null
    className?: string
}) {
    const [expanded, setExpanded] = useState(false)
    const [overflowing, setOverflowing] = useState(false)
    const ref = useRef<HTMLParagraphElement>(null)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => {
            // When collapsed, `scrollHeight > clientHeight` means the
            // text is taller than the 6-line clamp — show the CTA.
            // Skip while the element is detached/hidden (both heights 0)
            // — that happens when the itinerary tab is mounted but
            // currently hidden in a sibling tab; we'll re-measure once
            // it becomes visible via the ResizeObserver below.
            if (el.clientHeight === 0 && el.scrollHeight === 0) return
            setOverflowing(el.scrollHeight - 1 > el.clientHeight)
        }
        measure()
        // Re-check when the element resizes (e.g. tab switches from
        // hidden to visible, or font/layout shifts after mount).
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [description, expanded])

    const text = typeof description === 'string' ? description.trim() : ''
    if (!text) return null

    return (
        <div className={className ?? ''}>
            <p
                ref={ref}
                className={`text-[12px] font-manrope font-medium text-grey-1 leading-[18px] whitespace-pre-line ${
                    expanded ? '' : 'line-clamp-6'
                }`}>
                {text}
            </p>
            {(overflowing || expanded) && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setExpanded((v) => !v)
                    }}
                    className="mt-0.5 text-[11px] font-manrope font-semibold text-primary-default hover:underline cursor-pointer">
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    )
}
