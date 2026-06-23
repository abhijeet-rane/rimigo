import React from 'react'
import { ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react'
import { GroupTravelerReview } from '../../../types/experienceDetailTypes'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { groupTypeOptions } from '@/modules/Onboarding/pages/GroupTypeQuestionPage'

interface ExperienceReviewsSectionProps {
    groupReview?: GroupTravelerReview
    groupType?: string // e.g., "couples", "families", etc.
    isPublicView?: boolean // For public/logged-out users
}

const ExperienceReviewsSection: React.FC<ExperienceReviewsSectionProps> = ({ groupReview, groupType = 'couples', isPublicView = false }) => {
    const getGroupTypeMetadata = (type: string | undefined) => {
        if (!type) return null
        return groupTypeOptions.find((option) => option.backendValue === type) ?? null
    }

    const formatGroupType = (type: string): string => {
        if (!type) return 'you'
        const formatted = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
        return formatted.toLowerCase()
    }

    const displayGroupType = formatGroupType(groupType)
    const groupTypeMeta = getGroupTypeMetadata(groupType)
    const avatarImage = groupTypeMeta?.image ?? 'https://media.rimigo.com/1762969143935_545c488b2df451d6871b373aa1ec848c.png'
    const avatarFallback =
        groupTypeMeta?.labelUi
            .split(' ')
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? 'RV'

    // Return null if no group review data is available
    if (!groupReview) {
        return null
    }

    const { positive_reviews: positiveReviews, negative_reviews: negativeReviews } = groupReview

    if (!positiveReviews?.length && !negativeReviews?.length) {
        return null
    }

    return (
        <GenericCard className="bg-white rounded-bl-[12px] rounded-br-[12px] border-t-0 md:pt-4  rounded-tl-none rounded-tr-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-nowrap">
                <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                        <AvatarImage
                            src={avatarImage}
                            alt={groupTypeMeta?.labelUi || 'Group type avatar'}
                            className="object-cover rounded-full"
                        />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div className="text-[14px] tracking-[-0.01em] font-semibold font-red-hat-display text-grey-0">
                        {isPublicView ? 'Reviews from other travelers' : `Reviews from similar ${displayGroupType} like you`}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Sparkles
                        className="w-4 h-4"
                        style={{ color: 'var(--color-primary-default, #7011F6)' }}
                    />
                    <div className="text-[12px] tracking-[-0.01em] font-semibold font-red-hat-display text-primary-default">Summarised by AI</div>
                </div>
            </div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Positive Reviews - Left Column */}
                {positiveReviews?.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {positiveReviews?.map((review, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3">
                                <ThumbsUp
                                    className="w-4 h-4 shrink-0 mt-0.5"
                                    style={{ color: 'var(--color-secondary-green, #26BC6D)' }}
                                />
                                <div className="flex-1 space-y-0 md:space-y-2">
                                    <div className="text-[14px] tracking-[-0.01em] font-medium font-manrope text-grey-0">{review.tag}</div>
                                    <div className="text-[14px] tracking-[-0.02em] leading-[18px] font-medium font-manrope text-grey-2">
                                        {review.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Negative Reviews - Right Column */}
                {negativeReviews?.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {negativeReviews?.map((review, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3">
                                <ThumbsDown
                                    className="w-4 h-4 shrink-0 mt-0.5"
                                    style={{ color: 'var(--color-secondary-red, #E73434)' }}
                                />
                                <div className="flex-1 space-y-0 md:space-y-2">
                                    <div className="text-[14px] tracking-[-0.01em] font-medium font-red-hat-display text-grey-0">{review.tag}</div>
                                    <div className="text-[14px] tracking-[-0.02em] leading-[18px] font-medium font-manrope text-grey-2">
                                        {review.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GenericCard>
    )
}

export default ExperienceReviewsSection
