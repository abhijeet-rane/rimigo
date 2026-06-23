/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DUMMY ITINERARY DATA — standalone Itinerary-Skeleton build.
 *
 * This is the single source of "trip data" for the whole app. There is no
 * backend; the mock apiClient (src/lib/api/apiClient.ts) serves these objects
 * for the `/complete/` and `/route-summary/` endpoints, and the Itinerary view
 * renders entirely from them.
 *
 * Trip: Japan — Tokyo → Hakone → Kyoto, 6 days / 5 nights (2026-09-12 → 09-17).
 */
import type { IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import type { ItineraryStay, RouteSummaryResponse } from '@/api/itineraryApi'

export const FIXTURE_ITINERARY_ID = 'RIMIGO-TRIP-DEMO000001'
const TRIP_ID = 'RIMIGO-TRIP-DEMO000001'

// --- city refs (real coordinates) -----------------------------------------
const TOKYO = { id: 'city-tokyo', name: 'Tokyo', country: 'Japan' }
const HAKONE = { id: 'city-hakone', name: 'Hakone', country: 'Japan' }
const KYOTO = { id: 'city-kyoto', name: 'Kyoto', country: 'Japan' }

export const FIXTURE_CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
    'city-tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'city-hakone': { latitude: 35.2324, longitude: 139.1069 },
    'city-kyoto': { latitude: 35.0116, longitude: 135.7681 }
}

