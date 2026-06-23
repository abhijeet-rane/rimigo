import { motion, MotionValue } from 'framer-motion'

const FloatingReviewCard = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/review-card.svg
"
            alt="review-card"
            className="absolute bottom-0 right-1/4 object-cover"
            loading="lazy"
        />
    )
}

export default FloatingReviewCard
