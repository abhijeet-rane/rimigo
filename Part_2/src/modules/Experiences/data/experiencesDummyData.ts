import { ExperienceCardData } from '../types/experienceCardTypes'

export const experiencesDummyData: ExperienceCardData[] = [
    {
        id: '1',
        title: "Experience Japan's sacred Mount Fuji",
        // location: 'Tokyo',
        price: {
            lower_bound: 0,
            upper_bound: 10000,
            currency: 'INR'
        },
        image: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=400&fit=crop&crop=center',
        city_name: 'Tokyo',
        city_id: '1',
        suggestion_priority: 0,
        short_description: "Experience Japan's sacred Mount Fuji",
        category: 'Landmarks',
        categoryBackendValue: 'landmarks',
        categoryIcon: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=400&fit=crop&crop=center'
    },
    {
        id: '2',
        title: 'Explore the ancient temples of Kyoto',
        // location: 'Kyoto',
        price: {
            lower_bound: 2000,
            upper_bound: 8000,
            currency: 'INR'
        },
        image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=400&fit=crop&crop=center',
        city_name: 'Kyoto',
        city_id: '2',
        suggestion_priority: 2,
        short_description: 'Explore the ancient temples of Kyoto',
        category: 'Landmarks',
        categoryBackendValue: 'landmarks',
        categoryIcon: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=400&fit=crop&crop=center'
    },
    {
        id: '3',
        title: 'Discover the vibrant streets of Shibuya',
        // location: 'Tokyo',
        price: {
            lower_bound: 1500,
            upper_bound: 5000,
            currency: 'INR'
        },
        image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop&crop=center',
        city_name: 'Tokyo',
        city_id: '3',
        suggestion_priority: 4,
        short_description: 'Discover the vibrant streets of Shibuya',
        category: 'Landmarks',
        categoryBackendValue: 'landmarks',
        categoryIcon: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop&crop=center'
    }
]
