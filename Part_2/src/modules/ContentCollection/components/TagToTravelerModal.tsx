import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { getTravelerByPhone, type TravelerByPhoneData } from '@/api/travelerAPI/travelerAPI'
import GenericChatModal from '@/modules/AtaAgent/components/Chat/components/Generics/GenericChatModal'
import { Button } from '@/components/shared/ButtonNew'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'
import Typography from '@/components/shared/Typography'

interface TagToTravelerModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    collectionName: string
    onSuccess?: () => void
}

const TagToTravelerModal: React.FC<TagToTravelerModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    collectionName,
    onSuccess
}) => {
    const [phone, setPhone] = useState('')
    const [traveler, setTraveler] = useState<TravelerByPhoneData | null>(null)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const queryClient = useQueryClient()

    const cloneMutation = useMutation({
        mutationFn: async (travelerId: string) => {
            return await contentCollectionApi.cloneToTravelerCollection(collectionIdentifier, travelerId)
        },
        onSuccess: () => {
            toast.success('Collection tagged to traveler successfully')
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
            onSuccess?.()
            handleClose()
        },
        onError: (error: unknown) => {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to tag collection to traveler. Please try again.'
            toast.error(errorMessage)
        }
    })

    const handleSearch = async () => {
        const trimmed = phone.trim()
        if (!trimmed) {
            toast.error('Please enter a phone number')
            return
        }
        setSearchError(null)
        setTraveler(null)
        setIsSearching(true)
        try {
            const result = await getTravelerByPhone(trimmed)
            if (result?.id) {
                setTraveler(result)
            } else {
                setSearchError('No traveler found for this phone number.')
            }
        } catch {
            setSearchError('Failed to search. Please try again.')
        } finally {
            setIsSearching(false)
        }
    }

    const handleTagToTraveler = () => {
        if (!traveler?.id) return
        cloneMutation.mutate(traveler.id)
    }

    const handleClose = () => {
        setPhone('')
        setTraveler(null)
        setSearchError(null)
        onClose()
    }

    return (
        <GenericChatModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Tag to Traveler"
            description={`Tag "${collectionName}" to a traveler by phone number`}
            width={500}>
            <div className="flex flex-col h-full min-h-0">
                {/* Phone input + Search - shrink-0 so row never collapses */}
                <div className="flex gap-2 mb-4 shrink-0">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="tel"
                            placeholder="Enter phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full min-h-[44px] px-4 py-2.5 border border-grey-4 rounded-lg bg-white text-grey-0 placeholder:text-grey-2 focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                    <button
                        type="button"
                        title="Search"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="w-10 h-10 shrink-0 rounded-lg bg-primary-default text-natural-white flex items-center justify-center disabled:opacity-70"
                    >
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Results area: loading | error | traveler */}
                <div className="flex-1 overflow-y-auto mb-4 min-h-[120px]">
                    {isSearching && (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-default" />
                            <Typography size="14" weight="medium" color="grey-2">
                                Searching for traveler...
                            </Typography>
                        </div>
                    )}

                    {!isSearching && searchError && (
                        <div className="p-4 rounded-lg bg-grey-5 border border-grey-4">
                            <Typography size="14" weight="medium" color="grey-1">
                                {searchError}
                            </Typography>
                        </div>
                    )}

                    {!isSearching && traveler && !searchError && (
                        <div className="p-4 rounded-lg border-2 border-primary-default bg-primary-50">
                            <Typography size="12" weight="semibold" color="grey-2" className="uppercase tracking-wide mb-2">
                                Traveler found
                            </Typography>
                            <br />
                            <Typography size="16" weight="semibold" color="grey-0">
                                {traveler.name}
                            </Typography>
                            <br />
                            <Typography size="14" weight="medium" color="grey-2" className="mt-1">
                                ID: {traveler.id}
                            </Typography>
                        </div>
                    )}

                    {!isSearching && !traveler && !searchError && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Typography size="14" weight="medium" color="grey-2">
                                Enter a phone number and click Search to find a traveler.
                            </Typography>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-4">
                    <Button
                        title="Cancel"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={cloneMutation.isPending}
                    />
                    <Button
                        title={cloneMutation.isPending ? 'Tagging...' : 'Tag to this traveler'}
                        onClick={handleTagToTraveler}
                        loading={cloneMutation.isPending}
                        disabled={!traveler?.id || cloneMutation.isPending}
                    />
                </div>
            </div>
        </GenericChatModal>
    )
}

export default TagToTravelerModal
