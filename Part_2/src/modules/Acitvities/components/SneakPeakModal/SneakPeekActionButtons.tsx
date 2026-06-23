import React from 'react'

interface SneakPeekActionButtonsProps {
    OnViewTours?: () => void
    onViewDetails: () => void
}

const SneakPeekActionButtons: React.FC<SneakPeekActionButtonsProps> = ({ OnViewTours, onViewDetails }) => {
    return (
        <div className="flex gap-3 md:pt-4">
            {/* VIEW TOURS (optional) */}
            {OnViewTours && (
                <button
                    onClick={OnViewTours}
                    className="flex-1 flex items-center justify-center px-4 py-3 rounded-[12px] md:rounded-lg bg-primary-default text-white hover:bg-primary-dark transition-colors">
                    <span className="text-[14px] font-semibold font-red-hat-display uppercase">VIEW TOURS</span>
                </button>
            )}

            {/* VIEW DETAILS */}
            <button
                onClick={onViewDetails}
                className="flex-1 flex items-center justify-center px-4 py-3 rounded-[12px] md:rounded-lg bg-grey-0 text-white hover:bg-grey-1 transition-colors">
                <span className="text-[14px] font-semibold font-red-hat-display uppercase">VIEW DETAILS</span>
            </button>
        </div>
    )
}

export default SneakPeekActionButtons
