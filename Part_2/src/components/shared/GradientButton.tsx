import React from 'react'
import clsx from 'clsx'

interface ButtonColor {
    enabled: string // e.g. "bg-purple-700 text-white"
    disabled?: string // optional fallback if you want a separate disabled style
}

interface GradientButtonProps {
    onClick: () => void
    title: string
    variant?: 'primary' | 'secondary'
    loading?: boolean
    disabled?: boolean
    className?: string
    buttonColor?: ButtonColor // ✅ optional color override
}

export const GradientButton: React.FC<GradientButtonProps> = ({
    onClick,
    title,
    variant = 'primary',
    loading = false,
    disabled = false,
    className,
    buttonColor // ✅ new prop
}) => {
    const isPrimary = variant === 'primary'

    // Default variant colors
    const defaultEnabled = isPrimary ? 'bg-primary-default text-natural-white' : 'bg-blue-100 text-purple-700'

    const defaultDisabled = 'opacity-50 cursor-not-allowed'

    // If custom colors provided, use them; otherwise, fallback to defaults
    const enabledClass = buttonColor?.enabled || defaultEnabled
    const disabledClass = buttonColor?.disabled || `${defaultDisabled} ${enabledClass}`

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={clsx(
                'w-full h-12 rounded-xl cursor-pointer flex items-center justify-center text-base font-semibold transition-colors',
                disabled || loading ? disabledClass : enabledClass,
                className
            )}
            style={{
                borderRadius: '12px',
                background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)',
                boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.12)',
                color: 'var(--full-white, #FFF)',
                textAlign: 'center',
                fontFamily: 'Red Hat Display',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 645,
                lineHeight: 'normal',
                letterSpacing: '-0.16px'
            }}>
            {loading ? (
                <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
            ) : (
                <span className="text-center w-full">{title}</span>
            )}
        </button>
    )
}
