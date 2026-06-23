import React from 'react'
import { cn } from '@/lib/utils'

const GenericCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <div className={cn('bg-white md:rounded-2xl md:border border-feature-card-border  pt-4 px-5 pb-4', className)}>{children}</div>
}

export default GenericCard