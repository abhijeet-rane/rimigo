import Typography from '@/components/shared/Typography'
import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUserInfo } from '@/hooks/useUserInfo'
import DraggableScrollContainer from './DraggableScrollContainer'
import { getFacilityIcon } from './IconMap'
import FiltersSkeleton from './FliterSkeleton'
import DealBottomScroll from './DealBottomScroll'
import PhotoGallery from './PhotoGallery'

interface DealsCardProps {
    title: string
    checkin: string // e.g. "2025-11-23"
    checkout: string // e.g. "2025-11-26"
    roomData: any
    status: string
    selectedCancellationPolicy?: string
}
const DealsCard: React.FC<DealsCardProps> = ({ title, roomData, checkin, checkout, status, selectedCancellationPolicy }) => {
    const facilities = roomData?.content?.facilities || []
    const showFacilityShimmer = status !== 'COMPLETED'
    const { isRimigoInternal } = useUserInfo()
    const [isPhotoTourOpen, setIsPhotoTourOpen] = useState(false)

    const photoTourData = useMemo(() => {
        const rawImages = roomData?.content?.images || roomData?.content?.image || []
        if (!rawImages.length) return null
        const grouped: Record<string, string[]> = {}
        for (const img of rawImages) {
            const caption = img.caption || 'Room'
            const url = img.link || img.links?.find((l: any) => l.size === 'Standard')?.url || img.links?.[0]?.url
            if (!url) continue
            if (!grouped[caption]) grouped[caption] = []
            grouped[caption].push(url)
        }
        return {
            images: Object.entries(grouped).map(([type, links]) => ({ type, links }))
        }
    }, [roomData?.content])

    return (
        <div className="flex flex-col rounded-2xl border border-grey-4 bg-natural-white pb-4">
            {/* 🔹 Header Section */}
            <div className="flex flex-col md:flex-row py-4 px-[14px] md:justify-between md:items-center gap-3">
                <div className="flex flex-col gap-[5px]">
                    <Typography
                        size="18"
                        weight="semibold"
                        color="grey-0"
                        family="redhat">
                        {title}
                    </Typography>
                    {/* Optionally add room description or size here */}
                </div>

                {/* Image Carousel with external nav */}
                <RoomImageCarousel
                    roomData={roomData}
                    showShimmer={showFacilityShimmer}
                    onImageClick={() => photoTourData && setIsPhotoTourOpen(true)}
                />
            </div>

            {/* 🔹 Amenities Section */}
            <div className="flex flex-col gap-2 p-3 bg-grey-5">
                <div className="flex flex-row justify-between items-center">
                    <Typography
                        size="12"
                        weight="semibold"
                        color="grey-0"
                        family="redhat">
                        Amenities
                    </Typography>
                    <Typography
                        size="11"
                        weight="medium"
                        color="grey-2"
                        family="manrope">
                        {isRimigoInternal && roomData?.content?.source?.toLowerCase() === 'zentrum'
                            ? 'As per B2B content'
                            : roomData?.content?.source?.toLowerCase() === 'agoda_fallback'
                                ? 'As per Agoda'
                                : ''}
                    </Typography>
                </div>

                <DraggableScrollContainer className="flex flex-row gap-2">
                    {showFacilityShimmer ? (
                        // Render shimmer placeholders when status is not completed
                        Array.from({ length: 6 }).map((_, __) => <FiltersSkeleton />)
                    ) : facilities.length > 0 ? (
                        facilities.map((item: any, idx: number) => {
                            const Icon = getFacilityIcon(item, 12)
                            const displayName = formatFacilityName(item.name)

                            return (
                                <div
                                    key={idx}
                                    className="flex flex-row items-center gap-[6px] py-[6px] px-[10px] whitespace-nowrap rounded-[20px] bg-natural-white border border-grey-4 shrink-0">
                                    {Icon}
                                    <Typography
                                        size="11"
                                        weight="semibold"
                                        color="grey-0"
                                        family="manrope">
                                        {displayName || 'Unknown'}
                                    </Typography>
                                </div>
                            )
                        })
                    ) : (
                        <Typography
                            size="11"
                            weight="semibold"
                            color="grey-2"
                            family="manrope">
                            No amenities listed
                        </Typography>
                    )}
                </DraggableScrollContainer>
            </div>

            {/* 🔹 Optional Deals Scroll Section */}
            <DraggableScrollContainer
                showProgressBar
                className="flex flex-row  px-4 gap-4">
                {Object.entries(roomData.rooms || {}).map(([roomTitle, roomInfo], idx) => {
                    const roomInfoObj = (roomInfo as any) || {}
                    const combinedRoomData = {
                        free: roomInfoObj?.free || {},
                        non_refundable:
                            roomInfoObj?.non_refundable ||
                            roomInfoObj?.nonrefundable ||
                            roomInfoObj?.['Non-refundable'] ||
                            {}
                    }

                    return (
                        <DealBottomScroll
                            key={idx}
                            title={roomTitle}
                            roomData={combinedRoomData}
                            checkin={checkin}
                            checkout={checkout}
                            selectedCancellationPolicy={selectedCancellationPolicy}
                        />
                    )
                })}
            </DraggableScrollContainer>

            {photoTourData && (
                <PhotoGallery
                    hotelData={photoTourData as any}
                    isOpen={isPhotoTourOpen}
                    onClose={() => setIsPhotoTourOpen(false)}
                />
            )}
        </div>
    )
}

