import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery, useIsFetching, useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Minus, Search, X, Trash2 } from 'lucide-react'
import { adaptContentCollectionToViewModel } from '../../adapter/contentCollectionAdapter'
import type { ApiResponse, ContentCollection, Section } from '../../types/contentCollection'
import { Loading } from '@/components/shared/Loading'
import SearchHeader from '@/components/common/SearchHeader'
import { useIsMobile } from '@/hooks/use-mobile'
import Typography from '@/components/shared/Typography'
import { useUserInfo } from '@/hooks/useUserInfo'
import AddToCollectionModal from '../../components/AddToCollectionModal'
import ExperienceWithTours from '../../components/ExperienceWithTours'
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal'
import { contentCollectionApi } from '../../api/contentCollectionApi'
import { adaptCollectionSectionToExperienceCard } from '../../adapter/experienceCardAdapter'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import CustomDatePicker from '@/modules/Itinerary/components/CustomDatePicker'
import CityFilterCarousel from '../../components/CityFilterCarousel'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import MetadataTab from '../../components/MetadataTab'
import TagToCreatorModal from '../../components/TagToCreatorModal'
import { getCountryById, getLiveCountries } from '@/api/curation/locationPersonalizationAPI'

type TabType = 'basic-info' | 'features' | 'metadata' | 'manage-tabs' | 'experience'

