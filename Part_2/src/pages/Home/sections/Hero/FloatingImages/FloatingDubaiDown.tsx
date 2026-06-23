import { motion, MotionValue } from 'framer-motion'

const FloatingDubaiDown = ({ rightTransform }: { rightTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: rightTransform }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/dubai-dow.svg"
            alt="dubai-down"
            className="absolute top-1/4 right-0 object-cover"
            loading="lazy"
        />
    )
}

export default FloatingDubaiDown
