import { Wand } from 'lucide-react'
import React from 'react'

interface WhyThisSectionProps {
    reason: string
}

const WhyThisSection: React.FC<WhyThisSectionProps> = ({ reason }) => {
    return (
        <div className="self-stretch rounded-[8px] bg-primary-default-80 flex items-center py-2 px-3 gap-2 text-[11px] text-primary-default">
            <Wand className="w-4 relative max-h-full text-primary-default" />
            <div className="flex-1 flex flex-col items-start justify-center">
                <b className="self-stretch relative leading-4 font-red-hat-display text-primary-default font-bold text-[11px]">WHY THIS?</b>
                <div className="self-stretch relative text-[12px] leading-4 font-medium font-manrope text-primary-default">{reason}</div>
            </div>
        </div>
    )
}

export default WhyThisSection
