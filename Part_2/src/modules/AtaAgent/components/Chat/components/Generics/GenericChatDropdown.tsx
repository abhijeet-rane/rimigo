import React, { useState, useRef, useEffect, isValidElement } from 'react'
import { ChevronDown, LucideIcon, Check } from 'lucide-react'

export interface DropdownOption {
    value: string
    label: string
    icon?: LucideIcon | React.ReactNode // Support both Lucide icons and React nodes (emojis, images, etc.)
}

interface GenericChatDropdownProps {
    label: string
    subtitle?: string
    options: DropdownOption[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

const GenericChatDropdown: React.FC<GenericChatDropdownProps> = ({
    label,
    subtitle,
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const selectedOption = options.find((opt) => opt.value === value)

    const handleSelect = (optionValue: string) => {
        onChange(optionValue)
        setIsOpen(false)
    }

    return (
        <div
            className={`flex flex-col gap-2 ${className}`}
            ref={dropdownRef}>
            {/* Label */}
            <div>
                <label className="text-sm font-semibold text-grey_0 font-red-hat-display block mb-1">{label}</label>
                {subtitle && <p className="text-xs text-grey_2 font-manrope">{subtitle}</p>}
            </div>

            {/* Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-fit flex items-center gap-3 px-4 py-3 bg-white border border-grey_4 rounded-lg hover:border-primary-default transition-colors text-left">
                    {selectedOption?.icon && (
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {typeof selectedOption.icon === 'function' ? (
                                <selectedOption.icon className="w-5 h-5 text-grey_2" />
                            ) : isValidElement(selectedOption.icon) ? (
                                selectedOption.icon
                            ) : (
                                <span className="text-lg leading-none">{String(selectedOption.icon)}</span>
                            )}
                        </div>
                    )}
                    <span className="flex-1 text-base text-grey_0 font-semibold font-manrope">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-grey_2 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto border border-grey_4">
                        {options.map((option, index) => {
                            const isSelected = value === option.value
                            const IconComponent = option.icon

                            return (
                                <React.Fragment key={option.value}>
                                    {index > 0 && <div className="h-px bg-grey_4" />}
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey_5 transition-colors text-left bg-white">
                                        {/* Icon */}
                                        {IconComponent && (
                                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                {typeof IconComponent === 'function' ? (
                                                    <IconComponent className="w-5 h-5 text-grey_2" />
                                                ) : isValidElement(IconComponent) ? (
                                                    IconComponent
                                                ) : (
                                                    <span className="text-lg leading-none">{String(IconComponent)}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Label */}
                                        <span className="flex-1 text-base text-grey-0 font-medium font-manrope">{option.label}</span>

                                        {/* Checkmark for selected option */}
                                        {isSelected && (
                                            <Check
                                                className="w-5 h-5 text-primary-default flex-shrink-0"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </button>
                                </React.Fragment>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default GenericChatDropdown
