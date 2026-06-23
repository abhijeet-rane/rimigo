import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { IconArrowNarrowLeft, IconArrowNarrowRight } from '@tabler/icons-react'
import { motion, useInView } from 'framer-motion'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CarouselContext } from './CarouselContext'
interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string
    alt: string
    fill?: boolean
    blurDataURL?: string
    card: CardProps
}

interface CarouselProps {
    items: React.JSX.Element[]
    initialScroll?: number
}

type Card = {
    src: string
    title: string
    category: string
    content: React.ReactNode
}

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
    const carouselRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isAutoScrolling, setIsAutoScrolling] = useState(true)
    const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const checkScrollability = useCallback(() => {
        if (carouselRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1) // Add a small threshold
        }
    }, [])

    useEffect(() => {
        if (carouselRef.current) {
            carouselRef.current.scrollLeft = initialScroll
            checkScrollability()
        }

        // Add a window resize listener to recheck scrollability
        window.addEventListener('resize', checkScrollability)
        return () => window.removeEventListener('resize', checkScrollability)
    }, [initialScroll, checkScrollability])

    const scrollLeft = useCallback(() => {
        if (carouselRef.current) {
            const cardWidth = isMobile() ? 288 : 480 // (w-72 and md:w-[30rem])
            const gap = isMobile() ? 16 : 32 // Assuming gap-4 for mobile and gap-8 for desktop
            carouselRef.current.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' })
        }
    }, [])

    const scrollRight = useCallback(() => {
        if (carouselRef.current) {
            const cardWidth = isMobile() ? 288 : 480 // (w-72 and md:w-[30rem])
            const gap = isMobile() ? 16 : 32 // Assuming gap-4 for mobile and gap-8 for desktop
            carouselRef.current.scrollBy({ left: cardWidth + gap, behavior: 'smooth' })
        }
    }, [])

    const handleCardClose = useCallback((index: number) => {
        if (carouselRef.current) {
            const cardWidth = isMobile() ? 288 : 480 // (w-72 and md:w-[30rem])
            const gap = isMobile() ? 16 : 32 // Assuming gap-4 for mobile and gap-8 for desktop
            const scrollPosition = (cardWidth + gap) * index
            carouselRef.current.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            })
            setCurrentIndex(index)
        }
    }, [])

    const isMobile = () => {
        return window && window.innerWidth < 768
    }

    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-50px' })

    const startAutoScroll = useCallback(() => {
        if (!inView) return

        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current)
        }
        autoScrollIntervalRef.current = setInterval(() => {
            if (canScrollRight) {
                // scrollRight()
            } else {
                // Reset to the beginning when reaching the end
                if (carouselRef.current) {
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
                }
            }
            checkScrollability()
        }, 5000) // Auto-scroll every 5 seconds
    }, [canScrollRight, scrollRight, checkScrollability, inView])

    const stopAutoScroll = useCallback(() => {
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current)
            autoScrollIntervalRef.current = null
        }
    }, [])

    const handleUserInteraction = useCallback(() => {
        setIsAutoScrolling(false)
        stopAutoScroll()
        if (userInteractionTimeoutRef.current) {
            clearTimeout(userInteractionTimeoutRef.current)
        }
        userInteractionTimeoutRef.current = setTimeout(() => {
            setIsAutoScrolling(true)
            startAutoScroll()
        }, 10000) // Resume auto-scrolling after 10 seconds of inactivity
    }, [stopAutoScroll, startAutoScroll])

    useEffect(() => {
        if (isAutoScrolling) {
            startAutoScroll()
        } else {
            stopAutoScroll()
        }
        return () => {
            stopAutoScroll()
            if (userInteractionTimeoutRef.current) {
                clearTimeout(userInteractionTimeoutRef.current)
            }
        }
    }, [isAutoScrolling, startAutoScroll, stopAutoScroll])

    return (
        <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
            <div
                className="relative w-full"
                ref={ref}>
                <div
                    className="flex w-full overflow-x-scroll overscroll-x-auto py-10 md:py-20 scroll-smooth [scrollbar-width:none]"
                    ref={carouselRef}
                    onScroll={checkScrollability}
                    onMouseEnter={handleUserInteraction}
                    onMouseLeave={() => setIsAutoScrolling(true)}
                    onTouchStart={handleUserInteraction}
                    onTouchEnd={() => setIsAutoScrolling(true)}>
                    <div className={cn('absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l')}></div>

                    <div className={cn('flex flex-row justify-start gap-4 pl-4', 'max-w-8xl mx-auto')}>
                        {items.map((item, index) => (
                            <motion.div
                                whileInView={{ opacity: 1, y: 0 }}
                                initial={{
                                    opacity: 0,
                                    y: 20
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.5,
                                        delay: 0.2 * index,
                                        ease: 'easeOut'
                                        // once: true
                                    }
                                }}
                                key={'card' + index}
                                className="last:pr-[5%] md:last:pr-[33%] rounded-3xl">
                                {item}
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mr-10">
                    <div className="flex justify-end gap-2 mr-10">
                        <button
                            type="button"
                            aria-label="Scroll left"
                            className="relative z-40 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                                scrollLeft()
                                handleUserInteraction()
                                checkScrollability()
                            }}
                            disabled={!canScrollLeft}>
                            <IconArrowNarrowLeft className="h-6 w-6 text-gray-500" />
                        </button>

                        <button
                            type="button"
                            aria-label="Scroll right"
                            className="relative z-40 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                                scrollRight()
                                handleUserInteraction()
                                checkScrollability()
                            }}
                            disabled={!canScrollRight}>
                            <IconArrowNarrowRight className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        </CarouselContext.Provider>
    )
}
type CardProps = {
    src: string
    title: string
    category: string
    userIcon: string
    location: string
    poster?: string
}
export const Card = ({ card, layout = false }: { card: CardProps; index?: number; layout?: boolean }) => {
    return (
        <>
            <motion.button
                layoutId={layout ? `card-${card.title}` : undefined}
                className="rounded-3xl bg-gray-100  h-[30rem] w-72 md:h-[40rem] md:w-[20rem] overflow-hidden flex flex-col items-start justify-between relative z-10">
                <div
                    className="absolute inset-0 z-10"
                    style={{ transform: 'none' }}>
                    <BlurImage
                        src={card.src}
                        alt={card.title}
                        card={card}
                    />
                </div>
                <div className="absolute h-full top-0 inset-x-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-30 pointer-events-none" />
                <div className="relative z-40 p-8 w-full ">
                    <div className="flex flex-col items-start justify-start gap-2 w-full">
                        <div className="flex flex-row items-center justify-start gap-2 w-full ">
                            <Avatar>
                                <AvatarImage
                                    alt={card.title}
                                    src={card.userIcon}
                                    className="object-cover w-10 h-10 lg:w-16 lg:h-16"
                                />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <motion.p
                                layoutId={layout ? `title-${card.title}` : undefined}
                                className="text-white text-sm md:text-lg font-semibold max-w-xs text-left [text-wrap:balance] flex justify-center items-center ">
                                {card.title} {card.location}
                            </motion.p>
                        </div>
                    </div>
                </div>
                <motion.p
                    layoutId={layout ? `category-${card.title}` : undefined}
                    className="font-medium italic z-40 px-2 pb-[20px] text-white text-center bg-gradient-to-t h-1/3 flex justify-center items-end from-black to-transparent rounded-md bottom-0 w-full text-md lg:text-lg absolute left-0 right-0">
                    {card.category}
                </motion.p>
            </motion.button>
        </>
    )
}

