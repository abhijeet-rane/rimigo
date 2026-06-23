import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

interface City {
    id: string
    name: string
}

interface CityFilterCarouselProps {
    cities: City[]
    selectedCityId: string | null
    onCityChange: (cityId: string | null) => void
    scrollControls?: {
        rightScrollArrow?: string
        rightScrollBtn?: string
        leftArrowBtn?: string
        leftScrollBtn?: string
    }
}

const CityFilterCarousel: React.FC<CityFilterCarouselProps> = ({
    cities,
    selectedCityId,
    onCityChange,
    scrollControls
}) => {
    const handleCityClick = (cityId: string | null) => {
        onCityChange(cityId)
    }

    if (cities.length === 0) {
        return null
    }

    return (
        <GenericCarousel
            className="flex-1 min-w-0"
            gap={12}
            scrollControls={scrollControls}
            gradientStartColor="white"
            gradientEndColor="rgba(255,255,255,0)">
            {cities.map((city) => (
                <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCityClick(city.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-[24px] border shrink-0 transition-colors cursor-pointer ${selectedCityId === city.id
                        ? 'bg-primary-default-80 border-primary-default text-primary-default'
                        : 'bg-white border-grey-4 text-grey-0 hover:bg-grey-5'
                        }`}>
                    <span className="text-[14px] font-semibold leading-[18px] font-manrope whitespace-nowrap">
                        {city.name}
                    </span>
                </button>
            ))}
        </GenericCarousel>
    )
}

export default CityFilterCarousel

