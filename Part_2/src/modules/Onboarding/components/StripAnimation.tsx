import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ANCIENT_TEMPLE, CHRIST_THIINGS, COLOSELLUM_THIINGS, EIFFEL_TOWER, EMPIRE_STATE, GRAND_CANYON, LAVA_FLOW, LONDON_BRIGDE, MOUNTAIN_THIINGS, MOUTN_FUJI, NIGARA_FALLS, OPERA_HOUSE, PISA_THIINGS, RUSHMORE_THIINGS, SPHINX_THIINGS, STONEHENGE_THIINGS, TELEVISION_TOWER, TORRI_GATE } from '@/constants/thiingsIcons'

// Images
const stripImagesAnimation: string[] = [
    CHRIST_THIINGS,
    MOUNTAIN_THIINGS,
    MOUTN_FUJI,
    PISA_THIINGS,
    RUSHMORE_THIINGS,
    SPHINX_THIINGS
]

const stripImagesAnimation1: string[] = [
    OPERA_HOUSE,
    ANCIENT_TEMPLE,
    NIGARA_FALLS,
    STONEHENGE_THIINGS,
    TELEVISION_TOWER,
    TORRI_GATE
]

const stripImagesAnimation3: string[] = [
    COLOSELLUM_THIINGS,
    EIFFEL_TOWER,
    LONDON_BRIGDE,
    LAVA_FLOW,
    EMPIRE_STATE,
    GRAND_CANYON
]
const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min

// Wobble per image
const ImageWithWobble: React.FC<{ src: string }> = ({ src }) => {
    const wobbleDuration = useMemo(() => randomRange(2, 5), [])
    return (
        <motion.img
            src={src}
            alt=""
            className="w-14 h-14 mx-3 opacity-70 object-contain rounded-lg flex-shrink-0"
            transition={{
                duration: wobbleDuration,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
        />
    )
}

interface RowStripProps {
    images: string[]
    reverse?: boolean
    duration: number
    shuffle?: boolean
}

const RowStrip: React.FC<RowStripProps> = ({ images, reverse = false, duration, shuffle = false }) => {
    const [viewportWidth, setViewportWidth] = useState<number>(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const shuffled = useMemo(() => (shuffle ? [...images].sort(() => Math.random() - 0.5) : images), [images, shuffle])

    // Item width: 56px (w-14) + 24px (mx-3 * 2) = 80px per item
    const ITEM_WIDTH = 80

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) setViewportWidth(containerRef.current.offsetWidth)
        }
        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    const itemsNeeded = useMemo(() => {
        if (viewportWidth === 0) return shuffled.length * 4
        const itemsToFillViewport = Math.ceil(viewportWidth / ITEM_WIDTH)
        const totalItemsNeeded = itemsToFillViewport * 3
        const repetitions = Math.ceil(totalItemsNeeded / shuffled.length)
        return repetitions * shuffled.length
    }, [viewportWidth, shuffled.length])

    const itemsToRender = useMemo(() => {
        const items: string[] = []
        for (let i = 0; i < itemsNeeded; i++) items.push(shuffled[i % shuffled.length])
        return items
    }, [itemsNeeded, shuffled])

    const oneSetWidth = shuffled.length * ITEM_WIDTH

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden w-full">
            <motion.div
                className="flex items-center"
                style={{ width: 'max-content' }}
                animate={{ x: reverse ? [0, -oneSetWidth] : [-oneSetWidth, 0] }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: duration / 100,
                        ease: 'linear'
                    }
                }}>
                {itemsToRender.map((src, i) => (
                    <ImageWithWobble
                        key={i}
                        src={src}
                    />
                ))}
            </motion.div>
        </div>
    )
}

export default function StripAnimation() {
    return (
        <div className="relative w-full flex flex-col gap-1 justify-center items-center h-[200px] mt-[-70px] mb-[50px] overflow-hidden">
            {/* Row 1 - stripImagesAnimation1, no shuffle */}
            <RowStrip
                images={stripImagesAnimation1}
                duration={12000}
                reverse={false}
                shuffle={false}
            />
            {/* Row 2 - stripImagesAnimation, shuffled */}
            <RowStrip
                images={stripImagesAnimation}
                duration={14000}
                reverse
                shuffle={false}
            />
            {/* Row 3 - stripImagesAnimation1, no shuffle */}
            <RowStrip
                images={stripImagesAnimation3}
                duration={16000}
                reverse={false}
                shuffle={false}
            />
        </div>
    )
}
