export const isArrayExistsAndNotEmpty = (array: any[]): boolean => {
    if (!array) return false
    if (array.length === 0) return false
    return true
}

// join array of strings with a comma
export const joinArray = (array: string[], delimiter: string = ', '): string => {
    if (!array) return ''
    if (array.length === 0) return ''
    return array.join(delimiter)
}
