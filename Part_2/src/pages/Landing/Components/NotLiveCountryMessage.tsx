import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DestinationsGrid } from '@/components/DestinationsGrid'
import { ORANGE_ARROW, ZERO_STATE_IMG } from '@/constants/icons/svgFromCDN'
import { DEFAULT_TRIP_ONBOARDING_ROUTE } from '@/routes/routes'
import { ContactMeSection } from './ContactMeSection'
import { Traveler } from '@/api/travelerAPI/travelerAPI'

interface NotLiveCountryMessageProps {
    countryName?: string
    nonLiveClassName?:string
    titleText?: string
    descriptionText?: string
    travelerDetails?: Traveler | undefined
}

export const NotLiveCountryMessage: React.FC<NotLiveCountryMessageProps> = ({ 
        countryName ,
        nonLiveClassName , 
        titleText,
        descriptionText, 
        travelerDetails }) => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const finalTitle = titleText ?? `${countryName || 'This destination'} will be live soon!`
    const finalDescription = descriptionText ?? `Our travel expert will contact you on ${travelerDetails?.country_code}${travelerDetails?.phone}, to start planning your vacation.`

    const handleDestinationSelect = (countryId: string, countryName: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('country_id', countryId)
        params.set('country_name', countryName)
        navigate(`?${params.toString()}`, { replace: true })
    }

    const handlePlanTripClick = () => {
        navigate(`${DEFAULT_TRIP_ONBOARDING_ROUTE}`)
    }

    return (
        <div
            className={`w-full md:max-w-[95%] lg:max-w-[90%] p-6 ${nonLiveClassName}`}>
            <div className=" flex flex-col items-center gap-15 md:gap-15">
                <div className='relative flex flex-col items-center justify-center gap-5'>
                    {/* hero img  */}
                    <div className='flex flex-col items-center justify-center'>
                        <img 
                            src={ZERO_STATE_IMG}
                            alt="Zero State img"
                            className='md:w-62.5 md:h-70 w-70 h-75'
                        />
                        <h2
                            className="text-[30px] max-w-[80%] md:max-w-full  text-center md:text-[35px] font-medium "
                            style={{
                                fontFamily: 'Red Hat Display',
                                color: 'var(--grey-0)',
                                letterSpacing: '-4%'
                            }}>
                            {finalTitle}
                        </h2>
                    </div>
                    {/* Message Section */}
                    <div className="relative flex flex-col items-center justify-center w-full">

                        {/* Contact card – always centered */}
                        <ContactMeSection description={finalDescription}/>

                        {/* Exclusive offer */}
                        <div className="flex items-center justify-start mt-6 mr-10 md:mt-0 md:absolute md:-left-70 md:top-[80%] md:-translate-y-1/2">
                            <span
                                className="flex flex-col items-start font-bold text-secondary-orange rotate-[-10deg]"
                                style={{
                                    fontFamily: "Caveat",
                                    fontSize: "clamp(1.7rem, 2vw, 2rem)",
                                    lineHeight: 1,
                                }}
                            >
                                <span>Don’t worry, we’ve</span>
                                <span>got you covered</span>
                            </span>
                            <img
                                src={ORANGE_ARROW}
                                alt="Orange Arrow"
                                className="w-20 object-contain mb-3"
                            />
                        </div>
                    </div>
                </div>

                {/* Destinations Grid Section */}
                <div className="w-full mt-8 md:mt-0">
                    <DestinationsGrid
                        onDestinationSelect={handleDestinationSelect}
                        onPlanTripClick={handlePlanTripClick}
                        showPlanTripButton={true}
                        title="Explore Our Live Destinations"
                        showTitle={true}
                        columnCount={4}
                        className='md:border border-grey-4 md:p-6 rounded-2xl bg-white'
                    />
                </div>
            </div>
        </div>
    )
}