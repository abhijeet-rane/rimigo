import React, { useRef, useEffect } from 'react'
import clsx from 'clsx'

interface OTPInputProps {
    length?: number
    value?: string
    onChange?: (otp: string) => void
    onComplete?: (otp: string) => void
    error?: string
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value = '', onChange, onComplete, error }) => {
    const otpValues = value.split('').concat(Array(length - value.length).fill(''))
    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    // Trigger onComplete when all inputs filled
    useEffect(() => {
        const otp = otpValues.join('')
        if (!otpValues.includes('') && otp.length === length) {
            inputsRef.current.forEach((input) => input?.blur())
            onComplete?.(otp)
        }
    }, [otpValues, length, onComplete])

    // Focus logic
    useEffect(() => {
        if (error) {
            // Focus last input if error
            const lastIndex = otpValues.length - 1
            inputsRef.current[lastIndex]?.focus()
        } else {
            // Focus first empty input only if there’s an empty slot
            const firstEmptyIndex = otpValues.findIndex((v) => v === '')
            if (firstEmptyIndex !== -1) {
                inputsRef.current[firstEmptyIndex]?.focus()
            }
        }
    }, [error, value, otpValues])

    // Handle input change (supports autofill, typing, and overwrite)
    const handleChange = (text: string, index: number) => {
        const digits = text.replace(/\D/g, '')

        if (!digits) {
            const newOtp = [...otpValues]
            newOtp[index] = ''
            onChange?.(newOtp.join(''))
            return
        }

        // Single digit — normal typing
        if (digits.length === 1) {
            const newOtp = [...otpValues]
            newOtp[index] = digits
            onChange?.(newOtp.join(''))
            if (index < length - 1) {
                requestAnimationFrame(() => inputsRef.current[index + 1]?.focus())
            }
            return
        }

        // 2 digits — user typed over an existing value
        if (digits.length === 2 && otpValues[index]) {
            const newDigit = digits[0] === otpValues[index] ? digits[1] : digits[0]
            const newOtp = [...otpValues]
            newOtp[index] = newDigit
            onChange?.(newOtp.join(''))
            if (index < length - 1) {
                requestAnimationFrame(() => inputsRef.current[index + 1]?.focus())
            }
            return
        }

        // 2+ digits in empty field or 3+ digits — autofill from keyboard/SMS
        onChange?.(digits.slice(0, length))
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        if (!pasteData) return
        onChange?.(pasteData)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            e.preventDefault()
            const newOtp = [...otpValues]

            if (otpValues[index]) {
                newOtp[index] = ''
                onChange?.(newOtp.join(''))
                requestAnimationFrame(() => inputsRef.current[index]?.focus())
            } else if (index > 0) {
                newOtp[index - 1] = ''
                onChange?.(newOtp.join(''))
                requestAnimationFrame(() => inputsRef.current[index - 1]?.focus())
            }
        }
    }

    return (
        <div className="grid grid-cols-6 gap-2 mt-4 w-full justify-items-center">
            {otpValues.map((val, index) => (
                <input
                    data-otp
                    name="otp"
                    key={index}
                    onPaste={handlePaste}
                    // @ts-expect-error - ref is not a valid prop

                    ref={(ref) => (inputsRef.current[index] = ref)}
                    value={val}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onClick={() => {
                        // Scroll to bottom only on click, not on focus
                        setTimeout(() => {
                            window.scrollTo({
                                top: document.documentElement.scrollHeight,
                                behavior: 'smooth'
                            })
                        }, 100)
                    }}
                    maxLength={index === 0 ? length : 1}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    className={clsx(
                        'w-12 h-12 rounded-xl text-center text-[16px] font-medium outline-none transition-colors',
                        'font-manrope',
                        'border',
                        error ? 'border-secondary-red' : 'border-grey-4',
                        'text-grey-0 placeholder-grey-3',
                        'focus:border-grey-0'
                    )}
                    placeholder="-"
                />
            ))}
        </div>
    )
}

export default OTPInput
