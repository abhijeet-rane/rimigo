import { Check } from 'lucide-react'
import type { CountryListItem } from '@/pages/Stays/Services'

interface CountryModalProps {
    isOpen: boolean
    onClose: () => void
    countries: CountryListItem[]
    isLoadingCountries: boolean
    countryText: string
    onCountrySelect: (countryId: string, countryName: string) => void
    selectedCountries: CountryListItem[]
    multiselect: boolean
    anchorElement: HTMLElement | null
}

const CountryLoadingShimmer = () => {
    return (
        <>
            {Array.from({ length: 5 }).map((_, index) => (
                <div
                    key={index}
                    className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-6 h-6 bg-grey-grey_5 rounded" />
                    <div className="flex-1">
                        <div className="h-4 bg-grey-grey_5 rounded w-3/4" />
                    </div>
                </div>
            ))}
        </>
    )
}

export const CountryModal = ({
    isOpen,
    onClose,
    countries,
    isLoadingCountries,
    countryText,
    onCountrySelect,
    selectedCountries,
    multiselect,
    anchorElement
}: CountryModalProps) => {
    const hasInput = countryText.length > 0
    const trimmedQuery = countryText.trim()
    const hasMeaningfulQuery = trimmedQuery.length > 0
    if (!isOpen || (!hasInput && selectedCountries.length === 0)) return null

    const isSelected = (countryId: string) => selectedCountries.some((c) => c.id === countryId)

    // Filter out selected countries from the main list
    const unselectedCountries = countries.filter((country) => !isSelected(country.id))

    // Calculate position based on anchor element
    const getPosition = () => {
        if (!anchorElement) return { top: '100%', left: '50%' }
        const rect = anchorElement.getBoundingClientRect()
        return {
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`
        }
    }

    const position = getPosition()

    return (
        <>
            {/* Transparent overlay */}
            <div
                className="fixed inset-0 bg-transparent z-40"
                onClick={onClose}
            />

            {/* Country search modal */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed w-[400px] bg-natural-white border border-feature-card-border rounded-lg shadow-lg z-50 h-[400px] overflow-y-auto"
                style={{ top: position.top, left: position.left }}>
                {/* Your Selections Section - Always visible */}
                {selectedCountries.length > 0 && (
                    <div className="border-b border-feature-card-border">
                        <div className="px-4 py-2 bg-grey-grey_5">
                            <span className="text-xs font-bold text-grey-grey_2 uppercase tracking-wider">Your Selections</span>
                        </div>
                        <div className="py-2">
                            {selectedCountries.map((country) => (
                                <button
                                    key={country.id}
                                    onClick={() => onCountrySelect(country.id, country.name)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-grey-grey_5 transition-colors cursor-pointer text-left bg-primary-default-80">
                                    {country.icon_url ? (
                                        <img
                                            src={country.icon_url}
                                            alt={country.name}
                                            className="w-6 h-6 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 bg-grey-grey_5 rounded flex items-center justify-center text-xs">🌍</div>
                                    )}
                                    <span className="flex-1 text-sm font-medium text-primary-default">{country.name}</span>
                                    {multiselect && <Check className="h-5 w-5 text-primary-default" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Results Section */}
                <div>
                    {selectedCountries.length > 0 && (
                        <div className="px-4 py-2 bg-grey-grey_5">
                            <span className="text-xs font-bold text-grey-grey_2 uppercase tracking-wider">
                                {hasMeaningfulQuery ? 'Your Search Matches' : 'Select More From'}
                            </span>
                        </div>
                    )}
                    <div className="py-2">
                        {isLoadingCountries ? (
                            <CountryLoadingShimmer />
                        ) : unselectedCountries.length > 0 ? (
                            unselectedCountries.map((country) => (
                                <button
                                    key={country.id}
                                    onClick={() => onCountrySelect(country.id, country.name)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-grey-grey_5 transition-colors cursor-pointer text-left">
                                    {country.icon_url ? (
                                        <img
                                            src={country.icon_url}
                                            alt={country.name}
                                            className="w-6 h-6 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 bg-grey-grey_5 rounded flex items-center justify-center text-xs">🌍</div>
                                    )}
                                    <span className="flex-1 text-sm font-medium text-header-black">{country.name}</span>
                                </button>
                            ))
                        ) : hasMeaningfulQuery ? (
                            <div className="p-4 text-center text-grey-grey_2 text-sm">No countries found for "{trimmedQuery}"</div>
                        ) : selectedCountries.length === 0 && !hasInput ? (
                            <div className="p-4 text-center text-grey-grey_2 text-sm">Start typing to search countries</div>
                        ) : (
                            <div className=""></div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
