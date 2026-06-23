import Typography from '@/components/shared/Typography'
import React, { useState, useEffect } from 'react'

interface BudgetSliderProps {
    onValueChange?: (index: number) => void
    initialValue?: number
}

export const BudgetSlider: React.FC<BudgetSliderProps> = ({ onValueChange, initialValue = 0 }) => {
    const points = [0, 0.5, 1]

    const labels = [
        { title: 'Under ₹1L', description: '(per person)' },
        { title: '₹1L - ₹3L', description: '(per person)' },
        { title: '₹3L+', description: '(per person)' }
    ]

    const [selectedIndex, setSelectedIndex] = useState(initialValue)

    // Update selectedIndex when initialValue changes
    useEffect(() => {
        setSelectedIndex(initialValue)
    }, [initialValue])

    const snapToNearestStep = (value: number) => {
        const distances = points.map((p) => Math.abs(p - value))
        const nearestIndex = distances.indexOf(Math.min(...distances))
        setSelectedIndex(nearestIndex)
        if (onValueChange) onValueChange(nearestIndex)
    }

    return (
        <div className="w-full flex flex-col items-center justify-center space-y-4 px-2">
            {/* Slider */}
            <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={points[selectedIndex]}
                onChange={(e) => snapToNearestStep(parseFloat(e.target.value))}
                className="w-full h-[2px] rounded-lg appearance-none cursor-pointer"
                style={{
                    background: `linear-gradient(
            to right,
            var(--color-primary-default) ${points[selectedIndex] * 100}%,
            var(--color-primary-default) ${points[selectedIndex] * 100}%
          )`
                }}
            />

            {/* ✅ Use a plain <style> tag — TypeScript safe */}
            <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--color-grey-3, rgba(174, 174, 174, 1));
          background: var(--color-natural-white, rgba(255, 255, 255, 1));
          box-shadow: 0px 0px 8px 0px var(--color-grey-4, rgba(214, 214, 214, 1));
        cursor: pointer;
          transition: box-shadow 0.2s ease;
        }

     input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0px 0px 10px 1px color-mix(in srgb, var(--color-primary-default) 50%, transparent);
}


        input[type="range"]::-moz-range-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--color-grey-3, rgba(174, 174, 174, 1));
          background: var(--color-natural-white, rgba(255, 255, 255, 1));
          box-shadow: 0px 0px 8px 0px var(--color-grey-4, rgba(214, 214, 214, 1));
          cursor: pointer;
          transition: box-shadow 0.2s ease;
        }

        input[type="range"]::-ms-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(-color-grey-3, rgba(174, 174, 174, 1));
          background: var(--color-natural-white, rgba(255, 255, 255, 1));
          box-shadow: 0px 0px 8px 0px var(--color-grey-4, rgba(214, 214, 214, 1));
          cursor: pointer;
        }
      `}</style>

            {/* Labels */}
            <div className="flex justify-between w-full">
                {labels.map((item, index) => (
                    <div
                        key={index}
                        className={`flex flex-col ${
                            index === 0 ? 'items-start' : index === labels.length - 1 ? 'items-end' : 'items-center'
                        } space-y-1`}>
                        <Typography
                            family="manrope"
                            size="16"
                            weight="semibold"
                            color="grey-1">
                            {item.title}
                        </Typography>
                        <Typography
                            family="manrope"
                            weight="medium"
                            size="12"
                            color="grey-2">
                            {item.description}
                        </Typography>
                    </div>
                ))}
            </div>
        </div>
    )
}
