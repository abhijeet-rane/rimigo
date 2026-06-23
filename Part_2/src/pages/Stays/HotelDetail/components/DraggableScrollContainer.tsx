'use client'

import React, { useRef, useEffect, useState, ReactNode } from 'react'

interface DraggableScrollContainerProps {
    children: ReactNode
    className?: string
    showProgressBar?: boolean // optional prop to toggle scroll progress
}

/**
 * 🖱️ A reusable wrapper that enables horizontal drag-to-scroll behavior.
 * Includes an optional scroll progress bar (default: false).
 */
const DraggableScrollContainer: React.FC<DraggableScrollContainerProps> = ({ children, className = '', showProgressBar = false }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const startX = useRef(0)
    const scrollLeft = useRef(0)
    const [scrollProgress, setScrollProgress] = useState(10)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    // --- 🧠 Check Scrollability ---
    const checkScrollability = () => {
        const el = scrollRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el
        const threshold = 1 // Small threshold to handle sub-pixel differences
        setCanScrollLeft(scrollLeft > threshold)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - threshold)
    }

    // --- 🧠 Track Scroll Progress and Scrollability ---
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const handleScroll = () => {
            if (showProgressBar) {
                const maxScroll = el.scrollWidth - el.clientWidth
                const currentScroll = el.scrollLeft
                const progress = maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0
                setScrollProgress(progress)
            }
            checkScrollability()
        }

        // Initial check
        checkScrollability()

        el.addEventListener('scroll', handleScroll)

        // Also check on resize
        const resizeObserver = new ResizeObserver(() => {
            checkScrollability()
        })
        resizeObserver.observe(el)

        return () => {
            el.removeEventListener('scroll', handleScroll)
            resizeObserver.disconnect()
        }
    }, [showProgressBar])

    // --- 🖱️ Drag to Scroll ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return
        isDragging.current = true
        scrollRef.current.classList.add('cursor-grabbing')
        startX.current = e.pageX - scrollRef.current.offsetLeft
        scrollLeft.current = scrollRef.current.scrollLeft
    }

    const handleMouseLeave = () => {
        isDragging.current = false
        scrollRef.current?.classList.remove('cursor-grabbing')
    }

    const handleMouseUp = () => {
        isDragging.current = false
        scrollRef.current?.classList.remove('cursor-grabbing')
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return
        e.preventDefault()
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX.current) * 1.5 // scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft.current - walk
        // Update scrollability after drag
        setTimeout(checkScrollability, 0)
    }

    return (
        <div className="flex flex-col w-full">
            {/* Scrollable Row with Gradients */}
            <div className="relative w-full">
                {/* Left gradient overlay - only show when can scroll left */}
                {canScrollLeft && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
                        style={{
                            background: 'linear-gradient(90deg, white 0%, rgba(255,255,255,0) 100%)'
                        }}
                    />
                )}

                {/* Right gradient overlay - only show when can scroll right */}
                {canScrollRight && (
                    <div
                        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
                        style={{
                            background: 'linear-gradient(270deg, white 0%, rgba(255,255,255,0) 100%)'
                        }}
                    />
                )}

                <div
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onScroll={checkScrollability}
                    className={`overflow-x-auto flex-nowrap  select-none no-scrollbar ${className}`}
                    style={{ scrollbarWidth: 'none' }}>
                    {children}
                </div>
            </div>

            {/* Optional Scroll Progress Bar */}
            {showProgressBar && (
                <div className="relative h-[4px] w-[calc(100%-2rem)] bg-grey-4 rounded-full mt-2 mx-auto overflow-hidden">
                    {/* Inner progress indicator */}
                    <div
                        className="absolute top-0 left-0 h-full bg-primary-default rounded-full transition-all duration-300 "
                        style={{ width: `${scrollProgress}%` }}
                    />
                </div>
            )}
        </div>
    )
}

export default DraggableScrollContainer
