import { motion, useScroll, useTransform } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { STATIC_TEXT } from '@/constants'
import SectionDescription from './SectionDescription'

interface TimelineEntry {
    title: string
    content: React.ReactNode
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
    const ref = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState(0)

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const updateHeight = () => {
            if (ref.current) {
                const newHeight = ref.current.offsetHeight
                setHeight(newHeight)
            }
        }

        const observer = new ResizeObserver(() => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(updateHeight, 100) // Debounce: 100ms delay
        })

        if (ref.current) {
            observer.observe(ref.current)
            // Initial height setup
            updateHeight()
        }

        return () => {
            clearTimeout(timeoutId)
            if (ref.current) {
                observer.unobserve(ref.current)
            }
        }
    }, [])

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start 10%', 'end 80%']
    })

    const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
    const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

    return (
        <div
            className="w-full bg-white md:px-10"
            ref={containerRef}>
            <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
                <h1 className="text-[28px] md:text-4xl mb-4 font-bold text-header-black leading-section-header-mobile">
                    <span className="text-primary">{STATIC_TEXT.STEPS_HEADER}</span>
                </h1>
                <SectionDescription
                    className="md:leading-feature-card-header-mobile leading-5 tracking-header-description-mobile"
                    description={STATIC_TEXT.STEPS_DESCRIPTION}
                    align="left"
                />
            </div>

            <div
                ref={ref}
                className="relative max-w-7xl mx-auto pb-20">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex justify-start pt-10 md:pt-16 md:gap-10">
                        <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                            <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white flex items-center justify-center">
                                <div className="h-4 w-4 rounded-full bg-header-black border border-neutral-300 p-2" />
                            </div>
                            <h3 className="hidden md:block text-[20px] leading-section-header-mobile lg:text-[24px] md:text-2xl md:pl-20 font-bold text-header-black">
                                {item.title}
                            </h3>
                        </div>

                        <div className="relative pl-20 pr-4 md:pl-4 w-full mb-[20px] md:mb-0">
                            <h2 className="md:hidden block text-[20px] lg:text-[20px] mb-4 text-left font-bold">{item.title}</h2>
                            {item.content}
                        </div>
                    </div>
                ))}

                <div
                    style={{ height: height + 'px', overflow: 'hidden' }}
                    className="absolute md:left-8 left-8 top-0 w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent via-neutral-200 to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] max-h-[2200px] lg:max-h-[3200px]">
                    <motion.div
                        style={{
                            height: heightTransform,
                            opacity: opacityTransform,
                            overflow: 'hidden'
                        }}
                        className="absolute inset-x-0 top-0 w-[2px] bg-primary-default from-[0%] via-[10%] rounded-full"
                    />
                </div>
            </div>
        </div>
    )
}
