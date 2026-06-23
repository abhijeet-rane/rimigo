import { Button } from '@/components/shared/ButtonNew'
import Typography from '@/components/shared/Typography'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { MAX_WIDTH } from '@/modules/Onboarding/constants/width'

// Relative import of image

const BACK_HOME_NAVIGATION_PATH = '/'

export const ErrorOnBoardingScreen: React.FC = () => {
    const navigate = useNavigate()

    return (
        <div className="flex relative flex-col w-full  min-h-screen bg-grey-5">
            <div
                className="flex-1 flex flex-col justify-between items-center pt-[64px] pb-6 mx-auto px-[32px]"
                style={{ maxWidth: `${MAX_WIDTH}px` }}>
                {/* Header */}
                <div className="flex flex-col gap-4 w-full ">
                    {/* Error Image */}
                    <img
                        src="/error/error_close.png" // public path
                        alt="Error"
                        width={56}
                        height={56}
                        style={{
                            transform: 'rotate(0deg)',
                            opacity: 1
                        }}
                    />

                    <div className={` flex flex-col gap-2`}>
                        <Typography
                            size="story-card-header"
                            weight="semibold"
                            family="redhat"
                            color="grey-0">
                            Oops! Something went wrong
                        </Typography>

                        <Typography
                            size="14"
                            weight="semibold"
                            family="manrope"
                            color="grey-2">
                            Don’t worry, you can try again and we’ll get your trip planning started.
                        </Typography>
                    </div>
                </div>

                {/* Back Home Button */}
            </div>
            <div className="absolute bottom-0 left-0 w-full bg-natural-white flex justify-center z-20">
                <div
                    className="w-full pt-4 pb-8 px-[32px]"
                    style={{ maxWidth: `${MAX_WIDTH}px` }}>
                    <Button
                        buttonColor={{
                            enabled: 'bg-grey-0 text-natural-white',
                            disabled: 'bg-grey-4 text-natural-white'
                        }}
                        title={'Back to home'}
                        onClick={() => {
                            navigate(BACK_HOME_NAVIGATION_PATH, { replace: true })
                        }}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    )
}
