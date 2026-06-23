import React, { useState } from 'react'
import { Sheet, SheetContent, SheetHeader } from '@/shared/components/Sheet'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { Badge } from '../../../components/ui/badge'
import { MapPin, Clock, Users, Calendar, Thermometer, Cloud, TrendingUp, CheckCircle, Play } from 'lucide-react'
import { ExperienceDetails } from '../types/experienceDetails'
import WeatherReport from '@/modules/Experiences/components/WeatherReport'
import ExperienceImageGrid from './ExperienceImageGrid'
import ImageCarouselModal from './ImageCarouselModal'

interface ExperienceDetailsSheetProps {
    experience: ExperienceDetails | null
    isOpen: boolean
    onClose: () => void
    isLoading?: boolean
}

const ExperienceDetailsSheet: React.FC<ExperienceDetailsSheetProps> = ({ experience, isOpen, onClose, isLoading = false }) => {
    // Show shimmer if loading or no experience data
    const showShimmer = isLoading || !experience

    // Modal state for image carousel
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)

    const getBestMonth = () => {
        if (!experience) return null
        const months = Object.entries(experience.seasonal_information)
        const bestMonth = months.find(([, info]) => info.is_recommended && info.is_peak_season)
        return bestMonth ? { month: bestMonth[0], info: bestMonth[1] } : null
    }

    const bestMonth = getBestMonth()

    // Shimmer components
    const ShimmerBox = ({ className }: { className: string }) => <div className={`animate-pulse bg-gray-200 rounded ${className}`} />

    const ShimmerText = ({ lines = 1 }: { lines?: number }) => (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <ShimmerBox
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    )

    return (
        <Sheet
            open={isOpen}
            onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="bg-white">
                <SheetHeader className="space-y-4 pb-4 border-b">{/* Empty header - content moved to scrollable area */}</SheetHeader>

                <ScrollArea className="h-screen pr-4">
                    <div className="space-y-6 py-4">
                        {/* Experience Header Information */}
                        <div className="px-6 space-y-4">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-8 w-3/4" />
                                    <div className="flex items-center gap-2">
                                        <ShimmerBox className="h-4 w-4" />
                                        <ShimmerBox className="h-4 w-1/2" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <ShimmerBox className="h-8 w-32" />
                                        <ShimmerBox className="h-4 w-16" />
                                    </div>
                                    <ShimmerText lines={2} />
                                </>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-gray-900">{experience.name}</h1>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">
                                            {experience.location.city}, {experience.location.country}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-bold text-gray-900">
                                                ₹{experience.price.lower_bound}-{experience.price.upper_bound}
                                            </span>
                                            <span className="text-sm text-gray-600">per head</span>
                                        </div>
                                    </div>
                                    <p className="text-gray-700">{experience.short_description}</p>
                                </>
                            )}
                        </div>

                        {/* Experience Images Grid */}
                        {!showShimmer && experience.content.verified_photos && experience.content.verified_photos.length > 0 && (
                            <div className="px-6">
                                <ExperienceImageGrid
                                    photos={experience.content.verified_photos}
                                    onViewAll={() => {
                                        setSelectedImageIndex(0)
                                        setIsImageModalOpen(true)
                                    }}
                                />
                            </div>
                        )}
                        {/* Why for you section */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-24" />
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <ShimmerBox
                                                key={i}
                                                className="h-6 w-16"
                                            />
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2">
                                                <ShimmerBox className="h-4 w-4" />
                                                <ShimmerText lines={1} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Why for you</h3>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {experience.categories.slice(0, 3).map((category, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="bg-green-100 text-green-800">
                                                {category}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        {experience.highlights.slice(0, 3).map((highlight, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-2">
                                                <span className="text-sm font-medium text-gray-600 min-w-[20px]">{index + 1}.</span>
                                                <span className="text-sm text-gray-700">{highlight.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Get a sneak peek section */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-48" />
                                    <div className="grid grid-cols-2 gap-3">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <ShimmerBox
                                                key={i}
                                                className="aspect-square rounded-lg"
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Get a sneak peek from other travelers</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {experience.content.instagram_reels.slice(0, 4).map((reel) => (
                                            <div
                                                key={reel.id}
                                                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <p className="text-xs text-white line-clamp-2">{reel.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Best time to visit section */}
                        {showShimmer ? (
                            <div className="space-y-3">
                                <ShimmerBox className="h-6 w-40" />
                                <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShimmerBox className="h-5 w-5" />
                                        <ShimmerBox className="h-5 w-32" />
                                    </div>
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2">
                                                <ShimmerBox className="h-4 w-4" />
                                                <ShimmerBox className="h-4 w-48" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShimmerBox className="h-4 w-4" />
                                    <ShimmerBox className="h-4 w-40" />
                                </div>
                            </div>
                        ) : (
                            bestMonth && (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-gray-900">Best time to visit?</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                            <span className="font-semibold text-blue-900 capitalize">{bestMonth.month} BEST MONTH</span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-gray-600" />
                                                <span className="text-gray-700">
                                                    Crowd: {bestMonth.info.crowd_levels.level === 'high' ? 'Higher than usual' : 'Moderate'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Thermometer className="w-4 h-4 text-gray-600" />
                                                <span className="text-gray-700">
                                                    Weather: {bestMonth.info.weather.minimum_temperature}°C -{' '}
                                                    {bestMonth.info.weather.maximum_temperature}
                                                    °C
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Cloud className="w-4 h-4 text-gray-600" />
                                                <span className="text-gray-700">
                                                    Avoid: {bestMonth.info.weather.precipitation_chance}% chance of rain
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>We recommend booking a tour</span>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Group suitability */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-24" />
                                    <div className="grid grid-cols-2 gap-3">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2">
                                                <ShimmerBox className="h-4 w-4" />
                                                <ShimmerBox className="h-4 w-20" />
                                                <ShimmerBox className="h-4 w-4" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Suitable for</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(experience.group_type_suitability).map(([type, info]) => (
                                            <div
                                                key={type}
                                                className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-600" />
                                                <span className="text-sm capitalize text-gray-700">{type.replace('_', ' ')}</span>
                                                {info.is_suitable && <CheckCircle className="w-4 h-4 text-green-600" />}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Timing guide */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-28" />
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <ShimmerBox className="h-4 w-4" />
                                            <ShimmerBox className="h-4 w-48" />
                                        </div>
                                        <ShimmerText lines={2} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Timing Guide</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-gray-600" />
                                            <span className="text-gray-700">
                                                Recommended: {experience.timing_guide.recommended_time_slots.join(', ')}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {typeof experience.timing_guide.monday === 'object' && 'description' in experience.timing_guide.monday
                                                ? experience.timing_guide.monday.description
                                                : 'Check specific timings for each day'}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Transport options */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-32" />
                                    <ShimmerText lines={3} />
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <ShimmerBox
                                                key={i}
                                                className="h-6 w-16"
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">How to get there</h3>
                                    <div className="text-sm text-gray-700">{experience.transport_options.description}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {experience.transport_options.recommended_option.map((option, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="capitalize">
                                                {option}
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Accessibility */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-28" />
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2">
                                                <ShimmerBox className="h-4 w-20" />
                                                <ShimmerBox className="h-4 w-24" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Accessibility</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Age range:</span>
                                            <span className="text-gray-700">
                                                {experience.constraints.age.minimum} - {experience.constraints.age.maximum} years
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Wheelchair accessible:</span>
                                            <span
                                                className={`${experience.constraints.mobility.wheelchair_accessible ? 'text-green-600' : 'text-red-600'}`}>
                                                {experience.constraints.mobility.wheelchair_accessible ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div className="text-gray-600">{experience.constraints.mobility.description}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Seasonal Weather Information */}
                        <div className="space-y-3">
                            {showShimmer ? (
                                <>
                                    <ShimmerBox className="h-6 w-40" />
                                    <div className="bg-gray-100 rounded-lg p-4">
                                        <div className="space-y-3">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <ShimmerBox
                                                    key={i}
                                                    className="h-32 w-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-900">Seasonal Weather Guide</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <WeatherReport />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>

            {/* Image Carousel Modal */}
            {!showShimmer && experience.content.verified_photos && (
                <ImageCarouselModal
                    photos={experience.content.verified_photos}
                    isOpen={isImageModalOpen}
                    onClose={() => setIsImageModalOpen(false)}
                    initialIndex={selectedImageIndex}
                />
            )}
        </Sheet>
    )
}

export default ExperienceDetailsSheet
