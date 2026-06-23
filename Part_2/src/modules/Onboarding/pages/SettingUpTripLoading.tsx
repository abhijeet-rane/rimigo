import React, { useEffect, useState } from 'react'
import { Check} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { getBasicTravelerData } from '@/api/travelerAPI/travelerAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { convertAllTextToUpperCase } from '@/utils/formatTextUtil'

const STEP_DURATION_MS = 4000
const QUICK_STEP_DURATION_MS = 2000

// =============================================================
// Verified Icon Component (The 'Done' Checkmark)
// =============================================================
const VerifiedCircle: React.FC = () => (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
        <Check
            size={16}
            color="white"
        />
    </div>
)

// =============================================================
// Single Label Logic
// =============================================================
interface LoadingSingleLabelProps {
    label: string
    status: 'pending' | 'active' | 'done'
}

export const LoadingSingleLabel: React.FC<LoadingSingleLabelProps> = ({ label, status }) => {
    let icon
    let textColor = ''
    let gradientColors: string[] | undefined
    let containerOpacity = ''
    if (status === 'done') {
        icon = <VerifiedCircle />
        textColor = 'text-white'
    } else if (status === 'active') {
        // Inline keyframes for slow spin
        icon = (
            <>
                <style>
                    {`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
                </style>
                <img
                    src="/icons/in_progress_item.png"
                    alt="loading"
                    className="w-6 h-6"
                    style={{
                        animation: 'spin-slow 1s linear infinite'
                    }}
                />
            </>
        )
        // Active step → gradient grey-1 → grey-2
        gradientColors = ['var(--color-grey-1)', 'var(--color-grey-2)']
    } else {
        icon = <div className="w-6 h-6 rounded-full border-[2.4px] border-[var(--color-grey-0)]" />
        textColor = 'grey-0' // pending or inactive
        containerOpacity = 'opacity-20'
    }

    return (
        <div className={`flex items-center gap-3 transition-opacity ${containerOpacity}`}>
            {icon}
            <Typography
                size="16"
                family="manrope"
                weight="medium"
                color={textColor}
                gradientColors={gradientColors}>
                {label}
            </Typography>
        </div>
    )
}

// =============================================================
// Travel Expert Contact Component
// =============================================================

// =============================================================
// Main Component
// =============================================================
export const SettingUpTripLoading: React.FC<{ redirectTo?: string | null; onComplete?: () => void; quickMode?: boolean; destinationSkipped?: boolean }> = ({ redirectTo, onComplete, quickMode = false, destinationSkipped = false }) => {
    const navigate = useNavigate()

    const heading = destinationSkipped
        ? 'Sit back, as we find your next dream destination'
        : 'Sit back, as we setup and curate your trip'

    const labels = destinationSkipped
        ? ['Analysing weather stats and trending hot spots', "Scouting the best activities that you'll love", 'Curating content to inspire your next trip']
        : ['Finding the best stays for you', "Scouting the best activities you'll love", 'Preparing your dashboard']

    const stepDuration = quickMode ? QUICK_STEP_DURATION_MS : STEP_DURATION_MS

    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [travelerIdFromStore, setTravelerIdFromStore] = useState<string | null>(null)

    // Get traveler id from the token storage (skip in quickMode — not logged in yet)
    useEffect(() => {
        if (quickMode) return
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerIdFromStore(userInfo.traveler_id)
            } catch {
                // Failed to get traveler id - silently fail
            }
        }
        fetchTravelerId()
    }, [quickMode])

    const { data: travelerBasicData } = useQuery({
        queryKey: ['travelerBasicData', travelerIdFromStore],
        queryFn: () => getBasicTravelerData(travelerIdFromStore as string),
        enabled: !!travelerIdFromStore && !quickMode,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Get first name from traveler basic data
    const travelerFirstName = travelerBasicData?.data.name?.split(' ')[0]
    const travelerName = convertAllTextToUpperCase(travelerFirstName ?? '')

    useEffect(() => {
        if (currentStepIndex < labels.length) {
            const timer = setTimeout(() => setCurrentStepIndex((prev) => prev + 1), stepDuration)
            return () => clearTimeout(timer)
        }
    }, [currentStepIndex, labels.length, stepDuration])

    // Redirect when all steps are complete
    useEffect(() => {
        if (currentStepIndex >= labels.length) {
            // In quickMode, fire onComplete immediately (no extra delay)
            const delay = quickMode ? 0 : 2000
            const redirectTimer = setTimeout(() => {
                if (onComplete) {
                    onComplete()
                } else if (redirectTo) {
                    navigate(redirectTo)
                } else {
                    // Default redirect if no redirectTo is provided
                    navigate(DEFAULT_LANDING_PAGE_ROUTE, { replace: true })
                }
            }, delay)

            return () => clearTimeout(redirectTimer)
        }
    }, [currentStepIndex, labels.length, navigate, redirectTo, onComplete, quickMode])

    const getStatus = (index: number) => {
        if (index < currentStepIndex) return 'done'
        if (index === currentStepIndex) return 'active'
        return 'pending'
    }

    return (
        <div className="relative flex flex-col justify-between h-full w-full overflow-hidden">
            {/* Top Gradient */}
            <div className="absolute top-0 w-full">
                <GradientLoading />
            </div>

            {/* Main Content */}
            <div className="flex flex-col w-full gap-15 justify-center items-center flex-1 px-8 py-20">
                <div className="flex flex-col gap-2 z-10 text-left w-full max-w-sm">
                    {travelerName && (
                        <Typography
                            size="14"
                            textAlign="left"
                            color="grey-2"
                            weight="extrabold"
                            family="redhat">
                            AWESOME {travelerName}!
                        </Typography>
                    )}
                    <Typography
                        size="24"
                        textAlign="left"
                        color="grey-1"
                        weight="medium"
                        lineHeight="32px"
                        family="manrope">
                        {heading}
                    </Typography>
                </div>

                <div className="flex flex-col gap-6 items-start z-10 w-full max-w-sm">
                    {labels.map((label, idx) => (
                        <LoadingSingleLabel
                            key={idx}
                            label={label}
                            status={getStatus(idx)}
                        />
                    ))}

                    {/* Grey Divider Line */}
                    <div className="w-1/2 h-[1px] bg-gray-200 my-4 self-center" />

                    {/* Travel Expert Contact */}
                </div>
            </div>

            {/* Bottom Gradient (mirrored) */}
            <div className="absolute bottom-0 left-0 w-full rotate-180 scale-x-[-1]">
                <GradientLoading />
            </div>
        </div>
    )
}

// =============================================================
// Gradient Loading SVG
// =============================================================
export const GradientLoading: React.FC = () => (
    <svg
        className="w-full h-[200px]"
        viewBox="0 0 390 202"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <g
            opacity="0.5"
            filter="url(#filter0_f_351_6000)">
            <ellipse
                cx="195"
                cy="-54"
                rx="221"
                ry="132"
                fill="url(#paint0_linear_351_6000)"
                fillOpacity="0.8"
            />
        </g>
        <defs>
            <filter
                id="filter0_f_351_6000"
                x="-150"
                y="-310"
                width="690"
                height="512"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
                <feFlood
                    floodOpacity="0"
                    result="BackgroundImageFix"
                />
                <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                />
                <feGaussianBlur
                    stdDeviation="62"
                    result="effect1_foregroundBlur_351_6000"
                />
            </filter>
            <linearGradient
                id="paint0_linear_351_6000"
                x1="4.05456"
                y1="-0.756294"
                x2="404.782"
                y2="-10.7361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#7011F6" />
                <stop
                    offset="1"
                    stopColor="#4D1D91"
                />
            </linearGradient>
        </defs>
    </svg>
)


export const GradientLoadingReversed: React.FC = () =>(
    <svg
        className="w-full h-[200px] scale-y-[-1]"
        viewBox="0 0 390 202"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <g
            opacity="0.5"
            filter="url(#filter0_f_351_6000)">
            <ellipse
                cx="195"
                cy="-54"
                rx="221"
                ry="132"
                fill="url(#paint0_linear_351_6000)"
                fillOpacity="0.8"
            />
        </g>
        <defs>
            <filter
                id="filter0_f_351_6000"
                x="-150"
                y="-310"
                width="690"
                height="512"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
                <feFlood
                    floodOpacity="0"
                    result="BackgroundImageFix"
                />
                <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                />
                <feGaussianBlur
                    stdDeviation="62"
                    result="effect1_foregroundBlur_351_6000"
                />
            </filter>
            <linearGradient
                id="paint0_linear_351_6000"
                x1="4.05456"
                y1="-0.756294"
                x2="404.782"
                y2="-10.7361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#7011F6" />
                <stop
                    offset="1"
                    stopColor="#4D1D91"
                />
            </linearGradient>
        </defs>
    </svg>
)
