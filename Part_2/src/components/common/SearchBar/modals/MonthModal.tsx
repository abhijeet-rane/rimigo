import { useState } from 'react'

interface MonthModalProps {
    isOpen: boolean
    onClose: () => void
    selectedDate: Date | null
    onDateChange: (date: Date) => void
}

export const MonthModal = ({ isOpen, onClose, selectedDate, onDateChange }: MonthModalProps) => {
    if (!isOpen) return null

    const today = new Date()
    const currentMonthIndex = today.getMonth()
    const currentYear = today.getFullYear()

    const [selectedMonth, setSelectedMonth] = useState(selectedDate ? selectedDate.getMonth() : currentMonthIndex)

    // Generate next 12 months starting from current month
    const months = Array.from({ length: 12 }, (_, i) => {
        const monthIndex = (currentMonthIndex + i) % 12
        const yearOffset = currentMonthIndex + i > 11 ? 1 : 0
        const monthDate = new Date(today.getFullYear() + yearOffset, monthIndex, 1)
        return {
            name: monthDate.toLocaleString('default', { month: 'short' }),
            year: monthDate.getFullYear(),
            value: monthIndex
        }
    })

    const handleSelectMonth = (monthValue: number, year: number) => {
        const selected = new Date(year, monthValue, 1)

        // Prevent going into past months
        if (selected < new Date(currentYear, currentMonthIndex, 1)) return

        setSelectedMonth(monthValue)
        onDateChange(selected)
        onClose()
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent z-40"
                onClick={onClose}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 transform mt-2 w-[400px] z-50">
                <div className="bg-white rounded-lg border border-feature-card-border overflow-hidden shadow-lg">
                    {/* Month grid */}
                    <div className="grid grid-cols-3 gap-2 p-3">
                        {months.map((month) => {
                            const isActive = selectedMonth === month.value
                            const isPast = month.year < currentYear || (month.year === currentYear && month.value < currentMonthIndex)

                            return (
                                <button
                                    key={`${month.name}-${month.year}`}
                                    disabled={isPast}
                                    className={`h-[64px] flex flex-col items-center justify-center rounded-[8px] border cursor-pointer transition-colors ${
                                        isPast
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'hover:bg-[color-mix(in_srgb,var(--color-primary-default)_8%,transparent)]'
                                    }`}
                                    style={{
                                        borderColor: isActive ? 'var(--color-primary-default)' : 'var(--color-grey-4)',
                                        backgroundColor: isActive
                                            ? 'color-mix(in srgb, var(--color-primary-default) 8%, transparent)'
                                            : 'var(--color-natural-white)'
                                    }}
                                    onClick={() => !isPast && handleSelectMonth(month.value, month.year)}>
                                    <span
                                        className={`text-[14px] font-bold font-manrope ${
                                            isActive ? 'text-primary-default' : isPast ? 'text-grey-grey_3' : 'text-grey-grey_2'
                                        }`}>
                                        {month.name}
                                    </span>
                                    <span
                                        className={`text-[16px] font-medium font-manrope mt-1 ${isPast ? 'text-grey-grey_3' : 'text-header-black'}`}>
                                        {month.year}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}
