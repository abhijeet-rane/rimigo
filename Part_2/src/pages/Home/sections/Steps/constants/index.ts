import { STEPS_VIDEO_URL } from '@/constants'
import { Map, Compass, Hotel, MessageSquare } from 'lucide-react'

export const FEATURE_DATA = [
  {
    id: 'itinerary',
    label: 'Itinerary',
    icon: Map,
    title: 'Generate your itinerary instantly',
    desktop_video: STEPS_VIDEO_URL.itinerary,
    mobile_video: STEPS_VIDEO_URL.itinerary,
  },
  {
    id: 'experience',
    label: 'Experience',
    icon: Compass,
    title: 'Discover and add experiences',
    desktop_video: STEPS_VIDEO_URL.experience,
    mobile_video: STEPS_VIDEO_URL.itinerary,
  },
  {
    id: 'stay',
    label: 'Stay',
    icon: Hotel,
    title: 'Compare rates across platforms',
    desktop_video: STEPS_VIDEO_URL.stay,
    mobile_video: STEPS_VIDEO_URL.itinerary,
  },
  {
    id: 'askai',
    label: 'Ask AI',
    icon: MessageSquare,
    title: 'Invite friends and plan together',
    desktop_video: STEPS_VIDEO_URL.inviteTraveler,
    mobile_video: STEPS_VIDEO_URL.itinerary,
  },
]