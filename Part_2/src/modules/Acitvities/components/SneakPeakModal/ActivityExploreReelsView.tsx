import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Check, Clock, Footprints, Heart, Plus, Volume2, VolumeX, Wallet, X } from 'lucide-react'
import { extractVideoId } from './utils'
import ReelVideoLoader from './ReelVideoLoader'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface Short {
    id: string
    url: string
    /**
     * Optional ordered list of candidate video URLs for this reel. When
     * present, the reel plays `urls[0]` and auto-advances to the next on a
     * YouTube embed error (e.g. 150 — restricted on cookieless mobile
     * Safari), only showing the "Watch on YouTube" fallback once every
     * candidate has failed. Falls back to `[url]` when omitted, so callers
     * that only have a single short keep the existing behaviour.
     */
    urls?: string[]
    /** Poster artwork (also shown while the video loads). */
    imageUrl?: string
    /** True while this reel's short is still being fetched (Watch & Discover
     *  windowed prefetch). Shows the loader over the poster. */
    isLoadingShort?: boolean
    description?: string
    /** Per-reel overrides for multi-experience feeds. */
    experienceName?: string
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistToggle?: () => void
    onViewDetails?: () => void
    onAddToItinerary?: () => void
    isInItinerary?: boolean
    duration?: SneakPeekStat | null
    bestMonths?: SneakPeekStat | null
    valueForMoney?: SneakPeekStat | null
    walkingRequired?: SneakPeekStat | null
}

interface SneakPeekStat {
    value: string
    description: string
}

interface Props {
    isOpen: boolean
    onClose: () => void
    shorts: Short[]
    experienceName: string
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistToggle?: () => void
    initialIndex?: number
    description?: string | null
    duration?: SneakPeekStat | null
    bestMonths?: SneakPeekStat | null
    valueForMoney?: SneakPeekStat | null
    walkingRequired?: SneakPeekStat | null
    onActiveIndexChange?: (index: number) => void
    /**
     * Top-of-screen progress indicator style.
     *  - `'count'` (default): the `1/N` pill used by Watch & Discover where
     *    N is typically large (dozens of cross-activity reels).
     *  - `'dots'`: compact dot row — small white pill for the active reel,
     *    faded dots for the rest. Glides between dots as `activeIndex`
     *    updates from the IntersectionObserver / swipe.
     */
    indicatorStyle?: 'count' | 'dots'
    /**
     * Swipe direction between reels.
     *  - `'vertical'` (default): up/down snap, native reels feel — used by
     *    the cross-activity Watch & Discover feed.
     *  - `'horizontal'`: left/right snap — used by the per-card Watch Reel
     *    + sneak-peek same-activity feeds where reels are siblings of the
     *    same experience, not a stream of different ones.
     */
    swipeDirection?: 'vertical' | 'horizontal'
    /**
     * Don't render the bottom "View Details" CTA. Used when this reel
     * viewer is itself opened FROM the sneak-peek sheet — the user is
     * already inside details, so the button is redundant.
     */
    hideViewDetails?: boolean
    /**
     * Push the overlay above a "stacked" sneak-peek sheet (z-[10002]).
     * Without this, the reel viewer opens behind the sheet and the
     * videos aren't visible. Only needed when the parent sheet was itself
     * elevated (i.e. the sheet was opened from inside an outer reels feed).
     */
    zBoost?: boolean
}

/** Compact white pill rendered as a reel-bottom info chip. */
const Chip: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <span className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white text-grey-0 text-[12px] font-semibold shadow-sm leading-none">
        <span className="text-grey-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        {children}
    </span>
)

/**
 * Ordered candidate video URLs for a reel. Prefers the multi-video `urls`
 * list (enables the auto-advance-on-error fallback) and falls back to the
 * single `url` so callers that pass only one short keep working unchanged.
 */
const reelCandidates = (s: Short): string[] => (s.urls && s.urls.length > 0 ? s.urls : s.url ? [s.url] : [])

/**
 * Mobile reels view — vertical snap-scroll, one YouTube short per viewport.
 *
 * Each reel renders its own player so the video scrolls WITH the swipe (true
 * reels feel) and the next reel is preloaded (warm window of active + 1) so
 * it's already playing as it scrolls into view. Concurrency is capped at two
 * players: real iOS Safari / Android Chrome cap connections per host, so
 * mounting many embeds at once makes some stall. Reels outside the window
 * show a poster.
 */
