import React from 'react'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    color?: 'white' | 'primary'
    className?: string
}

const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4'
}

const colorClasses = {
    white: 'border-white/30 border-t-white',
    primary: 'border-primary-default/30 border-t-primary-default'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'primary', className = '' }) => {
    return <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}></div>
}

export default LoadingSpinner
