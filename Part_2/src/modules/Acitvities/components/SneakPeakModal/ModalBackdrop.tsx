import React from 'react'
import { motion } from 'framer-motion'

interface ModalBackdropProps {
    onClose: () => void
}

const ModalBackdrop: React.FC<ModalBackdropProps> = ({ onClose }) => {
    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-[1300]"
                onClick={onClose}
            />

            {/* Close Button */}
            {/* <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" />
            </button> */}
        </>
    )
}

export default ModalBackdrop
