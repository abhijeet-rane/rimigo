import React, { useState, InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputBoxProps extends InputHTMLAttributes<HTMLInputElement> {
    placeholder: string
}

export const InputBox: React.FC<InputBoxProps> = ({ placeholder, className, ...props }) => {
    const [, setIsFocused] = useState(false)

    return (
        <input
            placeholder={placeholder}
            {...props}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={clsx(
                'w-full rounded-xl bg-white font-medium outline-none p-[16px] text-size-16 transition-all text-grey-0 border-[1px] border-grey-4 input-placeholder',
                className
            )}
            style={{
                fontFamily: "'Manrope', sans-serif",
                color: 'var(--color-grey-0)',
                lineHeight: '100%',
                letterSpacing: '-1%'
            }}
        />
    )
}
