import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Tilt from 'react-parallax-tilt'
interface CarouselProps {
    items: {
        id: number
        title: string
        content: string
        image: string
    }[]
    autoRotateInterval?: number
}

export function Carousel({ items, autoRotateInterval = 3000 }: CarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const touchStartX = useRef<number>(0)
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

    const getVisibleItems = useCallback(() => {
        const itemCount = items.length
        const prev = (currentIndex - 1 + itemCount) % itemCount
        const next = (currentIndex + 1) % itemCount
        return [prev, currentIndex, next]
    }, [currentIndex, items.length])

    const rotate = useCallback(
        (direction: 'next' | 'prev') => {
            if (isTransitioning) return

            setIsTransitioning(true)
            setCurrentIndex((current) => {
                if (direction === 'next') {
                    return (current + 1) % items.length
                } else {
                    return (current - 1 + items.length) % items.length
                }
            })

            setTimeout(() => {
                setIsTransitioning(false)
            }, 300)
        },
        [isTransitioning, items.length]
    )

    useEffect(() => {
        if (autoRotateInterval > 0) {
            autoRotateTimeoutRef.current = setInterval(() => {
                rotate('next')
            }, autoRotateInterval)

            return () => {
                if (autoRotateTimeoutRef.current) {
                    clearInterval(autoRotateTimeoutRef.current)
                }
            }
        }
    }, [rotate, autoRotateInterval])

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX
        const diff = touchStartX.current - touchEndX

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                rotate('next')
            } else {
                rotate('prev')
            }
        }
    }

    const visibleItems = getVisibleItems()

    return (
        <div className="relative w-full max-w-5xl mx-auto px-4 py-8 mt-12">
            <div
                className="relative h-[400px] "
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}>
                <div className="absolute inset-0 flex items-center justify-center rounded-md">
                    {visibleItems.map((itemIndex, position) => (
                        <div
                            key={items[itemIndex].id}
                            className={cn(
                                'absolute w-[10000px] transition-all duration-300 ease-in-out xl:w-1/3 md:w-1/2 rounded-md',
                                position === 0 && 'left-0 -translate-x-1/4 opacity-50 scale-90',
                                position === 1 && 'left-1/2 -translate-x-1/2 z-10 opacity-100 scale-100',
                                position === 2 && 'right-0 translate-x-1/4 opacity-50 scale-90',
                                isTransitioning && 'transition-transform'
                            )}>
                            <Tilt
                                tiltMaxAngleX={10}
                                tiltMaxAngleY={10}
                                tiltEnable={true}
                                className={cn(
                                    'bg-white relative w-full rounded-lg shadow-lg  transition-all duration-300 flex flex-col items-center justify-start py-8 px-4',
                                    position === 1 ? 'h-[480px] lg:h-[520px]' : 'h-[400px] lg:h-[480px]'
                                )}>
                                <p className="gap-2 items-center text-black mb-2 font-700 tracking-feature-card-header-mobile leading-feature-card-header-mobile xl:text-2xl text-center font-red-hat-display font-semibold">
                                    {items[itemIndex].title}
                                </p>
                                <p className="text-center font-manrope text-icon text-[16px] font-500 leading-[22px] tracking-header-description-mobile ">
                                    {items[itemIndex].content}
                                </p>
                                <img
                                    src={items[itemIndex].image}
                                    alt="feature-card-1"
                                    className="absolute bottom-0  object-center rounded-b-md  object-cover"
                                    loading="lazy"
                                />
                            </Tilt>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                    onClick={() => rotate('prev')}
                    className="pointer-events-auto bg-white/80 hover:bg-white shadow-lg rounded-full p-2 -translate-x-1/2"
                    aria-label="Previous slide">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={() => rotate('next')}
                    className="pointer-events-auto bg-white/80 hover:bg-white shadow-lg rounded-full p-2 translate-x-1/2"
                    aria-label="Next slide">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    )
}
