/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = "INR"): string => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency,
    }).format(amount)
}

