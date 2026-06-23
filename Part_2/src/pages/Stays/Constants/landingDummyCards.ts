export interface LandingCardData {
  id: number;
  title: string;
  price: number;
  image: string;
  platformReviews: Array<{ platform: string; review_count: number; rating: number; url: string; logo_url: string }>;
  locationTag: string;
  curatedLabels: Array<{ label: string; value: string | null }>;
  overallRating?: number;
}

export const LANDING_DUMMY_CARDS: LandingCardData[] = [
  {
    id: 1,
    title: 'La Maison Favart',
    price: Math.round(26059.36666666667),
    image: 'https://i.travelapi.com/lodging/3000000/2530000/2521500/2521440/3cb126cd_z.jpg',
    platformReviews: [
      { platform: 'TripAdvisor', review_count: 2412, rating: 9.4, url: '', logo_url: 'https://cdn.brandfetch.io/idRUNqV3ke/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B' },
      { platform: 'Booking.com', review_count: 832, rating: 9.0, url: '', logo_url: 'https://cdn.brandfetch.io/id9mEmLNcV/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B' },
    ],
    locationTag: 'Near City Centre',
    curatedLabels: [
      { label: 'Eiffel tower view', value: null },
      { label: 'Foodie Heaven', value: '10 Restaurants Nearby' },
      { label: 'Good Location', value: 'Near Grands Boulevards' },
    ],
    overallRating: 9.3, // 93% - Recommended
  },
  {
    id: 2,
    title: "Hôtel L'Échiquier Opéra Paris - MGallery",
    price: Math.round(11582.44),
    image: 'https://i.travelapi.com/lodging/1000000/20000/14200/14115/b015bae3_z.jpg',
    platformReviews: [
      { platform: 'Booking.com', review_count: 593, rating: 9.0, url: '', logo_url: 'https://cdn.brandfetch.io/id9mEmLNcV/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B' },
      { platform: 'TripAdvisor', review_count: 3646, rating: 9.0, url: '', logo_url: 'https://cdn.brandfetch.io/idRUNqV3ke/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B' },
    ],
    locationTag: 'Near Grands Boulevards',
    curatedLabels: [
      { label: 'Station at walkable distance', value: "300m" },
      { label: 'Good Location', value: 'Near City Centre' },
      { label: 'Foodie Heaven', value: '10 Nearby' },
    ],
    overallRating: 8.5, // 85% - Great Match
  },
  {
    id: 3,
    title: 'Les Jardins du Marais',
    price: Math.round(13811.066666666666),
    image: 'https://i.travelapi.com/lodging/1000000/30000/21000/20931/871e9ca9_z.jpg',
    platformReviews: [
      { platform: 'Trip.com', review_count: 114, rating: 7.8, url: '', logo_url: 'https://cdn.brandfetch.io/id84Kz4mXP/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B' },
    ],
    locationTag: 'Near Le Marais',
    curatedLabels: [
      { label: 'Decent hotel Views', value: null },
      { label: 'Foodie Heaven', value: '10 Nearby' },
      { label: 'Good Location', value: 'Near Le Marais' },
    ],
    overallRating: 7.5, // 75% - Good Match
  },
];
