// MobileStaysTabHeader.tsx - Filter/Sort header with optional Map View button
import Typography from '@/components/shared/Typography'
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { FilterMobileSheet } from './FilterMobileSheet'
import { FilterConfig, SortConfig } from '@/components/common/SearchHeader'
import { SortMobileSheet } from './SortMobileSheet'
import clsx from 'clsx'

interface Props {
    filterConfig?: FilterConfig
    sortConfig?: SortConfig
    activeTab: 'list' | 'map'
    onTabChange: (tab: 'list' | 'map') => void
    containerClassName?: string
}

const MobileStaysTabHeader = ({ filterConfig, sortConfig, activeTab, onTabChange, containerClassName }: Props) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isSortOpen, setIsSortOpen] = useState(false)
    const sortButtonRef = useRef<HTMLButtonElement | null>(null)

    // Hide the header entirely when map is active (floating List View button is shown on the map instead)
    if (activeTab === 'map') return null

    return (
        <>
            <div className={clsx(
                    "py-[10px] md:hidden px-5 flex gap-3 items-center w-full border-b border-grey-4",
                    containerClassName
                )}>
                {/* Filter */}
                {filterConfig?.enabled && (() => {
                    const hasActive = (filterConfig.initialData?.selectedPropertyTypes?.length ?? 0) > 0 ||
                        (filterConfig.initialData?.selectedAmenities?.length ?? 0) > 0 ||
                        filterConfig.initialData?.isVerified === true ||
                        filterConfig.initialData?.isB2bDealAvailable === true
                    return (
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={`relative flex gap-1 items-center border py-2 px-4 rounded-3xl ${hasActive ? 'border-primary-default bg-primary-default-80' : 'border-grey-4'}`}>
                            <SlidersHorizontal size={16} />
                            <Typography
                                size="12"
                                weight="semibold">
                                Filter
                            </Typography>
                            {hasActive && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary-default border-2 border-white" />
                            )}
                        </button>
                    )
                })()}

                {/* Sort */}
                {sortConfig?.enabled && (
                    <button
                        ref={sortButtonRef}
                        onClick={() => setIsSortOpen(true)}
                        className="flex gap-1 items-center border border-grey-4 py-2 px-4 rounded-3xl">
                        <ArrowUpDown size={16} />
                        <Typography
                            size="12"
                            weight="semibold">
                            Sort
                        </Typography>
                    </button>
                )}

                {/* Map View - pinned right */}
                <button
                    type="button"
                    onClick={() => onTabChange('map')}
                    className="text-[13px] font-semibold font-manrope text-primary-default border border-grey-4 rounded-sm px-4 py-1.5 bg-white shrink-0 ml-auto">
                    Map View
                </button>
            </div>

            {/* Bottom Sheets */}
            {filterConfig && (
                <FilterMobileSheet
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    config={filterConfig}
                />
            )}
            {sortConfig?.enabled && (
                <SortMobileSheet
                    isOpen={isSortOpen}
                    onClose={() => setIsSortOpen(false)}
                    type="stays"
                    metadata={sortConfig.metadata}
                    initialData={sortConfig.initialData}
                    onChange={() => {}}
                    onApply={(result) => {
                        sortConfig.onApply?.(result)
                    }}
                />
            )}
        </>
    )
}

export default MobileStaysTabHeader
