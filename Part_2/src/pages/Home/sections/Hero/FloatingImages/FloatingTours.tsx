import { motion, MotionValue } from 'framer-motion'

const FloatingTours = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
            viewport={{ once: true }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/tours.svg"
            alt="tours"
            className="absolute bottom-12 left-1/4 object-cover"
            loading="lazy"
        />
    )
}

export default FloatingTours
