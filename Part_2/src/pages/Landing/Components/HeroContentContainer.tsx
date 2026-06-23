import React, { useMemo } from 'react'

// import type { ATAFeature } from '@/api/ataAPI/types/featuresTypes'
import type { ExperienceWithShort } from '@/modules/WatchAlong/api/watchAlongApi'

import { HeroHeading } from './HeroHeading'
import { TilesGrid } from './TilesGrid'
import { useImageShowCase } from '../hooks/useImageShowCase'
import { mapShortsToThumbnails } from '../hooks/useWatchAlongShorts'
import CustomShimmer from '@/components/shared/Shimmer'
import { NotLiveCountryMessage } from './NotLiveCountryMessage'
import { useCountryLiveStatus } from '@/hooks/useCountryLiveStatus'
import { Traveler } from '@/api/travelerAPI/travelerAPI'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useOptionalTravelerTrips } from '../context/travelerTripsContext'

// interface AgentThreadData {
//     id: string | null
//     entity_type: string | null
// }

interface ContentContainerProps {
    onTileClick: (route: string) => void
    // getThreadData: (agentId: string, entityId: string | null) => AgentThreadData | null
    // heroFeatures: ATAFeature[]
    // isLoading: boolean
    countryId: string | null | undefined
    watchAlongShorts: ExperienceWithShort[]
    isLoadingWatchAlong: boolean
    travelerDetails?: Traveler | undefined 
}

export const HeroContentContainer: React.FC<ContentContainerProps> = ({
    onTileClick,
    // isLoading,
    countryId,
    watchAlongShorts,
    isLoadingWatchAlong,
    travelerDetails
}) => {
    // Fetch all countries to check if selected country is live
    const { isAuthenticated } = useAuth()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    
    const isTripPlanned = Boolean(
        activeTrip?.final_destination_countries && 
        activeTrip.final_destination_countries.length > 0
    )
    
    const shouldUsePrioritized = isAuthenticated && isTripPlanned

    // ✅ Pass shouldUsePrioritized to the hook
    const { isCountryLive, selectedCountry , isLoading: isLoadingCountryStatus } = useCountryLiveStatus({ 
        countryId: countryId,
        shouldUsePrioritized 
    })

    // Fetch hero card images from APIs
    const {
        images: showCaseImages,
        totalExperiences,
        isLoading: isLoadingImages
    } = useImageShowCase({
        countryId,
        enabled: !!countryId && isCountryLive
    })

    const watchAlongThumbnails = useMemo(() => mapShortsToThumbnails(watchAlongShorts, 3), [watchAlongShorts])

    const mergedHeroImages = useMemo(() => {
        return {
            ...showCaseImages,
            destinations: watchAlongThumbnails
        }
    }, [showCaseImages, watchAlongThumbnails])

    const tilesLoading = isLoadingImages || isLoadingWatchAlong
    const containerLoading = isLoadingImages || isLoadingCountryStatus

    if (containerLoading || !countryId) {
        return (
            <div
                className="w-full md:max-w-[95%] lg:max-w-[90%] md:rounded-[20px] border-0 md:border border-grey-4 shadow-none md:shadow-[0px_20px_60px_rgba(0,0,0,0.05)] bg-white"
                style={{
                    backdropFilter: 'blur(4px)'
                }}>
                {/* HeroHeading shimmer */}
                <div className="my-[30px] pl-8">
                    <CustomShimmer
                        height={25}
                        radius={8}
                        className="w-3/4 mx-auto"
                    />
                </div>
                {/* TilesGrid shimmer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-8">
                    {[1, 2, 3].map((i) => (
                        <CustomShimmer
                            key={i}
                            height={220}
                            radius={16}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Show not live message if country is not live
    if (!isLoadingCountryStatus && isCountryLive === false) {
        return <NotLiveCountryMessage countryName={selectedCountry?.country_name} travelerDetails={travelerDetails}/>
    }

    // Show normal hero content for live countries
    return (
        <div
            className="w-full md:max-w-[95%] lg:max-w-[90%] md:rounded-[20px] border-0 md:border border-grey-4 shadow-none md:shadow-[0px_20px_60px_rgba(0,0,0,0.05)] bg-white"
            style={{
                backdropFilter: 'blur(4px)'
            }}>
            <HeroHeading />
            <TilesGrid
                onTileClick={onTileClick}
                isLoading={tilesLoading}
                heroCardImages={mergedHeroImages}
                totalExperiences={totalExperiences}
            />
            {/* <SearchBar /> */}
        </div>
    )
}