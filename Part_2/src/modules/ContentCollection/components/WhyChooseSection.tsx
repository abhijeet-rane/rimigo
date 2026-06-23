import React from 'react'
import { Building, FileText, GemIcon } from 'lucide-react'

const WhyChooseSection: React.FC = () => {
    const features = [
        {
            icon: GemIcon,
            title: 'Offbeat',
            subtitle: 'activities'
        },
        {
            icon: Building,
            title: 'Recommended',
            subtitle: 'stays'
        },
        {
            icon: FileText,
            title: 'Complete',
            subtitle: 'itinerary'
        }
    ]

    return (
        <div className="w-full mt-6 md:mt-2 relative flex px-5 flex-col items-center justify-center md:flex-row gap-6 text-left text-2xl text-primary-default font-caveat">
            {/* content */}
            <div className="flex items-center justify-center gap-3  md:gap-12 text-xl text-grey-0 font-red-hat-display">
                {features.map((feature, index) => {
                    const IconComponent = feature.icon
                    const isLast = index === features.length - 1
                    return (
                        <div
                            key={index}
                            className={`rounded-[14px] flex flex-col ${isLast ? 'items-center justify-center' : 'items-center'} py-2 px-3 gap-2`}>
                            {/* Icon with background circle */}
                            <div className="relative w-[27px] h-[24px] flex items-center justify-center">
                                <IconComponent
                                    className="relative w-[27px] h-[24px] text-[#7011F6]"
                                    strokeWidth={1.5}
                                    fill="none"
                                />
                            </div>
                            {/* Text */}
                            <div className="flex flex-col items-center ">
                                <div className="relative text-[16px] tracking-[-0.04em] font-bold">
                                    {feature.title}
                                </div>
                                <div
                                    className={`relative text-base tracking-[-0.04em] font-semibold font-manrope text-grey-1`}>
                                    {feature.subtitle}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default WhyChooseSection
