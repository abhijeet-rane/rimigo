import { Experience } from '../../../pages/Experiences/components/ExperienceCard'

// Sample data based on the Airbnb experiences shown in the image
export const airbnbOriginals: Experience[] = [
    {
        id: '1',
        title: 'Fence and take photos with Olympian Enzo Lefort',
        location: 'Paris, France',
        price: 'From ₹13,053 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isUploaded: true,
        isLiked: false
    },
    {
        id: '2',
        title: 'Dine, drink, and dance with Chef Thomas Troisgros',
        location: 'Rio de Janeiro, Brazil',
        price: 'From ₹10,903 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isLiked: true
    },
    {
        id: '3',
        title: 'Celebrate Brazilian cuisine with Kátia Barbosa',
        location: 'Rio de Janeiro, Brazil',
        price: 'From ₹7,533 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isUploaded: true,
        isLiked: false
    },
    {
        id: '4',
        title: 'Carve marble with a third-generation sculptor',
        location: 'Athens, Greece',
        price: 'From ₹5,139 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isLiked: true
    },
    {
        id: '5',
        title: 'Experience a sacred Buddhist ritual and yoga class',
        location: 'Haiya Sub-district, Thailand',
        price: 'From ₹1,057 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isLiked: true
    },
    {
        id: '6',
        title: 'Savor organic matcha in a tea ceremony in Shibuya',
        location: 'Shibuya, Japan',
        price: 'From ₹2,613 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isLiked: true
    },
    {
        id: '7',
        title: 'Prosecco Hills: discover a small producer',
        location: 'Conegliano, Italy',
        price: 'From ₹2,878 / guest',
        rating: 5.0,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        badge: { text: 'Original', type: 'original' },
        isLiked: true
    }
]

export const popularExperiences: Experience[] = [
    {
        id: '8',
        title: 'Local Food Tour with Cultural Insights',
        location: 'South Goa, India',
        price: 'From ₹1,200 / guest',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '9',
        title: 'Hidden Waterfall Adventure',
        location: 'South Goa, India',
        price: 'From ₹800 / guest',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '10',
        title: 'River Rafting Experience',
        location: 'South Goa, India',
        price: 'From ₹1,500 / guest',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '11',
        title: 'Heritage Walk Through Old Goa',
        location: 'South Goa, India',
        price: 'From ₹600 / guest',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '12',
        title: 'Street Photography Workshop',
        location: 'South Goa, India',
        price: 'From ₹2,000 / guest',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '13',
        title: 'Sunset Beach Yoga Session',
        location: 'South Goa, India',
        price: 'From ₹500 / guest',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    },
    {
        id: '14',
        title: 'Local Market Cooking Class',
        location: 'South Goa, India',
        price: 'From ₹1,800 / guest',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
        badge: { text: 'Popular', type: 'popular' },
        isLiked: true
    }
]

export const trendingExperiences: Experience[] = [
    {
        id: '15',
        title: 'Midnight Kayaking with Bioluminescence',
        location: 'Mumbai, India',
        price: 'From ₹2,500 / guest',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: false
    },
    {
        id: '16',
        title: 'Artisan Pottery Workshop',
        location: 'Delhi, India',
        price: 'From ₹1,200 / guest',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: true
    },
    {
        id: '17',
        title: 'Desert Safari with Traditional Dinner',
        location: 'Rajasthan, India',
        price: 'From ₹3,000 / guest',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: false
    },
    {
        id: '18',
        title: 'Himalayan Trekking Adventure',
        location: 'Himachal Pradesh, India',
        price: 'From ₹4,500 / guest',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: true
    },
    {
        id: '19',
        title: 'Traditional Dance Performance',
        location: 'Kerala, India',
        price: 'From ₹800 / guest',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: false
    },
    {
        id: '20',
        title: 'Wildlife Safari Experience',
        location: 'Madhya Pradesh, India',
        price: 'From ₹2,800 / guest',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        badge: { text: 'Trending', type: 'popular' },
        isLiked: true
    }
]
