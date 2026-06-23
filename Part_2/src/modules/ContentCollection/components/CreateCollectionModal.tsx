import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'
import { X, Loader2, ChevronDown, Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLiveCountriesAPI } from '@/hooks/curation/useLiveCountriesAPI'

interface CreateCollectionModalProps {
    isOpen: boolean
    onClose: () => void
    experienceId: string
    experienceName: string
    onSuccess?: (collectionIdentifier: string) => void
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch countries using live-countries API
    const { data: countries = [], isLoading: isLoadingCountries } = useLiveCountriesAPI({enabled: isOpen})


    const adaptedCountries = useMemo(() => {
        return countries.map((country) => ({
            country_id: country.id,
            country_name: country.name,
            icon_url: country.icon_url || null,
            flag_icon_url: country.flag_icon_url || null,
            region: country.region || null,
        }))
    }, [countries])

    // Filter countries based on search term (guard against undefined country_name from API)
    const filteredCountries = adaptedCountries.filter((country) =>
        (country?.country_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
                setSearchTerm('')
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Handle country selection (toggle)
    const handleCountryToggle = (countryId: string) => {
        setSelectedCountryIds((prev) => {
            if (prev.includes(countryId)) {
                return prev.filter((id) => id !== countryId)
            } else {
                return [...prev, countryId]
            }
        })
    }

    // Get selected country names for display
    const selectedCountryNames = countries
        .filter((country) => selectedCountryIds.includes(country.country_id))
        .map((country) => country.country_name)

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('Collection name is required')
            return
        }

        if (selectedCountryIds.length === 0) {
            toast.error('Please select at least one country')
            return
        }

        setIsCreating(true)

        try {
            const response = await contentCollectionApi.createCollection(name.trim(), description.trim() || null, selectedCountryIds)
            const collection = response.data

            if (!collection.identifier) {
                throw new Error('Collection created but identifier is missing')
            }

            toast.success(`Collection "${name}" created successfully`)
            onSuccess?.(collection.identifier)
            onClose()

            // Reset form
            setName('')
            setDescription('')
            setSelectedCountryIds([])
            setSearchTerm('')
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Failed to create collection:', error)
            }
            toast.error('Failed to create collection. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    const handleClose = () => {
        if (!isCreating) {
            setName('')
            setDescription('')
            setSelectedCountryIds([])
            setSearchTerm('')
            setIsDropdownOpen(false)
            onClose()
        }
    }

    if (!isOpen) {
        return null
    }

    return createPortal(
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={handleClose}
            />

            {/* Centered modal */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="flex max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl overflow-hidden w-full max-w-2xl"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Split Layout */}
                    <div className="flex">
                        {/* Left Section - Illustration */}
                        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center p-8">
                                {/* Illustration placeholder - you can replace with actual illustration */}
                                <div className="text-white text-center">
                                    <div className="text-6xl mb-4">📚</div>
                                    <h3 className="text-2xl font-bold mb-2">Create Collection</h3>
                                    <p className="text-blue-100">Organize your travel experiences</p>
                                </div>
                            </div>
                            {/* Close button on illustration */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
                                aria-label="Close">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Right Section - Form */}
                        <div className="flex-1 md:w-1/2 flex flex-col">
                            {/* Header for mobile */}
                            <div className="md:hidden px-6 pt-6 pb-4 flex items-center justify-between border-b">
                                <h2 className="text-xl font-semibold">Create Collection</h2>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-full hover:bg-grey_5 flex items-center justify-center transition-colors"
                                    aria-label="Close">
                                    <X className="w-5 h-5 text-grey-2" />
                                </button>
                            </div>

                            {/* Form Content */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
                                {/* Title for desktop */}
                                <h2 className="hidden md:block text-2xl font-bold text-grey-0 mb-6">Create Collection</h2>
                                <div className="space-y-6">
                                    {/* Name Field */}
                                    <div>
                                        <label
                                            htmlFor="collection-name"
                                            className="block text-sm font-medium text-grey-0 mb-2">
                                            Name
                                        </label>
                                        <input
                                            id="collection-name"
                                            type="text"
                                            placeholder="Enter collection name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={isCreating}
                                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Countries Field */}
                                    <div className="relative" ref={dropdownRef}>
                                        <label
                                            htmlFor="collection-countries"
                                            className="block text-sm font-medium text-grey-0 mb-2">
                                            Countries <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            disabled={isCreating || isLoadingCountries}
                                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between text-left">
                                            <span className={selectedCountryIds.length === 0 ? 'text-muted-foreground' : 'text-grey-0'}>
                                                {isLoadingCountries
                                                    ? 'Loading countries...'
                                                    : selectedCountryIds.length === 0
                                                      ? 'Select countries'
                                                      : selectedCountryNames.length <= 2
                                                        ? selectedCountryNames.join(', ')
                                                        : `${selectedCountryNames.slice(0, 2).join(', ')} +${selectedCountryIds.length - 2} more`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-grey-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown */}
                                        {isDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                                                {/* Search input */}
                                                <div className="p-2 border-b border-input">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-2" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search countries..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Countries list */}
                                                <div className="overflow-y-auto max-h-48">
                                                    {filteredCountries.length === 0 ? (
                                                        <div className="p-3 text-sm text-grey-2 text-center">
                                                            {isLoadingCountries ? 'Loading...' : 'No countries found'}
                                                        </div>
                                                    ) : (
                                                        filteredCountries.map((country) => {
                                                            const isSelected = selectedCountryIds.includes(country.country_id)
                                                            return (
                                                                <button
                                                                    key={country.country_id}
                                                                    type="button"
                                                                    onClick={() => handleCountryToggle(country.country_id)}
                                                                    className="w-full px-3 py-2 text-left hover:bg-grey-5 flex items-center gap-3 transition-colors">
                                                                    <div className={`flex-shrink-0 w-4 h-4 border-2 rounded ${isSelected ? 'bg-primary-default border-primary-default' : 'border-grey-4'} flex items-center justify-center`}>
                                                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                                                    </div>
                                                                    {country.icon_url ? (
                                                                        <img
                                                                            src={country.icon_url}
                                                                            alt={country.country_name}
                                                                            className="w-5 h-5 object-cover rounded"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-5 h-5 bg-grey-4 rounded flex items-center justify-center text-xs">🌍</div>
                                                                    )}
                                                                    <span className="flex-1 text-sm text-grey-0">{country.country_name}</span>
                                                                </button>
                                                            )
                                                        })
                                                    )}
                                                </div>

                                                {/* Selected count */}
                                                {selectedCountryIds.length > 0 && (
                                                    <div className="p-2 border-t border-input bg-grey-5 text-xs text-grey-2">
                                                        {selectedCountryIds.length} {selectedCountryIds.length === 1 ? 'country' : 'countries'} selected
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Description Field */}
                                    <div>
                                        <label
                                            htmlFor="collection-description"
                                            className="block text-sm font-medium text-grey-0 mb-2">
                                            Description <span className="text-muted-foreground">(optional)</span>
                                        </label>
                                        <textarea
                                            id="collection-description"
                                            placeholder="Tell us about this collection"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            disabled={isCreating}
                                            rows={4}
                                            className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer with Create Button */}
                            <div className="px-6 pb-6 border-t pt-4">
                                <Button
                                    onClick={handleCreate}
                                    disabled={isCreating || !name.trim() || selectedCountryIds.length === 0}
                                    className="w-full"
                                    size="lg">
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        'Create'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CreateCollectionModal
