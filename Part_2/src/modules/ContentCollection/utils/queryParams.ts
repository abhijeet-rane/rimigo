/**
 * Utility functions for managing query parameters
 */

/**
 * Merges new query parameters with existing ones, preserving all existing params
 * @param existingParams - Current URLSearchParams object
 * @param newParams - Object with new params to add/update
 * @returns New URLSearchParams with merged params
 */
export function mergeQueryParams(
    existingParams: URLSearchParams,
    newParams: Record<string, string | string[] | null | undefined>
): URLSearchParams {
    const merged = new URLSearchParams(existingParams)

    // Add or update new params
    Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            // Remove param if value is null or undefined
            merged.delete(key)
        } else if (Array.isArray(value)) {
            // Handle array values (remove existing and add all new ones)
            merged.delete(key)
            value.forEach((v) => {
                if (v !== null && v !== undefined) {
                    merged.append(key, String(v))
                }
            })
        } else {
            // Set single value
            merged.set(key, String(value))
        }
    })

    return merged
}

/**
 * Creates a new URLSearchParams object with existing params plus new ones
 * Useful when creating params for navigation to other pages
 * @param existingParams - Current URLSearchParams object
 * @param newParams - Object with new params to add/update
 * @returns New URLSearchParams with merged params
 */
export function createMergedQueryParams(
    existingParams: URLSearchParams,
    newParams: Record<string, string | string[] | null | undefined>
): URLSearchParams {
    return mergeQueryParams(existingParams, newParams)
}
