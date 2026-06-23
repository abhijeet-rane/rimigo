/** Default tab to open after tripboard creation */
export const POST_CREATE_DEFAULT_TAB = 'itinerary'

/** Tripboard redirect URL after creation flows */
export const TRIPBOARD_POST_CREATE_URL = `/tripboard?tab=${POST_CREATE_DEFAULT_TAB}`

/**
 * sessionStorage key set by post-create redirect flows to signal that the
 * floating AI assistant should auto-pop on the next TripboardHeader mount.
 * One-shot — TripboardHeader read-and-removes it on mount.
 */
export const POST_CREATE_EXPAND_ASSISTANT_KEY = 'rimigo:postCreate:expandAssistant'

/** Show the Overview tab on the tripboard page. Toggle off to hide it; other
 *  surfaces (e.g. content collection viewer) are not affected by this flag. */
export const SHOW_TRIPBOARD_OVERVIEW_TAB = false
