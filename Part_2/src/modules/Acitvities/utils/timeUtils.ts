export const getCurrentMonth = () => {
    const today = new Date()
    return today.getMonth()
}

export const getCurrentMonthName = () => {
    const today = new Date()
    return today.toLocaleString('default', { month: 'long' })
}
