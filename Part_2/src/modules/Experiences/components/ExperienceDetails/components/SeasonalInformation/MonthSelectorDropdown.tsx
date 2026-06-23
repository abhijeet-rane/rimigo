import * as React from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MonthSelectorDropdownProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const MonthSelectorDropdown: React.FC<MonthSelectorDropdownProps> = ({ value, onChange, placeholder = 'Select Month' }) => {
    return (
        <Select
            value={value}
            onValueChange={onChange}>
            <SelectTrigger className="w-[200px] rounded-[8px] border border-grey-4 outline-none shadow-none">
                <SelectValue
                    placeholder={placeholder}
                    className="text-base tracking-[-0.02em] leading-4 font-semibold font-manrope text-gray text-left inline-block"
                />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto  z-200 bg-white border-grey-4 border-solid border box-border">
                {/* give color to tick icon */}
                <SelectGroup>
                    {months.map((month) => (
                        <SelectItem
                            key={month}
                            value={month}>
                            {month}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}

export default MonthSelectorDropdown
