import { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import React from 'react'
import './StoriesCaraousel.css'
import { NextButton, PrevButton, usePrevNextButtons } from './StoriesCaraouselArrowButton'
type PropType = {
    slides: {
        image_left: string
        image_right: string
        text_left: string
        user: {
            user_name: string
            user_icon: string
            travelled_to: string
            id: number
        }
    }[]
    options?: EmblaOptionsType
}

const StoriesCaraousel: React.FC<PropType> = (props) => {
    const { slides, options } = props
    const [emblaRef, emblaApi] = useEmblaCarousel({
        ...options,
        align: 'start'
        // containScroll: true
    })

    const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = usePrevNextButtons(emblaApi)

    return (
        <section className="embla w-full">
            <div
                className="embla__viewport  w-full"
                ref={emblaRef}>
                <div className="embla__container  w-full">
                    {slides.map((_, index) => (
                        <div
                            className="embla__slide"
                            key={index}>
                            <div className="embla__slide__number w-full bg-white rounded-full h-full flex flex-col  md:flex-row ">
                                <video
                                    className="w-full h-full object-cover rounded-md"
                                    autoPlay={true}
                                    muted
                                    loop>
                                    <source
                                        src="/stories/IMG_0644.mp4"
                                        type="video/mp4"
                                    />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="embla__controls  flex flex-row justify-end items-center">
                <div className="embla__buttons ">
                    <PrevButton
                        onClick={onPrevButtonClick}
                        disabled={prevBtnDisabled}
                    />
                    <NextButton
                        onClick={onNextButtonClick}
                        disabled={nextBtnDisabled}
                    />
                </div>
            </div>
        </section>
    )
}

export default StoriesCaraousel
