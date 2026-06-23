import React from 'react'
import clsx from 'clsx'

interface AddSlotLabelProps {
    text: string
    color?: string
    className?: string
    isRequired?: boolean
}

const AddSlotLabel: React.FC<AddSlotLabelProps> = ({ text, color = 'text-grey-0', className, isRequired = false }) => {
    return (
        <span className={clsx('text-sm font-manrope font-medium', color, className)}>
            {text}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </span>
    )
}

export default AddSlotLabel
