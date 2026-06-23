export const formatPrice = (lowerBound: number | null, upperBound: number | null, currency: string | null) => {
    if (!lowerBound || !upperBound || !currency) {
        return ''
    }

    if (lowerBound === 0 && upperBound === 0) {
        return 'Free'
    }
    if (lowerBound === upperBound) {
        return `${currency} ${lowerBound}`
    }

    if (lowerBound > 0 && upperBound > 0) {
        return `${currency} ${lowerBound} - ${currency} ${upperBound}`
    }

    if (lowerBound > 0 && upperBound === 0) {
        return `${currency} ${lowerBound}`
    }

    if (lowerBound === 0 && upperBound > 0) {
        return `${currency} ${upperBound}`
    }
}
