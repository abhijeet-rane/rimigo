import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/shared/ButtonNew'
import { getBookingItemRedirectConfig, BookingItemRedirectConfig } from '../constants/bookingItemRedirects'
import type { BookingItem } from '../api/premiumPageAPI'

interface BookingItemRedirectsProps {
    bookingItem: BookingItem
}

/**
 * Component to render redirect options for a booking item based on entity_type and fulfillment_type
 * Uses the configurable mapping to determine what redirect buttons to show
 */
export const BookingItemRedirects: React.FC<BookingItemRedirectsProps> = ({ bookingItem }) => {
    const navigate = useNavigate()

    // Get redirect configuration for this booking item
    const redirectConfig: BookingItemRedirectConfig | null = getBookingItemRedirectConfig(
        bookingItem.entity_type,
        bookingItem.fulfillment_type || null,
        bookingItem.type
    )

    // If no config exists, don't render anything
    if (!redirectConfig || !redirectConfig.redirectOptions.length) {
        return null
    }

    return (
        <div className="mt-6 pt-6 border-t border-gray-200">
            {redirectConfig.title && (
                <h3 className="text-lg font-semibold text-gray-900 font-red-hat-display mb-2">
                    {redirectConfig.title}
                </h3>
            )}
            {redirectConfig.description && (
                <p className="text-sm text-gray-600 font-manrope mb-4">
                    {redirectConfig.description}
                </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
                {redirectConfig.redirectOptions.map((option, index) => (
                    <Button
                        key={index}
                        title={option.label}
                        onClick={() => navigate(option.route)}
                        variant={option.variant || 'primary'}
                        className={
                            option.variant === 'secondary'
                                ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 px-6 py-3 rounded-lg font-manrope'
                                : 'bg-primary-default text-white hover:bg-primary-dark px-6 py-3 rounded-lg font-manrope'
                        }
                    />
                ))}
            </div>
        </div>
    )
}

