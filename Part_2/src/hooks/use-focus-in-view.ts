import { useEffect, useRef, useState } from 'react'

/**
 * Tracks whether an element is in a "focus band" near the centre of the
 * viewport — useful for scroll-driven highlighting (one card at a time).
 *
 * Returns `[ref, inFocus]`. Attach `ref` to the target element.
 */
export interface UseFocusInViewOptions {
    /** Disable the observer entirely. */
    enabled?: boolean
    /** IntersectionObserver `rootMargin`. Default carves out the middle ~30%. */
    rootMargin?: string
    /** Stay `false` when the user prefers reduced motion. Default true. */
    respectReducedMotion?: boolean
}

export function useFocusInView<T extends HTMLElement>(
    options: UseFocusInViewOptions = {},
) {
    const {
        enabled = true,
        rootMargin = '-35% 0px -35% 0px',
        respectReducedMotion = true,
    } = options

    const ref = useRef<T | null>(null)
    const [inFocus, setInFocus] = useState(false)

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return
        const node = ref.current
        if (!node || typeof IntersectionObserver === 'undefined') return
        if (
            respectReducedMotion &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ) {
            return
        }
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => setInFocus(e.isIntersecting)),
            { root: null, rootMargin, threshold: 0 },
        )
        observer.observe(node)
        return () => observer.disconnect()
    }, [enabled, rootMargin, respectReducedMotion])

    return [ref, inFocus] as const
}
