import { useEffect, useState } from 'react'

import Typography from '@/components/shared/Typography'
import { InputBox } from '@/components/shared/InputBox'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { updateTraveler } from '@/api/travelerAPI/travelerAPI'
import { getTravelerProfileStatus } from '@/modules/Onboarding/api'
import { useQuery } from '@tanstack/react-query'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { Button } from '@/components/shared/ButtonNew'
import { MAX_WIDTH } from '@/modules/Onboarding/constants/width'
import { COMPASS_LOGO_PURPLE_TRANSPARENT_BG, RIMIGO_TEXT_LOGO_PURPLE_TRANSPARENT_BG } from '@/constants/rimigo'
import { GradientLoading } from '@/modules/Onboarding/pages/SettingUpTripLoading'

// constants for this page
const PAGE_HEADER = 'Hey there!'
const PAGE_DESCRIPTION = "What's your name?"
const NAME_INPUT_PLACEHOLDER = 'Enter name here'

interface UserProfileUpdateProps {
    redirectToFromModal?: string
    onSuccess?: () => void
    className?: string
    isInModal?: boolean
    showHeading?: boolean
    showLogo?: boolean
    showFixedButton?:boolean
}

export const UserProfileUpdate = ({ redirectToFromModal, onSuccess, className, isInModal = false, showHeading=true, showLogo=true, showFixedButton=true }: UserProfileUpdateProps = {} as UserProfileUpdateProps) => {
    // get redirect to from query params or props
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const redirectTo = redirectToFromModal || params.get('redirectTo') || DEFAULT_LANDING_PAGE_ROUTE
    const [travelerIdFromStore, setTravelerIdFromStore] = useState<string | null>(null)

    // get traveler id from storage
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerIdFromStore(userInfo.traveler_id)
            } catch (error) {
                // Failed to get traveler id
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            }
        }
        fetchTravelerId()
    }, [])

    const {
        data: userData,
        isLoading: isUserDataLoading,
        error: isUserDataError
    } = useQuery({
        queryKey: ['userData', travelerIdFromStore],
        queryFn: () => getTravelerProfileStatus(travelerIdFromStore as string),
        enabled: !!travelerIdFromStore
    })

    const navigate = useNavigate()

    const [name, setName] = useState('')

    // Prepopulate form data when userData is available
    useEffect(() => {
        if (userData?.traveler_name) {
            setName(userData.traveler_name)
        }
    }, [userData])

    if (isUserDataError) {
        toast.error((isUserDataError as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        return <ErrorOnBoardingScreen />
    }

    if (isUserDataLoading) {
        return <div className="flex flex-col gap-[12px] py-[48px] px-[36px]">Loading...</div>
    }

    const isNextDisabled = name.trim() === ''

    const handleNext = async () => {
        if (!travelerIdFromStore) {
            toast.error(ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            return
        }

        try {
            await updateTraveler(travelerIdFromStore, { name: name.trim() })
            toast.success('Profile updated successfully!')
            // Call onSuccess callback if provided (for modal usage)
            if (onSuccess) {
                onSuccess()
            } else {
                // Navigate if used as a page
                navigate(redirectTo)
            }
        } catch (error) {
            toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        }
    }

    return (
        <div className={`relative flex flex-col w-full ${className || 'min-h-screen'} bg-natural-white`}>
            <div className={`relative w-full ${className ? '' : 'min-h-screen'} flex flex-col bg-natural-white ${isInModal ? 'gap-3' : 'gap-15'}`}>
                {/* Top Gradient - only show when used as full page, not in modal */}
                {!onSuccess && (
                    <div className="absolute top-0 w-full">
                        <GradientLoading />
                    </div>
                )}

                {/* Logo and Tagline */}
                {showLogo && 
                <div className={`relative z-10 flex flex-col items-center ${isInModal ? 'pt-4 pb-4' : 'pt-12 pb-8'}`}>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center">
                            <img
                                src={COMPASS_LOGO_PURPLE_TRANSPARENT_BG}
                                alt="Rimigo Logo"
                                className="w-6 h-6 object-contain"
                                />
                            <img
                                src={RIMIGO_TEXT_LOGO_PURPLE_TRANSPARENT_BG}
                                alt="Rimigo"
                                className="h-8 object-contain"
                                />
                        </div>
                        <Typography
                            size="12"
                            weight="medium"
                            family="manrope"
                            style={{ color: 'var(--primary-indigo, #7011F6)' }}>
                            Your Personal Travel Expert
                        </Typography>
                    </div>
                </div>
                            }

                {/* Main Content */}
                <div className={`relative z-10 flex flex-col items-center ${isInModal ? '' : 'flex-1'}`}>
                    <div
                        className={`flex flex-col w-full ${isInModal ? 'px-0' : 'px-8'}`}
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                            {showHeading &&
                        <div className={`flex flex-col gap-2 ${isInModal ? 'mb-4' : 'mb-8'}`}>
                            <Typography
                            textAlign="left"
                            size="10"
                            weight="bold"
                            family="manrope"
                            color="grey-2">
                                {PAGE_HEADER}
                            </Typography>

                            <Typography
                            textAlign="left"
                            size="20"
                            weight="medium"
                            family="redhat"
                            color="grey-0">
                                {PAGE_DESCRIPTION}
                            </Typography>
                        </div>
                                }

                        {/* Name Input */}
                        <div className={`flex flex-col gap-[12px] ${isInModal ? 'mb-4' : 'mb-8'}`}>
                            <InputBox
                                placeholder={NAME_INPUT_PLACEHOLDER}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="border-grey-4"
                            />
                        </div>

{!showFixedButton &&

                        <div
                        className={`w-full ${isInModal ? 'px-0' : 'px-8'}`}
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                        <Button
                            buttonColor={{
                                enabled: 'bg-grey-0 text-natural-white',
                                disabled: 'bg-grey-4 text-natural-white'
                            }}
                            disabled={isNextDisabled}
                            title={onSuccess ? "CONTINUE" : "SETUP TRIP"}
                            onClick={handleNext}
                            className="w-full"
                            />
                    </div>
                        }
                    </div>
                </div>

                {/* Bottom Button Section */}
                {
                    showFixedButton && 
                    <div className={`relative z-10 flex w-full justify-center ${isInModal ? 'pb-0 pt-1' : 'mt-auto pb-8'}`}>
                    <div
                        className={`w-full ${isInModal ? 'px-0' : 'px-8'}`}
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                        <Button
                            buttonColor={{
                                enabled: 'bg-grey-0 text-natural-white',
                                disabled: 'bg-grey-4 text-natural-white'
                            }}
                            disabled={isNextDisabled}
                            title={onSuccess ? "CONTINUE" : "SETUP TRIP"}
                            onClick={handleNext}
                            className="w-full"
                        />
                    </div>
                </div>
                }
                
            </div>
        </div>
    )
}
