import { cn } from '@/lib/utils'
import { INSTAGRAM_ICON } from '@/constants/icons/svgFromCDN'

interface CreatorAvatarProps {
    name: string
    imageUrl?: string | null
    /** Rimigo fallback: compass on a white, contained background. */
    isRimigo?: boolean
    /** Avatar diameter in px. */
    size: number
    /** Instagram-badge wrapper size (Tailwind w/h). */
    badgeClassName?: string
    /** Instagram glyph size inside the badge (Tailwind w/h). */
    badgeIconClassName?: string
    className?: string
}

/**
 * Round creator avatar with an Instagram badge. Shared by CreatorInfo (card
 * header) and CollectionCreatorBar (creator bar) so the treatment stays in
 * sync. The badge's white ring carves the glyph out so it reads on any bg.
 */
const CreatorAvatar: React.FC<CreatorAvatarProps> = ({
    name,
    imageUrl,
    isRimigo,
    size,
    badgeClassName = 'w-4 h-4',
    badgeIconClassName = 'w-3 h-3',
    className
}) => (
    <div
        className={cn('relative shrink-0', className)}
        style={{ width: size, height: size }}>
        <div className={cn('w-full h-full rounded-full overflow-hidden', isRimigo ? 'bg-white' : 'bg-grey-4')}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name}
                    className={cn('w-full h-full', isRimigo ? 'object-contain p-1' : 'object-cover')}
                />
            ) : (
                <div className="w-full h-full bg-grey-4" />
            )}
        </div>
        <span
            aria-hidden
            className={cn(
                'absolute -bottom-0.5 -right-0.5 rounded-full bg-white flex items-center justify-center shadow-[0_0_0_1px_white]',
                badgeClassName
            )}>
            <img
                src={INSTAGRAM_ICON}
                alt=""
                className={cn('object-contain block', badgeIconClassName)}
            />
        </span>
    </div>
)

export default CreatorAvatar
