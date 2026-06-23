import { Atom, BadgePercent } from "lucide-react"
import { Feature } from "../types/feature"

export const FAQ_HEADER = "Curious? We've got the answers."

export const faqItems = [
  {
      value: 'item-1',
      title: 'Is the ₹5,000 fee per person or per trip?',
      content:
          'It is not per person - it is a flat membership fee that covers unlimited trips for you and your travel group for 1 full year.',
  },
  {
      value: 'item-2',
      title: 'How does the "Human Travel Expert" support work?',
      content:
          'You are paired with a dedicated travel professional who learns your style, builds your custom itineraries, and provides one-on-one guidance throughout your planning process.',
  },
  {
      value: 'item-3',
      title: 'Can I really get unlimited itinerary changes?',
      content:
          'Yes. Your expert will refine your route, daily schedule, and activities as many times as you like until you are 100% satisfied with the plan.',
  },
  {
      value: 'item-4',
      title: 'Does Rimigo make the bookings for me?',
      content:
          'We provide expert-led booking support where we verify your choices and guide you through the process to ensure accuracy in bookings.',
  },
  {
      value: 'item-5',
      title: 'How does the "On-trip support" help if my plans change?',
      content:
          'If you face a delay or want to change your mood mid-trip, your expert is available 24/7 to update your logistics and find real-time solutions so you stay stress-free.',
  },
  {
      value: 'item-6',
      title: 'What kind of "Exclusive Deals" do members receive?',
      content:
          'We scan 50+ travel platforms to find insider rates and member-only pricing on flights, hotels, and attractions that are often not available to the general public.',
  },
  {
      value: 'item-7',
      title: 'Is the ₹5,000 fee a one-time payment?',
      content:
          'The ₹5,000 premium membership covers 1 year of unlimited trips, giving you full access to expert support and all premium features for every journey you take in that window.',
  },
  {
      value: 'item-8',
      title: 'What exactly am I paying for with the ₹5,000?',
      content:
          'You are securing a dedicated travel expert who provides unlimited custom itineraries, exclusive deals, on-trip support and guided booking assistance to ensure a flawless experience.',
  },
]
export const HERO_IMAGES = "https://media.rimigo.com/1768224839964_hero_premium_bg.webp"

export const FAMILY_IMAGES = {
  FAMILY_1: "https://media.rimigo.com/1767940470954_family1.webp",
  FAMILY_2: "https://media.rimigo.com/1767940471670_family2.webp",
  FAMILY_3: "https://media.rimigo.com/1767940472067_family3.webp",
  FAMILY_4: "https://media.rimigo.com/1767940472627_family4.webp",
  FAMILY_5: "https://media.rimigo.com/1767940473157_family5.webp",
  FAMILY_6: "https://media.rimigo.com/1767940473669_family6.webp",
} as const

export const primary_circle="https://media.rimigo.com/1767940474125_primary_circle.webp"

export const POTRAIT_IMAGES = {
    PORTRAIT_1: "https://media.rimigo.com/1768460591506_travel_expert1.webp",
    PORTRAIT_2: "https://media.rimigo.com/1768462739058_travel_expert2(1).webp",
    PORTRAIT_3: "https://media.rimigo.com/1768462905040_travel_expert3(1).webp",
}

export const DUMMY_USER_IMAGES = {
  POTRAIT_1: 'https://media.rimigo.com/1772459664498_person1.jpg',
  POTRAIT_2: 'https://media.rimigo.com/1772459666396_person2.png',  
  POTRAIT_3: 'https://media.rimigo.com/1772459666724_person3.png',
  POTRAIT_4: 'https://media.rimigo.com/1772459667101_person4.png',
  
}


export const SWISS_SCENIC_VIEW ="https://media.rimigo.com/1767872209184_swiss_scenic_view.webp"

export const features: Feature[] = [
    {
      type: "icon",
      title: "Secret travel deals",
      subtitle:
        "Travel experts find you special rates not available to others",
      icon: BadgePercent,
    },
    {
      type: "stacked",
      title: "Personal travel expert",
      subtitle:
        "Your expert handles every detail from initial planning to your flight back home",
      images: [
        POTRAIT_IMAGES.PORTRAIT_2,
        POTRAIT_IMAGES.PORTRAIT_3,
        POTRAIT_IMAGES.PORTRAIT_1,
      ],
    },
    {
      type: "icon",
      title: "Expert made itinerary",
      subtitle:
        "Receive a fully verified plan tailored by experts to match your travel style",
      icon: Atom,
    },
  ]

export const itineariesFeatures = [
  {
    title: "Handpicked hotels ",
    description: "Experts curate perfect hotels as per your budget",
  },
  {
    title: "Off-beat activities",
    description: "Your expert finds unique gems to make your free time truly special",
  },
  {
    title: "Verified transport and food",
    description: "Experts handle the logistics of getting around and eating well",
  },
]

// Premium Plan Configuration
// Note: PREMIUM_PLAN_ID is now fetched dynamically from API
// Plan name to search for: "Premium Plan" or "Premium Plan Subscription"
export const PREMIUM_PLAN_AMOUNT = 5000.0