/** Viewports treated as mobile for tripboard scroll resets */
const MOBILE_MAX_PX = 767

function isMobileViewport(): boolean {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= MOBILE_MAX_PX
}

/**
 * Reset scroll to top on mobile when the tab changes. The real scroller varies
 * (window / SideBarLayout content / inner map container), so we zero scrollTop on
 * the window and every ancestor of `anchor` (no-op on non-scrollers). Repeated
 * across frames because tab content swaps via display:none→block + loads lazily.
 */
export function scrollTripboardToTopOnMobile(anchor?: HTMLElement | null): void {
    if (!isMobileViewport()) return

    const go = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        if (typeof document !== 'undefined') {
            document.documentElement.scrollTop = 0
            document.body.scrollTop = 0
        }
        let el: HTMLElement | null = anchor ?? null
        while (el) {
            if (el.scrollTop !== 0) el.scrollTop = 0
            el = el.parentElement
        }
    }

    queueMicrotask(go)
    requestAnimationFrame(go)
    window.setTimeout(go, 0)
    window.setTimeout(go, 120)
    // After embedded itinerary scroll-to-day (see MobileItineraryView ~150ms), some browsers chain scroll up again
    window.setTimeout(go, 400)
}

/** Back-compat alias for the itinerary deep-link callers. */
export function resetWindowScrollAfterItineraryTabMobile(): void {
    scrollTripboardToTopOnMobile()
}
