import React, { forwardRef, useRef } from 'react'

import { cn } from '@/lib/utils'
import { AnimatedBeam } from './magicui/animated-beam'

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(({ className, children }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'z-10 flex size-12 items-center justify-center rounded-full border-2 border-border bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]',
                className
            )}>
            {children}
        </div>
    )
})

Circle.displayName = 'Circle'

export function AnimatedCuration({ className }: { className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const div1Ref = useRef<HTMLDivElement>(null)
    const div2Ref = useRef<HTMLDivElement>(null)
    const div3Ref = useRef<HTMLDivElement>(null)
    const div6Ref = useRef<HTMLDivElement>(null)
    const div7Ref = useRef<HTMLDivElement>(null)

    return (
        <div
            className={cn('relative flex w-[95%]  lg:w-full items-center justify-center overflow-hidden ', className)}
            ref={containerRef}>
            <div className="flex size-full max-w-lg flex-row items-stretch justify-between gap-8 lg:gap-10">
                <div className="flex flex-col justify-center gap-2">
                    <Circle
                        ref={div1Ref}
                        className="size-12 lg:size-12 object-cover">
                        <Icons.Youtube />
                    </Circle>
                    <Circle
                        ref={div2Ref}
                        className="size-12 lg:size-12 object-cover">
                        <Icons.instagram />
                    </Circle>
                    <Circle
                        ref={div3Ref}
                        className="size-12 lg:size-12 object-cover">
                        <Icons.RimigoExpert />
                    </Circle>
                </div>
                <div className="flex flex-col justify-center">
                    <Circle
                        ref={div6Ref}
                        className="size-12 lg:size-24 object-cover">
                        <Icons.Rimigo />
                    </Circle>
                </div>
                <div className="flex flex-col justify-center">
                    <Circle
                        ref={div7Ref}
                        className="size-12 lg:size-12 object-cover">
                        <Icons.itenary />
                    </Circle>
                </div>
            </div>

            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div1Ref}
                toRef={div6Ref}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div2Ref}
                toRef={div6Ref}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div3Ref}
                toRef={div6Ref}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div6Ref}
                toRef={div7Ref}
            />
        </div>
    )
}

