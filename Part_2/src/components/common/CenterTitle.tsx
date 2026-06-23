import React from 'react'

interface CenterTitleProps {
    title: string
    className?: string 
}

const CenterTitle: React.FC<CenterTitleProps> = ({ title , className}) => {
    return (
        <div className={`max-md:hidden md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:flex md:items-center md:justify-center md:pointer-events-none md:px-4 md:max-w-[50%] ${className || ''}`}>
            <p className="tracking-[-0.02em] font-semibold font-red-hat-display text-[20px] md:text-[22px] text-center text-grey-0-80 truncate">
                {title}
            </p>
        </div>
    )
}

export default CenterTitle
