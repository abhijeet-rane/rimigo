/**
 * Generate airline logo URL from Travclan pattern
 * Pattern: https://assets.travclan.com/unsafe/64x64/smart/https://s3.ap-south-1.amazonaws.com/com.travclan.flight/airline/{AIRLINE_CODE}.png
 */
export const getAirlineLogoUrl = (airlineCode: string): string => {
    return `https://assets.travclan.com/unsafe/64x64/smart/https://s3.ap-south-1.amazonaws.com/com.travclan.flight/airline/${airlineCode}.png`
}

/**
 * Get airline logo with fallback handling
 * Returns the logo URL, but components should handle image errors gracefully
 */
export const getAirlineLogo = (airlineCode: string): string => {
    return getAirlineLogoUrl(airlineCode)
}

