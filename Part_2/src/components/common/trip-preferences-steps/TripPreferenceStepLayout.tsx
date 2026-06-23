import { ReactNode } from 'react'
import Typography from '@/components/shared/Typography'
import { Button } from '@/components/shared/ButtonNew'
import { X } from 'lucide-react'

interface TripPreferenceStepLayoutProps {
    title: string
    description?: string
    flowType: 'create' | 'edit'
    children: ReactNode
    onPrimary: () => void
    primaryDisabled?: boolean
    primaryLoading?: boolean
    primaryLabel?: string
    secondaryLabel?: string
    onSecondary?: () => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
}

const TripPreferenceStepLayout = ({
    title,
    description,
    flowType,
    children,
    onPrimary,
    primaryDisabled = false,
    primaryLoading = false,
    primaryLabel,
    secondaryLabel,
    onSecondary,
    currentStep,
    totalSteps,
    onClose
}: TripPreferenceStepLayoutProps) => {
    const resolvedPrimaryLabel = primaryLabel ?? (flowType === 'create' ? 'Next' : 'Save')
    const showSecondaryButton = Boolean(secondaryLabel && onSecondary)
    const showProgress = flowType === 'create' && typeof currentStep === 'number' && typeof totalSteps === 'number' && totalSteps > 0
    const progress = showProgress ? Math.min(Math.max(currentStep / totalSteps, 0), 1) : 0

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="shrink-0 border-b border-[#EDEDED] px-6 pb-4 pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <Typography
                            size="24"
                            weight="semibold"
                            family="redhat"
                            color="grey-0">
                            {title}
                        </Typography>
                        {description && (
                            <div>
                                <Typography
                                    className="mt-2"
                                    size="14"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-2">
                                    {description}
                                </Typography>
                            </div>
                        )}
                        {showProgress && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs font-semibold text-grey-2">
                                    <span>
                                        Step {Math.min(currentStep ?? 0, totalSteps ?? 0)} of {totalSteps}
                                    </span>
                                    <span className="text-primary-default">{Math.round(progress * 100)}%</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-grey-4">
                                    <div
                                        className="h-full rounded-full bg-primary-default"
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer shrink-0 rounded-full border border-[#E0E0E0] p-2 hover:bg-[#F8F8F8]">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">{children}</div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[#EDEDED] bg-white px-6 py-4">
                {showSecondaryButton && (
                    <Button
                        onClick={onSecondary!}
                        title={secondaryLabel ?? ''}
                        disabled={primaryLoading}
                        buttonColor={{
                            enabled: 'bg-white text-grey-0 border border-grey-4',
                            disabled: 'bg-white text-grey-3 border border-grey-4 cursor-not-allowed'
                        }}
                        className="w-auto px-6"
                        textStyle="text-grey-0"
                    />
                )}
                <Button
                    onClick={onPrimary}
                    title={primaryLoading ? 'Saving...' : resolvedPrimaryLabel}
                    disabled={primaryDisabled || primaryLoading}
                    loading={primaryLoading}
                    buttonColor={{
                        enabled: 'bg-grey-0 text-natural-white',
                        disabled: 'bg-grey-4 text-natural-white cursor-not-allowed'
                    }}
                    className="w-auto px-6"
                    textStyle="text-natural-white"
                />
            </div>
        </div>
    )
}

export default TripPreferenceStepLayout
