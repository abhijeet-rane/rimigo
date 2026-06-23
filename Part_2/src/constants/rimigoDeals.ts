// Provider ID to Provider Name mapping
export const PROVIDER_ID_TO_NAME_MAP: Record<string, string> = {
    '1': 'TC',
    '2': 'RH',
    '3': 'TB'
}

// Reverse mapping: Provider Name to Provider ID
export const PROVIDER_NAME_TO_ID_MAP: Record<string, string> = {
    travclan: '1',
    ratehawk: '2',
    tbointl: '3'
}

// Static text for Rimigo Info Details
export const RIMIGO_INFO_LABELS = {
    PRICE_AMOUNT: 'Price Amount',
    TOTAL_PRICE: 'Total Price',
    LOWEST_PRICE_PROVIDER: 'Lowest Price Provider',
    SERVICE_CHARGE_ADDED: 'Service Charge',
    SERVICE_CHARGE_AMOUNT: 'Service Charge',
    YES: 'Yes',
    NO: 'No'
} as const

