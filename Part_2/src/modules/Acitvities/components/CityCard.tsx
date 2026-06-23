import { ChevronRight } from 'lucide-react'

interface CityCardProps {
    cityName: string
    knownFor?: string
    image: string
    onClick?: () => void
}

const CityCard = ({ cityName, knownFor, image, onClick }: CityCardProps) => {
    return (
        <div
            className="relative rounded-2xl overflow-hidden group transition-transform hover:cursor-pointer"
            onClick={onClick}>
            <div className="h-87.5 w-full max-w-[312px] relative overflow-hidden cursor-pointer">
                {/* Image with zoom animation */}
                <div className="absolute inset-0 panorama-on-hover overflow-hidden cursor-pointer">
                    <img
                        src={image}
                        alt={cityName}
                        className="h-full w-full object-cover"
                    />
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent cursor-pointer" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="transition-all duration-300 ease-out group-hover:-translate-y-7 group-hover:opacity-0">
                    <h3 className="font-manrope font-semibold text-[20px] mb-1">{cityName}</h3>
                    {knownFor && (
                        <div className="flex items-center gap-2 justify-between">
                            <p className="font-manrope text-[12px] text-white/90 line-clamp-2 group-hover:line-clamp-none max-w-55">
                                {' '}
                                <span className="font-manrope font-[500] text-[12px] text-white tracking-[-0.2%]">Known for:</span>{' '}
                                <span className="font-manrope font-[400] text-[12px] text-white tracking-[-0.2%]">{knownFor}</span>
                            </p>
                            <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                    )}
                    </div>
                    {/* Hover CTA */}
                    <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                        <span className="font-red-hat-display font-semibold text-md text-white tracking-[-0.2%]">
                            Explore activities in {cityName}
                        </span>
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CityCard
