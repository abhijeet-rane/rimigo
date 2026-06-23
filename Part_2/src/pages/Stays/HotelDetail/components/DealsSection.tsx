import Typography from '@/components/shared/Typography'
import DealsCard from './DealsCard'
import { useMemo, useState } from 'react'
import { GetAccommodationDealResultResponse } from '../api/DealsDataApi'
import DealsCardSkeleton from './DealCardSkeleton'
import FiltersSkeleton from './FliterSkeleton'
import FilterChip from './FilterChip'

interface DealSectionProps {
    dealResponse?: GetAccommodationDealResultResponse | null
    isLoading: boolean
    checkin: string
    checkout: string
}

export const DealSection: React.FC<DealSectionProps> = ({ dealResponse, isLoading, checkin, checkout }) => {
    const dealStatus = dealResponse?.deal_request_status
    const apiFilters = dealResponse?.request_deal_response?.filters
    const roomTypes = dealResponse?.request_deal_response?.room_types || {}

    // --- ✅ Only treat these statuses as "loading/shimmer" ---
    // Also shimmer when dealStatus is undefined (poll hasn't returned yet)
    const showShimmer = isLoading || !dealStatus || dealStatus === 'IN_PROGRESS' || dealStatus === 'PARTIAL'

    // --- 🧩 Construct filters dynamically ---
    const filters = useMemo(() => {
        if (showShimmer || !apiFilters) return []

        const dynamicFilters = []

        if (Array.isArray(apiFilters.room_type)) {
            dynamicFilters.push({
                key: 'room_type',
                label: 'Room Type',
                options: ['Any', ...apiFilters.room_type]
            })
        }

        if (apiFilters.board_basis && typeof apiFilters.board_basis === 'object') {
            const mealOptions = Object.keys(apiFilters.board_basis)
            dynamicFilters.push({
                key: 'board_basis',
                label: 'Meal Plan',
                options: ['Any', ...mealOptions]
            })
        }

        if (apiFilters.cancellation_policy && typeof apiFilters.cancellation_policy === 'object') {
            const cancelOptions = Object.keys(apiFilters.cancellation_policy)
            dynamicFilters.push({
                key: 'cancellation_policy',
                label: 'Cancellation Policy',
                options: ['Any', ...cancelOptions]
            })
        }

        return dynamicFilters
    }, [apiFilters, dealStatus])

    // --- 🧠 User filter selections ---
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
    const handleFilterChange = (key: string, value: string) => {
        setSelectedFilters((prev) => ({ ...prev, [key]: value }))
    }

    // --- 📊 Count active filters (excluding "Any") ---
    const activeFiltersCount = useMemo(() => {
        return Object.values(selectedFilters).filter((value) => value && value !== 'Any').length
    }, [selectedFilters])

    // --- 🧮 Filter visible rooms using filters mapping from API ---
    const filteredRoomEntries = useMemo(() => {
        if (showShimmer || Object.keys(roomTypes).length === 0 || !apiFilters) return []

        const { room_type, board_basis, cancellation_policy } = selectedFilters

        // Check if all filters are "Any" or empty (default state)
        const isDefault = (!room_type || room_type === 'Any') &&
            (!board_basis || board_basis === 'Any') &&
            (!cancellation_policy || cancellation_policy === 'Any')

        if (isDefault) return Object.entries(roomTypes)

        // Build array of allowed room types based on selected filters
        let allowedRoomTypes: string[] = []

        // Start with room_type filter if selected
        if (room_type && room_type !== 'Any') {
            allowedRoomTypes = [room_type]
        } else {
            // If no room_type filter, start with all room types
            allowedRoomTypes = apiFilters.room_type ? [...apiFilters.room_type] : Object.keys(roomTypes)
        }

        // Intersect with board_basis filter if selected
        if (board_basis && board_basis !== 'Any' && apiFilters.board_basis) {
            const boardBasisRooms = apiFilters.board_basis[board_basis] || []
            allowedRoomTypes = allowedRoomTypes.filter(room => boardBasisRooms.includes(room))
        }

        // Intersect with cancellation_policy filter if selected
        if (cancellation_policy && cancellation_policy !== 'Any' && apiFilters.cancellation_policy) {
            const cancelPolicyRooms = apiFilters.cancellation_policy[cancellation_policy] || []
            allowedRoomTypes = allowedRoomTypes.filter(room => cancelPolicyRooms.includes(room))
        }

        // Filter room entries to only include allowed room types
        return Object.entries(roomTypes).filter(([roomName]) =>
            allowedRoomTypes.includes(roomName)
        )
    }, [roomTypes, selectedFilters, showShimmer, apiFilters])

    return (
        <div className="flex flex-col w-full relative">
            {/* 🧮 Filters */}
            <div className="sticky top-[52px] md:top-[152px] z-20 py-3 px-3 md:px-0 border-b border-t-0 border-grey-4 bg-white backdrop-blur-sm">
                <div className="flex flex-row flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hide">
                    {showShimmer ? (
                        Array.from({ length: 1 }).map((_, idx) => <FiltersSkeleton key={idx} />)
                    ) : filters.length > 0 ? (
                        filters.map((filter) => (
                            <div key={filter.key} className="shrink-0">
                                <FilterChip
                                    label={filter.label}
                                    options={filter.options}
                                    onChange={(value) => handleFilterChange(filter.key, value)}
                                    selectedValue={selectedFilters[filter.key] || 'Any'}
                                    activeFiltersCount={activeFiltersCount}
                                />
                            </div>
                        ))
                    ) : (
                        <Typography
                            size="14"
                            weight="medium"
                            family="manrope"
                            color="grey-2">
                            No filters available
                        </Typography>
                    )}
                </div>
            </div>

            {/* 🏨 Room Cards */}
            <div className="flex flex-col gap-4 items-center mt-4">
                {showShimmer ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="w-full max-w-4xl">
                            <DealsCardSkeleton />
                        </div>
                    ))
                ) : filteredRoomEntries.length > 0 ? (
                    filteredRoomEntries.map(([roomName, roomData]: any, idx) => {
                        // Filter roomData.rooms based on selected filters
                        const filteredRoomData = { ...roomData }

                        if (apiFilters) {
                            const { board_basis, cancellation_policy } = selectedFilters

                            // Filter meal plans if board_basis filter is selected
                            if (board_basis && board_basis !== 'Any' && roomData.rooms) {
                                filteredRoomData.rooms = Object.fromEntries(
                                    Object.entries(roomData.rooms).filter(([mealPlan]) => mealPlan === board_basis)
                                )
                            }

                            // Filter cancellation policies if cancellation_policy filter is selected
                            if (cancellation_policy && cancellation_policy !== 'Any' && filteredRoomData.rooms) {
                                filteredRoomData.rooms = Object.fromEntries(
                                    Object.entries(filteredRoomData.rooms).map(([mealPlan, mealData]: any) => [
                                        mealPlan,
                                        Object.fromEntries(
                                            Object.entries(mealData).filter(([cancelPolicy]) => cancelPolicy === cancellation_policy)
                                        )
                                    ]).filter(([, mealData]: any) => Object.keys(mealData).length > 0)
                                )
                            }
                        }

                        return (
                            <div key={idx} className="w-full max-w-4xl ">
                                <DealsCard
                                    status={dealStatus ?? ''}
                                    checkin={checkin}
                                    checkout={checkout}
                                    title={roomName}
                                    roomData={filteredRoomData}
                                    selectedCancellationPolicy={selectedFilters.cancellation_policy}
                                />
                            </div>
                        )
                    })
                ) : (
                    <Typography
                        size="14"
                        weight="medium"
                        family="manrope"
                        color="grey-2">
                        No deals match your filters
                    </Typography>
                )}
            </div>
        </div>
    )
}
