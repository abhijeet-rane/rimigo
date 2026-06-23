import { motion, MotionValue } from 'framer-motion'

const FloatingPlane = ({ rightTransform }: { rightTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: rightTransform }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-about-us-page-content/plane.svg"
            alt="plane"
            className="absolute top-0 right-0 object-cover size-48 lg:size-auto"
            loading="lazy"
        />
    )
}

export default FloatingPlane
