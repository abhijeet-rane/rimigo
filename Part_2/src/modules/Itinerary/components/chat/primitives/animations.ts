/**
 * Shared Framer Motion animation variants for chat card components.
 * Import these in card components to ensure consistent animations across all response types.
 */
import type { Variants, Transition } from 'motion/react'

/** Card shell entry: fade up with subtle scale */
export const cardEntry: Variants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
}

/** Staggered container: children appear sequentially */
export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
}

/** Staggered item: each child fades up */
export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    },
}

/** Collapse/expand for progressive disclosure sections */
export const collapseTransition: Transition = {
    type: 'spring',
    duration: 0.3,
    bounce: 0,
}

/** Skeleton shimmer for loading placeholders */
export const skeletonPulse: Variants = {
    initial: { opacity: 0.5 },
    animate: {
        opacity: [0.5, 1, 0.5],
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
}

/** Fade in for simple appearance */
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
    },
}
