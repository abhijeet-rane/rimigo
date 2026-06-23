import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface Props {
    open: boolean
    size?: number
    strokeWidth?: number
    className?: string
}

/**
 * Plus glyph that rotates 45° when `open` is true — visually morphs
 * into an "×" to signal "tap again to close the attachment menu".
 * Shared by the floating chip + the in-window chat input so the
 * affordance is identical across desktop, mobile, and modal contexts.
 */
const AttachToggleIcon: React.FC<Props> = ({ open, size = 18, strokeWidth = 2.25, className }) => (
    <motion.span
        aria-hidden
        className={className}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}
        style={{ display: 'inline-flex' }}>
        <Plus
            size={size}
            strokeWidth={strokeWidth}
        />
    </motion.span>
)

export default AttachToggleIcon
