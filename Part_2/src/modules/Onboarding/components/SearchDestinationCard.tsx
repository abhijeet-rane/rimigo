import Typography from '@/components/shared/Typography'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import { Check } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface SearchDestinationCardProps {
    imageSource: { uri: string }
    title: string
    onPress?: (data: { title: string; imageUrl: string }) => void
    isSelected?: boolean
}

export const SearchDestinationCard: React.FC<SearchDestinationCardProps> = ({ imageSource, title, onPress, isSelected = false }) => {
    return (
        <button
            type="button"
            onClick={() =>
                onPress?.({
                    title,
                    imageUrl: imageSource?.uri
                })
            }
            className={`w-full flex items-center cursor-pointer gap-3 p-3 rounded-[var(--radius-lg)] border bg-natural-white hover:shadow-[var(--shadow-feature-card)] transition-all duration-200 text-left ${
                isSelected
                    ? 'border-primary-default bg-primary-default/5'
                    : 'border-grey-4'
            }`}>
            <SafeImage
                src={imageSource?.uri}
                alt={title}
                className="w-10 h-10 rounded-[8px] object-cover"
            />

            <Typography
                family="redhat"
                weight="semibold"
                color="grey-0"
                textAlign="left"
                className="flex-1">
                {title}
            </Typography>

            {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary-default flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" />
                </div>
            )}
        </button>
    )
}

export const SafeImage: React.FC<{ src?: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const fallback = FERRIS_WHEEL_ICON
    const [imgSrc, setImgSrc] = useState(src && src.trim() !== '' ? src : fallback)

    useEffect(() => {
        // Update imgSrc if src prop changes
        if (src && src.trim() !== '') {
            setImgSrc(src)
        } else {
            setImgSrc(fallback)
        }
    }, [src])

    const handleError = () => {
        if (imgSrc !== fallback) setImgSrc(fallback) // update only once
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={handleError}
        />
    )
}