const EditContentCollection: React.FC = () => {
    const { identifier } = useParams<{ identifier: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<TabType>('basic-info')
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const [addToCollectionModalOpen, setAddToCollectionModalOpen] = useState<string | null>(null)
    const [editedName, setEditedName] = useState<string>('')
    const [editedDescription, setEditedDescription] = useState<string>('')
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [priceAmount, setPriceAmount] = useState<number>(0)
    const [priceCurrency, setPriceCurrency] = useState<string>('INR')
    const [isSavingPricing, setIsSavingPricing] = useState<boolean>(false)
    // Drives the "N+ loved this" pill in the unlock card on the public view.
    // Kept as a string so a fresh number-input doesn't render with a sticky
    // leading "0" while the user types — parsed on save.
    const [lovedCount, setLovedCount] = useState<string>('')
    const [isSavingLovedCount, setIsSavingLovedCount] = useState<boolean>(false)
    const [curationStatus, setCurationStatus] = useState<string>('draft')
    const [isSavingCurationStatus, setIsSavingCurationStatus] = useState<boolean>(false)
    const [showCustomiseTripButton, setShowCustomiseTripButton] = useState<boolean>(true)
    const [isSavingShowCustomiseTripButton, setIsSavingShowCustomiseTripButton] = useState<boolean>(false)
    const [publisherType, setPublisherType] = useState<string>('')
    const [publisherId, setPublisherId] = useState<string>('')
    const [publisherMetadata, setPublisherMetadata] = useState<Record<string, unknown>>({})
    const [creatorSearchQuery, setCreatorSearchQuery] = useState<string>('')
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
    const [isSavingPublisher, setIsSavingPublisher] = useState<boolean>(false)
    const [countrySearchQuery, setCountrySearchQuery] = useState<string>('')
    const [isSavingContext, setIsSavingContext] = useState<boolean>(false)
    // Edit Trip pattern: new only (not already on collection) + to-delete set
    const [newCountryIds, setNewCountryIds] = useState<string[]>([])
    const [countriesToDelete, setCountriesToDelete] = useState<Set<string>>(new Set())
    const [deletingSectionType, setDeletingSectionType] = useState<string | null>(null)
    const isMobile = useIsMobile()
    const [isTagToCreatorModalOpen, setIsTagToCreatorModalOpen] = useState(false)
    const queryClient = useQueryClient()
    const { isRimigoInternal, isPremium } = useUserInfo()

    // Get active trip from context
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null
    const { isAuthenticated } = useAuth()

    // Show dates only when user is logged in, has trips, and is premium or rimigo_internal
    const shouldShowDates = isAuthenticated && !!activeTripId && (isPremium || isRimigoInternal)

    // Track if tours are being fetched (for loading state on date chip)
    const isToursFetching = useIsFetching({ queryKey: ['tours'] }) > 0

    // Fetch collection data for the active section type (for display) - same as ViewContentCollection
    // For Features tab, fetch full collection (no section filter) to get pricing
    const {
        data: activeCollectionResponse,
        isLoading: isCollectionLoading,
        isError: isCollectionError
    } = useQuery({
        queryKey: ['content-collection', identifier, activeTab],
        queryFn: async () => {
            if (!identifier || !activeTab) {
                throw new Error('Identifier and section type are required')
            }
            if (activeTab === 'features' || activeTab === 'manage-tabs') {
                return await contentCollectionApi.getByIdentifier(identifier)
            }
            return await contentCollectionApi.getByIdentifier(identifier, activeTab)
        },
        enabled: !!identifier && !!activeTab,
        staleTime: HOURS_24, // Cache for 24 hours - collection data doesn't change frequently
        gcTime: HOURS_24
    })

    // Extract experiences from collection sections (no API call needed) - same as ViewContentCollection
    const experiences = useMemo(() => {
        if (activeTab !== 'experience' || !activeCollectionResponse?.data?.sections) return []
        const seenEntityIds = new Set<string>()
        return activeCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'experience')
            .map((section: Section) => {
                const exp = adaptCollectionSectionToExperienceCard(section)
                if (!exp) return null
                // Only include first occurrence of each entity_id
                if (seenEntityIds.has(exp.id)) return null
                seenEntityIds.add(exp.id)
                // Add section.id as a unique identifier for React keys
                return { ...exp, _sectionId: section.id || exp.id } as ExperienceCardData & { _sectionId: string }
            })
            .filter((exp): exp is ExperienceCardData & { _sectionId: string } => exp !== null)
    }, [activeCollectionResponse, activeTab])

    const isExperiencesLoading = false

    // Trip sources (creators) for Publisher type "creator" - same API as TagToCreatorModal
    const { data: sourcesResponse } = useQuery({
        queryKey: ['trip-sources'],
        queryFn: async () => {
            const response = await contentCollectionApi.getTripSources()
            const sources = response?.data || []
            return Array.isArray(sources) ? sources : []
        },
        enabled: activeTab === 'features',
        staleTime: 5 * 60 * 1000
    })
    const tripSources: Array<{ id: string; name: string; entity_name?: string; is_account_created?: boolean; media?: { thumbnail_url?: string } }> = Array.isArray(sourcesResponse) ? sourcesResponse : []

    // Get country IDs from context (API may return string or string[])
    const countryIds = useMemo(() => {
        const raw = activeCollectionResponse?.data?.context?.country_id
        if (raw == null) return []
        if (Array.isArray(raw)) return raw.filter(Boolean)
        return raw ? [raw] : []
    }, [activeCollectionResponse?.data?.context?.country_id])

    // Fetch countries by IDs
    const countryQueries = useQueries({
        queries: countryIds.map((countryId) => ({
            queryKey: ['country-by-id', countryId],
            queryFn: async () => {
                const countryResponse = await getCountryById(countryId)
                const d = (countryResponse as { data?: unknown })?.data ?? countryResponse
                const data = d as { id?: string; country_id?: string; name?: string; country_name?: string; icon_url?: string | null }
                return {
                    id: data.id ?? data.country_id ?? countryId,
                    name: data.name ?? data.country_name ?? 'Unknown Country',
                    icon_url: data.icon_url ?? null
                }
            },
            enabled: !!countryId && activeTab === 'features',
            staleTime: HOURS_24
        }))
    })

    const countries = useMemo(() => {
        return countryQueries
            .map((query) => query.data)
            .filter((country): country is { id: string; name: string; icon_url: string | null } => country !== undefined)
    }, [countryQueries])

    const isCountriesLoading = countryQueries.some((query) => query.isLoading)

    // Current selection for display: existing (from API) minus to-delete, plus newly added
    const existingCountryIdsNotDeleted = useMemo(
        () => countryIds.filter((id) => !countriesToDelete.has(id)),
        [countryIds, countriesToDelete]
    )
    const currentCountryIds = useMemo(
        () => [...existingCountryIdsNotDeleted, ...newCountryIds.filter((id) => !countryIds.includes(id))],
        [existingCountryIdsNotDeleted, newCountryIds, countryIds]
    )

    // Reset deletion set when collection changes (e.g. refetch or different collection)
    useEffect(() => {
        setCountriesToDelete(new Set())
    }, [identifier, countryIds.join(',')])

    // Fetch all live countries for search
    const { data: allLiveCountries } = useQuery({
        queryKey: ['live-countries'],
        queryFn: async () => {
            const results = await getLiveCountries()
            return results.map((c) => ({
                id: c.country_id,
                name: c.country_name,
                icon_url: c.icon_url || null
            }))
        },
        enabled: activeTab === 'features',
        staleTime: HOURS_24
    })

    // Filter live countries based on search query (exclude current selection)
    const searchedCountries = useMemo(() => {
        if (!allLiveCountries || !countrySearchQuery.trim()) return []
        const query = countrySearchQuery.toLowerCase()
        return allLiveCountries
            .filter((c) => !currentCountryIds.includes(c.id) && c.name.toLowerCase().includes(query))
            .slice(0, 20) // Limit to 20 results
    }, [allLiveCountries, countrySearchQuery, currentCountryIds])

    // Get active date for tours (from searchParams or default to today) - same as ExperienceTab
    // First try month/year/day, then fallback to check_in, then default to today
    const activeTourDate = useMemo(() => {
        // Try month/year/day format first (ExperienceTab format)
        const monthParam = searchParams.get('month')
        const yearParam = searchParams.get('year')
        const dayParam = searchParams.get('day')

        if (monthParam && yearParam) {
            try {
                const month = parseInt(monthParam, 10) - 1 // Convert to 0-11 for Date constructor
                const year = parseInt(yearParam, 10)
                const day = dayParam ? parseInt(dayParam, 10) : 1 // Use day from params or default to 1
                if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    return new Date(year, month, day)
                }
            } catch {
                // Invalid date, try fallback
            }
        }

        // Fallback to check_in format - use check-in date if available
        const checkInParam = searchParams.get('check_in')
        if (checkInParam) {
            try {
                const parsed = new Date(checkInParam)
                if (!isNaN(parsed.getTime())) {
                    parsed.setHours(0, 0, 0, 0)
                    return parsed
                }
            } catch {
                // Invalid date, fall back to today
            }
        }

        // Default to today's date
        return new Date()
    }, [searchParams])

    // Format date as YYYY-MM-DD for API (without timezone conversion) - same as ExperienceTab
    const checkInDate = useMemo(() => {
        const year = activeTourDate.getFullYear()
        const month = String(activeTourDate.getMonth() + 1).padStart(2, '0')
        const day = String(activeTourDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }, [activeTourDate])

    // Extract unique cities from experiences
    const uniqueCities = useMemo(() => {
        if (activeTab !== 'experience' || experiences.length === 0) return []
        const cityMap = new Map<string, { name: string; id: string }>()
        experiences.forEach((exp) => {
            if (exp.city_name && exp.city_id && !cityMap.has(exp.city_id)) {
                cityMap.set(exp.city_id, { name: exp.city_name, id: exp.city_id })
            }
        })
        return Array.from(cityMap.values())
    }, [experiences, activeTab])

    // Selected city is derived from URL params (source of truth) - use city_id like ExperienceTab
    const selectedCityId = useMemo(() => searchParams.get('city_id'), [searchParams])

    // Set first city as active by default when cities are available (if not in URL params)
    // This updates the URL params, which is the source of truth
    useEffect(() => {
        if (activeTab === 'experience' && uniqueCities.length > 0 && !selectedCityId) {
            const next = new URLSearchParams(searchParams)
            next.set('city_id', uniqueCities[0].id)
            setSearchParams(next, { replace: true })
        }
    }, [uniqueCities, selectedCityId, searchParams, setSearchParams, activeTab])

    // Filter experiences based on selected city (always filter by city, no "all cities" option)
    const filteredExperiences = useMemo(() => {
        if (activeTab !== 'experience') return []
        if (!selectedCityId) return [] // Show nothing if no city selected (shouldn't happen due to default)
        return experiences.filter((exp) => exp.city_id === selectedCityId)
    }, [experiences, selectedCityId, activeTab])

    // Format date as YYYY-MM-DD
    const formatDateYMD = useCallback((date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }, [])

    // Handle date change from CustomDatePicker
    const handleDateChange = useCallback((date: Date) => {
        const next = new URLSearchParams(searchParams)

        // Set ExperienceTab format (month/year/day)
        next.set('month', String(date.getMonth() + 1)) // Convert to 1-12
        next.set('year', String(date.getFullYear()))
        next.set('day', String(date.getDate())) // Store the specific day

        // Also sync check_in/check_out format to preserve dates
        const dateYMD = formatDateYMD(date)
        next.set('check_in', dateYMD)
        // Set check_out to next day
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        next.set('check_out', formatDateYMD(nextDay))

        // Update URL params
        setSearchParams(next, { replace: true })

        // Invalidate tours queries only for experiences that are currently visible
        filteredExperiences.forEach((exp) => {
            if (exp.id) {
                queryClient.invalidateQueries({ queryKey: ['tours', exp.id] })
            }
        })
    }, [searchParams, setSearchParams, queryClient, filteredExperiences, formatDateYMD])

    // Use activeCollectionResponse for all tabs (it already includes section_type filter)
    const isLoading = isCollectionLoading || (activeTab === 'experience' && isExperiencesLoading)
    const isError = isCollectionError

    // Update mutation for saving collection changes
    const updateMutation = useMutation({
        mutationFn: async ({ name, description }: { name: string; description: string | null }) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollection(identifier, name, description)
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSaving(false)
            toast.success('Collection updated successfully!')
        },
        onError: (error: unknown) => {
            setIsSaving(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update collection. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Delete mutation for sections
    const deleteMutation = useMutation({
        mutationFn: async (sectionId: string) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.deleteSection(identifier, sectionId)
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            toast.success('Section deleted successfully!')
        },
        onError: (error: unknown) => {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to delete section. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update collection pricing mutation
    const updatePricingMutation = useMutation({
        mutationFn: async (pricing: { amount: number; currency: string }) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollectionPricing(identifier, pricing)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingPricing(false)
            toast.success('Price updated successfully!')
        },
        onError: (error: unknown) => {
            setIsSavingPricing(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update price. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update collection publisher mutation (only updates collection, does not tag to source)
    const updatePublisherMutation = useMutation({
        mutationFn: async (publisher: { type: string; publisher_id: string; metadata?: Record<string, unknown> }) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollectionPublisher(identifier, publisher)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingPublisher(false)
            toast.success('Publisher updated successfully')
        },
        onError: (error: unknown) => {
            setIsSavingPublisher(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update publisher. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update collection context mutation
    const updateContextMutation = useMutation({
        mutationFn: async (context: { country_id?: string[]; city_id?: string[]; trip_id?: string | null }) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollectionContext(identifier, context)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingContext(false)
            setCountriesToDelete(new Set())
            setNewCountryIds([])
            toast.success('Countries updated successfully')
        },
        onError: (error: unknown) => {
            setIsSavingContext(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update countries. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update "Show Customise My Trip" button toggle mutation.
    // Writes through the generic permissions DictField so new flag keys can be
    // added later without changing the API surface.
    const updateShowCustomiseTripButtonMutation = useMutation({
        mutationFn: async (value: boolean) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollectionPermissions(identifier, {
                show_customise_trip_button: value
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingShowCustomiseTripButton(false)
            toast.success('Customise-trip toggle updated successfully')
        },
        onError: (error: unknown) => {
            setIsSavingShowCustomiseTripButton(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update customise-trip toggle. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update collection-level metadata.loved_count. Merges with whatever
    // metadata is already on the collection (wizard_data, source, etc.) so
    // we never wipe sibling keys — backend replaces the whole DictField.
    const updateLovedCountMutation = useMutation({
        mutationFn: async (value: number) => {
            if (!identifier) throw new Error('Identifier is required')
            const existing =
                (activeCollectionResponse as ApiResponse<ContentCollection> | undefined)?.data?.metadata ?? {}
            return await contentCollectionApi.updateCollectionMetadata(identifier, {
                ...existing,
                loved_count: value
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingLovedCount(false)
            toast.success('Loved count updated successfully')
        },
        onError: (error: unknown) => {
            setIsSavingLovedCount(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update loved count. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Update curation status mutation
    const updateCurationStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.updateCollectionCurationStatus(identifier, status)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            setIsSavingCurationStatus(false)
            toast.success('Curation status updated successfully')
        },
        onError: (error: unknown) => {
            setIsSavingCurationStatus(false)
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to update curation status. Please try again.'
            toast.error(errorMessage)
        }
    })

    // Fetch section types for Manage Tabs
    const {
        data: sectionTypesResponse,
        isLoading: isSectionTypesLoading
    } = useQuery({
        queryKey: ['content-collection-section-types', identifier],
        queryFn: async () => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.getSectionTypes(identifier)
        },
        enabled: !!identifier && activeTab === 'manage-tabs',
        staleTime: 5 * 60 * 1000
    })

    const sectionTypes = sectionTypesResponse?.data || []

    // Delete sections by type mutation
    const deleteSectionsByTypeMutation = useMutation({
        mutationFn: async (sectionType: string) => {
            if (!identifier) throw new Error('Identifier is required')
            return await contentCollectionApi.deleteSectionsByType(identifier, sectionType)
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
            queryClient.invalidateQueries({ queryKey: ['content-collection-section-types', identifier] })
            toast.success('Sections deleted successfully!')
            setDeletingSectionType(null)
        },
        onError: (error: unknown) => {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to delete sections. Please try again.'
            toast.error(errorMessage)
            setDeletingSectionType(null)
        }
    })

    // Handle delete confirmation
    const handleDeleteConfirm = useCallback(() => {
        if (deletingSectionType) {
            deleteSectionsByTypeMutation.mutate(deletingSectionType)
        }
    }, [deletingSectionType, deleteSectionsByTypeMutation])

    // Initialize edited values when collection data loads
    useEffect(() => {
        if (activeCollectionResponse && typeof activeCollectionResponse === 'object' && 'data' in activeCollectionResponse) {
            const response = activeCollectionResponse as ApiResponse<ContentCollection>
            if (response.data) {
                const collection = adaptContentCollectionToViewModel(response.data)
                setEditedName(collection.name)
                setEditedDescription(collection.description || '')
                if (response.data.pricing) {
                    setPriceAmount(response.data.pricing.amount)
                    setPriceCurrency(response.data.pricing.currency || 'INR')
                }
                const rawLoved = response.data.metadata?.loved_count
                const parsedLoved = typeof rawLoved === 'string' ? Number(rawLoved) : rawLoved
                setLovedCount(typeof parsedLoved === 'number' && Number.isFinite(parsedLoved) ? String(parsedLoved) : '')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setCurationStatus((response.data as any).curation_status || 'draft')
                setShowCustomiseTripButton(response.data.permissions?.show_customise_trip_button !== false)
                if (response.data.publisher) {
                    setPublisherType(response.data.publisher.type || '')
                    setPublisherId(response.data.publisher.publisher_id || '')
                    setPublisherMetadata(response.data.publisher.metadata || {})
                    setSelectedCreatorId(response.data.publisher.type === 'creator' ? response.data.publisher.publisher_id || null : null)
                } else {
                    setPublisherType('')
                    setPublisherId('')
                    setPublisherMetadata({})
                    setSelectedCreatorId(null)
                }
            }
        }
    }, [activeCollectionResponse])

    // Handle experience click
    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url, '_blank')
        },
        [searchParams]
    )

    // Handle save button click
    const handleSave = useCallback(async () => {
        if (!identifier) return
        setIsSaving(true)
        updateMutation.mutate({
            name: editedName,
            description: editedDescription || null
        })
    }, [identifier, editedName, editedDescription, updateMutation])

    // Handle delete section
    const handleDeleteSection = useCallback(
        (sectionId: string) => {
            if (window.confirm('Are you sure you want to delete this section?')) {
                deleteMutation.mutate(sectionId)
            }
        },
        [deleteMutation]
    )

    // Edit Trip pattern: remove country (existing → to-delete; new → remove from newCountryIds)
    const handleRemoveCountry = useCallback((countryId: string) => {
        if (countryIds.includes(countryId)) {
            setCountriesToDelete((prev) => new Set(prev).add(countryId))
        } else {
            setNewCountryIds((prev) => prev.filter((id) => id !== countryId))
        }
    }, [countryIds])

    // Edit Trip pattern: undo removal
    const handleRestoreCountry = useCallback((countryId: string) => {
        setCountriesToDelete((prev) => {
            const next = new Set(prev)
            next.delete(countryId)
            return next
        })
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <Loading />
                </div>
            </div>
        )
    }

    if (isError || !activeCollectionResponse) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Collection not found</div>
                </div>
            </div>
        )
    }

    const response = activeCollectionResponse as ApiResponse<ContentCollection> | undefined
    if (!response?.data) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Collection not found</div>
                </div>
            </div>
        )
    }

    // Create mapping from entity_id to section_id for experiences
    const experienceSectionMap = new Map<string, string>()
    if (response.data.sections) {
        response.data.sections
            .filter((section: Section) => section.section_type === 'experience' && section.entity_id && section.id)
            .forEach((section: Section) => {
                if (section.entity_id && section.id) {
                    experienceSectionMap.set(section.entity_id, section.id)
                }
            })
    }


    return (
        <div className="min-h-screen bg-white">
            <SearchHeader
                pageName=""
                assistantConfig={{ enabled: false }}
                ctaConfig={{ enabled: false }}
                breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'my-3' }}
            />
            <div className="w-full max-w-[1380px] py-8  mx-auto px-4">
                {/* Header - Collection name (read-only display) */}
                {editedName && (
                    <div className="mb-6">
                        <h1 className="tracking-[-0.02em] font-[467] font-red-hat-display text-[24px] text-grey-0">
                            {editedName}
                        </h1>
                    </div>
                )}
                {/* Tabs */}
                <div className="flex gap-6 border-b border-grey-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic-info')}
                        className={`px-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'basic-info' ? 'text-primary-default border-b-2 border-primary-default' : 'text-grey-2'
                            }`}
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '16px',
                            lineHeight: '20px',
                            letterSpacing: '-0.32px',
                            fontWeight: activeTab === 'basic-info' ? 700 : 600
                        }}>
                        Basic Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('features')}
                        className={`px-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'features' ? 'text-primary-default border-b-2 border-primary-default' : 'text-grey-2'
                            }`}
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '16px',
                            lineHeight: '20px',
                            letterSpacing: '-0.32px',
                            fontWeight: activeTab === 'features' ? 700 : 600
                        }}>
                        Features
                    </button>
                    {response.data.content_collection_metadata && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('metadata')}
                            className={`px-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'metadata' ? 'text-primary-default border-b-2 border-primary-default' : 'text-grey-2'
                                }`}
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '16px',
                                lineHeight: '20px',
                                letterSpacing: '-0.32px',
                                fontWeight: activeTab === 'metadata' ? 700 : 600
                            }}>
                            Metadata
                        </button>
                    )}
                    {isRimigoInternal && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('manage-tabs')}
                            className={`px-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'manage-tabs' ? 'text-primary-default border-b-2 border-primary-default' : 'text-grey-2'
                                }`}
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '16px',
                                lineHeight: '20px',
                                letterSpacing: '-0.32px',
                                fontWeight: activeTab === 'manage-tabs' ? 700 : 600
                            }}>
                            Manage Tabs
                        </button>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-6">
                    {/* List Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto lg:max-h-[calc(100vh-200px)] pr-2">
                        {/* Content based on active tab */}
                        {/* Basic Info Tab */}
                        {activeTab === 'basic-info' && (
                            <div className="max-w-2xl space-y-6">
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Collection Name
                                    </Typography>
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="w-full tracking-[-0.02em] font-[467] font-red-hat-display text-[20px] border border-grey-4 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                        placeholder="Collection name"
                                    />
                                </div>
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Description
                                    </Typography>
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full tracking-[-0.02em] font-manrope text-base font-medium text-grey-1 leading-[20px] border border-grey-4 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1 resize-y min-h-[100px]"
                                        placeholder="Collection description"
                                        rows={4}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving || updateMutation.isPending}
                                    className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                                    {(isSaving || updateMutation.isPending) && <Loader2 className="h-4 w-4 text-white animate-spin" />}
                                    {isSaving || updateMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        )}

                        {false && activeTab === 'experience' && (
                            <>
                                {/* Date Button and Cities Carousel - Sticky */}
                                <div className="sticky top-0 z-30 bg-white mb-0 -mx-4 px-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {/* Date Picker - Using CustomDatePicker with chip variant - Only show if shouldShowDates */}
                                        {shouldShowDates && (
                                            <>
                                                <div className="shrink-0">
                                                    <CustomDatePicker
                                                        value={activeTourDate}
                                                        onChange={handleDateChange}
                                                        variant="chip"
                                                        isLoading={isToursFetching}
                                                    />
                                                </div>

                                                {/* Vertical Divider - Only show if dates are shown and cities exist */}
                                                {uniqueCities.length > 0 && (
                                                    <div className="h-6 w-px bg-grey-4 shrink-0" />
                                                )}
                                            </>
                                        )}

                                        {/* Cities Carousel - Always show if cities exist */}
                                        {uniqueCities.length > 0 && (
                                            <CityFilterCarousel
                                                cities={uniqueCities}
                                                selectedCityId={selectedCityId}
                                                onCityChange={(cityId) => {
                                                    // Update URL params (source of truth)
                                                    // Always set a city (no null allowed - single city filter only)
                                                    const next = new URLSearchParams(searchParams)
                                                    if (cityId) {
                                                        next.set('city_id', cityId)
                                                    } else if (uniqueCities.length > 0) {
                                                        // Fallback to first city if null is passed (shouldn't happen)
                                                        next.set('city_id', uniqueCities[0].id)
                                                    }
                                                    setSearchParams(next, { replace: true })
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {isExperiencesLoading ? (
                                    <div className="text-center py-12">
                                        <Loading />
                                    </div>
                                ) : filteredExperiences.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Typography
                                            size="16"
                                            weight="medium"
                                            color="grey-1">
                                            {selectedCityId ? 'No experiences found for the selected city.' : 'No experiences found in this collection.'}
                                        </Typography>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 items-start">
                                        {filteredExperiences.map((experience) => {
                                            const experienceId = experience.id
                                            const isHovered = hoveredCardId === experienceId || isMobile
                                            const sectionId = experienceSectionMap.get(experienceId)

                                            return (
                                                <div
                                                    key={sectionId || experience.id}
                                                    className="relative">
                                                    {sectionId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSection(sectionId)}
                                                            disabled={deleteMutation.isPending}
                                                            className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg">
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <ExperienceWithTours
                                                        experience={experience}
                                                        onExperienceClick={handleExperienceClick}
                                                        onAddToCollection={(id: string) => setAddToCollectionModalOpen(id)}
                                                        isHovered={isHovered}
                                                        onMouseEnter={() => {
                                                            setHoveredCardId(experienceId)
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredCardId(null)
                                                        }}
                                                        isPublicView={false}
                                                        shouldLoadTours={true}
                                                        checkIn={checkInDate}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'features' && (
                            <div className="max-w-4xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Countries Section */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Countries
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Manage countries associated with this collection.
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        {/* Current countries: existing (from API) not in to-delete + newly added */}
                                        {isCountriesLoading ? (
                                            <div className="py-4">
                                                <Loading />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap gap-2">
                                                    {countries
                                                        .filter((c) => !countriesToDelete.has(c.id))
                                                        .map((country) => (
                                                            <div
                                                                key={country.id}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-grey-4 bg-grey-5">
                                                                {country.icon_url && (
                                                                    <img
                                                                        src={country.icon_url}
                                                                        alt={country.name}
                                                                        className="w-5 h-5 object-contain"
                                                                    />
                                                                )}
                                                                <span className="text-sm font-medium text-grey-0">{country.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCountry(country.id)}
                                                                    className="ml-1 hover:bg-grey-4 rounded p-0.5 transition-colors"
                                                                    aria-label={`Remove ${country.name}`}>
                                                                    <X className="w-4 h-4 text-grey-2" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    {newCountryIds
                                                        .map((id) => allLiveCountries?.find((c) => c.id === id))
                                                        .filter((c): c is { id: string; name: string; icon_url: string | null } => !!c)
                                                        .map((country) => (
                                                            <div
                                                                key={country.id}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-grey-4 bg-grey-5">
                                                                {country.icon_url && (
                                                                    <img
                                                                        src={country.icon_url}
                                                                        alt={country.name}
                                                                        className="w-5 h-5 object-contain"
                                                                    />
                                                                )}
                                                                <span className="text-sm font-medium text-grey-0">{country.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCountry(country.id)}
                                                                    className="ml-1 hover:bg-grey-4 rounded p-0.5 transition-colors"
                                                                    aria-label={`Remove ${country.name}`}>
                                                                    <X className="w-4 h-4 text-grey-2" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                </div>
                                                {currentCountryIds.length === 0 && (
                                                    <p className="text-sm text-grey-2">No countries added yet.</p>
                                                )}

                                                {/* To be removed: show with restore option */}
                                                {countriesToDelete.size > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs font-medium text-grey-2 mb-2">To be removed</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {countries
                                                                .filter((c) => countriesToDelete.has(c.id))
                                                                .map((country) => (
                                                                    <div
                                                                        key={country.id}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-red-50">
                                                                        {country.icon_url && (
                                                                            <img
                                                                                src={country.icon_url}
                                                                                alt={country.name}
                                                                                className="w-5 h-5 object-contain"
                                                                            />
                                                                        )}
                                                                        <span className="text-sm font-medium text-red-600">{country.name}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRestoreCountry(country.id)}
                                                                            className="ml-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded px-2 py-0.5 transition-colors">
                                                                            Restore
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Country search dropdown */}
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-grey-0 mb-1">Add Country</label>
                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                                <input
                                                    type="text"
                                                    placeholder="Search countries..."
                                                    value={countrySearchQuery}
                                                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-grey-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default"
                                                />
                                            </div>
                                            {countrySearchQuery.trim() && searchedCountries && searchedCountries.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-grey-4 rounded-lg bg-white shadow-lg divide-y divide-grey-4">
                                                    {searchedCountries.map((country: { id: string; name: string; icon_url: string | null }) => (
                                                        <button
                                                            key={country.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!countryIds.includes(country.id) && !newCountryIds.includes(country.id)) {
                                                                    setNewCountryIds((prev) => [...prev, country.id])
                                                                }
                                                                setCountrySearchQuery('')
                                                            }}
                                                            className="flex items-center gap-3 p-3 w-full text-left hover:bg-grey-5 transition-colors">
                                                            {country.icon_url && (
                                                                <img
                                                                    src={country.icon_url}
                                                                    alt={country.name}
                                                                    className="w-8 h-8 object-contain"
                                                                />
                                                            )}
                                                            <span className="text-sm font-medium text-grey-0">{country.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const existingIds = countryIds
                                                const finalCountryIds = [
                                                    ...existingIds.filter((id) => !countriesToDelete.has(id)),
                                                    ...newCountryIds.filter((id) => !existingIds.includes(id))
                                                ]
                                                const currentContext = activeCollectionResponse?.data?.context
                                                setIsSavingContext(true)
                                                updateContextMutation.mutate({
                                                    country_id: finalCountryIds.length > 0 ? finalCountryIds : undefined,
                                                    city_id: currentContext?.city_id,
                                                    trip_id: currentContext?.trip_id
                                                })
                                            }}
                                            disabled={isSavingContext || updateContextMutation.isPending}
                                            className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 w-fit">
                                            {(isSavingContext || updateContextMutation.isPending) && (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            )}
                                            {isSavingContext || updateContextMutation.isPending ? 'Saving...' : 'Save countries'}
                                        </button>
                                    </div>
                                </div>

                                {/* Collection price */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Collection price
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Set the price shown for unlocking this collection.
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-grey-0 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={priceAmount}
                                                onChange={(e) => setPriceAmount(Number(e.target.value) || 0)}
                                                className="w-full border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-grey-0 mb-1">Currency</label>
                                            <input
                                                type="text"
                                                value={priceCurrency}
                                                onChange={(e) => setPriceCurrency(e.target.value)}
                                                placeholder="e.g. INR, USD"
                                                className="w-full border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSavingPricing(true)
                                                updatePricingMutation.mutate({
                                                    amount: priceAmount,
                                                    currency: priceCurrency
                                                })
                                            }}
                                            disabled={isSavingPricing || updatePricingMutation.isPending}
                                            className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 w-fit"
                                        >
                                            {(isSavingPricing || updatePricingMutation.isPending) && (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            )}
                                            {isSavingPricing || updatePricingMutation.isPending ? 'Saving...' : 'Save price'}
                                        </button>
                                    </div>
                                </div>

                                {/* Loved count — drives the "N+ loved this" pill on the unlock CTA */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Loved count
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Number shown next to the heart on the unlock card (e.g. &quot;328+ loved this&quot;).
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-grey-0 mb-1">Count</label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                step={1}
                                                value={lovedCount}
                                                onChange={(e) => {
                                                    // Strip non-digits and any leading zeros so editing from 0 → 123
                                                    // doesn't render "0123" while the user types.
                                                    const digitsOnly = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
                                                    setLovedCount(digitsOnly)
                                                }}
                                                placeholder="0"
                                                className="w-full border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSavingLovedCount(true)
                                                updateLovedCountMutation.mutate(Number(lovedCount) || 0)
                                            }}
                                            disabled={isSavingLovedCount || updateLovedCountMutation.isPending}
                                            className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 w-fit">
                                            {(isSavingLovedCount || updateLovedCountMutation.isPending) && (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            )}
                                            {isSavingLovedCount || updateLovedCountMutation.isPending ? 'Saving...' : 'Save loved count'}
                                        </button>
                                    </div>
                                </div>

                                {/* Show "Customise My Trip" button toggle */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Show &quot;Customise My Trip&quot; button
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        When on, users see the customise-trip CTA on the tripboard (desktop header and mobile sticky bar).
                                    </p>
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={showCustomiseTripButton}
                                            onClick={() => setShowCustomiseTripButton((v) => !v)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2 ${
                                                showCustomiseTripButton ? 'bg-primary-default' : 'bg-grey-4'
                                            }`}>
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                                    showCustomiseTripButton ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSavingShowCustomiseTripButton(true)
                                                updateShowCustomiseTripButtonMutation.mutate(showCustomiseTripButton)
                                            }}
                                            disabled={isSavingShowCustomiseTripButton || updateShowCustomiseTripButtonMutation.isPending}
                                            className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                                            {(isSavingShowCustomiseTripButton || updateShowCustomiseTripButtonMutation.isPending) && (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            )}
                                            {isSavingShowCustomiseTripButton || updateShowCustomiseTripButtonMutation.isPending ? 'Saving...' : 'Save toggle'}
                                        </button>
                                    </div>
                                </div>

                                {/* Curation Status */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Curation Status
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Toggle visibility. Only &quot;published&quot; collections appear on the public tripboards page.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={curationStatus}
                                            onChange={(e) => setCurationStatus(e.target.value)}
                                            className="border border-grey-3 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-default"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSavingCurationStatus(true)
                                                updateCurationStatusMutation.mutate(curationStatus)
                                            }}
                                            disabled={isSavingCurationStatus || updateCurationStatusMutation.isPending}
                                            className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            {(isSavingCurationStatus || updateCurationStatusMutation.isPending) && (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            )}
                                            {isSavingCurationStatus || updateCurationStatusMutation.isPending ? 'Saving...' : 'Save status'}
                                        </button>
                                    </div>
                                </div>

                                {/* Publisher - show when collection has publisher or allow setting */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Publisher
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Set who published this collection. For type Creator, select from the list.
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-grey-0 mb-1">Type</label>
                                            <select
                                                value={publisherType}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setPublisherType(v)
                                                    if (v !== 'creator') {
                                                        setSelectedCreatorId(null)
                                                    } else {
                                                        setPublisherId(selectedCreatorId || '')
                                                    }
                                                }}
                                                className="w-full border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                            >
                                                <option value="">— Select type —</option>
                                                <option value="internal_user">Internal user</option>
                                                <option value="traveler">Traveler</option>
                                                <option value="creator">Creator</option>
                                                <option value="ata_agent">ATA agent</option>
                                                <option value="rimigo_ai">Rimigo AI</option>
                                            </select>
                                        </div>
                                        {publisherType === 'creator' ? (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-grey-0 mb-1">Select creator</label>
                                                    <div className="relative mb-2">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search creators..."
                                                            value={creatorSearchQuery}
                                                            onChange={(e) => setCreatorSearchQuery(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-2 border border-grey-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-default"
                                                        />
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto border border-grey-4 rounded-lg divide-y divide-grey-4">
                                                        {tripSources
                                                            .filter(
                                                                (s) =>
                                                                    !creatorSearchQuery.trim() ||
                                                                    (s.name?.toLowerCase().includes(creatorSearchQuery.toLowerCase()) ||
                                                                        s.entity_name?.toLowerCase().includes(creatorSearchQuery.toLowerCase()))
                                                            )
                                                            .map((source) => {
                                                                const isSelected = selectedCreatorId === source.id
                                                                return (
                                                                    <button
                                                                        key={source.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedCreatorId(source.id)
                                                                            setPublisherId(source.id)
                                                                        }}
                                                                        className={`flex items-center gap-3 p-3 w-full text-left transition-all ${isSelected ? 'bg-primary-50 border-l-2 border-l-primary-default' : 'hover:bg-grey-5'}`}
                                                                    >
                                                                        {source.media?.thumbnail_url ? (
                                                                            <img src={source.media.thumbnail_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-full bg-grey-4 flex items-center justify-center">
                                                                                <Typography size="14" weight="semibold" color="grey-2">
                                                                                    {(source.entity_name || source.name || '?').charAt(0).toUpperCase()}
                                                                                </Typography>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <Typography size="14" weight="semibold" color="grey-0" className="truncate">
                                                                                {source.entity_name || source.name}
                                                                            </Typography>
                                                                            {source.entity_name && source.entity_name !== source.name && (
                                                                                <Typography size="12" color="grey-2" className="truncate">@{source.name}</Typography>
                                                                            )}
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div className="w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                                                                                <div className="w-2 h-2 rounded-full bg-white" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            publisherType && (
                                                <div>
                                                    <label className="block text-sm font-medium text-grey-0 mb-1">Publisher ID</label>
                                                    <input
                                                        type="text"
                                                        value={publisherId}
                                                        onChange={(e) => setPublisherId(e.target.value)}
                                                        placeholder="e.g. user or entity id"
                                                        className="w-full border border-grey-4 rounded-md px-3 py-2 font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-1"
                                                    />
                                                </div>
                                            )
                                        )}
                                        {publisherType && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const id = publisherType === 'creator' ? (selectedCreatorId || publisherId) : publisherId
                                                    if (!id) {
                                                        toast.error('Please set Publisher ID or select a creator')
                                                        return
                                                    }
                                                    setIsSavingPublisher(true)
                                                    updatePublisherMutation.mutate({
                                                        type: publisherType,
                                                        publisher_id: id,
                                                        metadata: Object.keys(publisherMetadata).length ? publisherMetadata : undefined
                                                    })
                                                }}
                                                disabled={isSavingPublisher || updatePublisherMutation.isPending}
                                                className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 w-fit"
                                            >
                                                {(isSavingPublisher || updatePublisherMutation.isPending) && (
                                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                                )}
                                                {isSavingPublisher || updatePublisherMutation.isPending ? 'Saving...' : 'Save publisher'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Tag to Creator */}
                                <div className="space-y-4 p-6 border border-grey-4 rounded-xl md:col-span-2">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Create copy and Tag to Creator
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Create a new source and tag this collection to a creator/influencer.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsTagToCreatorModalOpen(true)}
                                        className="px-6 py-2 bg-primary-default text-white rounded-md font-medium hover:bg-primary-dark transition-colors"
                                    >
                                        Tag to Creator
                                    </button>
                                </div>
                                </div>{/* close grid */}
                            </div>
                        )}

                        {activeTab === 'metadata' && response.data.content_collection_metadata && (
                            <MetadataTab
                                collectionIdentifier={identifier || ''}
                                metadataId={response.data.content_collection_metadata}
                            />
                        )}

                        {activeTab === 'manage-tabs' && (
                            <div className="max-w-md space-y-6">
                                <div className="space-y-4">
                                    <Typography size="16" weight="semibold" color="grey-0" className="font-red-hat-display">
                                        Manage Tabs
                                    </Typography>
                                    <p className="text-sm text-grey-2">
                                        Delete all sections of a specific type from this collection.
                                    </p>
                                    {isSectionTypesLoading ? (
                                        <div className="py-4">
                                            <Loading />
                                        </div>
                                    ) : sectionTypes.length === 0 ? (
                                        <p className="text-sm text-grey-2">No section types found.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {sectionTypes.map((sectionType) => (
                                                <div
                                                    key={sectionType.section_type}
                                                    className="flex items-center justify-between p-4 border border-grey-4 rounded-lg bg-white">
                                                    <div className="flex-1">
                                                        <Typography size="14" weight="semibold" color="grey-0">
                                                            {sectionType.name || sectionType.section_type}
                                                        </Typography>
                                                        <Typography size="12" color="grey-2" className="mt-1">
                                                            Type: {sectionType.section_type}
                                                        </Typography>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDeletingSectionType(sectionType.section_type)
                                                        }}
                                                        disabled={deleteSectionsByTypeMutation.isPending}
                                                        className="ml-4 px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add to Collection Modal */}
                {addToCollectionModalOpen && (
                    <AddToCollectionModal
                        isOpen={!!addToCollectionModalOpen}
                        onClose={() => setAddToCollectionModalOpen(null)}
                        experienceId={addToCollectionModalOpen}
                        experienceName={experiences.find((e: { id: string; title?: string }) => e.id === addToCollectionModalOpen)?.title || ''}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {deletingSectionType && (
                    <DeleteConfirmationModal
                        isOpen={!!deletingSectionType}
                        onClose={() => setDeletingSectionType(null)}
                        onConfirm={handleDeleteConfirm}
                        title="Delete Sections"
                        message={`Are you sure you want to delete all sections of type "${sectionTypes.find(st => st.section_type === deletingSectionType)?.name || deletingSectionType}"? This action cannot be undone.`}
                        isDeleting={deleteSectionsByTypeMutation.isPending}
                    />
                )}

                {/* Tag to Creator Modal */}
                {isTagToCreatorModalOpen && identifier && (
                    <TagToCreatorModal
                        isOpen={isTagToCreatorModalOpen}
                        onClose={() => setIsTagToCreatorModalOpen(false)}
                        collectionIdentifier={identifier}
                        collectionName={editedName}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['content-collection', identifier] })
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default EditContentCollection
