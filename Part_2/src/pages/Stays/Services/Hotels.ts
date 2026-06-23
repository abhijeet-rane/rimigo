const AUTOSUGGEST_ENDPOINT = 'https://autosuggest.travel.zentrumhub.com/api/locations/locationcontent/autosuggest'

export interface HotelSuggestion {
    id: string
    name: string
    fullName: string
    type: string
    city?: string
    state?: string
    country?: string
    referenceId?: string
    coordinates?: {
        lat: number
        long: number
    }
    referenceScore?: number
}

interface AutosuggestResponse {
    locationSuggestions?: HotelSuggestion[]
    status?: string
}

export const searchHotelSuggestions = async (term: string): Promise<HotelSuggestion[]> => {
    if (!term || !term.trim()) {
        return []
    }

    try {
        const url = new URL(AUTOSUGGEST_ENDPOINT)
        url.searchParams.set('term', term.trim())

        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                Origin: 'https://app.rimigo.com',
                Referer: 'https://app.rimigo.com/'
            },
            credentials: 'omit',
            mode: 'cors'
        })

        if (!response.ok) {
            console.error('[searchHotelSuggestions] Request failed', response.status, response.statusText)
            return []
        }

        const data: AutosuggestResponse = await response.json()
        if (!data?.locationSuggestions) {
            return []
        }

        return data.locationSuggestions.filter((suggestion) => suggestion.type?.toLowerCase() === 'hotel')
    } catch (error) {
        console.error('[searchHotelSuggestions] Error fetching hotel suggestions:', error)
        return []
    }
}
