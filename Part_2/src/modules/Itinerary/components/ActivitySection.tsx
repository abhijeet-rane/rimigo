import Typography from '@/components/shared/Typography'
import ActivityModalCard from './ActivityModalCard'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import clsx from 'clsx'
import { Search, X } from 'lucide-react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import { useExperienceByQueryList } from '../hooks/ItineraryHook'
import { ExperienceResult } from '@/modules/Acitvities/types/searchTypes'
import { ShortlistedByTripExperienceResponse } from '@/modules/Experiences/api/experienceShortlistAPI'

interface BaseCity {
    id: string
    name: string
    country: string
}

interface Props {
    baseCity?: BaseCity
    shortlistedExpercience: ShortlistedByTripExperienceResponse | undefined
    value: ExperienceCardData | null
    onChange: (experience: ExperienceCardData | null) => void
}

const ActivitySection = forwardRef<SlotPayloadProvider, Props>(({ baseCity, value, onChange, shortlistedExpercience }, ref) => {
    /* ---------------- Hooks (ALWAYS first) ---------------- */
    const cityId = baseCity?.id

    const [searchTerm, setSearchTerm] = useState('')
    const selectedExperience = value

    const isSearching = searchTerm.trim().length > 0
    const { data: searchData, isLoading: isSearchLoading } = useExperienceByQueryList(searchTerm)

    const searchedExperiences: ExperienceResult[] = searchData ?? []

    /* ---------------- PROVIDER (ADDED) ---------------- */
    useImperativeHandle(
        ref,
        () => ({
            getPayload() {
                if (!selectedExperience) {
                    return null
                }

                const payload = {
                    entity_id: selectedExperience.id,
                    entity_model: 'experiences'
                }
                return payload
            }
        }),
        [selectedExperience]
    )

    /* ---------------- Transform shortlisted experiences to ExperienceCardData format ---------------- */
    const shortlistedExperiencesData = useMemo(() => {
        if (!shortlistedExpercience?.results) return []

        return shortlistedExpercience.results
            .filter((item) => item.experience) // Filter out items without experience
            .map(
                (item) =>
                    ({
                        id: item.experience!.id,
                        title: item.experience!.name || '',
                        name: item.experience!.name,
                        city_name: item.experience!.base_city?.name || '',
                        city_id: baseCity?.id || '',
                        price: {
                            lower_bound: item.experience!.price?.lower_bound || null,
                            upper_bound: item.experience!.price?.upper_bound || null,
                            currency: item.experience!.price?.currency || null
                        },
                        image: item.experience!.display_props?.landscape_image || '',
                        images: [item.experience!.display_props?.landscape_image || ''].filter(Boolean),
                        suggestion_priority: null,
                        experience_recommended: null,
                        reason_of_suggestion: [],
                        short_description: null,
                        categories: item.experience!.categories || null
                    }) as ExperienceCardData
            )
    }, [shortlistedExpercience, baseCity])

    /* ---------------- Derived data (useMemo) ---------------- */
    const suggestedExperiences = useMemo(() => {
        // Filter out the selected experience from suggestions
        return shortlistedExperiencesData.filter((exp) => exp.id !== selectedExperience?.id)
    }, [shortlistedExperiencesData, selectedExperience])

    const filteredExperiences = useMemo(() => {
        if (!isSearching) return []

        return searchedExperiences.filter((exp) => exp.id !== selectedExperience?.id)
    }, [searchedExperiences, selectedExperience, isSearching])

    /* ---------------- Handlers ---------------- */
    const handleAdd = (id: string) => {
        const searched = searchedExperiences.find((e) => e.id === id)
        if (searched) {
            onChange({
                id: searched.id,
                title: searched.name,
                image: searched.landscape_image ?? searched.portrait_image ?? ''
            } as ExperienceCardData)
            setSearchTerm('')
            return
        }

        const shortlisted = shortlistedExperiencesData.find((e) => e.id === id)
        if (!shortlisted) return

        onChange(shortlisted)
        setSearchTerm('')
    }

    const handleRemove = () => {
        onChange(null)
    }

    /* ---------------- UI guards ---------------- */
    if (!cityId) {
        return <div className="text-sm text-grey-500">Select a city first</div>
    }

    if (!shortlistedExpercience) {
        return <div>Loading activities…</div>
    }

    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col gap-4 min-h-0 ">
            {/* SEARCH BAR */}
            <div
                className={clsx(
                    'flex items-center gap-2 w-full border rounded-[12px] px-4 py-2 bg-natural-white transition-colors',
                    isSearching ? 'border-primary-default shadow-sm' : 'border-grey-4'
                )}>
                {!isSearching && !selectedExperience && (
                    <Search
                        size={18}
                        className="text-grey-2"
                    />
                )}

                <div className="flex flex-wrap gap-2 w-full">
                    {selectedExperience && (
                        <div className="flex items-center gap-2 px-2 py-1 border rounded-full border-grey-4">
                            <img
                                src={selectedExperience.images?.[0] ?? selectedExperience.image}
                                className="w-5 h-5 rounded-sm object-cover"
                                alt={selectedExperience.title}
                            />
                            <Typography
                                size="12"
                                weight="medium">
                                {selectedExperience.title}
                            </Typography>
                            <button onClick={handleRemove}>
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={selectedExperience ? '' : 'Search experiences'}
                        className="grow min-w-[120px] outline-none bg-transparent text-sm font-manrope text-grey-0 placeholder:text-grey-3"
                    />
                </div>
            </div>

            {isSearching && (
                <>
                    {isSearchLoading && (
                        <Typography
                            size="14"
                            className="text-grey-500">
                            Searching experiences…
                        </Typography>
                    )}

                    {!isSearchLoading && filteredExperiences.length === 0 && (
                        <Typography
                            size="14"
                            className="text-grey-500">
                            No experiences found
                        </Typography>
                    )}

                    {!isSearchLoading && filteredExperiences.length > 0 && (
                        <div className="text-[11px] font-manrope text-grey-2 px-0.5">
                            {filteredExperiences.length} result{filteredExperiences.length !== 1 ? 's' : ''}
                        </div>
                    )}

                    <div className="max-h-[40vh] overflow-y-auto scrollbar-hide">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {filteredExperiences.map((exp) => (
                                <ActivityModalCard
                                    key={exp.id}
                                    id={exp.id}
                                    imageUrl={exp.landscape_image ?? exp.portrait_image ?? ''}
                                    description={exp.name}
                                    cityName={exp.city_name}
                                    countryName={exp.country_name}
                                    onAdd={handleAdd}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* DEFAULT VIEW */}
            {!isSearching && (
                <>
                    <div className="flex flex-col gap-2 bg-primary-default/5 rounded-[14px] border border-primary-default/20 p-4">
                        <Typography
                            size="14"
                            weight="semibold">
                            Suggested Activities
                        </Typography>
                        {suggestedExperiences.length === 0 && (
                            <div className="flex justify-center py-1 pb-2">
                                <Typography
                                    size="14"
                                    family="manrope"
                                    color="grey-2">
                                    No suggestions available for this city
                                </Typography>
                            </div>
                        )}
                        {suggestedExperiences.length > 0 && (
                            <div className="max-h-[50vh] overflow-y-auto scrollbar-hide">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {suggestedExperiences.map((exp) => (
                                        <ActivityModalCard
                                            key={exp.id}
                                            id={exp.id}
                                            imageUrl={exp.images?.[0] ?? exp.image}
                                            description={exp.title}
                                            cityName={exp.city_name}
                                            onAdd={handleAdd}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
})

ActivitySection.displayName = 'ActivitySection'

export default ActivitySection
