import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import { getLucideIcon } from '@/constants/lucideIconMap'
import { AdaptedExperienceDetailsType } from '../../../types'
import { RecommendedMode, BookingWindow } from '../../../types/experienceDetailTypes'
import { Check, X } from 'lucide-react'
import Divider from '@/components/shared/Divider/Divider'

// Icon mapping for category headers
const CategoryIconMap: Record<string, string> = {
    mobility: 'Accessibility',
    pregnancy: 'Baby',
    pets: 'Heart',
    driving: 'Car',
    age: 'Users'
} as const

interface AdditionalInfoSectionProps {
    constraints?: AdaptedExperienceDetailsType['constraints']
    isTicketRequired?: boolean | null
    recommendedMode?: RecommendedMode | null
    bookingWindow?: BookingWindow | null
}

interface ConstraintItem {
    key: string
    label: string
    value: boolean
}

interface CategoryData {
    category: string
    categoryLabel: string
    items: ConstraintItem[]
}

// Helper to format key to readable label
const formatLabel = (key: string): string => {
    return key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

const AdditionalInfoSection = ({ constraints }: AdditionalInfoSectionProps) => {
    // Get mobility constraints
    const getMobilityData = (): CategoryData => {
        const items: ConstraintItem[] = []
        if (constraints?.mobility) {
            const mobility = constraints.mobility as Record<string, unknown>
            Object.entries(mobility).forEach(([key, value]) => {
                if (typeof value === 'boolean' && key !== 'description') {
                    items.push({
                        key: `mobility_${key}`,
                        label: formatLabel(key),
                        value: value as boolean
                    })
                }
            })
        }
        return {
            category: 'mobility',
            categoryLabel: 'Mobility',
            items
        }
    }

    // Get pregnancy constraints
    const getPregnancyData = (): CategoryData => {
        const items: ConstraintItem[] = []
        const constraintsRecord = constraints as Record<string, unknown> | undefined
        const pregnancy = constraintsRecord?.pregnancy as Record<string, unknown> | undefined
        if (pregnancy) {
            if (typeof pregnancy.is_suitable === 'boolean') {
                items.push({
                    key: 'pregnancy_is_suitable',
                    label: pregnancy.is_suitable ? 'Suitable for pregnancy' : 'Not suitable for pregnancy',
                    value: pregnancy.is_suitable as boolean
                })
            }
            if (typeof pregnancy.is_allowed === 'boolean') {
                items.push({
                    key: 'pregnancy_is_allowed',
                    label: pregnancy.is_allowed ? 'Allowed during pregnancy' : 'Not allowed during pregnancy',
                    value: pregnancy.is_allowed as boolean
                })
            }
        }
        return {
            category: 'pregnancy',
            categoryLabel: 'Pregnancy',
            items
        }
    }

    // Get pets constraints
    const getPetsData = (): CategoryData => {
        const items: ConstraintItem[] = []
        const constraintsRecord = constraints as Record<string, unknown> | undefined
        const pets = constraintsRecord?.pets as Record<string, unknown> | undefined
        if (pets) {
            if (typeof pets.are_allowed === 'boolean') {
                items.push({
                    key: 'pets_are_allowed',
                    label: pets.are_allowed ? 'Pets allowed' : 'Pets not allowed',
                    value: pets.are_allowed as boolean
                })
            } else if (typeof pets.are_suitable === 'boolean') {
                items.push({
                    key: 'pets_are_suitable',
                    label: pets.are_suitable ? 'Pets allowed' : 'Pets not allowed',
                    value: pets.are_suitable as boolean
                })
            }
        }
        return {
            category: 'pets',
            categoryLabel: 'Pets',
            items
        }
    }

    // Get driving constraints
    const getDrivingData = (): CategoryData => {
        const items: ConstraintItem[] = []
        const constraintsRecord = constraints as Record<string, unknown> | undefined
        const driving = constraintsRecord?.driving_constraints as Record<string, unknown> | undefined
        if (driving) {
            if (typeof driving.driving_license_required === 'boolean') {
                items.push({
                    key: 'driving_license_required',
                    label: formatLabel('driving_license_required'),
                    value: !(driving.driving_license_required as boolean) // Invert: true means NOT required (good)
                })
            }
            if (typeof driving.idp_required === 'boolean') {
                items.push({
                    key: 'idp_required',
                    label: formatLabel('idp_required'),
                    value: !(driving.idp_required as boolean) // Invert: true means NOT required (good)
                })
            }
        }
        return {
            category: 'driving',
            categoryLabel: 'Driving',
            items
        }
    }

    // Get age data
    const getAgeData = (): CategoryData => {
        const items: ConstraintItem[] = []
        if (constraints?.age) {
            const { minimum, maximum } = constraints.age
            const hasMinValue = minimum !== null && minimum !== undefined
            const hasMaxValue = maximum !== null && maximum !== undefined

            // Do not show age column if both min and max are missing or explicitly 0
            if ((!hasMinValue || minimum === 0) && (!hasMaxValue || maximum === 0)) {
                return {
                    category: 'age',
                    categoryLabel: 'Age',
                    items
                }
            }

            if (hasMinValue && hasMaxValue) {
                if (minimum === 0 && maximum === 100) {
                    items.push({
                        key: 'age_all_ages',
                        label: 'Suitable for all ages',
                        value: true
                    })
                } else {
                    let ageLabel = ''
                    if (minimum > 0 && maximum < 100) {
                        ageLabel = `Ages ${minimum}-${maximum}`
                    } else if (minimum > 0) {
                        ageLabel = `Ages ${minimum}+`
                    } else if (maximum < 100) {
                        ageLabel = `Ages up to ${maximum}`
                    }
                    if (ageLabel) {
                        items.push({
                            key: 'age_restriction',
                            label: ageLabel,
                            value: true
                        })
                    }
                }
            }
        }
        return {
            category: 'age',
            categoryLabel: 'Age',
            items
        }
    }

    const mobilityData = getMobilityData()
    const pregnancyData = getPregnancyData()
    const petsData = getPetsData()
    const drivingData = getDrivingData()
    const ageData = getAgeData()

    // Check if we have any data to show
    const hasData =
        mobilityData.items.length > 0 ||
        pregnancyData.items.length > 0 ||
        petsData.items.length > 0 ||
        drivingData.items.length > 0 ||
        ageData.items.length > 0

    if (!hasData) return null

    // Render a category column
    const renderCategory = (categoryData: CategoryData) => {
        const iconName = CategoryIconMap[categoryData.category]
        const IconEl = iconName ? getLucideIcon(iconName, 18, 18) : null

        return (
            <div
                key={categoryData.category}
                className="flex flex-col gap-2">
                {/* Category Header */}
                <div className="flex items-center gap-2">
                    {IconEl && <span className="shrink-0">{IconEl}</span>}
                    <span
                        style={{
                            color: '#000',
                            fontFamily: 'Red Hat Display',
                            fontSize: '16px',
                            fontStyle: 'normal',
                            fontWeight: 467,
                            lineHeight: '20px',
                            letterSpacing: '-0.16px'
                        }}>
                        {categoryData.categoryLabel}
                    </span>
                </div>
                {/* Category Items */}
                <div className="flex flex-col gap-1.5">
                    {categoryData.items.map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center gap-2">
                            {item.value ? (
                                <Check
                                    className="w-4 h-4 shrink-0"
                                    style={{ color: 'var(--color-secondary-green, #26BC6D)' }}
                                />
                            ) : (
                                <X
                                    className="w-4 h-4 shrink-0"
                                    style={{ color: 'var(--color-secondary-red, #E73434)' }}
                                />
                            )}
                            <span
                                style={{
                                    color: 'var(--grey-2, #747474)',
                                    fontFamily: 'Manrope',
                                    fontSize: '14px',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    lineHeight: '20px'
                                }}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="max-md:px-[20px]">
            <div className="mb-4 ">
                <SectionTitle title="Additional info" />
                <div
                    className="mt-2"
                    style={{
                        color: 'var(--grey-2, #747474)',
                        fontFamily: 'Manrope',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: 'normal',
                        letterSpacing: '-0.28px'
                    }}>
                    Here's what you need to know about this experience
                </div>
            </div>
            <GenericCard className="flex flex-col gap-6 pt-[22px] max-md:rounded-[16px] max-md:border border-grey-4 max-md:mb-4">
                {/* First Row: Mobility, Pregnancy, Pets */}
                {(mobilityData.items.length > 0 || pregnancyData.items.length > 0 || petsData.items.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {mobilityData.items.length > 0 && renderCategory(mobilityData)}
                        {mobilityData.items.length > 0 && <Divider className="md:hidden" />}
                        {pregnancyData.items.length > 0 && renderCategory(pregnancyData)}
                        {pregnancyData.items.length > 0 && <Divider className="md:hidden" />}

                        {petsData.items.length > 0 && renderCategory(petsData)}
                        {petsData.items.length > 0 && <Divider className="md:hidden" />}
                    </div>
                )}
                {/* Second Row: Driving, Age, Empty */}
                {(drivingData.items.length > 0 || ageData.items.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {drivingData.items.length > 0 && renderCategory(drivingData)}
                        {drivingData.items.length > 0 && <Divider className="md:hidden" />}

                        {ageData.items.length > 0 && renderCategory(ageData)}
                        <div></div>
                    </div>
                )}
            </GenericCard>
        </div>
    )
}

export default AdditionalInfoSection
