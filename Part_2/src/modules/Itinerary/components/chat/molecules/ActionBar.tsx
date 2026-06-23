import React from 'react'
import ActionButton from '../primitives/ActionButton'
import ConfirmedState from '../primitives/ConfirmedState'

interface ActionBarProps {
    confirmed: boolean
    /** From backend _consumed field */
    consumed?: { action?: string }
    onApply: () => void
    onCancel?: () => void
    onRefresh?: () => void
    applyLabel?: string
    cancelLabel?: string
    refreshLabel?: string
}

const ActionBar: React.FC<ActionBarProps> = ({
    confirmed,
    consumed,
    onApply,
    onCancel,
    onRefresh,
    applyLabel = 'Apply Changes',
    cancelLabel = 'Cancel',
    refreshLabel = 'Refresh Itinerary',
}) => {
    if (confirmed || consumed) {
        const action = consumed?.action || (confirmed ? 'applied' : 'cancelled')
        return (
            <ConfirmedState
                action={action}
                onRefresh={onRefresh}
                refreshLabel={refreshLabel}
            />
        )
    }

    return (
        <div className="flex items-center gap-3 pt-2 border-t border-grey_4">
            <ActionButton variant="primary" size="sm" onClick={onApply} showArrow>
                {applyLabel}
            </ActionButton>
            {onCancel && (
                <ActionButton variant="secondary" size="sm" onClick={onCancel}>
                    {cancelLabel}
                </ActionButton>
            )}
        </div>
    )
}

export default ActionBar
