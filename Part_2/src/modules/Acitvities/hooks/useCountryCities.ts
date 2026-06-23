import { useQuery } from '@tanstack/react-query'
import { getCountryCities, CountryCitiesResponse } from '@/api/curation/locationPersonalizationAPI'
import { adaptActivitiesCitiesResponse } from '../adapters/activitiesCitiesAdapter'

interface UseCountryCitiesParams {
    countryId: string | null
}

interface UseCountryCitiesReturn {
    countryName: string
    countryId: string
    topCities: ReturnType<typeof adaptActivitiesCitiesResponse>['topCities']
    otherCities: ReturnType<typeof adaptActivitiesCitiesResponse>['otherCities']
    allCities: ReturnType<typeof adaptActivitiesCitiesResponse>['allCities']
    isLoading: boolean
    isError: boolean
    error: Error | null
}

/**
 * Hook to fetch cities for a country
 */
export const useCountryCities = ({ countryId }: UseCountryCitiesParams): UseCountryCitiesReturn => {
    // Fetch cities data
    const {
        data: citiesData,
        isLoading: isCitiesLoading,
        isError: isCitiesError,
        error: citiesError
    } = useQuery<CountryCitiesResponse>({
        queryKey: ['countryCities', countryId],
        queryFn: () => getCountryCities(countryId!),
        enabled: !!countryId,
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
        gcTime: 1000 * 60 * 60 * 24 // Keep in cache for 24 hours
    })

    // Transform the data
    const adaptedData = citiesData ? adaptActivitiesCitiesResponse(citiesData) : { topCities: [], otherCities: [], allCities: [] }

    return {
        countryName: citiesData?.data.country_name || '',
        countryId: citiesData?.data.country_id || '',
        topCities: adaptedData.topCities,
        otherCities: adaptedData.otherCities,
        allCities: adaptedData.allCities,
        isLoading: isCitiesLoading,
        isError: isCitiesError,
        error: citiesError as Error | null
    }
}
