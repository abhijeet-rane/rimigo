import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { contentCollectionApi } from '../api/contentCollectionApi'

interface CreatorInfoBoxProps {
    publisherId: string | null
}

const CreatorInfoBox: React.FC<CreatorInfoBoxProps> = ({ publisherId }) => {
    // Fetch trip source information if publisher ID exists
    const {
        data: tripSourceResponse,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['trip-source-by-id', publisherId],
        queryFn: async () => {
            if (!publisherId) return null
            const response = await contentCollectionApi.getTripSourceById(publisherId)
            return response.data || null
        },
        enabled: !!publisherId,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })

    const tripSource = tripSourceResponse || null

    // Don't render if no publisher ID, loading, error, or no trip source
    if (!publisherId || isLoading || isError || !tripSource) {
        return null
    }
    return (
        <div className="flex items-center gap-1 px-2 py-2 bg-white border border-grey-4 rounded-lg w-fit">
            {/* Creator Image */}
            {tripSource.media?.thumbnail_url ? (
                <img
                    src={tripSource.media.thumbnail_url}
                    alt={tripSource.entity_name || tripSource.name}
                    className="w-8 h-8 rounded-full object-cover"
                />
            ) : (
                <div className="w-8 h-8 rounded-full bg-grey-4 flex items-center justify-center border border-grey-3">
                    <Typography size="12" weight="semibold" color="grey-2">
                        {(tripSource.entity_name || tripSource.name).charAt(0).toUpperCase()}
                    </Typography>
                </div>
            )}

            {/* Creator Name/Handle */}
            <div className="flex flex-col">
                {tripSource.media?.instagram_profile_url ? (
                    <a
                        href={tripSource.media.instagram_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-grey-0 font-manrope font-semibold text-sm hover:text-primary-default transition-colors">
                        @{tripSource.name}
                    </a>
                ) : (
                    <Typography size="14" weight="semibold" color="grey-0" family="manrope">
                        @{tripSource.name}
                    </Typography>
                )}
                {tripSource.entity_name && tripSource.entity_name !== tripSource.name && (
                    <Typography size="12" weight="medium" color="grey-2" family="manrope">
                        {tripSource.entity_name}
                    </Typography>
                )}
            </div>
        </div>
    )
}

export default CreatorInfoBox

