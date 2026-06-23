import { Check } from 'lucide-react'

interface TravelStyleChipsProps {
    label: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
    singleSelect?: boolean
}

const TravelStyleChips = ({ label, options, selected, onChange, singleSelect = false }: TravelStyleChipsProps) => {
    const toggle = (option: string) => {
        if (singleSelect) {
            onChange(selected.includes(option) ? [] : [option])
            return
        }

        // For dietary: if selecting "None", clear others; if selecting something else, remove "None"
        if (option === 'None') {
            onChange(selected.includes('None') ? [] : ['None'])
            return
        }

        const withoutNone = selected.filter((s) => s !== 'None')
        if (withoutNone.includes(option)) {
            onChange(withoutNone.filter((s) => s !== option))
        } else {
            onChange([...withoutNone, option])
        }
    }

    return (
        <div>
            <label className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">
                {label}
            </label>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const isSelected = selected.includes(option)
                    return (
                        <button
                            key={option}
                            onClick={() => toggle(option)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-manrope font-medium transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'bg-primary-default-80 border-[2px] border-primary-default text-primary-default'
                                    : 'bg-white text-grey-0 hover:bg-grey-4 border-[1px] border-grey-4'
                            }`}>
                            {isSelected && <Check size={14} strokeWidth={2.5} />}
                            {option}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default TravelStyleChips
