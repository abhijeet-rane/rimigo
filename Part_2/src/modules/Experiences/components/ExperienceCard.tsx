import ListCard from '@/components/ListCard'
import ShortlistButton from '@/components/common/ShortlistButton'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import AddToTripModal from '@/modules/ContentCollection/components/AddToTripModal'
import { Wand2, CalendarPlus } from 'lucide-react'
import React, { useState } from 'react'
import { formatPrice } from '../utils/priceFormatter'
import { getPriorityStyles } from '../utils/priorityMapper'
import { ExperienceCardData } from '../types/experienceCardTypes'

interface ExperienceCardProps {
    experience: ExperienceCardData
    onClick?: (id: string) => void
    isShortlisted?: boolean
    onToggleShortlist?: () => Promise<void> | void
    isShortlisting?: boolean
    highlightReasons?: string[]
}

const ExperienceCard: React.FC<ExperienceCardProps> = ({
    experience,
    onClick,
    isShortlisted = false,
    onToggleShortlist,
    isShortlisting = false,
    highlightReasons
}) => {
    const { id, title, city_name, price, image, images, experience_recommended, reason_of_suggestion } = experience
    const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false)
    const [isAddToTripModalOpen, setIsAddToTripModalOpen] = useState(false)

    const { lower_bound, upper_bound, currency } = price

    const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

    const handleCardClick = () => {
        onClick?.(id)
    }

    const priorityStyles = getPriorityStyles(experience?.suggestion_priority)

    const topBadge = priorityStyles
        ? {
              label: priorityStyles.label,
              bgColor: priorityStyles.bgColor,
              textColor: priorityStyles.textColor,
              shadowColor: priorityStyles.shadowColor,
              icon: priorityStyles.icon
          }
        : undefined

    const derivedHighlightReasons =
        highlightReasons || (experience_recommended === false && Array.isArray(reason_of_suggestion) ? reason_of_suggestion : undefined)

    // remove this once we have the highlight reasons
    let reasonHighlightContent =
        derivedHighlightReasons && derivedHighlightReasons.length > 0 ? (
            <div className="mt-3 rounded-xl bg-primary-default-80 px-3 py-3 flex items-center gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ">
                    <Wand2 className="h-3.5 w-3.5 text-primary-default" />
                </div>
                <div className="">
                    {derivedHighlightReasons.map((reason, idx) => (
                        <p
                            key={idx}
                            className="text-xs font-semibold text-grey-0">
                            {reason}
                        </p>
                    ))}
                </div>
            </div>
        ) : undefined

    reasonHighlightContent = undefined

    return (
        <div className="relative group lg:min-h-[350px]">
            <ListCard
                image={image} // Keep for backward compatibility
                images={images} // Use images array for carousel (includes verified_photos)
                imageAlt={title}
                fullHeight={true}
                className="group lg:min-h-[350px]"
                onClick={handleCardClick}
                topBadge={topBadge}
                title={title}
                city={city_name}
                price={formattedPrice}
                showShortlistButton={false}
                customContent={reasonHighlightContent}
            />
            {/* Action Buttons - positioned absolutely over the card */}
            <div className="absolute right-3 top-3 z-10 flex gap-2">
                {/* Add to Trip Button */}
                <button
                    aria-label="Add to trip"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsAddToTripModalOpen(true)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors cursor-pointer">
                    <CalendarPlus className="h-4 w-4 text-grey_1" />
                </button>
                {/* Add to Collection Button */}
                {/* <AddToCollectionButton
                    ariaLabel="Add to collection"
                    onAddToCollection={async () => {
                        setIsAddToCollectionModalOpen(true)
                    }}
                /> */}
                {/* Shortlist Button */}
                {onToggleShortlist && (
                    <ShortlistButton
                        ariaLabel="Save to shortlist"
                        isShortlisted={isShortlisted}
                        onShortlist={onToggleShortlist}
                        isLoading={isShortlisting}
                    />
                )}
            </div>

            {/* Add to Collection Modal */}
            <AddToCollectionModal
                isOpen={isAddToCollectionModalOpen}
                onClose={() => setIsAddToCollectionModalOpen(false)}
                experienceId={id}
                experienceName={title}
            />

            {/* Add to Trip Modal */}
            <AddToTripModal
                isOpen={isAddToTripModalOpen}
                onClose={() => setIsAddToTripModalOpen(false)}
                collectionIdentifier={id}
                collectionName={title}
            />
        </div>
    )
}

export default ExperienceCard
