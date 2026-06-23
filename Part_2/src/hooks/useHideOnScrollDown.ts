import { useEffect, useState, type RefObject } from 'react'
import { addForceShowHeadersListener, dispatchForceShowHeaders } from '@/lib/events/forceShowHeadersEvents'

const ALWAYS_SHOW_NEAR_TOP_PX = 12
// Asymmetric hysteresis: takes a firm, intentional downward scroll to
// hide (so the user perceives a deliberate gesture, not an accidental
// twitch) and a slightly easier upward swipe to bring it back. Kills
// the ping-pong that happens when the collapse itself shifts layout
// and emits a tiny opposite-direction scroll event.
const HIDE_AFTER_DOWN_PX = 90
// Bigger upward threshold so a tiny scroll-up nudge doesn't yank the
// headers back in. The user has to deliberately reverse direction
// before the sub-sub header reappears.
const SHOW_AFTER_UP_PX = 140
// Short debounce window after a toggle. We no longer change content
// height (the hide is transform-only), so scroll-anchoring doesn't
// fire — but we still want a brief settle so a wobbling finger near
// the threshold can't ping-pong the state at 60fps.
const LAYOUT_SETTLE_MS = 350
// Don't hide the header when there isn't enough content to actually
// scroll past it — on short lists (e.g. the wizard's Who step) collapsing
// the header frees ~80px, which can leave the content no longer scrollable
// and ping-pong the header ("jumps for a second" on real mobile). Require a
// comfortable overflow margin (well past the collapsible header height)
// before the hide trigger arms so short content never flickers.
const MIN_OVERFLOW_TO_HIDE_PX = 200

// ── Programmatic-scroll guard ────────────────────────────────────────────────
// While a "See all"-style programmatic scroll is animating, every hook
// instance keeps its header SHOWN and ignores scroll deltas. Without this an
// auto-scroll-down collapses the sub-header and — because no user gesture
// follows — leaves it stranded hidden until the next tab switch.
//
// The guard state is broadcast via DOM events (NOT a shared module variable):
// each hook instance keeps its OWN `guardActive` flag, flipped by these
// events. This mirrors the force-show mechanism and is robust to Vite HMR
// re-evaluating the hook and the caller's module independently — a shared
// module-level flag desyncs across that boundary, which silently defeated the
// guard in dev.
export const SCROLL_GUARD_BEGIN_EVENT = 'rimigo:scroll-guard-begin'
export const SCROLL_GUARD_END_EVENT = 'rimigo:scroll-guard-end'

// Bumped on each guarded scroll so a stale release timer from an earlier
// scroll can't tear down the guard of a newer one (rapid See-All taps).
let guardToken = 0

const dispatchEvt = (name: string) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(name))
}

/** Open the guard: pin every header visible until {@link endProgrammaticScrollGuard}. */
export function beginProgrammaticScrollGuard(): void {
    dispatchEvt(SCROLL_GUARD_BEGIN_EVENT)
    dispatchForceShowHeaders()
}

/** Close the guard and snap every header back to visible. */
export function endProgrammaticScrollGuard(): void {
    dispatchEvt(SCROLL_GUARD_END_EVENT)
    dispatchForceShowHeaders()
}

/** Nearest ancestor that actually scrolls vertically (overflow-y auto/scroll
 *  with real overflow). Returns null when the page itself (window/document)
 *  is the scroller. */
function nearestScrollableAncestor(el: HTMLElement): HTMLElement | null {
    let node = el.parentElement
    while (node) {
        const overflowY = window.getComputedStyle(node).overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
            return node
        }
        node = node.parentElement
    }
    return null
}

/**
 * Smooth-scroll an element into view WITHOUT letting the hide-on-scroll
 * sub-headers collapse. While the guard is open every `useHideOnScrollDown`
 * instance keeps its header SHOWN and swallows scroll deltas, so the
 * programmatic scroll-down can't strand it hidden. Use for every "See all" /
 * jump-to-section affordance.
 *
 * Scrolls ONLY the nearest scrollable ancestor — never the chain of outer
 * scrollers the way native `scrollIntoView` does. On the Tripboard mobile
 * Activities tab the inner tab scroller is fixed-height while the chrome
 * above it makes the OUTER page wrapper overflow slightly; native
 * scrollIntoView "helpfully" scrolled that outer wrapper too, shoving the
 * inner scroller's top (and the sticky country/city sub-header pinned to it)
 * up behind the main TripboardHeader — the strip looked deleted and the row
 * below it sat half-cut, with no touch gesture able to undo it (touch only
 * ever scrolls the inner container). Honors the target's `scroll-margin-top`
 * exactly like a native block-start scroll would.
 *
 * The guard is held until the programmatic scroll actually SETTLES, detected
 * via a capture-phase `scroll` listener (so it works whether the page scrolls
 * the window OR an inner `overflow-y-auto` container — the Tripboard mobile
 * tabs use the latter). A fixed timer was wrong: the all-activities listing
 * sits far down the page, so a long/slow smooth scroll outlived the timer and
 * the tail of the scroll re-hid the header (the "stuck header" bug). Settle =
 * no scroll events for a short quiet window; a hard cap bounds it.
 */
