import React from 'react'
import SearchHeader from '@/components/common/SearchHeader'

const CollectionNotFound: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <SearchHeader
                pageName="Activities"
                assistantConfig={{ enabled: false }}
                ctaConfig={{ enabled: false }}
            />
            <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                <div className="text-center text-red-500">Collection not found</div>
            </div>
        </div>
    )
}

export default CollectionNotFound

