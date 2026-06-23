import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Search, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Typography from '@/components/shared/Typography'
import CustomDatePicker from '@/modules/Itinerary/components/CustomDatePicker'
import { Button } from '@/components/ui/button'
import { formatDateToYMD } from '@/utils/dateUtils'
import { getCurationExperiences, type CurationExperienceItem } from '../api/curationApi'

/** API that may expose addExperienceToCollection (e.g. contentCollectionApi or travelerCollectionApi) */
export type AddExperienceApi = {
    addExperienceToCollection?: (
        collectionIdentifier: string,
        experienceId: string,
        experienceName: string,
        experienceDescription?: string,
        sectionsOrder?: number,
        metadata?: Record<string, unknown>
    ) => Promise<unknown>
}

interface SearchAndAddExperienceModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    baseCityId: string
    nextSectionsOrder: number
    addExperienceApi: AddExperienceApi
    onSuccess?: () => void
    /** When 'tripboard', uses tripboard-specific labels; defaults to 'collection' */
    variant?: 'collection' | 'tripboard'
}

function getExperienceMetadataFromDetails(
    experience: CurationExperienceItem,
    startDate?: string | null,
    endDate?: string | null
) {
    const verifiedPhotos = experience.content?.verified_photos || []
    const landscapeImage = experience.display_props?.landscape_image
    const cityId = experience.base_city?.id
    const cityName = experience.base_city?.name
    const location = experience.location
    const latitude = location?.latitude
    const longitude = location?.longitude

    if (verifiedPhotos.length === 0 && !landscapeImage && !cityId && !cityName && latitude == null && longitude == null && !startDate && !endDate) {
        return undefined
    }

    const metadata: {
        content?: { verified_photos?: Array<{ id: string; url: string }> }
        display_props?: { landscape_image?: string }
        city_id?: string
        city_name?: string
        location?: { latitude?: number; longitude?: number; address?: string }
        start_date?: string
        end_date?: string
    } = {}

    if (verifiedPhotos.length > 0) {
        metadata.content = { verified_photos: verifiedPhotos.map((p) => ({ id: p.id, url: p.url })) }
    }
    if (landscapeImage) metadata.display_props = { landscape_image: landscapeImage }
    if (cityId) metadata.city_id = cityId
    if (cityName) metadata.city_name = cityName
    if (latitude != null && longitude != null) {
        metadata.location = { latitude, longitude, address: location?.address }
    }
    if (startDate) metadata.start_date = startDate
    if (endDate) metadata.end_date = endDate
    return metadata
}

