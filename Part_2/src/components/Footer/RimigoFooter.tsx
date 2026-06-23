import { RIMIGO_LOGO_DARK } from '@/constants/icons/svgFromCDN'
import React from 'react'

const RimigoFooter: React.FC = () => {
    return (
        <footer className="w-full relative overflow-hidden h-[314px] md:min-h-[40vh] mt-40 md:mt-48">
            {/* Main content container - matches Figma spacing */}
            <div className="flex flex-row gap-1 items-center justify-center">
                <div className="flex gap-1 flex-col items-center justify-center">
                    <img
                        src={RIMIGO_LOGO_DARK}
                        alt="Rimigo Logo"
                        className="opacity-30 w-60 md:w-80 "
                    />
                    <p className="text-[22px] leading-[22px] font-red-hat-display font-medium text-grey-0 opacity-[30%]">Your AI travel assistant</p>
                </div>
            </div>

            {/* Decorative ellipse at the bottom - matches Figma design */}
            <div className="absolute max-md:h-[200px] bottom-0 w-full flex justify-center items-center">
                <GradientLoadingFooter />
            </div>
        </footer>
    )
}

export default RimigoFooter

export const GradientLoadingFooter = () => {
    return (
        <svg
            className="w-full h-full"
            viewBox="0 0 1440 204"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <g
                opacity="0.5"
                filter="url(#filter0_f_9916_6434)">
                <ellipse
                    cx="720"
                    cy="256"
                    rx="710"
                    ry="132"
                    fill="url(#paint0_linear_9916_6434)"
                    fill-opacity="0.8"
                />
            </g>
            <defs>
                <filter
                    id="filter0_f_9916_6434"
                    x="-114"
                    y="0"
                    width="1668"
                    height="512"
                    filterUnits="userSpaceOnUse"
                    color-interpolation-filters="sRGB">
                    <feFlood
                        flood-opacity="0"
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
                        result="effect1_foregroundBlur_9916_6434"
                    />
                </filter>
                <linearGradient
                    id="paint0_linear_9916_6434"
                    x1="106.555"
                    y1="309.244"
                    x2="1386.56"
                    y2="206.832"
                    gradientUnits="userSpaceOnUse">
                    <stop stop-color="#7011F6" />
                    <stop
                        offset="1"
                        stop-color="#4D1D91"
                    />
                </linearGradient>
            </defs>
        </svg>
    )
}
