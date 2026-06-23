import React, { useEffect, useState } from 'react'

interface ProgressBarProps {
    duration?: number // in ms
    onComplete: () => void
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ duration = 3500, onComplete }) => {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const start = Date.now()
        const interval = requestAnimationFrame(function animate() {
            const elapsed = Date.now() - start
            const percentage = Math.min((elapsed / duration) * 100, 100)
            setProgress(percentage)

            if (percentage < 100) {
                requestAnimationFrame(animate)
            } else {
                onComplete()
            }
        })

        return () => cancelAnimationFrame(interval)
    }, [duration, onComplete])

    return (
        <div
            className="w-full bg-grey-4 rounded-[12px]"
            style={{ height: '8px' }}>
            <div
                className="bg-primary-default rounded-[12px] h-full transition-all ease-linear"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}
