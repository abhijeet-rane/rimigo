import React from 'react'

interface ShowAllPhotosButtonProps {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    photoCount?: number
    className?: string
}

const ShowAllPhotosButton: React.FC<ShowAllPhotosButtonProps> = ({
    onClick,
    photoCount,
    className = ''
}) => {
    const label = photoCount && photoCount > 1 ? `Show all ${photoCount} photos` : 'Show all photos'

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e)
        }
    }

    return (
        <button
            onClick={handleClick}
            className={`absolute bottom-8 right-4 bg-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow text-sm font-medium text-gray-800 z-10 ${className}`}>
            <GalleryIcon />
            <span className="whitespace-nowrap">{label}</span>
        </button>
    )
}

const GalleryIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
)

export default ShowAllPhotosButton
