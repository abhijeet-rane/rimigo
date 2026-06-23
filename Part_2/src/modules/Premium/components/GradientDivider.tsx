import { cn } from '@/lib/utils'

interface LineDividerProps {
    className?: string
    lineClassName?: string
}

export const GradientDivider  = ({ className, lineClassName }: LineDividerProps) => {
    return (
        <div
            className={cn('my-6 flex items-center justify-center w-full', className)}
            role="separator"
            aria-hidden
        >
            <div
                className={cn(
                    'w-3/10 md:w-1/10 h-px bg-linear-to-r from-transparent via-primary-default to-transparent',
                    lineClassName
                )}
            />
        </div>
    )
}
