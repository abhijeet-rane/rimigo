import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { CustomBottomSheet } from '@/components/shared/CustomBottomSheet'
import Typography from '@/components/shared/Typography'
import { validatePhone } from '@/lib/auth/authUtils'
import { useIsMobile } from '@/hooks/use-mobile'
import { CountryList } from './CountryList'
import type { Country } from '../utils/countrySearch'

interface PhoneInputProps {
    value: string
    country: Country
    onChangePhone: (text: string) => void
    onChangeCountry: (country: Country) => void
    editable?: boolean
    error?: string
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    country,
    onChangePhone,
    onChangeCountry,
    editable = true,
    error = ''
}) => {
    const [open, setOpen] = useState(false)
    const [focused, setFocused] = useState(false)
    const [debouncedError, setDebouncedError] = useState('')
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement | null>(null)
    const isMobile = useIsMobile()

    // Desktop dropdown is portaled so an ancestor with `overflow: auto`
    // (e.g. modals) can't clip it. Flips above the trigger when there's not
    // enough room below; height is clamped to the viewport.
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    useLayoutEffect(() => {
        if (!open || isMobile) {
            setDropdownPos(null)
            return
        }
        const update = () => {
            const el = wrapperRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const vh = window.innerHeight
            const gap = 8
            const desired = 420
            const spaceBelow = Math.max(0, vh - r.bottom - gap)
            const spaceAbove = Math.max(0, r.top - gap)
            // Prefer below; flip above when below is cramped AND above has more room.
            const placeAbove = spaceBelow < 280 && spaceAbove > spaceBelow
            const available = placeAbove ? spaceAbove : spaceBelow
            // Cap at desired and never exceed the available space, so the dropdown can't overflow the viewport.
            const height = Math.min(desired, available)
            const top = placeAbove ? Math.max(gap, r.top - gap - height) : r.bottom + gap
            setDropdownPos({ top, left: r.left, width: r.width, height })
        }
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
        }
    }, [open, isMobile])

    useEffect(() => {
        if (!open || isMobile) return
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            const insideTrigger = wrapperRef.current?.contains(target)
            const insideDropdown = dropdownRef.current?.contains(target)
            if (!insideTrigger && !insideDropdown) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, isMobile])

    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open])

    useEffect(() => {
        const digitsOnly = value.replace(/\D/g, '')
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

        typingTimeoutRef.current = setTimeout(() => {
            if (digitsOnly.length > 0 && !validatePhone(digitsOnly, country.code)) {
                setDebouncedError('Please enter a valid phone number')
            } else {
                setDebouncedError('')
            }
        }, 1000)
    }, [value, country.code])

    const handleSelect = (c: Country) => {
        onChangeCountry(c)
        setOpen(false)
    }

    const showError = error || debouncedError

    return (
        <div
            className="relative w-full font-manrope"
            ref={wrapperRef}>
            <div
                className={clsx(
                    'flex items-center rounded-[12px] border h-12 overflow-hidden transition-all duration-200',
                    focused ? 'border-grey-0' : showError ? 'border-secondary-red' : 'border-grey-4'
                )}>
                <button
                    type="button"
                    onClick={() => editable && setOpen((o) => !o)}
                    disabled={!editable}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className={clsx(
                        'flex items-center gap-2 h-full px-3 py-3 border-r border-grey-4 bg-grey-5 transition-colors',
                        !editable && 'cursor-not-allowed opacity-60'
                    )}>
                    <span className="flex items-center gap-1.5">
                        <span className="text-[18px] leading-none">{country.flag}</span>
                        <Typography
                            family="manrope"
                            weight="medium"
                            size="16"
                            color="grey-0">
                            {country.code}
                        </Typography>
                    </span>
                    <ChevronDown
                        size={18}
                        className={clsx(
                            'text-grey-0 transition-transform duration-200',
                            open && !isMobile && 'rotate-180'
                        )}
                    />
                </button>

                <input
                    type="text"
                    placeholder="Enter Phone Number"
                    value={value}
                    disabled={!editable}
                    onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '')
                        const maxLen = 15 - country.code.replace('+', '').length
                        if (digitsOnly.length <= maxLen) onChangePhone(digitsOnly)
                    }}
                    onClick={() => {
                        setTimeout(() => {
                            window.scrollTo({
                                top: document.documentElement.scrollHeight,
                                behavior: 'smooth'
                            })
                        }, 100)
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className={clsx(
                        'flex-1 h-full px-[16px] py-[10px] bg-transparent outline-none text-grey-0 font-light text-size-md placeholder-grey-2 placeholder:font-light',
                        !editable && 'cursor-not-allowed opacity-70'
                    )}
                />
            </div>

            {showError && (
                <p
                    style={{ color: 'var(--color-secondary-red)' }}
                    className="text-size-sm mt-1 font-medium">
                    {showError}
                </p>
            )}

            {open && editable && !isMobile && dropdownPos && createPortal(
                <div
                    ref={dropdownRef}
                    role="listbox"
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        height: dropdownPos.height
                    }}
                    className="
                        z-[10000]
                        flex flex-col
                        bg-white
                        border border-grey-4
                        rounded-[var(--radius-md)]
                        shadow-[var(--shadow-feature-card)]
                        overflow-hidden
                        animate-in fade-in-0 slide-in-from-top-1 duration-150
                    ">
                    <CountryList
                        selected={country}
                        onSelect={handleSelect}
                        onClose={() => setOpen(false)}
                        autoFocus
                    />
                </div>,
                document.body
            )}

            {editable && isMobile && (
                <CustomBottomSheet
                    open={open}
                    onClose={() => setOpen(false)}
                    height="85vh"
                    containerClassName="z-[10000]">
                    <CountryList
                        selected={country}
                        onSelect={handleSelect}
                        onClose={() => setOpen(false)}
                        autoFocus={false}
                    />
                </CustomBottomSheet>
            )}
        </div>
    )
}
