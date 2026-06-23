import { useQuery } from '@tanstack/react-query'
import { getCountryBasicInfo, CountryBasicInfoResponse } from '@/api/curation/locationPersonalizationAPI'
import { adaptCountryBasicInfoToHeroData } from '../adapters/activityLocationInfoAdapter'
import { CountryHeroData } from '../components/ActivitiesCountryHero'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseCountryBasicInfoParams {
    countryId: string | null
    currentMonth: string
}

interface UseCountryBasicInfoReturn {
    data: CountryHeroData | null
    isLoading: boolean
    isError: boolean
    error: Error | null
}

export const useCountryBasicInfo = ({ countryId, currentMonth }: UseCountryBasicInfoParams): UseCountryBasicInfoReturn => {
    const {
        data: apiData,
        isLoading,
        isError,
        error
    } = useQuery<CountryBasicInfoResponse>({
        queryKey: ['countryBasicInfo', countryId],
        queryFn: () => getCountryBasicInfo(countryId!),
        enabled: !!countryId,
        staleTime: HOURS_24, // Cache for 1 hour
        gcTime: HOURS_24, // Keep in cache for 24 hours
        refetchOnWindowFocus: false
    })

    // Transform the API data to CountryHeroData format
    const adaptedData = apiData ? adaptCountryBasicInfoToHeroData(apiData, currentMonth) : null

    return {
        data: adaptedData,
        isLoading,
        isError,
        error: error as Error | null
    }
}