export default DealsCard

const RoomImageCarousel: React.FC<{
    roomData: any
    showShimmer: boolean
    onImageClick: () => void
}> = ({ roomData, showShimmer, onImageClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const images: string[] = useMemo(() => {
        const rawImages = roomData?.content?.images || roomData?.content?.image || []
        return rawImages
            .map((img: any) => img.link || img.links?.find((l: any) => l.size === 'Standard')?.url || img.links?.[0]?.url || '')
            .filter(Boolean)
            .slice(0, 5)
    }, [roomData?.content])

    if (showShimmer) {
        return <div className="w-full md:w-[200px] h-[180px] md:h-[130px] rounded-lg bg-grey-5 animate-pulse flex-shrink-0" />
    }
    if (images.length === 0) return null

    const isFirst = currentIndex === 0
    const isLast = currentIndex === images.length - 1

    return (
        <div className="flex items-center gap-1 flex-shrink-0 w-full md:w-auto">
            {/* Desktop: external nav buttons */}
            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (!isFirst) setCurrentIndex((i) => i - 1) }}
                    className={`hidden md:flex p-1 rounded-full hover:bg-grey-5 transition-colors cursor-pointer ${isFirst ? 'opacity-0 pointer-events-none' : ''}`}
                    aria-label="Previous image">
                    <ChevronLeft className="h-4 w-4 text-grey-2" />
                </button>
            )}
            <div
                className="w-full md:w-[200px] h-[180px] md:h-[130px] rounded-lg overflow-hidden cursor-pointer relative"
                onClick={onImageClick}>
                {images.map((src, idx) => (
                    <img
                        key={idx}
                        src={src}
                        alt={`Room ${idx + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    />
                ))}
                {/* Mobile: nav buttons over image */}
                {images.length > 1 && !isFirst && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i - 1) }}
                        className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center cursor-pointer"
                        aria-label="Previous image">
                        <ChevronLeft className="h-4 w-4 text-grey-0" />
                    </button>
                )}
                {images.length > 1 && !isLast && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i + 1) }}
                        className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center cursor-pointer"
                        aria-label="Next image">
                        <ChevronRight className="h-4 w-4 text-grey-0" />
                    </button>
                )}
                {images.length > 1 && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, idx) => (
                            <span
                                key={idx}
                                className={`block rounded-full transition-all ${idx === currentIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
            {/* Desktop: external nav buttons */}
            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (!isLast) setCurrentIndex((i) => i + 1) }}
                    className={`hidden md:flex p-1 rounded-full hover:bg-grey-5 transition-colors cursor-pointer ${isLast ? 'opacity-0 pointer-events-none' : ''}`}
                    aria-label="Next image">
                    <ChevronRight className="h-4 w-4 text-grey-2" />
                </button>
            )}
        </div>
    )
}

export const formatFacilityName = (name: string = '') => {
    return name
        .replace(/_/g, ' ') // replace underscores with spaces
        .trim()
        .replace(/\s+/g, ' ') // remove extra spaces
        .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize each word
}
