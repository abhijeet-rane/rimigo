
import { useTravelerTrips } from "@/pages/Landing/context/travelerTripsContext"
import Itenerary from "@/modules/Itinerary/pages/Itenerary"

const ProtectedItineraryWrapper = () => {
const { activeTrip, tripsData } = useTravelerTrips()
    return (
        <Itenerary
            itineraryIdOverride={activeTrip?.tripItinerary?.id}
            activeTrip={activeTrip}
            tripsData={tripsData}
        
        />
    )
}

export default ProtectedItineraryWrapper
