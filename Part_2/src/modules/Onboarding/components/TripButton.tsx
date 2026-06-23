import { ArrowUpRightIcon } from 'lucide-react'
import { TripFlags } from './TripFlags'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'

export const getTripName = (trip: TravelerTrip) =>
    trip.name ||
    (trip.final_destination_countries?.length === 1
        ? `${trip.final_destination_countries[0].name} Trip`
        : trip.final_destination_countries?.length > 1
          ? 'Multi-destination Trip'
          : 'Trip')

interface TripButtonProps {
    trip: TravelerTrip
    flagData?: { flags: string[] }
    onClick: () => void
    label?: string
    icon?: React.ReactNode
    className?: string
    flagSize?: number
}

export const TripButton = ({
    trip,
    flagData,
    onClick,
    label,
    icon = <ArrowUpRightIcon className="w-4 h-4 text-grey-2 shrink-0" />,
    className = '',
    flagSize,
}: TripButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-xl border border-grey-4 bg-grey-5 p-3 flex items-center gap-2 justify-between cursor-pointer hover:bg-grey-4 transition-colors text-left ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
            <TripFlags flags={flagData?.flags} size={flagSize} />
            <p className="text-left text-[12px] font-semibold font-redhat-display text-grey-0 truncate">
                {label ?? getTripName(trip)}
            </p>
        </div>
        {icon}
    </button>
)