import React from 'react'
import Typography from '@/components/shared/Typography'
import { PROVIDER_ID_TO_NAME_MAP, RIMIGO_INFO_LABELS } from '@/constants/rimigoDeals'

// --- Currency formatter (shared utility) ---
const formatCurrency = (amount: number, currency: string) => {
    if (!amount) return ''
    const rounded = Math.round(amount)
    const formatted = rounded.toLocaleString('en-IN') // adds commas like 1,23,456
    if (currency === 'INR') return `₹${formatted}`

    const symbolMap: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥'
    }
    const symbol = symbolMap[currency] || currency
    return `${symbol} ${formatted}`
}

// Helper function to get provider name from ID
const getProviderName = (providerId?: string): string => {
    if (!providerId) return providerId || ''
    return PROVIDER_ID_TO_NAME_MAP[providerId] || providerId
}

interface RimigoInfoDetailsProps {
    rimigoData: {
        price_amount?: number
        total_price?: number
        lowest_price_provider?: string
        service_charge_added?: boolean
        service_charge_added_amount?: number
    }
    currency?: string
}

const RimigoInfoDetails: React.FC<RimigoInfoDetailsProps> = ({ rimigoData, currency = 'INR' }) => {
    return (
        <div className="flex flex-col gap-2 px-3 py-2 bg-grey-5/50 border-t border-grey-4">
            <div className="flex flex-col gap-2">
                {rimigoData.price_amount !== undefined && (
                    <div className="flex flex-row justify-between items-center">
                        <Typography
                            size="11"
                            weight="medium"
                            color="grey-1"
                            family="manrope">
                            {RIMIGO_INFO_LABELS.PRICE_AMOUNT}:
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {formatCurrency(rimigoData.price_amount, currency)}
                        </Typography>
                    </div>
                )}

                {rimigoData.total_price !== undefined && (
                    <div className="flex flex-row justify-between items-center">
                        <Typography
                            size="11"
                            weight="medium"
                            color="grey-1"
                            family="manrope">
                            {RIMIGO_INFO_LABELS.TOTAL_PRICE}:
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {formatCurrency(rimigoData.total_price, currency)}
                        </Typography>
                    </div>
                )}

                {rimigoData.lowest_price_provider && (
                    <div className="flex flex-row justify-between items-center">
                        <Typography
                            size="11"
                            weight="medium"
                            color="grey-1"
                            family="manrope">
                            {RIMIGO_INFO_LABELS.LOWEST_PRICE_PROVIDER}:
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {getProviderName(rimigoData.lowest_price_provider)}
                        </Typography>
                    </div>
                )}

                {/* {rimigoData.service_charge_added !== undefined && (
                    <div className="flex flex-row justify-between items-center">
                        <Typography
                            size="11"
                            weight="medium"
                            color="grey-1"
                            family="manrope">
                            {RIMIGO_INFO_LABELS.SERVICE_CHARGE_ADDED}:
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {rimigoData.service_charge_added ? RIMIGO_INFO_LABELS.YES : RIMIGO_INFO_LABELS.NO}
                        </Typography>
                    </div>
                )} */}

                {rimigoData.service_charge_added_amount !== undefined && (
                    <div className="flex flex-row justify-between items-center">
                        <Typography
                            size="11"
                            weight="medium"
                            color="grey-1"
                            family="manrope">
                            {RIMIGO_INFO_LABELS.SERVICE_CHARGE_AMOUNT}:
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {formatCurrency(rimigoData.service_charge_added_amount, currency)}
                        </Typography>
                    </div>
                )}
            </div>
        </div>
    )
}

export default RimigoInfoDetails

