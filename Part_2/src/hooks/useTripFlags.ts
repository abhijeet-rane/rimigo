import { useMemo } from 'react'
import { TravelerTrip } from '@/pages/Landing/api/travelerTrips' 
import { getTripFlags, getTripFlagsMap } from '@/utils/tripFlags'

type CountryLite = {
  country_id: string
  flag_icon_url?: string | null
}

export const useTripFlags = (
  trip?: TravelerTrip,
  countries?: CountryLite[]
) => {
  return useMemo(
    () => getTripFlags(trip, countries),
    [trip?.final_destination_countries, countries]
  )
}

export const useTripFlagsMap = (
  tripsList?: TravelerTrip[],
  countries?: CountryLite[]
) => {
  return useMemo(
    () => getTripFlagsMap(tripsList, countries),
    [tripsList, countries]
  )
}
