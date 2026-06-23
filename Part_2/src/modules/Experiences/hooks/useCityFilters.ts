import { useState, useCallback, useMemo } from 'react'
import { CityFilter } from '../types/city'

export const useCityFilters = (initialCities: CityFilter[] = []) => {
    const [cities, setCities] = useState<CityFilter[]>(initialCities)

    const selectedCityId = useMemo(() => {
        const selected = cities.find((city) => city.isSelected)
        return selected?.id || 'all'
    }, [cities])

    const handleCitySelect = useCallback((cityId: string) => {
        setCities((prevCities) =>
            prevCities.map((city) => ({
                ...city,
                isSelected: city.id === cityId
            }))
        )
    }, [])

    const updateCities = useCallback((newCities: CityFilter[]) => {
        setCities(newCities)
    }, [])

    return {
        cities,
        selectedCityId,
        handleCitySelect,
        updateCities
    }
}
