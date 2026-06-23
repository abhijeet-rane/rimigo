import React, { useRef, useState } from 'react'
import { RoomsModal } from './RoomsModal'
import CustomShimmer from '@/components/shared/Shimmer'
import FilterChip from './FilterChip'

interface RoomsFilterChipProps {
    rooms: number
    onApply: (rooms: number) => void
    isLoading?: boolean
}

const BedIcon = () => (
    <svg className="w-4 h-4 text-grey-2 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 8.667h12V13H2V8.667Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.333 6v2.667h9.334V6a1.333 1.333 0 0 0-1.334-1.333H4.667A1.333 1.333 0 0 0 3.333 6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 13v1M14 13v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
)

const RoomsFilterChip: React.FC<RoomsFilterChipProps> = ({ rooms, onApply, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    if (isLoading) {
        return <CustomShimmer height={32} radius={999} className="w-[100px]" />
    }

    return (
        <>
            <FilterChip
                ref={buttonRef}
                icon={<BedIcon />}
                label={`${rooms} ${rooms === 1 ? 'room' : 'rooms'}`}
                onClick={() => setIsOpen(true)}
            />
            {isOpen && (
                <RoomsModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    initialRooms={rooms}
                    onApply={onApply}
                    anchorRef={buttonRef}
                    usePortal={true}
                    positionOffset="bottom-left"
                />
            )}
        </>
    )
}

export default RoomsFilterChip
