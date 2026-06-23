import React from 'react'
import { Info, AlertTriangle, XCircle } from 'lucide-react'
import type { RouteWarning } from '../types'

interface WarningBannerProps {
    warning: RouteWarning
}

const SEVERITY_CONFIG: Record<
    string,
    { icon: React.ElementType; containerClass: string; iconColor: string }
> = {
    info: {
        icon: Info,
        containerClass: 'bg-blue-50/50 border-l-2 border-blue-400',
        iconColor: 'text-blue-400',
    },
    warning: {
        icon: AlertTriangle,
        containerClass: 'bg-amber-50/50 border-l-2 border-amber-400',
        iconColor: 'text-amber-400',
    },
    blocker: {
        icon: XCircle,
        containerClass: 'bg-red-50/50 border-l-2 border-red-400',
        iconColor: 'text-red-400',
    },
}

const WarningBanner: React.FC<WarningBannerProps> = ({ warning }) => {
    const config = SEVERITY_CONFIG[warning.severity] || SEVERITY_CONFIG.info
    const Icon = config.icon

    return (
        <div className={`rounded-[12px] px-3 py-2.5 flex items-start gap-2.5 ${config.containerClass}`}>
            <Icon size={16} className={`${config.iconColor} shrink-0 mt-0.5`} />
            <span className="text-xs text-grey_0 font-manrope leading-[18px]">
                {warning.message}
            </span>
        </div>
    )
}

export default WarningBanner
