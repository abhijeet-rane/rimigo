import { cn } from '@/lib/utils'

interface Avatar {
    imageUrl: string
    profileUrl: string
}
interface AvatarCirclesProps {
    className?: string
    numPeople?: number
    avatarUrls: Avatar[]
}

export const AvatarCircles = ({ numPeople, className, avatarUrls }: AvatarCirclesProps) => {
    return (
        <div className={cn('z-10 flex -space-x-2 sm:-space-x-3 md:-space-x-4 rtl:space-x-reverse', className)}>
            {avatarUrls.map((url, index) => (
                <a
                    key={index}
                    href={url.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer">
                    <img
                        key={index}
                        className="w-[24px] h-[24px] sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-12 lg:w-12 rounded-full border-2 border-white"
                        src={url.imageUrl}
                        alt={`Avatar ${index + 1}`}
                    />
                </a>
            ))}
            {(numPeople ?? 0) > 0 && (
                <a
                    className="flex h-[24px] w-[24px] sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-12 lg:w-12 items-center justify-center rounded-full border-2 border-white bg-black text-xs sm:text-sm md:text-base font-medium text-white hover:bg-gray-600  "
                    href="">
                    +{numPeople}
                </a>
            )}
        </div>
    )
}
