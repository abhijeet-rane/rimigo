/**
 * Formats identifier string to proper title
 * Converts "photoshoot-around-eiffel-tower-with-55-edited-photos" to "Photoshoot Around Eiffel Tower With 55 Edited Photos"
 */
export const formatIdentifierToTitle = (identifier: string): string => {
    if (!identifier) return ''
    return identifier.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export const convertToLowerCase = (text: string) => {
    return text.toLowerCase()
}
