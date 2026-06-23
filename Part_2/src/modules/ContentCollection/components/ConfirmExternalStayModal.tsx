import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, X } from 'lucide-react'
import CustomDatePicker from '@/modules/Itinerary/components/CustomDatePicker'
import { formatDateToYMD } from '@/utils/dateUtils'
import type { KayakHotelSingleData } from '@/types/kayakTypes/kayakHotelTypes'
import type { KayakAutocompleteResultItem } from '@/types/kayakTypes/kayakAutocompleteTypes'

function getFirstLargeImage(images: KayakHotelSingleData['images']): string | null {
    if (!images?.length) return null
    return images.find((img) => img.large)?.large ?? null
}

export interface CityOption {
    id: string
    name: string
    country_name?: string
}

interface ConfirmExternalStayModalProps {
    isOpen: boolean
    onClose: () => void
    hotelData: KayakHotelSingleData
    autocompleteItem: KayakAutocompleteResultItem
    availableCities?: CityOption[]
    isAdding?: boolean
    onConfirm: (selectedCity: CityOption, startDate: string | null, endDate: string | null) => void
    /** Pre-populated check-in date (YYYY-MM-DD) from current filter */
    initialCheckIn?: string
    /** Pre-populated check-out date (YYYY-MM-DD) from current filter */
    initialCheckOut?: string
}

const parseOrDefault = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date()
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? new Date() : parsed
}

const ConfirmExternalStayModal: React.FC<ConfirmExternalStayModalProps> = ({
    isOpen,
    onClose,
    hotelData,
    autocompleteItem,
    availableCities = [],
    isAdding = false,
    onConfirm,
    initialCheckIn,
    initialCheckOut
}) => {
    const [selectedCityId, setSelectedCityId] = useState('')
    const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => parseOrDefault(initialCheckIn))
    const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => parseOrDefault(initialCheckOut))

    useEffect(() => {
        if (isOpen) {
            setSelectedCityId('')
            setSelectedStartDate(parseOrDefault(initialCheckIn))
            setSelectedEndDate(parseOrDefault(initialCheckOut))
        }
    }, [isOpen, initialCheckIn, initialCheckOut])

    // Group cities by country name for multi-destination display
    const citiesByCountry = useMemo(() => {
        const hasCountryNames = availableCities.some((c) => c.country_name)
        if (!hasCountryNames) return null
        const grouped = new Map<string, CityOption[]>()
        for (const city of availableCities) {
            const country = city.country_name || 'Other'
            if (!grouped.has(country)) grouped.set(country, [])
            grouped.get(country)!.push(city)
        }
        return grouped
    }, [availableCities])

    if (!isOpen) return null

    const heroImage = getFirstLargeImage(hotelData.images)
    const hotelName = hotelData.name || hotelData.translatedName || autocompleteItem.hotelName || autocompleteItem.name
    const selectedCity = availableCities.find((c) => c.id === selectedCityId)
    const canConfirm = availableCities.length === 0 ? true : !!selectedCity

    const getCityForConfirm = (): CityOption => {
        if (selectedCity) return selectedCity
        return { id: String(autocompleteItem.cityId), name: autocompleteItem.cityName || '' }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[501] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-grey-4">
                    <span className="text-[16px] font-bold text-grey-0 font-red-hat-display">Add to collection</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer p-1.5 hover:bg-grey-5 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-grey-2" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col px-5 py-4 gap-4">
                    {/* Hotel info row */}
                    <div className="flex items-center gap-3">
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt=""
                                className="shrink-0 w-16 h-16 rounded-xl object-cover bg-grey-5"
                            />
                        ) : (
                            <div className="shrink-0 w-16 h-16 rounded-xl bg-grey-5 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-grey-3" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-grey-0 leading-snug line-clamp-2">{hotelName}</p>
                            {hotelData.address && (
                                <p className="text-[12px] font-medium text-grey-2 mt-0.5 line-clamp-1">{hotelData.address}</p>
                            )}
                            {autocompleteItem.cityName && (
                                <p className="text-[12px] font-medium text-grey-2 mt-0.5">{autocompleteItem.cityName}{autocompleteItem.countryName ? `, ${autocompleteItem.countryName}` : ''}</p>
                            )}
                        </div>
                    </div>

                    {/* City selector */}
                    {availableCities.length > 0 && (
                        <div>
                            <label htmlFor="confirm-stay-city" className="block text-[13px] font-semibold text-grey-1 mb-1.5">
                                Collection city
                            </label>
                            <select
                                id="confirm-stay-city"
                                value={selectedCityId}
                                onChange={(e) => setSelectedCityId(e.target.value)}
                                disabled={isAdding}
                                className="cursor-pointer w-full px-3 py-2.5 border border-grey-4 rounded-xl bg-grey-5/40 text-grey-0 font-manrope text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default focus:bg-white disabled:opacity-50 transition-all appearance-none"
                            >
                                <option value="">Select city...</option>
                                {citiesByCountry
                                    ? Array.from(citiesByCountry.entries()).map(([countryName, cities]) => (
                                          <optgroup key={countryName} label={countryName}>
                                              {cities.map((city) => (
                                                  <option key={city.id} value={city.id}>
                                                      {city.name}
                                                  </option>
                                              ))}
                                          </optgroup>
                                      ))
                                    : availableCities.map((city) => (
                                          <option key={city.id} value={city.id}>
                                              {city.name}
                                          </option>
                                      ))}
                            </select>
                        </div>
                    )}

                    {/* Date pickers */}
                    <div>
                        <p className="text-[13px] font-semibold text-grey-1 mb-2">Stay dates</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[11px] font-medium text-grey-3 mb-1">Check-in</p>
                                <CustomDatePicker value={selectedStartDate} onChange={setSelectedStartDate} openDirection="up" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-grey-3 mb-1">Check-out</p>
                                <CustomDatePicker value={selectedEndDate} onChange={setSelectedEndDate} openDirection="up" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-grey-4 bg-grey-5/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer px-4 py-2 rounded-lg border border-grey-4 bg-white text-grey-0 font-semibold text-[13px] hover:bg-grey-5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(getCityForConfirm(), formatDateToYMD(selectedStartDate), formatDateToYMD(selectedEndDate))}
                        disabled={isAdding || !canConfirm}
                        className="cursor-pointer px-4 py-2 rounded-lg bg-primary-default text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isAdding ? 'Adding...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default ConfirmExternalStayModal
