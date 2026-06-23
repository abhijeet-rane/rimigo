/**
 * Mock for itinerary generation loader — use for UI development with dummy data.
 * Set MOCK_ITINERARY_LOADER to true to always show the loader on the itinerary page.
 * Revert to false when done; all mock data lives here for easy regeneration.
 */

export const MOCK_ITINERARY_LOADER = false

export const MOCK_LOADER_TOTAL_DAYS = 7

export const MOCK_LOADER_CITIES = [
    {
        name: 'Paris',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
        lat: 48.8566,
        lng: 2.3522,
        nights: 2,
        id: 'paris-mock'
    },
    {
        name: 'Lyon',
        image: 'https://images.unsplash.com/photo-1536304929831-6e3a9e713e3d?w=400&h=300&fit=crop',
        lat: 45.764,
        lng: 4.8357,
        nights: 2,
        id: 'lyon-mock'
    },
    {
        name: 'Nice',
        image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&h=300&fit=crop',
        lat: 43.7102,
        lng: 7.262,
        nights: 3,
        id: 'nice-mock'
    }
] as const

/** Dummy progress_details for ProgressCard (matches loader's ProgressDetails shape) */
export const MOCK_LOADER_PROGRESS_DETAILS = {
    current_step: 'analyzing',
    progress: [
        {
            key: 'researching',
            type: 'scanning' as const,
            ui_config: {
                title: 'Researching destinations',
                description: 'Finding the best spots for your trip',
                databaseText: 'Searching 10,000+ experiences',
                providersText: 'Checking availability',
                queries: ['Paris city guide', 'Lyon food tours', 'Nice beaches']
            }
        },
        {
            key: 'analyzing',
            type: 'analyzing' as const,
            ui_config: {
                title: 'Building your itinerary',
                description: 'Matching experiences to your preferences',
                chips: [
                    { text: 'Food & dining', kind: 'success' },
                    { text: 'Culture', kind: 'default' },
                    { text: 'Outdoors', kind: 'default' }
                ],
                progressText: 'Selecting top activities for each day…'
            }
        },
        {
            key: 'finalizing',
            type: 'finalizing' as const,
            ui_config: {
                title: 'Finalizing',
                description: 'Adding times and tips',
                text: 'Almost there…'
            }
        }
    ]
}
