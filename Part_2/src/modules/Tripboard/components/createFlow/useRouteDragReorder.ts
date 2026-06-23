/**
 * Pointer-based reorder hook for the route preview's city list.
 *
 * Replaces the native HTML5 drag-and-drop (which only fires on release and
 * relies on the browser's ghost image — the "bounding box" feel) with a
 * live-reflow experience: the picked row lifts under the cursor and the rest
 * of the list shifts around it in real time. The commit to the parent's
 * canonical order still happens on pointer-up.
 *
 * Approach:
 *   - Snapshot each row's DOMRect at drag-start so the cursor-vs-midpoint
 *     math doesn't drift as rows transform during the drag.
 *   - While dragging, render the same canonical `items` order — never mutate
 *     the array locally. Instead, the hook returns a per-row CSS transform
 *     that displaces other rows to "open a slot" at the target index. The
 *     picked row gets translateY equal to the cursor delta so it visually
 *     follows the finger.
 *   - On pointer-up, if the target index differs from the source, call
 *     onReorder(src, target) so the parent owns the real reorder.
 *
 * Why this shape (snapshot + transforms, vs. splicing a local copy):
 *   - The DOM order stays stable, so React doesn't reconcile keys mid-drag.
 *   - getBoundingClientRect on every row, every move, would be costly; one
 *     snapshot at the start is enough since uniform-height rows shift by a
 *     single "step" distance.
 *   - Transforms compose nicely with the existing flex/gap layout.
 */
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'

export interface UseRouteDragReorderParams {
    /** Number of reorderable rows currently rendered. The hook tracks this
     *  to invalidate stale rect snapshots when the list shrinks/grows. */
    rowCount: number
    /** Fired once on pointer-up when src !== target. The parent owns the
     *  canonical order; the hook is purely a visual layer until release. */
    onReorder: (fromIndex: number, toIndex: number) => void
}

export interface RouteDragReorderApi {
    /** Index of the row currently under the user's finger as a drop target.
     *  Equal to srcIndex when the user hasn't moved far enough to cross a
     *  midpoint. `null` when no drag is in flight. */
    targetIndex: number | null
    /** Index of the originally-picked row (the one that should lift and
     *  follow the cursor). `null` when no drag is in flight. */
    srcIndex: number | null
    /** Inline style to apply to each row's container so the picked row
     *  lifts under the cursor and the others shift to make space. */
    getRowStyle: (index: number) => React.CSSProperties
    /** Pointer-down handler to attach to each row's drag handle. */
    onHandlePointerDown: (index: number) => (e: ReactPointerEvent<HTMLElement>) => void
    /** Ref callback used to register each row's outer DOM element. The hook
     *  snapshots each element's rect at drag-start to compute the per-row
     *  displacement step (works for any gap-* spacing). */
    registerRowEl: (index: number) => (el: HTMLElement | null) => void
}

export function useRouteDragReorder({ rowCount, onReorder }: UseRouteDragReorderParams): RouteDragReorderApi {
    const [srcIndex, setSrcIndex] = useState<number | null>(null)
    const [targetIndex, setTargetIndex] = useState<number | null>(null)
    const [pointerDeltaY, setPointerDeltaY] = useState(0)

    /** Live row -> element map. Updated by the consumer via registerRowEl. */
    const rowEls = useRef<Map<number, HTMLElement>>(new Map())
    /** Frozen at drag-start: each row's top edge in client coords. Used to
     *  detect which row the cursor is currently over. */
    const rowTopsAtStart = useRef<Map<number, number>>(new Map())
    /** Frozen at drag-start: the per-row step (height + gap). Computed from
     *  the snapshotted rect spacing so it works with any gap-* utility. */
    const stepAtStart = useRef(0)
    /** clientY when the user pressed down. Used to compute the picked
     *  row's translateY relative to that anchor. */
    const startClientY = useRef(0)

    const registerRowEl = useCallback(
        (index: number) => (el: HTMLElement | null) => {
            if (el) rowEls.current.set(index, el)
            else rowEls.current.delete(index)
        },
        [],
    )

    /** Drop any tracked elements above the current row count (e.g. after a
     *  city was removed mid-flow). Stale entries would confuse the next
     *  drag's rect snapshot. */
    useEffect(() => {
        rowEls.current.forEach((_, idx) => {
            if (idx >= rowCount) rowEls.current.delete(idx)
        })
    }, [rowCount])

    /** Snap the cursor's clientY to the index of whichever snapshotted row
     *  it's closest to (midpoint test). Falls back to srcIndex if no rows
     *  are tracked yet. */
    const computeTargetIndex = useCallback((clientY: number): number => {
        let bestIdx = srcIndex ?? 0
        let bestDist = Infinity
        rowTopsAtStart.current.forEach((top, idx) => {
            const midY = top + stepAtStart.current / 2
            const dist = Math.abs(clientY - midY)
            if (dist < bestDist) {
                bestDist = dist
                bestIdx = idx
            }
        })
        return bestIdx
    }, [srcIndex])

    const onHandlePointerDown = useCallback(
        (index: number) => (e: ReactPointerEvent<HTMLElement>) => {
            // Mouse-only filter: ignore right-clicks and middle-clicks. Touch
            // and pen events report `button: 0` natively, so they pass.
            if (e.pointerType === 'mouse' && e.button !== 0) return
            e.preventDefault()
            e.stopPropagation()
            const handle = e.currentTarget
            try {
                handle.setPointerCapture(e.pointerId)
            } catch {
                // Some browsers throw if the pointer was already released;
                // ignore — we'll fall back to window-level listeners.
            }

            // Freeze the geometry. Tops and a single step are enough — rows
            // are uniformly spaced (same height + same gap-*).
            rowTopsAtStart.current = new Map()
            const sortedTops: number[] = []
            rowEls.current.forEach((el, idx) => {
                const rect = el.getBoundingClientRect()
                rowTopsAtStart.current.set(idx, rect.top)
                sortedTops.push(rect.top)
            })
            sortedTops.sort((a, b) => a - b)
            stepAtStart.current = sortedTops.length >= 2 ? sortedTops[1] - sortedTops[0] : 0

            startClientY.current = e.clientY
            setSrcIndex(index)
            setTargetIndex(index)
            setPointerDeltaY(0)

            const onMove = (ev: globalThis.PointerEvent) => {
                setPointerDeltaY(ev.clientY - startClientY.current)
                setTargetIndex(computeTargetIndex(ev.clientY))
            }
            const finalize = (commit: boolean, clientY: number) => {
                window.removeEventListener('pointermove', onMove)
                window.removeEventListener('pointerup', onUp)
                window.removeEventListener('pointercancel', onCancel)
                const tgt = commit ? computeTargetIndex(clientY) : index
                if (commit && tgt !== index) onReorder(index, tgt)
                setSrcIndex(null)
                setTargetIndex(null)
                setPointerDeltaY(0)
            }
            const onUp = (ev: globalThis.PointerEvent) => finalize(true, ev.clientY)
            const onCancel = (ev: globalThis.PointerEvent) => finalize(false, ev.clientY)

            window.addEventListener('pointermove', onMove)
            window.addEventListener('pointerup', onUp)
            window.addEventListener('pointercancel', onCancel)
        },
        [computeTargetIndex, onReorder],
    )

    const getRowStyle = useCallback(
        (index: number): React.CSSProperties => {
            if (srcIndex === null || targetIndex === null) return {}
            if (index === srcIndex) {
                // Picked row floats with the cursor and renders above its
                // neighbors so the lift reads clearly.
                return {
                    transform: `translate3d(0, ${pointerDeltaY}px, 0)`,
                    zIndex: 10,
                    cursor: 'grabbing',
                    transition: 'none',
                    boxShadow: '0 8px 24px rgba(13, 12, 13, 0.18)',
                    background: 'var(--surface-raised, #FFF)',
                    borderRadius: '8px',
                }
            }
            // Other rows slide by one row-step to open the slot at the
            // current target index.
            const step = stepAtStart.current
            let shift = 0
            if (srcIndex < targetIndex && index > srcIndex && index <= targetIndex) {
                shift = -step
            } else if (srcIndex > targetIndex && index < srcIndex && index >= targetIndex) {
                shift = step
            }
            return {
                transform: shift === 0 ? undefined : `translate3d(0, ${shift}px, 0)`,
                transition: 'transform 0.18s ease',
                // Suppress accidental clicks (e.g. nights +/-) on shifted rows
                // during a drag. Re-enabled the moment srcIndex clears.
                pointerEvents: 'none',
            }
        },
        [pointerDeltaY, srcIndex, targetIndex],
    )

    return {
        targetIndex,
        srcIndex,
        getRowStyle,
        onHandlePointerDown,
        registerRowEl,
    }
}
