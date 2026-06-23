import React from 'react'

interface RimigoLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
    sm: { compass: 'w-3 h-3', text: 'h-2.5' },
    md: { compass: 'w-4 h-4', text: 'h-4' },
    lg: { compass: 'w-6 h-6 sm:w-6 sm:h-6', text: 'h-5 sm:h-5' },
    xl: { compass: 'w-8 h-8 sm:w-10 sm:h-10', text: 'h-8 sm:h-9' }
}

const RimigoLogo: React.FC<RimigoLogoProps> = ({ size = 'md' }) => {
    const s = sizeMap[size]
    return (
        <div className="flex items-center gap-0.5 shrink-0">
            <img src="/icons/compass.png" alt="" className={`${s.compass} object-contain mb-1`} />
            <img src="/icons/logo-transparent-rimigo-text.png" alt="Rimigo" className={`${s.text} w-auto object-contain`} />
        </div>
    )
}

export default RimigoLogo
