import { getLiveCountries } from "@/api/curation/locationPersonalizationAPI"
import { HOURS_24 } from "@/constants/commons/tanstackConstants"
import { useQuery } from "@tanstack/react-query"

export const useLiveCountriesAPI = ({enabled = false}: {enabled?: boolean}) => {
    const { data, isLoading, isError } = useQuery<any[]>({
        queryKey: ['live-countries'],
        queryFn: getLiveCountries,
        staleTime: HOURS_24,
        gcTime: HOURS_24,   
        enabled,
    })

    return {
        data,
        isLoading,
        isError,
    }
}