import { cn } from '@/lib/utils'

interface DividerLineProps {
    direction?: 'left' | 'right'
    className?: string
}

export const DividerLine = ({
    direction = 'left',
    className
}: DividerLineProps) => {
    const gradient =
        direction === 'left'
            ? 'bg-gradient-to-r from-transparent via-grey-4 to-grey-4'
            : 'bg-gradient-to-l from-transparent via-grey-4 to-grey-4'

    return (
        <div
            className={cn(
                'flex-1 h-px min-w-0',
                gradient,
                className
            )}
        />
    )
}
