import React from 'react'

export const SectionHeading: React.FC<{ countryName: string | null }> = ({ countryName }) => {
    return (
        <div className="text-left mb-8 md:mb-10 lg:mb-12">
            <h2 className="">
                <span
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        fontSize: '28px',
                        lineHeight: '100%',
                        letterSpacing: '-0.02em',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        color: 'grey-0'
                    }}>
                    {/* Everything you need for your Bali trip in one place */}
                    Use Rimigo to plan everything for
                </span>
                <span
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 360,
                        fontStyle: 'italic',
                        fontSize: '28px',
                        lineHeight: '100%',
                        letterSpacing: '-0.02em',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        color: '#7C3AED',
                        position: 'relative'
                    }}>
                    {' '}
                    {countryName ? countryName : ''}
                </span>
                <span
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        fontSize: '28px',
                        lineHeight: '100%',
                        letterSpacing: '-0.02em',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        color: 'grey-0',
                        position: 'relative'
                    }}>
                    {' '}
                    trip
                    {/* <img
                        src="/images/sparkles.png"
                        alt="sparkles"
                        className="
                            absolute -top-1.5 left-[calc(100%+2px)]
                            sm:-top-2 sm:left-[calc(100%+2px)]
                            md:-top-2 md:left-[calc(100%+2px)]
                            lg:-top-2 lg:left-[calc(100%+2px)]
                            xl:-top-2 xl:left-[calc(100%+2px)]
                            2xl:-top-2 2xl:left-[calc(100%+2px)]
                            h-5 sm:h-6 md:h-7 lg:h-8 xl:h-9
                        "
                    /> */}
                </span>
            </h2>
        </div>
    )
}
