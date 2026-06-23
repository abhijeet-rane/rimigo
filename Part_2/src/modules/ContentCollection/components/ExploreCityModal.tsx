import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import Typography from '@/components/shared/Typography'
import SearchableCityDropdown from '@/components/common/SearchableCityDropdown'
import { CityListItem } from '@/components/common/SearchBar'
import { getCountryCities } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface ExploreCityModalProps {
    isOpen: boolean
    onClose: () => void
    countryIds: string[]
    selectedCity: CityListItem | null
    onSelectCity: (city: CityListItem) => void
}

/**
 * City picker for the Activities tab "Explore more cities" affordance.
 *
 * Mirrors the itinerary Update Day modal pattern: a single
 * `SearchableCityDropdown` seeded with every city across the trip's
 * countries. Picking a city fires `onSelectCity` and closes the modal —
 * the caller is responsible for persisting the choice (typically to URL
 * params consumed by the Explore view).
 */
const ExploreCityModal: React.FC<ExploreCityModalProps> = ({
    isOpen,
    onClose,
    countryIds,
    selectedCity,
    onSelectCity
}) => {
    const [draftCity, setDraftCity] = useState<CityListItem | null>(selectedCity)

    useEffect(() => {
        if (isOpen) setDraftCity(selectedCity)
    }, [isOpen, selectedCity])

    const { data: citiesData, isLoading } = useQuery({
        queryKey: ['exploreCityModalCities', countryIds.sort().join(',')],
        queryFn: async () => {
            if (countryIds.length === 0) return []
            const cityMap = new Map<string, CityListItem>()
            await Promise.all(
                countryIds.map(async (countryId) => {
                    try {
                        const response = await getCountryCities(countryId)
                        if (response?.data) {
                            const allCities = [
                                ...(response.data.top_cities || []),
                                ...(response.data.other_cities || [])
                            ]
                            allCities.forEach((city) => {
                                if (city.city_id && city.city_name && !cityMap.has(city.city_id)) {
                                    cityMap.set(city.city_id, {
                                        id: city.city_id,
                                        name: city.city_name
                                    })
                                }
                            })
                        }
                    } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error(`ExploreCityModal: failed to load cities for ${countryId}`, error)
                    }
                })
            )
            return Array.from(cityMap.values())
        },
        enabled: isOpen && countryIds.length > 0,
        staleTime: HOURS_24
    })

    if (!isOpen) return null

    const handleConfirm = () => {
        if (!draftCity) return
        onSelectCity(draftCity)
        onClose()
    }

    const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Close when the user drags the sheet down by 80px+ OR flicks
        // it with enough velocity. Matches the iOS/native sheet feel.
        if (info.offset.y > 80 || info.velocity.y > 500) {
            onClose()
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                key="explore-city-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 bg-black/50 z-9999 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-[2px]"
                onClick={onClose}>
                <motion.div
                    key="explore-city-sheet"
                    initial={{ y: '6%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '8%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                    drag={'y'}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.6 }}
                    dragDirectionLock
                    onDragEnd={handleDragEnd}
                    className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md sm:max-h-[92vh] flex flex-col sm:cursor-default touch-pan-y"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Mobile drag handle — actually draggable (the
                        entire sheet listens, this handle just signals
                        the affordance). Dragging down past 80px or
                        flicking the sheet closes it. */}
                    <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                        <div className="w-9 h-1 rounded-full bg-grey-4" />
                    </div>

                    <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-6 pb-4 sm:pb-5">
                        <Typography
                            size="20"
                            weight="bold"
                            family="redhat"
                            color="grey-0">
                            Explore more cities
                        </Typography>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="h-9 w-9 rounded-full bg-grey-5 hover:bg-grey-4/60 flex items-center justify-center transition-colors">
                            <X className="h-4 w-4 text-grey-0" />
                        </button>
                    </div>

                    {/* `overflow-visible` so the SearchableCityDropdown's
                        absolutely-positioned popup can paint past the
                        body without being clipped (the popup itself
                        caps its own height with max-h-[300px] +
                        overflow-y-auto). */}
                    <div className="px-5 sm:px-6 pb-2 flex flex-col gap-2 overflow-visible">
                        <Typography
                            size="12"
                            weight="semibold"
                            family="manrope"
                            color="grey-2">
                            CITY
                        </Typography>
                        <SearchableCityDropdown
                            value={draftCity}
                            onChange={setDraftCity}
                            placeholder="Search for a city..."
                            initialCities={citiesData || []}
                            countryIds={countryIds}
                        />
                        {isLoading && (
                            <Typography
                                size="12"
                                weight="normal"
                                family="manrope"
                                color="grey-2">
                                Loading cities...
                            </Typography>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 sm:py-5 mt-auto">
                        <button
                            onClick={onClose}
                            className="h-11 px-5 flex items-center justify-center rounded-full border border-grey-4 bg-white hover:bg-grey-5 transition-colors cursor-pointer">
                            <span className="font-red-hat-display font-semibold text-grey-0 text-[14px]">Cancel</span>
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!draftCity}
                            className={`h-11 px-5 flex items-center justify-center gap-2 rounded-full transition-all duration-300 ${
                                draftCity
                                    ? 'bg-primary-default text-white hover:bg-primary-light cursor-pointer'
                                    : 'bg-grey-4 text-grey-2 cursor-not-allowed'
                            }`}>
                            <span className="font-red-hat-display font-semibold text-[14px]">Apply</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default ExploreCityModal
