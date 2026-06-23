export const PROVIDER_LOGOS = {
    AGODA: 'https://cdn.brandfetch.io/idrJbkwvG0/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1724730109428',
    TRIP_COM: 'https://cdn.brandfetch.io/id84Kz4mXP/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1667617798753',
    BOOKING: 'https://cdn.brandfetch.io/id9mEmLNcV/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B',
    RIMIGO: 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_favicon_purple_transparent_bg.png',
    EXPEDIA: 'https://cdn.brandfetch.io/idAGaivHFH/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1740983477322',
    MAKE_MY_TRIP:
        'https://brandfetch.com/makemytrip.com?view=library&library=default&collection=logos&asset=ideTNivz-j&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmakemytrip.com&utm_medium=copyAction&utm_campaign=brandPageReferral',
    GOOGLE: 'https://cdn.brandfetch.io/google.com',
    HEADOUT: 'https://cdn.brandfetch.io/headout.com',
    GETYOURGUIDE: 'https://cdn.brandfetch.io/getyourguide.com',
    HOTELS_COM:"https://cdn.brandfetch.io/id-Jaka7NL/w/1036/h/1036/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1752726775702", 
    YATRA:"https://cdn.brandfetch.io/idoWt1tcYz/w/192/h/192/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1667566469652",
    MMT:"https://cdn.brandfetch.io/idC6eY3m41/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1668516572029",
    GOIBIBO: "https://cdn.brandfetch.io/idBNy6nPci/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1723428615397",
    SKYSCANNER: "https://cdn.brandfetch.io/id3CVTZRBi/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1772097415164"
} as const

export const PROVIDER_HORIZONRAL_LOGOS = {
    AGODA: 'https://cdn.brandfetch.io/idrJbkwvG0/w/1814/h/278/theme/dark/idpRLHNwl_.png?c=1bxid64Mup7aczewSAYMX&t=1724730083537',
    TRIP_COM: 'https://cdn.brandfetch.io/id84Kz4mXP/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1667617798974',
    BOOKING: 'https://cdn.brandfetch.io/id9mEmLNcV/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1725855392241',
    RIMIGO: '/icons/logo-transparent-indigo.png',
    EXPEDIA: 'https://cdn.brandfetch.io/idAGaivHFH/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1740983492139',
    MAKE_MY_TRIP:
        'https://brandfetch.com/makemytrip.com?view=library&library=default&collection=logos&asset=ideTNivz-j&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmakemytrip.com&utm_medium=copyAction&utm_campaign=brandPageReferral',
    GOOGLE: 'https://cdn.brandfetch.io/google.com',
    HEADOUT: 'https://cdn.brandfetch.io/headout.com',
    GETYOURGUIDE: 'https://cdn.brandfetch.io/getyourguide.com',
    SKYSCANNER: 'https://cdn.brandfetch.io/id3CVTZRBi/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1772097390645'
} as const

export type ProviderName = keyof typeof PROVIDER_LOGOS
export type ProviderHorizontalName = keyof typeof PROVIDER_HORIZONRAL_LOGOS
