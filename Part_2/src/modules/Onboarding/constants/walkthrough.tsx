

import { ONBOARDING_COMBINED, WALKTHROUGH_2, WALKTHROUGH_3 } from "@/constants/icons/svgFromCDN"

interface WalkthroughProps {
    isMobile: boolean
}

export const Walkthrough1 = ({ isMobile }: WalkthroughProps) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <img
            src={ONBOARDING_COMBINED}
            alt="Onboarding step 1"
            className={`object-contain ${isMobile ? 'max-w-[80vw] max-h-[180px]' : 'max-w-[400px] max-h-[380px] w-full'}`}
        />
    </div>
)

export const Walkthrough2 = ({ isMobile }: WalkthroughProps) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <img
            src={WALKTHROUGH_2}
            alt="Onboarding step 2"
            className={`object-contain ${isMobile ? 'max-w-[90vw] max-h-[200px]' : 'max-w-[420px] max-h-[320px] w-full'}`}
        />
    </div>
)

export const Walkthrough3 = ({ isMobile }: WalkthroughProps) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <img
            src={WALKTHROUGH_3}
            alt="Onboarding step 3"
            className={`object-contain ${isMobile ? 'max-w-[85vw] max-h-[200px]' : 'max-w-[300px] max-h-[300px] w-full'}`}
        />
    </div>
)

export const WALKTHROUGH_TEXTS = [
    {
        mainText: 'Your trip planned in ',
        highlightedText: 'minutes',
        mainTextAfter: '',
    },
    {
        mainText: 'Get tips from travel ',
        highlightedText: 'experts',
        mainTextAfter: '',
    },
    {
        mainText: '',
        highlightedText: 'Cheapest',
        mainTextAfter: 'rates for each booking',
    },
]