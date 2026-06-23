import Typography from '@/components/shared/Typography'
import { useState, useRef, useEffect, useMemo } from 'react'

interface Bucket {
    min: number
    max: number
    count: number
}

interface PriceRangeData {
    bucket_size: number
    buckets: Bucket[]
    total_hotels: number
    min_rate: number
    max_rate: number
    check_in_date: string
    check_out_date: string
    status: string
}

interface PriceRangeSliderProps {
    data?: PriceRangeData
    loading?: boolean
    initialMin?: number
    initialMax?: number
    onPriceChange?: (min: number, max: number) => void
}

export const PriceRangeSlider = ({ data, loading = false, initialMin, initialMax, onPriceChange }: PriceRangeSliderProps) => {
    // Default budget range
    const DEFAULT_MIN = 500
    const DEFAULT_MAX = 600000

    // SINGLE SOURCE OF TRUTH for ranges
    const RANGES = [
        { min: 500, max: 11999, bars: 40, countMin: 1, countMax: 15, weight: 0.2 },
        { min: 12000, max: 24999, bars: 40, countMin: 4, countMax: 15, weight: 0.25 },
        { min: 25000, max: 50000, bars: 30, countMin: 4, countMax: 15, weight: 0.15 },
        { min: 50000, max: 150000, bars: 30, countMin: 4, countMax: 8, weight: 0.15 },
        { min: 150000, max: 300000, bars: 30, countMin: 2, countMax: 6, weight: 0.12 },
        { min: 300000, max: 600000, bars: 20, countMin: 0, countMax: 4, weight: 0.08 }
    ]

    const [trackWidth, setTrackWidth] = useState(0)
    const [minPrice, setMinPrice] = useState<number | null>(initialMin ?? DEFAULT_MIN)
    const [maxPrice, setMaxPrice] = useState<number | null>(initialMax ?? DEFAULT_MAX)
    const [isDragging, setIsDragging] = useState(false)
    const [minInput, setMinInput] = useState<string>((initialMin ?? DEFAULT_MIN).toString())
    const [maxInput, setMaxInput] = useState<string>((initialMax ?? DEFAULT_MAX).toString())
    const trackRef = useRef<HTMLDivElement>(null)
    const containerActiveThumbRef = useRef<'min' | 'max' | null>(null)
    const onPriceChangeRef = useRef(onPriceChange)
    const hasInitialized = useRef(false)

    // Round to 2 decimals so dragged values don't render long floats like 7234.5678901.
    const formatPrice = (n: number) => (Math.round(n * 100) / 100).toString()

    // Sync state when minPrice/maxPrice changes externally
    useEffect(() => {
        setMinInput(formatPrice(minPrice ?? domainMin))
    }, [minPrice])

    useEffect(() => {
        setMaxInput(formatPrice(maxPrice ?? domainMax))
    }, [maxPrice])

    useEffect(() => {
        onPriceChangeRef.current = onPriceChange
    }, [onPriceChange])

    useEffect(() => {
        if (!hasInitialized.current && initialMin !== undefined && initialMax !== undefined) {
            setMinPrice(initialMin)
            setMaxPrice(initialMax)
            hasInitialized.current = true
        }
    }, [initialMin, initialMax])

    const domainMin = DEFAULT_MIN
    const domainMax = DEFAULT_MAX

    const isLoading = !data || loading

    // Generate histogram buckets
    const histogram = useMemo(() => {
        const buckets: Bucket[] = []

        RANGES.forEach((range) => {
            const step = (range.max - range.min) / range.bars

            for (let i = 0; i < range.bars; i++) {
                const count = Math.floor(Math.random() * (range.countMax - range.countMin + 1)) + range.countMin

                buckets.push({
                    min: range.min + i * step,
                    max: range.min + (i + 1) * step,
                    count: count
                })
            }
        })

        return buckets
    }, [])

    const formatINR = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value)
    }

    // Progressive distribution using RANGES
    const getProgressiveRatio = (val: number): number => {
        if (val <= RANGES[0].min) return 0
        if (val >= RANGES[RANGES.length - 1].max) return 1

        let cumulativeWeight = 0

        for (const range of RANGES) {
            if (val <= range.max) {
                const localRatio = (val - range.min) / (range.max - range.min)
                return cumulativeWeight + localRatio * range.weight
            }
            cumulativeWeight += range.weight
        }

        return 1
    }

    const getValueFromProgressiveRatio = (ratio: number): number => {
        if (ratio <= 0) return RANGES[0].min
        if (ratio >= 1) return RANGES[RANGES.length - 1].max

        let cumulativeWeight = 0

        for (const range of RANGES) {
            if (ratio <= cumulativeWeight + range.weight) {
                const localRatio = (ratio - cumulativeWeight) / range.weight
                return range.min + localRatio * (range.max - range.min)
            }
            cumulativeWeight += range.weight
        }

        return RANGES[RANGES.length - 1].max
    }

    const valueToX = (val: number) => {
        if (trackWidth === 0) return 0
        const ratio = getProgressiveRatio(val)
        return ratio * trackWidth
    }

    const xToValue = (x: number) => {
        if (trackWidth === 0) return DEFAULT_MIN
        const ratio = Math.max(0, Math.min(1, x / trackWidth))
        return getValueFromProgressiveRatio(ratio)
    }

    useEffect(() => {
        const measureTrack = () => {
            if (trackRef.current) {
                setTrackWidth(trackRef.current.offsetWidth || 0)
            }
        }
        const raf = requestAnimationFrame(measureTrack)
        window.addEventListener('resize', measureTrack)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', measureTrack)
        }
    }, [isLoading, data])

    useEffect(() => {
        if (!data) return
        if (onPriceChangeRef.current && (minPrice !== null || maxPrice !== null)) {
            const round2 = (n: number) => Math.round(n * 100) / 100
            onPriceChangeRef.current(round2(minPrice ?? domainMin), round2(maxPrice ?? domainMax))
        }
    }, [minPrice, maxPrice, data])

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isLoading) return
        if (!trackRef.current) return

        const rect = trackRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const minX = valueToX(minPrice ?? domainMin)
        const maxX = valueToX(maxPrice ?? domainMax)

        const chosen = Math.abs(x - minX) <= Math.abs(x - maxX) ? 'min' : 'max'
        containerActiveThumbRef.current = chosen
        setIsDragging(true)

        handlePointerMove(e)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
        if (!isDragging && !containerActiveThumbRef.current) return
        if (!trackRef.current) return

        const rect = trackRef.current.getBoundingClientRect()
        const x = (e as PointerEvent).clientX - rect.left
        const nextVal = xToValue(x)
        const chosen = containerActiveThumbRef.current

        if (chosen === 'min') {
            const currentMax = maxPrice ?? domainMax
            setMinPrice(Math.min(nextVal, currentMax))
        } else if (chosen === 'max') {
            const currentMin = minPrice ?? domainMin
            setMaxPrice(Math.max(nextVal, currentMin))
        }
    }

    const handlePointerUp = () => {
        containerActiveThumbRef.current = null
        setIsDragging(false)
    }

    const handleThumbPointerDown = (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
        if (isLoading) return
        e.stopPropagation()
        containerActiveThumbRef.current = thumb
        setIsDragging(true)
    }

    useEffect(() => {
        if (isDragging) {
            const handleGlobalPointerMove = (e: PointerEvent) => {
                handlePointerMove(e as any)
            }

            const handleGlobalPointerUp = () => {
                handlePointerUp()
            }

            document.addEventListener('pointermove', handleGlobalPointerMove)
            document.addEventListener('pointerup', handleGlobalPointerUp)
            document.addEventListener('pointercancel', handleGlobalPointerUp)

            return () => {
                document.removeEventListener('pointermove', handleGlobalPointerMove)
                document.removeEventListener('pointerup', handleGlobalPointerUp)
                document.removeEventListener('pointercancel', handleGlobalPointerUp)
            }
        }
    }, [isDragging, minPrice, maxPrice, trackWidth])

    const renderHistogram = () => {
        const count = Math.max(0, histogram.length)
        if (count === 0) return null

        const minCenterX = valueToX(minPrice ?? DEFAULT_MIN)
        const maxCenterX = valueToX(maxPrice ?? DEFAULT_MAX)

        const gap = 0.5
        const totalGaps = Math.max(0, count - 1) * gap
        const barWidth = Math.max(1, (trackWidth - totalGaps) / count)

        return histogram.map((bucket, idx) => {
            const xStart = idx * (barWidth + gap)

            const bucketStartX = valueToX(bucket.min)
            const bucketEndX = valueToX(bucket.max)
            const bucketCenterX = (bucketStartX + bucketEndX) / 2

            const isGreyLeft = bucketCenterX <= minCenterX
            const isGreyRight = bucketCenterX >= maxCenterX
            const isSelected = !(isGreyLeft || isGreyRight)

            return (
                <div
                    key={idx}
                    className="pointer-events-none bg-primary-default absolute bottom-0"
                    style={{
                        left: `${xStart}px`,
                        width: `${barWidth}px`,
                        height: `${Math.max(2, Math.min(60, bucket.count * 4))}px`,
                        borderTopLeftRadius: '2px',
                        borderTopRightRadius: '2px',
                        opacity: isSelected ? 1 : 0.35,
                        transition: 'opacity 0.2s ease'
                    }}
                />
            )
        })
    }

    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-6 gap-3">
                <img
                    src="/icons/compass.png"
                    alt="Loading"
                    className="w-10 h-10 animate-spin"
                />
                <p className="text-sm text-grey-grey_2 text-center">We are fetching best rates for you. It may take up to 15–20 seconds.</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div
                ref={trackRef}
                className="relative flex items-end h-16 mb-2 cursor-pointer select-none"
                onPointerDown={handleTrackPointerDown}
                style={{ touchAction: 'none' }}>
                {renderHistogram()}

                <div className="absolute left-0 right-0 bottom-0 h-px bg-grey-grey_4" />

                <div
                    className="absolute bottom-0 h-px bg-primary-default"
                    style={{
                        left: `${Math.max(0, valueToX(minPrice ?? domainMin))}px`,
                        width: `${Math.max(0, valueToX(maxPrice ?? domainMax) - valueToX(minPrice ?? domainMin))}px`
                    }}
                />

                <div
                    className="absolute w-[34px] h-[34px] rounded-full bg-natural-white border border-grey-grey_4 shadow-md cursor-grab active:cursor-grabbing z-10"
                    style={{
                        left: `${Math.max(0, valueToX(minPrice ?? domainMin) - 17)}px`,
                        bottom: '-17px',
                        boxShadow: '2px 4px 12px rgba(0, 0, 0, 0.1)',
                        touchAction: 'none',
                    }}
                    onPointerDown={handleThumbPointerDown('min')}
                />

                <div
                    className="absolute w-[34px] h-[34px] rounded-full bg-natural-white border border-grey-grey_4 shadow-md cursor-grab active:cursor-grabbing z-10"
                    style={{
                        left: `${Math.max(0, Math.min(trackWidth - 34, valueToX(maxPrice ?? domainMax) - 17))}px`,
                        bottom: '-17px',
                        boxShadow: '2px 4px 12px rgba(0, 0, 0, 0.1)',
                        touchAction: 'none',
                    }}
                    onPointerDown={handleThumbPointerDown('max')}
                />
            </div>
            <div className="flex flex-row mt-8 gap-[10px] items-center md:hidden">
                {/* MIN PRICE */}
                <div className="flex flex-1 flex-col p-2 rounded-[8px] gap-1 border border-grey-4">
                    <div className="flex flex-row gap-1">
                        <Typography
                            size="11"
                            weight="extrabold"
                            family="redhat"
                            color="grey-1">
                            MINIMUM
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            family="redhat"
                            color="grey-1">
                            (per night)
                        </Typography>
                    </div>
                    <div className="flex flex-row gap-1 items-center">
                        <Typography
                            size="20"
                            weight="medium"
                            family="manrope"
                            color="grey-2">
                            ₹
                        </Typography>
                        {/* MIN PRICE */}
                        <input
                            type="number"
                            value={minInput}
                            min={domainMin}
                            max={maxPrice ?? domainMax}
                            onChange={(e) => {
                                let val = e.target.value
                                // Hard clamp to maxPrice while typing
                                if (Number(val) > (maxPrice ?? domainMax)) {
                                    val = (maxPrice ?? domainMax).toString()
                                }
                                setMinInput(val)
                            }}
                            onBlur={() => {
                                // Enforce minimum of 500 on blur
                                const val = Math.min(Math.max(Number(minInput) || domainMin, domainMin), maxPrice ?? domainMax)
                                setMinPrice(val)
                                setMinInput(val.toString())
                            }}
                            className="w-full text-[20px] font-medium font-manrope text-grey-0 bg-transparent outline-none"
                        />
                    </div>
                </div>

                <Typography
                    size="16"
                    weight="semibold"
                    family="manrope"
                    color="grey-0">
                    -
                </Typography>

                {/* MAX PRICE */}
                <div className="flex flex-1 flex-col p-2 rounded-[8px] gap-1 border border-grey-4">
                    <div className="flex flex-row gap-1">
                        <Typography
                            size="11"
                            weight="extrabold"
                            family="redhat"
                            color="grey-1">
                            MAXIMUM
                        </Typography>
                        <Typography
                            size="11"
                            weight="semibold"
                            family="redhat"
                            color="grey-1">
                            (per night)
                        </Typography>
                    </div>
                    <div className="flex flex-row gap-1 items-center">
                        <Typography
                            size="20"
                            weight="medium"
                            family="manrope"
                            color="grey-2">
                            ₹
                        </Typography>
                        <input
                            type="number"
                            value={maxInput}
                            min={minPrice ?? domainMin}
                            max={domainMax}
                            onChange={(e) => {
                                let val = Number(e.target.value)
                                // Hard clamp to domainMax while typing
                                if (val > domainMax) val = domainMax
                                setMaxInput(val.toString())
                            }}
                            onBlur={() => {
                                // Enforce minimum of minPrice on blur
                                const val = Math.max(Math.min(Number(maxInput) || domainMax, domainMax), minPrice ?? domainMin)
                                setMaxPrice(val)
                                setMaxInput(val.toString())
                            }}
                            className="w-full text-[20px] font-medium font-manrope text-grey-0 bg-transparent outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="max-md:hidden flex justify-between mt-4 gap-4">
                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <span className="text-xs text-grey-grey_2">Minimum</span>
                    <div className="bg-natural-white border border-feature-card-border rounded-full px-1 py-2 w-full text-center">
                        <span className="text-xs font-semibold text-grey-grey_0">{formatINR(minPrice || domainMin)}</span>
                    </div>
                </div>
                <div className="max-md:hidden flex flex-col items-center gap-2 min-w-[80px]">
                    <span className="text-xs text-grey-grey_2">Maximum</span>
                    <div className="bg-natural-white border border-feature-card-border rounded-full px-1 py-2 w-full text-center">
                        <span className="text-xs font-semibold text-grey-grey_0">{formatINR(maxPrice || domainMax)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
