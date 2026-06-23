import React, { useState } from 'react'
import { ArrowUpRight, Info } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import RimigoInfoDetails from './RimigoInfoDetails'
import { USER_TYPE_RIMIGO_INTERNAL } from '@/constants/userConfig'
import RimigoDealModal from './RimigoDealModal'
import { RIMIGO_DEAL_CONTENT } from '@/constants/rimigoDealContent'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { RIMIGO_TEXT_LOGO } from '@/constants/icons/svgFromCDN'

interface DealLabelProps {
    deal: {
        logo: string
        platform: string
        price: string
        rawPrice?: number
        currency?: string
        nights: string
        save?: string
        redirectLink: string
        cancellationType?: string
        rimigoData?: {
            price_amount?: number
            total_price?: number
            lowest_price_provider?: string
            service_charge_added?: boolean
            service_charge_added_amount?: number
        }
    }
}

const DealsLabel: React.FC<DealLabelProps> = ({ deal }) => {
    const { trackButtonClick } = usePostHog()
    const { user, isPremium, isPro } = useUserInfo()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    // Info button is only for rimigo_internal users (not premium)
    const isRimigoInternal = user?.type === USER_TYPE_RIMIGO_INTERNAL
    const isRimigoProvider = deal.platform === 'Rimigo'
    const canShowRimigoInfo = isRimigoInternal && isRimigoProvider && deal.rimigoData
    const [showRimigoInfo, setShowRimigoInfo] = useState(false)
    const [showRimigoModal, setShowRimigoModal] = useState(false)

    const handleDealClick = (e: React.MouseEvent) => {
        e.stopPropagation() // prevent triggering any parent click (optional)

        // Track PostHog event for deal button click
        trackButtonClick({
            button_name: `${deal.platform} Deal Button`,
            location: 'hotel_detail_deals_section',
            extra: {
                platform: deal.platform,
                price: deal.rawPrice || null,
                traveler_id: user?.id || null,
                trip_id: activeTrip?.trip_id || null,
            }
        })

        // For Rimigo, show modal instead of redirecting
        if (isRimigoProvider) {
            setShowRimigoModal(true)
            return
        }

        // For other platforms (like Agoda), open redirectLink
        if (deal.redirectLink) {
            window.open(deal.redirectLink, '_blank', 'noopener,noreferrer')
        }
    }

    // Get modal text based on user type
    const getRimigoModalContent = () => {
        if (isRimigoInternal) {
            return { ...RIMIGO_DEAL_CONTENT.internal, ctaText: undefined, onCtaClick: undefined, secondText: undefined }
        } else if (isPro) {
            return { ...RIMIGO_DEAL_CONTENT.pro, ctaText: undefined, onCtaClick: undefined, secondText: undefined }
        } else if (isPremium) {
            return { ...RIMIGO_DEAL_CONTENT.premium, ctaText: undefined, onCtaClick: undefined, secondText: undefined }
        } else {
            return {
                ...RIMIGO_DEAL_CONTENT.nonPremium,
                onCtaClick: () => { window.open('/premium', '_blank', 'noopener,noreferrer') },
                secondText: undefined
            }
        }
    }


    return (
        <div className="flex flex-col">
            <div
                className="flex flex-row p-3 border-b border-grey-4 justify-between transition-colors bg-natural-white">
                <div className="flex flex-row gap-2 items-center">
                    <img
                        src={isRimigoProvider ? RIMIGO_TEXT_LOGO : deal.logo}
                        height={28}
                        width={72}
                        alt={deal.platform}
                        className="object-contain h-7 w-auto max-w-[72px]"
                    />

                    {/* Info button for Rimigo internal users */}
                    {canShowRimigoInfo && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowRimigoInfo((prev) => !prev)
                            }}
                            className={`w-6 h-6 rounded-full  flex items-center justify-center cursor-pointer transition ${showRimigoInfo
                                ? 'border-primary-default bg-primary-default/10'
                                : 'border-grey-3 hover:bg-grey-5'
                                }`}>
                            <Info
                                size={20}
                                className={showRimigoInfo ? 'text-primary-default' : 'text-grey-2'}
                            />
                        </button>
                    )}

                </div>

                <div className="flex flex-row gap-3 items-center">
                    <div className="flex flex-col">
                        <Typography
                            textAlign="right"
                            size="14"
                            weight="semibold"
                            color="grey-0"
                            family="manrope">
                            {deal.price}
                        </Typography>
                        <Typography
                            textAlign="right"
                            size="10"
                            weight="medium"
                            color="grey-2"
                            family="manrope">
                            incl. of all taxes
                        </Typography>
                        <Typography
                            textAlign="right"
                            size="11"
                            weight="semibold"
                            color="grey-2"
                            family="manrope">
                            {deal.nights}
                        </Typography>
                    </div>

                    <div
                        onClick={handleDealClick}
                        className="w-[24px] h-[24px] rounded-full border border-primary-default flex items-center justify-center cursor-pointer hover:bg-primary-default/10 transition">
                        <ArrowUpRight
                            size={12}
                            className="text-primary-default"
                        />
                    </div>
                </div>
            </div>

            {/* Rimigo Info Details - shown below rates for internal users when info button is clicked */}
            {canShowRimigoInfo && showRimigoInfo && deal.rimigoData && (
                <RimigoInfoDetails
                    rimigoData={deal.rimigoData}
                    currency={deal.currency}
                />
            )}

            {/* Rimigo Modal */}
            {isRimigoProvider && (() => {
                const modalContent = getRimigoModalContent()
                return (
                    <RimigoDealModal
                        isOpen={showRimigoModal}
                        onClose={() => setShowRimigoModal(false)}
                        title={modalContent.title}
                        description={modalContent.description}
                        variant={modalContent.variant}
                        ctaText={modalContent.ctaText}
                        onCtaClick={modalContent.onCtaClick}
                        secondText={modalContent.secondText}
                    />
                )
            })()}
        </div>
    )
}

export default DealsLabel
