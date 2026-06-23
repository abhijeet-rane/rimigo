import { motion, MotionValue } from 'framer-motion'

const FloatingTicket = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="/optimized/ticket_optimized.svg"
            alt="ticket"
            className="absolute top-1/3 left-0 object-cover"
            loading="lazy"
        />
    )
}

export default FloatingTicket
