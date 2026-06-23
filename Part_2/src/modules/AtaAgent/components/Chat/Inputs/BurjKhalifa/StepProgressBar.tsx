import React from 'react'

interface StepProgressBarProps {
    currentStep: number
    totalSteps: number
}

const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep, totalSteps }) => {
    return (
        <div className="flex flex-col gap-2">
            {/* Progress Text */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-grey_1 font-red-hat-display">
                    Performing step {currentStep} of {totalSteps}
                </span>
            </div>

            {/* Progress Bars */}
            <div className="flex w-full gap-1 min-w-[40vw]">
                {Array.from({ length: totalSteps }).map((_, idx) => {
                    const stepNumber = idx + 1
                    const isCompleted = stepNumber < currentStep
                    const isCurrent = stepNumber === currentStep

                    return (
                        <div
                            key={idx}
                            className={`flex-1 h-1 rounded-sm transition-colors ${isCompleted || isCurrent ? 'bg-primary-default' : 'bg-grey_4'}`}
                        />
                    )
                })}
            </div>
        </div>
    )
}

export default StepProgressBar
