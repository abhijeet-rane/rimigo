import React, { useMemo, useState, useEffect } from 'react'
import MobileSearchExpandContent from './MobileSearchExpandContent'

interface WhenSectionProps {
    value: Date | null
    onChange: (date: Date) => void
    onNext?: () => void
}

export const WhenSection: React.FC<WhenSectionProps> = ({ value, onChange, onNext }) => {
    const today = new Date()
    const currentMonthIndex = today.getMonth()
    const currentYear = today.getFullYear()

    const [selectedMonth, setSelectedMonth] = useState<number | null>(value ? value.getMonth() : null)
    const [selectedYear, setSelectedYear] = useState<number | null>(value ? value.getFullYear() : null)

    /** 🔁 Keep state in sync with parent */
    useEffect(() => {
        if (value) {
            setSelectedMonth(value.getMonth())
            setSelectedYear(value.getFullYear())
        }
    }, [value])

    /** 📅 Generate next 12 months */
    const months = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const monthIndex = (currentMonthIndex + i) % 12
            const yearOffset = currentMonthIndex + i > 11 ? 1 : 0
            const year = currentYear + yearOffset
            const date = new Date(year, monthIndex, 1)

            return {
                name: date.toLocaleString('default', { month: 'short' }),
                year,
                monthIndex
            }
        })
    }, [currentMonthIndex, currentYear])

    const handleSelectMonth = (monthIndex: number, year: number) => {
        const selectedDate = new Date(year, monthIndex, 1)

        // ❌ Prevent past months
        if (selectedDate < new Date(currentYear, currentMonthIndex, 1)) return

        setSelectedMonth(monthIndex)
        setSelectedYear(year)
        onChange(selectedDate)
        onNext?.()
    }

    return (
        <MobileSearchExpandContent title="When are you going?">
            <div className="grid grid-cols-3 gap-2 px-2.5 pb-6">
                {months.map((month) => {
                    const isActive = selectedMonth === month.monthIndex && selectedYear === month.year

                    const isPast = month.year < currentYear || (month.year === currentYear && month.monthIndex < currentMonthIndex)

                    return (
                        <button
                            key={`${month.name}-${month.year}`}
                            disabled={isPast}
                            onClick={() => !isPast && handleSelectMonth(month.monthIndex, month.year)}
                            className={`h-[64px] flex flex-col items-center justify-center rounded-[8px] border transition-colors ${
                                isPast ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-50'
                            }`}
                            style={{
                                borderColor: isActive ? 'rgb(147 51 234)' : 'rgb(229 231 235)',
                                backgroundColor: isActive ? 'rgb(147 51 234 / 0.08)' : '#fff'
                            }}>
                            <span
                                className={`text-[14px] font-bold font-manrope ${isActive ? 'text-primary-default' : isPast ? 'text-grey-3' : 'text-grey-2'}`}>
                                {month.name}
                            </span>

                            <span className={`text-[16px] font-medium font-manrope mt-1 ${isPast ? 'text-grey-3' : 'text-grey-0'}`}>
                                {month.year}
                            </span>
                        </button>
                    )
                })}
            </div>
        </MobileSearchExpandContent>
    )
}
