import { LocationPersonalizationCityResponse } from '../../Types/locationPersonalizationCityResponse'
import { useQuery } from '@tanstack/react-query'
import { getLocationPersonalizationCity } from '../api/DealsDataApi'

export const useLocationPersonalizationCity = (cityId?: string) => {
    return useQuery<LocationPersonalizationCityResponse>({
        queryKey: ['locationPersonalizationCity', cityId],
        queryFn: async () => {
            if (!cityId) throw new Error('cityId is required')
            const response = await getLocationPersonalizationCity(cityId)
            return response
        },
        enabled: !!cityId,
        staleTime: 5 * 60 * 1000,
        retry: 2
    })
}
