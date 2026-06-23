import { useMemo } from "react"
import { LocationResponse } from "@/modules/Onboarding/api"
import { LocationPersonalizationResponse } from "@/api/curation/locationPersonalizationAPI" 
import { useCountries } from "./useCountries"

type CountryLiveStatusOptions<T extends boolean> = {
    countryId?: string | null
    shouldUsePrioritized: T
}

type CountryLiveStatusReturn<T extends boolean> = {
    selectedCountry: T extends true ? LocationResponse | null : LocationPersonalizationResponse | null
    isCountryLive: boolean
    isLoading: boolean
    isError: boolean
}

export const useCountryLiveStatus = <T extends boolean>({
    countryId,
    shouldUsePrioritized
}: CountryLiveStatusOptions<T>): CountryLiveStatusReturn<T> => {
    const result = shouldUsePrioritized 
        ? useCountries({ shouldUsePrioritized: true })
        : useCountries({ shouldUsePrioritized: false })
    
    const { allCountries, isLoading, isError } = result

    const selectedCountry = useMemo(() => {
        if (!countryId || !allCountries) return null
        return allCountries.find(country => country.country_id === countryId) ?? null
    }, [countryId, allCountries])

    const isCountryLive = useMemo(() => {
        if (!selectedCountry) return false
        // If using getLiveCountries, all countries are live by definition
        if (!shouldUsePrioritized) return true
        // If using getPrioritizedCountries, check is_live property
        return (selectedCountry as LocationResponse).is_live === true
    }, [selectedCountry, shouldUsePrioritized])

    return {
        selectedCountry,
        isCountryLive,
        isLoading,
        isError
    } as CountryLiveStatusReturn<T>
}