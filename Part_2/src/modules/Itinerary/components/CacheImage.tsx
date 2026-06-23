import { useEffect, useState } from 'react'
import CustomShimmer from '@/components/shared/Shimmer'

const imageCache = new Map<string, boolean>()

interface Props {
    src: string
    alt: string
    className?: string
    radius?: number
}

const CachedImage: React.FC<Props> = ({ src, alt, className = '', radius = 8 }) => {
    const hasSrc = typeof src === 'string' && src.trim().length > 0
    // Treat missing/empty src as an error upfront so the fallback renders
    // immediately — otherwise Image.onerror doesn't always fire for empty
    // strings and we'd be stuck on the shimmer.
    const [loaded, setLoaded] = useState(hasSrc && imageCache.has(src))
    const [error, setError] = useState(!hasSrc)

    useEffect(() => {
        if (!hasSrc) {
            setError(true)
            return
        }
        if (imageCache.has(src)) {
            setLoaded(true)
            setError(false)
            return
        }
        setError(false)
        setLoaded(false)

        const img = new Image()
        img.src = src
        img.onload = () => {
            imageCache.set(src, true)
            setLoaded(true)
        }
        img.onerror = () => setError(true)
    }, [src, hasSrc])

    if (error) {
        // Fill the parent slot so the surrounding card doesn't collapse
        // when the image is missing or fails to load.
        return (
            <div
                className="w-full h-full bg-grey-4"
                style={{ borderRadius: radius }}
            />
        )
    }

    return (
        <div className="relative w-full h-full overflow-hidden">
            {!loaded && (
                <CustomShimmer
                    fill
                    radius={radius}
                />
            )}

            <img
                src={src}
                alt={alt}
                className={`absolute inset-0  w-full h-full object-cover transition-opacity duration-300 ${
                    loaded ? 'opacity-100' : 'opacity-0'
                } ${className}`}
                loading="lazy"
            />
        </div>
    )
}

export default CachedImage
