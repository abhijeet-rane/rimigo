import React from 'react'
import { POTRAIT_IMAGES } from '@/modules/Premium/constants'

interface ContactMeSectionProps {
    description: string
}

export const ContactMeSection: React.FC<ContactMeSectionProps> = ({ description }) => {
    return (
        <div className="flex justify-center items-center gap-4 text-center bg-white rounded-3xl p-6 max-w-135 shadow-md">
            <img
                src={POTRAIT_IMAGES.PORTRAIT_3}
                alt="portrait img"
                className="w-16 h-16 rounded-full object-cover"
            />
            <div className="text-start">
                <p className="font-manrope font-medium text-[16px] -tracking-[4%] text-grey-0">
                    {description}
                </p>
            </div>
        </div>
    )
}
