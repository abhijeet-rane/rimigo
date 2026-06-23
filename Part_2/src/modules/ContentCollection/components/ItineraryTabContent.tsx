import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section, ApiResponse, ContentCollection } from '../types/contentCollection'
import { contentCollectionApi } from '../api/contentCollectionApi'
import Typography from '@/components/shared/Typography'
import Itinerary from '@/modules/Itinerary/pages/Itenerary'
import ViewContentCollectionLoading from './ViewContentCollectionLoading'
import type { TravelerTripsData } from '@/pages/Landing/api/travelerTrips'

// Type for API with updateSection and getByIdentifier methods
type CollectionApi = {
    updateSection: (
        identifier: string,
        sectionId: string,
        payload: Partial<{
            title: string
            description: string | null
            sections_order: number | null
            entity_id: string | null
            metadata: Record<string, unknown>
        }>
    ) => Promise<unknown>
    getByIdentifier: (identifier: string, sectionType?: string) => Promise<ApiResponse<ContentCollection>>
}

const HOURS_24 = 24 * 60 * 60 * 1000

type Props = {
    isRimigoInternal: boolean
    collectionIdentifier?: string
    isActive?: boolean
    onItineraryLinked?: () => void
    showCloneButton?: boolean
    api?: CollectionApi // Optional API instance (defaults to contentCollectionApi)
    /** When false, the embedded itinerary is editable (drag-drop, delete, etc.). Defaults to true. */
    readOnly?: boolean
    /** When true, hides exact dates and shows only "Day N" labels */
    hideExactDates?: boolean
    /** Active trip object — provides tripId and itineraryId for edit mutations. */
    activeTrip?: TravelerTripsData['trips'][number]
    /** Callback to trigger tripboard creation/update after itinerary recreate. */
    onCreateTripboardOverride?: () => void
    showCreateTripboardBtn?: boolean
    /** Used by TripboardPage to hide desktop floating assistant during recreate flow. */
    onRecreateModeChange?: (isInRecreateMode: boolean) => void
    /**
     * Lets the parent page mount itinerary-owned actions in TripboardHeader's
     * overflow dropdown. Each component that owns a handler registers it on
     * mount and clears on unmount; the header invokes the latest via a ref
     * held in the parent.
     * - onRegisterRecreate: Itinerary registers handleRetry
     * - onRegisterShareItinerary: Itinerary registers the share-modal trigger
     */
    onRegisterRecreate?: (handler: (() => void) | null) => void
    onRegisterShareItinerary?: (handler: (() => void) | null) => void
    /** Called when mobile itinerary switches between list and map view */
    onMobileViewChange?: (view: 'list' | 'map') => void
    /**
     * Pre-built hotel list (same as the Stays tab) — forwarded to the
     * inline hotel-picker drawer so it can render without refetching.
     * Each entry carries the city_id, name, banner, and fallback rate.
     */
}