const Icons = {
    Rimigo: () => (
        <svg
            width="15"
            height="19"
            viewBox="0 0 15 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
                d="M0.664186 19C0.297366 19 0 18.7026 0 18.3358V0.664186C0 0.297366 0.297367 0 0.664187 0H7.77574C11.6636 0 14.1176 2.60571 14.1176 5.83571C14.1176 8.46176 13.0532 10.1897 11.4449 11.1713C11.1137 11.3734 10.9711 11.7985 11.1605 12.1372L14.447 18.0115C14.6947 18.4543 14.3747 19 13.8673 19H10.4066C10.1619 19 9.93701 18.8654 9.82133 18.6498L6.55735 12.5645C6.44167 12.3489 6.21677 12.2143 5.97204 12.2143H5.24139C4.87457 12.2143 4.57721 12.5117 4.57721 12.8785V18.3358C4.57721 18.7026 4.27984 19 3.91302 19H0.664186ZM4.57721 7.61439C4.57721 7.98121 4.87457 8.27857 5.24139 8.27857H7.22427C8.98897 8.27857 9.56802 7.05714 9.56802 6.18857C9.56802 5.18429 9.01654 4.07143 7.25184 4.07143H5.24139C4.87457 4.07143 4.57721 4.3688 4.57721 4.73562V7.61439Z"
                fill="#7011F6"
            />
        </svg>
    ),
    Youtube: () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            id="youtube">
            <g
                fill-rule="evenodd"
                clip-rule="evenodd">
                <path
                    fill="#F44336"
                    d="M15.32 4.06c-.434-.772-.905-.914-1.864-.968C12.498 3.027 10.089 3 8.002 3c-2.091 0-4.501.027-5.458.091-.957.055-1.429.196-1.867.969C.23 4.831 0 6.159 0 8.497v.008c0 2.328.23 3.666.677 4.429.438.772.909.912 1.866.977.958.056 3.368.089 5.459.089 2.087 0 4.496-.033 5.455-.088.959-.065 1.43-.205 1.864-.977.451-.763.679-2.101.679-4.429v-.008c0-2.339-.228-3.667-.68-4.438z"></path>
                <path
                    fill="#FAFAFA"
                    d="M6 11.5v-6l5 3z"></path>
            </g>
        </svg>
    ),
    RimigoExpert: () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlSpace="preserve"
            id="user"
            x="0"
            y="0"
            version="1.1"
            viewBox="0 0 500 500"
            className="w-full h-full">
            <switch>
                <g>
                    <linearGradient
                        id="XMLID_2_"
                        x1="232.701"
                        x2="254.411"
                        y1="276.847"
                        y2="549.872"
                        gradientUnits="userSpaceOnUse">
                        <stop
                            offset="0"
                            stop-color="#FFCA9D"></stop>
                        <stop
                            offset=".854"
                            stop-color="#FFD9A9"></stop>
                    </linearGradient>
                    <path
                        id="XMLID_802_"
                        fill="url(#XMLID_2_)"
                        d="m455.3 504.2-5.1-113.6c-4.8-28.6-24.7-51.1-50-56.7l-91.4-16.1c-8.1-1.5-14.4-11.3-14.5-21.6l-2-47.4h-87.9l-2.1 49.4c-.4 9.7-6.5 17.7-14.6 19.2L97.4 334c-25.3 5.6-45.2 28.1-50 56.7l-5.1 113.6c51.6-.1 361.1-.1 413-.1z"
                        style={{ fill: 'url(#XMLID_2_)' }}></path>
                    <linearGradient
                        id="XMLID_3_"
                        x1="249"
                        x2="249"
                        y1="354.333"
                        y2="474.409"
                        gradientUnits="userSpaceOnUse">
                        <stop
                            offset="0"
                            stop-color="#FFF"></stop>
                        <stop
                            offset="1"
                            stop-color="#E6FFFF"></stop>
                    </linearGradient>
                    <path
                        id="XMLID_801_"
                        fill="url(#XMLID_3_)"
                        d="m308.8 504.2 20.4-183.5-17.7-3.3c-8.1-1.5-14.2-9.5-14.6-19.2l-48.1 55.5-48.1-55.5c-.4 9.7-6.5 17.7-14.6 19.2l-17.3 2.8 27 184.1h113z"
                        style={{ fill: 'url(#XMLID_3_)' }}></path>
                    <g id="XMLID_797_">
                        <linearGradient
                            id="XMLID_4_"
                            x1="370.28"
                            x2="370.28"
                            y1="315"
                            y2="496.496"
                            gradientUnits="userSpaceOnUse">
                            <stop
                                offset="0"
                                stop-color="#1A1A2B"></stop>
                            <stop
                                offset="1"
                                stop-color="#2E1B45"></stop>
                        </linearGradient>
                        <path
                            id="XMLID_799_"
                            fill="url(#XMLID_4_)"
                            d="M460.6 400.5c0-39.6-19.2-60.4-51-68.3l-79-10.5-53.1 182.6H463l-2.4-103.8z"
                            style={{ fill: 'url(#XMLID_4_)' }}></path>
                        <linearGradient
                            id="XMLID_5_"
                            x1="129.615"
                            x2="129.615"
                            y1="315"
                            y2="496.496"
                            gradientUnits="userSpaceOnUse">
                            <stop
                                offset="0"
                                stop-color="#1A1A2B"></stop>
                            <stop
                                offset="1"
                                stop-color="#2E1B45"></stop>
                        </linearGradient>
                        <path
                            id="XMLID_798_"
                            fill="url(#XMLID_5_)"
                            d="M90.8 332.2c-31.8 7.9-51 28.7-51 68.3L37 504.2h185.2l-51.4-183.6-80 11.6z"
                            style={{ fill: 'url(#XMLID_5_)' }}></path>
                    </g>
                    <linearGradient
                        id="XMLID_6_"
                        x1="307.766"
                        x2="307.099"
                        y1="459.313"
                        y2="303.969"
                        gradientUnits="userSpaceOnUse">
                        <stop
                            offset=".038"
                            stop-color="#001"></stop>
                        <stop
                            offset="1"
                            stop-color="#2E1B45"></stop>
                    </linearGradient>
                    <path
                        id="XMLID_796_"
                        fill="url(#XMLID_6_)"
                        d="m297.8 506.8 33.7-58.2c4.2-6.4 8-10.6 1-20.3l-23-34h24.9c7.2 0 8.2-1.6 8.2-11.6l-1.4-55.8s-.4-2-.9-2.7c-.5-.6-2-1.3-2-1.3l-23-5.5-42.4 189.4h24.9z"
                        style={{ fill: 'url(#XMLID_6_)' }}></path>
                    <linearGradient
                        id="XMLID_7_"
                        x1="248.797"
                        x2="248.797"
                        y1="373.667"
                        y2="489.684"
                        gradientUnits="userSpaceOnUse">
                        <stop
                            offset=".549"
                            stop-color="#FD0036"></stop>
                        <stop
                            offset=".995"
                            stop-color="#FF005F"></stop>
                    </linearGradient>
                    <path
                        id="XMLID_795_"
                        fill="url(#XMLID_7_)"
                        d="m241.1 423-3.5 81.2h22.6l-3.5-81.6c-.2-3.3.4-8.5 1.2-10.7l8.6-20.7-17.5-36.4v-.8l-.2.4-.2-.4v.9L231 391.2l8.7 21.2c1.3 3 1.5 6.7 1.4 10.6z"
                        style={{ fill: 'url(#XMLID_7_)' }}></path>
                    <linearGradient
                        id="XMLID_8_"
                        x1="190.27"
                        x2="189.603"
                        y1="469.359"
                        y2="314.054"
                        gradientUnits="userSpaceOnUse">
                        <stop
                            offset=".038"
                            stop-color="#001"></stop>
                        <stop
                            offset="1"
                            stop-color="#2E1B45"></stop>
                    </linearGradient>
                    <path
                        id="XMLID_794_"
                        fill="url(#XMLID_8_)"
                        d="M162.9 393.1h24.9l-23 34c-7 9.7-3.3 13.9.9 20.3l34.5 58.2h25.3l-43.7-187.8-21.9 3.9s-2.6.2-3.3 2.3c-.2.7-.5 2.9-.5 2.9l-1.5 54.7c.2 9.9 1.1 11.5 8.3 11.5z"
                        style={{ fill: 'url(#XMLID_8_)' }}></path>
                    <path
                        id="XMLID_793_"
                        fill="#FFF"
                        d="M302.7 290.7c-2.6-6.1-4.3-4.7-8 .3l-45.9 62.7-45.9-62.7c-3.7-5.1-5.4-6.4-8-.3l-13.4 25.7 41.4 82.9c2.9 5.8 5.1 5.4 7.7-.3l18.1-44.6 18.1 44.6c2.6 5.8 4.9 6.1 7.7.3l41.4-82.9-13.2-25.7z"
                        style={{ fill: '#fff' }}></path>
                    <g id="XMLID_761_">
                        <g id="XMLID_780_">
                            <linearGradient
                                id="XMLID_9_"
                                x1="349.625"
                                x2="326.125"
                                y1="170.211"
                                y2="170.211"
                                gradientUnits="userSpaceOnUse">
                                <stop
                                    offset="0"
                                    stop-color="#FEC797"></stop>
                                <stop
                                    offset="1"
                                    stop-color="#FFD9A9"></stop>
                            </linearGradient>
                            <path
                                id="XMLID_792_"
                                fill="url(#XMLID_9_)"
                                d="m329.9 134 6.2.4c9.3 2.6 19.4 11.4 17.1 25.6-2.1 12.9-3.2 14-5.8 30-3.7 22.7-22.3 15.3-22.3 15.3l4.8-71.3z"
                                style={{ fill: 'url(#XMLID_9_)' }}></path>
                            <linearGradient
                                id="XMLID_10_"
                                x1="146.167"
                                x2="173.667"
                                y1="172.711"
                                y2="172.711"
                                gradientUnits="userSpaceOnUse">
                                <stop
                                    offset="0"
                                    stop-color="#FEC797"></stop>
                                <stop
                                    offset="1"
                                    stop-color="#FFD9A9"></stop>
                            </linearGradient>
                            <path
                                id="XMLID_782_"
                                fill="url(#XMLID_10_)"
                                d="m168.7 136.5-6.2.4c-9.3 2.6-19.4 11.4-17.1 25.6 2.2 12.9 3.2 14 5.8 30 3.7 22.7 22.3 15.3 22.3 15.3l-4.8-71.3z"
                                style={{ fill: 'url(#XMLID_10_)' }}></path>
                        </g>
                        <linearGradient
                            id="XMLID_11_"
                            x1="249.223"
                            x2="249.889"
                            y1="95.822"
                            y2="306.488"
                            gradientUnits="userSpaceOnUse">
                            <stop
                                offset="0"
                                stop-color="#FEC797"></stop>
                            <stop
                                offset="1"
                                stop-color="#FFD9A9"></stop>
                        </linearGradient>
                        <path
                            id="XMLID_763_"
                            fill="url(#XMLID_11_)"
                            d="m248.7 57.3-87.2.4 4.6 146.2c0 10.9.8 19.9 11.9 35.3l31 35.6c10.3 11.2 18.5 12.2 29.7 12.2h20.2c11.2 0 18.4-3.2 26.1-11 0 0 20.3-18.4 33.8-34.5 8.2-9.8 10.3-19.8 10.3-30.7l7.4-153.1-87.8-.4z"
                            style={{ fill: 'url(#XMLID_11_)' }}></path>
                        <linearGradient
                            id="XMLID_12_"
                            x1="247.798"
                            x2="247.798"
                            y1="-3.667"
                            y2="72.345"
                            gradientUnits="userSpaceOnUse">
                            <stop
                                offset="0"
                                stop-color="#F4D969"></stop>
                            <stop
                                offset=".863"
                                stop-color="#F4BC55"></stop>
                        </linearGradient>
                        <path
                            id="XMLID_762_"
                            fill="url(#XMLID_12_)"
                            d="M163.4 140.8c-2.4-4.1-10.6-36.7-11-57.4-.5-27.7-1.8-83.4 94-83.4h8.7c53 0 93.5 31.9 87.5 86.5-3.1 27.6-5.6 40-5.8 40.9-1.9 11.6-4.2 11.6-4 11.5v-38.8c0-13.8-1.3-41.7-28.6-35.8l-47.5 17.1s16.3-11.6 7.9-11.2c-6.2.3-51.6 16.2-51.6 16.2s20.6-16.2 15.6-16.5c-6.1-.4-44.6 19.2-44.6 19.2l9.3-25.2c-25.7-4.1-29.5 19.5-29.5 40.2l.2 31.6c0 3.6.3 6.5-.6 5.1z"
                            style={{ fill: 'url(#XMLID_12_)' }}></path>
                    </g>
                </g>
            </switch>
        </svg>
    ),
    instagram: () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28.87 28.87"
            id="instagram">
            <defs>
                <linearGradient
                    id="linear-gradient"
                    x1="-1.84"
                    x2="32.16"
                    y1="30.47"
                    y2="-3.03"
                    gradientUnits="userSpaceOnUse">
                    <stop
                        offset="0"
                        stop-color="#fed576"></stop>
                    <stop
                        offset=".26"
                        stop-color="#f47133"></stop>
                    <stop
                        offset=".61"
                        stop-color="#bc3081"></stop>
                    <stop
                        offset="1"
                        stop-color="#4c63d2"></stop>
                </linearGradient>
            </defs>
            <g id="Layer_2">
                <g id="Layer_1-2">
                    <rect
                        width="28.87"
                        height="28.87"
                        rx="6.48"
                        ry="6.48"
                        style={{ fill: 'url(#linear-gradient)' }}></rect>
                    <g id="_Group_">
                        <path
                            id="_Compound_Path_"
                            d="M10 5h9c.2.1.5.1.7.2a4.78 4.78 0 0 1 3.8 3.3 8 8 0 0 1 .3 1.5v8.8a6.94 6.94 0 0 1-1.2 3.1 5.51 5.51 0 0 1-4.5 1.9h-7.5a5.49 5.49 0 0 1-3.7-1.2A5.51 5.51 0 0 1 5 18.14v-7a7.57 7.57 0 0 1 .1-1.5 4.9 4.9 0 0 1 3.8-4.3zm-3.1 9.5v3.9a3.42 3.42 0 0 0 3.7 3.7q3.9.15 7.8 0c2.3 0 3.6-1.4 3.7-3.7q.15-3.9 0-7.8a3.52 3.52 0 0 0-3.7-3.7q-3.9-.15-7.8 0a3.42 3.42 0 0 0-3.7 3.7z"
                            fill="#fff"
                        />
                        <path
                            id="_Compound_Path_2"
                            d="M9.64 14.54a4.91 4.91 0 0 1 4.9-4.9 5 5 0 0 1 4.9 4.9 4.91 4.91 0 0 1-4.9 4.9 5 5 0 0 1-4.9-4.9zm4.9-3.1a3.05 3.05 0 1 0 3 3 3 3 0 0 0-3-3z"
                            fill="#fff"
                        />
                        <path
                            id="_Path_"
                            d="M18.34 9.44a1.16 1.16 0 0 1 1.2-1.2 1.29 1.29 0 0 1 1.2 1.2 1.2 1.2 0 0 1-2.4 0z"
                            fill="#fff"
                        />
                    </g>
                </g>
            </g>
        </svg>
    ),
    zapier: () => (
        <svg
            width="105"
            height="28"
            viewBox="0 0 244 66"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
                d="M57.1877 45.2253L57.1534 45.1166L78.809 25.2914V15.7391H44.0663V25.2914H64.8181L64.8524 25.3829L43.4084 45.2253V54.7775H79.1579V45.2253H57.1877Z"
                fill="#201515"
            />
            <path
                d="M100.487 14.8297C96.4797 14.8297 93.2136 15.434 90.6892 16.6429C88.3376 17.6963 86.3568 19.4321 85.0036 21.6249C83.7091 23.8321 82.8962 26.2883 82.6184 28.832L93.1602 30.3135C93.5415 28.0674 94.3042 26.4754 95.4482 25.5373C96.7486 24.5562 98.3511 24.0605 99.9783 24.136C102.118 24.136 103.67 24.7079 104.634 25.8519C105.59 26.9959 106.076 28.5803 106.076 30.6681V31.7091H95.9401C90.7807 31.7091 87.0742 32.8531 84.8206 35.1411C82.5669 37.429 81.442 40.4492 81.4458 44.2014C81.4458 48.0452 82.5707 50.9052 84.8206 52.7813C87.0704 54.6574 89.8999 55.5897 93.3089 55.5783C97.5379 55.5783 100.791 54.1235 103.067 51.214C104.412 49.426 105.372 47.3793 105.887 45.2024H106.27L107.723 54.7546H117.275V30.5651C117.275 25.5659 115.958 21.6936 113.323 18.948C110.688 16.2024 106.409 14.8297 100.487 14.8297ZM103.828 44.6475C102.312 45.9116 100.327 46.5408 97.8562 46.5408C95.8199 46.5408 94.4052 46.1843 93.6121 45.4712C93.2256 45.1338 92.9182 44.7155 92.7116 44.246C92.505 43.7764 92.4043 43.2671 92.4166 42.7543C92.3941 42.2706 92.4702 41.7874 92.6403 41.3341C92.8104 40.8808 93.071 40.4668 93.4062 40.1174C93.7687 39.7774 94.1964 39.5145 94.6633 39.3444C95.1303 39.1743 95.6269 39.1006 96.1231 39.1278H106.093V39.7856C106.113 40.7154 105.919 41.6374 105.527 42.4804C105.134 43.3234 104.553 44.0649 103.828 44.6475Z"
                fill="#201515"
            />
            <path
                d="M175.035 15.7391H163.75V54.7833H175.035V15.7391Z"
                fill="#201515"
            />
            <path
                d="M241.666 15.7391C238.478 15.7391 235.965 16.864 234.127 19.1139C232.808 20.7307 231.805 23.1197 231.119 26.2809H230.787L229.311 15.7391H219.673V54.7775H230.959V34.7578C230.959 32.2335 231.55 30.2982 232.732 28.9521C233.914 27.606 236.095 26.933 239.275 26.933H243.559V15.7391H241.666Z"
                fill="#201515"
            />
            <path
                d="M208.473 17.0147C205.839 15.4474 202.515 14.6657 198.504 14.6695C192.189 14.6695 187.247 16.4675 183.678 20.0634C180.108 23.6593 178.324 28.6166 178.324 34.9352C178.233 38.7553 179.067 42.5407 180.755 45.9689C182.3 49.0238 184.706 51.5592 187.676 53.2618C190.665 54.9892 194.221 55.8548 198.344 55.8586C201.909 55.8586 204.887 55.3095 207.278 54.2113C209.526 53.225 211.483 51.6791 212.964 49.7211C214.373 47.7991 215.42 45.6359 216.052 43.3377L206.329 40.615C205.919 42.1094 205.131 43.4728 204.041 44.5732C202.942 45.6714 201.102 46.2206 198.521 46.2206C195.451 46.2206 193.163 45.3416 191.657 43.5837C190.564 42.3139 189.878 40.5006 189.575 38.1498H216.201C216.31 37.0515 216.367 36.1306 216.367 35.387V32.9561C216.431 29.6903 215.757 26.4522 214.394 23.4839C213.118 20.7799 211.054 18.5248 208.473 17.0147ZM198.178 23.9758C202.754 23.9758 205.348 26.2275 205.962 30.731H189.775C190.032 29.2284 190.655 27.8121 191.588 26.607C193.072 24.8491 195.268 23.972 198.178 23.9758Z"
                fill="#201515"
            />
            <path
                d="M169.515 0.00366253C168.666 -0.0252113 167.82 0.116874 167.027 0.421484C166.234 0.726094 165.511 1.187 164.899 1.77682C164.297 2.3723 163.824 3.08658 163.512 3.87431C163.2 4.66204 163.055 5.50601 163.086 6.35275C163.056 7.20497 163.201 8.05433 163.514 8.84781C163.826 9.64129 164.299 10.3619 164.902 10.9646C165.505 11.5673 166.226 12.0392 167.02 12.3509C167.814 12.6626 168.663 12.8074 169.515 12.7762C170.362 12.8082 171.206 12.6635 171.994 12.3514C172.782 12.0392 173.496 11.5664 174.091 10.963C174.682 10.3534 175.142 9.63077 175.446 8.83849C175.75 8.04621 175.89 7.20067 175.859 6.35275C175.898 5.50985 175.761 4.66806 175.456 3.88115C175.151 3.09424 174.686 2.37951 174.09 1.78258C173.493 1.18565 172.779 0.719644 171.992 0.414327C171.206 0.109011 170.364 -0.0288946 169.521 0.00938803L169.515 0.00366253Z"
                fill="#201515"
            />
            <path
                d="M146.201 14.6695C142.357 14.6695 139.268 15.8764 136.935 18.2902C135.207 20.0786 133.939 22.7479 133.131 26.2981H132.771L131.295 15.7563H121.657V66H132.942V45.3054H133.354C133.698 46.6852 134.181 48.0267 134.795 49.3093C135.75 51.3986 137.316 53.1496 139.286 54.3314C141.328 55.446 143.629 56.0005 145.955 55.9387C150.68 55.9387 154.277 54.0988 156.748 50.419C159.219 46.7392 160.455 41.6046 160.455 35.0153C160.455 28.6509 159.259 23.6689 156.869 20.0691C154.478 16.4694 150.922 14.6695 146.201 14.6695ZM147.345 42.9602C146.029 44.8668 143.97 45.8201 141.167 45.8201C140.012 45.8735 138.86 45.6507 137.808 45.1703C136.755 44.6898 135.832 43.9656 135.116 43.0574C133.655 41.2233 132.927 38.7122 132.931 35.5243V34.7807C132.931 31.5432 133.659 29.0646 135.116 27.3448C136.572 25.625 138.59 24.7747 141.167 24.7937C144.02 24.7937 146.092 25.6994 147.385 27.5107C148.678 29.322 149.324 31.8483 149.324 35.0896C149.332 38.4414 148.676 41.065 147.356 42.9602H147.345Z"
                fill="#201515"
            />
            <path
                d="M39.0441 45.2253H0V54.789H39.0441V45.2253Z"
                fill="#FF4F00"
            />
        </svg>
    ),
    itenary: () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-clipboard-check">
            <rect
                width="8"
                height="4"
                x="8"
                y="2"
                rx="1"
                ry="1"
            />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
        </svg>
    )
}
