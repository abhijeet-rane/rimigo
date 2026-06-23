import React from 'react'
import SearchHeader from '@/components/common/SearchHeader'
import Typography from '@/components/shared/Typography'

interface SectionTypesErrorProps {
    isRimigoInternal?: boolean
}

const SectionTypesError: React.FC<SectionTypesErrorProps> = ({
    isRimigoInternal = false
}) => {
    return (
        <div className="min-h-screen bg-white">
            <SearchHeader
                pageName=""
                assistantConfig={{ enabled: false }}
                ctaConfig={{ enabled: false }}
                breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'my-3' }}
            />
            <div className="w-full max-w-[1380px] py-8 mx-auto px-4">
                <div className="text-center py-12">
                    <Typography
                        size="16"
                        weight="medium"
                        color="grey-1">
                        Failed to load section types. Please try again later.
                    </Typography>
                </div>
            </div>
        </div>
    )
}

export default SectionTypesError

