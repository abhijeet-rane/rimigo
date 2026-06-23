export const getPlatformUpper = (platform?: string) =>
  platform?.toUpperCase?.() || ''

export const isAgodaPlatform = (platformUpper: string) =>
  platformUpper.includes('AGODA')

export const isTripPlatform = (platformUpper: string) =>
  ['TRIP', 'TRIP.COM', 'TRIP_COM'].some((n) => platformUpper.includes(n))

export const normalizePlatform = (platform?: string) => {
  const platform_upper = getPlatformUpper(platform)

  return {
    platform_upper,
    is_agoda: isAgodaPlatform(platform_upper),
    is_trip: isTripPlatform(platform_upper)
  }
}
