import React from 'react'
import { Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WhatToExpectDuration =
    | string
    | {
          label?: string
          min?: number | string | null
          max?: number | string | null
          unit?: string | null
      }

export interface WhatToExpectStep {
    title: string
    description?: string | null
    duration?: WhatToExpectDuration
    highlights?: string[] | null
    image_url?: string | null
    imageAlt?: string | null
}

interface WhatToExpectTimelineProps {
    steps: WhatToExpectStep[]
    className?: string
    stepClassName?: string
    showImagePlaceholder?: boolean
}

const normalizeUnit = (unit?: string | null) => {
    if (!unit) return ''

    const lowerCased = unit.toLowerCase()

    switch (lowerCased) {
        case 'minute':
        case 'minutes':
            return 'minutes'
        case 'hour':
        case 'hours':
            return 'hours'
        case 'day':
        case 'days':
            return 'days'
        default:
            return unit
    }
}

const formatDuration = (duration?: WhatToExpectDuration) => {
    if (!duration) return ''

    if (typeof duration === 'string') {
        return duration
    }

    if (duration.label) {
        return duration.label
    }

    const { min, max, unit } = duration
    if (min == null && max == null) {
        return ''
    }

    const normalizedUnit = normalizeUnit(unit)

    if (min != null && max != null && `${min}` === `${max}`) {
        return `${min} ${normalizedUnit}`.trim()
    }

    if (min != null && max != null) {
        return `${min} - ${max} ${normalizedUnit}`.trim()
    }

    if (min != null) {
        return `Min ${min} ${normalizedUnit}`.trim()
    }

    return `Up to ${max} ${normalizedUnit}`.trim()
}

const WhatToExpectTimeline: React.FC<WhatToExpectTimelineProps> = ({ steps, className, stepClassName, showImagePlaceholder = false }) => {
    if (!steps || steps.length === 0) {
        return null
    }

    return (
        <div className={cn('flex flex-col', className)}>
            {steps.map((step, index) => {
                const formattedDuration = formatDuration(step.duration)
                const hasHighlights = Array.isArray(step.highlights) && step.highlights.length > 0
                const shouldRenderImage = step.image_url || showImagePlaceholder

                return (
                    <div
                        key={`${step.title}-${index}`}
                        className={cn('rounded-3xl ', stepClassName)}>
                        <div className="flex gap-4 md:gap-6 ">
                            <div className="flex w-10 flex-col items-center">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-grey-0 font-red-hat-display text-sm font-semibold text-white">
                                    {index + 1}
                                </div>
                                {index < steps.length - 1 && <div className=" w-[2px] flex-1 rounded bg-grey-0" />}
                            </div>

                            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between py-1">
                                <div className="flex flex-1 flex-col gap-2">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <h4 className="text-[16px] tracking-[-0.02em] leading-5 font-medium font-red-hat-display  text-grey-0 ">
                                            {step.title}
                                        </h4>
                                        {formattedDuration && (
                                            <div className="inline-flex items-center gap-2 self-start rounded-full border border-grey_3 bg-grey_5 px-3 py-1 text-xs font-semibold text-grey_0 font-red-hat-display">
                                                <Clock className="h-4 w-4 text-grey-1" />
                                                <span>{formattedDuration}</span>
                                            </div>
                                        )}
                                    </div>

                                    {step.description && <p className="text-sm leading-6 text-grey_1 font-manrope font-medium">{step.description}</p>}

                                    {hasHighlights && (
                                        <div className="rounded-2xl bg-secondary-yellow-80 px-4 py-4 w-fit mt-">
                                            <div className="flex flex-col gap-2">
                                                {step.highlights?.map((highlight, highlightIndex) => (
                                                    <div
                                                        key={`${step.title}-highlight-${highlightIndex}`}
                                                        className="flex items-center gap-2">
                                                        <Star
                                                            className="mt-0.5 h-2 w-2 text-secondary-yellow"
                                                            fill="currentColor"
                                                        />
                                                        <p className="text-sm tracking-[-0.02em] font-medium font-manrope">{highlight}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {shouldRenderImage && (
                                    <div className="flex-shrink-0">
                                        <div className="h-40 w-40 overflow-hidden rounded-2xl border border-grey_4 bg-grey_5 md:h-44 md:w-44">
                                            {step.image_url ? (
                                                <img
                                                    src={step.image_url}
                                                    alt={step.imageAlt || step.title}
                                                    className="h-full w-full object-cover"
                                                    onError={(event) => {
                                                        const target = event.target as HTMLImageElement
                                                        target.style.display = 'none'
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default WhatToExpectTimeline
