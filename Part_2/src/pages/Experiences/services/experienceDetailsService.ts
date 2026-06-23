import React from 'react'
import { ExperienceDetails } from '../types/experienceDetails'

// Mock service to convert simple experience to detailed experience
// In the future, this will be replaced with actual API calls
export const getExperienceDetails = async (experienceId: string): Promise<ExperienceDetails | null> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Mock detailed experience data based on the JSON structure
    const mockDetails: ExperienceDetails = {
        id: experienceId,
        name: 'Explore Shinjuku Gyoen National Garden',
        location: {
            address: '11 Naitomachi, Shinjuku City, Tokyo 160-0014, Japan',
            city: 'Tokyo',
            country: 'Japan'
        },
        price: {
            currency: 'INR',
            lower_bound: 20000,
            upper_bound: 90000
        },
        description:
            "Step into the tranquil beauty of Shinjuku Gyoen, Tokyo's serene oasis blending Japanese, English, and French garden styles. From cherry blossoms in spring to vibrant autumn hues, every season offers a breathtaking escape from the city's buzz!",
        short_description: 'Wander through lush greenery, vibrant cherry blossoms in spring, and fiery autumn leaves, making it a must-visit.',
        highlights: [
            {
                order: 1,
                text: 'The garden boasts over 1,000 cherry trees, making it a popular destination for cherry blossom viewing (hanami) during the spring months.'
            },
            {
                order: 2,
                text: 'Shinjuku Gyoen combines three distinct garden styles: Japanese traditional, English landscape, and French formal.'
            },
            {
                order: 3,
                text: 'Explore a restored Meiji-era greenhouse showcasing over 1,700 tropical and subtropical plant species year-round.'
            }
        ],
        categories: ['Nature', 'Outdoor', 'Family', 'Cultural', 'Traditional'],
        group_type_suitability: {
            families: { is_suitable: true, description: 'Perfect for families with children' },
            couples: { is_suitable: true, description: 'Romantic setting for couples' },
            solo_travelers: { is_suitable: true, description: 'Great for solo exploration' },
            groups: { is_suitable: true, description: 'Can accommodate large groups' }
        },
        seasonal_information: {
            january: {
                is_recommended: false,
                weather: {
                    minimum_temperature: 2,
                    maximum_temperature: 10,
                    average_temperature: 6,
                    temperature_unit: 'celsius',
                    precipitation_chance: 30,
                    description: 'Cold and dry, occasional light rain'
                },
                crowd_levels: {
                    level: 'low',
                    description: 'Few visitors; off-peak season'
                },
                is_peak_season: false,
                description: 'January is winter in Tokyo. The garden is open and tranquil, but floral displays are minimal.'
            },
            april: {
                is_recommended: true,
                weather: {
                    minimum_temperature: 10,
                    maximum_temperature: 20,
                    average_temperature: 15,
                    temperature_unit: 'celsius',
                    precipitation_chance: 45,
                    description: 'Mild and comfortable, with periodic rain showers'
                },
                crowd_levels: {
                    level: 'high',
                    description: 'Very crowded due to cherry blossom viewing'
                },
                is_peak_season: true,
                description: 'April is the peak for cherry blossom viewing in Shinjuku Gyoen. The garden is spectacular but very busy.'
            },
            november: {
                is_recommended: true,
                weather: {
                    minimum_temperature: 9,
                    maximum_temperature: 17,
                    average_temperature: 13,
                    temperature_unit: 'celsius',
                    precipitation_chance: 25,
                    description: 'Crisp and cool with peak autumn foliage'
                },
                crowd_levels: {
                    level: 'high',
                    description: 'Crowd levels increase during peak autumn foliage period'
                },
                is_peak_season: true,
                description: 'A highlight for autumn foliage viewing and flower exhibitions.'
            }
        },
        content: {
            verified_photos: [
                {
                    id: 'a056e164-f1de-42ae-82b0-26ed597200c9',
                    url: 'https://images4.alphacoders.com/591/thumb-1920-591810.jpg',
                    description: 'Image of Cherry Blossom Lake Bridge at Shinjuku Gyoen National Garden.'
                },
                {
                    id: '01556c62-3559-414c-948a-aad36cdf0bfb',
                    url: 'https://image.arrivalguides.com/1230x800/12/8e7f0e3b623f4b915e655f5875e95bbd.jpg',
                    description: 'Image of Shinjuku Gyoen National Garden.'
                },
                {
                    id: 'af634463-1784-4702-b0df-0d530302bf3a',
                    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Impression_of_Shinjuku_Gyoen,_Tokyo_(3).jpg',
                    description: 'Image of Pond surrounded with flowers and trees in Shinjuku Gyoen National Garden.'
                },
                {
                    id: '2487a7e7-7e90-4928-9f05-302f9c49856a',
                    url: 'https://thumbs.dreamstime.com/b/cherry-blossom-viewing-shinjuku-gyoen-national-garden-tokyo-april-japan-visitors-to-season-163477113.jpg',
                    description: 'Image of Cherry Blossoms in Shinjuku Gyoen National Garden.'
                },
                {
                    id: '10352fca-45d2-48aa-9e1f-185b3ece6f88',
                    url: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/japanese-teahouse-at-shinjuku-gyoen-national-garden-tokyo-japan-jeffrey-ross.jpg',
                    description: 'Image of Traditional Teahouse at Shinjuku Gyoen National Garden.'
                },
                {
                    id: 'b644026b-6d5a-4b29-b364-be4f5511828e',
                    url: 'https://cdn.cheapoguides.com/wp-content/uploads/sites/2/2019/10/shinjuku-gyoen-maple-tree-fall-iStock-magicflute002-1024x600.jpg',
                    description: 'Vibrant image of trees during autumn in Shinjuku Gyoen National Garden.'
                }
            ],
            instagram_reels: [
                {
                    id: '1',
                    url: 'https://www.instagram.com/reel/Cz8yO_fv4SD/',
                    description: 'Autumn Night Garden in Shinjuku Gyoen National Garden'
                },
                {
                    id: '2',
                    url: 'https://www.instagram.com/reel/Cz43q9XRatl/',
                    description: 'Tourist sharing her experience at Shinjuku Gyoen'
                },
                {
                    id: '3',
                    url: 'https://www.instagram.com/reel/C5GVyFaPVpF/',
                    description: 'Cherry Blossoms in Shinjuku Gyoen National Garden'
                },
                {
                    id: '4',
                    url: 'https://www.instagram.com/reel/C6s8L1Hv4Ko/',
                    description: 'Tourist experience at Shinjuku Gyoen National Garden'
                }
            ],
            youtube_videos: [
                {
                    id: '1',
                    url: 'https://www.youtube.com/watch?v=j7PRwoA2BIo',
                    description: "Witness Shinjuku Gyoen National Garden through a tourist's captivating video tour"
                }
            ]
        },
        transport_options: {
            description:
                'Shinjuku Gyoen National Garden is conveniently accessible via public transportation. The nearest stations are Shinjuku Station (JR lines), Shinjuku-gyoemmae Station (Tokyo Metro Marunouchi Line), and Sendagaya Station (JR Chuo-Sobu Line).',
            recommended_option: ['train', 'metro', 'walking']
        },
        timing_guide: {
            recommended_time_slots: ['morning', 'afternoon'],
            monday: {
                start_time: '9:00 AM',
                end_time: '4:00 PM',
                description: 'Garden open from 9:00 AM to 4:00 PM. Closed on Mondays unless it falls during cherry blossom or chrysanthemum seasons.',
                is_closed: false
            }
        },
        constraints: {
            age: {
                minimum: 0,
                maximum: 100,
                description: 'Visitors of all ages are welcome to explore the garden.'
            },
            mobility: {
                wheelchair_accessible: true,
                walking_required: true,
                description: 'Garden is mostly accessible with some stairs; seating and ramps available.'
            }
        }
    }

    return mockDetails
}

// Hook to manage experience details
export const useExperienceDetails = () => {
    const [selectedExperience, setSelectedExperience] = React.useState<ExperienceDetails | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)

    const openExperienceDetails = async (experienceId: string) => {
        setIsLoading(true)
        setIsSheetOpen(true)

        try {
            const details = await getExperienceDetails(experienceId)
            setSelectedExperience(details)
        } catch (error) {
            console.error('Failed to load experience details:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const closeExperienceDetails = () => {
        setIsSheetOpen(false)
        setSelectedExperience(null)
    }

    return {
        selectedExperience,
        isLoading,
        isSheetOpen,
        openExperienceDetails,
        closeExperienceDetails
    }
}
