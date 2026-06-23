import React, { useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import CustomShimmer from '@/components/shared/Shimmer'
import FilterChip from './FilterChip'
import StaysTabFilterModal, { type BudgetRange } from './StaysTabFilterModal'
import type { GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'

interface StaysTabFilterProps {
    cityId: string
    checkIn: string
    checkOut: string
    guestsData: GuestsData
    currentRange?: BudgetRange
    onApply: (range: BudgetRange) => void
    isLoading?: boolean
    tripId?: string
    existingStayBudgetRange?: {
        min: number
        max: number
        city_wise_preferences?: Record<string, BudgetRange>
    }
    onSavedToTrip?: (range: BudgetRange) => void
}

const StaysTabFilter: React.FC<StaysTabFilterProps> = ({
    cityId,
    checkIn,
    checkOut,
    guestsData,
    currentRange,
    onApply,
    isLoading,
    tripId,
    existingStayBudgetRange,
    onSavedToTrip,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    if (isLoading) {
        return <CustomShimmer height={32} radius={999} className="w-[100px]" />
    }

    const canOpen = Boolean(cityId && checkIn && checkOut)

    return (
        <>
            <FilterChip
                ref={buttonRef}
                icon={<SlidersHorizontal className="w-4 h-4 text-grey-2 shrink-0" />}
                label="Filters"
                onClick={() => {
                    if (canOpen) setIsOpen(true)
                }}
            />
            {/* Always mounted so AnimatePresence inside sees isOpen flip from false → true
                and runs the enter animation. */}
            <StaysTabFilterModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                anchorRef={buttonRef}
                cityId={cityId}
                checkIn={checkIn}
                checkOut={checkOut}
                guestsData={guestsData}
                initialRange={currentRange}
                onApply={onApply}
                tripId={tripId}
                existingStayBudgetRange={existingStayBudgetRange}
                onSavedToTrip={onSavedToTrip}
            />
        </>
    )
}

export default StaysTabFilter
