import { UserRoundIcon } from 'lucide-react'
import React from 'react'

interface UserAvatarProps {
    isPremium?: boolean
    isPro?: boolean
    isRimigoInternal?: boolean
    size?: 'sm' | 'md'
    className?: string
    name?: string
}

// Extract initials from name (e.g., "Harshit Yadav" -> "HY")
const getInitials = (name: string | undefined): string | null => {
    if (!name || !name.trim()) return null

    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return null

    if (parts.length === 1) {
        // Single name - return first letter only
        return parts[0][0]?.toUpperCase() || ''
    }

    // Multiple names - return first letter of first and last name
    const firstInitial = parts[0][0]?.toUpperCase() || ''
    const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || ''
    return `${firstInitial}${lastInitial}`
}

const UserAvatar: React.FC<UserAvatarProps> = ({
    isPremium = false,
    isPro = false,
    isRimigoInternal = false,
    size = 'md',
    className = '',
    name
}) => {
    const sizeClasses =
        size === 'sm'
            ? {
                wrapper: 'w-9 h-9',
                icon: 'w-4 h-4',
                text: 'text-xs'
            }
            : {
                wrapper: 'w-10 h-10',
                icon: 'w-5 h-5',
                text: 'text-sm'
            }

    const initials = getInitials(name)
    const hasInitials = initials !== null

    return (
        <div className={`relative ${className}`}>
            {/* Avatar */}
            <div
                className={`rounded-full flex items-center justify-center ${sizeClasses.wrapper} ${hasInitials ? 'bg-grey-4' : 'bg-[#F0F0F0]'
                    }`}>
               
                    <UserRoundIcon className={`text-grey-2 ${sizeClasses.icon}`} />
            </div>

            {/* Premium badge */}
            {isPremium && (
                <div className="absolute bottom-px left-1/2 -translate-x-1/2 translate-y-[40%]">
                    <span className="bg-[#E3D0FF] text-primary-default text-[8px] font-bold tracking-wide px-1.5 py-px rounded">
                        PREMIUM
                    </span>
                </div>
            )}

            {/* Pro badge */}
            {isPro && (
                <div className="absolute bottom-px left-1/2 -translate-x-1/2 translate-y-[40%]">
                    <span className="bg-[#E3D0FF] text-primary-default text-[8px] font-bold tracking-wide px-1.5 py-px rounded">
                        PRO
                    </span>
                </div>
            )}

            {/* Rimigo Internal badge */}
            {isRimigoInternal && (
                <div className="absolute bottom-px left-1/2 -translate-x-1/2 translate-y-[40%]">
                    <span className="bg-[#E3D0FF] text-primary-default text-[8px] font-bold tracking-wide px-1.5 py-px rounded">
                        INTERNAL
                    </span>
                </div>
            )}
        </div>
    )
}

export default UserAvatar
