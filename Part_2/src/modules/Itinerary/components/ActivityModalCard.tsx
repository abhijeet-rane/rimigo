import Typography from '@/components/shared/Typography'
import { Plus, MapPin } from 'lucide-react'
import CachedImage from './CacheImage'

interface Props {
    id: string
    imageUrl: string
    description: string
    cityName?: string
    countryName?: string
    onAdd: (id: string) => void
}

const ActivityModalCard: React.FC<Props> = ({ id, imageUrl, description, cityName, countryName, onAdd }) => {
    const locationLabel = cityName && countryName && cityName !== countryName
        ? `${cityName}, ${countryName}`
        : cityName || countryName || ''

    return (
        <div
            onClick={() => onAdd(id)}
            className="w-full cursor-pointer border flex flex-col border-grey-4 rounded-lg hover:border-primary-default/40 overflow-hidden hover:shadow-md transition-all duration-200 bg-white group">
            {/* Image */}
            <div className="h-26 relative">
                <CachedImage
                    className=""
                    src={imageUrl}
                    alt={description}
                    radius={0}
                />
                <button
                    className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Add activity">
                    <Plus size={13} className="text-primary-default" strokeWidth={2.5} />
                </button>
            </div>
            {/* Content */}
            <div className="flex flex-col gap-0.5 p-2 pb-2.5">
                <Typography
                    size="12"
                    weight="semibold"
                    family="redhat"
                    color="grey-0"
                    className="leading-[1.3]">
                    {description}
                </Typography>
                {locationLabel && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-grey-3 shrink-0" />
                        <span className="text-[10px] font-manrope text-grey-2 truncate">
                            {locationLabel}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ActivityModalCard
