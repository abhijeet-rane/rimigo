import { cn } from '@/lib/utils'

const SectionDescription = ({ description, align = 'center', className }: { description: string; align?: 'center' | 'left'; className?: string }) => {
    return (
        <p
            className={cn(
                'w-full text-[16px] leading-[20px] font-medium  tracking-[-0.02em]  md:text-[16px] text-grey-2 font-manrope',
                align === 'left' ? 'text-left' : 'text-center',
                className
            )}>
            {description}
        </p>
    )
}

export default SectionDescription
