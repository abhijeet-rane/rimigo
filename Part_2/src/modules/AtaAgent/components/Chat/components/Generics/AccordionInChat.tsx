import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionInChatProps {
    title: string
    defaultOpen?: boolean
    onToggle?: (isOpen: boolean) => void
    children: React.ReactNode
    className?: string
    headerClassName?: string
    bodyClassName?: string
}

const AccordionInChat: React.FC<AccordionInChatProps> = ({
    title,
    defaultOpen = false,
    onToggle,
    children,
    className,
    headerClassName,
    bodyClassName
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    const handleToggle = () => {
        setIsOpen((prev) => {
            const nextState = !prev
            onToggle?.(nextState)
            return nextState
        })
    }

    const baseContainerClasses = cn(
        'w-full border border-grey_4 rounded-[12px] bg-white px-4 transition-all duration-200 ease-in-out',
        isOpen ? 'py-4' : 'py-3',
        className
    )

    const headerClasses = cn(
        'w-full flex items-center justify-between text-left text-sm font-semibold text-grey_0 focus:outline-none cursor-pointer',
        headerClassName,
        isOpen ? 'pb-2' : ''
    )

    const contentWrapperClasses = cn('overflow-hidden transition-[max-height] duration-300 ease-in-out', isOpen ? 'max-h-[2000px]' : 'max-h-0')

    const bodyClasses = cn(isOpen ? 'pt-2' : '', bodyClassName)

    return (
        <div className="w-full">
            <div className={baseContainerClasses}>
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-expanded={isOpen}
                    className={headerClasses}>
                    <span className="text-[18px] text-grey-0 tracking-num--0_02 font-semibold font-red-hat-display">{title}</span>
                    <ChevronDown className={cn('h-4 w-4 text-grey_0 transition-transform duration-200', isOpen ? 'rotate-180' : '')} />
                </button>
                <div className={contentWrapperClasses}>
                    <div className={bodyClasses}>{children}</div>
                </div>
            </div>
        </div>
    )
}

export default AccordionInChat
