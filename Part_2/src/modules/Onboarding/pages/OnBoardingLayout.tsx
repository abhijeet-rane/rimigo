import React from 'react'
import DesktopLeftPanelContent from '../components/DesktopLeftPanelComponent'

interface OnBoardingLayoutProps {
    children: React.ReactNode
}

const OnBoardingLayout: React.FC<OnBoardingLayoutProps> = ({ children }) => {
    return (
        <div className="relative w-full h-screen flex bg-white">
            {/* Left Side - Desktop */}
            <div
                className="hidden lg:flex justify-center items-center flex-1 relative
                        onboarding-gradient
                        shadow-[0px_2px_8px_0px_#7011F63D]">
                <DesktopLeftPanelContent />
            </div>

            {/* Right Side - Dynamic Content; on desktop fills height so child can center content and stick terms to bottom */}
            <div className="w-full lg:w-[40%] lg:max-w-[600px] flex flex-col items-center lg:items-stretch lg:justify-start lg:min-h-0 flex-1 bg-white relative z-10">
                {children}
            </div>
        </div>
    )
}

export default OnBoardingLayout
