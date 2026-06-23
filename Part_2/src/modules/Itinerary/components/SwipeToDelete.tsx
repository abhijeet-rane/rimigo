import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Trash2 } from 'lucide-react'

interface SwipeToDeleteProps {
    children: React.ReactNode
    onDelete: () => void
    enabled?: boolean
}

const DELETE_THRESHOLD = -80

/**
 * Wraps a card to enable swipe-left-to-reveal-delete on mobile.
 * Drag the card left to reveal a red delete action area.
 */
export default function SwipeToDelete({ children, onDelete, enabled = true }: SwipeToDeleteProps) {
    const [isRevealed, setIsRevealed] = useState(false)
    const x = useMotionValue(0)
    const deleteOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0])
    const deleteScale = useTransform(x, [-100, -40, 0], [1, 0.8, 0.5])
    const containerRef = useRef<HTMLDivElement>(null)

    const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
        if (info.offset.x < DELETE_THRESHOLD) {
            setIsRevealed(true)
        } else {
            setIsRevealed(false)
        }
    }, [])

    const handleDelete = useCallback(() => {
        setIsRevealed(false)
        onDelete()
    }, [onDelete])

    if (!enabled) {
        return <>{children}</>
    }

    return (
        <div ref={containerRef} className="relative overflow-hidden rounded-xl">
            {/* Delete action behind the card */}
            <motion.div
                className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-r-xl"
                style={{ opacity: deleteOpacity, scale: deleteScale }}
            >
                <button
                    onClick={handleDelete}
                    className="flex flex-col items-center gap-1 text-white"
                    type="button"
                >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Delete</span>
                </button>
            </motion.div>

            {/* Swipeable card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={{ x: isRevealed ? -80 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ x }}
                className="relative z-10 bg-white"
                onClick={() => {
                    if (isRevealed) setIsRevealed(false)
                }}
            >
                {children}
            </motion.div>
        </div>
    )
}
