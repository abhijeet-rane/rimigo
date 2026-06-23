import React, { useState } from 'react'
import clsx from 'clsx'
import Typography from '@/components/shared/Typography'
import { TripQuestionsHeader } from './TripQuestionsHeader'
import { BottomSheet } from '@/components/shared/BottomSheet'
import CircularImage from './CircularImage'
import { Button } from '@/components/shared/ButtonNew'
import { MAX_WIDTH } from '../constants/width'
import { tripSourceAPIAdapter } from '@/modules/CreatorScreen/adapter/tripSourceAPIAdapter'
import { ITripSourceResponse } from '@/types/tripSourceTypes/tripsSourceTypes'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { PageTransition } from './PageTransition'
import { getLeadGenTotalSteps } from '../utils/stepUtils'
type TripQuestionBaseLayoutProps = {
    currentStep: number
    title: string
    description?: string
    dynamicContent: React.ReactNode
    onNext?: () => void
    showButton?: boolean
    buttonName?: string
    buttonDisbale: boolean
    buttonVariant?: 'primary' | 'secondary'
    onBack?: () => void
}

export const TripQuestionBaseLayout: React.FC<TripQuestionBaseLayoutProps> = ({
    currentStep,
    title,
    description,
    dynamicContent,
    buttonDisbale,
    onNext,
    showButton = true,
    buttonName = 'Next',
    buttonVariant = 'secondary',
    onBack
}) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const queryClient = useQueryClient()
    const location = useLocation()

    const searchParams = new URLSearchParams(location.search)
    const trip_source = searchParams.get('utm_source')
    const cachedTripSourceData = trip_source ? queryClient.getQueryData<ITripSourceResponse>(['tripSource', trip_source]) : undefined

    const adapterCreatorData = cachedTripSourceData ? tripSourceAPIAdapter(cachedTripSourceData) : undefined
    const imageUrls = [
        'https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0',
        'https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0',
        'https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0'
    ]

    return (
        <div className="relative flex flex-col w-full min-h-screen bg-grey-5 pb-[42px]">
            {/* Header */}
            <TripQuestionsHeader
                imageUrl={adapterCreatorData?.thumbnail_url ?? ''}
                currentStep={currentStep}
                totalSteps={getLeadGenTotalSteps()}
                openSheet={() => setIsSheetOpen(true)}
                onBack={onBack}
            />

            {/* Main Content */}
            <div
                className="flex flex-col mx-auto flex-1 relative px-[32px] overflow-x-hidden"
                style={{ maxWidth: `${MAX_WIDTH}px` }}>
                {/* Scrollable content */}
                <PageTransition
                    className="flex-1 overflow-y-auto pb-[42px]"
                    style={{ scrollbarWidth: 'none' }}
                    duration={0.35} // optional
                >
                    <div className="flex flex-col gap-2 pt-[clamp(12px,3vh,40px)]">
                        <Typography
                            textAlign="left"
                            size="24"
                            weight="semibold"
                            family="redhat"
                            color="grey-0">
                            {title}
                        </Typography>

                        {description && (
                            <Typography
                                textAlign="left"
                                size="14"
                                lineHeight="20px"
                                weight="medium"
                                family="manrope"
                                color="grey-2">
                                {description}
                            </Typography>
                        )}
                    </div>
                    <div className="mt-[clamp(12px,2vh,32px)] mb-8">{dynamicContent}</div>
                </PageTransition>
            </div>
            {showButton && (
                <div className="absolute bottom-0 left-0 w-full bg-natural-white flex justify-center z-20">
                    <div
                        className="w-full pt-4 pb-8 px-[32px] font-red-hat-display"
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                        <Button
                            variant={buttonVariant}
                            disabled={buttonDisbale}
                            title={buttonName}
                            onClick={onNext || (() => {})}
                            className="w-full"
                            textStyle='font-red-hat-display text-[16px]'
                        />
                    </div>
                </div>
            )}

            {/* Bottom Sheet */}
            <div className="absolute right-0">
                <BottomSheet
                    title=""
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}>
                    <div className="flex flex-col items-center">
                        <div className="relative flex justify-center py-8 pb-12">
                            {imageUrls.map((url, idx) => (
                                <div
                                    key={idx}
                                    className={clsx('relative', idx !== 0 && '-ml-16 z-[calc(10-idx)]', idx === 0 && 'z-10')}>
                                    <CircularImage
                                        radius={60}
                                        url={url}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-6 w-4/5 text-center">
                            <Typography
                                size="lg"
                                weight="semibold"
                                family="redhat"
                                color="grey-0">
                                Pooja & our travel experts will help curate a personalised trip for you
                            </Typography>
                            <Typography
                                size="14"
                                weight="medium"
                                family="manrope"
                                color="grey-2">
                                Please answer all the questions as accurately as possible, in order for us to provide you the best experience.
                            </Typography>
                        </div>
                    </div>
                </BottomSheet>
            </div>
        </div>
    )
}
