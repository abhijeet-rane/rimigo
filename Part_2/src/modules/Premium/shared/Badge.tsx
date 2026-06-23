import React from 'react'

interface BadgeProps {
    text: string
    className?: string
}

const Badge: React.FC<BadgeProps> = ({
    text,
    className = 'bg-[rgba(112,17,246,0.16)] rounded-md px-3 py-1.5'
}) => {
    return (
        <span
            className={`flex items-center text-[13px] font-extrabold font-manrope text-primary-default ${className}`}
        >
            {text}
        </span>
    )
}

export default Badge
