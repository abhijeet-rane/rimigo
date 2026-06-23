export const KAYAK_PRIMARY_PLACE_TYPES = [
    'airport',
    'city',
    'country',
    'hotel',
    'trainstation',
    'region',
    'neighborhood',
    'landmark',
    'nationalpark',
    'island'
] as const

export type KayakPrimaryPlaceType = (typeof KAYAK_PRIMARY_PLACE_TYPES)[number]

export interface KayakAutocompleteDisplayPlaceType {
    type: string
    displayName: string
}

export interface KayakAutocompleteLocation {
    latitude: number
    longitude: number
}

export interface KayakAutocompleteResultItem {
    placeId: number
    primaryPlaceType: KayakPrimaryPlaceType
    displayPlaceType: KayakAutocompleteDisplayPlaceType
    name: string
    fullName: string
    location: KayakAutocompleteLocation
    places: string[]
    entityKey: string
    hotelName: string
    countryName: string
    countryCode: string
    regionName: string
    cityName: string
    cityId: number
    hotelId: number
}

export interface KayakAutocompleteData {
    results: KayakAutocompleteResultItem[]
}

export interface KayakAutocompleteResponse {
    message: string
    response_code: string
    data: KayakAutocompleteData
}
