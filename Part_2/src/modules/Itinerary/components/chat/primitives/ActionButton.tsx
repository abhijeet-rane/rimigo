import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronRight } from 'lucide-react'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 font-semibold font-manrope transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-primary-default to-primary-dark text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] rounded-full',
                secondary:
                    'bg-transparent text-primary-default border border-primary-default/30 hover:bg-primary-default/5 active:bg-primary-default/10 rounded-full',
                ghost:
                    'bg-primary-default text-white hover:bg-primary-dark active:bg-primary-dark/90 rounded-[8px]',
            },
            size: {
                sm: 'text-xs px-3.5 py-2 min-h-[36px]',
                md: 'text-sm px-5 py-2.5 min-h-[44px]',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    },
)

interface ActionButtonProps extends VariantProps<typeof buttonVariants> {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    /** Show arrow icon after text for primary actions */
    showArrow?: boolean
    className?: string
}

const ActionButton: React.FC<ActionButtonProps> = ({
    children,
    onClick,
    variant,
    size,
    disabled = false,
    showArrow = false,
    className = '',
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${buttonVariants({ variant, size })} ${className}`}
    >
        {children}
        {showArrow && <ChevronRight size={14} className="flex-shrink-0" />}
    </button>
)

export default ActionButton
