import { MapPin, Check } from 'lucide-react'

interface CityItem {
    id: string
    name: string
}

interface CityModalProps {
    isOpen: boolean
    onClose: () => void
    cities: CityItem[]
    isLoadingCities: boolean
    cityText: string
    onCitySelect: (cityId: string, cityName: string) => void
    selectedCityIds?: string[]
    onSkip?: () => void
}

const CityLoadingShimmer = () => (
    <>
        {[1, 2, 3, 4, 5].map((index) => (
            <div
                key={index}
                className="w-full flex items-center gap-3 px-1 py-1">
                <div className="p-4 flex items-center justify-center bg-grey-grey_4 rounded-md animate-pulse">
                    <div className="h-4 w-4 bg-grey-grey_3 rounded"></div>
                </div>
                <div className="flex-1 h-4 bg-grey-grey_4 rounded animate-pulse"></div>
            </div>
        ))}
    </>
)

export const CityModal = ({ isOpen, onClose, cities, isLoadingCities, cityText, onCitySelect, selectedCityIds = [], onSkip }: CityModalProps) => {
    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent z-40"
                onClick={onClose}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 transform mt-2 w-[280px] z-50">
                <div className="bg-white border border-feature-card-border rounded-lg shadow-lg h-[400px] overflow-y-auto">
                    <div className="p-2">
                        {isLoadingCities ? (
                            <CityLoadingShimmer />
                        ) : cities.length > 0 ? (
                            cities.map((city) => {
                                const isSelected = selectedCityIds.includes(city.id)
                                return (
                                    <button
                                        key={city.id}
                                        onClick={() => onCitySelect(city.id, city.name)}
                                        className={`cursor-pointer w-full flex items-center gap-3 px-1 py-1 text-left hover:bg-grey-grey_4 rounded-md transition-colors ${
                                            isSelected ? 'bg-primary-default_10' : ''
                                        }`}>
                                        <div
                                            className={`p-4 flex items-center justify-center rounded-md ${
                                                isSelected ? 'bg-primary-default' : 'bg-grey-grey_4'
                                            }`}>
                                            {isSelected ? (
                                                <Check className="h-4 w-4 text-natural-white shrink-0" />
                                            ) : (
                                                <MapPin className="h-4 w-4 text-grey-grey_2 shrink-0" />
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium ${isSelected ? 'text-primary-default' : 'text-header-black'}`}>
                                            {city.name}
                                        </span>
                                    </button>
                                )
                            })
                        ) : cityText && cityText.trim() !== '' ? (
                            <div className="px-4 py-6 text-center text-xs text-grey_2">No cities found for "{cityText}"</div>
                        ) : (
                            <div className="px-4 py-6 text-center text-xs text-grey_2">No cities available</div>
                        )}
                        {/* Skip button */}
                        {onSkip && (
                            <div className="mt-2 pt-2 border-t border-feature-card-border">
                                <button
                                    onClick={onSkip}
                                    className="w-full px-4 py-2 text-sm font-medium text-grey-grey_2 hover:text-header-black transition-colors">
                                    Skip
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
