import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import GenericChatModal from '@/modules/AtaAgent/components/Chat/components/Generics/GenericChatModal'
import { Button } from '@/components/shared/ButtonNew'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'
import Typography from '@/components/shared/Typography'

interface TripSource {
    id: string
    name: string
    is_account_created: boolean
    entity_name?: string
    media?: {
        thumbnail_url?: string
        instagram_profile_url?: string
        youtube_profile_url?: string
    }
}

interface TagToCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    collectionName: string
    onSuccess?: () => void
}

const TagToCreatorModal: React.FC<TagToCreatorModalProps> = ({ isOpen, onClose, collectionIdentifier, collectionName, onSuccess }) => {
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const queryClient = useQueryClient()

    // Fetch trip sources
    const {
        data: sourcesResponse,
        isLoading: isSourcesLoading,
        isError: isSourcesError
    } = useQuery({
        queryKey: ['trip-sources'],
        queryFn: async () => {
            try {
                const response = await contentCollectionApi.getTripSources()
                // response should be { data: [...] }
                const sources = response?.data || []
                return Array.isArray(sources) ? sources : []
            } catch (error) {
                toast.error((error as Error).message || 'Failed to load creators. Please try again.')
                return []
            }
        },
        enabled: isOpen,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })

    const sources: TripSource[] = Array.isArray(sourcesResponse) ? sourcesResponse : []

    // Filter sources based on search query
    const filteredSources = useMemo(() => {
        if (!searchQuery.trim()) return sources
        const query = searchQuery.toLowerCase()
        return sources.filter((source) => source.name.toLowerCase().includes(query) || source.entity_name?.toLowerCase().includes(query))
    }, [sources, searchQuery])

    // Mutation for adding collection to source
    const addToSourceMutation = useMutation({
        mutationFn: async ({ sourceId, entityName }: { sourceId: string; entityName: string }) => {
            return await contentCollectionApi.addToSource(collectionIdentifier, sourceId, entityName, 'creator')
        },
        onSuccess: () => {
            toast.success('Collection tagged to creator successfully')
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
            onSuccess?.()
            onClose()
            setSelectedSourceId(null)
        },
        onError: (error: unknown) => {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to tag collection to creator. Please try again.'
            toast.error(errorMessage)
        }
    })

    const handleSourceSelect = (source: TripSource) => {
        setSelectedSourceId(source.id)
    }

    const handleConfirm = () => {
        if (!selectedSourceId) {
            toast.error('Please select a creator')
            return
        }

        const selectedSource = sources.find((s) => s.id === selectedSourceId)
        if (!selectedSource) {
            toast.error('Selected creator not found')
            return
        }

        const entityName = selectedSource.entity_name || selectedSource.name
        addToSourceMutation.mutate({ sourceId: selectedSourceId, entityName })
    }

    const handleClose = () => {
        setSelectedSourceId(null)
        setSearchQuery('')
        onClose()
    }

    return (
        <GenericChatModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Tag to Creator"
            description={`Select a creator to tag "${collectionName}"`}
            width={600}>
            <div className="flex flex-col h-full min-h-0">
                {/* Search Bar */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-2" />
                        <input
                            type="text"
                            placeholder="Search creators..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-grey-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Sources List */}
                <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                    {isSourcesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-default" />
                        </div>
                    ) : isSourcesError ? (
                        <div className="text-center py-12">
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1">
                                Failed to load creators. Please try again.
                            </Typography>
                        </div>
                    ) : filteredSources.length === 0 ? (
                        <div className="text-center py-12">
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1">
                                {searchQuery ? 'No creators found matching your search.' : 'No creators available.'}
                            </Typography>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filteredSources.map((source) => {
                                const isSelected = selectedSourceId === source.id
                                return (
                                    <button
                                        key={source.id}
                                        type="button"
                                        onClick={() => handleSourceSelect(source)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                                            isSelected ? 'border-primary-default bg-primary-50' : 'border-grey-4 hover:border-grey-3 hover:bg-grey-5'
                                        }`}>
                                        {/* Thumbnail */}
                                        {source.media?.thumbnail_url ? (
                                            <img
                                                src={source.media.thumbnail_url}
                                                alt={source.entity_name || source.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-grey-4 flex items-center justify-center">
                                                <Typography
                                                    size="14"
                                                    weight="semibold"
                                                    color="grey-2">
                                                    {(source.entity_name || source.name).charAt(0).toUpperCase()}
                                                </Typography>
                                            </div>
                                        )}

                                        {/* Source Info */}
                                        <div className="flex-1 min-w-0">
                                            <Typography
                                                size="16"
                                                weight="semibold"
                                                color="grey-0"
                                                className="truncate">
                                                {source.entity_name || source.name}
                                            </Typography>
                                            {source.entity_name && source.entity_name !== source.name && (
                                                <Typography
                                                    size="14"
                                                    weight="medium"
                                                    color="grey-2"
                                                    className="truncate">
                                                    @{source.name}
                                                </Typography>
                                            )}
                                            {source.is_account_created && (
                                                <Typography
                                                    size="12"
                                                    weight="medium"
                                                    color="grey-2">
                                                    Account Created
                                                </Typography>
                                            )}
                                        </div>

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-4">
                    <Button
                        title="Cancel"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={addToSourceMutation.isPending}
                    />
                    <Button
                        title={addToSourceMutation.isPending ? 'Tagging...' : 'Tag to Creator'}
                        onClick={handleConfirm}
                        loading={addToSourceMutation.isPending}
                        disabled={!selectedSourceId || addToSourceMutation.isPending}
                    />
                </div>
            </div>
        </GenericChatModal>
    )
}

export default TagToCreatorModal
