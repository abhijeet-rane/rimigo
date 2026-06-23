/**
 * Appends date parameter to tour links based on platform
 * @param link - The original tour link URL
 * @param platform - The platform name (e.g., 'getyourguide', 'headout', 'viator', 'klook')
 * @param date - The date in YYYY-MM-DD format
 * @returns The URL with date parameter appended (if applicable for the platform)
 */
export const appendDateToTourLink = (link: string, platform: string | null | undefined, date: string | null | undefined): string => {
    if (!link || !date || !platform) {
        return link
    }

    const platformLower = platform.toLowerCase()

    try {
        const url = new URL(link)

        switch (platformLower) {
            case 'getyourguide':
                // GetYourGuide: date_from=YYYY-MM-DD
                url.searchParams.set('date_from', date)
                return url.toString()

            case 'headout':
                // Headout: ?date=YYYY-MM-DD
                url.searchParams.set('date', date)
                return url.toString()

            case 'viator':
                // Viator: None
                return link

            case 'klook':
                // TODO: Add date parameter support for Klook
                // Klook: None for now
                return link

            default:
                // For unknown platforms, return original link
                return link
        }
    } catch (error) {
        // If URL parsing fails, return original link
        console.warn('Failed to parse tour link URL:', link, error)
        return link
    }
}

