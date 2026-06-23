import React, { useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { RoomsGuestsModal } from '@/components/common/SearchBar/modals/RoomsGuestsModal'
import CustomShimmer from '@/components/shared/Shimmer'
import FilterChip from './FilterChip'
import type { OccupanciesConfig } from '@/types/occupancy'
import { flattenOccupancies } from '@/types/occupancy'

interface RoomsGuestsFilterChipProps {
    occupancies: OccupanciesConfig
    onApply: (data: OccupanciesConfig) => void
    isLoading?: boolean
    tripId?: string
    existingGroupSetup?: { adults?: number; children?: number; infants?: number; children_age?: number[] } | null
    onSavedToTrip?: (data: OccupanciesConfig) => void
}

const RoomsGuestsFilterChip: React.FC<RoomsGuestsFilterChipProps> = ({
    occupancies,
    onApply,
    isLoading,
    tripId,
    existingGroupSetup,
    onSavedToTrip,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    if (isLoading) {
        return <CustomShimmer height={32} radius={999} className="w-[180px]" />
    }

    const flat = flattenOccupancies(occupancies)
    const totalGuests = flat.adults + flat.children
    const label = `${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}, ${occupancies.length} ${occupancies.length === 1 ? 'room' : 'rooms'}`

    return (
        <>
            <FilterChip
                ref={buttonRef}
                icon={<Users className="w-4 h-4 text-grey-2 shrink-0" />}
                label={label}
                onClick={() => setIsOpen(true)}
            />
            {isOpen && (
                <RoomsGuestsModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    initialOccupancies={occupancies}
                    onApply={onApply}
                    anchorRef={buttonRef}
                    usePortal={true}
                    positionOffset="bottom-left"
                    tripId={tripId}
                    existingGroupSetup={existingGroupSetup}
                    onSavedToTrip={onSavedToTrip}
                />
            )}
        </>
    )
}

export default RoomsGuestsFilterChip
