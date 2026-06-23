/**
 * Experience card purpose-built for the concierge ``present_options``
 * ``experience_carousel``. Replicates the brand experience-card look (image
 * carousel + title) but tailored for *selection*, not browsing:
 *
 *   • shows the concierge's per-option REASON (the LLM-authored
 *     ``display.subtitle``) — why this swap is a good idea,
 *   • drops the priority "Must Do / Popular" badge and the location line
 *     (the selection surface doesn't need them),
 *   • exposes a "View details" (sneak-peek) affordance,
 *   • is fully ``overflow-hidden`` with a fluid width so it never bleeds
 *     into its neighbour in the horizontal shelf (the old ListCard reuse
 *     forced a fixed ``w-78`` + mobile ``overflow-visible`` → overlap).
 *
 * The Select affordance itself lives in the parent shelf item, not here —
 * this component is purely the card visual + the View action.
 */
import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { NO_EXPERIENCE_IMAGE } from '@/constants/icons/svgFromCDN'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'

interface ExperienceOptionCardProps {
    data: ExperienceCardData
    /** The concierge's per-option reason (LLM-authored ``display.subtitle``). */
    reason?: string
    /** "View details / Sneak peek" — opens the experience detail page. */
    onView?: () => void
    /** Right-aligned action slot (the Select button), rendered opposite the
     *  "View details" link in the card footer row. */
    action?: React.ReactNode
}

const ExperienceOptionCard: React.FC<ExperienceOptionCardProps> = ({ data, reason, onView, action }) => {
    const images = data.images && data.images.length > 0 ? data.images : data.image ? [data.image] : [NO_EXPERIENCE_IMAGE]
    const hasMultiple = images.length > 1

    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        if (!api) return
        setCurrent(api.selectedScrollSnap())
        api.on('select', () => setCurrent(api.selectedScrollSnap()))
    }, [api])

    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-grey_5/60 bg-white">
            {/* Image */}
            <div className="relative h-[190px] w-full shrink-0 overflow-hidden">
                {hasMultiple ? (
                    <Carousel
                        setApi={setApi}
                        className="h-full w-full"
                        opts={{ align: 'start', loop: false }}>
                        <CarouselContent className="h-full">
                            {images.map((img, i) => (
                                <CarouselItem
                                    key={i}
                                    className="h-full">
                                    <img
                                        src={img}
                                        alt={`${data.title} ${i + 1}`}
                                        loading="lazy"
                                        draggable={false}
                                        className="h-[190px] w-full object-cover"
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <button
                            type="button"
                            aria-label="Previous image"
                            onClick={(e) => {
                                e.stopPropagation()
                                api?.scrollPrev()
                            }}
                            disabled={current === 0}
                            className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-grey_5 bg-white/85 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 disabled:opacity-0">
                            <ChevronLeft className="h-4 w-4 text-grey_0" />
                        </button>
                        <button
                            type="button"
                            aria-label="Next image"
                            onClick={(e) => {
                                e.stopPropagation()
                                api?.scrollNext()
                            }}
                            disabled={current === images.length - 1}
                            className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-grey_5 bg-white/85 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 disabled:opacity-0">
                            <ChevronRight className="h-4 w-4 text-grey_0" />
                        </button>
                        <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                            {images.map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                                />
                            ))}
                        </div>
                    </Carousel>
                ) : (
                    <img
                        src={images[0]}
                        alt={data.title}
                        loading="lazy"
                        draggable={false}
                        className="h-[190px] w-full object-cover"
                    />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h3 className="line-clamp-2 font-manrope text-[15px] font-semibold leading-5 text-grey_0">
                    {data.title}
                </h3>
                {reason && (
                    <p className="line-clamp-3 font-manrope text-[12.5px] leading-[1.45] text-grey_2">
                        {reason}
                    </p>
                )}
                {(onView || action) && (
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        {onView ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onView()
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 font-manrope text-[12px] font-semibold text-primary-default hover:underline">
                                <Eye className="h-3.5 w-3.5" />
                                View details
                            </button>
                        ) : (
                            <span />
                        )}
                        {action}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ExperienceOptionCard
