import Typography from '@/components/shared/Typography'
import { ArrowLeft } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

type TripQuestionsHeaderProps = {
    currentStep: number // comes from parent
    totalSteps?: number // optional, default = 7
    openSheet?: () => void // callback to open sheet
    imageUrl: string
    onBack?: () => void // optional override for back navigation
}

export const TripQuestionsHeader: React.FC<TripQuestionsHeaderProps> = ({ currentStep, totalSteps = 3, imageUrl, onBack }) => {
    const navigate = useNavigate()
    const avatars = [
        imageUrl
            ? imageUrl
            : 'https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0',
        '/onBoarding/agent.webp',
        'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_purple_transparent.png'
    ]

    return (
        <div
            className="flex w-full  h-[104px] px-[32px] bg-white    items-center"
            style={{ boxShadow: '0 4px 20px color-mix(in srgb, var(--color-primary-default) 12%, transparent)' }}>
            {/* Back Button */}
            <div
                className="w-12 flex justify-start items-center"
                onClick={() => (onBack ? onBack() : navigate(-1))}
            >
                <div className="h-10 w-10 bg-grey-4 cursor-pointer rounded-full flex justify-center items-center">
                    <ArrowLeft
                        size={24}
                        className="text-gray-900"
                    />
                </div>
            </div>

            {/* Center Steps */}
            <div className="flex-1 flex justify-center items-center">
                <button
                    // onClick={openSheet}
                    className="px-3 py-2 rounded-[8px] border border-grey-4 bg-white">
                    <div className="flex flex-col items-center ">
                        {/* Avatars + Title */}
                        <div className="flex  items-center mb-2 gap-2">
                            <div className="flex -space-x-3">
                                {
                                    imageUrl ? (
                                        // imageUrl exists → show it as first avatar
                                        <div
                                            className="relative h-6 w-6 rounded-full border-2 border-white overflow-hidden"
                                            style={{ zIndex: 2 }}>
                                            <img
                                                src={imageUrl}
                                                alt="avatar"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : null // imageUrl missing → skip first avatar
                                }

                                {avatars.slice(1).map((uri, idx) => (
                                    <div
                                        key={idx}
                                        className="relative h-6 w-6 rounded-full border-2 border-white overflow-hidden"
                                        style={{ zIndex: avatars.length - idx - 1 }}>
                                        <img
                                            src={uri}
                                            alt={`avatar-${idx}`}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            <Typography
                                lineHeight="16px"
                                size="xs"
                                weight="bold"
                                family="redhat"
                                color="grey-1">
                                SETTING UP YOUR TRIP
                            </Typography>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex w-full space-x-1">
                            {Array.from({ length: totalSteps }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 h-1 rounded-sm ${idx <= currentStep - 1 ? 'bg-primary-default' : 'bg-grey-4'}`}
                                />
                            ))}
                        </div>
                    </div>
                </button>
            </div>

            {/* Spacer */}
            <div className="w-12" />
        </div>
    )
}
