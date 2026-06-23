import { TAROT_CARD } from '@/constants/thiingsIcons'
import { FC, ReactNode } from 'react'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'

interface ActionCardProps {
    title: string
    description: string
    iconSrc?: string
    actionLabel?: string
    actionIcon?: string | ReactNode
    actionIconPosition?: 'left' | 'right'
    onAction: () => void
}

/**
 * Generic card component that displays:
 * - optional icon
 * - title
 * - description
 * - primary action button
 */
const ActionCard: FC<ActionCardProps> = ({
    title,
    description,
    iconSrc,
    actionLabel = 'Download',
    actionIcon,
    actionIconPosition = 'right',
    onAction
}) => {
    return (
        <div className="w-full rounded-2xl bg-white border border-grey-4 box-border flex flex-col p-6 gap-8 text-left font-red-hat-display">
            <CardIcon iconSrc={iconSrc} />
            <CardContent
                title={title}
                description={description}
                actionLabel={actionLabel}
                actionIcon={actionIcon}
                actionIconPosition={actionIconPosition}
                onAction={onAction}
            />
        </div>
    )
}

export default ActionCard

/* -------------------------------------------------------------------------- */
/*                               Internal parts                                */
/* -------------------------------------------------------------------------- */

interface CardIconProps {
    iconSrc?: string
}

const CardIcon: FC<CardIconProps> = ({ iconSrc = TAROT_CARD }) => {
    return (
        <img
            src={iconSrc}
            alt=""
            className="w-16 h-auto object-cover"
        />
    )
}

interface CardContentProps {
    title: string
    description: string
    actionLabel: string
    actionIcon?: string | ReactNode
    actionIconPosition: 'left' | 'right'
    onAction: () => void
}

const CardContent: FC<CardContentProps> = ({ title, description, actionLabel, actionIcon, actionIconPosition, onAction }) => {
    return (
        <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold tracking-[-0.02em] leading-6 text-gray">{title}</h3>

                <DescriptionWithShowMore
                    description={description}
                    className="text-base font-medium tracking-[-0.02em] text-grey-1 font-manrope"
                    textSize="16px"
                    lineHeight="24px"
                    maxLines={2}
                />
            </div>

            <ActionButton
                label={actionLabel}
                icon={actionIcon}
                iconPosition={actionIconPosition}
                onClick={onAction}
            />
        </div>
    )
}

interface ActionButtonProps {
    label: string
    icon?: string | ReactNode
    iconPosition: 'left' | 'right'
    onClick: () => void
}

const ActionButton: FC<ActionButtonProps> = ({ label, icon, iconPosition, onClick }) => {
    const iconElement = icon ? (
        typeof icon === 'string' ? (
            <img
                src={icon}
                alt=""
                className="w-4 h-4 object-contain"
            />
        ) : (
            icon
        )
    ) : null

    return (
        <button
            onClick={onClick}
            className="rounded-xl border border-grey-4 bg-white flex items-center gap-1 py-3 px-4 text-base font-semibold text-primary-default hover:bg-gray-50 transition w-fit cursor-pointer">
            {iconPosition === 'left' && iconElement}
            {label}
            {iconPosition === 'right' && iconElement}
        </button>
    )
}
