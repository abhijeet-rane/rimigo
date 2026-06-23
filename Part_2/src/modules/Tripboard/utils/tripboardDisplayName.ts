/**
 * Centralised display-name resolution for the Tripboard page.
 *
 * One canonical chain, ordered by "how authoritative is this source":
 *   1. tripName              — useTripboardIds (active-trip context or fetched itinerary).
 *   2. activeTripName        — owner-side trip object (owner / invitee views).
 *   3. collectionTripName    — raw collection response, set for read-only viewers.
 *   4. collectionName        — traveler-collection display name.
 *   5. identifier-derived    — slug → Title Case fallback (read-only, pre-load).
 */

export interface TripboardDisplayNameInputs {
    tripName?: string | null
    activeTripName?: string | null
    collectionTripName?: string | null
    collectionName?: string | null
    identifier?: string | null
}

export function resolveTripboardDisplayName(inputs: TripboardDisplayNameInputs): string | undefined {
    return (
        inputs.tripName
        || inputs.activeTripName
        || inputs.collectionTripName
        || inputs.collectionName
        || deriveNameFromIdentifier(inputs.identifier)
        || undefined
    ) ?? undefined
}

function deriveNameFromIdentifier(identifier: string | null | undefined): string | undefined {
    if (!identifier) return undefined
    const withoutSuffix = identifier.replace(/-tripboard$/i, '')
    const titled = withoutSuffix
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    return titled || undefined
}
