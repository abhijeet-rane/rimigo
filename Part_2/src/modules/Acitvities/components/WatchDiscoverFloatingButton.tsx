import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Play, Loader2 } from 'lucide-react'
import { LANDING_PAGE_BG_VIDEOS } from '@/constants'

interface WatchDiscoverFloatingButtonProps {
    /** Image URL panned + zoomed behind the label. When absent (or still
     *  loading) we render the landing-page hero webm underneath so the
     *  button always has motion instead of a flat grey square. */
    backgroundImageUrl?: string | null
    /** Called when the user taps the button. */
    onClick: () => void
    /** Disables the button + shows a spinner instead of the play icon —
     *  used while we fetch the city's shorts before opening the reels view. */
    isLoading?: boolean
    /**
     * Which viewport the button is for. Both pin bottom-center; `mobile`
     * (default) is hidden on desktop and opens the reels feed, while `desktop`
     * is hidden on mobile and the caller wires it to the cross-experience
     * sneak-peek tour instead.
     */
    variant?: 'mobile' | 'desktop'
}

/**
 * Floating "Watch & Discover" CTA for the Tripboard Activities tab.
 * Both variants pin bottom-center. `variant="mobile"` (default) adds a soft
 * white-gradient strip behind the pill and opens the reels feed;
 * `variant="desktop"` has no strip and the caller wires it to the sneak-peek
 * tour. Either way the dark pill reads as the page's primary action.
 *
 * Entrance feels deliberate: a small delay so the page settles, then a
 * smooth rise-from-below with the same easing as the mobile AI floating
 * chip, followed by two soft "attention" pulses so the user notices this
 * is a special CTA.
 *
 * Background visual = the city experience's hero image animated with a
 * slow, continuous Ken-Burns pan + zoom. The landing-page hero webm sits
 * underneath as a fallback so we never flash a grey square while the
 * image loads (or when the image can't be fetched at all).
 */
const WatchDiscoverFloatingButton: React.FC<WatchDiscoverFloatingButtonProps> = ({
    backgroundImageUrl,
    onClick,
    isLoading = false,
    variant = 'mobile'
}) => {
    const isDesktop = variant === 'desktop'
    // Cross-fade the hero image in once it decodes so users never see
    // the grey "image still loading" frame between tab switches.
    const [imgLoaded, setImgLoaded] = useState(false)
    useEffect(() => {
        setImgLoaded(false)
    }, [backgroundImageUrl])

    // Render through a portal to <body>. The Activities tab on mobile
    // scrolls inside a fixed-height `overflow-y:auto` container — and
    // iOS Safari mispositions `position: fixed` descendants of a
    // scroll container (the pill drifts to mid-screen after returning
    // from reels or switching tabs). Portaling to <body> takes the
    // button out of that scroll context so `fixed` pins to the viewport.
    if (typeof document === 'undefined') return null

    return createPortal(
        <>
            {/* Keyframes for the panning hero image + priority-strip
                fade-in. The post-entrance attention pulse was removed
                — the slide-up + scale entrance is enough to draw the
                eye without the box-shadow ring continuing to pulse. */}
            <style>{`
                @keyframes wd-pan {
                    0%   { transform: scale(1.35) translate(-9%, -6%); }
                    25%  { transform: scale(1.5)  translate(8%, -4%); }
                    50%  { transform: scale(1.55) translate(6%, 8%); }
                    75%  { transform: scale(1.45) translate(-7%, 6%); }
                    100% { transform: scale(1.35) translate(-9%, -6%); }
                }
                @keyframes wd-strip-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>

            {/* Full-screen fixed "layer". iOS Safari breaks `position: fixed`
                for descendants when `<body>` carries `overflow-x: hidden`
                (it does, globally) — the element drifts/scrolls instead of
                pinning, which is why the pill landed mid-screen after the
                reels' body-scroll-lock toggled body styles. A SINGLE
                full-screen fixed layer is handled correctly by iOS (same as
                the reels overlay), so we pin once here and position the
                strip + pill `absolute` inside it. `pointer-events-none` so
                the transparent layer never blocks the list underneath. */}
            <div className={`${isDesktop ? 'hidden md:block' : 'md:hidden'} fixed inset-0 z-40 pointer-events-none`}>
                {/* White priority strip — fades in slightly after the pill
                    arrives so the button reads as leading the entrance.
                    Mobile-only: on desktop the bottom-right pill doesn't need
                    a full-width gradient strip behind it. */}
                {!isDesktop && (
                    <div
                        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none bg-gradient-to-t from-white/85 via-white/35 to-white/0"
                        style={{
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            animation: 'wd-strip-in 600ms ease-out 250ms both'
                        }}
                        aria-hidden
                    />
                )}

                <motion.div
                    className={`absolute left-1/2 pointer-events-none ${isDesktop ? 'bottom-6' : 'bottom-5'}`}
                    style={{
                        paddingBottom: 'env(safe-area-inset-bottom)',
                        x: '-50%'
                    }}
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                        delay: 0.15,
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1]
                    }}>
                    <button
                        type="button"
                        onClick={onClick}
                        disabled={isLoading}
                        aria-label="Watch & Discover"
                        className="pointer-events-auto relative overflow-hidden rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.36)] border border-black backdrop-blur-sm cursor-pointer disabled:opacity-80 disabled:cursor-wait active:scale-[0.98] transition-transform duration-200">
                        {/* Fallback motion layer — the landing hero webm always
                            renders underneath the image so the button never
                            shows a grey square while the hero loads (or when
                            there's no image at all). */}
                        <video
                            src={LANDING_PAGE_BG_VIDEOS.FULL_VIDEO}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Hero image — cross-fades in over the video once it
                            decodes. We keep the video mounted underneath so
                            the grey "loading" frame never appears. */}
                        {backgroundImageUrl && (
                            <img
                                src={backgroundImageUrl}
                                alt=""
                                onLoad={() => setImgLoaded(true)}
                                onError={() => setImgLoaded(false)}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
                                    imgLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{
                                    animation: 'wd-pan 14s ease-in-out infinite',
                                    transformOrigin: 'center center',
                                    willChange: 'transform'
                                }}
                            />
                        )}

                        {/* Dark gradient overlay so the label is always readable */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25 pointer-events-none" />

                        {/* Label content */}
                        <div className="relative z-10 flex items-center gap-2.5 px-6 py-3.5 text-white font-red-hat-display font-bold text-[16px] whitespace-nowrap">
                            {isLoading ? (
                                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                            ) : (
                                <Play
                                    className="w-[18px] h-[18px] fill-white"
                                    strokeWidth={0}
                                />
                            )}
                            Watch &amp; Discover
                        </div>
                    </button>
                </motion.div>
            </div>
        </>,
        document.body
    )
}

export default WatchDiscoverFloatingButton
