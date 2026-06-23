import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getCountryByCityId, getCountryByName } from '../../Apis/citiesAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

/**
 * Hook to fetch country ID from city and append it to URL query params
 * @param cityId - The city ID from query params
 * @returns The country ID if available
 */
export const useCountryIdFromCity = (cityId: string | null) => {
    const [searchParams, setSearchParams] = useSearchParams()

    // First, get country name from cityId
    const { data: countryDataFromCity } = useQuery({
        queryKey: ['countryByCityId', cityId],
        queryFn: async () => {
            if (!cityId) return null
            return await getCountryByCityId(cityId)
        },
        enabled: !!cityId,
        staleTime: HOURS_24,
        refetchOnWindowFocus: false
    })

    // Get country ID by name using the country name from city
    const { data: countryId } = useQuery({
        queryKey: ['countryByName', countryDataFromCity?.name],
        queryFn: async () => {
            if (!countryDataFromCity?.name) return null
            return await getCountryByName(countryDataFromCity.name)
        },
        enabled: !!countryDataFromCity?.name,
        staleTime: HOURS_24,
        refetchOnWindowFocus: false
    })

    // Append country_id to URL query params when available
    useEffect(() => {
        if (countryId) {
            const currentParams = new URLSearchParams(searchParams.toString())
            if (currentParams.get('country_id') !== countryId) {
                currentParams.set('country_id', countryId)
                setSearchParams(currentParams, { replace: true })
            }
        }
    }, [countryId, searchParams, setSearchParams])

    return countryId
}