export default function ActivityExploreReelsView({
    isOpen,
    onClose,
    shorts,
    experienceName,
    isShortlisted,
    isShortlisting,
    onShortlistToggle,
    initialIndex = 0,
    duration,
    bestMonths,
    valueForMoney,
    walkingRequired,
    onActiveIndexChange,
    indicatorStyle = 'count',
    swipeDirection = 'vertical',
    hideViewDetails = false,
    zBoost = false
}: Props) {
    const isHorizontal = swipeDirection === 'horizontal'
    const containerRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<Array<HTMLDivElement | null>>([])
    const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([])
    const [activeIndex, setActiveIndex] = useState(initialIndex)
    const { trackButtonClickCustom } = usePostHog()

    useEffect(() => {
        onActiveIndexChange?.(activeIndex)
    }, [activeIndex, onActiveIndexChange])

    // Per-reel overrides (fall back to global props for single-experience callers).
    const activeShort = shorts[activeIndex]
    const activeTitle = activeShort?.experienceName ?? experienceName
    const activeIsShortlisted = activeShort?.isShortlisted ?? isShortlisted
    const activeIsShortlisting = activeShort?.isShortlisting ?? isShortlisting
    const activeOnShortlistToggle = activeShort?.onShortlistToggle ?? onShortlistToggle
    const activeOnViewDetails = activeShort?.onViewDetails
    const activeOnAddToItinerary = activeShort?.onAddToItinerary
    const activeIsInItinerary = activeShort?.isInItinerary ?? false
    const activeDuration = activeShort?.duration ?? duration
    const activeBestMonths = activeShort?.bestMonths ?? bestMonths
    const activeValueForMoney = activeShort?.valueForMoney ?? valueForMoney
    const activeWalkingRequired = activeShort?.walkingRequired ?? walkingRequired

    useEffect(() => {
        if (!isOpen) return
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { reelCount: shorts.length, initialIndex }
        })
    }, [isOpen, shorts.length, initialIndex, trackButtonClickCustom])

    // iOS-safe body scroll lock.
    useEffect(() => {
        if (!isOpen) return
        const scrollY = window.scrollY
        const prev = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width
        }
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
        return () => {
            document.body.style.overflow = prev.overflow
            document.body.style.position = prev.position
            document.body.style.top = prev.top
            document.body.style.width = prev.width
            window.scrollTo(0, scrollY)
        }
    }, [isOpen])

    // Warm up the YouTube connections on open.
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return
        const hosts = ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://i.ytimg.com', 'https://s.ytimg.com']
        const links = hosts.map((href) => {
            const l = document.createElement('link')
            l.rel = 'preconnect'
            l.href = href
            l.crossOrigin = ''
            document.head.appendChild(l)
            return l
        })
        return () => links.forEach((l) => l.remove())
    }, [isOpen])

    const handleClose = useCallback(() => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_CLOSE,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        onClose()
    }, [onClose, trackButtonClickCustom])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, handleClose])

    const [erroredIframes, setErroredIframes] = useState<Record<number, boolean>>({})
    // Player is alive (responded with any message). Used by the watchdog to
    // tell "throttled / never initialised" apart from "just buffering".
    const [aliveIframes, setAliveIframes] = useState<Record<number, boolean>>({})
    // Player actually reached PLAYING — drives the poster fade + loader hide.
    const [playingIframes, setPlayingIframes] = useState<Record<number, boolean>>({})
    // Per-index reload counter (folded into the iframe key) for the watchdog.
    const [reloadTick, setReloadTick] = useState<Record<number, number>>({})
    // Per-reel pointer into reelCandidates(short) for the multi-video
    // fallback. A ref mirrors it so advanceOrError reads the live value
    // without being re-created on every change.
    const [videoChoice, setVideoChoice] = useState<Record<number, number>>({})
    const videoChoiceRef = useRef<Record<number, number>>({})
    useEffect(() => {
        videoChoiceRef.current = videoChoice
    }, [videoChoice])

    useEffect(() => {
        itemRefs.current.length = shorts.length
        iframeRefs.current.length = shorts.length
        setErroredIframes({})
        setAliveIframes({})
        setPlayingIframes({})
        setReloadTick({})
        setVideoChoice({})
        videoChoiceRef.current = {}
    }, [shorts.length])

    // A reel's current candidate video failed (YouTube `onError`, or the
    // watchdog gave up on a silent stall). Advance to the next candidate URL
    // for that reel; only once EVERY candidate has failed do we surface the
    // "Watch on YouTube" fallback. Resets the per-reel load signals so the
    // next candidate mounts fresh (poster + loader re-show, watchdog re-arms).
    const advanceOrError = useCallback(
        (idx: number) => {
            const short = shorts[idx]
            if (!short) return
            const candidates = reelCandidates(short)
            const choice = videoChoiceRef.current[idx] ?? 0
            if (choice + 1 < candidates.length) {
                const next = choice + 1
                videoChoiceRef.current = { ...videoChoiceRef.current, [idx]: next }
                setVideoChoice((prev) => ({ ...prev, [idx]: next }))
                setReloadTick((prev) => (prev[idx] ? { ...prev, [idx]: 0 } : prev))
                setAliveIframes((prev) => {
                    if (!(idx in prev)) return prev
                    const nextState = { ...prev }
                    delete nextState[idx]
                    return nextState
                })
                setPlayingIframes((prev) => {
                    if (!(idx in prev)) return prev
                    const nextState = { ...prev }
                    delete nextState[idx]
                    return nextState
                })
                return
            }
            setErroredIframes((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }))
        },
        [shorts]
    )
    // Stable ref so the message listener / watchdog (which intentionally
    // don't re-bind on every reel change) always call the latest version.
    const advanceOrErrorRef = useRef(advanceOrError)
    useEffect(() => {
        advanceOrErrorRef.current = advanceOrError
    }, [advanceOrError])

    // IntersectionObserver — ref-callback based so it survives item remounts
    // (Watch & Discover swaps a poster node for its loaded video). Without
    // this, `activeIndex` froze and the warm window never advanced.
    const observerRef = useRef<IntersectionObserver | null>(null)
    useEffect(() => {
        if (!isOpen) return
        const root = containerRef.current
        if (!root) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const idx = Number((entry.target as HTMLElement).dataset.index)
                        if (!Number.isFinite(idx)) return
                        setActiveIndex((prev) => {
                            if (prev !== idx) {
                                trackButtonClickCustom?.({
                                    buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
                                    buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_ACTIVE_CHANGE,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { from: prev, to: idx }
                                })
                            }
                            return idx
                        })
                    }
                })
            },
            { root, threshold: [0.6] }
        )
        observerRef.current = observer
        itemRefs.current.forEach((el) => el && observer.observe(el))
        return () => {
            observer.disconnect()
            observerRef.current = null
        }
    }, [isOpen, trackButtonClickCustom])

    useEffect(() => {
        if (!isOpen) return
        setActiveIndex(initialIndex)
        const node = itemRefs.current[initialIndex]
        if (node && containerRef.current) {
            containerRef.current.scrollTo(
                isHorizontal
                    ? { left: node.offsetLeft }
                    : { top: node.offsetTop }
            )
        } else {
            containerRef.current?.scrollTo(isHorizontal ? { left: 0 } : { top: 0 })
        }
    }, [isOpen, initialIndex, isHorizontal])

    const prevActiveIndexRef = useRef<number>(initialIndex)
    const [isActivePlaying, setIsActivePlaying] = useState(true)
    const [isMuted, setIsMuted] = useState(true)
    // Mirror the mute preference in a ref so the active-change effect can carry
    // it across reels without re-running each time the user toggles sound.
    const isMutedRef = useRef(isMuted)
    useEffect(() => {
        isMutedRef.current = isMuted
    }, [isMuted])

    // Warm window: active ± 1. Neighbours mount but stay paused (autoplay=0)
    // so only the active reel ever decodes — two simultaneously-decoding
    // embeds starve the mobile hardware decoder, which showed up as "audio
    // plays but the video frame is frozen" on the reel you swiped to. Keeping
    // active-1 mounted also lets a swipe BACK resume instantly instead of
    // remounting (poster + loader) from a cold network load.
    const PRELOAD_BEHIND = 1
    const PRELOAD_AHEAD = 1
    const shouldMountAt = useCallback((i: number) => i >= activeIndex - PRELOAD_BEHIND && i <= activeIndex + PRELOAD_AHEAD, [activeIndex])

    const postCommand = useCallback((iframe: HTMLIFrameElement | null, func: 'playVideo' | 'pauseVideo' | 'mute' | 'unMute') => {
        if (!iframe || !iframe.contentWindow) return
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
    }, [])

    const playWithRetry = useCallback(
        (iframe: HTMLIFrameElement | null) => {
            if (!iframe) return
            postCommand(iframe, 'mute')
            postCommand(iframe, 'playVideo')
            const t1 = window.setTimeout(() => postCommand(iframe, 'playVideo'), 250)
            const t2 = window.setTimeout(() => postCommand(iframe, 'playVideo'), 700)
            return () => {
                window.clearTimeout(t1)
                window.clearTimeout(t2)
            }
        },
        [postCommand]
    )

    // On active change: pause the reel we left, play the new one.
    useEffect(() => {
        if (!isOpen) return
        const prev = prevActiveIndexRef.current
        if (prev !== activeIndex && iframeRefs.current[prev]) {
            postCommand(iframeRefs.current[prev], 'pauseVideo')
        }
        const cleanup = playWithRetry(iframeRefs.current[activeIndex])
        prevActiveIndexRef.current = activeIndex
        setIsActivePlaying(true)
        // playWithRetry always mutes the incoming reel for reliable autoplay.
        // If the user had unmuted, carry that preference over so scrolling to
        // the next reel keeps the sound on instead of silently re-muting.
        let unmuteTimers: number[] = []
        if (!isMutedRef.current) {
            const unmute = () => postCommand(iframeRefs.current[activeIndex], 'unMute')
            unmuteTimers = [window.setTimeout(unmute, 300), window.setTimeout(unmute, 800)]
        }
        return () => {
            cleanup?.()
            unmuteTimers.forEach((t) => window.clearTimeout(t))
        }
    }, [activeIndex, isOpen, postCommand, playWithRetry])

    const subscribeIframe = useCallback((index: number) => {
        const el = iframeRefs.current[index]
        if (!el?.contentWindow) return
        el.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: `reel-${index}`, channel: 'widget' }), '*')
    }, [])

    const handleIframeLoad = useCallback(
        (index: number) => () => {
            subscribeIframe(index)
            window.setTimeout(() => subscribeIframe(index), 300)
            // The preloaded "next" reel autoplays via the URL; the active one
            // also gets an explicit nudge so it starts promptly.
            if (index === activeIndex) {
                playWithRetry(iframeRefs.current[index])
                // Respect a carried-over unmute preference once the player loads.
                if (!isMutedRef.current) {
                    window.setTimeout(() => postCommand(iframeRefs.current[index], 'unMute'), 300)
                }
            }
        },
        [activeIndex, playWithRetry, subscribeIframe, postCommand]
    )

    // Listen for player state / error messages.
    useEffect(() => {
        if (!isOpen) return
        const onMessage = (event: MessageEvent) => {
            const okOrigin =
                typeof event.origin === 'string' &&
                (event.origin === 'https://www.youtube.com' || event.origin === 'https://www.youtube-nocookie.com')
            if (!okOrigin) return
            let data: unknown
            try {
                data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
            } catch {
                return
            }
            if (!data || typeof data !== 'object') return
            const payload = data as { event?: string; info?: unknown }
            const idx = iframeRefs.current.findIndex((el) => el && el.contentWindow === event.source)
            if (idx < 0) return

            setAliveIframes((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }))

            if (payload.event === 'onError') {
                // Try this reel's next candidate video before giving up — a
                // 150 ("restricted on cookieless mobile Safari") on one short
                // shouldn't blank the whole experience if it has others.
                advanceOrErrorRef.current(idx)
                return
            }
            let state: number | undefined
            if (payload.event === 'onStateChange' && typeof payload.info === 'number') {
                state = payload.info
            } else if (payload.event === 'infoDelivery' && payload.info && typeof payload.info === 'object') {
                const ps = (payload.info as { playerState?: unknown }).playerState
                if (typeof ps === 'number') state = ps
            }
            if (state === 1) setPlayingIframes((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }))
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [isOpen])

    // iOS autoplay unlock — `touchend` after a SWIPE is a user gesture, so
    // re-issuing play on the active reel from inside it lets WebKit start a
    // reel that scroll-mounted without one. Taps are excluded so they don't
    // override the tap-to-pause button.
    useEffect(() => {
        if (!isOpen) return
        const root = containerRef.current
        if (!root) return
        let moved = false
        const onTouchStart = () => {
            moved = false
        }
        const onTouchMove = () => {
            moved = true
        }
        const onTouchEnd = () => {
            if (!moved) return
            playWithRetry(iframeRefs.current[activeIndex])
        }
        root.addEventListener('touchstart', onTouchStart, { passive: true })
        root.addEventListener('touchmove', onTouchMove, { passive: true })
        root.addEventListener('touchend', onTouchEnd, { passive: true })
        return () => {
            root.removeEventListener('touchstart', onTouchStart)
            root.removeEventListener('touchmove', onTouchMove)
            root.removeEventListener('touchend', onTouchEnd)
        }
    }, [isOpen, activeIndex, playWithRetry])

    // Stall watchdog — if the active reel shows no signs of life within a few
    // seconds (throttled embed), force a fresh mount; after a couple of tries
    // flip to the (non-blocking) open-on-YouTube fallback. A player that is
    // alive but buffering is left alone.
    useEffect(() => {
        if (!isOpen) return
        const idx = activeIndex
        if (aliveIframes[idx] || playingIframes[idx] || erroredIframes[idx]) return
        const attempts = reloadTick[idx] ?? 0
        const t = window.setTimeout(() => {
            if (attempts < 2) setReloadTick((prev) => ({ ...prev, [idx]: attempts + 1 }))
            // Out of reload attempts: try the next candidate video for this
            // reel, only erroring to the fallback once all are exhausted.
            else advanceOrErrorRef.current(idx)
        }, 7000)
        return () => window.clearTimeout(t)
    }, [isOpen, activeIndex, aliveIframes, playingIframes, erroredIframes, reloadTick])

    // Drop alive/play state for reels scrolled out of the warm window so they
    // remount cleanly (poster + loader re-show) on the way back.
    useEffect(() => {
        if (!isOpen) return
        const inWindow = (i: number) => i >= activeIndex - PRELOAD_BEHIND && i <= activeIndex + PRELOAD_AHEAD
        const prune = (prev: Record<number, boolean>) => {
            let changed = false
            const next: Record<number, boolean> = {}
            for (const k of Object.keys(prev)) {
                const idx = Number(k)
                if (inWindow(idx)) next[idx] = prev[idx]
                else changed = true
            }
            return changed ? next : prev
        }
        setPlayingIframes(prune)
        setAliveIframes(prune)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeIndex])

    const togglePlayPause = useCallback(() => {
        const iframe = iframeRefs.current[activeIndex]
        if (!iframe || !iframe.contentWindow) return
        // If the reel isn't playing yet (iOS may have blocked autoplay), the
        // first tap starts it (within this tap gesture) instead of pausing.
        const next = playingIframes[activeIndex] ? !isActivePlaying : true
        postCommand(iframe, next ? 'playVideo' : 'pauseVideo')
        if (next) postCommand(iframe, 'mute')
        setIsActivePlaying(next)
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_PLAY_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { next: next ? 'play' : 'pause', index: activeIndex }
        })
    }, [isActivePlaying, activeIndex, playingIframes, postCommand, trackButtonClickCustom])

    const toggleMute = useCallback(() => {
        const iframe = iframeRefs.current[activeIndex]
        if (!iframe || !iframe.contentWindow) return
        const next = !isMuted
        postCommand(iframe, next ? 'mute' : 'unMute')
        setIsMuted(next)
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_MUTE_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { next: next ? 'muted' : 'unmuted', index: activeIndex }
        })
    }, [isMuted, activeIndex, postCommand, trackButtonClickCustom])

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        if (!isOpen) {
            setMounted(false)
            return
        }
        const id1 = window.requestAnimationFrame(() => {
            const id2 = window.requestAnimationFrame(() => setMounted(true))
            ;(id1 as unknown as { _next?: number })._next = id2
        })
        return () => {
            window.cancelAnimationFrame(id1)
            const inner = (id1 as unknown as { _next?: number })._next
            if (inner !== undefined) window.cancelAnimationFrame(inner)
        }
    }, [isOpen])

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    // Portal to <body>. Rendered inline, this fullscreen overlay lives
    // INSIDE the Activities tab's inner `overflow-y:auto` scroll container;
    // on iOS Safari (with the global `body { overflow-x:hidden }`) a nested
    // `position:fixed` overlay drifts with that container's scroll and lets
    // reel-scroll bleed into the listing. Portaling to <body> takes the reels
    // out of the listing's scroll context entirely so the two are isolated.
    return createPortal(
        <div
            className={`fixed inset-0 bg-black flex flex-col transition-[opacity,transform] duration-300 ease-out ${
                // When this reel viewer is opened from inside an elevated
                // sneak-peek sheet (`stackedAboveReels` → z-[10002]), we
                // need to render ABOVE that sheet, not the default z-[9999]
                // (which would put us behind the sheet and hide the videos).
                zBoost ? 'z-[10004]' : 'z-[9999]'
            } ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            <div className="flex-1 min-h-0 relative">
                <div
                    ref={containerRef}
                    // `data-overlay-scroll`: opt this scroller out of the global
                    // hide-on-scroll hook (useHideOnScrollDown listens on document
                    // in capture phase) so swiping reels never collapses or shifts
                    // the listing's sub-header underneath.
                    data-overlay-scroll
                    className={`absolute inset-0 w-full overscroll-contain snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                        isHorizontal
                            ? 'flex overflow-x-scroll overflow-y-hidden snap-x'
                            : 'overflow-y-scroll snap-y'
                    }`}>
                    {shorts.length === 0 ? (
                        <div className="h-full w-full flex items-center justify-center text-white/80 text-sm">No videos for this experience yet.</div>
                    ) : (
                        shorts.map((short, index) => {
                            // Multi-video fallback: play the current candidate;
                            // advanceOrError bumps `choice` on failure.
                            const candidates = reelCandidates(short)
                            const choice = videoChoice[index] ?? 0
                            const currentUrl = candidates[choice] ?? null
                            const videoId = currentUrl ? extractVideoId(currentUrl) : null
                            const isActive = index === activeIndex
                            return (
                                <div
                                    key={short.id}
                                    ref={(el) => {
                                        const prev = itemRefs.current[index]
                                        if (prev && prev !== el) observerRef.current?.unobserve(prev)
                                        itemRefs.current[index] = el
                                        if (el) observerRef.current?.observe(el)
                                    }}
                                    data-index={index}
                                    // `shrink-0` keeps every reel at full
                                    // viewport size when the parent is a
                                    // horizontal flex row (Watch Reel mode);
                                    // harmless for the vertical block layout.
                                    className="relative h-full w-full shrink-0 snap-start flex items-center justify-center bg-black">
                                    {videoId ? (
                                        shouldMountAt(index) && !erroredIframes[index] ? (
                                            // In-window player. The 400%/-150% wrapper is the
                                            // overflow-clip trick that hides YouTube's corner
                                            // chrome. autoplay=0 — neighbours stay paused so only
                                            // the active reel decodes; the active reel is started
                                            // (muted, inline) via postMessage playVideo from the
                                            // active-change effect / handleIframeLoad.
                                            <>
                                                <div className="relative h-full w-full overflow-hidden max-w-full pointer-events-none">
                                                    <div className="absolute w-[400%] h-[calc(100%+64px)] left-[-150%] -top-16">
                                                        <iframe
                                                            key={`yt-${index}-${choice}-${reloadTick[index] ?? 0}`}
                                                            ref={(el) => {
                                                                iframeRefs.current[index] = el
                                                            }}
                                                            onLoad={handleIframeLoad(index)}
                                                            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&controls=0&playsinline=1&rel=0&loop=1&playlist=${videoId}&modestbranding=1&fs=0&iv_load_policy=3&disablekb=1&color=white&enablejsapi=1&origin=${
                                                                typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
                                                            }`}
                                                            className="absolute top-0 left-0 w-full h-full"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                            referrerPolicy="strict-origin-when-cross-origin"
                                                            title={experienceName || 'Experience Short'}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Poster — fades out once the reel is actually
                                                    playing, so no black frame between load + first
                                                    frame. */}
                                                <div
                                                    aria-hidden
                                                    className={`pointer-events-none absolute inset-0 z-[1] bg-black transition-opacity duration-500 ${
                                                        isActive && playingIframes[index] ? 'opacity-0' : 'opacity-100'
                                                    }`}>
                                                    {short.imageUrl && <img src={short.imageUrl} alt="" className="w-full h-full object-cover" />}
                                                    <div className="absolute inset-0 bg-black/40" />
                                                </div>
                                                {/* Loader over the active reel until it plays. */}
                                                {isActive && !playingIframes[index] && !erroredIframes[index] && (
                                                    <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
                                                        <ReelVideoLoader />
                                                    </div>
                                                )}
                                                {/* Tap-to-pause — inside the item so vertical
                                                    swipes still scroll. */}
                                                {isActive && (
                                                    <button
                                                        type="button"
                                                        onClick={togglePlayPause}
                                                        aria-label={isActivePlaying ? 'Pause video' : 'Play video'}
                                                        className="absolute inset-0 z-10 bg-transparent cursor-pointer"
                                                    />
                                                )}
                                            </>
                                        ) : erroredIframes[index] ? (
                                            // Every candidate video failed (e.g. all 150 —
                                            // restricted on cookieless mobile Safari). Instead of a
                                            // confusing "Watch on YouTube" link, show the
                                            // experience's own photo so the reel still looks
                                            // intentional and on-brand. The title + pills + action
                                            // row (rendered below over the bottom gradient) keep
                                            // the reel fully usable.
                                            <img
                                                src={short.imageUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                                                alt={short.experienceName ?? ''}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            // Outside the warm window — static poster.
                                            <img
                                                src={short.imageUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                                                alt=""
                                                className="h-full w-full object-cover opacity-60"
                                            />
                                        )
                                    ) : short.imageUrl ? (
                                        // No url yet — poster (+ loader while the short is still
                                        // being fetched).
                                        <>
                                            <img src={short.imageUrl} alt={short.experienceName ?? ''} className="h-full w-full object-cover" />
                                            {isActive && short.isLoadingShort && (
                                                <>
                                                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/40" />
                                                    <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
                                                        <ReelVideoLoader />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            {short.isLoadingShort ? <ReelVideoLoader /> : <div className="text-white/70 text-sm">Unable to load video</div>}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Bottom gradient backdrop. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[55%] bg-gradient-to-t from-black/85 via-black/55 to-transparent"
                />

                {/* Overlay layer — counter / mute / close + title + pills. */}
                <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4">
                    <div className="relative flex items-center justify-end gap-2">
                        {shorts.length > 1 && indicatorStyle === 'count' && (
                            <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 h-9 px-3 rounded-full bg-black/55 backdrop-blur-sm flex items-center text-white text-[13px] font-semibold">
                                {activeIndex + 1}/{shorts.length}
                            </div>
                        )}
                        {/* Compact dot row — no background pill. Active reel
                            renders as a small white pill, inactive as faded
                            dots. `transition-all` on each item makes the
                            highlight glide between dots as `activeIndex`
                            updates from the IntersectionObserver / swipe. */}
                        {shorts.length > 1 && indicatorStyle === 'dots' && (
                            <div
                                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-3 flex items-center gap-1.5"
                                aria-label={`Reel ${activeIndex + 1} of ${shorts.length}`}>
                                {shorts.map((s, i) => {
                                    const isActive = i === activeIndex
                                    return (
                                        <span
                                            key={s.id}
                                            className={`block h-1.5 rounded-full transition-all duration-300 ease-out ${
                                                isActive ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                                            }`}
                                        />
                                    )
                                })}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                            className="pointer-events-auto h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                            {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            aria-label="Close"
                            className="pointer-events-auto h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                            <X className="h-5 w-5 text-white" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        {activeIsInItinerary && (
                            <span className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dcfce7] text-[#16a34a] text-[12px] font-bold font-red-hat-display">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                In your itinerary
                            </span>
                        )}
                        <p className="text-white text-[15px] font-medium leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">{activeTitle}</p>

                        {(() => {
                            const allChips: Array<{ key: string; node: React.ReactNode }> = []
                            if (activeDuration?.value) {
                                allChips.push({ key: 'duration', node: <Chip icon={<Clock className="w-4 h-4" />}>{activeDuration.value}</Chip> })
                            }
                            if (activeBestMonths?.value) {
                                allChips.push({
                                    key: 'bestMonths',
                                    node: <Chip icon={<Calendar className="w-4 h-4" />}>Best month: {activeBestMonths.value}</Chip>
                                })
                            }
                            if (activeValueForMoney?.value) {
                                allChips.push({ key: 'valueForMoney', node: <Chip icon={<Wallet className="w-4 h-4" />}>{activeValueForMoney.value}</Chip> })
                            }
                            if (activeWalkingRequired?.value) {
                                allChips.push({
                                    key: 'walking',
                                    node: (
                                        <Chip icon={<Footprints className="w-4 h-4" />}>
                                            {activeWalkingRequired.value === 'HIGH' ? 'High walking' : 'Low walking'}
                                        </Chip>
                                    )
                                })
                            }
                            const visible = allChips.slice(0, 2)
                            if (visible.length === 0) return null
                            return (
                                <div className="flex flex-wrap gap-2">
                                    {visible.map((c) => (
                                        <span key={c.key}>{c.node}</span>
                                    ))}
                                </div>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Action row — View Details + heart + add-to-itinerary.
                `hideViewDetails` drops the wide "View Details" button when
                the reel viewer is itself opened from inside the sneak-peek
                sheet (the user is already in details, so the button is
                redundant). The remaining shortlist + add buttons fill the
                row naturally via flex. */}
            {(activeOnShortlistToggle || (!hideViewDetails && activeOnViewDetails) || activeOnAddToItinerary) && (
                <div className="bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] shrink-0 flex items-center gap-3">
                    {!hideViewDetails && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                activeOnViewDetails?.()
                            }}
                            disabled={!activeOnViewDetails}
                            className="flex-1 h-12 rounded-xl border border-grey-3 bg-white flex items-center justify-center text-[14px] font-bold font-red-hat-display text-grey-0 hover:bg-grey-5 transition-colors disabled:opacity-50 cursor-pointer">
                            Know More
                        </button>
                    )}

                    {activeOnShortlistToggle && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                trackButtonClickCustom?.({
                                    buttonPage: POSTHOG_PAGES.ACTIVITIES_REELS,
                                    buttonName: POSTHOG_EVENTS.ACTIVITIES_REELS_SHORTLIST_TOGGLE,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { next: activeIsShortlisted ? 'removed' : 'added', index: activeIndex }
                                })
                                activeOnShortlistToggle()
                            }}
                            disabled={activeIsShortlisting}
                            aria-label={activeIsShortlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            className={`shrink-0 h-12 w-12 rounded-xl border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60 ${
                                activeIsShortlisted ? 'bg-primary-default border-primary-default' : 'bg-white border-grey-3 hover:bg-grey-5'
                            }`}>
                            <Heart className={`h-5 w-5 ${activeIsShortlisted ? 'fill-white text-white' : 'text-grey-0'}`} />
                        </button>
                    )}

                    {activeOnAddToItinerary && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (activeIsInItinerary) return
                                activeOnAddToItinerary()
                            }}
                            aria-label={activeIsInItinerary ? 'Added to itinerary' : 'Add to itinerary'}
                            className={`shrink-0 h-12 w-12 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                                activeIsInItinerary
                                    ? 'bg-primary-default-80 border-primary-default cursor-default'
                                    : 'bg-white border-primary-default hover:bg-primary-default-80'
                            }`}>
                            {activeIsInItinerary ? (
                                <Check className="h-5 w-5 text-primary-default stroke-[3]" />
                            ) : (
                                <Plus className="h-5 w-5 text-primary-default stroke-[3]" />
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>,
        document.body
    )
}
