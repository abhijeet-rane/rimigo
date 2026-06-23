import { useEffect, useState } from 'react'
import { useToursForExperience } from '@/modules/Experiences/hooks/useToursForExperience'
import ToursSection, { TourCardShimmer } from '@/modules/Experiences/components/ExperienceDetails/sections/ToursModalItem'
import { useSortedToursByPriority } from '@/modules/Experiences/hooks/useSortedToursByPriority'

interface ToursCardProps {
    experienceId: string
    bookingWindow: any
    isPublicView?: boolean
    onEmptyChange?: (isEmpty: boolean) => void
    triggerType?:string
    /** When 'list', tours render as a vertical row list (mobile sneak-peek
     * pattern: platform logo + price + "View Deal" button per row).
     * Default 'carousel' keeps the existing horizontal carousel layout. */
    viewMode?: 'carousel' | 'list'
}

const ToursCardModal: React.FC<ToursCardProps> = ({ experienceId, bookingWindow, isPublicView = false, onEmptyChange ,triggerType, viewMode = 'carousel' }) => {
    const { tours, isLoading, isPolling } = useToursForExperience(experienceId, isPublicView)

    const [visible, setVisible] = useState(false)

    const sortedTours = useSortedToursByPriority(tours)
    

    useEffect(() => {
        if (!isLoading) {
            setVisible(true)
            onEmptyChange?.(tours.length === 0)
        }
    }, [isLoading, tours.length, onEmptyChange])
    if (!visible) {
        return (
            <div className="flex gap-3 overflow-hidden">
                <TourCardShimmer />
                <TourCardShimmer />
                <TourCardShimmer />
            </div>
        )
    }

    // ✅ EMPTY STATE
    if (!isLoading && tours.length === 0) {
        return null
    }

    return (
        // List view uses its own gray-bg container (matches stays-tab deals);
        // carousel view keeps the white-card surround it had before.
        <div className={viewMode === 'list' ? '' : 'bg-white rounded-xl p-4'}>
            <ToursSection
                tours={sortedTours}
                isLoading={isLoading}
                isPolling={isPolling}
                bookingWindow={bookingWindow}
                setIsVisible={setVisible}
                isPublicView={isPublicView}
                triggerType={triggerType}
                experienceId={experienceId}
                viewMode={viewMode}
            />
        </div>
    )
}

export default ToursCardModal
