import React from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import ExperienceCard from './ExperienceCard'
import { Experience } from './ExperienceCard'

interface ExperienceCarouselProps {
    experiences: Experience[]
    onLike?: (id: string) => void
    onUpload?: (id: string) => void
    onClick?: (id: string) => void
    className?: string
}

const ExperienceCarousel: React.FC<ExperienceCarouselProps> = ({ experiences, onLike, onUpload, onClick, className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            <Carousel
                opts={{
                    align: 'start',
                    loop: false
                }}
                className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                    {experiences.map((experience) => (
                        <CarouselItem
                            key={experience.id}
                            className="pl-2 md:pl-4 basis-[280px] sm:basis-[300px] md:basis-[350px]">
                            <ExperienceCard
                                experience={experience}
                                onLike={onLike}
                                onUpload={onUpload}
                                onClick={onClick}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <CarouselPrevious className="hidden md:flex -left-12 bg-white border-gray-200 hover:bg-gray-50" />
                <CarouselNext className="hidden md:flex -right-12 bg-white border-gray-200 hover:bg-gray-50" />
            </Carousel>
        </div>
    )
}

export default ExperienceCarousel
