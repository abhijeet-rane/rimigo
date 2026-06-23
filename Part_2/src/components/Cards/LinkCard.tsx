import { TAROT_CARD } from '@/constants/thiingsIcons'
import { FC, ReactNode } from 'react'

interface LinkCardProps {
    title: string
    description: string
    iconSrc?: string
    actionLabel?: string
    actionIcon?: string | ReactNode
    onAction: () => void
}

/**
 * Compact horizontal card component that displays:
 * - image/icon on the left
 * - title and description on the right
 * - "next" button in bottom right corner (similar to CountryCard)
 */
const LinkCard: FC<LinkCardProps> = ({ title, description, iconSrc, onAction }) => {
    return (
        <div
            onClick={onAction}
            className="relative w-full rounded-lg bg-white border border-grey-4 box-border flex items-start gap-3 p-4 text-left font-red-hat-display cursor-pointer hover:bg-grey-6 transition-colors group ">
            <CardImage iconSrc={iconSrc} />
            <CardContent
                title={title}
                description={description}
            />
            {/* Next Button - Bottom Right Corner (similar to CountryCard) */}
            <div
                className="absolute bottom-0 right-0 z-10"
                onClick={(e) => e.stopPropagation()}
                style={{ pointerEvents: 'none' }}>
                <div
                    className="flex items-center justify-center group-hover:opacity-90 transition-opacity"
                    style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#101010',
                        color: '#FFF',
                        borderTopLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        pointerEvents: 'none'
                    }}>
                    <span
                        className="text-s font-semibold"
                        style={{
                            color: '#FFF'
                        }}>
                        ›
                    </span>
                </div>
            </div>
        </div>
    )
}

export default LinkCard

/* -------------------------------------------------------------------------- */
/*                               Internal parts                                */
/* -------------------------------------------------------------------------- */

interface CardImageProps {
    iconSrc?: string
}

const CardImage: FC<CardImageProps> = ({ iconSrc = TAROT_CARD }) => {
    return (
        <div className="w-16 h-16 rounded-lg  bg-white shrink-0 overflow-hidden">
            <img
                src={iconSrc}
                alt=""
                className="w-full h-full object-cover"
            />
        </div>
    )
}

interface CardContentProps {
    title: string
    description: string
}

const CardContent: FC<CardContentProps> = ({ title, description }) => {
    return (
        <div className="flex-1 flex flex-col gap-2 min-w-0 pb-2">
            <div className="flex flex-col gap-3">
                <h3 className="text-[16px] font-semibold font-red-hat-display tracking-[-0.02em] leading-5 text-grey-0 ">{title}</h3>
                <p className="text-sm font-medium tracking-[-0.02em] text-grey-2 font-manrope line-clamp-3">{description}</p>
            </div>
        </div>
    )
}
