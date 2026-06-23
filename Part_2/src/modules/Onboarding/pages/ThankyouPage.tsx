import { Button } from '@/components/shared/ButtonNew'
import Typography from '@/components/shared/Typography'
import React, { useEffect, useState } from 'react'
import StripAnimation from '../components/StripAnimation'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { getBasicTravelerData } from '@/api/travelerAPI/travelerAPI'
import { useQuery } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { convertAllTextToUpperCase } from '@/utils/formatTextUtil'
import { useNavigate, useParams } from 'react-router-dom'
import { MAX_WIDTH } from '../constants/width'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'

const BACK_HOME_NAVIGATION_PATH = DEFAULT_LANDING_PAGE_ROUTE

export const ThankyouPage: React.FC = () => {
    const [travelerIdFromStore, setTravelerIdFromStore] = useState<string | null>(null)
    const navigate = useNavigate()
    const { trip_id } = useParams<{ trip_id: string }>()
    const travelerTripsContext = useOptionalTravelerTrips()
    const [hasSetActiveTrip, setHasSetActiveTrip] = useState(false)
    // get traveler id from the token storage
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerIdFromStore(userInfo.traveler_id)
            } catch (error) {
                // Failed to get traveler id
                console.error('Failed to get traveler id:', error)
            }
        }
        fetchTravelerId()
    }, [])

    // Set the trip as active when component mounts and trips data is available
    useEffect(() => {
        // Wait for trips data to be loaded (not loading and has trips data or no error)

        if (trip_id && travelerTripsContext?.updateActiveTrip) {
            const setActive = async () => {
                try {
                    // Use force: true to set active trip even if validation fails (trip might be newly created)
                    // Use replaceOnly: true to avoid refreshing the page
                    await travelerTripsContext.updateActiveTrip(trip_id, { force: true, replaceOnly: true })
                    setHasSetActiveTrip(true)
                } catch (error) {
                    console.error('Failed to set active trip:', error)
                    // Still mark as attempted to avoid infinite retries
                    setHasSetActiveTrip(true)
                }
            }
            setActive()
        }
    }, [
        trip_id,
        travelerTripsContext?.updateActiveTrip,
        travelerTripsContext?.isLoading,
        travelerTripsContext?.tripsData,
        travelerTripsContext?.error,
        hasSetActiveTrip
    ])

    const {
        data: travelerBasicData,
        isLoading: isTravelerBasicDataLoading,
        error: isTravelerBasicDataError
    } = useQuery({
        queryKey: ['travelerBasicData', travelerIdFromStore],
        queryFn: () => getBasicTravelerData(travelerIdFromStore as string),
        enabled: !!travelerIdFromStore,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    if (isTravelerBasicDataError) {
        toast.error((isTravelerBasicDataError as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        return <ErrorOnBoardingScreen />
    }

    // get first name from traveler basic data
    const travelerFirstName = travelerBasicData?.data.name?.split(' ')[0]

    const travelerName = convertAllTextToUpperCase(travelerFirstName ?? '')

    return (
        <div className="flex flex-col w-full min-h-screen bg-grey-5">
            <div className="flex-1 flex flex-col justify-between items-center pt-5 pb-6 ">
                {/* Header */}
                <div className="flex flex-col gap-2 w-full">
                    <StripAnimation />
                    <div
                        className={`px-[32px]  flex flex-col gap-2 mx-auto `}
                        style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%' }}>
                        {isTravelerBasicDataLoading ? (
                            <CustomShimmer
                                height={12}
                                radius={4}
                            />
                        ) : (
                            <Typography
                                textAlign="left"
                                size="12"
                                weight="extrabold"
                                family="redhat"
                                color="grey-2">
                                NO WORRIES{travelerName ? `, ${travelerName}` : ''}
                            </Typography>
                        )}

                        {isTravelerBasicDataLoading ? (
                            <CustomShimmer
                                height={32}
                                radius={8}
                                className="w-[80%]"
                            />
                        ) : (
                            <Typography
                                textAlign="left"
                                size="24"
                                lineHeight="32px"
                                weight="semibold"
                                family="redhat"
                                color="grey-0">
                                Our destination expert will get in touch with you soon
                            </Typography>
                        )}
                    </div>
                </div>
                <div
                    className={`px-[32px] flex flex-col gap-2  max-auto`}
                    style={{ maxWidth: `${MAX_WIDTH}px` }}>
                    <div className="flex flex-col w-full gap-8 mt-10 mb-24">
                        {isTravelerBasicDataLoading ? (
                            <CustomShimmer
                                height={16}
                                radius={6}
                            />
                        ) : (
                            <Typography
                                textAlign="left"
                                size="16"
                                weight="medium"
                                family="manrope"
                                color="grey-1">
                                Your dream vacation isn’t far away, you can count on us ;)
                            </Typography>
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-natural-white flex justify-center z-20">
                            <div
                                className="w-full pt-4 pb-8 px-[32px]"
                                style={{
                                    paddingTop: '16px', // pt-16px
                                    paddingBottom: '32px', // pb-32px
                                    maxWidth: `${MAX_WIDTH}px`
                                }}>
                                <Button
                                    buttonColor={{
                                        enabled: 'bg-grey-0 text-natural-white',
                                        disabled: 'bg-grey-4 text-natural-white'
                                    }}
                                    disabled={false}
                                    title="Back Home"
                                    onClick={() => navigate(BACK_HOME_NAVIGATION_PATH, { replace: true })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
            </div>
        </div>
    )
}
