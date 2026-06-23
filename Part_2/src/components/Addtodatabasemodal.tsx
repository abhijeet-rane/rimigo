import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { 
    addAccommodationToDatabase, 
    type AccommodationDatabaseRequest, 
    type AccommodationCategory 
} from '@/pages/Stays/Apis/accommodationsAPI'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { getAllCitiesByCountry } from '@/api/locationApi' 
import { Loader2, X } from 'lucide-react'

interface AddToDatabaseModalProps {
    isOpen: boolean
    onClose: () => void
    hotelData: {
        hotel_name: string
        zentrum_hub_id: string
        images?: string
        city?: string
    }
    cityId: string
    cityName: string
    onSuccess?: () => void
}

interface City {
    id: string
    name: string
    country_id: string
}

const ACCOMMODATION_CATEGORIES: { value: AccommodationCategory; label: string }[] = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'homestay', label: 'Homestay' },
    { value: 'resort', label: 'Resort' },
    { value: 'villa', label: 'Villa' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'guesthouse', label: 'Guest House' }
]

export const AddToDatabaseModal = ({ isOpen, onClose, hotelData, cityId, cityName , onSuccess }: AddToDatabaseModalProps) => {
    const [category, setCategory] = useState<AccommodationCategory>('hotel')
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const [selectedCountry, setSelectedCountry] = useState<string>('')
    const [selectedBaseCity, setSelectedBaseCity] = useState<string>(cityId)
    const [isBaseCityDropdownOpen, setIsBaseCityDropdownOpen] = useState(false)
    const [citySearchTerm, setCitySearchTerm] = useState<string>('')
    const [cities, setCities] = useState<City[]>([])
    const [countries, setCountries] = useState<LocationPersonalizationResponse[]>([])
    const [filteredCountries, setFilteredCountries] = useState<LocationPersonalizationResponse[]>([])
    const [countrySearchTerm, setCountrySearchTerm] = useState<string>('')
    const [isCountriesDropdownOpen, setIsCountriesDropdownOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingCities, setIsFetchingCities] = useState(false)
    const [isLoadingCountries, setIsLoadingCountries] = useState(true)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    useEffect(() => {
        let isMounted = true
        const fetchCountries = async () => {
            try {
                setIsLoadingCountries(true)
                const response = await getLiveCountries()
                if (!isMounted) return
                setCountries(response)
                setFilteredCountries(response)
                if (response.length > 0 && !selectedCountry) {
                    setSelectedCountry(response[0].country_id)
                }
            } catch (error) {
                console.error('Failed to fetch countries:', error)
                toast.error('Failed to load countries')
            } finally {
                if (isMounted) setIsLoadingCountries(false)
            }
        }
        fetchCountries()
        return () => { isMounted = false }
    }, [])

    useEffect(() => {
        if (!countrySearchTerm.trim()) {
            setFilteredCountries(countries)
            return
        }
        const filtered = countries.filter((country) =>
            country.country_name.toLowerCase().includes(countrySearchTerm.toLowerCase())
        )
        setFilteredCountries(filtered)
    }, [countrySearchTerm, countries])

    useEffect(() => {
        const fetchCities = async () => {
            if (!selectedCountry) return
            try {
                setIsFetchingCities(true)
                const selectedCountryName = countries.find((c) => c.country_id === selectedCountry)?.country_name
                if (!selectedCountryName) { setCities([]); return }
                const response = await getAllCitiesByCountry(selectedCountryName)
                if (response?.results && Array.isArray(response.results)) {
                    setCities(response.results)
                    setSelectedBaseCity('')
                    setCitySearchTerm('')
                } else {
                    setCities([])
                    setCitySearchTerm('')
                }
            } catch (error) {
                console.error('Failed to fetch cities:', error)
                toast.error('Failed to load cities for selected country')
                setCities([])
            } finally {
                setIsFetchingCities(false)
            }
        }
        fetchCities()
    }, [selectedCountry, countries])

    const filteredCities = citySearchTerm.trim()
        ? cities.filter((c) => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()))
        : cities

    const handleSubmit = async () => {
        if (!category) { toast.error('Please select a category'); return }
        if (!selectedBaseCity) { toast.error('Please select a base city'); return }

        const imageUrl = hotelData?.images || ''
        const requestPayload: AccommodationDatabaseRequest = {
            zentrum_hub_id: hotelData.zentrum_hub_id,
            name: hotelData.hotel_name,
            base_city: selectedBaseCity,
            category,
            description: `Accommodation for ${hotelData.hotel_name} in ${hotelData.city}`,
            media: { image_url: imageUrl, thumbnail_url: '' },
            location: { latitude: 0, longitude: 0, address: '', distance_from_city_center: 0 },
            highlights: [],
            facilities: [],
            link: [],
            serp_search_name: hotelData.hotel_name
        }

        setIsLoading(true)
        try {
            await addAccommodationToDatabase(requestPayload)
            toast.success(`${hotelData.hotel_name} has been added to the database`)
            setCategory('hotel')
            setSelectedCountry('')
            setSelectedBaseCity(cityId)
            setCities([])
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Failed to add accommodation to database:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to add accommodation to database'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    const chevronIcon = (open: boolean) => (
        <svg
            className={`w-4 h-4 text-grey-1 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )

    return createPortal(
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center"
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-[500px] mx-4 bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4">
                    <div>
                        <h2 id="modal-title" className="text-xl font-bold text-header-black">Add to Database</h2>
                        <p className="text-sm font-medium text-grey-2 mt-1">Add "{hotelData.hotel_name}" to the Rimigo database</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 p-1.5 rounded-md cursor-pointer text-grey-2 hover:text-grey-0 hover:bg-grey-5 transition"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-6 pb-4 space-y-6 flex-1">

                    {/* Category */}
                    <div className="space-y-2">
                        <div className="text-sm font-bold text-header-black">Category</div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className="w-full flex items-center justify-between rounded-xl border border-grey-4 bg-white px-3 py-2.5 text-grey-0 shadow-sm transition hover:shadow-md"
                            >
                                <span className="font-manrope text-sm font-medium">
                                    {ACCOMMODATION_CATEGORIES.find((c) => c.value === category)?.label || 'Select a category'}
                                </span>
                                {chevronIcon(isCategoryDropdownOpen)}
                            </button>
                            {isCategoryDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg border border-grey-4 shadow-lg z-50 overflow-hidden">
                                    <div className="max-h-64 overflow-auto bg-white">
                                        {ACCOMMODATION_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => { setCategory(cat.value); setIsCategoryDropdownOpen(false) }}
                                                className={`w-full text-left px-3 py-2.5 text-sm font-medium transition ${
                                                    category === cat.value
                                                        ? 'bg-primary-default/10 text-primary-default font-semibold'
                                                        : 'text-grey-0 hover:bg-grey-5'
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-xs font-medium text-grey-2 mt-1">Auto-populated from hotel type: Hotel</p>
                    </div>

                    {/* Countries */}
                    <div className="space-y-2">
                        <div className="text-sm font-bold text-header-black">Countries</div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsCountriesDropdownOpen(!isCountriesDropdownOpen)}
                                className="w-full flex items-center justify-between rounded-xl border border-grey-4 bg-white px-3 py-2.5 text-grey-0 shadow-sm transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoadingCountries}
                            >
                                <span className="font-manrope text-sm font-medium">
                                    {selectedCountry
                                        ? countries.find((c) => c.country_id === selectedCountry)?.country_name || 'Select a country'
                                        : isLoadingCountries ? 'Loading countries...' : 'Select a country'}
                                </span>
                                {chevronIcon(isCountriesDropdownOpen)}
                            </button>
                            {isCountriesDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg border border-grey-4 shadow-lg z-50 overflow-hidden">
                                    <div className="p-2 border-b border-grey-4 bg-grey-5">
                                        <input
                                            type="text"
                                            value={countrySearchTerm}
                                            onChange={(e) => setCountrySearchTerm(e.target.value)}
                                            placeholder="Search countries..."
                                            className="w-full rounded-md border border-grey-4 bg-white px-2.5 py-1.5 text-sm font-medium text-grey-0 outline-none focus:border-primary-default"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-auto bg-white">
                                        {isLoadingCountries && (
                                            <div className="p-3 text-sm font-medium text-grey-2">Loading countries...</div>
                                        )}
                                        {!isLoadingCountries && filteredCountries.length === 0 && (
                                            <div className="p-3 text-sm font-medium text-grey-2">
                                                {countrySearchTerm.trim() ? 'No countries found' : 'No countries available'}
                                            </div>
                                        )}
                                        {!isLoadingCountries && filteredCountries.map((country) => (
                                            <button
                                                key={country.country_id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCountry(country.country_id)
                                                    setIsCountriesDropdownOpen(false)
                                                    setCountrySearchTerm('')
                                                }}
                                                className={`w-full text-left px-3 py-2.5 text-sm font-medium transition ${
                                                    selectedCountry === country.country_id
                                                        ? 'bg-primary-default/10 text-primary-default font-semibold'
                                                        : 'text-grey-0 hover:bg-grey-5'
                                                }`}
                                            >
                                                {country.country_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Base City */}
                    <div className="space-y-2">
                        <div className="text-sm font-bold text-header-black">Base City</div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsBaseCityDropdownOpen(!isBaseCityDropdownOpen)}
                                className="w-full flex items-center justify-between rounded-xl border border-grey-4 bg-white px-3 py-2.5 text-grey-0 shadow-sm transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!selectedCountry || isFetchingCities}
                            >
                                <span className="font-manrope text-sm font-medium">
                                    {selectedBaseCity
                                        ? cities.find((c) => c.id === selectedBaseCity)?.name || 'Select a base city'
                                        : isFetchingCities ? 'Loading cities...' : 'Select a base city'}
                                </span>
                                {chevronIcon(isBaseCityDropdownOpen)}
                            </button>
                            {isBaseCityDropdownOpen && selectedCountry && (
                                <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg border border-grey-4 shadow-lg z-50 overflow-hidden">
                                    <div className="p-2 border-b border-grey-4 bg-grey-5">
                                        <input
                                            type="text"
                                            value={citySearchTerm}
                                            onChange={(e) => setCitySearchTerm(e.target.value)}
                                            placeholder="Search cities..."
                                            className="w-full rounded-md border border-grey-4 bg-white px-2.5 py-1.5 text-sm font-medium text-grey-0 outline-none focus:border-primary-default"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-auto bg-white">
                                        {isFetchingCities && (
                                            <div className="p-3 text-sm font-medium text-grey-2">Loading cities...</div>
                                        )}
                                        {!isFetchingCities && filteredCities.length === 0 && (
                                            <div className="p-3 text-sm font-medium text-grey-2">
                                                {citySearchTerm.trim() ? 'No cities found' : 'No cities found for selected country'}
                                            </div>
                                        )}
                                        {!isFetchingCities && filteredCities.map((city) => (
                                            <button
                                                key={city.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBaseCity(city.id)
                                                    setIsBaseCityDropdownOpen(false)
                                                    setCitySearchTerm('')
                                                }}
                                                className={`w-full text-left px-3 py-2.5 text-sm font-medium transition ${
                                                    selectedBaseCity === city.id
                                                        ? 'bg-primary-default/10 text-primary-default font-semibold'
                                                        : 'text-grey-0 hover:bg-grey-5'
                                                }`}
                                            >
                                                {city.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {!selectedCountry && (
                            <p className="text-xs font-medium text-grey-2 mt-1">Please select a country first</p>
                        )}
                        {selectedCountry && cities.length === 0 && !isFetchingCities && isBaseCityDropdownOpen && (
                            <p className="text-xs font-medium text-red-500 mt-1">No cities found for selected country</p>
                        )}
                    </div>

                    {/* Hotel Info */}
                    <div className="bg-grey-5 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-grey-2">Hotel Name:</span>
                            <span className="text-sm font-bold text-header-black">{hotelData.hotel_name}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-grey-2">Zentrum ID:</span>
                            <span className="text-sm font-bold text-header-black truncate">{hotelData.zentrum_hub_id}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-grey-2">Current City:</span>
                            <span className="text-sm font-bold text-header-black">{cityName}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-grey-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-grey-0 bg-white border border-grey-4 rounded-lg hover:bg-grey-5 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedBaseCity}
                        className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary-default rounded-lg hover:bg-primary-default/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Add to Database'
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    )
}

export default AddToDatabaseModal