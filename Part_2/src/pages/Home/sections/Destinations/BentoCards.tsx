import { CREATOR_PHOTOS } from "@/constants"
import { CARD_STATUES } from "@/constants/icons/svgUrls"
import { PROVIDER_LOGOS } from "@/constants/providerLogos"
import {
  CLOCK_THIINGS_ICON,
  EARTH_THIINGS_ICON,
  GROUP_OF_PPL_THIINGS,
  MAP_THIINGS_ICON,
} from "@/constants/thiingsIcons"

const PARTNER_LOGOS = [
    PROVIDER_LOGOS.TRIP_COM,
    PROVIDER_LOGOS.BOOKING,
    PROVIDER_LOGOS.GETYOURGUIDE,
    PROVIDER_LOGOS.EXPEDIA,
]

const CREATOR_THUMBNAIL = [
  CREATOR_PHOTOS.life2Wander,
  CREATOR_PHOTOS.escapetolandscapes,
  CREATOR_PHOTOS.wanderlust_himani_hero,
  CREATOR_PHOTOS.wanderfulpassport_hero,
]

export const LargeBentoText ={
  number: '₹17 Lakhs+',
  heading: 'Saved by travelers',
  description: 'By finding the best available price and special deals',
}


export const getBentoCards = () => [
  {
    id: "itineraries",
    className: "col-span-12 md:col-span-3 bg-white p-6 border border-grey-4",
    titleNumber: "13,175+",
    titleText: "Travelers assisted",
    description: "Guided using real traveler insights and expert intelligence",
    images: [
      CARD_STATUES.statue,
      CARD_STATUES.eiffel_tower,
      CARD_STATUES.rome,
    ]
  },
  {
    id: "group-planning",
    className: "col-span-12 md:col-span-3 bg-white p-6 border border-grey-4",
    icon: GROUP_OF_PPL_THIINGS,
    titleNumber: "38+",
    titleText: "Trusted travel partnerships",
    description: "Building new partnerships to offer better deals",
    images: PARTNER_LOGOS.slice(0, 4)
  },
  {
    id: "support",
    className: "col-span-12 md:col-span-3 bg-white p-6 border border-grey-4",
    icon: CLOCK_THIINGS_ICON,
    titleNumber: "58+",
    titleText: "Travel experts",
    description: "Access recommendations from experienced travelers",
    images: CREATOR_THUMBNAIL.slice(0, 4)
  },
  {
    id: "destinations",
    className: "col-span-12 md:col-span-3 bg-white p-6 border border-grey-4",
    icon: EARTH_THIINGS_ICON,
    titleNumber: "1061",
    titleText: "Trips planned worldwide",
    description: "Helping travelers plan across 100 countries and counting",
    images: [
      EARTH_THIINGS_ICON,
      MAP_THIINGS_ICON,
    ]
  }
]