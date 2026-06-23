import Typography from '@/components/shared/Typography'
import React from 'react'

interface ActionButtonProps {
    title: string
    bgColor: string // e.g. "bg-blue-500"
    textColor: string // e.g. "text-white"
    onClick: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ title, bgColor, textColor, onClick }) => {
    return (
        <button
            className={`px-4 py-3 cursor-pointer  rounded-[8px] ${bgColor} ${textColor} `}
            onClick={onClick}>
            <Typography
                size="12"
                family="redhat"
                color={`${textColor}`}
                weight="bold">
                {title}
            </Typography>
        </button>
    )
}

export default ActionButton
