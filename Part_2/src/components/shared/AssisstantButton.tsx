import { Sparkles, X } from 'lucide-react'
import clsx from 'clsx'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'

interface AssisstantButtonProps {
    text?: string
    onAssistantClick: () => void
    className?: string
    disabled?: boolean
    isOpen?: boolean
    iconUrl?: string
}

const AssisstantButton = ({
    text = WEBSITE_CONFIG.ASSISTANT_BUTTON_TEXT,
    onAssistantClick,
    className,
    disabled = false,
    isOpen = false,
    iconUrl = ''
}: AssisstantButtonProps) => {
    return (
        <button
            onClick={onAssistantClick}
            disabled={disabled}
            className={clsx(
                'flex items-center justify-center gap-2 h-10 px-3 rounded-xl border font-red-hat-display text-[12px] font-weight-645 leading-4 tracking-[-0.12px] transition-colors cursor-pointer',
                isOpen
                    ? 'border-primary-default bg-primary-default text-white hover:bg-primary-default/90'
                    : 'border-primary-default bg-primary-default-12 text-primary-default hover:bg-primary-default hover:text-white',
                className
            )}>
            {isOpen ? (
                <X className="w-4 h-4" />
            ) : iconUrl ? (
                <img
                    src={iconUrl}
                    alt="Assistant"
                    className="w-4 h-4"
                />
            ) : (
                <Sparkles className="w-4 h-4" />
            )}
            <span className="text-[12px] font-[645] leading-4 tracking-[-0.12px] uppercase">{text}</span>
        </button>
    )
}

export default AssisstantButton
