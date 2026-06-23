/**
 * Fixed content sections for automated Tripboard creation.
 * These are the same for all destinations and get added to every collection.
 */

// ─── Links (affiliate / utility links) ───────────────────────────────────────

export interface FixedLinkItem {
    title: string
    description: string
    label: string
    url: string
}

export const FIXED_LINKS: FixedLinkItem[] = [
    {
        title: 'Links',
        description:
            'Travel insurance is highly recommended for international travel to protect against medical emergencies, trip disruptions, and unexpected expenses abroad.',
        label: 'Apply Online',
        url: 'https://www.acko.com/gi/p/travel/international-insurance?utm_medium=rimigo&utm_campaign=marketing&utm_source=affiliate'
    },
    {
        title: 'Links',
        description:
            'In case you would like to pre-book airport transfers. Most destinations are well-connected via public transport. App-based taxis like Grab, Bolt etc are also easily available.',
        label: 'Apply Online',
        url: 'https://affiliate.klook.com/redirect?aid=78212&aff_adid=1155549&k_site=https%3A%2F%2Fwww.klook.com%2Fen-IN%2Fairport-transfers%2F'
    },
    {
        title: 'Links',
        description: 'Bookmyforex delivers cash to your doorstep within 24 hours (In limited cities).',
        label: 'Apply Online',
        url: 'https://www.bookmyforex.com'
    },
    {
        title: 'Links',
        description:
            'Scapia Credit Card offers high rewards in the form of Scapia Coins on everyday purchases and travel bookings, zero foreign exchange markup on international transactions, and unlimited domestic airport lounge access with spend-based privileges',
        label: 'Apply Online',
        url: 'https://apply.scapia.cards/landing_page?utm_source=Rimigo&utm_campaign=abc'
    },
    {
        title: 'Links',
        description:
            'Niyo Global Forex Card is a smart prepaid travel card that lets you load foreign currency in advance, lock exchange rates, and make seamless payments overseas with Zero forex charges. For Niyo, you can use the Rimigo Coupon code - RI100 to get a INR 100 coupon.',
        label: 'Apply Online',
        url: 'https://ctr.niyo.me/start?utm_campaign_id=NefATmhj&utm_source=Rimigo&utm_campaign=Rimigo&utm_adgroup=Mobile_Onboarding&utm_medium=ChannelPartner&utm_utr='
    }
]

// ─── Visa ─────────────────────────────────────────────────────────────────────

export const getVisaSection = (countryName: string) => ({
    title: 'Visa',
    description:
        'Visa2Fly is an online visa assistance platform that simplifies the visa application process with expert guidance, document verification, and end-to-end support for international travel.',
    label: 'Apply Online',
    url: `https://rimigo.visa2fly.com/visa/select-purpose?country=${encodeURIComponent(countryName)}`
})

// ─── Tips ─────────────────────────────────────────────────────────────────────

export interface FixedTipItem {
    label: string
    text: string
}

export const FIXED_TIPS: FixedTipItem[] = [
    {
        label: 'Activities',
        text: 'To get your preferred slots, make sure you book popular activities and attractions in advance.'
    },
    {
        label: 'Cash',
        text: 'Keep some local currency for emergencies and small shops. Most places accept cards, but cash is always handy.'
    },
    {
        label: 'Transport',
        text: 'Download local ride-hailing apps (Grab, Bolt, Uber etc.) before your trip for easy transportation.'
    },
    {
        label: 'Connectivity',
        text: 'Consider getting an eSIM or local SIM card on arrival for affordable data and calls during your trip.'
    }
]

// ─── Dos & Don'ts ─────────────────────────────────────────────────────────────

export const FIXED_DOS_DONTS = {
    dos: [
        'Respect local customs and dress codes when visiting religious sites.',
        'Use public transport where available — it is efficient and affordable.',
        'Stay hydrated and carry water, especially for outdoor activities.',
        'Keep digital and physical copies of important documents (passport, visa, insurance).'
    ],
    donts: [
        "Don't disrespect cultural and religious places.",
        "Don't litter or violate local cleanliness laws — fines can be steep.",
        "Don't eat or drink on public transport where it is prohibited.",
        "Don't leave valuables unattended in public places."
    ]
}
