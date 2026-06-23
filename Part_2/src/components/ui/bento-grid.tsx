import { cn } from '@/lib/utils'

export const BentoGrid = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    return <div className={cn('grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ', className)}>{children}</div>
}

export const BentoGridItem = ({ className, content }: { className?: string; content?: React.ReactNode }) => {
    return (
        <div
            className={cn(
                'row-span-1 rounded-xl group/bento transition duration-200 shadow-feature-card-border bg-white  border-transparent justify-between flex flex-col  ',
                className
            )}>
            {content}
        </div>
    )
}
