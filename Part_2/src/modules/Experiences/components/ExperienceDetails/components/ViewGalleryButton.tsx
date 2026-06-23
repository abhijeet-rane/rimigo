import React from 'react'

type ViewGalleryButtonProps = {
    onClick?: () => void
    label?: string
    className?: string
}

const ViewGalleryButton: React.FC<ViewGalleryButtonProps> = ({ onClick, label = 'View gallery', className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer absolute bottom-4 right-4 bg-white rounded-xl px-4 py-2
        flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow 
        ${className}`}>
            <GalleryIcon />
            <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{label}</span>
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
        <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
        />
        <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
        />
        <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
        />
        <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
        />
    </svg>
)

export default ViewGalleryButton
