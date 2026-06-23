import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { Loading } from '@/components/shared/Loading'
import { toast } from 'sonner'
import { X, Search } from 'lucide-react'

interface Trip {
    id: string
    trip_sequence_id: string
    name: string
    description: string | null
    start_date: string | null
    end_date: string | null
    status: string
    created_at: string
    updated_at: string
    [key: string]: unknown
}

interface AddToTripModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    collectionName: string
    onSuccess?: () => void
}

const AddToTripModal: React.FC<AddToTripModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    collectionName,
    onSuccess
}) => {
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

    // Debounce search query
    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current)
        }
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300) // 300ms debounce

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current)
            }
        }
    }, [searchQuery])

    // Reset selected trip and scroll position when search changes
    useEffect(() => {
        setSelectedTripId(null)
        // Reset scroll position when search changes
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0
        }
    }, [debouncedSearchQuery])


    // Fetch trips with infinite query
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ['trips-list', debouncedSearchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            return await contentCollectionApi.getTrips(pageParam, 30, 'planning', debouncedSearchQuery)
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.next) {
                try {
                    // Handle both absolute and relative URLs
                    const url = lastPage.next.startsWith('http')
                        ? new URL(lastPage.next)
                        : new URL(lastPage.next, window.location.origin)
                    const page = url.searchParams.get('page')
                    return page ? parseInt(page, 10) : undefined
                } catch {
                    // If URL parsing fails, try to extract page from query string
                    const match = lastPage.next.match(/[?&]page=(\d+)/)
                    return match ? parseInt(match[1], 10) : undefined
                }
            }
            return undefined
        },
        enabled: isOpen,
        initialPageParam: 1
    })

    const trips: Trip[] = data?.pages.flatMap((page) => page.results) || []

    // Intersection Observer for infinite scroll - works during search and normal scroll
    useEffect(() => {
        if (!isOpen || !hasNextPage || isFetchingNextPage) return

        const sentinel = sentinelRef.current
        const scrollContainer = scrollContainerRef.current
        if (!sentinel || !scrollContainer) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            {
                root: scrollContainer,
                rootMargin: '200px',
                threshold: 0.1
            }
        )

        observer.observe(sentinel)

        // Check if sentinel is already visible (e.g., after search results load with few items)
        // This ensures pagination works even if the sentinel is immediately visible
        const checkSentinelVisibility = () => {
            if (!hasNextPage || isFetchingNextPage) return

            const rect = sentinel.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()

            // Check if sentinel is within or near the viewport (within 200px margin)
            const isNearViewport =
                rect.top < containerRect.bottom + 200 &&
                rect.bottom > containerRect.top - 200

            if (isNearViewport) {
                fetchNextPage()
            }
        }

        // Check immediately and after a small delay to catch cases where sentinel is already visible
        // This is especially important after search when results might be short
        checkSentinelVisibility()
        const timeoutId = setTimeout(checkSentinelVisibility, 100)

        return () => {
            clearTimeout(timeoutId)
            observer.disconnect()
        }
    }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage, debouncedSearchQuery, trips.length])

    // Manual scroll handler as fallback for pagination
    useEffect(() => {
        if (!isOpen || !hasNextPage || isFetchingNextPage) return

        const scrollContainer = scrollContainerRef.current
        if (!scrollContainer) return

        const handleScroll = () => {
            if (!hasNextPage || isFetchingNextPage) return

            const { scrollTop, scrollHeight, clientHeight } = scrollContainer
            // Trigger fetch when user is within 200px of the bottom
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight

            if (distanceFromBottom < 200) {
                fetchNextPage()
            }
        }

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll)
        }
    }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage])

    const handleTripSelect = (tripId: string) => {
        setSelectedTripId(tripId === selectedTripId ? null : tripId)
    }

    const handleAdd = async () => {
        if (!selectedTripId) return

        setIsAdding(true)
        try {
            await contentCollectionApi.addCollectionToTrip(collectionIdentifier, selectedTripId)
            const selectedTrip = trips.find((t) => t.id === selectedTripId)
            toast.success(`Added "${collectionName}" to "${selectedTrip?.name || 'trip'}"`)
            onSuccess?.()
            onClose()
            setSelectedTripId(null)
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Failed to add collection to trip:', error)
            }
            toast.error('Failed to add collection to trip. Please try again.')
        } finally {
            setIsAdding(false)
        }
    }

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return ''
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        } catch {
            return ''
        }
    }

    if (!isOpen) {
        return null
    }

    return createPortal(
        <div className="fixed inset-0 z-[100]">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />

            {/* Centered modal */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="flex max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl overflow-hidden w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b">
                        <h2 className="text-xl font-semibold">Add to Trip</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-grey_5 flex items-center justify-center transition-colors"
                            aria-label="Close">
                            <X className="w-5 h-5 text-grey-2" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="px-6 pt-4 pb-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-2" />
                            <input
                                type="text"
                                placeholder="Search trips..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-grey-4 rounded-lg focus:outline-none focus:border-primary-default text-sm"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6">
                        {isLoading ? (
                            <div className="py-8">
                                <Loading />
                            </div>
                        ) : isError ? (
                            <div className="text-center py-8 text-destructive">
                                <p>Failed to load trips.</p>
                                <p className="text-sm mt-2">Please try again later.</p>
                            </div>
                        ) : trips.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No trips found.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mt-4">
                                    {trips.map((trip) => {
                                        const isSelected = selectedTripId === trip.id
                                        const startDate = formatDate(trip.start_date)
                                        const endDate = formatDate(trip.end_date)
                                        const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || 'No dates set'

                                        return (
                                            <div
                                                key={trip.id}
                                                onClick={() => handleTripSelect(trip.id)}
                                                className={`w-full flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-primary-default/10 border-primary-default'
                                                    : 'hover:bg-accent hover:border-grey-4'
                                                    }`}>
                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-base leading-tight">{trip.name}</div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {trip.trip_sequence_id}
                                                    </div>
                                                    {dateRange && (
                                                        <div className="text-xs text-muted-foreground mt-1">{dateRange}</div>
                                                    )}
                                                    {trip.status && (
                                                        <div className="text-xs text-muted-foreground mt-1 capitalize">
                                                            Status: {trip.status.replace(/_/g, ' ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Selection indicator */}
                                                {isSelected && (
                                                    <div className="shrink-0 w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Sentinel for infinite scroll - always render when hasNextPage to ensure pagination works */}
                                {hasNextPage && (
                                    <div
                                        ref={sentinelRef}
                                        className="h-10 w-full flex items-center justify-center py-4"
                                        aria-label="Load more trips">
                                        {isFetchingNextPage && <Loading />}
                                    </div>
                                )}

                                {/* End of list indicator */}
                                {!hasNextPage && trips.length > 0 && (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        No more trips
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer with Add button */}
                    <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isAdding}
                            className="px-4 py-2 text-sm font-medium text-grey-0 hover:bg-grey-5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!selectedTripId || isAdding}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedTripId && !isAdding
                                ? 'bg-primary-default text-white hover:bg-primary-default/90'
                                : 'bg-grey-4 text-grey-2 cursor-not-allowed'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {isAdding ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default AddToTripModal

