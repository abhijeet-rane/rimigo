/**
 * Use as gtag `event_callback` so `window.open` runs at most once when the
 * callback is invoked multiple times (e.g. multi-destination measurement).
 */
export function createGuardedAffiliateWindowOpen(url: string | undefined | null): () => void {
    let opened = false
    return () => {
        if (opened || !url) return
        opened = true
        window.open(url, '_blank', 'noopener,noreferrer')
    }
}
