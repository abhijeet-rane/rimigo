export interface LandingTile {
    title: string
    image: string
    navigate_to: string
}

export const landingTiles: LandingTile[] = [
    {
        title: 'Shortlist the best hotels for me',
        image: 'https://media.rimigo.com/1762848186227_b6f3aa8019855a7abe6804c538e5be19.png',
        navigate_to: '/stays'
    },
    {
        title: 'Find activities that I will love',
        image: 'https://media.rimigo.com/1762848122850_1f9706a0ab065ef99860523e3b7d19f0.png',
        navigate_to: '/experiences'
    },
    {
        title: 'Discover places from real travelers',
        image: 'https://media.rimigo.com/1762848152442_a363892758a153719126e2e6d5c9e44c.png',
        navigate_to: '/watch-along'
    }
]
