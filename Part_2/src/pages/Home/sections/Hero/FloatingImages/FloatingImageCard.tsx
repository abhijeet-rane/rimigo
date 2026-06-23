import { motion, MotionValue } from 'framer-motion'

const FloatingImageCard = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/image-card.svg
"
            alt="image-card"
            className="absolute top-0 left-0 object-cover"
            loading="lazy"
        />
    )
}

export default FloatingImageCard
