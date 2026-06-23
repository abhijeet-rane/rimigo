import React, { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigationType } from 'react-router-dom'

interface PageTransitionProps {
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    duration?: number
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className, style, duration = 0.35 }) => {
    const location = useLocation()
    const navigationType = useNavigationType()
    const directionRef = useRef(1)

    // Determine animation direction
    if (navigationType === 'PUSH') directionRef.current = 1
    else if (navigationType === 'POP') directionRef.current = -1

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 60 : -60,
            opacity: 0,
            position: 'absolute',
            width: '100%'
        }),
        center: {
            x: 0,
            opacity: 1,
            position: 'relative',
            width: '100%'
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -60 : 60,
            opacity: 0,
            position: 'absolute',
            width: '100%'
        })
    }

    return (
        <AnimatePresence
            mode="wait"
            custom={directionRef.current}>
            <motion.div
                key={location.pathname}
                custom={directionRef.current}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                    duration,
                    ease: 'easeInOut'
                }}
                className={className}
                style={style}>
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
