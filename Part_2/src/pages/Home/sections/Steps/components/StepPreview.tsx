import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

export const StepPreview = ({ step, index }: any) => {
    const Icon = step.icon
    const isMobile = useIsMobile()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

  const videoSrc = isMobile ? step.mobile_video : step.desktop_video

  useEffect(() => {
    setShouldLoad(true)
  }, [])

  return (
        <AnimatePresence mode="wait">
            <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="relative w-full h-full flex justify-center"
            >
                {/* Responsive aspect ratio */}
                <div
                    className={`relative w-full rounded-2xl overflow-hidden ${
                        isMobile
                            ? 'w-[75%] max-w-[280px] aspect-[9/16] border-[5px] border-grey-0 rounded-3xl '
                            : 'aspect-video'
                    }`}
                >
                {shouldLoad && (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-contain"
                    >
                        <source src={videoSrc} type="video/webm" />
                    </video>
                )}
                </div>

                {/* Floating label */}
                <div className="absolute bottom-4 right-4 bg-white px-4 py-3 rounded-xl shadow-lg border">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-default rounded-lg flex items-center justify-center">
                            <Icon size={16} className="text-white" />
                        </div>
                        <span className="font-medium">{step.label}</span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}