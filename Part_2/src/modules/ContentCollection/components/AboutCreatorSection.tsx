import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { contentCollectionApi } from '../api/contentCollectionApi'
import CustomShimmer from '@/components/shared/Shimmer'
import Divider from '@/components/shared/Divider/Divider'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { COMPASS_LOGO_PURPLE_TRANSPARENT_BG } from '@/constants/rimigo'

export interface CreatorData {
    profileImageUrl?: string
    name?: string
    handle?: string
    instagramFollowers?: string
    countriesVisited?: number
}

interface AboutCreatorSectionProps {
    creatorData?: CreatorData | null
    publisherId?: string | null
    publisherType?: string | null
}

const AboutCreatorSection: React.FC<AboutCreatorSectionProps> = ({ creatorData, publisherId, publisherType }) => {
    const isInternalUser = publisherType === 'internal_user'

    // Fetch trip source information if publisher ID exists and NOT internal_user
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
        enabled: !!publisherId && !isInternalUser,
        staleTime: HOURS_24,
        refetchOnWindowFocus: false
    })

    const tripSource = tripSourceResponse || null    
    
    const formatFollowers = (num?: string | number) => {
    if (num === undefined || num === null || num === "") return "";

    const value = typeof num === "number" ? num : Number(num);

    if (isNaN(value)) return "";

    if (value >= 1_000_000_000) {
        return (value / 1_000_000_000)
        .toFixed(1)
        .replace(/\.0$/, "") + "B";
    }

    if (value >= 1_000_000) {
        return (value / 1_000_000)
        .toFixed(1)
        .replace(/\.0$/, "") + "M";
    }

    if (value >= 1_000) {
        return (value / 1_000)
        .toFixed(1)
        .replace(/\.0$/, "") + "K";
    }

    return value.toString();
    };


    // Use Rimigo branding for internal_user, trip source for creators, fallback to creatorData
    const displayData = isInternalUser
        ? {
              profileImageUrl: COMPASS_LOGO_PURPLE_TRANSPARENT_BG,
              name: 'Rimigo',
              entityName: 'Travel Expert',
              instagramProfileUrl: undefined,
              follower_count: undefined,
              total_trips: undefined,
              countries_visited: undefined,
          }
        : tripSource
        ? {
              profileImageUrl: tripSource.media?.thumbnail_url,
              name: tripSource.name,
              entityName: tripSource.entity_name,
              instagramProfileUrl: tripSource.media?.instagram_profile_url,
              follower_count: tripSource.metadata?.follower_count,
              total_trips: tripSource.metadata?.total_trips,
              countries_visited: tripSource.metadata?.countries_visited
          }
        : creatorData
            ? {
                  profileImageUrl: creatorData.profileImageUrl,
                  name: creatorData.name,
                  entityName: undefined,
                  instagramProfileUrl: undefined,
                  follower_count: creatorData.instagramFollowers,
                  total_trips: creatorData.countriesVisited
              }
            : null

    // Show loading state
    if (publisherId && isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-grey-5 border border-grey-4">
                <div className="text-base font-semibold text-grey-0 font-red-hat-display tracking-[-0.04em]">
                    ABOUT US
                </div>
                <CustomShimmer height={148} radius={999} />
                <CustomShimmer height={20} />
            </div>
        )
    }

    // Don't render if no data, error, or no publisher ID and no creator data
    if (!publisherId && !creatorData) {
        return null
    }

    if (publisherId && !isInternalUser && (isError || !tripSource) && !creatorData) {
        return null
    }

    if (!displayData) {
        return null
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-grey-5 border border-grey-4">
            {/* Title */}
            <div className="text-xl font-extrabold text-grey-0-80 font-red-hat-display tracking-[-0.04em] mb-3 md:mb-8">
                ABOUT US
            </div>

            {/* Profile Image */}
            {displayData.profileImageUrl ? (
                <img
                    src={displayData.profileImageUrl}
                    alt={displayData.name || 'Creator'}
                    className="w-[148px] h-[148px] rounded-full object-cover"
                />
            ) : (
                <div className="w-[148px] h-[148px] rounded-full bg-grey-4 flex items-center justify-center border border-grey-3">
                    {displayData.name && (
                        <Typography size="48" weight="semibold" color="grey-2">
                            {displayData.name.charAt(0).toUpperCase()}
                        </Typography>
                    )}
                </div>
            )}

            {/* Name and Handle */}
            <div className="w-[129px] flex flex-col items-center gap-1">
                {displayData.name && (
                    <div className="flex flex-col items-center gap-1">
                        {displayData.entityName && displayData.entityName !== displayData.name && (
                            <Typography size="16" weight="semibold" color="grey-0" family="manrope" className="text-center tracking-[-1px]">
                                {displayData.entityName}
                            </Typography>
                        )}
                        {displayData.instagramProfileUrl ? (
                            <a
                                href={displayData.instagramProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-semibold text-grey-1 font-red-hat-display tracking-[-0.5px] text-center hover:text-primary-default transition-colors">
                                @{displayData.name}
                            </a>
                        ) : (
                            <div className="text-base font-semibold text-grey-1 font-red-hat-display tracking-[-0.5px] text-center">
                                @{displayData.name}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Divider/>

            {/* Stats - Only show if available from creatorData (not from trip source) */}
            {(displayData.follower_count || displayData.total_trips !== undefined) && (
                <div className="flex items-center gap-13 md:gap-6 mt-2">
                    {displayData.follower_count && (
                        <div className="flex flex-col items-center">
                            <div className="text-[26px] font-bold text-grey-0-80 font-red-hat-display">
                                {formatFollowers(displayData?.follower_count)}
                            </div>
                            <div className="text-base md:text-[14px] font-semibold text-grey-2 font-manrope">IG followers</div>
                        </div>
                    )} 
                    {(displayData?.countries_visited !== undefined || displayData?.total_trips !== undefined) && (
                        <div className="flex flex-col items-center">
                            <div className="text-[26px] font-bold text-grey-0-80 font-red-hat-display">
                            {displayData.countries_visited ?? displayData.total_trips}
                            </div>

                            <div className="text-base md:text-[14px] font-semibold text-grey-2 font-manrope">
                            {displayData.countries_visited !== undefined
                                ? 'Countries Visited'
                                : 'Total Trips'}
                            </div>
                    </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default AboutCreatorSection
