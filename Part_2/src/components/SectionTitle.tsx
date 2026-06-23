import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const SectionTitle = ({ title, className, align = 'center' }: { title: string; className?: string; align?: 'center' | 'left' }) => {
    return (
        <motion.h1
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.2 }} // Triggers when 30% of the element is in view
            className={cn(
                'text-[24px] leading-7 md:text-3xl font-bold mb-2 text-header-black tracking-section-header-mobile font-red-hat-display',
                className,
                { 'text-left': align === 'left', 'text-center': align === 'center' }
            )}>
            {title}
        </motion.h1>
    )
}


export default SectionTitle
