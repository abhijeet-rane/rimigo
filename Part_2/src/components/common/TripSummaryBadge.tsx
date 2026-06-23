import { TRIP_ROLE_INVITED } from '@/constants/userConfig'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { PencilIcon } from 'lucide-react'

interface TripSummaryBadgeProps {
    onEdit?: (anchorRect: DOMRect) => void
    onCreate?: (anchorRect: DOMRect) => void
}

const TripSummaryBadge = ({ onEdit, onCreate }: TripSummaryBadgeProps) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    const truncateTripName = (name: string): string => {
        if (name.length <= 20) {
            return name
        }
        // Total length should be 20: beginning + "...." + ending
        // "...." = 4 characters, so we have 16 characters for text
        // Split: 10 from beginning, 6 from end
        const beginning = name.substring(0, 10)
        const ending = name.substring(name.length - 6)
        return `${beginning}....${ending}`
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()

        if (activeTrip && onEdit) {
            onEdit(rect)
        } else if (!activeTrip && onCreate) {
            onCreate(rect)
        }
    }

    const tripTitle = (() => {
        if (!activeTrip) {
            return 'No trip created'
        }

        if (activeTrip.role === TRIP_ROLE_INVITED) {
            // For invited trips, show the traveler (trip) name
            return activeTrip.name?.trim() || 'Trip'
        }

        // Extract destination countries for owner/co_traveler
        const destinationCountries = activeTrip.final_destination_countries || []
        const countryNames = destinationCountries
            .map((country) => country?.name?.trim())
            .filter((name): name is string => Boolean(name && name.length > 0))

        // Format destination name + "Trip"
        if (countryNames.length > 1) {
            // Multiple destinations: "Japan & Thailand Trip"
            return `${countryNames.join(' & ')} Trip`
        } else if (countryNames.length === 1) {
            // Single destination: "Japan Trip"
            return `${countryNames[0]} Trip`
        }

        // Fallback if no destinations found
        return 'Trip'
    })()

    return (
        <button
            type="button"
            onClick={handleClick}
            className="hidden md:flex items-center justify-center gap-2 border border-primary-default bg-white rounded-xl px-3 h-10 cursor-pointer hover:bg-[#F0F0F0] transition-colors"
        >
            <span className="text-[12px] font-semibold leading-4 tracking-[-0.12px] font-red-hat-display text-grey-0 flex items-center gap-2">
                {activeTrip
                    ? truncateTripName(tripTitle)
                    : 'Click to create trip'}

                <PencilIcon className="w-4 h-4 text-grey-2" />
            </span>
        </button>

    )
}

export default TripSummaryBadge
