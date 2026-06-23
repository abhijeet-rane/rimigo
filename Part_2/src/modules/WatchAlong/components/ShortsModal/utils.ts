/**
 * Extract video ID from YouTube Shorts URL
 */
export const extractVideoId = (url: string): string | null => {
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?&]+)/)
    if (shortsMatch && shortsMatch[1]) {
        return shortsMatch[1]
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}
