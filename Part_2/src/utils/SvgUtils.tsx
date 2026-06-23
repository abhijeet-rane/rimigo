import React from 'react'

export const RadialGradient: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={`w-full h-[202px] ${className}`}
            viewBox="0 0 400 202"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <g
                opacity="0.5"
                filter="url(#filter0_f_351_5170)">
                <ellipse
                    cx="195"
                    cy="-54"
                    rx="221"
                    ry="132"
                    fill="url(#paint0_linear_351_5170)"
                    fillOpacity="0.8"
                />
            </g>
            <defs>
                <filter
                    id="filter0_f_351_5170"
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
                        result="effect1_foregroundBlur_351_5170"
                    />
                </filter>
                <linearGradient
                    id="paint0_linear_351_5170"
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
}
export const Triangle = () => {
    return (
        <svg
            width="18"
            height="8"
            viewBox="0 0 18 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
                d="M7.67127 0.505188C8.42904 -0.168387 9.57096 -0.168387 10.3287 0.505188L18 7.3241H0L7.67127 0.505188Z"
                fill="#101010"
            />
        </svg>
    )
}
export const GradientLoading: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={`w-full h-[202px] ${className}`}
            viewBox="0 0 390 202"
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
}
export const Star = () => (
    <svg
        width="100%"
        height="100%"
        viewBox="0 0 16 16"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg">
        <path
            d="M8.28257 0.579958C9.0543 2.17032 10.0342 3.56284 11.2254 4.75434C12.4178 5.94691 13.8221 6.93966 15.4417 7.72944L16 8.00169L15.4417 8.27174C13.8495 9.04194 12.4555 10.0196 11.2631 11.208C10.0692 12.3979 9.0747 13.8008 8.28257 15.42L7.99886 16L7.71743 15.42C6.94571 13.8297 5.96582 12.4372 4.77458 11.2457C3.58224 10.0531 2.17788 9.06033 0.558284 8.27055L0 7.99831L0.558284 7.72825C2.15052 6.95805 3.54447 5.98038 4.73687 4.79197C5.93075 3.6021 6.9253 2.19919 7.71743 0.579958L8.00113 0L8.28257 0.579958Z"
            fill="currentColor"
        />
    </svg>
)
export const AiSuggestion = () => (
    <svg
        width="100%"
        height="100%"
        viewBox="0 0 16 16"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg">
        <path
            d="M2 14L8.66667 7.33333M12 4L10.3333 5.66667"
            stroke="#7011F6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M6.33333 1.3335L6.96353 3.03662L8.66667 3.66683L6.96353 4.29704L6.33333 6.00016L5.70312 4.29704L4 3.66683L5.70312 3.03662L6.33333 1.3335Z"
            stroke="#7011F6"
            strokeLinejoin="round"
        />
        <path
            d="M12.6666 6.6665L13.0267 7.6397L13.9999 7.99984L13.0267 8.35997L12.6666 9.33317L12.3065 8.35997L11.3333 7.99984L12.3065 7.6397L12.6666 6.6665Z"
            stroke="#7011F6"
            strokeLinejoin="round"
        />
    </svg>
)
export const PillClose = () => {
    return (
        <svg
            className="w-4 h-4 ml-1"
            fill="currentColor"
            viewBox="0 0 20 20">
            <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
            />
        </svg>
    )
}

export const LandingUnderline = () => {
    return (
        <svg
            className="absolute -bottom-1 left-0 w-full block overflow-visible"
            viewBox="0 0 200 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
        >
            <path
                d="M2 10C50 2 150 2 198 10"
                stroke="url(#landingGradient)"
                strokeWidth="4"
                strokeLinecap="round"
            />
            <defs>
                <linearGradient
                    id="landingGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    <stop offset="0%" stopColor="#7011f6" />
                    <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
            </defs>
        </svg>
    )
}
