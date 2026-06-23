import React from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import type { DiscoveryResultItem } from '../types'

interface PlaceCardProps {
    place: DiscoveryResultItem
    onAddToItinerary?: (place: DiscoveryResultItem) => void
    compact?: boolean
    highlighted?: boolean
    onMouseEnter?: () => void
    onMouseLeave?: () => void
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
)

const PlaceCard: React.FC<PlaceCardProps> = ({
    place,
    onAddToItinerary,
    compact = false,
    highlighted = false,
    onMouseEnter,
    onMouseLeave,
}) => {
    const directionsUrl =
        place.google_maps_url ||
        (place.latitude != null && place.longitude != null
            ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
            : null)

    const thumbnailSize = compact ? 'w-12 h-12' : 'w-14 h-14'
    const thumbnailRadius = compact ? 'rounded-lg' : 'rounded-[10px]'

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`flex gap-3 rounded-[14px] border p-3 transition-all duration-200 ${
                highlighted
                    ? 'bg-primary-default/[0.04] border-primary-default/20 shadow-sm'
                    : 'bg-white border-grey_4'
            }`}>
            {/* Thumbnail */}
            <div className={`flex-shrink-0 ${thumbnailSize} ${thumbnailRadius} overflow-hidden bg-grey-5`}>
                {place.image_url ? (
                    <img
                        src={place.image_url}
                        alt={`${place.name} photo`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-default/20 to-primary-default/5">
                        <span className="text-lg font-bold text-primary-default/40 font-manrope">
                            {place.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <p className="text-sm font-semibold text-grey_0 font-manrope truncate">
                    {place.name}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                    {place.category && (
                        <span className="text-[10px] font-medium text-primary-default/70 bg-primary-default/[0.06] rounded-full px-2 py-0.5 font-manrope">
                            {place.category}
                        </span>
                    )}
                    {place.rating != null && (
                        <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon key={i} filled={i < Math.round(place.rating!)} />
                            ))}
                            {place.review_count != null && (
                                <span className="text-[10px] text-grey_2 font-manrope ml-1">
                                    ({place.review_count.toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}
                    {place.distance_text && (
                        <span className="text-[10px] text-grey_2 font-manrope">
                            {place.distance_text}
                        </span>
                    )}
                </div>

                {place.address && (
                    <p className="text-[10px] text-grey_3 font-manrope truncate">{place.address}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 self-center flex flex-col items-center gap-1.5">
                {directionsUrl && (
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Get directions to ${place.name}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-grey_4 text-grey_1 text-[10px] font-semibold font-manrope hover:border-primary-default hover:text-primary-default transition-colors cursor-pointer whitespace-nowrap">
                        <MapPin className="w-3 h-3" />
                        Directions
                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>
                )}

                {onAddToItinerary && (
                    <button
                        type="button"
                        onClick={() => onAddToItinerary(place)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-primary-default/10 text-primary-default text-[10px] font-semibold font-manrope hover:bg-primary-default/20 transition-colors cursor-pointer whitespace-nowrap">
                        + Add
                    </button>
                )}
            </div>
        </div>
    )
}

export default PlaceCard
