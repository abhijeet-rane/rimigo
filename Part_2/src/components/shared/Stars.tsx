import React from 'react'
import { Star } from 'lucide-react'

type StarsProps = {
    value: number
    max?: number
    size?: number
    color?: string
    emptyColor?: string
    className?: string
}

/**
 * Lightweight, dependency-free star rating display supporting fractional values.
 */
export const Stars: React.FC<StarsProps> = ({
    value,
    max = 5,
    size = 16,
    color = '#000000',
    emptyColor = '#D1D5DB',
    className
}) => {
    const clamped = Math.max(0, Math.min(max, value))

    return (
        <div className={className} role="img" aria-label={`Rating ${clamped} out of ${max}`}>
            <div className="flex items-center gap-1">
                {Array.from({ length: max }).map((_, index) => {
                    const starIndex = index + 1
                    const filledPercent = Math.max(0, Math.min(100, (clamped - index) * 100))

                    return (
                        <div key={starIndex} className="relative" style={{ width: size, height: size }}>
                            {/* Empty star */}
                            <Star
                                className="w-full h-full"
                                style={{ color: emptyColor, stroke: emptyColor }}
                            />
                            {/* Filled overlay */}
                            {filledPercent > 0 && (
                                <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: `${filledPercent}%` }}
                                >
                                    <Star
                                        className="w-full h-full"
                                        style={{ color, stroke: color, fill: color }}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Stars








