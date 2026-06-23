import { Check } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const DEFAULT_STEPS = [
    { label: 'Dates', number: 1 },
    { label: 'Cities & Route', number: 2 },
    { label: 'Preferences', number: 3 }
]

export type StepSubLabel = { text: string; imageUrl?: string } | string | null | undefined

interface StepIndicatorProps {
    currentStep: number
    className?: string
    /** Custom steps array. Defaults to the 3-step itinerary wizard steps. */
    steps?: { label: string; number: number }[]
    /** Called when a completed step is clicked. Only completed (past) steps are clickable. */
    onStepClick?: (stepNumber: number) => void
    /** Summary shown under each completed step (same order as `steps`). */
    stepSubLabels?: StepSubLabel[]
}

const StepIndicator = ({ currentStep, className = '', steps = DEFAULT_STEPS, onStepClick, stepSubLabels }: StepIndicatorProps) => {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <div className={`w-full bg-grey-5 py-4 ${className}`}>
                {/* Relative wrapper so we can absolutely position the connector track */}
                <div className="relative flex items-start w-full px-4">
                    {/* Full-width track line, centred on the 36px circles (top-[18px]) */}
                    <div className="absolute top-[18px] left-[12.5%] right-[12.5%] h-px bg-grey-3/30 rounded-full" />
                    {/* Filled progress */}
                    <div
                        className="absolute top-[18px] left-[12.5%] h-px bg-primary-default rounded-full transition-all duration-500 ease-in-out"
                        style={{
                            width: `${((currentStep - 1) / (steps.length - 1)) * 75}%`
                        }}
                    />

                    {steps.map((step, i) => {
                        const isCompleted = currentStep > step.number
                        const isCurrent = currentStep === step.number
                        const isFuture = currentStep < step.number
                        const isClickable = isCompleted && !!onStepClick
                        const raw = stepSubLabels?.[i]
                        const subLabel = raw ? (typeof raw === 'string' ? { text: raw, imageUrl: undefined } : raw) : null

                        return (
                            <button
                                key={step.number}
                                type="button"
                                className={`relative z-10 flex-1 flex flex-col items-center gap-1.5 min-w-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={() => isClickable && onStepClick(step.number)}
                                disabled={!isClickable}
                            >
                                {/* Circle */}
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-manrope transition-all duration-300 ${
                                        isCompleted
                                            ? 'bg-primary-default text-white'
                                            : isCurrent
                                              ? 'bg-primary-default text-white ring-4 ring-primary-default/20'
                                              : 'bg-white border-2 border-grey-3/50 text-grey-2'
                                    }`}
                                >
                                    {isCompleted ? <Check size={15} strokeWidth={3} /> : step.number}
                                </div>

                                {/* Completed + has sub-label: show choice pill instead of label */}
                                {isCompleted && subLabel ? (
                                    <span className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full max-w-[100px] sm:max-w-[120px]">
                                        {subLabel.imageUrl && (
                                            <img
                                                src={subLabel.imageUrl}
                                                alt=""
                                                className="w-3 h-3 rounded-full object-cover shrink-0"
                                            />
                                        )}
                                        <span className="block text-[10px] font-manrope font-semibold text-primary-default leading-none truncate">
                                            {subLabel.text}
                                        </span>
                                    </span>
                                ) : (
                                    /* Current / future / completed-without-sublabel: show step label */
                                    <span
                                        className={`text-[9px] font-manrope font-semibold whitespace-nowrap leading-none text-center transition-colors duration-300 ${
                                            isCurrent ? 'text-grey-0' : isFuture ? 'text-grey-3' : 'text-grey-1'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="flex items-start justify-center gap-2 w-full">
                {steps.map((step, i) => {
                    const isCompleted = currentStep > step.number
                    const isCurrent = currentStep === step.number
                    const isFuture = currentStep < step.number
                    const isClickable = isCompleted && !!onStepClick
                    const raw = stepSubLabels?.[i]
                    const subLabel = raw ? (typeof raw === 'string' ? { text: raw, imageUrl: undefined } : raw) : null

                    return (
                        <div key={step.number} className="flex items-start gap-2">
                            <button
                                type="button"
                                className={`flex flex-col items-start gap-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={() => isClickable && onStepClick(step.number)}
                                disabled={!isClickable}
                            >
                                {/* Dot + label row */}
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-manrope transition-all duration-300 ${
                                            isCompleted
                                                ? 'bg-primary-default text-white'
                                                : isCurrent
                                                  ? 'bg-primary-default text-white ring-4 ring-primary-default/20'
                                                  : 'bg-grey-5 text-grey-2'
                                        }`}
                                    >
                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : step.number}
                                    </div>
                                    <span
                                        className={`text-sm font-manrope font-medium transition-colors duration-300 ${
                                            isCurrent ? 'text-grey-0' : isFuture ? 'text-grey-3' : 'text-grey-1'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>

                                {/* Sub-label (desktop): consistent style, keep optional flag/icon */}
                                {isCompleted && subLabel && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-grey-5 border border-grey-4 max-w-[110px]">
                                        {subLabel.imageUrl && (
                                            <img
                                                src={subLabel.imageUrl}
                                                alt=""
                                                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                            />
                                        )}
                                        <span className="text-[10px] font-manrope font-medium text-grey-1 leading-none truncate">
                                            {subLabel.text}
                                        </span>
                                    </span>
                                )}
                            </button>

                            {/* Connector */}
                            {i < steps.length - 1 && (
                                <div
                                    className={`mt-3.5 w-12 h-0.5 rounded-full transition-colors duration-300 ${
                                        currentStep > step.number ? 'bg-primary-default' : 'bg-grey-4'
                                    }`}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default StepIndicator