const img = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=900&q=70`

// Photo ids chosen to be travel-relevant and stable.
const PHOTO = {
    shibuya: 'photo-1542051841857-5f90071e7989',
    sensoji: 'photo-1545569341-9eb8b30979d9',
    teamlab: 'photo-1513407030348-c983a97b98d8',
    ramen: 'photo-1557872943-16a5ac26437e',
    sushi: 'photo-1579584425555-c3ce17fd4351',
    romancecar: 'photo-1474487548417-781cb71495f3',
    openair: 'photo-1503455637927-730bce8583c0',
    lakeashi: 'photo-1490806843957-31f4c9a91c65',
    kaiseki: 'photo-1553621042-f6e147245754',
    fushimi: 'photo-1478436127897-769e1b3f0f36',
    arashiyama: 'photo-1503640538573-148065ba4904',
    gion: 'photo-1493997181344-712f2f19d87a',
    kiyomizu: 'photo-1528360983277-13d401cdc186',
    matcha: 'photo-1536013455962-d1f3b9c3a6e8',
    hotelTokyo: 'photo-1566073771259-6a8506099945',
    hotelHakone: 'photo-1582719478250-c89cae4dc85b',
    hotelKyoto: 'photo-1564501049412-61c2a3083791'
}

// --- helpers ----------------------------------------------------------------
let slotCounter = 0
const sid = () => `slot-demo-${String(++slotCounter).padStart(3, '0')}`

const experienceSlot = (
    date: string,
    order: number,
    start: string,
    end: string,
    title: string,
    photoSeed: string,
    rating: number,
    durationMin: number,
    reasons: string[]
) => ({
    slot_id: sid(),
    kind: 'experience',
    title,
    start_time: `${date}T${start}:00Z`,
    end_time: `${date}T${end}:00Z`,
    order,
    entity_id: `exp-${order}-${date}`,
    entity_model: 'experiences',
    suggestion_reasons: reasons,
    notes: null,
    slot_data: {
        id: `exp-${order}-${date}`,
        name: title,
        rating,
        duration: durationMin,
        landscape_image: img(photoSeed),
        display_props: {
            landscape_image: img(photoSeed),
            rating,
            duration: durationMin
        }
    }
})

const mealSlot = (date: string, order: number, start: string, end: string, title: string, photoSeed: string, rating: number, mealType: string, cuisine: string) => ({
    slot_id: sid(),
    kind: 'meal',
    title,
    start_time: `${date}T${start}:00Z`,
    end_time: `${date}T${end}:00Z`,
    order,
    notes: null,
    suggestion_reasons: [],
    slot_data: {
        name: title,
        rating,
        meal_type: mealType,
        cuisine,
        photo_url: img(photoSeed),
        image_url: img(photoSeed)
    }
})

const placeSlot = (date: string, order: number, start: string, end: string, title: string, photoSeed: string, rating: number, notes: string) => ({
    slot_id: sid(),
    kind: 'place',
    title,
    start_time: `${date}T${start}:00Z`,
    end_time: `${date}T${end}:00Z`,
    order,
    notes,
    suggestion_reasons: [],
    slot_data: {
        name: title,
        rating,
        photo_url: img(photoSeed),
        image_url: img(photoSeed)
    }
})

const transportSlot = (
    date: string,
    order: number,
    start: string,
    end: string,
    title: string,
    mode: string,
    from: { id: string; name: string },
    to: { id: string; name: string },
    durationMin: number
) => ({
    slot_id: sid(),
    kind: mode === 'flight' ? 'flight' : mode === 'train' ? 'train' : 'transfer',
    title,
    start_time: `${date}T${start}:00Z`,
    end_time: `${date}T${end}:00Z`,
    order,
    notes: null,
    suggestion_reasons: [],
    slot_data: {
        mode,
        // from_city / to_city are display strings (the cards call .split(',') on
        // them to drop a trailing ", Country").
        from_city: from.name,
        to_city: to.name,
        duration_minutes: durationMin
    }
})

const customSlot = (date: string, order: number, title: string, description: string, bgColor: string) => ({
    slot_id: sid(),
    kind: 'custom',
    title,
    start_time: null,
    end_time: null,
    order,
    notes: description,
    suggestion_reasons: [],
    slot_data: {
        description,
        bg_color: bgColor
    }
})

// --- flight slot (Day 1 arrival) -------------------------------------------
const flightSlot = {
    slot_id: sid(),
    kind: 'flight',
    title: 'Flight to Tokyo (NH 007)',
    start_time: '2026-09-12T06:55:00Z',
    end_time: '2026-09-12T10:25:00Z',
    order: 1,
    notes: null,
    suggestion_reasons: [],
    slot_data: {
        mode: 'flight',
        from_city: 'San Francisco',
        to_city: 'Tokyo',
        flight_data: {
            airline: 'All Nippon Airways',
            airline_logo: 'https://logos-world.net/wp-content/uploads/2023/01/ANA-Logo.png',
            flight_number: 'NH 007',
            origin: 'SFO',
            destination: 'HND',
            departure_time: '2026-09-11T11:15:00',
            arrival_time: '2026-09-12T15:25:00',
            stops: 0,
            duration: '11h 10m',
            price: 1240,
            currency: 'USD',
            cabin: 'Economy',
            booking_url: 'https://www.ana.co.jp/'
        }
    }
}

// --- days -------------------------------------------------------------------
const days: IItineraryCompletedResponse['days'] = [
    {
        date: '2026-09-12',
        base_city: TOKYO,
        type: 'arrival',
        is_checkin_day: true,
        is_checkout_day: false,
        overnight_transit: false,
        notes: 'Arrive at Haneda, settle into Shinjuku.',
        slots: [
            flightSlot,
            transportSlot('2026-09-12', 2, '11:00', '11:45', 'Airport taxi to hotel', 'taxi', { id: 'hnd', name: 'Haneda Airport' }, { id: 'shinjuku', name: 'Shinjuku' }, 45),
            placeSlot('2026-09-12', 3, '15:00', '17:00', 'Shibuya Crossing & Hachiko', PHOTO.shibuya, 4.6, 'Golden-hour people-watching at the world’s busiest crossing.'),
            mealSlot('2026-09-12', 4, '19:00', '20:30', 'Ichiran Ramen, Shibuya', PHOTO.ramen, 4.5, 'dinner', 'Japanese')
        ]
    },
    {
        date: '2026-09-13',
        base_city: TOKYO,
        type: 'stay',
        is_checkin_day: false,
        is_checkout_day: false,
        overnight_transit: false,
        notes: null,
        slots: [
            experienceSlot('2026-09-13', 1, '08:00', '09:30', 'Meiji Shrine & Yoyogi Park', PHOTO.sensoji, 4.6, 90, [
                'Forested shrine in the heart of the city — calm start to the day.'
            ]),
            placeSlot('2026-09-13', 2, '10:00', '11:30', 'Senso-ji Temple, Asakusa', PHOTO.sensoji, 4.7, 'Tokyo’s oldest temple; arrive early to beat the crowds.'),
            mealSlot('2026-09-13', 3, '12:30', '13:30', 'Sushi Omakase, Tsukiji', PHOTO.sushi, 4.8, 'lunch', 'Sushi'),
            experienceSlot('2026-09-13', 4, '15:00', '17:30', 'teamLab Planets Digital Art Museum', PHOTO.teamlab, 4.7, 150, [
                'Immersive, Instagram-famous digital art.',
                'Booked ahead — timed entry at 3 PM.'
            ]),
            experienceSlot('2026-09-13', 5, '18:00', '19:00', 'Shibuya Sky Observation Deck', PHOTO.shibuya, 4.7, 60, [
                'Sunset skyline views from the 47th floor.'
            ]),
            experienceSlot('2026-09-13', 6, '19:30', '20:30', 'Akihabara Evening Walk', PHOTO.teamlab, 4.4, 60, [
                'Neon arcades and electronics town after dark.'
            ]),
            customSlot('2026-09-13', 7, 'Activate JR Pass', 'Exchange voucher at JR East Travel Service Center before the Hakone leg.', '#EAF4FF')
        ]
    },
    {
        date: '2026-09-14',
        base_city: HAKONE,
        destination_city: HAKONE,
        type: 'transit',
        is_checkin_day: false,
        is_checkout_day: false,
        overnight_transit: false,
        notes: 'Travel to Hakone; onsen evening.',
        slots: [
            transportSlot('2026-09-14', 1, '09:30', '11:00', 'Odakyu Romancecar to Hakone', 'train', TOKYO, HAKONE, 90),
            experienceSlot('2026-09-14', 2, '13:00', '15:00', 'Hakone Open-Air Museum', PHOTO.openair, 4.6, 120, [
                'Sculpture park with Mount Hakone backdrop.'
            ]),
            mealSlot('2026-09-14', 3, '19:00', '21:00', 'Kaiseki dinner at ryokan', PHOTO.kaiseki, 4.9, 'dinner', 'Kaiseki')
        ]
    },
    {
        date: '2026-09-15',
        base_city: KYOTO,
        destination_city: KYOTO,
        type: 'transit',
        is_checkin_day: false,
        is_checkout_day: false,
        overnight_transit: false,
        notes: 'Lake Ashi cruise, then Shinkansen to Kyoto.',
        slots: [
            experienceSlot('2026-09-15', 1, '08:30', '09:15', 'Hakone Ropeway over Owakudani', PHOTO.lakeashi, 4.5, 45, [
                'Volcanic valley views and black eggs at the summit.'
            ]),
            experienceSlot('2026-09-15', 2, '09:30', '11:00', 'Lake Ashi Pirate Ship Cruise', PHOTO.lakeashi, 4.4, 90, [
                'Mount Fuji views on a clear morning.'
            ]),
            experienceSlot('2026-09-15', 3, '11:30', '12:30', 'Hakone Shrine Lakeside Torii', PHOTO.openair, 4.6, 60, [
                'Famous red torii gate standing in the lake.'
            ]),
            transportSlot('2026-09-15', 4, '14:00', '16:20', 'Shinkansen to Kyoto', 'train', HAKONE, KYOTO, 140),
            customSlot('2026-09-15', 5, 'Hotel check-in, Kyoto', 'Drop bags at the hotel near Kyoto Station before exploring Gion.', '#FFF4E6')
        ]
    },
    {
        date: '2026-09-16',
        base_city: KYOTO,
        type: 'stay',
        is_checkin_day: false,
        is_checkout_day: false,
        overnight_transit: false,
        notes: null,
        slots: [
            placeSlot('2026-09-16', 1, '08:00', '10:00', 'Fushimi Inari Shrine', PHOTO.fushimi, 4.8, 'Thousands of vermilion torii gates — go at dawn.'),
            experienceSlot('2026-09-16', 2, '10:45', '12:15', 'Kinkaku-ji (Golden Pavilion)', PHOTO.kiyomizu, 4.7, 90, [
                'Gold-leaf temple mirrored in its reflecting pond.'
            ]),
            mealSlot('2026-09-16', 3, '12:45', '13:45', 'Lunch at Nishiki Market', PHOTO.matcha, 4.5, 'lunch', 'Street Food'),
            experienceSlot('2026-09-16', 4, '14:30', '16:30', 'Arashiyama Bamboo Grove & Tenryu-ji', PHOTO.arashiyama, 4.6, 120, [
                'Bamboo forest walk plus a UNESCO Zen garden.'
            ]),
            experienceSlot('2026-09-16', 5, '17:00', '18:00', 'Nijo Castle Evening Visit', PHOTO.fushimi, 4.5, 60, [
                'Shogun’s castle with “nightingale” floors.'
            ]),
            mealSlot('2026-09-16', 6, '19:00', '21:00', 'Dinner in Gion', PHOTO.gion, 4.7, 'dinner', 'Kyoto Cuisine')
        ]
    },
    {
        date: '2026-09-17',
        base_city: KYOTO,
        type: 'departure',
        is_checkin_day: false,
        is_checkout_day: true,
        overnight_transit: false,
        notes: 'Last morning in Kyoto, then airport transfer.',
        slots: [
            placeSlot('2026-09-17', 1, '08:30', '10:00', 'Kiyomizu-dera Temple', PHOTO.kiyomizu, 4.7, 'Hillside temple with panoramic city views.'),
            mealSlot('2026-09-17', 2, '10:30', '11:15', 'Matcha & wagashi, Higashiyama', PHOTO.matcha, 4.5, 'breakfast', 'Cafe'),
            transportSlot('2026-09-17', 3, '13:00', '14:15', 'Haruka Express to Kansai Airport', 'train', KYOTO, { id: 'kix', name: 'Kansai Airport' }, 75)
        ]
    }
]

// --- stays ------------------------------------------------------------------
export const STAYS_FIXTURE: ItineraryStay[] = [
    {
        stay_id: 'stay-tokyo-1',
        accommodation_id: 'acc-tokyo-1',
        zentrum_hub_id: 'hub-tokyo',
        hotel_name: 'Park Hotel Tokyo',
        hotel_image_url: img(PHOTO.hotelTokyo),
        city_id: TOKYO.id,
        sequence: 1,
        duration: 2,
        latitude: 35.6655,
        longitude: 139.7595,
        check_in_date: '2026-09-12',
        check_out_date: '2026-09-14',
        nights: 2,
        room_type: 'Artist Room, City View',
        check_in_time: '15:00',
        check_out_time: '11:00',
        total_cost: 540,
        currency: 'USD',
        notes: null
    },
    {
        stay_id: 'stay-hakone-1',
        accommodation_id: 'acc-hakone-1',
        zentrum_hub_id: 'hub-hakone',
        hotel_name: 'Hakone Yutowa Ryokan',
        hotel_image_url: img(PHOTO.hotelHakone),
        city_id: HAKONE.id,
        sequence: 1,
        duration: 1,
        latitude: 35.2419,
        longitude: 139.1043,
        check_in_date: '2026-09-14',
        check_out_date: '2026-09-15',
        nights: 1,
        room_type: 'Japanese Suite with Onsen',
        check_in_time: '15:00',
        check_out_time: '10:00',
        total_cost: 410,
        currency: 'USD',
        notes: 'Private open-air bath.'
    },
    {
        stay_id: 'stay-kyoto-1',
        accommodation_id: 'acc-kyoto-1',
        zentrum_hub_id: 'hub-kyoto',
        hotel_name: 'The Thousand Kyoto',
        hotel_image_url: img(PHOTO.hotelKyoto),
        city_id: KYOTO.id,
        sequence: 1,
        duration: 2,
        latitude: 34.9858,
        longitude: 135.7588,
        check_in_date: '2026-09-15',
        check_out_date: '2026-09-17',
        nights: 2,
        room_type: 'Deluxe Twin, Garden View',
        check_in_time: '15:00',
        check_out_time: '11:00',
        total_cost: 620,
        currency: 'USD',
        notes: null
    }
]

// --- main fixture -----------------------------------------------------------
export const ITINERARY_FIXTURE: IItineraryCompletedResponse = {
    id: FIXTURE_ITINERARY_ID,
    trip_id: TRIP_ID,
    trip: {
        id: TRIP_ID,
        name: 'Japan: Tokyo, Hakone & Kyoto',
        trip_sequence_id: 'RIMIGO-TRIP-DEMO000001',
        status: 'completed',
        start_date: '2026-09-12',
        end_date: '2026-09-17'
    },
    title: 'Japan: Tokyo, Hakone & Kyoto',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-10T10:00:00Z',
    updated_by_traveler_at: '2026-06-10T10:00:00Z',
    updated_by_internal_user_at: null,
    updated_by_ai_at: '2026-06-05T10:00:00Z',
    status: 'completed',
    role: 'owner',
    route: {},
    details: {
        route: {
            Tokyo: { days: 3, nights: 2 },
            Hakone: { days: 1, nights: 1 },
            Kyoto: { days: 2, nights: 2 }
        }
    },
    summary: {
        total_days: 6,
        total_nights: 5,
        total_cities: 3
    },
    days,
    stays: STAYS_FIXTURE
}

// --- route summary (city/route strip) --------------------------------------
const cityRef = (c: { id: string; name: string }) => ({ id: c.id, name: c.name })

export const ROUTE_SUMMARY_FIXTURE: RouteSummaryResponse = {
    itinerary_id: FIXTURE_ITINERARY_ID,
    trip_id: TRIP_ID,
    route_chain: [
        { city: cityRef(TOKYO), nights: 2, from_date: '2026-09-12', to_date: '2026-09-14', arrived_via: null },
        {
            city: cityRef(HAKONE),
            nights: 1,
            from_date: '2026-09-14',
            to_date: '2026-09-15',
            arrived_via: { mode: 'train', duration_minutes: 90, start_time: '2026-09-14T09:30:00Z', end_time: '2026-09-14T11:00:00Z' }
        },
        {
            city: cityRef(KYOTO),
            nights: 2,
            from_date: '2026-09-15',
            to_date: '2026-09-17',
            arrived_via: { mode: 'train', duration_minutes: 140, start_time: '2026-09-15T14:00:00Z', end_time: '2026-09-15T16:20:00Z' }
        }
    ],
    stays: [
        { city: cityRef(TOKYO), from_date: '2026-09-12', to_date: '2026-09-14', nights: 2 },
        { city: cityRef(HAKONE), from_date: '2026-09-14', to_date: '2026-09-15', nights: 1 },
        { city: cityRef(KYOTO), from_date: '2026-09-15', to_date: '2026-09-17', nights: 2 }
    ],
    transits: [
        { mode: 'train', from_city: cityRef(TOKYO), to_city: cityRef(HAKONE), start_time: '2026-09-14T09:30:00Z', end_time: '2026-09-14T11:00:00Z', duration_minutes: 90, day_number: 3 },
        { mode: 'train', from_city: cityRef(HAKONE), to_city: cityRef(KYOTO), start_time: '2026-09-15T14:00:00Z', end_time: '2026-09-15T16:20:00Z', duration_minutes: 140, day_number: 4 }
    ],
    days: [
        { date: '2026-09-12', day_number: 1, day_segment: 'Tokyo', day_type: 'arrival', trajectory: [cityRef(TOKYO)], sleep_city: cityRef(TOKYO), base_city: cityRef(TOKYO), transits: [], hotel: { stay_id: 'stay-tokyo-1', hotel_name: 'Park Hotel Tokyo', city: cityRef(TOKYO), check_in_date: '2026-09-12', check_out_date: '2026-09-14', nights: 2 } },
        { date: '2026-09-13', day_number: 2, day_segment: 'Tokyo', day_type: 'stay', trajectory: [cityRef(TOKYO)], sleep_city: cityRef(TOKYO), base_city: cityRef(TOKYO), transits: [], hotel: { stay_id: 'stay-tokyo-1', hotel_name: 'Park Hotel Tokyo', city: cityRef(TOKYO), check_in_date: '2026-09-12', check_out_date: '2026-09-14', nights: 2 } },
        { date: '2026-09-14', day_number: 3, day_segment: 'Tokyo → Hakone', day_type: 'transit', trajectory: [cityRef(TOKYO), cityRef(HAKONE)], sleep_city: cityRef(HAKONE), base_city: cityRef(HAKONE), transits: [{ mode: 'train', from_city: cityRef(TOKYO), to_city: cityRef(HAKONE), start_time: '2026-09-14T09:30:00Z', end_time: '2026-09-14T11:00:00Z', duration_minutes: 90, day_number: 3 }], hotel: { stay_id: 'stay-hakone-1', hotel_name: 'Hakone Yutowa Ryokan', city: cityRef(HAKONE), check_in_date: '2026-09-14', check_out_date: '2026-09-15', nights: 1 } },
        { date: '2026-09-15', day_number: 4, day_segment: 'Hakone → Kyoto', day_type: 'transit', trajectory: [cityRef(HAKONE), cityRef(KYOTO)], sleep_city: cityRef(KYOTO), base_city: cityRef(KYOTO), transits: [{ mode: 'train', from_city: cityRef(HAKONE), to_city: cityRef(KYOTO), start_time: '2026-09-15T14:00:00Z', end_time: '2026-09-15T16:20:00Z', duration_minutes: 140, day_number: 4 }], hotel: { stay_id: 'stay-kyoto-1', hotel_name: 'The Thousand Kyoto', city: cityRef(KYOTO), check_in_date: '2026-09-15', check_out_date: '2026-09-17', nights: 2 } },
        { date: '2026-09-16', day_number: 5, day_segment: 'Kyoto', day_type: 'stay', trajectory: [cityRef(KYOTO)], sleep_city: cityRef(KYOTO), base_city: cityRef(KYOTO), transits: [], hotel: { stay_id: 'stay-kyoto-1', hotel_name: 'The Thousand Kyoto', city: cityRef(KYOTO), check_in_date: '2026-09-15', check_out_date: '2026-09-17', nights: 2 } },
        { date: '2026-09-17', day_number: 6, day_segment: 'Kyoto', day_type: 'departure', trajectory: [cityRef(KYOTO)], sleep_city: null, base_city: cityRef(KYOTO), transits: [], hotel: null }
    ]
}
