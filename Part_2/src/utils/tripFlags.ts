import { TravelerTrip } from "@/pages/Landing/api/travelerTrips" 
type CountryLite = {
  country_id: string
  flag_icon_url?: string | null
}

export type TripFlagsData = {
  flags: string[]
  remainingCount: number
}

export const getTripFlags = (
  trip?: TravelerTrip,
  countries?: CountryLite[]
): TripFlagsData => {
  if (!trip?.final_destination_countries || !countries) {
    return { flags: [], remainingCount: 0 }
  }

  const flags = trip.final_destination_countries
    .slice(0, 3)
    .map((country) => {
      const countryData = countries.find(
        (c) => c.country_id === country.id
      )
      return countryData?.flag_icon_url || null
    })
    .filter((flag): flag is string => Boolean(flag))

  return {
    flags,
    remainingCount: trip.final_destination_countries.length - flags.length,
  }
}

export const getTripFlagsMap = (
  tripsList?: TravelerTrip[],
  countries?: CountryLite[]
): Record<string, TripFlagsData> => {
  if (!tripsList || !countries) return {}

  const map: Record<string, TripFlagsData> = {}

  tripsList.forEach((trip) => {
    map[trip.trip_id] = getTripFlags(trip, countries)
  })

  return map
}
