import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
    'inline-flex items-center gap-1 font-semibold font-manrope border',
    {
        variants: {
            variant: {
                neutral: 'bg-grey_5 text-grey_2 border-grey_4',
                primary: 'bg-primary-default/10 text-primary-default border-primary-default/20',
                success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                warning: 'bg-amber-50 text-amber-700 border-amber-200',
                danger: 'bg-red-50 text-red-700 border-red-200',
                info: 'bg-blue-50 text-blue-700 border-blue-200',
            },
            size: {
                sm: 'text-[10px] px-2 py-0.5 rounded-full',
                md: 'text-xs px-2.5 py-1 rounded-full',
            },
        },
        defaultVariants: {
            variant: 'neutral',
            size: 'sm',
        },
    },
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
    children: React.ReactNode
    /** Optional leading icon */
    icon?: React.ReactNode
    className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
    children,
    variant,
    size,
    icon,
    className = '',
}) => (
    <span className={`${badgeVariants({ variant, size })} ${className}`}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
    </span>
)

export default StatusBadge
