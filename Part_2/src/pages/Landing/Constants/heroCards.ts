import { EXPERIENCE_JAPAN_1, EXPERIENCE_JAPAN_2, EXPERIENCE_JAPAN_3 } from "@/constants/icons/svgFromCDN"

export type HeroCard = {
    key: string
    title: string
    subtitle: string
    images: string[]
    route: string
    imageType: 'portrait' | 'landscape'
    showOverlay?: boolean
}

export const HERO_CARD_COPY: HeroCard[] = [
    {
        key: 'itinerary',
        title: 'Create customised itineraries',
        subtitle: 'Plan the perfect route & schedule',
        images: ['https://media.rimigo.com/1768814285647_itineary_card_img1.webp',
            'https://media.rimigo.com/1768814286080_itineary_card_img2.webp',
            'https://media.rimigo.com/1768814286443_itineary_card_img3.webp',
            'https://media.rimigo.com/1768814286736_itineary_card_img4.webp'
        ],
        route: '/tripboard',
        imageType: 'portrait',
    },
    {
        key: 'experiences',
        title: 'Curated activities for you',
        subtitle: 'Find top attractions to local hidden gems',
        images: [
            EXPERIENCE_JAPAN_1,
            EXPERIENCE_JAPAN_2,
            EXPERIENCE_JAPAN_3
        ],
        route: '/experiences',
        imageType: 'landscape',
    },
    {
        key: 'stays',
        title: 'Handpicked hotels for you',
        subtitle: 'Verified stays across locations',
        images: [
            'https://i.travelapi.com/lodging/2000000/1320000/1312500/1312493/d28c8420_z.jpg',
            'https://i.travelapi.com/lodging/1000000/570000/562200/562175/a69f1506_z.jpg',
            'https://i.travelapi.com/lodging/2000000/1560000/1558900/1558877/c0baeb0c_z.jpg'
        ],
        route: '/stays',
        imageType: 'landscape',
    }
]
