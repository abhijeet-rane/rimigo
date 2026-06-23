/*
curl -X PUT "http://127.0.0.1:8000/api/trip-preferences/507f1f77bcf86cd799439011/" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{
       "accommodation_preferences": [
         {
           "primary_type": "cruise",
           "sub_type": "luxury_cruise"
         },
         {
           "primary_type": "camping",
           "sub_type": "glamping"
         }
       ]
     }'
*/

// list of string
export type UpdateTripPreferenceRequest = string[]

export type UpdateTripPreferenceResponse = {
    accommodation_preferences: {
        primary_type: string
        sub_type: string
    }[]
}

export const tripPreferenceAccommodationAPIAdapter = (data: UpdateTripPreferenceRequest) => {
    const accommodationPreferences = data.map((item: string) => {
        return {
            primary_type: item,
            sub_type: ''
        }
    })

    return {
        accommodation_preferences: accommodationPreferences
    }
}

export const tripPreferenceActivityAPIAdapter = (data: UpdateTripPreferenceRequest) => {
    return {
        experiences_preferences: data
    }
}
