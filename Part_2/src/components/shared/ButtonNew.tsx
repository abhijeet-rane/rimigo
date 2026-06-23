import React from 'react'
import clsx from 'clsx'

interface ButtonColor {
    enabled: string // e.g. "bg-purple-700 text-white"
    disabled?: string // optional fallback if you want a separate disabled style
}

interface ButtonProps {
    onClick: () => void
    title: string
    variant?: 'primary' | 'secondary'
    loading?: boolean
    disabled?: boolean
    className?: string
    buttonColor?: ButtonColor
    textStyle?: string
    subtitleTextStyle?: string
    subtitle?: string
    icon?: React.ReactNode // ✅ optional prefix icon
    iconSize?: number // ✅ control icon size if needed
}

export const Button: React.FC<ButtonProps> = ({
    onClick,
    title,
    variant = 'primary',
    loading = false,
    disabled = false,
    className,
    buttonColor,
    textStyle = 'text-natural-white',
    subtitle,
    subtitleTextStyle = 'text-grey-0',
    icon,
    iconSize = 20 // default icon size
}) => {
    const isPrimary = variant === 'primary'

    const defaultEnabled = isPrimary ? 'bg-primary-default text-natural-white' : 'bg-natural-black text-natural-white'

    const defaultDisabled = 'opacity-50 cursor-not-allowed'

    const enabledClass = buttonColor?.enabled || defaultEnabled
    const disabledClass = buttonColor?.disabled || `${defaultDisabled} ${enabledClass}`

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={clsx(
                'w-full h-12 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-base font-manrope font-semibold transition-colors',
                disabled || loading ? disabledClass : enabledClass,
                className
            )}>
            {loading ? (
                <svg
                    className="animate-spin h-5 w-5"
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
                <div className="flex flex-row items-center justify-center gap-2">
                    {icon && (
                        <span
                            className={clsx(textStyle, 'flex items-center justify-center')}
                            style={{ fontSize: iconSize }}>
                            {icon}
                        </span>
                    )}
                    <div className="flex flex-col items-center justify-center">
                        <span className={clsx('text-center w-full font-manrope', textStyle)}>{title}</span>
                        {subtitle && <span className={clsx('text-center w-full', subtitleTextStyle)}>{subtitle}</span>}
                    </div>
                </div>
            )}
        </button>
    )
}
