import { Minus } from 'lucide-react'

export const RenderGroupControl = (
    label: string,
    ageRange: string,
    icon: React.ReactNode,
    value: number,
    onChange: (val: number) => void,
    min: number = 0
) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-grey-grey_5 flex items-center justify-center">{icon}</div>
            <div>
                <p className="itinerary-heading">{label}</p>
                <p className="itinerary-subheading">{ageRange}</p>
            </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
                    value <= min
                        ? 'border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                        : 'border-primary-default bg-white text-primary-default hover:bg-purple-50 cursor-pointer'
                }`}>
                <Minus
                    size={16}
                    className="text-grey-0"
                />
            </button>
            <span className="text-base font-semibold text-gray-900 w-8 text-center">{value}</span>
            <button
                onClick={() => onChange(value + 1)}
                className="w-9 h-9 rounded-full border border-primary-default bg-white text-primary-default hover:bg-purple-50 flex items-center justify-center cursor-pointer transition-colors">
                <span className="text-lg font-medium">+</span>
            </button>
        </div>
    </div>
)
