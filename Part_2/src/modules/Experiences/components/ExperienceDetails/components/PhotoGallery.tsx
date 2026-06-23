import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'

interface PhotoGalleryProps {
    images: string[]
    isOpen: boolean
    onClose: () => void
    initialIndex?: number
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ images, isOpen, onClose, initialIndex = 0 }) => {
    const [activePhotoIndex, setActivePhotoIndex] = useState<number>(initialIndex)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)

    // Update active index when initialIndex changes or gallery opens
    useEffect(() => {
        if (isOpen && initialIndex !== undefined) {
            setActivePhotoIndex(initialIndex)
            // Scroll to the initial photo after a short delay to ensure DOM is ready
            setTimeout(() => {
                const photoElement = document.getElementById(`photo-${initialIndex}`)
                if (photoElement) {
                    photoElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 100)
        }
    }, [isOpen, initialIndex])

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const handlePhotoClick = (index: number) => {
        const photoElement = document.getElementById(`photo-${index}`)
        if (photoElement) {
            photoElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setActivePhotoIndex(index)
        }
    }

    if (!isOpen || images.length === 0) return null

    return (
        <>
            <style>{`
                .tab-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div className="fixed inset-0 z-[3000] bg-white flex flex-col">
                {/* Header with back button */}
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onClose}
                            className="cursor-pointer flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900">Photo tour</h1>
                        <div className="w-20"></div> {/* Spacer for centering */}
                    </div>

                    {/* Thumbnail navigation - centered */}
                    <div className="flex justify-center">
                        <div
                            className="tab-scroll flex gap-3 overflow-x-auto pb-2"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePhotoClick(index)}
                                    className={`cursor-pointer shrink-0 flex flex-col items-center gap-2 p-2 rounded-lg transition-colors ${
                                        activePhotoIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                                    }`}>
                                    <img
                                        src={img}
                                        alt={`Photo ${index + 1}`}
                                        className="w-24 h-16 object-cover rounded"
                                    />
                                    <span className="text-xs font-medium text-center text-gray-700">Photo {index + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="space-y-8">
                            {images.map((img, index) => (
                                <div
                                    key={index}
                                    id={`photo-${index}`}
                                    className="w-full">
                                    <img
                                        src={img}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-auto max-h-[70vh] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => handlePhotoClick(index)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scroll spy to track active photo */}
                {isOpen && images.length > 1 && (
                    <ScrollSpy
                        images={images}
                        onActiveChange={setActivePhotoIndex}
                    />
                )}
            </div>
        </>
    )
}

// Scroll spy to track active photo
function ScrollSpy({ images, onActiveChange }: { images: string[]; onActiveChange: (index: number) => void }) {
    const observerRef = useRef<IntersectionObserver | null>(null)

    useEffect(() => {
        const options: IntersectionObserverInit = {
            root: null,
            threshold: [0.25, 0.5, 0.75],
            rootMargin: '-20% 0px -20% 0px'
        }

        const ratios = new Map<number, number>()
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const id = (e.target as HTMLElement).id.replace('photo-', '')
                const index = parseInt(id, 10)
                ratios.set(index, e.intersectionRatio || 0)
            })

            let bestIndex: number | null = null
            let bestRatio = 0
            ratios.forEach((r, index) => {
                if (r > bestRatio) {
                    bestRatio = r
                    bestIndex = index
                }
            })

            if (bestIndex !== null && bestRatio >= 0.1) {
                onActiveChange(bestIndex)
            }
        }, options)

        images.forEach((_, index) => {
            const el = document.getElementById(`photo-${index}`)
            if (el) observer.observe(el)
        })

        observerRef.current = observer
        return () => observer.disconnect()
    }, [images, onActiveChange])

    return null
}

export default PhotoGallery
