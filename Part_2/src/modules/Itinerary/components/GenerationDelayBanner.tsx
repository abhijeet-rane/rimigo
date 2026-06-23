import { SHARK_TANK_IMAGE_URL } from '@/constants'
import React from 'react'

/**
 * "As seen on Shark Tank" banner shown when itinerary generation exceeds the configured threshold.
 * Used in both mobile and desktop layouts of ItineraryGenerationLoader.
 */
const GenerationDelayBanner: React.FC = () => {
  return (
    <div className="inline-flex flex-col items-center justify-center gap-2 text-sm font-medium font-manrope text-center w-full px-3 py-3 rounded bg-grey-5 text-grey-1">
      <span>As seen on</span>
      <img
        src={SHARK_TANK_IMAGE_URL}
        alt="Shark Tank India"
        className="h-auto object-contain"
        style={{ maxHeight: '18px' }}
      />
    </div>
  )
}

export default GenerationDelayBanner
