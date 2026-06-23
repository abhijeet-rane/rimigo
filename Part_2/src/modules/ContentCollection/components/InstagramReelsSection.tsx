import { useEffect, useMemo, useRef, useState } from 'react'

interface ReelItem {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

interface InstagramReelsSectionProps {
    reels: ReelItem[]
    title?: string
    subtitle?: string
    className?: string
}

const REEL_WIDTH = 340
// Show only Instagram's header + 9:16 video. Everything below (View more link,
// actions row, likes count, "Add a comment…", trailing whitespace) is clipped by
// the wrapper's overflow:hidden — keeping the card tight and consistent across reels.
const REEL_HEIGHT = 640

const parseInstagramUrl = (url: string): { embedUrl: string; permalink: string } | null => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    try {
        const u = new URL(trimmed)
        if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null
        const match = u.pathname.match(/\/(reel|reels|p|tv)\/([^/]+)\/?/i)
        if (!match) return null
        const kind = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase()
        const shortcode = match[2]
        const permalink = `https://www.instagram.com/${kind}/${shortcode}/`
        const embedUrl = `https://www.instagram.com/${kind}/${shortcode}/embed/?cr=1&rd=${encodeURIComponent(
            typeof window !== 'undefined' ? window.location.origin : 'https://rimigo.com'
        )}`
        return { embedUrl, permalink }
    } catch {
        return null
    }
}

interface PreparedReel {
    key: string
    embedUrl: string
    permalink: string
}

const ReelCard: React.FC<{ reel: PreparedReel }> = ({ reel }) => {
    return (
        <div
            className="relative  shrink-0 rounded-xl overflow-hidden bg-white border border-grey-4/70 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.22)] transition-shadow"
            style={{ width: REEL_WIDTH, maxWidth: '100%', height: REEL_HEIGHT }}>
            <iframe
                src={reel.embedUrl}
                title="Instagram reel"
                loading="lazy"
                allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
                allowFullScreen
                scrolling="no"
                frameBorder={0}
                className="block w-full bg-white"
                style={{ height: REEL_HEIGHT + 400, border: 0 }}
            />
        </div>
    )
}

const InstagramReelsSection: React.FC<InstagramReelsSectionProps> = ({
    reels,
    title = 'Creator reels',
    subtitle,
    className = ''
}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const validReels: PreparedReel[] = useMemo(() => {
        const out: PreparedReel[] = []
        const seen = new Set<string>()
        for (const reel of reels) {
            const parsed = parseInstagramUrl(reel.url)
            if (!parsed) continue
            if (seen.has(parsed.permalink)) continue
            seen.add(parsed.permalink)
            out.push({
                key: reel.id || parsed.permalink,
                embedUrl: parsed.embedUrl,
                permalink: parsed.permalink
            })
        }
        return out
    }, [reels])

    const useScroller = validReels.length >= 3

    useEffect(() => {
        if (!useScroller) return
        const el = scrollRef.current
        if (!el) return
        const update = () => {
            const { scrollLeft, scrollWidth, clientWidth } = el
            setCanScrollLeft(scrollLeft > 4)
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
        }
        update()
        el.addEventListener('scroll', update, { passive: true })
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        window.addEventListener('resize', update)
        return () => {
            el.removeEventListener('scroll', update)
            ro?.disconnect()
            window.removeEventListener('resize', update)
        }
    }, [useScroller, validReels.length])

    if (validReels.length === 0) return null

    return (
        <section className={`w-full ${className}`}>
            <div className="h-px w-full bg-grey-4/60 mb-6 md:mb-8" aria-hidden />
            <div className="flex flex-col items-start text-left mb-6 md:mb-8 px-4 md:px-0">
                <h2 className="font-red-hat-display font-bold text-[22px] md:text-[28px] leading-tight text-grey-0 tracking-[-0.02em]">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="font-manrope text-[13px] font-medium md:text-[14px] text-grey-2 mt-1.5 max-w-xl leading-relaxed">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            {useScroller ? (
                <div className="relative">
                    {canScrollLeft && (
                        <div
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-0 h-full w-12 md:w-16 z-10 bg-gradient-to-r from-white to-transparent"
                        />
                    )}
                    {canScrollRight && (
                        <div
                            aria-hidden
                            className="pointer-events-none absolute right-0 top-0 h-full w-12 md:w-16 z-10 bg-gradient-to-l from-white to-transparent"
                        />
                    )}
                    <div
                        ref={scrollRef}
                        className="flex items-start gap-5 md:gap-6 overflow-x-auto overflow-y-hidden scroll-smooth px-4 md:px-0 py-1 [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {validReels.map((reel) => (
                            <ReelCard key={reel.key} reel={reel} />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className={`flex flex-wrap items-start justify-center ${
                        validReels.length === 1 ? 'gap-0' : 'gap-5 md:gap-6'
                    } px-4`}>
                    {validReels.map((reel) => (
                        <ReelCard key={reel.key} reel={reel} />
                    ))}
                </div>
            )}
        </section>
    )
}

export default InstagramReelsSection
