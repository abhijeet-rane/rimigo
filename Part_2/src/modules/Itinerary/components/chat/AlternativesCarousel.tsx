import React, { useState } from 'react'
import type { AlternativesData } from './types'
import ListCard from '@/components/ListCard'
import FoodCard, { type FoodItemData } from '@/modules/ContentCollection/components/FoodCard'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import SubjectLine from './primitives/SubjectLine'

interface AlternativesCarouselProps {
    data: AlternativesData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    sourceInteractionId?: string
}

const AlternativesCarousel: React.FC<AlternativesCarouselProps> = ({ data, onSendAgentMessage, sourceInteractionId }) => {
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const isAdd = data.action === 'add'
    const isSelected = selectedId !== null

    // Concierge rebuild: structured intent envelopes replace the legacy
    // direct-replacement task_data dict shape. Each tap surfaces an
    // explicit action ("direct_replacement_add" or
    // "direct_replacement_replace") so the agent can dispatch without
    // re-running the classifier.
    const handleSelectExperience = (id: string) => {
        if (isSelected) return
        const exp = data.experience_alternatives.find((e) => e.id === id)
        if (!exp) return
        setSelectedId(id)
        const dayNum = (isAdd ? (data.add_to_day_index ?? data.slot_ref.day_index) : data.slot_ref.day_index) + 1
        if (isAdd) {
            onSendAgentMessage?.(`Add ${exp.title} to day ${dayNum}`, {
                action: 'direct_replacement_add',
                slot_ref: {
                    day_index: data.add_to_day_index ?? data.slot_ref.day_index,
                    slot_index: -1,
                    ...(data.relative_to && { relative_to: data.relative_to }),
                    ...(data.position && { position: data.position }),
                },
                replacement: { type: 'experience', ...exp },
                source_interaction_id: sourceInteractionId,
            })
        } else {
            onSendAgentMessage?.(`Replace ${data.current_title} with ${exp.title} on day ${dayNum}`, {
                action: 'direct_replacement_replace',
                slot_ref: data.slot_ref,
                replacement: { type: 'experience', ...exp },
                source_interaction_id: sourceInteractionId,
            })
        }
    }

    const handleSelectPlace = (placeName: string) => {
        if (isSelected) return
        const place = data.place_alternatives.find((p) => p.name === placeName)
        setSelectedId(placeName)
        const dayNum = (isAdd ? (data.add_to_day_index ?? data.slot_ref.day_index) : data.slot_ref.day_index) + 1
        if (isAdd) {
            onSendAgentMessage?.(`Add ${placeName} to day ${dayNum}`, {
                action: 'direct_replacement_add',
                slot_ref: {
                    day_index: data.add_to_day_index ?? data.slot_ref.day_index,
                    slot_index: -1,
                    kind: data.slot_kind,
                    ...(data.relative_to && { relative_to: data.relative_to }),
                    ...(data.position && { position: data.position }),
                },
                replacement: { type: 'place', ...(place || { name: placeName }) },
                source_interaction_id: sourceInteractionId,
            })
        } else {
            onSendAgentMessage?.(`Replace ${data.current_title} with ${placeName} on day ${dayNum}`, {
                action: 'direct_replacement_replace',
                slot_ref: data.slot_ref,
                replacement: { type: 'place', ...(place || { name: placeName }) },
                source_interaction_id: sourceInteractionId,
            })
        }
    }

    const handleSneakPeekClick = (e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekId(experienceId)
    }

    const isExperience = data.slot_kind === 'experience' && data.experience_alternatives?.length > 0
    const isPlace = data.place_alternatives?.length > 0

    return (
        <ChatCardShell intent="neutral">
            {data.response && <ResponseText text={data.response} size="body" />}

            {data.current_title && (
                <SubjectLine
                    prefix={isAdd ? 'Suggestions for' : 'Alternatives for'}
                    subject={data.current_title}
                />
            )}

            {!isExperience && !isPlace && (
                <p className="text-sm text-gray-500 py-4 text-center">No alternatives found for this activity.</p>
            )}

            {/* Experience alternatives */}
            {isExperience && (
                <div className="grid grid-cols-3 gap-2">
                    {(data.experience_alternatives || []).map((exp) => {
                        const formattedPrice = formatPrice(
                            exp.price_lower || 0,
                            exp.price_upper || 0,
                            exp.currency || ''
                        )
                        const firstVerifiedPhoto = exp.images && exp.images.length > 1 ? exp.images[1] : undefined
                        const isThis = selectedId === exp.id
                        const dimmed = isSelected && !isThis

                        return (
                            <div
                                key={exp.id}
                                className={`relative w-full transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''} ${isThis ? 'ring-2 ring-primary-default rounded-xl' : ''}`}
                            >
                                <ListCard
                                    image={exp.image}
                                    images={exp.images}
                                    imageAlt={exp.title}
                                    fullHeight={true}
                                    className={`group w-full ${!isSelected ? 'cursor-pointer' : ''}`}
                                    onClick={() => handleSelectExperience(exp.id)}
                                    title={exp.title}
                                    city={exp.city_name}
                                    price={formattedPrice}
                                    showSneakPeekButton={!isSelected}
                                    sneakPeekUserImage={firstVerifiedPhoto}
                                    onSneakPeekClick={(e) => handleSneakPeekClick(e, exp.id)}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Place/food alternatives */}
            {isPlace && (
                <div className="grid grid-cols-3 gap-2">
                    {(data.place_alternatives || []).map((place, idx) => {
                        const foodData: FoodItemData = {
                            name: place.name,
                            map_link: place.map_link,
                            image_url: place.image_url,
                            address: place.address,
                            latitude: place.latitude,
                            longitude: place.longitude,
                        }
                        const isThis = selectedId === place.name
                        const dimmed = isSelected && !isThis

                        return (
                            <div
                                key={place.name + idx}
                                onClick={() => handleSelectPlace(place.name)}
                                className={`transition-opacity ${!isSelected ? 'cursor-pointer' : ''} ${dimmed ? 'opacity-40 pointer-events-none' : ''} ${isThis ? 'ring-2 ring-primary-default rounded-xl' : ''}`}
                            >
                                <FoodCard item={foodData} />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Hint — only when no selection made yet */}
            {!isSelected && (isExperience || isPlace) && (
                <p className="text-[11px] text-grey_3 text-center font-manrope">
                    Tap a card to {isAdd ? 'add it to your itinerary' : 'select a replacement'}
                </p>
            )}

            {/* SneakPeek Modal */}
            {sneakPeekId && (
                <SneakPeekModal
                    isOpen={!!sneakPeekId}
                    onClose={() => setSneakPeekId(null)}
                    experienceId={sneakPeekId}
                />
            )}
        </ChatCardShell>
    )
}

export default AlternativesCarousel