export function scrollIntoViewWithHeaderGuard(
    el: HTMLElement | null,
    options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' }
): void {
    if (!el || typeof window === 'undefined' || typeof document === 'undefined') return
    beginProgrammaticScrollGuard()
    const scroller = nearestScrollableAncestor(el)
    if (scroller) {
        const scrollMarginTop = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0
        const top =
            el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - scrollMarginTop
        scroller.scrollTo({ top: Math.max(0, top), behavior: options.behavior ?? 'smooth' })
    } else {
        // Window-scrolled page (standalone explore pages) — native behavior
        // is fine there, only one scroller exists.
        el.scrollIntoView(options)
    }
    const token = ++guardToken

    let released = false
    let quietTimer: number | null = null
    const release = () => {
        if (released) return
        released = true
        document.removeEventListener('scroll', onScroll, true)
        if (quietTimer !== null) window.clearTimeout(quietTimer)
        window.clearTimeout(maxTimer)
        // Skip if a newer guarded scroll started — it owns the guard now.
        if (token !== guardToken) return
        endProgrammaticScrollGuard()
        // Safety net: re-assert "show" twice more after release. On iOS a
        // momentum tail (or a stuck collapse transition) can re-hide the
        // sub-header a beat after the programmatic scroll settles; these catch
        // it so the header never ends up stranded mid-way.
        window.setTimeout(() => {
            if (token === guardToken) dispatchForceShowHeaders()
        }, 250)
        window.setTimeout(() => {
            if (token === guardToken) dispatchForceShowHeaders()
        }, 700)
    }
    const onScroll = () => {
        // Each event pushes the release out — we only let go once motion has
        // been quiet for 300ms, i.e. the whole scroll (however long) is done.
        if (quietTimer !== null) window.clearTimeout(quietTimer)
        quietTimer = window.setTimeout(release, 300)
    }
    document.addEventListener('scroll', onScroll, true)
    // Fallback for "already in view" → no scroll events fire. Longer than the
    // per-event quiet so it can't pre-empt a smooth scroll that takes a moment
    // to start (the first onScroll clears it).
    quietTimer = window.setTimeout(release, 700)
    // Hard cap so the guard can never linger if a scroll never settles.
    const maxTimer = window.setTimeout(release, 6000)
}

/**
 * Hide-on-scroll-down / show-on-scroll-up for secondary header rows on
 * both mobile and desktop. Listens in the capture phase on `document`
 * so it catches scroll from whatever element actually scrolls (window,
 * sidebar scroll container, inner list…) without needing to know the
 * structure.
 *
 * Updates are batched to a single frame via rAF, and direction changes
 * reset the accumulator so small wobbles don't flip the state.
 */
