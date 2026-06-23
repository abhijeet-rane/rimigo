import { useMemo } from 'react'

interface FlexibleDatesPickerProps {
    duration: 7 | 14 | 21 | null
    selectedMonths: string[]
    onDurationChange: (d: 7 | 14 | 21) => void
    onMonthsChange: (months: string[]) => void
}

const DURATIONS: { value: 7 | 14 | 21; label: string }[] = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 21, label: '21 days' }
]

const FlexibleDatesPicker = ({ duration, selectedMonths, onDurationChange, onMonthsChange }: FlexibleDatesPickerProps) => {
    // Generate next 12 months
    const months = useMemo(() => {
        const result: { key: string; label: string; short: string }[] = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            result.push({
                key,
                label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                short: d.toLocaleDateString('en-US', { month: 'short' })
            })
        }
        return result
    }, [])

    const toggleMonth = (key: string) => {
        if (selectedMonths.includes(key)) {
            onMonthsChange(selectedMonths.filter((m) => m !== key))
        } else {
            onMonthsChange([...selectedMonths, key])
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Duration selection */}
            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-6">
                <h3 className="text-base font-semibold font-manrope text-grey-0 mb-4">
                    How long do you want to stay?
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {DURATIONS.map((d) => (
                        <button
                            key={d.value}
                            onClick={() => onDurationChange(d.value)}
                            className={`flex items-center justify-center py-4 rounded-xl border-[1px] transition-all duration-200 cursor-pointer ${
                                duration === d.value
                                    ? 'border-primary-default bg-primary-default/5 shadow-sm'
                                    : 'border-grey-4 hover:bg-grey-5  bg-white'
                            }`}>
                            <span
                                className={`text-[14px] font-medium font-manrope ${
                                    duration === d.value ? 'text-primary-default' : 'text-grey-0'
                                }`}>
                                {d.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Month selection */}
            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6">
                <h3 className="text-base font-semibold font-manrope text-grey-0 mb-1">
                    When do you want to go?
                </h3>
                <p className="text-sm text-grey-2 font-manrope mb-4 font-medium">
                    Select one or more months
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {months.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => toggleMonth(m.key)}
                            className={`py-3 px-2 rounded-xl text-center transition-all border-[1px] duration-200 cursor-pointer ${
                                selectedMonths.includes(m.key)
                                    ? 'bg-primary-default-08 border-primary-default text-primary-default shadow-sm'
                                    : 'bg-white border-grey-4 text-grey-1 hover:bg-grey-5'
                            }`}>
                            <span className="text-sm font-medium font-manrope block">{m.short}</span>
                            <span className={`text-[12px] font-manrope font-medium ${selectedMonths.includes(m.key) ? 'text-primary-default' : 'text-grey-2'}`}>
                                {m.label.split(' ')[1]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default FlexibleDatesPicker
