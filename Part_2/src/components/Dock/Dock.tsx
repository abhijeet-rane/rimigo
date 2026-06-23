import { cn } from '@/lib/utils'
import { AnimatePresence, motion, MotionValue, useMotionValue, useSpring, useTransform, type SpringOptions } from 'framer-motion'
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react'

export type DockItemData = {
    icon: React.ReactNode
    label: string
    onClick: () => void
    className?: string
}

export type DockProps = {
    items: DockItemData[]
    className?: string
    distance?: number
    panelHeight?: number
    baseItemSize?: number
    dockHeight?: number
    magnification?: number
    spring?: SpringOptions
    activeItem: string
}

type DockItemProps = {
    className?: string
    children: React.ReactNode
    onClick?: () => void
    mouseX: MotionValue
    spring: SpringOptions
    distance: number
    baseItemSize: number
    magnification: number
    activeItem: string
    label: string
}

interface DockChildProps {
    isHovered: MotionValue<number>
}

const colorClasses: Record<string, string> = {
    Platform: 'text-[#783BF0]',
    Curate: 'text-primary',
    Itenary: 'text-[#138B3D]',
    Booking: 'text-[#F0873B]',
    Guide: 'text-[#090A0C]'
}

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize, activeItem, label }: DockItemProps) {
    const ref = useRef<HTMLDivElement>(null)
    const isHovered = useMotionValue(0)

    const mouseDistance = useTransform(mouseX, (val) => {
        const rect = ref.current?.getBoundingClientRect() ?? {
            x: 0,
            width: baseItemSize
        }
        return val - rect.x - baseItemSize / 2
    })

    const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize])
    const size = useSpring(targetSize, spring)
    const activeColorClass = activeItem ? colorClasses[activeItem] || '' : ''

    return activeItem === label ? (
        <motion.div
            ref={ref}
            style={{
                width: size,
                height: size
            }}
            onHoverStart={() => isHovered.set(1)}
            onHoverEnd={() => isHovered.set(0)}
            onFocus={() => isHovered.set(1)}
            onBlur={() => isHovered.set(0)}
            onClick={() => {
                onClick?.()
            }}
            className={cn(
                'relative flex flex-col items-center justify-center font-semibold rounded-[7px] bg-secondary-alice_blue ',
                className,
                activeColorClass
            )}
            tabIndex={0}
            role="button"
            aria-haspopup="true">
            {Children.map(children, (child) => cloneElement(child as React.ReactElement<DockChildProps>, { isHovered }))}
        </motion.div>
    ) : (
        <motion.div
            ref={ref}
            style={{
                width: size,
                height: size
            }}
            onHoverStart={() => isHovered.set(1)}
            onHoverEnd={() => isHovered.set(0)}
            onFocus={() => isHovered.set(1)}
            onBlur={() => isHovered.set(0)}
            onClick={() => {
                onClick?.()
            }}
            className={cn('relative flex flex-col items-center justify-center font-semibold rounded-[7px]', className, activeColorClass)}
            tabIndex={0}
            role="button"
            aria-haspopup="true">
            {Children.map(children, (child) => cloneElement(child as React.ReactElement<DockChildProps>, { isHovered }))}
        </motion.div>
    )
}

type DockLabelProps = {
    className?: string
    children: React.ReactNode
}

function DockLabel({ children, className = '', ...rest }: DockLabelProps) {
    const { isHovered } = rest as { isHovered: MotionValue<number> }
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const unsubscribe = isHovered.on('change', (latest) => {
            setIsVisible(latest === 1)
        })
        return () => unsubscribe()
    }, [isHovered])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -10 }}
                    exit={{ opacity: 0, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`${className} absolute -top-6 left-1/2 w-fit whitespace-pre rounded-[7px] border border-neutral-700 bg-secondary-alice_blue px-2 py-0.5 text-xs text-black`}
                    role="tooltip"
                    style={{ x: '-50%' }}>
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

type DockIconProps = {
    className?: string
    label: string
    children: React.ReactNode
    activeItem: string
}

function DockIcon({ children, className = '', label, activeItem }: DockIconProps) {
    const activeColorClass = activeItem ? colorClasses[activeItem] || '' : ''
    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            {children}
            {activeItem === label ? <p className={`text-xs ${activeColorClass}`}>{label}</p> : <p className={`text-xs text-icon`}>{label}</p>}
        </div>
    )
}

export default function Dock({
    items,
    className = '',
    spring = { mass: 0.1, stiffness: 150, damping: 12 },
    magnification = 70,
    distance = 200,
    panelHeight = 64,
    dockHeight = 256,
    baseItemSize = 50,

    activeItem
}: DockProps) {
    const mouseX = useMotionValue(Infinity)
    const isHovered = useMotionValue(0)

    const maxHeight = useMemo(() => Math.max(dockHeight, magnification + magnification / 2 + 4), [magnification])
    const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
    const height = useSpring(heightRow, spring)

    return (
        <motion.div
            style={{ height, scrollbarWidth: 'none' }}
            className="flex max-w-full items-center">
            <motion.div
                onMouseMove={({ pageX }) => {
                    isHovered.set(1)
                    mouseX.set(pageX)
                }}
                onMouseLeave={() => {
                    isHovered.set(0)
                    mouseX.set(Infinity)
                }}
                className={`${className} bg-white absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-end  gap-4 rounded-2xl  pb-2 px-4  `}
                style={{ height: panelHeight }}
                role="toolbar"
                aria-label="Application dock">
                {items.map((item, index) => (
                    <DockItem
                        key={index}
                        onClick={item.onClick}
                        className={item.className}
                        mouseX={mouseX}
                        spring={spring}
                        distance={distance}
                        magnification={magnification}
                        baseItemSize={baseItemSize}
                        activeItem={activeItem}
                        label={item.label}>
                        <DockIcon
                            label={item.label}
                            activeItem={activeItem}>
                            {item.icon}
                        </DockIcon>
                        <DockLabel className="text-icon">{item.label}</DockLabel>
                    </DockItem>
                ))}
            </motion.div>
        </motion.div>
    )
}
