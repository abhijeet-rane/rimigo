/**
 * Max height (px) for experience hero image when slot duration > 3 hours
 * (avoids stretched cards while still showing the image).
 */
export const HERO_IMAGE_MAX_HEIGHT_PX = 380

/**
 * Board / mobile list: when true, every experience with a landscape image uses the large hero
 * layout (ignores suggestion_priority for image size). When false, only suggestion_priority
 * 0 and 2 get the hero layout — flip to false to restore the original behavior.
 */
export const ITINERARY_BOARD_ALL_EXPERIENCE_HERO_IMAGES = true