import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '@/modules/Acitvities/components/CardShortlistOverlay'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import { useExperiencesExplore } from '@/modules/Acitvities/hooks/useExperiencesExplore'
import { useOptionalShortlistedExperiences } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import CustomShimmer from '@/components/shared/Shimmer'

interface MorePlacesForYouProps {
    countryId: string | null
    cityIds?: string[]
    tripId?: string
    isMobile?: boolean
    /** "See all" → Activities Explore tab. */
    onSeeAll: () => void
}

/**
 * "More places for you" — recommended experiences shown as the standard
 * explore card (image carousel + Watch Reel + heart + title / city), on a
 * light-purple panel. Hearting a card animates it out of this section and the
 * wishlist list above refetches so it shows up under "Your wishlist".
 */
const MorePlacesForYou = ({ countryId, cityIds, tripId, isMobile = false, onSeeAll }: MorePlacesForYouProps) => {
    const filteredCityIds = cityIds?.filter((id) => id !== 'all')
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)
    // Dismissed via the "Got it" CTA on the all-shortlisted end state.
    const [dismissed, setDismissed] = useState(false)
    const shortlistCtx = useOptionalShortlistedExperiences()
    const queryClient = useQueryClient()

    const { topActivities, isLoading } = useExperiencesExplore({
        countryId,
        cityId: filteredCityIds && filteredCityIds.length > 0 ? filteredCityIds[0] : undefined,
        baseCityIds: filteredCityIds && filteredCityIds.length > 0 ? filteredCityIds : undefined,
        limit: 10
    })

    // Drop cards the user has already shortlisted — they belong in "Your
    // wishlist" above. AnimatePresence handles the smooth exit.
    const visibleActivities = topActivities.filter((a) => !shortlistCtx?.shortlistState[a.id]?.isShortlisted)

    const handleToggle = async (id: string) => {
        await shortlistCtx?.handleShortlistToggle(id)
        // Refresh the wishlist list so the just-shortlisted card appears there.
        queryClient.invalidateQueries({ queryKey: ['tripboard-activities-shortlisted', tripId] })
    }

    if (dismissed) return null

    if (isLoading && topActivities.length === 0) {
        return (
            <div className="border-t-2 border-primary-default bg-primary-pale-purple px-3 pt-6 pb-4">
                <h3 className="text-[16px] font-bold font-red-hat-display text-grey-0">More places for you</h3>
                <p className="mt-0.5 text-[12px] font-semibold font-red-hat-display text-grey-2">
                    Travellers usually pair these with the places you've added
                </p>
                <div className="mt-3 flex gap-3 overflow-hidden">
                    {[0, 1].map((i) => (
                        <CustomShimmer
                            key={i}
                            className="min-w-[300px] h-[330px] rounded-2xl"
                            height={330}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // No recommendations at all — render nothing.
    if (topActivities.length === 0) return null

    // Every recommendation has been shortlisted (moved into "Your wishlist").
    // Show a friendly end state instead of an empty section.
    if (visibleActivities.length === 0) {
        return (
            <div className="border-t-2 border-primary-default bg-primary-pale-purple px-6 py-8 text-center">
                <p className="text-[16px] font-bold font-red-hat-display text-grey-0">That's all for now!</p>
                <p className="mx-auto mt-1.5 max-w-[260px] text-[13px] font-medium font-red-hat-display text-grey-2">
                    Check back later, we'll find more places based on your activities.
                </p>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="mt-4 text-[13px] font-bold font-red-hat-display text-primary-default underline underline-offset-2 cursor-pointer">
                    Got it
                </button>
            </div>
        )
    }

    return (
        <div className="border-t-2 border-primary-default bg-primary-pale-purple px-3 pt-6 pb-4">
            <h3 className="text-[16px] font-bold font-red-hat-display text-grey-0">More places for you</h3>
            <p className="mt-0.5 text-[12px] font-semibold font-red-hat-display text-grey-2">
                Travellers usually pair these with the places you've added
            </p>

            <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                <AnimatePresence initial={false}>
                    {visibleActivities.map((activity) => {
                        const id = activity.id
                        const isShortlisting = Boolean(shortlistCtx?.shortlistLoadingIds[id])
                        const firstVerifiedPhoto = activity.images && activity.images.length > 1 ? activity.images[1] : undefined
                        return (
                            <motion.div
                                key={id}
                                layout
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.94 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="relative shrink-0">
                                <ListCard
                                    image={activity.image}
                                    images={activity.images}
                                    imageAlt={activity.title}
                                    title={activity.title}
                                    city={activity.city_name}
                                    showShortlistButton={false}
                                    showSneakPeekButton
                                    sneakPeekButtonLabel="Watch Reel"
                                    sneakPeekUserImage={firstVerifiedPhoto}
                                    onSneakPeekClick={(e) => {
                                        e.stopPropagation()
                                        setSneakPeekId(id)
                                    }}
                                    onClick={() => setSneakPeekId(id)}
                                />
                                <CardShortlistOverlay
                                    isShortlisted={false}
                                    isShortlisting={isShortlisting}
                                    onToggle={() => handleToggle(id)}
                                />
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <button
                type="button"
                onClick={onSeeAll}
                className="mt-3 flex w-full items-center justify-center gap-1 text-[15px] font-bold font-red-hat-display tracking-[0.3px] text-primary-default cursor-pointer">
                SEE ALL
                <ChevronRight size={17} />
            </button>

            {sneakPeekId &&
                typeof document !== 'undefined' &&
                createPortal(
                    <SneakPeekModal
                        isOpen={!!sneakPeekId}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        tripId={tripId}
                        reelsModeOnMobile={isMobile}
                    />,
                    document.body
                )}
        </div>
    )
}

export default MorePlacesForYou
