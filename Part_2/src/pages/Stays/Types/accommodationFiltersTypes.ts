// Accommodation Filters Types

export interface PropertyType {
  id: string;
  label: string;
  icon_url: string;
}

export interface Amenity {
  unique_id: string;
  label: string;
}

export interface Amenities {
  primary: Amenity[];
  essentials: Amenity[];
  features: Amenity[];
  location: Amenity[];
  services: Amenity[];
}

export interface AccommodationFiltersData {
  property_types: PropertyType[];
  amenities: Amenities;
  vague_search_enabled: boolean;
}

export interface AccommodationFiltersResponse {
  message: string;
  response_code: string;
  data: AccommodationFiltersData;
}

