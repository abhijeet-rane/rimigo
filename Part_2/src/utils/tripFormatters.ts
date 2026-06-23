import { TravelerTrip } from "@/pages/Landing/api/travelerTrips" 

export const formatDestinationTripName = (
  tripItem?: TravelerTrip
) => {
  if (!tripItem?.final_destination_countries) return 'Trip'

  const countryNames = tripItem.final_destination_countries
    .map((country) => country?.name?.trim())
    .filter((name): name is string => Boolean(name))

  if (countryNames.length > 1) return 'Multidestination Trip'
  if (countryNames.length === 1) return `${countryNames[0]} Trip`

  return 'Trip'
}

export const formatCapitalizeFirstLetter = (
  trip?: TravelerTrip
) => {
  const name = trip?.name
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export const formatTripDropdownData = (
  trip?: TravelerTrip
) => {
  if (!trip) return ''

  const countryCount = trip.final_destination_countries?.length ?? 0

  return countryCount > 0
    ? `${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`
    : ''
}
