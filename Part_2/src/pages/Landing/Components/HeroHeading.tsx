import React from 'react'

export const HeroHeading: React.FC = () => {
    return (
        <div className="py-4 md:my-[30px] md:pt-0 pl-4 md:pl-8">
            <h1 className="">
                <span
                    className="
                        text-[24px] leading-[34px]            /* base */
                        sm:text-[24px] sm:leading-[38px]      /* ≥480px */
                        md:text-[32px] md:leading-[36px]      /* ≥768px */
                        lg:text-[32px] lg:leading-[32px]      /* ≥1024px */
                        xl:text-[32px] xl:leading-[32px]      /* ≥1280px */
                        2xl:text-[40px] 2xl:leading-[44px]    /* ≥1536px */
                    "
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        letterSpacing: '-0.02em',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: 'grey-0'
                    }}>
                    Start planning with your{" "} 
                </span>
                <span
                    className="
                        text-[24px] leading-[34px]
                        sm:text-[24px] sm:leading-[38px]
                        md:text-[32px] md:leading-[36px]
                        lg:text-[36px] lg:leading-[36px]
                        xl:text-[32px] xl:leading-[32px]
                        2xl:text-[40px] 2xl:leading-[44px]
                    "
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        // fontStyle: 'italic',
                        letterSpacing: '-0.02em',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#7C3AED',
                        position: 'relative',
                        display: 'inline-block'
                    }}>
                    {' '}
                    {/* {countryName ? countryName : ''} experts */}
                    AI travel assistant
                    <img
                        src="/images/sparkles.png"
                        alt="sparkles"
                        className="
                            absolute top-1.5 -right-3
                            sm:top-1.5 sm:-right-3
                            md:top-1.5 md:-right-5
                            lg:top-1.5 lg:-right-5
                            xl:top-1.5 xl:-right-5
                            2xl:top-1.5 2xl:-right-10
                            h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10
                        "
                        style={{
                            transform: 'translate(50%, -50%)'
                        }}
                    />
                </span>
            </h1>
        </div>
    )
}
