import { cn } from '@/lib/utils'

interface DividerProps {
    className?: string
    variant?: 'vertical' | 'horizontal'
}

const Divider = ({ className, variant = 'horizontal' }: DividerProps) => {
    if (variant === 'vertical') {
        return <div className={cn('w-[1px] h-[full] bg-grey-4', className)} />
    }
    return <div className={cn('w-full h-px bg-grey-4', className)} />
}

export default Divider