const SearchAndAddExperienceModal: React.FC<SearchAndAddExperienceModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    baseCityId,
    nextSectionsOrder,
    addExperienceApi,
    onSuccess,
    variant = 'collection'
}) => {
    const isTripboard = variant === 'tripboard'
    const modalTitle = isTripboard ? 'Add activity to tripboard' : 'Add experience to collection'
    const addButtonLabel = isTripboard ? 'Add to tripboard' : 'Add to collection'
    const [searchQuery, setSearchQuery] = useState('')
    const [queryToSearch, setQueryToSearch] = useState<string | null>(null)
    const [addingId, setAddingId] = useState<string | null>(null)
    const [pendingItem, setPendingItem] = useState<CurationExperienceItem | null>(null)
    const [selectedStartDate, setSelectedStartDate] = useState<Date>(new Date())
    const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date())

    const { data: results = [], isLoading: isSearching, isFetched: hasSearched } = useQuery({
        queryKey: ['curation-experiences', baseCityId, queryToSearch],
        queryFn: () => getCurationExperiences(queryToSearch ?? undefined),
        enabled: isOpen && !!baseCityId && queryToSearch !== null,
        staleTime: 60 * 1000
    })

    const handleSearch = () => {
        setQueryToSearch(searchQuery.trim())
    }

    const handleSelectItem = (item: CurationExperienceItem) => {
        setPendingItem(item)
        setSelectedStartDate(new Date())
        setSelectedEndDate(new Date())
    }

    const handleBackToSearch = () => {
        setPendingItem(null)
        setSelectedStartDate(new Date())
        setSelectedEndDate(new Date())
    }

    const handleConfirmAdd = async () => {
        const addFn = addExperienceApi?.addExperienceToCollection
        if (!pendingItem || !collectionIdentifier || !addFn) return
        setAddingId(pendingItem.id)
        try {
            const description = pendingItem.short_description ?? pendingItem.display_props?.description
            const metadata = getExperienceMetadataFromDetails(
                pendingItem,
                formatDateToYMD(selectedStartDate),
                formatDateToYMD(selectedEndDate)
            )
            await addFn(
                collectionIdentifier,
                pendingItem.id,
                pendingItem.name,
                description,
                nextSectionsOrder,
                metadata
            )
            toast.success(`Added "${pendingItem.name}" to ${isTripboard ? 'tripboard' : 'collection'}`)
            setPendingItem(null)
            setSelectedStartDate(new Date())
            setSelectedEndDate(new Date())
            onSuccess?.()
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error(`Failed to add experience to ${isTripboard ? 'tripboard' : 'collection'}:`, err)
            }
            toast.error(`Failed to add experience. Please try again.`)
        } finally {
            setAddingId(null)
        }
    }

    if (!isOpen) return null

    const modalContent = (
        <div className={`fixed inset-0 z-500 flex ${pendingItem ? 'items-start pt-12' : 'items-center'} justify-center p-4`}>
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div
                className={`relative bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh] ${pendingItem ? 'overflow-visible' : 'overflow-hidden'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4">
                    <div className="flex items-center gap-2">
                        {pendingItem && (
                            <button
                                type="button"
                                onClick={handleBackToSearch}
                                className="p-1.5 hover:bg-grey-5 rounded-full transition-colors"
                                aria-label="Back to search"
                            >
                                <ArrowLeft className="w-4 h-4 text-grey-2" />
                            </button>
                        )}
                        <Typography size="18" weight="semibold" color="grey-0">
                            {pendingItem ? 'Select dates' : modalTitle}
                        </Typography>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-grey-5 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-grey-2" />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0 px-6 py-4">
                    {pendingItem ? (
                        /* Date selection step */
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-grey-4 bg-grey-5/30">
                                {(pendingItem.display_props?.landscape_image || pendingItem.content?.verified_photos?.[0]?.url) && (
                                    <img
                                        src={pendingItem.display_props?.landscape_image ?? pendingItem.content?.verified_photos?.[0]?.url}
                                        alt=""
                                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-grey-5"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <Typography size="16" weight="medium" color="grey-0" className="truncate">
                                        {pendingItem.name}
                                    </Typography>
                                    {pendingItem.base_city?.name && (
                                        <Typography size="13" weight="normal" color="grey-2">
                                            {pendingItem.base_city.name}
                                        </Typography>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Typography size="14" weight="semibold" color="grey-1">
                                    When are you planning this activity?
                                </Typography>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Typography size="12" weight="medium" color="grey-2" className="mb-1">Start date</Typography>
                                        <CustomDatePicker value={selectedStartDate} onChange={setSelectedStartDate} />
                                    </div>
                                    <div className="flex-1">
                                        <Typography size="12" weight="medium" color="grey-2" className="mb-1">End date</Typography>
                                        <CustomDatePicker value={selectedEndDate} onChange={setSelectedEndDate} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleBackToSearch}
                                    disabled={!!addingId}
                                    className="flex-1 text-md font-semibold"
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={handleConfirmAdd}
                                    disabled={!!addingId}
                                    className="flex-1 text-white text-md font-semibold"
                                >
                                    {addingId ? 'Adding...' : addButtonLabel}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Search step */
                        <>
                            <div className="flex gap-2 shrink-0 mb-4">
                                <input
                                    type="text"
                                    placeholder="Search experiences..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1 min-h-[44px] px-4 py-2.5 border border-grey-4 rounded-lg bg-white text-grey-0 placeholder:text-grey-2 focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-grey-4"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={isSearching || !baseCityId}
                                    className="shrink-0 px-4 py-2 rounded-lg bg-primary-default text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Search
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                {!hasSearched ? (
                                    <div className="py-8 text-center">
                                        <Typography size="14" weight="medium" color="grey-2">
                                            Enter a search term and click Search to find experiences.
                                        </Typography>
                                    </div>
                                ) : isSearching ? (
                                    <div className="py-8 flex justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary-default" />
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Typography size="14" weight="medium" color="grey-1">
                                            No experiences found. Try a different search.
                                        </Typography>
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {results.map((item) => {
                                            const imageUrl =
                                                item.display_props?.landscape_image ??
                                                item.display_props?.portrait_image ??
                                                item.content?.verified_photos?.[0]?.url
                                            return (
                                                <li
                                                    key={item.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg border border-grey-4 hover:bg-grey-5"
                                                >
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt=""
                                                            className="w-14 h-14 rounded-lg object-cover shrink-0 bg-grey-5"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-lg bg-grey-5 shrink-0 flex items-center justify-center">
                                                            <Typography size="12" weight="medium" color="grey-2">
                                                                No image
                                                            </Typography>
                                                        </div>
                                                    )}
                                                    <Typography size="16" weight="medium" color="grey-0" className="truncate flex-1 min-w-0">
                                                        {item.name}
                                                    </Typography>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectItem(item)}
                                                        disabled={!!addingId}
                                                        className="shrink-0 px-3 py-1.5 text-sm font-medium text-primary-default hover:bg-primary-default/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    >
                                                        {addButtonLabel}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default SearchAndAddExperienceModal
