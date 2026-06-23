import { useEffect, useRef, useState } from 'react'

interface VoiceCaptionProps {
    /** Live transcript text. */
    text: string
    /** Shown when there is no text yet. */
    placeholder?: string
    className?: string
}

/**
 * Single-line voice caption that auto-scrolls horizontally to keep the most
 * recent words in view as the assistant speaks — like a live ticker. When the
 * text overflows, the left edge fades so words appear to flow in from the left.
 */
export default function VoiceCaption({ text, placeholder = '', className = '' }: VoiceCaptionProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [overflowing, setOverflowing] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const over = el.scrollWidth > el.clientWidth + 1
        setOverflowing(over)
        // Pin to the end so the newest words stay visible.
        if (over) el.scrollLeft = el.scrollWidth
    }, [text])

    const fade = 'linear-gradient(to right, transparent 0, black 28px)'

    return (
        <div
            ref={ref}
            className={`overflow-x-hidden whitespace-nowrap ${className}`}
            style={
                overflowing
                    ? { maskImage: fade, WebkitMaskImage: fade }
                    : undefined
            }
        >
            {text || placeholder}
        </div>
    )
}
