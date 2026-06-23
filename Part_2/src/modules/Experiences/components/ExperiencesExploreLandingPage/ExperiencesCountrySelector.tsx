import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import CustomShimmer from '@/components/shared/Shimmer'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ExperiencesCountrySelectorProps {
    onCountrySelect: (countryName: string) => void
    selectedCountry: string
    countries: LocationPersonalizationResponse[]
    isLoadingCountries: boolean
}

export function ExperiencesCountrySelector({ onCountrySelect, selectedCountry, countries, isLoadingCountries }: ExperiencesCountrySelectorProps) {
    // Show shimmer while loading
    if (isLoadingCountries) {
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
    if (isLoadingCountries || !countries || countries.length === 0) {
        return (
            <Select disabled>
                <SelectTrigger
                    className="w-[280px] p-4 h-full text-[16px] text-grey-2 font-manrope !font-semibold ![&>svg]:text-grey-0 opacity-50"
                    style={{
                        boxShadow: '0px 2px 8px #e0e0e0',
                        borderRadius: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0'
                    }}>
                    <SelectValue placeholder="No countries available" />
                </SelectTrigger>
            </Select>
        )
    }

    return (
        <Select
            value={selectedCountry}
            onValueChange={onCountrySelect}>
            <SelectTrigger
                className="w-[280px] p-4 h-full text-[16px] text-grey-2 font-manrope !font-semibold ![&>svg]:text-grey-0"
                style={{
                    boxShadow: '0px 2px 8px #e0e0e0',
                    borderRadius: '12px',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0'
                }}>
                <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent
                className="z-200 bg-white max-h-[300px] overflow-y-auto"
                style={{
                    boxShadow: '0px 2px 8px #e0e0e0',
                    borderRadius: '16px',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0'
                }}>
                <SelectGroup>
                    <SelectLabel>Available Countries</SelectLabel>
                    {countries.map((country) => (
                        <SelectItem
                            key={country.country_id}
                            value={country.country_name}>
                            <div className="flex items-center gap-3">
                                {country.icon_url && (
                                    <img
                                        src={country.icon_url}
                                        alt={country.country_name}
                                        className="w-6 h-6 rounded-full object-cover"
                                        onError={(e) => {
                                            // Hide image if it fails to load
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                )}
                                <span>{country.country_name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
