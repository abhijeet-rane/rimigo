import { motion, MotionValue } from 'framer-motion'

export const FloatingPlane = ({ rightTransform }: { rightTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: rightTransform }}
            src="/hero/plane.svg"
            alt="plane"
            className="absolute top-0 right-0 object-cover "
            loading="lazy"
        />
    )
}

export const FloatingImageCard = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="/hero/image-card.svg"
            alt="image-card"
            className="absolute top-0 left-0 object-cover "
            loading="lazy"
        />
    )
}

export const FloatingInstantHelp = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            src="/hero/instant-help.svg"
            alt="instant-help"
            className="absolute bottom-0 right-2 w-[300px] h-[200px] "
            loading="lazy"
        />
    )
}

export const FloatingTicket = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="/optimized/ticket_optimized.svg"
            alt="ticket"
            className="absolute top-1/3 left-0  object-cover"
            loading="lazy"
        />
    )
}

export const FloatingDubaiDown = ({ rightTransform }: { rightTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: rightTransform }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="/hero/dubai-dow.svg"
            alt="dubai-down"
            className="absolute top-1/4 right-0  object-cover"
            loading="lazy"
        />
    )
}

export const FloatingTours = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="/hero/tours.svg"
            alt="tours"
            className="absolute bottom-12 left-1/4  object-cover"
            loading="lazy"
        />
    )
}

export const FloatingMsgType = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="/hero/msg-type.svg"
            alt="msg-type"
            className="absolute bottom-12  md:bottom-24 left-[-20px]  md:left-0 md:max-w-40 lg:max-w-full object-cover"
            loading="lazy"
        />
    )
}

export const FloatingMsgType2 = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="/hero/msg-type.svg"
            alt="msg-type"
            className="absolute bottom-24 left-0  object-cover"
        />
    )
}

export const FloatingReviewCard = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            src="/optimized/review-card_optimized.svg"
            alt="review-card"
            className="absolute bottom-0 right-1/4  object-cover"
            loading="lazy"
        />
    )
}

export const FloatingItenary = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="/hero/itenary.svg"
            alt="itenary"
            className="absolute bottom-12 left-1/3  object-cover"
            loading="lazy"
        />
    )
}
