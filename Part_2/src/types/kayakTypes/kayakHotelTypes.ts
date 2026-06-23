export interface KayakHotelSinglePolicy {
    code: string
    name: string
    description: string
}

export interface KayakHotelSingleImage {
    large: string
    small: string
    sprites: unknown[]
}

/** When response_options=images,features is used, images (and features) may be present */
export interface KayakHotelSingleData {
    id: number
    key: string
    name: string
    translatedName?: string
    address?: string
    hotelCountryCode?: string
    latitude?: number
    longitude?: number
    starRating?: number
    isSelfRated?: boolean
    lowestRate?: number | null
    isComplete?: boolean
    searchTime?: number
    totalResults?: number
    currencyCode?: string
    languageCode?: string
    countryCode?: string
    policies?: KayakHotelSinglePolicy[]
    /** Present when response_options includes images */
    images?: KayakHotelSingleImage[]
    /** Present when response_options includes features */
    features?: number[]
}

export interface KayakHotelSingleResponse {
    message: string
    response_code: string
    data: KayakHotelSingleData
}