export const BlurImage = ({ src, card }: ImageProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [shouldLoad, setShouldLoad] = useState(false)

    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-20%' })

    useEffect(() => {
        if (inView) setShouldLoad(true)
    }, [inView])

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    return (
        <div
            ref={ref}
            className="w-full h-full absolute inset-0">
            <div className="w-full h-full relative">
                {shouldLoad ? (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover rounded-md"
                        muted
                        loop
                        preload="none"
                        poster={card.poster}>
                        <source
                            src={src}
                            type="video/mp4"
                        />
                    </video>
                ) : (
                    // ✅ Only load poster until in view
                    <img
                        src={card.poster}
                        alt={card.title}
                        className="w-full h-full object-cover rounded-md"
                    />
                )}

                {/* Play/Pause overlay */}
                {shouldLoad && (
                    <div className="absolute inset-0 flex justify-center items-center z-60">
                        <button
                            onClick={togglePlay}
                            className="h-10 w-10 z-60 rounded-full bg-black/50 hover:bg-black/70 transition-colors flex items-center justify-center">
                            {isPlaying ? (
                                <svg
                                    className="h-5 w-5 text-white"
                                    viewBox="0 0 24 24"
                                    fill="currentColor">
                                    <rect
                                        x="6"
                                        y="4"
                                        width="4"
                                        height="16"
                                    />
                                    <rect
                                        x="14"
                                        y="4"
                                        width="4"
                                        height="16"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="h-5 w-5 text-white"
                                    viewBox="0 0 24 24"
                                    fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
