interface CustomShimmerProps {
    height?: number
    radius?: number | string
    className?: string
    backgroundColor?: string
    foregroundColor?: string
    fill?: boolean
}

export default function CustomShimmer({
    height,
    radius = 16,
    className = '',
    backgroundColor = 'var(--color-grey-5)',
    foregroundColor = 'var(--color-grey-5)',
    fill = false
}: CustomShimmerProps) {
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{
                width: '100%',
                height: fill ? '100%' : `${height}px`,
                borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
                backgroundColor
            }}>
            {/* Shimmer effect */}
            <div
                style={{
                    width: '50%',
                    height: '100%',
                    background: `linear-gradient(
                        to right,
                        ${backgroundColor} 0%,
                        ${foregroundColor} 50%,
                        ${backgroundColor} 100%
                    )`,
                    position: 'absolute',
                    top: 0,
                    left: '-50%',
                    animation: 'shimmer 1.5s infinite'
                }}
            />

            <style>{`
                @keyframes shimmer {
                    0% {
                        left: -50%;
                    }
                    100% {
                        left: 100%;
                    }
                }
            `}</style>
        </div>
    )
}
