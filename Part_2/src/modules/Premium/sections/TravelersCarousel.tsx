import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import TravellerCard from '../shared/TravellerCard'
import { useEffect, useState } from 'react'
import { dummyTravellers } from '@/constants'


const TravelersCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  // const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(max-width: 768px)').matches) return

    const wrapper = document.querySelector(
      '.travellers-carousel'
    ) as HTMLDivElement | null

    if (!wrapper) return

    // Actual scroll container
    const carousel = wrapper.querySelector(
      '.overflow-x-auto'
    ) as HTMLDivElement | null

    if (!carousel) return

    const container = carousel.firstElementChild as HTMLDivElement | null
    if (!container || !container.firstElementChild) return

    const firstCard = container.firstElementChild as HTMLElement
    const gap = 60

    const getCardWidth = () => firstCard.offsetWidth + gap

    const handleScroll = () => {
      const cardWidth = getCardWidth()
      if (!cardWidth) return

      const index = Math.round(carousel.scrollLeft / cardWidth)
      setActiveIndex(Math.min(index, dummyTravellers.length - 1))
    }

    requestAnimationFrame(() => {
      handleScroll()
    })

    carousel.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      carousel.removeEventListener('scroll', handleScroll)
    }
  }, [])




  return (
    <section className="w-full py-12">
      <h1 className="text-center mx-10 text-3xl md:text-4xl font-semibold mb-10 text-header-black">The secret behind the world's best vacations</h1>
      <div className="max-w-350 mx-auto px-6">
        <GenericCarousel gap={60} containerClassName="py-12" rightGradientStyle='bg-none' gradientEndColor='bg-none' gradientLeftStartColor='bg-none' >
          {dummyTravellers.map((traveller, index) => (
            <TravellerCard key={index} traveller={traveller} />
          ))}
        </GenericCarousel>

        <div className="flex md:hidden items-center justify-center gap-2 mt-4 px-4 sm:px-6 pb-6">
          {dummyTravellers.map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all shrink-0 ${index === activeIndex
                ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-default'
                : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-default opacity-30'
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TravelersCarousel