import { Sparkles, X } from 'lucide-react'
import clsx from 'clsx'

interface CTAButtonProps {
    text?: string
    Icon?: React.ElementType
    onCTAClick: () => void
    className?: string
    disabled?: boolean
    isOpen?: boolean
}

const CTAButton = ({ text = 'ASSISTANT', Icon, onCTAClick, className, disabled = true, isOpen = false }: CTAButtonProps) => {
    return (
        <button
            onClick={onCTAClick}
            disabled={disabled}
            className={clsx(
                'flex items-center justify-center gap-2 px-4 h-10 rounded-lg border font-red-hat-display text-sm font-weight-645 leading-4 tracking-[-0.12px] transition-colors cursor-pointer',
                isOpen
                    ? 'border-primary-default bg-primary-default text-white hover:bg-primary-default/90'
                    : 'border-primary-default bg-primary-default-12 text-primary-default hover:bg-primary-default hover:text-white',
                className
            )}>
            {isOpen ? <X className="w-4 h-4" /> : Icon ? <Icon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{text}</span>
        </button>
    )
}

export default CTAButton
