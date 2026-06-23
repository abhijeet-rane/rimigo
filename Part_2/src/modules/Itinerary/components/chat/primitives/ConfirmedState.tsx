import React from 'react'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; defaultLabel: string }> = {
    applied: { icon: CheckCircle, color: 'text-emerald-600', defaultLabel: 'Changes applied' },
    updated: { icon: CheckCircle, color: 'text-emerald-600', defaultLabel: 'Updated successfully' },
    cancelled: { icon: XCircle, color: 'text-grey_3', defaultLabel: 'Cancelled' },
}

const DEFAULT_ACTION = { icon: CheckCircle, color: 'text-grey_2', defaultLabel: 'Done' }

interface ConfirmedStateProps {
    /** What happened: 'applied', 'cancelled', 'updated', or custom string */
    action: string
    /** Custom label override */
    label?: string
    /** Show refresh button */
    onRefresh?: () => void
    refreshLabel?: string
}

const ConfirmedState: React.FC<ConfirmedStateProps> = ({
    action,
    label,
    onRefresh,
    refreshLabel = 'Refresh Itinerary',
}) => {
    const config = ACTION_CONFIG[action] || DEFAULT_ACTION
    const Icon = config.icon
    const displayLabel = label || config.defaultLabel

    return (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-grey_4">
            <div className="flex items-center gap-2">
                <Icon size={16} className={config.color} />
                <span className={`text-sm font-medium font-manrope ${config.color}`}>
                    {displayLabel}
                </span>
            </div>
            {onRefresh && (
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-default font-manrope hover:text-primary-dark transition-colors cursor-pointer"
                >
                    <RefreshCw size={12} />
                    {refreshLabel}
                </button>
            )}
        </div>
    )
}

export default ConfirmedState