function parseItineraryIdFromUrl(input: string): string | null {
    const raw = input.trim().replace(/^['"]|['"]$/g, '')
    if (!raw) return null

    try {
        const url = new URL(raw)
        const segments = url.pathname.split('/').filter(Boolean)
        const itineraryIndex = segments.findIndex((s) => s.toLowerCase() === 'itinerary')
        if (itineraryIndex === -1) return null
        const id = segments[itineraryIndex + 1]
        return id || null
    } catch {
        // If it's not a valid URL, try a simple path-like parse
        const segments = raw.split('?')[0].split('#')[0].split('/').filter(Boolean)
        const itineraryIndex = segments.findIndex((s) => s.toLowerCase() === 'itinerary')
        if (itineraryIndex === -1) return null
        const id = segments[itineraryIndex + 1]
        return id || null
    }
}

const ItineraryTabContent: React.FC<Props> = ({
    isRimigoInternal,
    collectionIdentifier,
    isActive = false,
    onItineraryLinked,
    showCloneButton = true,
    api = contentCollectionApi,
    readOnly = true,
    hideExactDates = false,
    activeTrip,
    onCreateTripboardOverride,
    showCreateTripboardBtn = true,
    onRecreateModeChange,
    onRegisterRecreate,
    onRegisterShareItinerary,
    onMobileViewChange,
}) => {
    const queryClient = useQueryClient()

    // Fetch collection data for itinerary section - only when tab is active
    const { data: itineraryCollectionResponse, isLoading: isCollectionLoading } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'itinerary'],
        queryFn: async () => {
            return await api.getByIdentifier(collectionIdentifier!, 'itinerary')
        },
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const itinerarySection = useMemo(() => {
        return itineraryCollectionResponse?.data?.sections?.find((s: Section) => s.section_type === 'itinerary') || null
    }, [itineraryCollectionResponse?.data?.sections])

    const [itineraryLink, setItineraryLink] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        // Clear input once itinerary is linked
        if (itinerarySection?.entity_id) {
            setItineraryLink('')
        }
    }, [itinerarySection?.entity_id])

    const handleLink = useCallback(async () => {
        if (!isRimigoInternal) return
        if (!collectionIdentifier) {
            toast.error('Missing collection identifier')
            return
        }
        if (!itinerarySection?.id) {
            toast.error('Itinerary section not found')
            return
        }

        const itineraryId = parseItineraryIdFromUrl(itineraryLink)
        if (!itineraryId) {
            toast.error('Please paste a valid itinerary link (e.g. /itinerary/<id>)')
            return
        }

        setIsSubmitting(true)
        try {
            await api.updateSection(collectionIdentifier, itinerarySection.id, {
                entity_id: itineraryId
            })
            toast.success('Itinerary linked successfully')
            // Invalidate itinerary query to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'itinerary'] })
            onItineraryLinked?.()
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to link itinerary:', err)
            toast.error('Failed to link itinerary. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }, [collectionIdentifier, isRimigoInternal, itineraryLink, itinerarySection?.id, onItineraryLinked, api, queryClient])

    if (isCollectionLoading) {
        // Kanban skeleton (not the compass) — the compass phase is owned by the parent's
        // 2-stage loader; this fallback stays a skeleton so it never flips back to compass.
        return <ViewContentCollectionLoading activeTab="itinerary" hideTabBar />
    }

    if (!itinerarySection) {
        return (
            <div className="text-center py-12">
                <Typography
                    size="16"
                    weight="medium"
                    color="grey-1">
                    No itinerary section found for this collection.
                </Typography>
            </div>
        )
    }

    // If section exists but itinerary isn't linked yet
    if (!itinerarySection.entity_id) {
        return (
            <div className="flex flex-col gap-4 py-4">
                <Typography
                    size="16"
                    weight="medium"
                    color="grey-1">
                    {isRimigoInternal ? 'Paste an itinerary link to attach it to this collection.' : 'This itinerary has not been linked yet.'}
                </Typography>

                {isRimigoInternal && (
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <input
                            value={itineraryLink}
                            onChange={(e) => setItineraryLink(e.target.value)}
                            placeholder="http://localhost:5173/itinerary/<itineraryId>"
                            className="flex-1 px-4 py-3 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:border-primary-default"
                        />
                        <button
                            type="button"
                            disabled={isSubmitting || !itineraryLink.trim()}
                            onClick={handleLink}
                            className="px-4 py-3 rounded-lg bg-primary-default text-white font-semibold font-red-hat-display hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Linking...' : 'Link itinerary'}
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="">
            <Itinerary
                itineraryIdOverride={itinerarySection.entity_id || undefined}
                embedded
                readOnly={readOnly}
                hideExactDates={hideExactDates}
                showCloneButton={showCloneButton}
                activeTrip={activeTrip}
                onCreateTripboardOverride={onCreateTripboardOverride}
                showCreateTripboardBtn={showCreateTripboardBtn}
                onRecreateModeChange={onRecreateModeChange}
                onRegisterRecreate={onRegisterRecreate}
                onRegisterShareItinerary={onRegisterShareItinerary}
                onMobileViewChange={onMobileViewChange}
                isActive={isActive}
            />
        </div>
    )
}

export default ItineraryTabContent
