import Typography from './Typography'
import { MAX_WIDTH } from '@/modules/Onboarding/constants/width'
import { Star } from '@/utils/SvgUtils'
import { motion } from 'framer-motion'

const LogoLoadingScreen = () => {
    // Star fade animation variants
    const starVariants = {
        hidden: { opacity: 0, scale: 0.6 },
        visible: { opacity: 1, scale: 1 }
    }

    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-center gap-8"
            style={{ maxWidth: `${MAX_WIDTH}px` }}>
            {/* Rotating Logo — local asset (same-origin, instant) so the icon never paints
                late after the text. Rotation is a pure CSS animation (GPU-composited via
                will-change) so it's smooth from the first frame — no main-thread flicker
                like the previous framer-motion useEffect spin had. */}
            <img
                src="/icons/compass.png"
                className="w-24 h-24 object-cover"
                style={{ animation: 'compass-rotate 2s linear infinite', willChange: 'transform' }}
                fetchPriority="high"
            />

            {/* Animated Stars */}
            <motion.div
                className="absolute left-32 top-[40%] w-4 h-4 text-primary-light"
                variants={starVariants}
                initial="hidden"
                animate="visible"
                transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1, delay: 0 }}>
                <Star />
            </motion.div>

            <motion.div
                className="absolute right-30 top-[46%] w-3 h-3 text-primary-default"
                variants={starVariants}
                initial="hidden"
                animate="visible"
                transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.2, delay: 0.4 }}>
                <Star />
            </motion.div>

            <motion.div
                className="absolute right-32 top-[47%] w-4 h-4 text-primary-light"
                variants={starVariants}
                initial="hidden"
                animate="visible"
                transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.5, delay: 0.8 }}>
                <Star />
            </motion.div>

            {/* Text */}
            <div className="flex flex-col gap-3">
                <Typography
                    size="20"
                    weight="semibold"
                    color="grey-0"
                    textAlign="center"
                    family="redhat">
                    Getting things ready
                </Typography>
                <Typography
                    size="16"
                    lineHeight="24px"
                    weight="medium"
                    family="manrope"
                    color="grey-2"
                    textAlign="center">
                    Let’s quickly get to know you, for us to give you the best recommendations{' '}
                </Typography>
            </div>
        </div>
    )
}

export default LogoLoadingScreen
