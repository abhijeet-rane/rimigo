import Typography from './Typography'
import { cn } from '@/lib/utils'

interface OrDividerProps {
    className?: string
    textClassName?: string
    lineClassName?: string
}

/**
 * OrDivider Component
 * Displays "--- OR ---" with gradient lines on both sides
 */
export const OrDivider = ({ className, textClassName, lineClassName }: OrDividerProps) => {
    return (
        <div
            className={cn('flex items-center justify-center w-full gap-3 min-w-0', className)}
            role="separator"
            aria-label="or">
            {/* Left gradient line */}
            <div className={cn('flex-1 h-px min-w-0 bg-gradient-to-r from-transparent via-grey-4 to-grey-4', lineClassName)} />

            {/* OR text */}
            <Typography
                family="redhat"
                weight="semibold"
                size="12"
                color="grey-2"
                className={cn('shrink-0', textClassName)}>
                OR
            </Typography>

            {/* Right gradient line */}
            <div className={cn('flex-1 h-px min-w-0 bg-gradient-to-l from-transparent via-grey-4 to-grey-4', lineClassName)} />
        </div>
    )
}
