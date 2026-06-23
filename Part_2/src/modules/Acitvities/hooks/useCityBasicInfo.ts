import { useQuery } from '@tanstack/react-query'
import { getCityBasicInfo, CityBasicInfoResponse } from '@/api/curation/locationPersonalizationAPI'
import { adaptCityBasicInfoToHeroData } from '../adapters/activityLocationInfoAdapter'
import { CountryHeroData } from '../components/ActivitiesCountryHero'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseCityBasicInfoParams {
    cityId: string | null
    currentMonth: string
}

interface UseCityBasicInfoReturn {
    data: CountryHeroData | null
    isLoading: boolean
    isError: boolean
    error: Error | null
}

export const useCityBasicInfo = ({ cityId, currentMonth }: UseCityBasicInfoParams): UseCityBasicInfoReturn => {
    const {
        data: apiData,
        isLoading,
        isError,
        error
    } = useQuery<CityBasicInfoResponse>({
        queryKey: ['cityBasicInfo', cityId],
        queryFn: () => getCityBasicInfo(cityId!),
        enabled: !!cityId,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        refetchOnWindowFocus: false
    })

    // Transform the API data to CountryHeroData format
    const adaptedData = apiData ? adaptCityBasicInfoToHeroData(apiData, currentMonth) : null

    return {
        data: adaptedData,
        isLoading,
        isError,
        error: error as Error | null
    }
}
