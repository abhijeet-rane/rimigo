import React, { useRef } from 'react'
import Typography from '@/components/shared/Typography'
import { Button } from '@/components/shared/ButtonNew'
import CustomShimmer from '@/components/shared/Shimmer'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'

interface DestinationsGridProps {
    onDestinationSelect: (countryId: string, countryName: string) => void
    showPlanTripButton?: boolean
    onPlanTripClick?: () => void
    title?: string
    showTitle?: boolean
    columnCount?: 2 | 3 | 4 | 5
    className?: string
}

export const DestinationsGrid: React.FC<DestinationsGridProps> = ({
    onDestinationSelect,
    showPlanTripButton = true,
    onPlanTripClick,
    title = 'Where do you want to go?',
    showTitle = true,
    columnCount = 4,
    className = ''
}) => {
    const regionRefs = useRef<(HTMLDivElement | null)[]>([])

    const { groupedDestinations, isLoading } = useLocationPersonalization()

    const handleDestinationItemClick = (countryId: string, countryName: string) => {
        onDestinationSelect(countryId, countryName)
    }

    // Dynamic column classes based on columnCount prop
    const getColumnClass = () => {
        const columnClasses = {
            2: 'columns-1 sm:columns-2',
            3: 'columns-1 sm:columns-2 md:columns-3',
            4: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4',
            5: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5'
        }
        return columnClasses[columnCount] || columnClasses[4]
    }

    if (isLoading) {
        return (
            <div className={`w-full ${className}`}>
                <CustomShimmer height={400} radius={16} />
            </div>
        )
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Title */}
            {showTitle && (
                <div className="mb-6 pb-3 border-b border-grey-4">
                    <Typography
                        size="20"
                        weight="semibold"
                        color="grey-0"
                        family="redhat">
                        {title}
                    </Typography>
                </div>
            )}

            {/* Destinations Grid */}
            <div className={`${getColumnClass()} gap-6`}>
                {groupedDestinations.map((region, regionIndex) => (
                    <div
                        key={region.name}
                        ref={(el) => {
                            regionRefs.current[regionIndex] = el
                        }}
                        className="break-inside-avoid mb-6 ">
                        {/* Divider - hide for top regions in each column */}
                        {/* {!topRegionIndices.has(regionIndex) && (
                            <div className="w-full rounded-full h-[1px] bg-grey-4 mb-6"></div>
                        )} */}

                        {/* Region Name */}
                        <div className="flex flex-row gap-1 items-center mb-4">
                            <Typography
                                size="14"
                                weight="bold"
                                color="grey-0"
                                family="redhat"
                                className="uppercase">
                                {region.name}
                            </Typography>
                        </div>

                        {/* Countries List */}
                        <ul className="flex flex-col md:gap-2">
                            {region.countries.map((country) => (
                                <li
                                    key={country.country_id}
                                    className="cursor-pointer flex flex-row items-center gap-2 hover:bg-grey-5 p-2 rounded-lg transition-colors duration-200"
                                    onClick={() =>
                                        handleDestinationItemClick(
                                            country.country_id,
                                            country.country_name
                                        )
                                    }>
                                    <img
                                        src={country.flag_icon_url}
                                        alt={country.country_name}
                                        className="w-5 h-5 object-contain rounded-sm"
                                    />
                                    <Typography
                                        size="16"
                                        weight="medium"
                                        color="grey-0"
                                        family="manrope">
                                        {country.country_name}
                                    </Typography>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Footer */}
            {showPlanTripButton && (
                <div className="flex flex-col sm:flex-row items-center md:justify-between md:items-start sm:items-center gap-4 py-6 border-grey-4 bg-grey-5 px-6 rounded-lg mt-8">
                    <div className="flex flex-col gap-1">
                        <Typography
                            size="16"
                            color="grey-0"
                            weight="semibold"
                            family="manrope">
                            Can't find your destination?
                        </Typography>
                        <Typography
                            size="14"
                            weight="medium"
                            color="grey-2"
                            family="manrope">
                            We can help you customise your trip
                        </Typography>
                    </div>
                    <div className="w-full sm:w-fit">
                        {showPlanTripButton && onPlanTripClick && (
                        <Button
                            buttonColor={{
                                enabled: 'bg-grey-0 text-natural-white',
                                disabled: 'bg-grey-4 text-natural-white'
                            }}
                            title={'PLAN MY TRIP'}
                            onClick={onPlanTripClick}
                            className="w-full sm:w-auto"
                        />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}