import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import ExperienceSeasonalInformationColumns, { SeasonalColumn } from '../components/SeasonalInformation/ExperienceSeasonalInformationColumns'
import { SeasonalInformationType } from '@/modules/Experiences/types/experienceDetailTypes'
import MonthSelectorDropdown from '../components/SeasonalInformation/MonthSelectorDropdown'
import { useMemo, useState, useEffect } from 'react'
import SectionTitle from '@/components/shared/Sections/SectionTitle'

const SECTION_TITLE = 'Seasonal information'
const SUBTITLE = 'Decide the best time to visit based on your preferences.'
const MONTRH_FROM_TRIP_TEXT = 'In your trip month'

const getChipTitle = (crowd_levels: { level: string; description: string }) => {
    if (crowd_levels.level === 'high') {
        return { text: 'HIGH', color: 'bg-secondary-red' }
    }
    if (crowd_levels.level === 'medium') {
        return { text: 'MEDIUM', color: 'bg-secondary-orange' }
    }
    return { text: 'LOW', color: 'bg-secondary-green' }
}

const getPeakSeasonChipTitle = (peak_season: boolean | null) => {
    if (peak_season === null) {
        return { text: '', color: '' }
    }
    if (peak_season) {
        return { text: 'YES', color: 'bg-grey-1' }
    }
    return { text: 'NO', color: 'bg-grey-1' }
}

const getPriceHigherThanUsualChipTitle = (price_higher_than_usual: boolean | null) => {
    if (price_higher_than_usual === null) {
        return { text: '', color: '' }
    }
    if (price_higher_than_usual) {
        return { text: 'HIGHER THAN USUAL', color: 'bg-secondary-red' }
    }
    return { text: 'LOWER THAN USUAL', color: 'bg-secondary-green' }
}

const getAvailabilityChipTitle = (availability: { is_available: boolean | null; restrictions: string | null }) => {
    if (availability.is_available === null) {
        return { text: '', color: '' }
    }
    if (availability.is_available) {
        return { text: 'YES', color: 'bg-secondary-green' }
    }
    return { text: 'NO', color: 'bg-grey-5' }
}

/*
| **Temperature Range (°C)** | **Suggested Color** | **Tailwind Class (if using)** | **Notes**                   |
| -------------------------- | ------------------- | ----------------------------- | --------------------------- |
| **≤ 0°C (Freezing)**       | `#60A5FA`           | `bg-blue-400`                 | Cool icy blue               |
| **1–10°C (Cold)**          | `#3B82F6`           | `bg-blue-500`                 | Brighter cold tone          |
| **11–20°C (Mild)**         | `#10B981`           | `bg-emerald-500`              | Pleasant green tone         |
| **21–30°C (Warm)**         | `#FACC15`           | `bg-yellow-400`               | Sunny warm yellow           |
| **31–40°C (Hot)**          | `#FB923C`           | `bg-orange-400`               | Noticeable heat             |
| **41–50°C (Very Hot)**     | `#F97316`           | `bg-orange-500`               | Strong orange tone          |
| **51–60°C (Extreme)**      | `#EF4444`           | `bg-red-500`                  | Red – dangerously hot       |
| **> 60°C (Critical)**      | `#B91C1C`           | `bg-red-700`                  | Deep red – critical warning |

*/

const getWeatherChipColor = (temperature: number | null) => {
    if (temperature === null) {
        return 'bg-grey-3'
    }
    if (temperature <= 0) {
        return 'bg-blue-400'
    }
    if (temperature <= 10) {
        return 'bg-blue-500'
    }
    if (temperature <= 20) {
        return 'bg-emerald-500'
    }
    if (temperature <= 30) {
        return 'bg-yellow-400'
    }
    if (temperature <= 50) {
        return 'bg-orange-500'
    }
    if (temperature <= 60) {
        return 'bg-red-500'
    }
    return 'bg-red-700'
}

const getMonthSeasonDetailsForColumns = (month: string, month_data: SeasonalInformationType[keyof SeasonalInformationType]) => {
    const safeText = (text: string) => (text && text.trim().length > 0 ? text : 'Data not available')
    return {
        month: month,
        columns: [
            {
                title: 'Avg Temperature',
                icon: 'weather',
                description: '',
                chip_title: month_data.weather?.average_temperature ? month_data.weather.average_temperature + ' °C' : 'Data not available',
                chip_color: getWeatherChipColor(month_data.weather?.average_temperature ?? null)
            },
            {
                title: 'Availability',
                icon: 'calendar',
                description: '',
                chip_title: safeText(getAvailabilityChipTitle(month_data.availability).text),
                chip_color: getAvailabilityChipTitle(month_data.availability).color
            },

            {
                title: 'Crowd Levels',
                icon: 'crowd',
                description: '',
                chip_title: safeText(getChipTitle(month_data.crowd_levels).text),
                chip_color: getChipTitle(month_data.crowd_levels).color
            },
            {
                title: 'Peak Season',
                icon: 'peak',
                description: '',
                chip_title: safeText(getPeakSeasonChipTitle(month_data.is_peak_season).text),
                chip_color: getPeakSeasonChipTitle(month_data.is_peak_season).color
            },
            {
                title: 'Price',
                icon: 'price',
                description: '',
                chip_title: safeText(getPriceHigherThanUsualChipTitle(month_data.is_price_higher_than_usual).text),
                chip_color: getPriceHigherThanUsualChipTitle(month_data.is_price_higher_than_usual).color
            }
        ] as SeasonalColumn[]
    }
}

