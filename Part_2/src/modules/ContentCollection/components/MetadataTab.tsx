import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, X, Trash2 } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { Loading } from '@/components/shared/Loading'

interface MetadataTabProps {
    collectionIdentifier: string
    metadataId: string | null
}

type TripRouteItem = {
    id: string
    name: string
    nights: number
}

type SeasonalInfoItem = {
    label: string
    description: string
}

type TripHighlightItem = {
    label: string
    description: string
}

type RimigoVideoItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

type PortraitImageItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

type LandscapeImageItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

type ReelItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

type YoutubeShortItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

type YoutubeVideoItem = {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

const MetadataTab: React.FC<MetadataTabProps> = ({ collectionIdentifier, metadataId }) => {
    const queryClient = useQueryClient()
    const [isSaving, setIsSaving] = useState(false)

    // Fetch metadata if metadataId exists
    const {
        data: metadataResponse,
        isLoading: isMetadataLoading
    } = useQuery({
        queryKey: ['content-collection-metadata', metadataId],
        queryFn: async () => {
            if (!metadataId) {
                throw new Error('Metadata ID is required')
            }
            return await contentCollectionApi.getContentCollectionMetadata(metadataId)
        },
        enabled: !!metadataId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Extract metadata sections
    const metadata = metadataResponse?.data?.metadata || {}
    const tripRoute = (metadata.trip_route || []) as TripRouteItem[]
    const seasonalInfo = (metadata.seasonal_info || []) as SeasonalInfoItem[]
    const tripHighlights = (metadata.trip_highlights || []) as TripHighlightItem[]
    const rimigoVideos = (metadataResponse?.data?.rimigo_videos || []) as RimigoVideoItem[]
    const portraitImages = (metadataResponse?.data?.portrait_images || []) as PortraitImageItem[]
    const landscapeImages = (metadataResponse?.data?.landscape_images || []) as LandscapeImageItem[]
    const reels = (metadataResponse?.data?.reels || []) as ReelItem[]
    const youtubeShorts = (metadataResponse?.data?.youtube_shorts || []) as YoutubeShortItem[]
    const youtubeVideos = (metadataResponse?.data?.youtube_videos || []) as YoutubeVideoItem[]

    // Local state for editing
    const [localTripRoute, setLocalTripRoute] = useState<TripRouteItem[]>(tripRoute)
    const [localSeasonalInfo, setLocalSeasonalInfo] = useState<SeasonalInfoItem[]>(seasonalInfo)
    const [localTripHighlights, setLocalTripHighlights] = useState<TripHighlightItem[]>(tripHighlights)
    const [localRimigoVideos, setLocalRimigoVideos] = useState<RimigoVideoItem[]>(rimigoVideos)
    const [localPortraitImages, setLocalPortraitImages] = useState<PortraitImageItem[]>(portraitImages)
    const [localLandscapeImages, setLocalLandscapeImages] = useState<LandscapeImageItem[]>(landscapeImages)
    const [localReels, setLocalReels] = useState<ReelItem[]>(reels)
    const [localYoutubeShorts, setLocalYoutubeShorts] = useState<YoutubeShortItem[]>(youtubeShorts)
    const [localYoutubeVideos, setLocalYoutubeVideos] = useState<YoutubeVideoItem[]>(youtubeVideos)

    // Update local state when metadata loads
    useEffect(() => {
        if (metadataResponse?.data) {
            const meta = metadataResponse.data.metadata || {}
            setLocalTripRoute((meta.trip_route || []) as TripRouteItem[])
            setLocalSeasonalInfo((meta.seasonal_info || []) as SeasonalInfoItem[])
            setLocalTripHighlights((meta.trip_highlights || []) as TripHighlightItem[])
            setLocalRimigoVideos((metadataResponse.data.rimigo_videos || []) as RimigoVideoItem[])
            setLocalPortraitImages(metadataResponse.data.portrait_images || [])
            setLocalLandscapeImages(metadataResponse.data.landscape_images || [])
            setLocalReels(metadataResponse.data.reels || [])
            setLocalYoutubeShorts(metadataResponse.data.youtube_shorts || [])
            setLocalYoutubeVideos(metadataResponse.data.youtube_videos || [])
        }
    }, [metadataResponse])

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (payload: Parameters<typeof contentCollectionApi.createContentCollectionMetadata>[1]) => {
            return await contentCollectionApi.createContentCollectionMetadata(collectionIdentifier, payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
            queryClient.invalidateQueries({ queryKey: ['content-collection-metadata'] })
            setIsSaving(false)
            toast.success('Metadata created successfully!')
        },
        onError: (error: unknown) => {
            setIsSaving(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to create metadata. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (payload: Parameters<typeof contentCollectionApi.updateContentCollectionMetadata>[1]) => {
            if (!metadataId) {
                throw new Error('Metadata ID is required for update')
            }
            return await contentCollectionApi.updateContentCollectionMetadata(metadataId, payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
            queryClient.invalidateQueries({ queryKey: ['content-collection-metadata', metadataId] })
            setIsSaving(false)
            toast.success('Metadata updated successfully!')
        },
        onError: (error: unknown) => {
            setIsSaving(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update metadata. Please try again.'
            toast.error(errorMessage)
        }
    })

    const handleSave = () => {
        setIsSaving(true)

        // Helper function to remove empty metadata objects from arrays
        const cleanArray = <T extends { metadata?: Record<string, unknown> }>(arr: T[]): T[] => {
            return arr.map(item => {
                const cleaned = { ...item }
                // Remove metadata if it's empty, null, undefined, or doesn't exist
                if (!cleaned.metadata || typeof cleaned.metadata !== 'object' || Object.keys(cleaned.metadata).length === 0) {
                    delete cleaned.metadata
                }
                return cleaned
            })
        }

        const payload: {
            metadata?: {
                trip_route?: TripRouteItem[]
                seasonal_info?: SeasonalInfoItem[]
                trip_highlights?: TripHighlightItem[]
                [key: string]: unknown
            }
            portrait_images?: PortraitImageItem[]
            landscape_images?: LandscapeImageItem[]
            reels?: ReelItem[]
            rimigo_videos?: RimigoVideoItem[]
            youtube_shorts?: YoutubeShortItem[]
            youtube_videos?: YoutubeVideoItem[]
        } = {
            metadata: {}
        }

        // Add metadata fields only if they have values
        if (localTripRoute.length > 0) {
            payload.metadata!.trip_route = localTripRoute
        }
        if (localSeasonalInfo.length > 0) {
            payload.metadata!.seasonal_info = localSeasonalInfo
        }
        if (localTripHighlights.length > 0) {
            payload.metadata!.trip_highlights = localTripHighlights
        }

        // Remove metadata if it's empty
        if (Object.keys(payload.metadata!).length === 0) {
            delete payload.metadata
        }

        // Always include media arrays — send [] to clear them on the backend
        payload.portrait_images = localPortraitImages.length > 0 ? cleanArray(localPortraitImages) : []
        payload.landscape_images = localLandscapeImages.length > 0 ? cleanArray(localLandscapeImages) : []
        payload.reels = localReels.length > 0 ? cleanArray(localReels) : []
        payload.rimigo_videos = localRimigoVideos.length > 0 ? cleanArray(localRimigoVideos) : []
        payload.youtube_shorts = localYoutubeShorts.length > 0 ? cleanArray(localYoutubeShorts) : []
        payload.youtube_videos = localYoutubeVideos.length > 0 ? cleanArray(localYoutubeVideos) : []

        if (metadataId) {
            updateMutation.mutate(payload)
        } else {
            createMutation.mutate(payload)
        }
    }

    const addTripRouteItem = () => {
        setLocalTripRoute([...localTripRoute, { id: Date.now().toString(), name: '', nights: 0 }])
    }

    const removeTripRouteItem = (index: number) => {
        setLocalTripRoute(localTripRoute.filter((_, i) => i !== index))
    }

    const updateTripRouteItem = (index: number, field: 'name' | 'nights', value: string | number) => {
        const updated = [...localTripRoute]
        updated[index] = { ...updated[index], [field]: value }
        setLocalTripRoute(updated)
    }

    const addSeasonalInfoItem = () => {
        setLocalSeasonalInfo([...localSeasonalInfo, { label: '', description: '' }])
    }

    const removeSeasonalInfoItem = (index: number) => {
        setLocalSeasonalInfo(localSeasonalInfo.filter((_, i) => i !== index))
    }

    const updateSeasonalInfoItem = (index: number, field: 'label' | 'description', value: string) => {
        const updated = [...localSeasonalInfo]
        updated[index] = { ...updated[index], [field]: value }
        setLocalSeasonalInfo(updated)
    }

    const addTripHighlightItem = () => {
        setLocalTripHighlights([...localTripHighlights, { label: '', description: '' }])
    }

    const removeTripHighlightItem = (index: number) => {
        setLocalTripHighlights(localTripHighlights.filter((_, i) => i !== index))
    }

    const updateTripHighlightItem = (index: number, field: 'label' | 'description', value: string) => {
        const updated = [...localTripHighlights]
        updated[index] = { ...updated[index], [field]: value }
        setLocalTripHighlights(updated)
    }

    const addRimigoVideoItem = () => {
        setLocalRimigoVideos([...localRimigoVideos, { id: Date.now().toString(), url: '' }])
    }

    const removeRimigoVideoItem = (index: number) => {
        setLocalRimigoVideos(localRimigoVideos.filter((_, i) => i !== index))
    }

    const updateRimigoVideoItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localRimigoVideos]
        updated[index] = { ...updated[index], [field]: value }
        setLocalRimigoVideos(updated)
    }

    const addPortraitImageItem = () => {
        setLocalPortraitImages([...localPortraitImages, { id: Date.now().toString(), url: '' }])
    }

    const removePortraitImageItem = (index: number) => {
        setLocalPortraitImages(localPortraitImages.filter((_, i) => i !== index))
    }

    const updatePortraitImageItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localPortraitImages]
        updated[index] = { ...updated[index], [field]: value }
        setLocalPortraitImages(updated)
    }

    const addLandscapeImageItem = () => {
        setLocalLandscapeImages([...localLandscapeImages, { id: Date.now().toString(), url: '' }])
    }

    const removeLandscapeImageItem = (index: number) => {
        setLocalLandscapeImages(localLandscapeImages.filter((_, i) => i !== index))
    }

    const updateLandscapeImageItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localLandscapeImages]
        updated[index] = { ...updated[index], [field]: value }
        setLocalLandscapeImages(updated)
    }

    const addReelItem = () => {
        setLocalReels([...localReels, { id: Date.now().toString(), url: '' }])
    }

    const removeReelItem = (index: number) => {
        setLocalReels(localReels.filter((_, i) => i !== index))
    }

    const updateReelItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localReels]
        updated[index] = { ...updated[index], [field]: value }
        setLocalReels(updated)
    }

    const addYoutubeShortItem = () => {
        setLocalYoutubeShorts([...localYoutubeShorts, { id: Date.now().toString(), url: '' }])
    }

    const removeYoutubeShortItem = (index: number) => {
        setLocalYoutubeShorts(localYoutubeShorts.filter((_, i) => i !== index))
    }

    const updateYoutubeShortItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localYoutubeShorts]
        updated[index] = { ...updated[index], [field]: value }
        setLocalYoutubeShorts(updated)
    }

    const addYoutubeVideoItem = () => {
        setLocalYoutubeVideos([...localYoutubeVideos, { id: Date.now().toString(), url: '' }])
    }

    const removeYoutubeVideoItem = (index: number) => {
        setLocalYoutubeVideos(localYoutubeVideos.filter((_, i) => i !== index))
    }

    const updateYoutubeVideoItem = (index: number, field: 'id' | 'url', value: string) => {
        const updated = [...localYoutubeVideos]
        updated[index] = { ...updated[index], [field]: value }
        setLocalYoutubeVideos(updated)
    }

    if (isMetadataLoading && metadataId) {
        return (
            <div className="text-center py-12">
                <Loading />
            </div>
        )
    }

    return (
        <div className="max-w-4xl space-y-10">
            {/* Trip Route Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Trip Route
                    </Typography>
                    <button
                        type="button"
                        onClick={addTripRouteItem}
                        className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Route
                    </button>
                </div>
                <div className="space-y-3">
                    {localTripRoute.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateTripRouteItem(index, 'name', e.target.value)}
                                    placeholder="City name"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="number"
                                    value={item.nights}
                                    onChange={(e) => updateTripRouteItem(index, 'nights', parseInt(e.target.value) || 0)}
                                    placeholder="Nights"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeTripRouteItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Seasonal Info Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Seasonal Info
                    </Typography>
                    <button
                        type="button"
                        onClick={addSeasonalInfoItem}
                        className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Info
                    </button>
                </div>
                <div className="space-y-3">
                    {localSeasonalInfo.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateSeasonalInfoItem(index, 'label', e.target.value)}
                                    placeholder="Label"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateSeasonalInfoItem(index, 'description', e.target.value)}
                                    placeholder="Description"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeSeasonalInfoItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trip Highlights Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Trip Highlights
                    </Typography>
                    <button
                        type="button"
                        onClick={addTripHighlightItem}
                        className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Highlight
                    </button>
                </div>
                <div className="space-y-3">
                    {localTripHighlights.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateTripHighlightItem(index, 'label', e.target.value)}
                                    placeholder="Label"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateTripHighlightItem(index, 'description', e.target.value)}
                                    placeholder="Description"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeTripHighlightItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rimigo Videos Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Rimigo Videos
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localRimigoVideos.length > 0 && (
                            <button type="button" onClick={() => setLocalRimigoVideos([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addRimigoVideoItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Video
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localRimigoVideos.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updateRimigoVideoItem(index, 'id', e.target.value)}
                                    placeholder="Video ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updateRimigoVideoItem(index, 'url', e.target.value)}
                                    placeholder="Video URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeRimigoVideoItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Portrait Images Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Portrait Images
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localPortraitImages.length > 0 && (
                            <button type="button" onClick={() => setLocalPortraitImages([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addPortraitImageItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Image
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localPortraitImages.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updatePortraitImageItem(index, 'id', e.target.value)}
                                    placeholder="Image ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updatePortraitImageItem(index, 'url', e.target.value)}
                                    placeholder="Image URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removePortraitImageItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Landscape Images Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Landscape Images
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localLandscapeImages.length > 0 && (
                            <button type="button" onClick={() => setLocalLandscapeImages([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addLandscapeImageItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Image
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localLandscapeImages.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updateLandscapeImageItem(index, 'id', e.target.value)}
                                    placeholder="Image ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updateLandscapeImageItem(index, 'url', e.target.value)}
                                    placeholder="Image URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeLandscapeImageItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reels Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        Reels
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localReels.length > 0 && (
                            <button type="button" onClick={() => setLocalReels([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addReelItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Reel
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localReels.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updateReelItem(index, 'id', e.target.value)}
                                    placeholder="Reel ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updateReelItem(index, 'url', e.target.value)}
                                    placeholder="Reel URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeReelItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* YouTube Shorts Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        YouTube Shorts
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localYoutubeShorts.length > 0 && (
                            <button type="button" onClick={() => setLocalYoutubeShorts([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addYoutubeShortItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Short
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localYoutubeShorts.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updateYoutubeShortItem(index, 'id', e.target.value)}
                                    placeholder="Short ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updateYoutubeShortItem(index, 'url', e.target.value)}
                                    placeholder="YouTube Short URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeYoutubeShortItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* YouTube Videos Section */}
            <div className="space-y-4 pt-6 border-t border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                        YouTube Videos
                    </Typography>
                    <div className="flex items-center gap-2">
                        {localYoutubeVideos.length > 0 && (
                            <button type="button" onClick={() => setLocalYoutubeVideos([])}
                                className="px-3 py-2 border border-red-300 text-red-500 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1 text-sm">
                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}
                        <button type="button" onClick={addYoutubeVideoItem}
                            className="px-4 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Video
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {localYoutubeVideos.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 border border-grey-4 rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.id}
                                    onChange={(e) => updateYoutubeVideoItem(index, 'id', e.target.value)}
                                    placeholder="Video ID"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                                <input
                                    type="text"
                                    value={item.url}
                                    onChange={(e) => updateYoutubeVideoItem(index, 'url', e.target.value)}
                                    placeholder="YouTube Video URL"
                                    className="border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeYoutubeVideoItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-grey-4">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || createMutation.isPending || updateMutation.isPending}
                    className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                    {(isSaving || createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                    )}
                    {isSaving || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Metadata'}
                </button>
            </div>
        </div>
    )
}

export default MetadataTab
