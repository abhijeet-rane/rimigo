import { useQuery } from '@tanstack/react-query'
import { getPrioritizedCountries, LocationResponse } from '@/modules/Onboarding/api'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getLiveCountries, LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'

export type CountryData = LocationResponse | LocationPersonalizationResponse

// 1: When shouldUsePrioritized is literal true
export function useCountries(options: { 
    shouldUsePrioritized: true 
}): {
    allCountries: LocationResponse[]
    liveCountries: LocationResponse[]
    comingSoonCountries: LocationResponse[]
    isLoading: boolean
    isError: boolean
    shouldUsePrioritized: true
}

// 2: When shouldUsePrioritized is literal false
export function useCountries(options: { 
    shouldUsePrioritized: false 
}): {
    allCountries: LocationPersonalizationResponse[]
    liveCountries: LocationPersonalizationResponse[]
    comingSoonCountries: LocationPersonalizationResponse[]
    isLoading: boolean
    isError: boolean
    shouldUsePrioritized: false
}

// 3: When shouldUsePrioritized is a boolean (dynamic)
export function useCountries(options: { 
    shouldUsePrioritized: boolean 
}): {
    allCountries: CountryData[]
    liveCountries: CountryData[]
    comingSoonCountries: CountryData[]
    isLoading: boolean
    isError: boolean
    shouldUsePrioritized: boolean
}

// Implementation
export function useCountries({
    shouldUsePrioritized
}: { shouldUsePrioritized: boolean }) {
    
    const { 
        data: prioritizedCountries, 
        isLoading: isLoadingPrioritized,
        isError: isErrorPrioritized 
    } = useQuery<LocationResponse[]>({
        queryKey: ['prioritizedCountries'],
        queryFn: getPrioritizedCountries,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        enabled: shouldUsePrioritized
    })
    
    const { 
        data: liveCountries, 
        isLoading: isLoadingLive,
        isError: isErrorLive 
    } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['liveCountries'],
        queryFn: getLiveCountries,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        enabled: !shouldUsePrioritized
    })
    
    const isLoading = shouldUsePrioritized ? isLoadingPrioritized : isLoadingLive
    const isError = shouldUsePrioritized ? isErrorPrioritized : isErrorLive
    
    if (shouldUsePrioritized) {
        const allCountries = prioritizedCountries || []
        const filteredLiveCountries = allCountries.filter(c => c.is_live === true)
        const filteredComingSoonCountries = allCountries.filter(c => c.is_live !== true)
        
        return {
            allCountries,
            liveCountries: filteredLiveCountries,
            comingSoonCountries: filteredComingSoonCountries,
            isLoading,
            isError,
            shouldUsePrioritized: true as const
        }
    } else {
        const allCountries = liveCountries || []
        
        return {
            allCountries,
            liveCountries: allCountries,
            comingSoonCountries: [] as LocationPersonalizationResponse[],
            isLoading,
            isError,
            shouldUsePrioritized: false as const
        }
    }
}