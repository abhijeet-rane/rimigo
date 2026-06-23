/**
 * AI-concierge prompt to schedule shortlisted activities into the itinerary.
 * Shared by the Activities "Add with AI" and the wishlist "Schedule with AI"
 * CTAs so the wording stays in sync.
 * `scope`: optional location with leading space, e.g. " in Paris" (trip-wide if omitted).
 */
export const buildScheduleShortlistPrompt = (count: number, scope = ''): string =>
    `Please add my ${count} shortlisted ${count === 1 ? 'activity' : 'activities'}${scope} to my itinerary, fitting them across the days that make sense for the trip.`
