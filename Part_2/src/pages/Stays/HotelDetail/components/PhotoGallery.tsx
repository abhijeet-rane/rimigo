import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
// @ts-ignore
import justifiedLayout from 'justified-layout'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'

interface PhotoGalleryProps {
    hotelData: HotelDetailData | null
    isOpen: boolean
    onClose: () => void
}

interface ImageGroup {
    type: string
    links: string[]
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ hotelData, isOpen, onClose }) => {
    const [activeSection, setActiveSection] = useState<string>('')
    const tabsContainerRef = useRef<HTMLDivElement | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

    // Group images by type (stable memo)
    const imageGroups: ImageGroup[] = useMemo(() => hotelData?.images || [], [hotelData])

    // Set initial section when gallery opens
    useEffect(() => {
        if (isOpen && imageGroups.length > 0 && !activeSection) {
            setActiveSection(imageGroups[0].type)
        }
    }, [isOpen, imageGroups, activeSection])

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

    // const handleSectionClick = (sectionType: string) => {
    //     setActiveSection(sectionType)
    //     const el = sectionRefs.current[sectionType]
    //     if (el) {
    //         el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    //     }
    // }

    const formatSectionName = (type: string) => {
        return type
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim()
    }

    if (!isOpen || !hotelData) return null

    return (
        <>
            <style>{`
                .tab-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div className="fixed inset-0 z-[3000] bg-white flex flex-col">
                {/* Header with back button and tabs */}
                <div
                    ref={tabsContainerRef}
                    className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className=" flex items-center justify-between mb-4">
                        <button
                            onClick={onClose}
                            className="cursor-pointer flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900">Photo tour</h1>
                        <div className="w-20"></div> {/* Spacer for centering */}
                    </div>

                    {/* Tab bar — hidden on mobile, shown on desktop */}
                    {/* <div
                        className="tab-scroll hidden md:flex justify-center gap-3 overflow-x-auto pb-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {imageGroups.map((group) => (
                            <button
                                key={group.type}
                                onClick={() => handleSectionClick(group.type)}
                                className={`cursor-pointer flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-lg transition-colors`}>
                                <img
                                    src={group.links[0]}
                                    alt={group.type}
                                    className="w-24 h-16 object-cover"
                                />
                            </button>
                        ))}
                    </div> */}
                </div>

                {/* Main content - All sections stacked; tabs scroll to each */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-6xl mx-auto">
                        {imageGroups.map((group) => (
                            <section
                                key={group.type}
                                id={`gallery-${group.type}`}
                                ref={(el) => {
                                    sectionRefs.current[group.type] = el
                                }}
                                className="scroll-mt-24 mb-8">
                                {group.links.length <= 1 ? (
                                    <div>
                                        <img
                                            src={group.links[0]}
                                            alt={`${formatSectionName(group.type)} 1`}
                                            className="w-full h-auto max-h-[70vh] object-cover"
                                        />
                                    </div>
                                ) : (
                                    <JustifiedLayoutCollage
                                        images={group.links}
                                        section={group.type}
                                    />
                                )}
                            </section>
                        ))}
                    </div>
                </div>

                {/* Scroll spy to highlight active tab */}
                {isOpen && (
                    <ScrollSpy
                        containerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
                        groups={imageGroups.map((g) => g.type)}
                        onActiveChange={setActiveSection}
                    />
                )}
            </div>
        </>
    )
}

// Lightweight internal scroll spy helper
function ScrollSpy({
    containerRef,
    groups,
    onActiveChange
}: {
    containerRef: React.RefObject<HTMLDivElement>
    groups: string[]
    onActiveChange: (id: string) => void
}) {
    const observerRef = useRef<IntersectionObserver | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const options: IntersectionObserverInit = {
            root: container,
            threshold: [0.05, 0.2, 0.5],
            rootMargin: '0px 0px -60% 0px'
        }

        const ratios = new Map<string, number>()
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const id = (e.target as HTMLElement).id.replace('gallery-', '')
                ratios.set(id, e.intersectionRatio || 0)
            })
            let bestId: string | null = null
            let bestRatio = 0
            ratios.forEach((r, id) => {
                if (r > bestRatio) {
                    bestRatio = r
                    bestId = id
                }
            })
            if (bestId && bestRatio >= 0.1) {
                onActiveChange(bestId)
            }
        }, options)

        groups.forEach((type) => {
            const el = document.getElementById(`gallery-${type}`)
            if (el) observer.observe(el)
        })

        observerRef.current = observer
        return () => observer.disconnect()
    }, [containerRef, groups, onActiveChange])

    return null
}

export default PhotoGallery

// Collage using justified-layout
function JustifiedLayoutCollage({ images, section }: { images: string[]; section: string }) {
    const containerRef = React.useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const container = containerRef.current

        // Calculate height based on user rule
        const baseHeight = Math.round(window.innerHeight * 0.85) // 70vh
        const height = images.length > 5 ? Math.ceil(images.length / 5) * baseHeight : baseHeight
        const width = container.clientWidth

        // Set container dimensions
        container.style.width = '100%'
        container.style.height = `${height}px`
        container.style.position = 'relative'

        // Clear previous content
        container.innerHTML = ''

        // Standard aspect ratios
        const standardRatios = [
            { ratio: 16 / 9, name: '16:9' }, // Landscape
            { ratio: 3 / 2, name: '3:2' }, // Landscape
            { ratio: 1 / 1, name: '1:1' }, // Square
            { ratio: 3 / 4, name: '3:4' }, // Portrait
            { ratio: 9 / 16, name: '9:16' } // Portrait
        ]

        // Function to find nearest standard ratio
        const findNearestRatio = (actualRatio: number) => {
            let nearest = standardRatios[0]
            let minDiff = Math.abs(actualRatio - nearest.ratio)

            standardRatios.forEach((standard) => {
                const diff = Math.abs(actualRatio - standard.ratio)
                if (diff < minDiff) {
                    minDiff = diff
                    nearest = standard
                }
            })

            return nearest.ratio
        }

        // Load images and calculate their actual aspect ratios
        const imagePromises = images.map(
            (src, index) =>
                new Promise<number>((resolve) => {
                    const img = new Image()
                    img.onload = () => {
                        const actualRatio = img.naturalWidth / img.naturalHeight
                        const nearestRatio = findNearestRatio(actualRatio)
                        resolve(nearestRatio)
                    }
                    img.onerror = () => {
                        resolve(4 / 3) // fallback
                    }
                    img.src = src
                    console.debug('Loading image:', src, index)
                })
        )

        // Wait for all images to load and get their ratios
        Promise.all(imagePromises).then((aspectRatios) => {
            // Get layout from justified-layout
            const layout = justifiedLayout(aspectRatios, {
                containerWidth: width,
                containerPadding: 8,
                targetRowHeight: 250,
                targetRowHeightTolerance: 0.5
            })

            // Apply the layout
            layout.boxes.forEach((box: any, index: number) => {
                const item = document.createElement('div')
                item.style.position = 'absolute'
                item.style.left = `${box.left}px`
                item.style.top = `${box.top}px`
                item.style.width = `${box.width}px`
                item.style.height = `${box.height}px`
                item.style.overflow = 'hidden'

                const img = document.createElement('img')
                img.src = images[index]
                img.alt = `${section} ${index + 1}`
                img.style.width = '100%'
                img.style.height = '100%'
                img.style.objectFit = 'cover'

                item.appendChild(img)
                container.appendChild(item)
            })

            // Set container height to match layout
            container.style.height = `${layout.containerHeight}px`
        })
    }, [images, section])

    return (
        <div
            ref={containerRef}
            className="w-full"
        />
    )
}
