import { motion, MotionValue } from 'framer-motion'

const FloatingInstantHelp = ({ bottomTransform }: { bottomTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ y: bottomTransform }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/instant-help.svg
"
            alt="instant-help"
            className="absolute bottom-0 right-2 w-[300px] h-[200px]"
            loading="lazy"
        />
    )
}

export default FloatingInstantHelp
