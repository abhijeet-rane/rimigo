import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, Minus, Plus, X, Moon } from 'lucide-react'
import { MAP_ICON } from '@/constants/thiingsIcons'
import { CityRouteItem } from '../types'

interface CityRouteListProps {
    cities: CityRouteItem[]
    onChange: (cities: CityRouteItem[]) => void
    /** Total trip nights derived from the selected date range / flexible duration. When provided, shows a warning if city nights exceed this. */
    totalTripNights?: number | null
}

const CityRouteList = ({ cities, onChange }: CityRouteListProps) => {
    const updateNights = (index: number, delta: number) => {
        const updated = [...cities]
        const current = updated[index].nights

        let newNights: number | 'auto'
        if (current === 'auto') {
            // AUTO + click "+" → set to 1
            newNights = delta > 0 ? 1 : 'auto'
        } else if (current === 1 && delta < 0) {
            // 1 + click "-" → back to AUTO
            newNights = 'auto'
        } else {
            // Normal increment/decrement clamped 1-10
            newNights = Math.max(1, Math.min(10, current + delta))
        }

        updated[index] = { ...updated[index], nights: newNights }
        onChange(updated)
    }

    const removeCity = (index: number) => {
        onChange(cities.filter((_, i) => i !== index))
    }

    const fixedNights = cities.reduce((sum, c) => sum + (typeof c.nights === 'number' ? c.nights : 0), 0)
    const autoCount = cities.filter((c) => c.nights === 'auto').length

    if (cities.length === 0) {
        return (
            <div className="bg-grey-5/50 border border-dashed border-grey-4 rounded-xl p-6 text-center">
                <img src={MAP_ICON} alt="" className="mx-auto mb-2 w-8 h-8 object-contain opacity-60" />
                <p className="text-grey-2 font-manrope font-medium" style={{ fontSize: '16px' }}>
                    Search and add cities above to build your route
                </p>
            </div>
        )
    }

    // Build summary text
    const summaryText = (() => {
        if (autoCount === cities.length) return `${cities.length} ${cities.length === 1 ? 'city' : 'cities'}`
        if (autoCount === 0) return `${fixedNights} night${fixedNights !== 1 ? 's' : ''}`
        return `${fixedNights} night${fixedNights !== 1 ? 's' : ''} + ${autoCount} flexible`
    })()

    return (
        <div>
            {/* Total summary */}
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="itinerary-heading mb-2 block">
                    Your route
                </span>
                <div className="flex items-center gap-2 text-sm sm:text-xs font-manrope text-grey-1">
                    <Moon className="w-4 h-4 sm:w-3 sm:h-3 shrink-0" />
                    <span className="font-manrope font-medium">{summaryText}</span>
                </div>
            </div>

            <Reorder.Group
                axis="y"
                values={cities}
                onReorder={onChange}
                className="space-y-2">
                {cities.map((item, index) => (
                    <CityRouteCard
                        key={item.city.cityId}
                        item={item}
                        index={index}
                        onUpdateNights={(delta) => updateNights(index, delta)}
                        onRemove={() => removeCity(index)}
                    />
                ))}
            </Reorder.Group>
        </div>
    )
}

// Individual draggable city card
const CityRouteCard = ({
    item,
    index,
    onUpdateNights,
    onRemove
}: {
    item: CityRouteItem
    index: number
    onUpdateNights: (delta: number) => void
    onRemove: () => void
}) => {
    const dragControls = useDragControls()
    const isAuto = item.nights === 'auto'

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={dragControls}
            style={{ touchAction: 'none' }}
            className="bg-white border border-grey-4 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
            {/* Drag handle */}
            <button
                onPointerDown={(e) => dragControls.start(e)}
                className="cursor-grab active:cursor-grabbing touch-none shrink-0">
                <GripVertical size={16} className="text-grey-3 sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Order number */}
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-default/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] sm:text-xs font-bold font-manrope text-primary-default">{index + 1}</span>
            </div>

            {/* City image */}
            {item.city.image ? (
                <img
                    src={item.city.image}
                    alt={item.city.cityName || ''}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0"
                />
            ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-grey-5 flex items-center justify-center shrink-0">
                    <img src={MAP_ICON} alt="" className="w-4 h-4 object-contain opacity-70" />
                </div>
            )}

            {/* City name */}
            <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold font-manrope text-grey-0 truncate">
                    {item.city.cityName}
                </p>
            </div>

            {/* Nights stepper */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                    onClick={() => onUpdateNights(-1)}
                    disabled={isAuto}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-grey-4 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-grey-5 transition-colors">
                    <Minus size={10} className="sm:w-3 sm:h-3 font-medium" />
                </button>
                <div className="w-8 sm:w-10 text-center">
                    {isAuto ? (
                        <>
                            <span className="text-xs sm:text-sm font-bold font-manrope text-grey-3">–</span>
                            <span className="text-[9px] sm:text-[10px] text-grey-2 font-manrope block -mt-0.5 font-medium">nights</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xs sm:text-sm font-bold font-manrope text-grey-0">{item.nights}</span>
                            <span className="text-[9px] sm:text-[10px] text-grey-2 font-manrope block -mt-0.5 font-medium">
                                {item.nights === 1 ? 'night' : 'nights'}
                            </span>
                        </>
                    )}
                </div>
                <button
                    onClick={() => onUpdateNights(1)}
                    disabled={typeof item.nights === 'number' && item.nights >= 10}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-grey-4 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-grey-5 transition-colors">
                    <Plus size={10} className="sm:w-3 sm:h-3 font-medium" />
                </button>
            </div>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center hover:bg-red-50 cursor-pointer transition-colors shrink-0">
                <X size={12} className="sm:w-3.5 sm:h-3.5 text-grey-3 hover:text-red-500" />
            </button>
        </Reorder.Item>
    )
}

export default CityRouteList
