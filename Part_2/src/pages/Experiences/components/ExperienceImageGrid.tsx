import React from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Photo {
    id: string
    url: string
    description: string
}

interface ExperienceImageGridProps {
    photos: Photo[]
    onViewAll: () => void
    className?: string
}

const ExperienceImageGrid: React.FC<ExperienceImageGridProps> = ({ photos, onViewAll, className = '' }) => {
    if (!photos || photos.length === 0) {
        return null
    }

    // Handle different image counts with responsive layouts
    const getGridLayout = () => {
        const count = photos.length

        if (count === 1) {
            return {
                containerClass: 'grid grid-cols-1 gap-3',
                imageClass: 'w-full h-64 rounded-xl'
            }
        } else if (count === 2) {
            return {
                containerClass: 'grid grid-cols-2 gap-3',
                imageClass: 'w-full h-64 rounded-xl'
            }
        } else if (count === 3) {
            return {
                containerClass: 'grid grid-cols-3 gap-3',
                imageClass: 'w-full h-64 rounded-xl'
            }
        } else if (count === 4) {
            return {
                containerClass: 'grid grid-cols-2 gap-3',
                imageClass: 'w-full h-64 rounded-xl'
            }
        } else {
            // 5+ images: Bento grid layout (1 large + 4 small)
            return {
                containerClass: 'grid grid-cols-3 gap-3 h-80',
                largeImageClass: 'col-span-2 row-span-2 rounded-xl',
                smallImageClass: 'rounded-xl'
            }
        }
    }

    const layout = getGridLayout()
    const displayPhotos = photos.slice(0, 3) // Show only 3 photos in grid
    const hasMorePhotos = photos.length > 3

    // For 3+ images, create the layout: 1 large on left, 2 small on right
    if (photos.length >= 3) {
        return (
            <div className={`relative ${className}`}>
                <div className="grid grid-cols-3 gap-3 h-80">
                    {/* Large image (spans 2 columns, 2 rows) */}
                    <div
                        className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-xl"
                        onClick={onViewAll}>
                        <img
                            src={displayPhotos[0].url}
                            alt={displayPhotos[0].description}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>

                    {/* Two small images stacked on the right */}
                    {displayPhotos.slice(1, 3).map((photo) => (
                        <div
                            key={photo.id}
                            className="relative group cursor-pointer overflow-hidden rounded-xl"
                            onClick={onViewAll}>
                            <img
                                src={photo.url}
                                alt={photo.description}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        </div>
                    ))}
                </div>

                {/* View All Photos Button */}
                <div className="absolute bottom-4 right-4 z-10">
                    <Button
                        onClick={onViewAll}
                        className="bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-lg px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium backdrop-blur-sm">
                        <Camera className="w-4 h-4" />
                        {hasMorePhotos ? `See all ${photos.length} photos` : 'See all photos'}
                    </Button>
                </div>
            </div>
        )
    }

    // For 1-4 images, use standard grid
    return (
        <div className={`relative ${className}`}>
            <div className={layout.containerClass}>
                {displayPhotos.map((photo) => (
                    <div
                        key={photo.id}
                        className={`relative group cursor-pointer overflow-hidden ${layout.imageClass}`}
                        onClick={onViewAll}>
                        <img
                            src={photo.url}
                            alt={photo.description}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>
                ))}
            </div>

            {/* View All Photos Button */}
            <div className="absolute bottom-4 right-4 z-10">
                <Button
                    onClick={onViewAll}
                    className="bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-lg px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium backdrop-blur-sm">
                    <Camera className="w-4 h-4" />
                    {hasMorePhotos ? `See all ${photos.length} photos` : 'See all photos'}
                </Button>
            </div>
        </div>
    )
}

export default ExperienceImageGrid
