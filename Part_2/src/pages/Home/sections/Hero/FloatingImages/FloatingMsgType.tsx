import { motion, MotionValue } from 'framer-motion'

const FloatingMsgType = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="https://rimigowebsitecontent.s3.ap-south-1.amazonaws.com/rimigo-hero-section-images/msg-type.svgg"
            alt="msg-type"
            className="absolute bottom-12 md:bottom-24 left-[-20px] md:left-0 md:max-w-40 lg:max-w-full object-cover"
            loading="lazy"
        />
    )
}

export default FloatingMsgType
