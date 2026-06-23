import { useRef, useEffect, useState, memo } from 'react'
import { StepCard } from './StepCard'

type StepCardListProps = {
    steps: any[]
    activeStep: number
    onSelect: (index: number) => void
}

export const StepCardList = memo(({ steps, activeStep, onSelect }: StepCardListProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

    useEffect(() => {
        const activeCard = cardRefs.current[activeStep]
        const container = containerRef.current
        if (!activeCard || !container) return

        const containerRect = container.getBoundingClientRect()
        const cardRect = activeCard.getBoundingClientRect()

        setIndicatorStyle({
            left: cardRect.left - containerRect.left,
            width: cardRect.width,
        })
    }, [activeStep])

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Card row */}
            <div className="flex justify-center items-stretch gap-3">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        ref={el => { cardRefs.current[index] = el }}
                        className="flex-1 max-w-xs"
                    >
                        <StepCard
                            isActive={activeStep === index}
                            icon={step.icon}
                            title={step.title}
                            onClick={() => onSelect(index)}
                        />
                    </div>
                ))}
            </div>

            {/* Sliding bottom indicator bar */}
            <div className="relative h-[3px] mt-3 bg-grey-5 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 h-full bg-primary-default rounded-full transition-all duration-500 ease-in-out"
                    style={{
                        left: indicatorStyle.left,
                        width: indicatorStyle.width,
                    }}
                />
            </div>
        </div>
    )
})