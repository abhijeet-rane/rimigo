import CustomShimmer from '@/components/shared/Shimmer'
import { useState } from 'react'

type SafeImageProps = {
    src?: string
    alt: string
    className?: string
    width?: number
    height?: number
    radius?: number
    fill?: boolean
}

const SafeImage = ({ src, alt, className = '', width = 48, height = 48, radius = 8, fill = false }: SafeImageProps) => {
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    if (!src || error) return null

    const wrapperStyle = fill
        ? { width: '100%', height: '100%', borderRadius: radius }
        : { width, height, borderRadius: radius }

    return (
        <div
            className={`relative overflow-hidden ${fill ? '' : 'shrink-0'}`}
            style={wrapperStyle}>
            {/* Shimmer — visible sweep (grey-4 base, grey-5 highlight) so there's a
                real placeholder while the image loads, not a near-white block. */}
            {!loaded && (
                <CustomShimmer
                    height={fill ? '100%' as any : height}
                    radius={radius}
                    backgroundColor="var(--color-grey-4)"
                    foregroundColor="var(--color-grey-5)"
                />
            )}

            {/* Image */}
            <img
                src={src}
                alt={alt}
                draggable={false}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
                    loaded ? 'opacity-100' : 'opacity-0'
                } ${className}`}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />
        </div>
    )
}

export default SafeImage
