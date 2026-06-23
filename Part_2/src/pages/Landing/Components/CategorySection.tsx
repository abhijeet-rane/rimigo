import React from 'react'
import { NeedCard } from './NeedCard'
import type { ATAFeature } from '@/api/ataAPI/types/featuresTypes'

interface AgentThreadData {
    id: string | null
    entity_type: string | null
}

interface CategorySectionProps {
    title: string
    description: string
    listings: ATAFeature[]
    background: 'white' | 'grey-5'
    onTileClick?: (route: string) => void
    sectionId?: string
    getThreadData: (agentId: string, entityId: string | null) => AgentThreadData | null
    onTitleClick?: () => void
}

export const CategorySection: React.FC<CategorySectionProps> = ({
    title,
    description,
    listings,
    background,
    onTileClick,
    sectionId,
    getThreadData,
    onTitleClick
}) => {
    if (listings.length === 0) return null

    const bg = background === 'white' ? 'bg-white' : 'bg-grey-5'

    return (
        <section
            id={sectionId}
            className="w-full">
            {/* FULL-WIDTH BACKGROUND */}
            <div className={`${bg} w-full`}>
                {/* WRAPPER WITH PADDING TO MATCH PARENT STRUCTURE */}
                <div className={`px-6 md:px-0 lg:px-0 pt-4 pb-10`}>
                    {/* CONTENT MATCHING HEADER WIDTH */}
                    <div className="mx-auto w-full max-w-full md:max-w-[95%] lg:max-w-[90%] pt-8">
                        <h3
                            className="mb-1 font-red-hat-display  transition-colors "
                            style={{ fontSize: '24px', lineHeight: '100%', fontWeight: 550 }}
                            onClick={onTitleClick}>
                            {title} <span></span>
                        </h3>
                        <p
                            className="text-base md:text-lg font-manrope text-grey-2 mb-4"
                            style={{ fontSize: '16px', lineHeight: '150%', fontWeight: 400 }}>
                            {description}
                        </p>

                        <div
                            className="grid gap-4 pt-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                            {listings.map((listing) => (
                                <NeedCard
                                    key={listing.id}
                                    feature={listing}
                                    onTileClick={onTileClick}
                                    getThreadData={getThreadData}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
