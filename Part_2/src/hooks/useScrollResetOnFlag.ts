import { useEffect } from 'react'

/**
 * Resets every scroller (window + descendants) to top when `flag` flips true.
 *
 * Fires twice — sync + rAF — so react-router's post-paint scroll restoration
 * can't override us. No-op when `flag` is false.
 */
export function useScrollResetOnFlag(flag: boolean): void {
    useEffect(() => {
        if (!flag) return
        const reset = () => {
            window.scrollTo({ top: 0, behavior: 'auto' })
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0
            document.querySelectorAll<HTMLElement>('*').forEach((el) => {
                if (el.scrollTop > 0) {
                    const overflowY = window.getComputedStyle(el).overflowY
                    if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTop = 0
                }
            })
        }
        reset()
        const raf = window.requestAnimationFrame(reset)
        return () => window.cancelAnimationFrame(raf)
    }, [flag])
}
