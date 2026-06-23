import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import Typography from '@/components/shared/Typography'

interface FilterChipProps {
    label: string
    options: string[]
    selectedValue: string
    onChange: (value: string) => void
    activeFiltersCount?: number
}

const FilterChip: React.FC<FilterChipProps> = ({ label, options, selectedValue, onChange, activeFiltersCount = 0 }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
    const isActive = selectedValue !== 'Any'

    const updatePos = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 4, left: rect.left })
        }
    }, [])

    useEffect(() => {
        if (isOpen) updatePos()
    }, [isOpen, updatePos])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative inline-flex">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen((prev) => !prev)}
                onMouseEnter={(e) => {
                    if (isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary-default-12)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary-default-08)'
                    }
                }}
                className={`inline-flex flex-row gap-1 py-2 px-[10px] rounded-[20px] items-center justify-center transition-all ${
                    isActive
                        ? 'border border-primary-default'
                        : 'border border-grey-4 bg-natural-white hover:bg-grey-5/40'
                }`}
                style={isActive ? {
                    backgroundColor: 'var(--color-primary-default-08)',
                } : undefined}>
                <Typography
                    size="12"
                    weight="medium"
                    family="manrope"
                    color={isActive ? 'primary-default' : 'grey-2'}>
                    {label}:
                </Typography>
                <Typography
                    size="12"
                    weight="medium"
                    family="manrope"
                    color={isActive ? 'primary-default' : 'grey-0'}>
                    {selectedValue}
                </Typography>
                {isActive && activeFiltersCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary-default text-white text-[10px] font-semibold font-manrope">
                        {activeFiltersCount}
                    </span>
                )}
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 cursor-pointer ${isOpen ? 'rotate-180' : ''} ${
                        isActive ? 'text-primary-default' : 'text-grey-2'
                    }`}
                />
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[100] bg-natural-white border border-grey-4 rounded-[10px] shadow-lg max-h-[250px] overflow-y-auto scrollbar-hide"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, minWidth: 'fit-content', maxWidth: 'calc(100vw - 24px)' }}>
                    {options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                onChange(option)
                                setIsOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-medium font-manrope ${selectedValue === option ? 'bg-grey-5 text-grey-0' : 'text-grey-1 hover:bg-grey-4/30'
                                }`}>
                            {option}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}

export default FilterChip

