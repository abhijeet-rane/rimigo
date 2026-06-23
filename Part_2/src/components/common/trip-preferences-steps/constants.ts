export type GroupTypeOption = {
    id: number
    labelUi: string
    backendValue: string
    image: string
}

export const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
    { id: 1, labelUi: 'Solo', backendValue: 'solo_traveler', image: 'https://media.rimigo.com/1762969143935_545c488b2df451d6871b373aa1ec848c.png' },
    { id: 2, labelUi: 'Couple', backendValue: 'couple', image: 'https://media.rimigo.com/1762969217109_2e68e0e5411a51cf9b04041e3901e117.png' },
    {
        id: 3,
        labelUi: 'Couple with children',
        backendValue: 'couple_with_children',
        image: 'https://media.rimigo.com/1762969257402_48756409664653a994914019c1cb9cb3.png'
    },
    {
        id: 4,
        labelUi: 'Family',
        backendValue: 'immediate_family',
        image: 'https://media.rimigo.com/1762969326783_a137cad155685bce96110e55f872b3af.png'
    },
    {
        id: 5,
        labelUi: 'Friends',
        backendValue: 'friends_group',
        image: 'https://media.rimigo.com/1762969349371_0e64712e5b525f2bbb8be1189d7e7220.png'
    },
    {
        id: 6,
        labelUi: 'Large group',
        backendValue: 'large_group',
        image: 'https://media.rimigo.com/1762969189746_488b2d6479045e4195e59670ca6f6dde.png'
    }
]

export type AccommodationOption = {
    id: number
    labelUi: string
    valueServer: string
    image: string
}

export const ACCOMMODATION_OPTIONS: AccommodationOption[] = [
    { id: 1, labelUi: 'Hotels', valueServer: 'hotel', image: 'https://media.rimigo.com/1762969381503_979b383adae45bd59fd46549d77bc008.png' },
    { id: 2, labelUi: 'Apartments', valueServer: 'apartment', image: 'https://media.rimigo.com/1762969408875_510e3418ed645cb39ef86268f055ecf3.png' },
    { id: 3, labelUi: 'Hostels', valueServer: 'hostel', image: 'https://media.rimigo.com/1762969437181_776c5421023659febad0f8c947abc3a5.png' },
    {
        id: 4,
        labelUi: 'Premium Hotels',
        valueServer: 'four_star_hotel',
        image: 'https://media.rimigo.com/1762969457412_348843ce12b55fd983ca4b947c1bc3be.png'
    },
    {
        id: 5,
        labelUi: 'Luxury Hotels',
        valueServer: 'five_star_hotel',
        image: 'https://media.rimigo.com/1762969457412_348843ce12b55fd983ca4b947c1bc3be.png'
    },
    {
        id: 6,
        labelUi: 'Budget Hotels',
        valueServer: 'budget_hotel',
        image: 'https://media.rimigo.com/1762969475097_db0d7a1b3ef35b0a90e69129041aaaa5.png'
    },
    {
        id: 7,
        labelUi: 'Unique Stays',
        valueServer: 'unique_stays',
        image: 'https://media.rimigo.com/1762969493399_edf6adf4c9f2548092ccc247119db364.png'
    }
]

/**
 * Allowed travel purposes per group type for the Trip Creation (lead gen) flow.
 * Only purposes in this mapping are shown in the purpose step for the given group type.
 */
export const GROUP_TYPE_TO_PURPOSES: Record<string, string[]> = {
    solo_traveler: ['leisure_relaxation', 'birthday_celebration', 'bachelor_bachelorette_trip'],
    couple: ['leisure_relaxation', 'birthday_celebration', 'anniversary_trip', 'honeymoon'],
    couple_with_children: ['leisure_relaxation', 'birthday_celebration', 'anniversary_trip'],
    immediate_family: ['leisure_relaxation', 'birthday_celebration', 'anniversary_trip', 'bachelor_bachelorette_trip'],
    friends_group: ['leisure_relaxation', 'birthday_celebration', 'bachelor_bachelorette_trip'],
    large_group: ['leisure_relaxation', 'birthday_celebration', 'bachelor_bachelorette_trip']
}
