// src/pages/Landing/Components/DiscoverSection.tsx
// import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import React from 'react'

interface DiscoverSectionProps {
    sectionId: string
    title?: string
    description?: string
    onTitleClick?: () => void
    showTitleAndDescription?: boolean
    children: React.ReactNode
}

export const DiscoverSection: React.FC<DiscoverSectionProps> = ({
    sectionId,
    // title = WEBSITE_CONFIG.WATCHALONG_DESCRIPTIVE_TITLE,
    // onTitleClick,
    // showTitleAndDescription = false,
    children
}) => (
    <section
        id={sectionId}
        className="w-full space-y-2 ">
        {/* {showTitleAndDescription && (
            <div className="w-full max-w-[90%] md:max-w-[95%] lg:max-w-[90%] max-md:px-4 md:pb-3 md:pt-2 ">
                <h3
                    className="mb-1 font-red-hat-display transition-colors"
                    style={{ fontSize: '24px', lineHeight: '100%', fontWeight: 550 }}
                    onClick={onTitleClick}>
                    {title} <span></span>
                </h3>
                <p
                    className="text-base md:text-lg font-manrope text-grey-2 mb-4"
                    style={{ fontSize: '16px', lineHeight: '150%', fontWeight: 400 }}>
                    Get inspired from handpicked videos from travel experts
                </p>
            </div>
        )} */}
        {children}
    </section>
)