export function useHideOnScrollDown(scrollTargetRef?: RefObject<HTMLElement | null>): boolean {
    const [hidden, setHidden] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return

        // When an explicit scroll target is provided (e.g. the create wizard's own
        // `main` scroller, which lives inside a `position: fixed` overlay), listen
        // DIRECTLY on it. On real iOS, scroll from inside a fixed container doesn't
        // reliably reach the document capture listener, so the hide-on-scroll would
        // never fire. The same onScroll handler works for both — it reads e.target.
        const directTarget = scrollTargetRef?.current ?? null

        let lastTop = 0
        let accumDown = 0
        let accumUp = 0
        let rafId: number | null = null
        let pendingTop: number | null = null
        let currentHidden = false
        let cooldownUntil = 0
        // Per-instance guard flag, flipped by the scroll-guard DOM events.
        let guardActive = false

        const toggle = (next: boolean) => {
            if (currentHidden === next) return
            currentHidden = next
            setHidden(next)
            // Hold off on further toggles while the browser settles the
            // collapse/expand layout and emits its scroll-anchor echo.
            cooldownUntil = Date.now() + LAYOUT_SETTLE_MS
            accumDown = 0
            accumUp = 0
        }

        const flush = () => {
            rafId = null
            if (pendingTop === null) return
            const top = pendingTop
            pendingTop = null

            // A programmatic ("See all") scroll is animating — keep the header
            // shown and swallow the deltas so the auto-scroll-down can't
            // strand it hidden. Re-baseline so the first real user scroll
            // after the guard releases computes from the settled position.
            if (guardActive) {
                lastTop = top
                accumDown = 0
                accumUp = 0
                if (currentHidden) toggle(false)
                return
            }

            // Inside the settle window we only re-baseline so the next user
            // scroll computes delta from the post-layout position. Skipping
            // delta accumulation kills the blink loop where browser scroll
            // anchoring re-fires the toggle on the same gesture.
            if (Date.now() < cooldownUntil) {
                lastTop = top
                return
            }

            const delta = top - lastTop
            lastTop = top

            if (top <= ALWAYS_SHOW_NEAR_TOP_PX) {
                accumDown = 0
                accumUp = 0
                toggle(false)
                return
            }

            if (delta > 0) {
                accumDown += delta
                accumUp = 0
                if (!currentHidden && accumDown > HIDE_AFTER_DOWN_PX) {
                    toggle(true)
                }
            } else if (delta < 0) {
                accumUp += -delta
                accumDown = 0
                if (currentHidden && accumUp > SHOW_AFTER_UP_PX) {
                    toggle(false)
                }
            }
        }

        const onScroll = (e: Event) => {
            const t = e.target as Document | HTMLElement | null
            let top: number
            let overflow: number
            if (!t || t === document || t === document.documentElement || t === document.body) {
                top = window.scrollY
                const docEl = document.scrollingElement || document.documentElement
                overflow = docEl.scrollHeight - docEl.clientHeight
            } else if (t instanceof HTMLElement) {
                // Skip horizontal-only scrollers (carousels). Their scrollTop
                // stays at 0 even while the user swipes left/right, which the
                // "near top" guard would otherwise mistake for "scrolled back
                // to the top of the page" and force the header to reappear.
                if (t.scrollHeight <= t.clientHeight) return
                // Skip scrolls that happen INSIDE an overlay (trip switcher,
                // modals, popovers). The capture-phase listener picks up
                // every scroll on the page, so without this guard scrolling
                // a dropdown's internal list collapses the activities
                // sub-sub header underneath it. We treat any ancestor with
                // `role="dialog"`, `aria-modal`, or a `data-overlay-scroll`
                // hook as a sealed scroll context.
                if (t.closest('[role="dialog"], [aria-modal="true"], [data-overlay-scroll]')) return
                top = t.scrollTop
                overflow = t.scrollHeight - t.clientHeight
            } else {
                return
            }

            // Not enough content to NEWLY hide behind: stay shown and ignore
            // the event so a rubber-band gesture on a single-card list can't
            // sneak the header into the hidden state. But if we're ALREADY
            // hidden, do NOT force-show here — hiding can itself collapse an
            // in-flow sub-header (e.g. the Flights leg strip) below this
            // threshold, and force-showing would ping-pong the state. Fall
            // through to flush(), whose near-top check restores the header
            // when the user actually scrolls back up.
            if (overflow < MIN_OVERFLOW_TO_HIDE_PX && !currentHidden) {
                return
            }

            pendingTop = top
            if (rafId === null) {
                rafId = window.requestAnimationFrame(flush)
            }
        }

        // External "force show" event — dispatched by TripboardPage on
        // tab switch so the sub-header always reappears when the user
        // lands on a new tab, instead of inheriting the previous tab's
        // hidden state.
        const handleForceShow = () => {
            lastTop = 0
            accumDown = 0
            accumUp = 0
            cooldownUntil = 0
            toggle(false)
        }

        // Programmatic-scroll guard (See-all jumps). While active, `flush`
        // keeps the header shown regardless of scroll direction.
        const handleGuardBegin = () => {
            guardActive = true
            accumDown = 0
            accumUp = 0
            cooldownUntil = 0
            toggle(false)
        }
        const handleGuardEnd = () => {
            guardActive = false
            accumDown = 0
            accumUp = 0
            toggle(false)
        }

        // Attach to the explicit target when given (direct listener — reliable on
        // iOS from inside a fixed overlay), otherwise fall back to the document
        // capture listener that catches window/element scroll everywhere else.
        // Exclusive, so deltas aren't double-counted when both would fire.
        if (directTarget) {
            directTarget.addEventListener('scroll', onScroll, { passive: true })
        } else {
            document.addEventListener('scroll', onScroll, true)
        }
        const removeForceShowListener = addForceShowHeadersListener(handleForceShow)
        window.addEventListener(SCROLL_GUARD_BEGIN_EVENT, handleGuardBegin)
        window.addEventListener(SCROLL_GUARD_END_EVENT, handleGuardEnd)
        return () => {
            if (directTarget) directTarget.removeEventListener('scroll', onScroll)
            else document.removeEventListener('scroll', onScroll, true)
            removeForceShowListener()
            window.removeEventListener(SCROLL_GUARD_BEGIN_EVENT, handleGuardBegin)
            window.removeEventListener(SCROLL_GUARD_END_EVENT, handleGuardEnd)
            if (rafId !== null) window.cancelAnimationFrame(rafId)
        }
    }, [scrollTargetRef])

    return hidden
}
