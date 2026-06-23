import TourCard from '../components/HowToBook/TourCard'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import { BookingWindow } from '@/modules/Experiences/types/experienceDetailTypes'
import { useEffect, useState } from 'react'
import CustomShimmer from '@/components/shared/Shimmer'
import { useUserInfo, UserInfo } from '@/hooks/useUserInfo'
import { Plus } from 'lucide-react'
import AddToursDialog from '@/modules/Tripboard/components/AddToursDialog'

const SECTION_TITLE = 'How to book'

const booking_window_mapper: Record<BookingWindow, { text: string; bgcolor: string; borderColor: string }> = {
    prebook: {
        text: 'Recommended to pre-book',
        bgcolor: 'bg-primary-default-80',
        borderColor: 'border border-primary-default'
    },
    few_days_in_advance: {
        text: 'Recommended to book a few days in advance.',
        bgcolor: 'bg-primary-default-80',
        borderColor: 'border border-primary-default'
    },
    on_the_spot: {
        text: 'You can book on the spot',
        bgcolor: 'bg-secondary-green-80',
        borderColor: 'border border-secondary-green'
    }
}

const Pill = ({ bookingWindow }: { bookingWindow: BookingWindow }) => {
    const bookingWindowData = booking_window_mapper[bookingWindow]
    return (
        <div className={`px-2 py-1 rounded-full text-xs font-medium text-grey-0 ${bookingWindowData.bgcolor} ${bookingWindowData.borderColor}`}>
            {bookingWindowData.text}
        </div>
    )
}

// TourCardShimmer matches the exact layout of TourCard (262x240)
const TourCardShimmer = () => {
    return (
        <div className="w-[262px] h-[240px] shrink-0 relative rounded-2xl bg-white border-primary-default border-solid border box-border flex flex-col items-start gap-4 p-4">
            {/* Top section with platform logo/name and recommended badge */}
            <div className="self-stretch flex items-start justify-between gap-5">
                {/* Platform section */}
                <div className="flex items-center gap-2">
                    <CustomShimmer
                        height={20}
                        radius={9999}
                        className="w-5"
                    />
                    <CustomShimmer
                        height={14}
                        radius={4}
                        className="w-[60px]"
                    />
                </div>
                {/* Recommended badge */}
                <CustomShimmer
                    height={22}
                    radius={8}
                    className="w-[100px]"
                />
            </div>

            {/* Content section */}
            <div className="self-stretch flex-1 flex flex-col items-start justify-between gap-5">
                <div className="self-stretch flex flex-col items-start gap-3 w-full">
                    {/* Title - 2 lines */}
                    <div className="self-stretch flex flex-col gap-2">
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-full"
                        />
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[80%]"
                        />
                    </div>
                    {/* Duration and rating pills */}
                    <div className="flex items-center gap-2.5">
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[60px]"
                        />
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[50px]"
                        />
                    </div>
                </div>

                {/* Bottom section with price and book button */}
                <div className="self-stretch flex items-end justify-between gap-5">
                    {/* Price section */}
                    <div className="flex flex-col items-start gap-0.5">
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-[30px]"
                        />
                        <CustomShimmer
                            height={32}
                            radius={4}
                            className="w-[80px]"
                        />
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-[50px]"
                        />
                    </div>
                    {/* Book button */}
                    <CustomShimmer
                        height={44}
                        radius={6}
                        className="w-[80px]"
                    />
                </div>
            </div>
        </div>
    )
}

const ToursSection = ({
    tours,
    isLoading,
    isPolling = false,
    bookingWindow,
    setIsVisible,
    isPublicView = false,
    userInfo,
    experienceId
}: {
    tours: AdaptedTourResponseType[]
    isLoading: boolean
    isPolling?: boolean
    bookingWindow: BookingWindow | null
    setIsVisible: (isVisible: boolean) => void
    isPublicView?: boolean
    userInfo: UserInfo | null
    experienceId?: string
}) => {
    const hasTours = tours && tours.length > 0
    // When we have the tours response but live data is still arriving, keep shimmers visible
    const showShimmerCards = isLoading || (!hasTours && isPolling)

    const { isRimigoInternal } = useUserInfo()
    const [isAddToursOpen, setIsAddToursOpen] = useState(false)
    const canAddTours = isRimigoInternal && !!experienceId

    // Update visibility based on tours data
    useEffect(() => {
        if (!isLoading) {
            // Always show for public view (dummy tours), hide if no tours for authenticated users
            if (isPublicView) {
                setIsVisible(true)
            } else if (!tours || tours.length === 0) {
                setIsVisible(false)
            } else {
                setIsVisible(true)
            }
        }
    }, [isLoading, tours, setIsVisible, isPublicView])

    // If there's nothing to render and we're not waiting on data, hide the section
    if (!showShimmerCards && !hasTours && !isPublicView) {
        return null
    }

    return (
        <div className="w-full max-md:px-[20px]">
            <div className="mb-4 flex items-center justify-between gap-2">
                <SectionTitle title={SECTION_TITLE} />
                <div className="flex items-center gap-2">
                    {canAddTours && (
                        <button
                            type="button"
                            onClick={() => setIsAddToursOpen(true)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-grey-3 text-[11px] font-manrope font-medium text-grey-1 hover:border-primary-default hover:text-primary-default cursor-pointer transition-colors"
                            title="Add a new tour to this experience">
                            <Plus className="w-3 h-3" />
                            Add tour
                        </button>
                    )}
                    {bookingWindow && <Pill bookingWindow={bookingWindow} />}
                </div>
            </div>

            <div className="relative">
                <GenericCarousel
                    className=""
                    gradientStartColor="rgba(255, 255, 255, 1)"
                    gradientEndColor="rgba(255, 255, 255, 0)"
                    gradientLeftStartColor="rgba(255, 255, 255, 1)"
                    gradientLeftEndColor="rgba(255, 255, 255, 0)"
                    gap={16}>
                    {showShimmerCards ? (
                        // Show shimmer placeholders while loading
                        <>
                            <TourCardShimmer />
                            <TourCardShimmer />
                            <TourCardShimmer />
                        </>
                    ) : (
                        // Show actual tour cards
                        tours.map((tour) => (
                            <TourCard
                                triggerType="ExperienceDetail"
                                key={tour.id}
                                tour={tour}
                                isPolling={isPolling}
                                userInfo={userInfo}
                                experienceId={experienceId}
                            />
                        ))
                    )}
                </GenericCarousel>

                {/* Overlay for public users */}
                {/* {isPublicView && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                        <div className="text-center px-6 py-8 max-w-md">
                            <div className="mb-4">
                                <svg
                                    className="w-12 h-12 mx-auto text-indigo-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to view booking options</h3>
                            <p className="text-gray-600 mb-6">Create an account or log in to see available tours and book your experience</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <a
                                    href="/login"
                                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                    Sign In
                                </a>
                                <a
                                    href="/signup"
                                    className="inline-block px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                                    Create Account
                                </a>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
            {canAddTours && experienceId && (
                <AddToursDialog
                    open={isAddToursOpen}
                    onOpenChange={setIsAddToursOpen}
                    experienceId={experienceId}
                    experienceName={null}
                />
            )}
        </div>
    )
}

export default ToursSection
