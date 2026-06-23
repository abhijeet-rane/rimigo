import React from 'react'

interface CircularImageProps {
    url: string // image URL
    radius?: number // optional, defaults to 50
}

const CircularImage: React.FC<CircularImageProps> = ({ url, radius = 50 }) => {
    // Tailwind doesn't support dynamic width/height with px values directly,
    // so we use inline style only for dynamic sizes, keeping rest in Tailwind
    return (
        <img
            src={url}
            alt="circular"
            className="rounded-full object-cover"
            style={{
                width: radius * 2, // diameter
                height: radius * 2
            }}
        />
    )
}

export default CircularImage
