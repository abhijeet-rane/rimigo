import { motion, MotionValue } from 'framer-motion'

const FloatingMsgType2 = ({ leftTransform }: { leftTransform: MotionValue<number> }) => {
    return (
        <motion.img
            style={{ x: leftTransform }}
            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-hero-section-images/msg-type.svg
"
            alt="msg-type"
            className="absolute bottom-24 left-0 object-cover"
        />
    )
}

export default FloatingMsgType2
