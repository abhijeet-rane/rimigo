import React, { useRef, useState } from 'react'
import { User } from 'lucide-react'
import { GuestsModal, type GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import CustomShimmer from '@/components/shared/Shimmer'
import FilterChip from './FilterChip'

interface GuestsFilterChipProps {
    guestsData: GuestsData
    guestsDisplay: string
    onApply: (data: GuestsData) => void
    isLoading?: boolean
}

const GuestsFilterChip: React.FC<GuestsFilterChipProps> = ({ guestsData, guestsDisplay, onApply, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    if (isLoading) {
        return <CustomShimmer height={32} radius={999} className="w-[150px]" />
    }

    return (
        <>
            <FilterChip
                ref={buttonRef}
                icon={<User className="w-4 h-4 text-grey-2 shrink-0" />}
                label={guestsDisplay}
                onClick={() => setIsOpen(true)}
            />
            {isOpen && (
                <GuestsModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    initialData={guestsData}
                    onApply={onApply}
                    anchorRef={buttonRef}
                    usePortal={true}
                    positionOffset="bottom-left"
                />
            )}
        </>
    )
}

export default GuestsFilterChip
