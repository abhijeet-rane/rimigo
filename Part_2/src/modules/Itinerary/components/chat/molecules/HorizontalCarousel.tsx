import React, { useRef, useState, useEffect } from 'react'

const GAP_MAP = {
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
} as const

interface HorizontalCarouselProps {
    children: React.ReactNode
    gap?: keyof typeof GAP_MAP
    /** Show left/right fade edges when scrollable */
    showFadeEdges?: boolean
    className?: string
}

const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
    children,
    gap = 'md',
    showFadeEdges = true,
    className = '',
}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const checkScroll = () => {
        const el = scrollRef.current
        if (!el) return
        setCanScrollLeft(el.scrollLeft > 4)
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    useEffect(() => {
        checkScroll()
        const el = scrollRef.current
        if (!el) return
        el.addEventListener('scroll', checkScroll, { passive: true })
        const observer = new ResizeObserver(checkScroll)
        observer.observe(el)
        return () => {
            el.removeEventListener('scroll', checkScroll)
            observer.disconnect()
        }
    }, [])

    return (
        <div className={`relative ${className}`}>
            {/* Left fade */}
            {showFadeEdges && canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none rounded-l-[12px]" />
            )}

            {/* Scrollable content */}
            <div
                ref={scrollRef}
                className={`flex ${GAP_MAP[gap]} overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide`}
            >
                {children}
            </div>

            {/* Right fade */}
            {showFadeEdges && canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none rounded-r-[12px]" />
            )}
        </div>
    )
}

export default HorizontalCarousel
