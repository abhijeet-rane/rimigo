import React from 'react'
import CustomShimmer from '@/components/shared/Shimmer'

interface ExperiencesListShimmerProps {
    count?: number
}

const ExperiencesListShimmer: React.FC<ExperiencesListShimmerProps> = ({ count = 6 }) => {
    return (
        <div className="container mx-auto py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-15 items-start">
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl overflow-hidden border border-feature-card-border bg-natural-white">
                        {/* Image Shimmer */}
                        <CustomShimmer
                            height={240}
                            radius={0}
                            className="w-full"
                        />
                        {/* Content Shimmer */}
                        <div className="p-4 space-y-3">
                            {/* Title Shimmer */}
                            <CustomShimmer
                                height={20}
                                radius={4}
                                className="w-3/4"
                            />
                            {/* Price Shimmer */}
                            <CustomShimmer
                                height={16}
                                radius={4}
                                className="w-1/3"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ExperiencesListShimmer
