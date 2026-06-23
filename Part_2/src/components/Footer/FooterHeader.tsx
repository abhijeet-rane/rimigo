import SectionTitle from '../SectionTitle'
import { motion } from 'framer-motion'
const FooterHeader = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.2 }}
            className="w-full mx-auto flex flex-col gap-2 items-center justify-center   h-[40vh]  md:h-[80vh] ">
            <img
                src="/optimized/mobile.webp"
                alt="Mobile"
                className="object-cover  "
            />
            <div className="flex justify-center mt-12">
                <SectionTitle title="Travel Like You’ve Got a Genius AI and a Best Friend" />
            </div>
        </motion.div>
    )
}

export default FooterHeader
