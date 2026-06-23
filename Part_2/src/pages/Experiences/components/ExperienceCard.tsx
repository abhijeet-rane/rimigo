import React from 'react'
import { Heart, Upload, Star } from 'lucide-react'

export interface Experience {
    id: string
    title: string
    location: string
    price: string
    rating: number
    image: string
    badge?: {
        text: string
        type: 'original' | 'popular'
    }
    isLiked?: boolean
    isUploaded?: boolean
}

interface ExperienceCardProps {
    experience: Experience
    onLike?: (id: string) => void
    onUpload?: (id: string) => void
    onClick?: (id: string) => void
}

const ExperienceCard: React.FC<ExperienceCardProps> = ({ experience, onLike, onUpload, onClick }) => {
    const { id, title, location, price, rating, image, badge, isLiked, isUploaded } = experience

    const handleCardClick = () => {
        onClick?.(id)
    }

    const handleLikeClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onLike?.(id)
    }

    const handleUploadClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onUpload?.(id)
    }

    return (
        <div
            className="group cursor-pointer border-2 border-red-400 lg:min-h-[410px]"
            onClick={handleCardClick}>
            <div className="relative w-full aspect-square rounded-t-lg overflow-hidden mb-3">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badge */}
                {badge && (
                    <div
                        className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                            badge.type === 'original' ? 'bg-yellow-400 text-black' : 'bg-pink-500 text-white'
                        }`}>
                        {badge.text}
                    </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                    {isUploaded && (
                        <button
                            onClick={handleUploadClick}
                            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
                            <Upload className="w-4 h-4 text-gray-700" />
                        </button>
                    )}

                    <button
                        onClick={handleLikeClick}
                        className={`w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center transition-colors ${
                            isLiked ? 'text-red-500 hover:bg-white' : 'text-gray-700 hover:bg-white'
                        }`}>
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>

                <p className="text-sm text-gray-600">{location}</p>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{price}</span>

                    {rating > 0 && (
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">{rating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExperienceCard
