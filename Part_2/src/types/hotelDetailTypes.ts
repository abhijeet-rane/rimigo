// Types based on the API response
export interface PlatformReview {
    platform: string;
    url: string;
    logo_url: string;
    review_count: number;
    rating: number;
}

export interface ReviewItem {
    summary: string;
    details: string;
    source: {
        title: string;
        url: string;
    };
}

export interface Rating {
    label: string;
    score: number;
    tag: {
        label: string;
        color: string;
    };
}

export interface HotPick {
    label: string;
    score: number;
    icon: string;
    description: string;
    tag: {
        label: string;
        color: string;
    };
}

export interface Cautions {
    title: string;
    descriptions: string[];
    mitigation_steps: string[];
}

export interface Attribute {
    label: string;
    score: number;
    icon: string;
    description: string;
    tag: {
        label: string;
        color: string;
    };
}

export interface NearbyItem {
    label: string;
    lat: number;
    long: number;
    distance_m: number;
    map_link: string;
}

export interface NearbySection {
    section_head: string;
    items: NearbyItem[];
}

export interface ImageGroup {
    type: string;
    links: string[];
}

export interface CheckInInfo {
    beginTime: string;
    endTime: string;
    instructions: string[];
    specialInstructions: string[];
    minAge: string;
}

export interface Airport {
    name: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    metro_access: boolean;
    airport_shuttle: boolean;
    avg_time_to_airport_min: number;
    transportation_options: string[];
    map_url: string;
}

export interface HotelDetailData {
    hotel_name: string;
    city: string;
    city_id?: string | null;
    review_type: string;
    review_data: {
        status: string;
        ratings: {
            overall_rating: Rating;
            top_platforms: PlatformReview[];
            reviews: {
                positives: ReviewItem[];
                negatives: ReviewItem[];
            };
        };
        hot_picks: HotPick[];
        summary_request_id: string;
        cautions: Cautions;
    };
    geoCode: {
        lat: string;
        long: string;
    };
    images: ImageGroup[];
    checkInInfo: CheckInInfo;
    checkOutInfo: {
        time: string;
    };
    starRating: string;
    category: string;
    location_tag: string[];
    attributes: Attribute[];
    curated_overall_score: number;
    nearest_airport: Airport;
    nearby_list: NearbySection[];
    amenities: string[];
    floating_questions_request_id?: string;
    is_verified?: boolean;
    is_b2b_deal_available?: boolean;
    is_available_on_airbnb?: boolean;
}
