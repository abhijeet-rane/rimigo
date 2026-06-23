import { motion, MotionValue } from 'framer-motion'

const FloatingItenary = ({ bottomTransform, leftTransform }: { bottomTransform?: MotionValue<number>; leftTransform?: MotionValue<number> }) => {
    return (
        <>
            <motion.img
                style={{ y: bottomTransform, x: leftTransform }}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
                viewport={{ once: true }}
                src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/itenary.svg
"
                alt="itenary"
                className="absolute bottom-12 left-1 lg:left-1/3 object-cover"
                loading="lazy"
            />
        </>
    )
}

export default FloatingItenary
