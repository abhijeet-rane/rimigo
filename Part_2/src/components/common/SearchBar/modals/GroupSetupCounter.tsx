import { Plus, Minus } from 'lucide-react'

export interface GroupSetupCounterProps {
    label: string
    ageRange: string
    value: number
    onIncrement: () => void
    onDecrement: () => void
    minValue?: number
}

export const GroupSetupCounter = ({ label, ageRange, value, onIncrement, onDecrement, minValue = 0 }: GroupSetupCounterProps) => {
    const isDecrementDisabled = value <= minValue

    return (
        <div className="flex flex-col items-center p-3 border border-grey-grey_4 rounded-lg">
            <div className="text-center mb-3">
                <p className="text-sm font-medium text-header-black">{label}</p>
                <p className="text-xs text-grey_2">{ageRange}</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onDecrement}
                    disabled={isDecrementDisabled}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                        isDecrementDisabled
                            ? 'border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                            : 'border-primary-default text-primary-default hover:bg-primary-default-80 cursor-pointer'
                    }`}>
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-medium text-header-black w-6 text-center">{value}</span>
                <button
                    onClick={onIncrement}
                    className="w-7 h-7 rounded-full border border-primary-default text-primary-default hover:bg-primary-default-80 flex items-center justify-center cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
