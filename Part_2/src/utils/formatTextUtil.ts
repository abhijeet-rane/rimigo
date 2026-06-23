export const convertAllTextToUpperCase = (text: string) => {
    return text.toUpperCase()
}

export const capitalizeFirstLetterOfEachWord = (text: string) => {
    if (!text) return ''
    return text
        .split(' ')
        .map((word) => {
            if (word.length === 0) return word
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join(' ')
}

/**
 * Capitalize only the first character of a string, leaving the rest
 * untouched. Safer than ``capitalizeFirstLetterOfEachWord`` for
 * free-form slot titles and place names where intentional casing
 * matters (``teamLab Borderless``, ``iPhone``, ``Yanaka``). Skips
 * strings whose first char isn't a lowercase ASCII letter, so
 * non-Latin names and already-capitalized strings pass through
 * unchanged.
 */
export const capitalizeFirstLetter = (text: string | null | undefined): string => {
    if (!text) return ''
    const first = text.charAt(0)
    if (first >= 'a' && first <= 'z') {
        return first.toUpperCase() + text.slice(1)
    }
    return text
}
