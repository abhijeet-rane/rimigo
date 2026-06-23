import React, { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import SearchableCityDropdown from '@/components/common/SearchableCityDropdown'
import { CityListItem } from '@/components/common/SearchBar'
import { useQuery } from '@tanstack/react-query'
import { getCountryCities } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import CustomDatePicker from './CustomDatePicker'

interface AddDayModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date
    countryIds: string[]
    onConfirm: (city: CityListItem | null, selectedDate: Date) => void
    prefilledCity?: CityListItem | null
    isUpdateMode?: boolean
    dayNumber?: number | null
    onDelete?: () => void
}

const AddDayModal: React.FC<AddDayModalProps> = ({
    isOpen,
    onClose,
    date,
    countryIds,
    onConfirm,
    prefilledCity,
    isUpdateMode = false,
    dayNumber,
    onDelete
}) => {
    const [selectedCity, setSelectedCity] = useState<CityListItem | null>(prefilledCity || null)
    const [selectedDate, setSelectedDate] = useState<Date>(date)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    // Fetch cities for all countries in the trip
    // Use getCountryCities which provides both city_id and city_name
    const { data: citiesData, isLoading: isLoadingCities } = useQuery({
        queryKey: ['tripCities', countryIds.sort().join(',')],
        queryFn: async () => {
            if (countryIds.length === 0) return []

            const cityMap = new Map<string, CityListItem>()

            // Fetch cities from all countries
            await Promise.all(
                countryIds.map(async (countryId) => {
                    try {
                        const response = await getCountryCities(countryId)
                        if (response?.data) {
                            // Combine top_cities and other_cities
                            const allCities = [...(response.data.top_cities || []), ...(response.data.other_cities || [])]
                            
                            allCities.forEach((city) => {
                                const cityId = city.city_id
                                const cityName = city.city_name
                                
                                // Only add if we have both ID and name, and it's not already in the map
                                if (cityId && cityName && !cityMap.has(cityId)) {
                                    cityMap.set(cityId, {
                                        id: cityId,
                                        name: cityName
                                    })
                                }
                            })
                        }
                    } catch (error) {
                        console.error(`Error fetching cities for country ${countryId}:`, error)
                    }
                })
            )

            return Array.from(cityMap.values())
        },
        enabled: isOpen && countryIds.length > 0,
        staleTime: HOURS_24
    })

    const initialCities = citiesData || []

    useEffect(() => {
        if (!isOpen) {
            setSelectedCity(null)
            setSelectedDate(date)
            setShowDeleteConfirmation(false)
            setDeleteConfirmText('')
        } else {
            setSelectedDate(date)
            // Set prefilled city when modal opens (both update mode and add mode)
            if (prefilledCity) {
                setSelectedCity(prefilledCity)
            } else {
                setSelectedCity(null)
            }
        }
    }, [isOpen, date, prefilledCity, isUpdateMode])

    const handleDeleteClick = () => {
        setShowDeleteConfirmation(true)
    }

    const handleConfirmDelete = () => {
        if (deleteConfirmText.toLowerCase() === 'delete' && onDelete) {
            onDelete()
            onClose()
        }
    }

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false)
        setDeleteConfirmText('')
    }

    const handleConfirm = () => {
        if (!selectedCity) {
            // City is required
            return
        }
        onConfirm(selectedCity, selectedDate)
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/40 z-9999 flex items-center justify-center p-4"
                onClick={onClose}>
                {/* Modal */}
                <div
                    className="bg-white rounded-lg border border-feature-card-border shadow-lg w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-feature-card-border">
                        <Typography
                            size="18"
                            weight="semibold"
                            family="manrope"
                            color="grey-0">
                            {isUpdateMode && dayNumber ? `Update Day ${dayNumber}` : 'Add New Day'}
                        </Typography>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-grey-5 rounded transition-colors">
                            <X className="h-5 w-5 text-grey-2" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Date Input */}
                        <div>
                            <Typography
                                size="12"
                                weight="medium"
                                family="manrope"
                                color="grey-2"
                                className="mb-2">
                                Date
                            </Typography>
                            <CustomDatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                disabled={isUpdateMode}
                            />
                        </div>

                        {/* City Dropdown */}
                        <div>
                            <Typography
                                size="12"
                                weight="medium"
                                family="manrope"
                                color="grey-2"
                                className="mb-2">
                                City
                            </Typography>
                            <SearchableCityDropdown
                                value={selectedCity}
                                onChange={setSelectedCity}
                                placeholder="Search for a city..."
                                initialCities={initialCities}
                                countryIds={countryIds}
                            />
                            {isLoadingCities && (
                                <Typography
                                    size="12"
                                    weight="normal"
                                    family="manrope"
                                    color="grey-2"
                                    className="mt-2">
                                    Loading cities...
                                </Typography>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className={`flex items-center gap-3 p-6 border-t border-feature-card-border ${isUpdateMode && onDelete ? 'justify-between' : 'justify-end'}`}>
                        {isUpdateMode && onDelete && (
                            <button
                                onClick={handleDeleteClick}
                                className="h-10 px-4 flex items-center justify-center gap-2 rounded-md bg-secondary-red text-natural-white hover:bg-secondary-red/90 transition-all duration-400 cursor-pointer">
                                <Trash2 className="h-4 w-4" />
                                <div
                                    className="font-red-hat-display"
                                    style={{ fontWeight: 550, fontSize: '14px' }}>
                                    Delete
                                </div>
                            </button>
                        )}
                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                onClick={onClose}
                                className="h-10 px-4 flex items-center justify-center rounded-md border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer">
                                <div
                                    className="font-red-hat-display text-grey-1"
                                    style={{ fontWeight: 550, fontSize: '14px' }}>
                                    Cancel
                                </div>
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedCity}
                                className={`h-10 px-4 flex items-center justify-center gap-2 rounded-md transition-all duration-400 ${
                                    selectedCity
                                        ? 'bg-primary-default text-natural-white hover:bg-primary-light cursor-pointer'
                                        : 'bg-grey-4 text-grey-2 cursor-not-allowed'
                                }`}>
                                <div
                                    className="font-red-hat-display"
                                    style={{
                                        fontWeight: 550,
                                        fontSize: '14px',
                                        color: selectedCity ? 'var(--color-natural-white)' : 'var(--color-grey-2)'
                                    }}>
                                    {isUpdateMode ? 'Update Day' : 'Add Day'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black/40 z-12000 flex items-center justify-center p-4">
                    <div
                        className="bg-white rounded-lg border border-feature-card-border shadow-lg w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-feature-card-border">
                            <Typography
                                size="18"
                                weight="semibold"
                                family="manrope"
                                color="grey-0">
                                Delete Day {dayNumber}
                            </Typography>
                            <button
                                onClick={handleCancelDelete}
                                className="p-1 hover:bg-grey-5 rounded transition-colors">
                                <X className="h-5 w-5 text-grey-2" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <Typography
                                size="14"
                                weight="medium"
                                family="manrope"
                                color="grey-0">
                                This action cannot be undone. This will delete all events for this day.
                            </Typography>
                            <Typography
                                size="12"
                                weight="medium"
                                family="manrope"
                                color="grey-2"
                                className="mb-2">
                                Type <span className="font-semibold text-grey-0">delete</span> to confirm:
                            </Typography>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type 'delete' to confirm"
                                className="w-full rounded-xl bg-white font-medium outline-none p-[16px] text-size-16 transition-all text-grey-0 border border-grey-4"
                                style={{
                                    fontFamily: "'Manrope', sans-serif",
                                    color: 'var(--color-grey-0)',
                                    lineHeight: '100%',
                                    letterSpacing: '-1%'
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-feature-card-border">
                            <button
                                onClick={handleCancelDelete}
                                className="h-10 px-4 flex items-center justify-center rounded-md border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer">
                                <div
                                    className="font-red-hat-display text-grey-1"
                                    style={{ fontWeight: 550, fontSize: '14px' }}>
                                    Cancel
                                </div>
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                                className={`h-10 px-4 flex items-center justify-center gap-2 rounded-md transition-all duration-400 ${
                                    deleteConfirmText.toLowerCase() === 'delete'
                                        ? 'bg-secondary-red text-natural-white hover:bg-secondary-red/90 cursor-pointer'
                                        : 'bg-grey-4 text-grey-2 cursor-not-allowed'
                                }`}>
                                <Trash2 className="h-4 w-4" />
                                <div
                                    className="font-red-hat-display"
                                    style={{
                                        fontWeight: 550,
                                        fontSize: '14px',
                                        color: deleteConfirmText.toLowerCase() === 'delete' ? 'var(--color-natural-white)' : 'var(--color-grey-2)'
                                    }}>
                                    Delete Day
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default AddDayModal
