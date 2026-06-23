import React from 'react'
import { TrendingUp } from 'lucide-react'
import { SearchDestinationCard } from './SearchDestinationCard'
import Typography from '@/components/shared/Typography'
import { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import CustomShimmer from '@/components/shared/Shimmer'
import { DividerLine } from '@/components/DividerLine'

interface PopularDestinationProps {
    title: string
    destinations: SearchDestinationCardData[]
    isLoading: boolean
    error: Error | null
    onSelectDestination: (destination: SearchDestinationCardData) => void
    selectedIds?: Set<string>
}

export const PopularDestination: React.FC<PopularDestinationProps> = ({ destinations, isLoading, title ,error, onSelectDestination, selectedIds }) => {
    return (
        <div className="flex flex-col gap-4 w-full mt-[32px]">
            {/* Heading */}
            <div className="flex items-center gap-1">
                <Typography
                    family="redhat"
                    weight="bold"
                    size="14"
                    color="grey-2"
                    textAlign="left">
                    {title}
                </Typography>
                {title === 'Popular international countries' && (
                    <TrendingUp size={16} className="text-grey-2" />
                )}
                {title === 'Coming soon' && (
                    <DividerLine direction='right'  />
                )}
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    {' '}
                    {Array.from({ length: 4 }).map((_, index) => (
                        <CustomShimmer
                            key={index}
                            height={88}
                        />
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && (
                <Typography
                    family="manrope"
                    weight="medium"
                    size="14"
                    color="secondary-red"
                    textAlign="left">
                    Failed to load destinations
                </Typography>
            )}

            {/* Data list */}
            <div className="flex flex-col gap-3">
                {destinations?.map((item) => (
                    <SearchDestinationCard
                        key={item.id}
                        imageSource={{ uri: item.imageUrl }}
                        title={item.title}
                        onPress={() => onSelectDestination(item)}
                        isSelected={selectedIds?.has(item.id)}
                    />
                ))}
            </div>
        </div>
    )
}
