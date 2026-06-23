import { useState, useEffect } from 'react'
import CustomShimmer from '@/components/shared/Shimmer'
import { Check, ChevronDown } from 'lucide-react'
import { CitiesApiResponse, CityApiResponse } from '../../types/city'

interface ExperiencesCityFilterProps {
    onCitySelect: (cityIds: string[], cityNames: string[]) => void
    selectedCities: string[]
    citiesData: CitiesApiResponse | undefined
    isLoadingCities: boolean

    // city dropdown props
    isCityDropdownOpen: boolean
    setIsCityDropdownOpen: (isCityDropdownOpen: boolean) => void
    cityDropdownRef: React.RefObject<HTMLDivElement | null>
}

export function ExperiencesCityFilter({
    onCitySelect,
    selectedCities,
    citiesData,
    isLoadingCities,
    isCityDropdownOpen,
    setIsCityDropdownOpen,
    cityDropdownRef
}: ExperiencesCityFilterProps) {
    // Show shimmer while loading
    if (isLoadingCities) {
        return (
            <div className="w-[280px] p-4 h-full">
                <CustomShimmer
                    height={56}
                    radius={12}
                    className="w-full"
                />
            </div>
        )
    }

    // Show error state or empty state
    if (isLoadingCities || !citiesData || !citiesData.results || citiesData.results.length === 0) {
        return (
            <div
                className="w-[280px] p-4 h-full text-[16px] text-grey-2 font-manrope !font-semibold opacity-50 border border-grey-grey_2 rounded-lg bg-white"
                style={{
                    boxShadow: '0px 2px 8px #e0e0e0',
                    borderRadius: '12px',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0'
                }}>
                No cities available
            </div>
        )
    }

    const [isOpen, setIsOpen] = useState(false)

    // Sync local state with prop
    useEffect(() => {
        setIsOpen(isCityDropdownOpen)
    }, [isCityDropdownOpen])

    // Handle dropdown toggle
    const handleToggle = () => {
        const newState = !isOpen
        setIsOpen(newState)
        setIsCityDropdownOpen(newState)
    }

    const handleCityToggle = (city: CityApiResponse) => {
        const isSelected = selectedCities.includes(city.id)
        let newSelectedCities: string[]
        let newSelectedNames: string[]

        if (isSelected) {
            // Remove city
            newSelectedCities = selectedCities.filter((id) => id !== city.id)
            newSelectedNames = newSelectedCities
                .map((id) => {
                    const cityData = citiesData.results.find((c) => c.id === id)
                    return cityData?.name || ''
                })
                .filter(Boolean)
        } else {
            // Add city
            newSelectedCities = [...selectedCities, city.id]
            newSelectedNames = newSelectedCities
                .map((id) => {
                    const cityData = citiesData.results.find((c) => c.id === id)
                    return cityData?.name || ''
                })
                .filter(Boolean)
        }

        onCitySelect(newSelectedCities, newSelectedNames)
    }

    const getSelectedCityNames = () => {
        return selectedCities
            .map((id) => {
                const city = citiesData.results.find((c) => c.id === id)
                return city?.name || ''
            })
            .filter(Boolean)
    }

    return (
        <div
            ref={cityDropdownRef}
            className="relative w-[180px] "
            style={{ zIndex: 1000 }}>
            {/* Trigger */}
            <div
                className="py-2 px-3 h-full text-[14px] text-grey-2 font-manrope !font-semibold cursor-pointer flex items-center justify-between border border-feature-card-border rounded-full bg-white"
                style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0'
                }}
                onClick={handleToggle}>
                <div className="flex-1 min-w-0">
                    {selectedCities.length === 0 ? (
                        <span className="text-grey-grey_2">Select cities</span>
                    ) : (
                        // only show first name and then total number of cities Paris (+2 more)
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 bg-primary-default_20 text-primary-default px-2 py-1 rounded text-xs">
                                {getSelectedCityNames()[0]} {selectedCities.length > 1 && `(+${selectedCities.length - 1} more)`}
                            </span>
                        </div>
                    )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 bg-white border border-feature-card-border rounded-lg shadow-lg max-h-60 overflow-y-auto w-full min-w-[280px]"
                    style={{
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                        backgroundColor: '#fff',
                        zIndex: 9999,
                        position: 'absolute'
                    }}>
                    <div className="p-2">
                        {/* <div className="text-sm font-medium text-header-black mb-2 px-2">Available Cities</div> */}
                        {/* Debug: Rendering cities */}
                        {citiesData.results.map((city) => {
                            const isSelected = selectedCities.includes(city.id)
                            return (
                                <button
                                    key={city.id}
                                    onClick={() => handleCityToggle(city)}
                                    className={`w-full text-left p-2 rounded-md transition-colors flex items-center justify-between ${
                                        isSelected ? 'bg-primary-default_20 text-primary-default' : 'hover:bg-grey-grey_5'
                                    }`}>
                                    <div className="flex items-center gap-3 hover:bg-primary-default_20">
                                        <span className="font-medium text-sm">{city.name}</span>
                                        <span className="text-xs text-grey-grey_2">({city.experience_count} experiences)</span>
                                    </div>
                                    {isSelected && (
                                        <div className="w-4 h-4 bg-primary-default-80 rounded-full flex items-center justify-center">
                                            <Check className="h-3 w-3 text-primary-default" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
