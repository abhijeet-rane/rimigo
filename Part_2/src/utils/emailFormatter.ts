/**
 * Formats and sanitizes an email address before sending to the API
 * - Trims whitespace
 * - Converts to lowercase
 * - Returns empty string if email contains placeholder.com
 * - Returns empty string if email is invalid or empty
 *
 * @param email - The email address to format
 * @returns Formatted email string or empty string
 */
export const formatEmail = (email: string | null | undefined): string => {
    if (!email) return ''

    // Trim whitespace
    const trimmedEmail = email.trim()

    // Return empty if contains placeholder.com
    if (trimmedEmail.includes('placeholder.com')) {
        return ''
    }

    // Convert to lowercase
    const lowercasedEmail = trimmedEmail.toLowerCase()

    // Basic email validation - check if it looks like an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(lowercasedEmail)) {
        return ''
    }

    return lowercasedEmail
}

/**
 * Checks if an email should be displayed (not a placeholder)
 * @param email - The email address to check
 * @returns true if email should be displayed, false otherwise
 */
export const shouldDisplayEmail = (email: string | null | undefined): boolean => {
    if (!email) return false
    return !email.includes('placeholder.com')
}
