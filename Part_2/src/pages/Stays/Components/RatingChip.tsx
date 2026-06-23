import { Star } from 'lucide-react'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'


interface RatingChipProps {
    rating: number
    className?: string
    platform?: string
}

const RatingChip: React.FC<RatingChipProps> = ({ rating, className, platform }) => {
    return (
        <div
            className={`bg-grey-5 rounded-full px-3 py-1.5 md:px-2.5 md:py-1.25 sm:px-2 sm:py-1 flex items-center gap-1.5 md:gap-1 sm:gap-1 shadow-sm ${className || ''}`}>
            {platform === 'Kayak' ? (
               <img src={getPlatformLogoURL(platform) ?? ''} className="w-4 h-4 object-contain rounded-full" alt="star-icon" />
            ) : (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
            <span className="text-xs font-medium text-header-black font-red-hat-display">
                {rating.toFixed(1)}
            </span>
        </div>
    )
}

export default RatingChip
