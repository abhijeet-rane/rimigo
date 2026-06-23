import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, Loader2, X, AlertCircle, ExternalLink, Circle } from 'lucide-react'
import { DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import type { TripboardStep } from '../services/tripboardService'
import type { TripboardStatus } from '../hooks/useTripboardCreation'
import { TRIP_COLLECTION_ROUTE } from '@/routes/routes'

interface TripboardProgressModalProps {
    open: boolean
    onClose: () => void
    steps: TripboardStep[]
    status: TripboardStatus
    error: string | null
    identifier: string | null
    onRetry?: () => void
}

function StepIcon({ status }: { status: TripboardStep['status'] }) {
    switch (status) {
        case 'completed':
            return (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-green shrink-0">
                    <Check className="text-white" size={14} strokeWidth={3} />
                </div>
            )
        case 'active':
            return (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-default shrink-0">
                    <Loader2 className="text-white animate-spin" size={14} />
                </div>
            )
        case 'error':
            return (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-red shrink-0">
                    <AlertCircle className="text-white" size={14} />
                </div>
            )
        default:
            return (
                <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-grey-4 bg-white shrink-0">
                    <Circle className="text-grey-3" size={8} fill="currentColor" />
                </div>
            )
    }
}

const TripboardProgressModal: React.FC<TripboardProgressModalProps> = ({
    open,
    onClose,
    steps,
    status,
    error,
    identifier,
    onRetry
}) => {
    const navigate = useNavigate()

    const progress = useMemo(() => {
        const completed = steps.filter((s) => s.status === 'completed').length
        return Math.round((completed / steps.length) * 100)
    }, [steps])

    const title = useMemo(() => {
        if (status === 'completed') return 'Tripboard Ready!'
        if (status === 'error') return 'Something went wrong'
        return 'Creating Your Tripboard'
    }, [status])

    const subtitle = useMemo(() => {
        if (status === 'completed') return 'Your personalized trip essentials are all set.'
        if (status === 'error') return 'We hit a snag, but you can try again.'
        return 'Sit tight while we put together your travel essentials...'
    }, [status])

    const handleViewTripboard = () => {
        if (identifier) {
            onClose()
            navigate(`${TRIP_COLLECTION_ROUTE}/${identifier}`)
        }
    }

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    className="fixed left-[50%] top-[50%] z-71 w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%]
                        bg-white rounded-2xl shadow-xl overflow-hidden
                        data-[state=open]:animate-in data-[state=closed]:animate-out
                        data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                        data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
                        data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
                        data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
                    onInteractOutside={(e) => {
                        if (status === 'creating') e.preventDefault()
                    }}
                    onEscapeKeyDown={(e) => {
                        if (status === 'creating') e.preventDefault()
                    }}>
                    {/* Progress bar */}
                    <div className="h-1 bg-grey-5">
                        <div
                            className="h-full bg-primary-default transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-5 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-[18px] font-semibold text-grey-0 font-red-hat-display">{title}</h2>
                                <p className="text-[13px] text-grey-2 font-manrope mt-1">{subtitle}</p>
                            </div>
                            {status !== 'creating' && (
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-md hover:bg-grey-5 transition-colors text-grey-2 hover:text-grey-0">
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Steps timeline */}
                    <div className="px-6 py-4">
                        <div className="flex flex-col">
                            {steps.map((step, index) => {
                                const isLast = index === steps.length - 1
                                const isPending = step.status === 'pending'
                                const isActive = step.status === 'active'

                                return (
                                    <div key={step.id} className="flex gap-3">
                                        {/* Left: icon + connector line */}
                                        <div className="flex flex-col items-center">
                                            <StepIcon status={step.status} />
                                            {!isLast && (
                                                <div
                                                    className={`w-0.5 flex-1 my-1 rounded-full transition-colors duration-300 ${
                                                        step.status === 'completed'
                                                            ? 'bg-secondary-green'
                                                            : 'bg-grey-4'
                                                    }`}
                                                    style={{ minHeight: isActive && step.description ? 20 : 12 }}
                                                />
                                            )}
                                        </div>

                                        {/* Right: label + description */}
                                        <div className={`pb-3 ${isPending ? 'opacity-40' : ''}`}>
                                            <span
                                                className={`text-[14px] font-manrope leading-7 ${
                                                    isActive
                                                        ? 'font-semibold text-grey-0'
                                                        : step.status === 'completed'
                                                          ? 'font-medium text-grey-1'
                                                          : step.status === 'error'
                                                            ? 'font-medium text-secondary-red'
                                                            : 'font-medium text-grey-2'
                                                }`}>
                                                {step.label}
                                            </span>
                                            {isActive && step.description && (
                                                <p className="text-[12px] text-grey-2 font-manrope mt-0.5 leading-relaxed">
                                                    {step.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    {status === 'completed' && identifier && (
                        <div className="px-6 pb-5">
                            <button
                                onClick={handleViewTripboard}
                                className="w-full flex items-center justify-center gap-2
                                    bg-primary-default text-white rounded-xl py-3
                                    font-manrope font-semibold text-[14px]
                                    hover:bg-primary-default/90 transition-colors cursor-pointer">
                                <ExternalLink size={16} />
                                View Your Tripboard
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="px-6 pb-5 space-y-3">
                            {error && (
                                <p className="text-[12px] text-secondary-red font-manrope bg-secondary-red/8 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="w-full flex items-center justify-center gap-2
                                        border border-primary-default bg-white text-primary-default rounded-xl py-3
                                        font-manrope font-semibold text-[14px]
                                        hover:bg-grey-5 transition-colors cursor-pointer">
                                    Try Again
                                </button>
                            )}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    )
}

export default TripboardProgressModal
