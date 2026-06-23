import React from 'react'
import type { ATAFeature } from '@/api/ataAPI/types/featuresTypes'
import { handleRedirection, handleAPIAction, handleFeatureActions } from '../utils/featureActions'
import { useNavigate, useLocation } from 'react-router-dom'
import { useOptionalTravelerTrips } from '../context/travelerTripsContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { toast } from 'sonner'

interface AgentThreadData {
    id: string | null
    entity_type: string | null
}

interface NeedCardProps {
    feature: ATAFeature
    onTileClick?: (route: string) => void
    getThreadData: (agentId: string, entityId: string | null) => AgentThreadData | null
}

export const NeedCard: React.FC<NeedCardProps> = ({ feature, onTileClick, getThreadData }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const { isAuthenticated } = useAuth()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const tripId = activeTrip?.trip_id || null

    const cardProps = feature.card_props
    const isComingSoon = feature.status === 'coming_soon'

    // For coming_soon, use primary-default-08 background, otherwise use card background
    const backgroundColor = isComingSoon ? '#7011f614' : cardProps.background_color || '#101010'
    const icon = cardProps.icon
    const title = cardProps.name
    const ctaProps = cardProps.cta_props

    // Get text colors from card_props with fallbacks
    const textColor = cardProps.text_color || (isComingSoon ? '#101010' : '#FFFFFF')
    const highlightTextColor = cardProps.highlight_text_color || textColor
    const highlightTextBgColor = cardProps.highlight_text_bg_color || 'transparent'

    // Function to render title with asterisk-enclosed text as chips
    const renderTitle = () => {
        // Regex to match text enclosed in asterisks: *text*
        const asteriskPattern = /\*([^*]+)\*/g
        const parts: (string | React.ReactElement)[] = []
        let lastIndex = 0
        let match
        let chipIndex = 0

        // Find all asterisk-enclosed text
        while ((match = asteriskPattern.exec(title)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(title.substring(lastIndex, match.index))
            }

            // Add the highlighted text as a chip
            const highlightedText = match[1]
            parts.push(
                <span
                    key={`chip-${chipIndex++}`}
                    className="inline-flex items-center px-1 md:px-2  rounded-sm md:rounded-md"
                    style={{
                        color: highlightTextColor,
                        backgroundColor: highlightTextBgColor,
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        fontFamily: 'inherit',
                        fontWeight: 'inherit'
                    }}>
                    {highlightedText}
                </span>
            )

            lastIndex = match.index + match[0].length
        }

        // Add remaining text after the last match
        if (lastIndex < title.length) {
            parts.push(title.substring(lastIndex))
        }

        // If no asterisks found, return original title
        if (parts.length === 0) {
            return title
        }

        return <>{parts}</>
    }

    // Memoize handleClick to ensure stable reference
    const handleClick = React.useCallback(
        async (e: React.MouseEvent) => {
            // Disable click for coming_soon cards
            if (isComingSoon) {
                e.preventDefault()
                e.stopPropagation()
                return
            }

            e.preventDefault()
            e.stopPropagation()

            // Check authentication - redirect to login if not authenticated
            if (!isAuthenticated) {
                const redirectUrl = `${location.pathname}${location.search}`
                navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                return
            }

            // Check for new actions array structure first
            if (cardProps.actions && cardProps.actions.length > 0) {
                await handleFeatureActions(cardProps.actions, feature, tripId, getThreadData)
                return
            }

            // Fallback to legacy structure
            // Handle API actions (firePrompt) - execute first, then redirect
            if (cardProps.api_actions && cardProps.api_actions.length > 0) {
                const firePromptAction = cardProps.api_actions.find((a) => a.type === 'firePrompt')
                if (firePromptAction) {
                    // Execute firePrompt action immediately - don't await, but ensure it starts
                    const apiCallPromise = handleAPIAction(firePromptAction, feature, tripId, getThreadData)
                    apiCallPromise.catch((error: any) => {
                        toast.error(error?.response?.data?.message || 'Failed to send request. Please try again.')
                    })
                    // Give the API call a moment to initiate before navigation
                    await new Promise((resolve) => setTimeout(resolve, 100))
                }
            }

            // Handle redirection if available (legacy structure)
            if (cardProps.redirection) {
                handleRedirection(cardProps.redirection)
                return
            }

            // Fallback
            if (onTileClick) {
                onTileClick('#')
            }
        },
        [cardProps, feature, tripId, navigate, onTileClick, getThreadData, isComingSoon, isAuthenticated, location.pathname, location.search]
    )

    return (
        <div
            className={`
                relative
                w-full
                overflow-hidden
                aspect-9/10 md:aspect-3/2
                ${isComingSoon ? 'cursor-default' : 'cursor-pointer'}
                group
                transition-transform
                ${isComingSoon ? '' : 'hover:scale-[1.03]'}
                shadow-md
            `}
            style={{
                backgroundColor,
                borderRadius: '12px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#E0E0E0',
                position: 'relative',
                zIndex: 1
            }}
            onClick={handleClick}
            role={isComingSoon ? undefined : 'button'}
            tabIndex={isComingSoon ? -1 : 0}
            aria-label={title}
            onKeyDown={(e) => {
                if (isComingSoon) return
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick(e as any)
                }
            }}>
                
            {/* Title - Top Left */}
            <div
                className="absolute top-3 px-2 md:top-4 md:px-4 z-10"
            >
                <h3
                    className='text-[12px] md:text-[16px] leading-5 m-0 align-middle'
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        // fontSize: '16px',
                        // lineHeight: '20px',
                        letterSpacing: '-0.02em', // -2%
                        verticalAlign: 'middle',
                        color: textColor,
                        margin: 0
                    }}>
                    {renderTitle()}
                </h3>
            </div>

            {/* Icon - Below Title, Left Aligned */}
            {icon && (
                <div
                    className="absolute top-20 md:top-20 left-3 md:left-4 md:bottom-8 flex items-center justify-start pointer-events-none"
                    >
                    <img
                        src={icon}
                        alt={title}
                        className='w-[60px] h-[66px] md:w-[100px] md:h-[110px] object-contain pointer-events-none'
                    />
                </div>
            )}

            {/* CTA Button or Coming Soon Chip */}
            {isComingSoon ? (
                <div
                    className="absolute bottom-3 right-3 md:bottom-5 md:right-4"
                    style={{ pointerEvents: 'none' }}>
                    <div
                        className="flex flex-col md:flex-row bg-primary-dark font-red-hat-display items-center justify-center px-1 py-1 md:px-2 md:py-1.5 rounded-[8px] md:rounded-[20px]"
                        style={{
                            pointerEvents: 'none'
                        }}>
                        <span 
                            className="text-[10px] md:text-xs uppercase tracking-wide text-center leading-tight"
                            style={{
                                color: '#FFFFFF',
                                fontFamily: 'Manrope, sans-serif',
                                fontWeight: 800
                            }}>
                            <span className="block md:inline">COMING</span>
                            <span className="block md:inline md:ml-1"> SOON</span>
                        </span>
                    </div>
                </div>
            ) : (
                <div
                    className="absolute bottom-0 right-0 z-10"
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'none' }}>
                    <div
                        className="flex items-center justify-center group-hover:opacity-90 transition-opacity"
                        style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: ctaProps?.cta_bg_color || '#FFFFFF',
                            color: ctaProps?.cta_color || '#101010',
                            borderTopLeftRadius: '12px',
                            borderBottomRightRadius: '8px',
                            pointerEvents: 'none'
                        }}>
                        <span
                            className="text-s font-semibold"
                            style={{
                                color: ctaProps?.cta_color || '#101010'
                            }}>
                            {ctaProps?.cta_text || '>'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
