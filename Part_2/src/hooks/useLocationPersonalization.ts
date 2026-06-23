import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLiveCountries } from '@/api/curation/locationPersonalizationAPI' 
import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI' 
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface GroupedDestinations {
    name: string
    countries: LocationPersonalizationResponse[]
}

export const useLocationPersonalization = () => {
    const query = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['liveCountries'],
        queryFn: getLiveCountries,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        refetchOnWindowFocus: false,
    })

    const groupedDestinations: GroupedDestinations[] = useMemo(() => {
        if (!query.data || query.data.length === 0) return []

        const groups: Record<
            string,
            { name: string; countries: LocationPersonalizationResponse[] }
        > = {}

        query.data.forEach((country) => {
            const regionId = country.region?.id
            const regionName = country.region?.name || 'Other'

            if (!regionId) return

            if (!groups[regionId]) {
                groups[regionId] = {
                    name: regionName,
                    countries: []
                }
            }

            groups[regionId].countries.push(country)
        })

        return Object.values(groups)
    }, [query.data])

    return {
        countries: query.data ?? [],
        groupedDestinations,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}