const ExperienceSeasonalInformation = ({
    seasonalInformation,
    initialMonth
}: {
    seasonalInformation: SeasonalInformationType
    initialMonth?: Date | null
}) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // Get trip month name from initialMonth if available
    const tripMonthName = useMemo(() => {
        if (initialMonth) {
            return monthNames[initialMonth.getMonth()]
        }
        return null
    }, [initialMonth])

    // Use initialMonth if available, otherwise fall back to current month
    const getInitialMonth = () => {
        if (initialMonth) {
            return monthNames[initialMonth.getMonth()]
        }
        return monthNames[new Date().getMonth()]
    }

    const currentMonthDefault = getInitialMonth()
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault)

    // Determine if selected month matches trip month
    const isMonthAvailableFromParams = tripMonthName !== null && selectedMonth === tripMonthName

    // Sync selectedMonth when initialMonth prop changes
    useEffect(() => {
        if (initialMonth) {
            const monthName = monthNames[initialMonth.getMonth()]
            setSelectedMonth(monthName)
        }
    }, [initialMonth])

    const monthKey = selectedMonth.toLowerCase()
    const monthData = seasonalInformation?.[monthKey]

    const { columns } = useMemo(() => {
        if (!monthData) {
            const empty: SeasonalColumn[] = [
                { title: 'Availability', icon: 'calendar', chip_title: 'Data not available', chip_color: 'bg-grey-3', description: '' },
                { title: 'Weather', icon: 'weather', chip_title: 'Data not available', chip_color: 'bg-grey-3', description: '' },
                { title: 'Crowd Levels', icon: 'crowd', chip_title: 'Data not available', chip_color: 'bg-grey-3', description: '' },
                { title: 'Peak Season', icon: 'peak', chip_title: 'Data not available', chip_color: 'bg-grey-3', description: '' },
                { title: 'Price Higher Than Usual', icon: 'price', chip_title: 'Data not available', chip_color: 'bg-grey-3', description: '' }
            ]
            return { columns: empty }
        }
        return getMonthSeasonDetailsForColumns(selectedMonth, monthData)
    }, [selectedMonth, monthData])

    return (
        <GenericCard className="px-0 pb-0">
            <div className="flex items-center justify-between gap-5 text-[14px] px-4">
                <div className="">
                    <SectionTitle title={SECTION_TITLE} />
                    <p className="text-xs tracking-[-0.02em] leading-4 font-medium font-manrope text-grey-2">{SUBTITLE}</p>
                </div>
                <div>
                    {isMonthAvailableFromParams && (
                        <p className="text-xs tracking-[-0.02em] leading-4 font-medium font-manrope text-primary-default">{MONTRH_FROM_TRIP_TEXT}</p>
                    )}
                    <MonthSelectorDropdown
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        placeholder="Select Month"
                    />
                </div>
                {/* <ReviewChip
                    text={overallVariant as 'not_recommended' | 'recommended' | null}
                    variant={overallVariant as 'not_recommended' | 'recommended' | null}
                /> */}
            </div>
            <GenericCard className=" mt-4 rounded-t-none p-4  border-t border-b-0 border-l-0 border-r-0">
                <ExperienceSeasonalInformationColumns columns={columns} />

                {/* <div className="my-4">
                    <Divider />
                </div> */}

                {/* <div className="self-stretch flex items-center justify-between gap-5 text-[14px]">
                    <div className="flex items-center gap-3">
                        <div className="rounded-[28px] bg-white border-gainsboro border-solid border-[1px] flex items-center py-1.5 px-3 gap-2">
                            <img
                                className="h-5 w-5 relative object-cover"
                                alt=""
                            />
                            <div className="flex items-center gap-1">
                                <b className="relative tracking-num-0_01 leading-num-18">4.2</b>
                                <div className="relative text-num-12 tracking-num-0_01 font-medium font-manrope text-dimgray">(1.3k reviews)</div>
                            </div>
                        </div>
                        <div className="rounded-[28px] bg-white border-gainsboro border-solid border-[1px] flex items-center py-1.5 px-3 gap-2">
                            <img
                                className="h-5 w-5 relative object-cover"
                                alt=""
                            />
                            <div className="flex items-center gap-1">
                                <b className="relative tracking-num-0_01 leading-num-18">4.2</b>
                                <div className="relative text-num-12 tracking-num-0_01 font-medium font-manrope text-dimgray">(1.3k reviews)</div>
                            </div>
                        </div>
                        <div className="rounded-[28px] bg-white border-gainsboro border-solid border-[1px] flex items-center py-1.5 px-3 gap-2">
                            <img
                                className="h-5 w-5 relative object-cover"
                                alt=""
                            />
                            <div className="flex items-center gap-1">
                                <b className="relative tracking-num-0_01 leading-num-18">4.2</b>
                                <div className="relative text-num-12 tracking-num-0_01 font-medium font-manrope text-dimgray">(1.3k reviews)</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <b className="relative tracking-num-0_01 leading-5">See all reviews</b>
                        <img
                            className="h-5 w-5 relative"
                            alt=""
                        />
                    </div>
                </div> */}
            </GenericCard>
        </GenericCard>
    )
}

export default ExperienceSeasonalInformation
