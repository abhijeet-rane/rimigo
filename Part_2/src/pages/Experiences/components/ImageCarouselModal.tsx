import React, { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/Sheet'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Photo {
    id: string
    url: string
    description: string
}

interface ImageCarouselModalProps {
    photos: Photo[]
    isOpen: boolean
    onClose: () => void
    initialIndex?: number
}

const ImageCarouselModal: React.FC<ImageCarouselModalProps> = ({ photos, isOpen, onClose, initialIndex = 0 }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    if (!photos || photos.length === 0) {
        return null
    }

    const currentPhoto = photos[currentIndex]

    return (
        <Sheet
            open={isOpen}
            onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="w-full sm:w-3/4 bg-black/95 border-none p-0"
                showCloseButton={false}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-gray-800">
                                <X className="w-5 h-5" />
                            </Button>
                            <div>
                                <SheetTitle className="text-white text-lg">
                                    {currentIndex + 1} of {photos.length}
                                </SheetTitle>
                            </div>
                        </div>
                    </div>

                    {/* Image Description */}
                    {currentPhoto.description && (
                        <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                            <p className="text-white text-sm leading-relaxed">{currentPhoto.description}</p>
                        </div>
                    )}

                    {/* Image Carousel */}
                    <div className="flex-1 flex items-center justify-center p-4">
                        <Carousel
                            opts={{
                                align: 'center',
                                loop: true,
                                startIndex: initialIndex
                            }}
                            className="w-full max-w-4xl"
                            setApi={(api) => {
                                if (api) {
                                    api.on('select', () => {
                                        setCurrentIndex(api.selectedScrollSnap())
                                    })
                                }
                            }}>
                            <CarouselContent>
                                {photos.map((photo) => (
                                    <CarouselItem
                                        key={photo.id}
                                        className="basis-full">
                                        <div className="flex items-center justify-center h-[60vh]">
                                            <img
                                                src={photo.url}
                                                alt={photo.description}
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                            />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            <CarouselPrevious className="left-4 bg-black/50 border-gray-600 text-white hover:bg-black/70" />
                            <CarouselNext className="right-4 bg-black/50 border-gray-600 text-white hover:bg-black/70" />
                        </Carousel>
                    </div>

                    {/* Thumbnail Navigation */}
                    <div className="p-4 border-t border-gray-700">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {photos.map((photo, index) => (
                                <button
                                    key={photo.id}
                                    onClick={() => {
                                        setCurrentIndex(index)
                                        // You might need to programmatically navigate the carousel here
                                    }}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                        index === currentIndex ? 'border-white' : 'border-gray-600 hover:border-gray-400'
                                    }`}>
                                    <img
                                        src={photo.url}
                                        alt={photo.description}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default ImageCarouselModal
