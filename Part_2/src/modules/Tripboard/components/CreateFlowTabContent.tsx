import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTripboardPreview, getCountryBasicInfo } from '@/api/curation/tripboardPreviewAPI'
import { getCountryCities } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import OverviewTabContent from '@/modules/ContentCollection/components/OverviewTabContent'
import type { OverviewData } from '@/modules/ContentCollection/adapter/overviewAdapter'
import TopCitiesSection from '@/modules/Acitvities/sections/TopCitiesSection'
import TripboardCountryExploreSection from './TripboardCountryExploreSection'
import { DiscoverWatchAlongPanel } from '@/pages/Landing/Components/DiscoverWatchAlongPanel'
import { useExperiencesWithShorts } from '@/modules/Experiences/hooks/useExperiencesWithShorts'
import { useExperiencesExplore } from '@/modules/Acitvities/hooks/useExperiencesExplore'
import { useCountryCities } from '@/modules/Acitvities/hooks/useCountryCities'
import ShortsModal from '@/modules/WatchAlong/components/ShortsModal'
import { Wifi, Link2, Lightbulb, FileCheck, Lock, MapPin, Building2, UtensilsCrossed, Compass, Plus, Loader2, Globe, Plane, ArrowUpRight } from 'lucide-react'
import { getPlatformLogoURL, extractPlatformNameFromUrl } from '@/constants/icons/platformIcons'
import { LINK_ICON } from '@/constants/thiingsIcons'
// PROVIDER_LOGOS used by dummy stays data via StaysCardListView
import { StaysCardListView } from '@/pages/Stays/Components/StaysCardListView'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import TourCard from '@/modules/Experiences/components/ExperienceDetails/components/HowToBook/TourCard'
import type { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import { BULB_ICON } from '@/constants/thiingsIcons'
import { DosDonts } from '@/components/shared/DosDonts'
import ReactMarkdown from 'react-markdown'

export type CreateFlowTab = 'overview' | 'must_have' | 'stays' | 'experience' | 'restaurant'

interface CreateFlowTabContentProps {
    tab: CreateFlowTab
    countryIds: string[]
    /** Called when the user clicks the CTA on a locked tab to go back to itinerary */
    onGoToItinerary?: () => void
    /** When 'generating', stays/activities/food show shimmer loading instead of locked overlay */
    generatingState?: 'generating'
}

/**
 * Renders tab content during the create flow (before tripboard exists).
 * Fetches data from the tripboard-preview and country-basic-info APIs.
 * For overview: reuses OverviewTabContent with adapted data.
 * For must_have and tips: renders directly from preview API data.
 */
const CreateFlowTabContent: React.FC<CreateFlowTabContentProps> = ({ tab, countryIds, onGoToItinerary, generatingState }) => {
    // Locked/generating tabs — show dummy content with overlay
    if (tab === 'stays' || tab === 'experience' || tab === 'restaurant') {
        return (
            <LockedTabContent
                tab={tab}
                countryIds={countryIds}
                onGoToItinerary={onGoToItinerary}
                isGenerating={generatingState === 'generating'}
            />
        )
    }

    // Data tabs — delegate to component that uses hooks
    return <DataTabContent tab={tab} countryIds={countryIds} onGoToItinerary={onGoToItinerary} />
}

/** Renders overview/must_have/tips tabs with fetched data */
const DataTabContent: React.FC<{ tab: 'overview' | 'must_have'; countryIds: string[]; onGoToItinerary?: () => void }> = ({ tab, countryIds, onGoToItinerary }) => {
    const primaryCountryId = countryIds[0] ?? null

    const { data: previewData, isLoading: isPreviewLoading } = useQuery({
        queryKey: ['create-flow-preview', ...countryIds],
        queryFn: () => getTripboardPreview(countryIds),
        enabled: countryIds.length > 0,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const { data: countryInfo, isLoading: isCountryLoading } = useQuery({
        queryKey: ['create-flow-country-info', primaryCountryId],
        queryFn: () => getCountryBasicInfo(primaryCountryId!),
        enabled: !!primaryCountryId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Merge preview data across countries
    const merged = useMemo(() => {
        if (!previewData) return { tips: [] as { label: string; text: string }[], dos: [] as string[], donts: [] as string[], links: {} as Record<string, any[]> }
        const tips: { label: string; text: string }[] = []
        const dos: string[] = []
        const donts: string[] = []
        const links: Record<string, any[]> = {}
        const seenTips = new Set<string>()
        const seenDos = new Set<string>()
        const seenDonts = new Set<string>()
        const seenLinks = new Set<string>()

        for (const countryData of Object.values(previewData)) {
            for (const tip of countryData.tips ?? []) {
                if (!seenTips.has(tip.text)) { seenTips.add(tip.text); tips.push(tip) }
            }
            for (const d of countryData.dos ?? []) {
                if (!seenDos.has(d)) { seenDos.add(d); dos.push(d) }
            }
            for (const d of countryData.donts ?? []) {
                if (!seenDonts.has(d)) { seenDonts.add(d); donts.push(d) }
            }
            for (const [cat, catLinks] of Object.entries(countryData.links ?? {})) {
                if (!links[cat]) links[cat] = []
                for (const link of catLinks) {
                    if (!seenLinks.has(link.url)) { seenLinks.add(link.url); links[cat].push(link) }
                }
            }
        }
        return { tips, dos, donts, links }
    }, [previewData])

    const isLoading = isPreviewLoading || isCountryLoading

    if (isLoading) {
        return (
            <div className="p-4 max-w-[900px] mx-auto space-y-4">
                {[1, 2, 3].map(i => <CustomShimmer key={i} height={120} radius={16} />)}
            </div>
        )
    }

    switch (tab) {
        case 'overview':
            return <OverviewContent countryInfo={countryInfo} countryIds={countryIds} primaryCountryId={primaryCountryId} onGoToItinerary={onGoToItinerary} />
        case 'must_have':
            return (
                <MustHaveContent
                    links={merged.links}
                    tips={merged.tips}
                    dos={merged.dos}
                    donts={merged.donts}
                    countryName={countryInfo?.country_name}
                />
            )
        default:
            return null
    }
}

// ── Overview — reuses OverviewTabContent ─────────────────────────

const OverviewContent: React.FC<{
    countryInfo: any
    countryIds: string[]
    primaryCountryId: string | null
    onGoToItinerary?: () => void
}> = ({ countryInfo, countryIds, primaryCountryId, onGoToItinerary }) => {
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)

    // Fetch shorts for the country
    const {
        experiences: shorts,
        isLoading: isShortsLoading,
        hasMore,
        loadMore,
        isLoadingMore
    } = useExperiencesWithShorts({
        countryId: primaryCountryId,
        limit: 12,
        enabled: !!primaryCountryId,
        suggestionPriority: '0'
    })

    // Build OverviewData from country basic info
    const overviewData: OverviewData = useMemo(() => {
        return {
            images: [],
            title: countryInfo?.country_name ?? '',
            description: ''
        }
    }, [countryInfo])

    return (
        <>
            <OverviewTabContent
                overviewData={overviewData}
                countryId={primaryCountryId ?? undefined}
                tripRouteTitle="Cities covered"
                hideInfoCards
                hideDescription
                highlightsTitleLine1="Trip"
                highlightsTitleLine2="Highlights"
                extraContent={
                    <>
                        {/* Dummy photo grid with real activity images — at the top */}
                        <div className="mb-8 px-3 md:px-0">
                            <DummyPhotoGridWithBlur countryId={primaryCountryId} onGoToItinerary={onGoToItinerary} />
                        </div>
                        {countryIds.length > 0 && (
                            <TripboardCountryExploreSection countryIds={countryIds} />
                        )}
                    </>
                }
                extraContentAfterHighlights={
                    <>
                        {/* Shorts carousel */}
                        {(isShortsLoading || shorts.length > 0) && (
                            <div className="mb-12">
                                <DiscoverWatchAlongPanel
                                    shorts={shorts}
                                    isLoading={isShortsLoading}
                                    hasMore={hasMore}
                                    onLoadMore={loadMore}
                                    isLoadingMore={isLoadingMore}
                                    onShortClick={(index) => {
                                        setSelectedShortIndex(index)
                                        setIsShortsModalOpen(true)
                                    }}
                                    PageName="tripboard_create_overview"
                                />
                            </div>
                        )}

                        {/* Dummy highlights with blur overlay */}
                        <div className="mb-12">
                            <DummyHighlightsWithBlur onGoToItinerary={onGoToItinerary} />
                        </div>

                        {/* Dummy trip route with real city names + blur overlay */}
                        <div className="mb-12 relative">
                            <DummyTripRouteWithBlur countryId={primaryCountryId} onGoToItinerary={onGoToItinerary} />
                        </div>

                        {/* Top cities */}
                        {primaryCountryId && (
                            <div className="mb-12">
                                <TopCitiesSection countryId={primaryCountryId} />
                            </div>
                        )}
                    </>
                }
            />

            {/* Shorts modal */}
            {isShortsModalOpen && shorts.length > 0 && (
                <ShortsModal
                    isOpen={isShortsModalOpen}
                    onClose={() => setIsShortsModalOpen(false)}
                    experiences={shorts}
                    initialIndex={selectedShortIndex}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    isLoadingMore={isLoadingMore}
                />
            )}
        </>
    )
}

/** Dummy highlights section with blur overlay */
const DummyHighlightsWithBlur: React.FC<{ onGoToItinerary?: () => void }> = ({ onGoToItinerary }) => {
    const stats = [
        { icon: Globe, label: 'country', value: 1 },
        { icon: MapPin, label: 'cities', value: 4 },
        { icon: Plane, label: 'flights', value: 2 },
        { icon: Compass, label: 'activities', value: 12 },
        { icon: Building2, label: 'stays', value: 3 },
        { icon: UtensilsCrossed, label: 'restaurants', value: 15 },
    ]

    return (
        <div className="relative rounded-2xl overflow-hidden">
            <div className="bg-white border border-grey-4/50 rounded-2xl p-5 sm:p-6 pointer-events-none select-none">
                <p className="text-primary-default font-red-hat-display text-[14px] font-medium italic mb-0.5">Key trip</p>
                <h3 className="text-[22px] font-bold font-red-hat-display text-grey-0 mb-5">
                    Highlights
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                            <stat.icon className="w-5 h-5 text-primary-default" strokeWidth={1.5} />
                            <span className="text-[22px] font-bold font-red-hat-display text-grey-0">{stat.value}</span>
                            <span className="text-[12px] font-manrope text-grey-2 font-medium">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Blur overlay */}
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-[2px] bg-white/40">
                <button
                    type="button"
                    onClick={onGoToItinerary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md border border-grey-4 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Lock className="w-4 h-4 text-primary-default" />
                    <span className="text-[13px] font-semibold font-red-hat-display text-grey-0">
                        Generate itinerary to see highlights
                    </span>
                </button>
            </div>
        </div>
    )
}

/** Dummy photo grid with real activity images and locked overlay */
const DummyPhotoGridWithBlur: React.FC<{ countryId: string | null; onGoToItinerary?: () => void }> = ({ countryId, onGoToItinerary }) => {
    const { topActivities, isLoading } = useExperiencesExplore({
        countryId,
        limit: 5,
    })

    // Extract up to 5 images from top activities
    const activityImages = useMemo(() => {
        return topActivities
            .slice(0, 5)
            .map(a => a.images?.[0] || a.image)
            .filter(Boolean)
    }, [topActivities])

    // Fallback gradients while loading or if no images
    const placeholderGradients = [
        'from-blue-200 via-purple-200 to-pink-200',
        'from-emerald-200 via-teal-200 to-cyan-200',
        'from-amber-200 via-orange-200 to-red-200',
        'from-violet-200 via-purple-200 to-fuchsia-200',
        'from-sky-200 via-blue-200 to-indigo-200',
    ]

    const renderCell = (index: number, className?: string) => {
        const imageUrl = activityImages[index]
        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt=""
                    className={`w-full h-full object-cover ${className ?? ''}`}
                    loading="lazy"
                />
            )
        }
        return <div className={`w-full h-full bg-gradient-to-br ${placeholderGradients[index % 5]} ${className ?? ''}`} />
    }

    if (isLoading) {
        return (
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-1 h-[220px] md:h-[400px] rounded-2xl overflow-hidden">
                <div className="md:col-span-2"><CustomShimmer height={400} radius={0} fill /></div>
                <div className="hidden md:grid grid-cols-2 gap-1">
                    {[0,1,2,3].map(i => <CustomShimmer key={i} height={198} radius={0} fill />)}
                </div>
            </div>
        )
    }

    return (
        <div className="relative rounded-2xl overflow-hidden">
            {/* Photo grid — matches ImageGrid layout */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-1 h-[220px] md:h-[400px] rounded-2xl overflow-hidden pointer-events-none select-none">
                {/* Large image */}
                <div className="md:col-span-2 h-full">
                    {renderCell(0)}
                </div>
                {/* 4 smaller images */}
                <div className="hidden md:grid grid-cols-2 gap-1">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-full h-full overflow-hidden">
                            {renderCell(i)}
                        </div>
                    ))}
                </div>
            </div>
            {/* Locked overlay */}
            <div className="absolute inset-0 rounded-2xl flex items-end md:items-center justify-center backdrop-blur-[3px] bg-black/15">
                <button
                    type="button"
                    onClick={onGoToItinerary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md border border-grey-4 mb-4 md:mb-0 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Lock className="w-4 h-4 text-primary-default" />
                    <span className="text-[13px] font-semibold font-red-hat-display text-grey-0">
                        Generate itinerary to see trip photos
                    </span>
                </button>
            </div>
        </div>
    )
}

/** Dummy trip route section with real city names + blur overlay */
const DummyTripRouteWithBlur: React.FC<{ countryId: string | null; onGoToItinerary?: () => void }> = ({ countryId, onGoToItinerary }) => {
    const { topCities } = useCountryCities({ countryId })

    // Real city names only 
    const dummyCities = useMemo(() => {
        const nightsPool = [2, 3, 2, 4, 1]
        const named = topCities.filter((c) => Boolean(c.cityName?.trim()))
        if (named.length > 0) {
            return named.slice(0, 5).map((c, i) => ({
                name: c.cityName!.trim(),
                nights: nightsPool[i % nightsPool.length],
            }))
        }
        return [
            { name: 'City 1', nights: 2 },
            { name: 'City 2', nights: 3 },
            { name: 'City 3', nights: 2 },
            { name: 'City 4', nights: 4 },
            { name: 'City 5', nights: 1 },
        ]
    }, [topCities])

    return (
        <div className="relative rounded-2xl overflow-hidden">
            {/* Dummy route content */}
            <div className="bg-grey-5 rounded-2xl p-4 pointer-events-none select-none">
                <h3 className="text-lg font-bold font-red-hat-display text-grey-0 mb-4">
                    Cities covered
                </h3>
                <div className="flex items-center justify-center gap-0 py-4">
                    {dummyCities.map((city, i) => (
                        <React.Fragment key={i}>
                            {/* City node */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-primary-default/10 border-2 border-primary-default flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-primary-default" />
                                </div>
                                <span className="text-[13px] font-semibold font-red-hat-display text-grey-0">{city.name}</span>
                                <span className="text-[11px] text-grey-2 font-manrope">{city.nights}N</span>
                            </div>
                            {/* Connecting line */}
                            {i < dummyCities.length - 1 && (
                                <div className="flex-1 min-w-[40px] max-w-[80px] border-t-2 border-dashed border-grey-3 mx-2 mt-[-16px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Blur overlay */}
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-[2px] bg-white/40">
                <button
                    type="button"
                    onClick={onGoToItinerary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md border border-grey-4 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Lock className="w-4 h-4 text-primary-default" />
                    <span className="text-[13px] font-semibold font-red-hat-display text-grey-0">
                        Generate itinerary to see your route
                    </span>
                </button>
            </div>
        </div>
    )
}

// ── Must Have — matches MustHaveTabContent layout ────────────────

// const CATEGORY_LABELS: Record<string, string> = {
//     visa: 'Visa',
//     sim: 'SIM / eSIM',
//     travel_insurance: 'Travel Insurance',
//     pre_bookings: 'Pre-Bookings',
//     immigration: 'Immigration',
//     transport_and_transfer_tips: 'Transport & Transfers',
//     handling_cash: 'Cash & Currency',
//     handling_cards_digital_money: 'Cards & Digital Money',
//     apps_to_be_downloaded: 'Useful Apps',
//     extra_info: 'Extra Info'
// }

/** Must Have — mirrors the post-create MustHaveTabContent layout (Tips, Useful Links, Visa, SIM). */
const MustHaveContent: React.FC<{
    links: Record<string, any[]>
    tips: { label: string; text: string }[]
    dos: string[]
    donts: string[]
    countryName?: string
}> = ({ links, tips, dos, donts }) => {
    const simLinks = links.sim ?? []
    const visaLinks = links.visa ?? []
    const otherLinks = Object.keys(links)
        .filter((k) => k !== 'sim' && k !== 'visa')
        .flatMap((cat) => links[cat] ?? [])

    const hasTips = tips.length > 0 || dos.length > 0 || donts.length > 0

    const sections: Array<{ key: string; label: string; chipLabel: string; Icon: any; kind: 'tips' | 'links'; items?: any[] }> = [
        ...(hasTips ? [{ key: 'tips', label: 'Tips', chipLabel: 'Tips', Icon: Lightbulb, kind: 'tips' as const }] : []),
        ...(otherLinks.length > 0 ? [{ key: 'links', label: 'Useful Links', chipLabel: 'Links', Icon: Link2, kind: 'links' as const, items: otherLinks }] : []),
        ...(visaLinks.length > 0 ? [{ key: 'visa', label: 'Visa', chipLabel: 'Visa', Icon: FileCheck, kind: 'links' as const, items: visaLinks }] : []),
        ...(simLinks.length > 0 ? [{ key: 'sim', label: 'SIM & Connectivity', chipLabel: 'SIM', Icon: Wifi, kind: 'links' as const, items: simLinks }] : [])
    ]

    if (sections.length === 0) {
        return (
            <div className="flex flex-col px-4 md:px-8 lg:px-0 pb-16 max-w-[900px] mx-auto">
                <div className="text-center py-12 px-4">
                    <p className="text-base font-medium font-manrope text-grey-1">
                        No essentials found for this trip yet.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col px-4 md:px-8 lg:px-0 pb-16 max-w-[900px] mx-auto">
            {/* Filter chips — same as MustHaveTabContent */}
            {sections.length > 1 && (
                <div className="flex items-center gap-2 pt-4 pb-2 sticky top-0 bg-white z-10 overflow-x-auto scrollbar-hide">
                    {sections.map(({ key, chipLabel, Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                document.getElementById(`musthave-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold font-red-hat-display transition-all cursor-pointer whitespace-nowrap border bg-white text-grey-1 border-grey-4 hover:border-primary-default/50 shrink-0"
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {chipLabel}
                        </button>
                    ))}
                </div>
            )}

            {/* Sections */}
            {sections.map((section, index) => (
                <div key={section.key} id={`musthave-section-${section.key}`}>
                    {index > 0 && <hr className="border-grey-4 my-2" />}

                    {section.kind === 'tips' ? (
                        <div className="flex flex-col gap-6 py-4">
                            {tips.length > 0 && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <p className="text-grey-0 font-semibold font-red-hat-display text-[20px] flex items-center gap-2">
                                            Tips
                                            <img src={BULB_ICON} alt="Tips" className="w-6 h-6" />
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {tips.map((tip, i) => (
                                            <div
                                                key={i}
                                                className="flex gap-4 p-4 rounded-xl bg-white border border-grey-4 items-start justify-start"
                                            >
                                                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-default-80 flex items-center justify-center font-semibold text-primary-default font-red-hat-display">
                                                    {i + 1}
                                                </div>
                                                <div className="flex flex-col gap-[2px]">
                                                    <p className="text-grey-0 font-red-hat-display text-[16px] font-medium">
                                                        {tip.label}
                                                    </p>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-grey-0 font-manrope text-[14px] font-medium text-grey-2">
                                                            <ReactMarkdown
                                                                allowedElements={['p', 'strong', 'em']}
                                                                unwrapDisallowed
                                                                components={{
                                                                    p: ({ children }) => <>{children}</>
                                                                }}>
                                                                {tip.text}
                                                            </ReactMarkdown>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {(dos.length > 0 || donts.length > 0) && (
                                <DosDonts
                                    id="createFlowDosDonts"
                                    title="Travel Dos & Don'ts"
                                    subtitle="Quick guidance for your trip"
                                    dosItems={dos}
                                    dontsItems={donts}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold font-red-hat-display text-grey-0 pt-4 pb-1">
                                {section.label}
                            </h3>
                            <div className="flex flex-col gap-3 py-2">
                                {(section.items ?? []).map((link: any, idx: number) => {
                                    const platformName = extractPlatformNameFromUrl(link.url)
                                    const logoUrl = getPlatformLogoURL(platformName) || link.logo_url
                                    return (
                                        <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full rounded-xl bg-white border border-grey-4 p-4 flex items-center gap-4 hover:border-primary-default/40 hover:shadow-sm transition-all cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-grey-5 flex items-center justify-center border border-grey-4/50">
                                                {logoUrl ? (
                                                    <img src={logoUrl} alt={link.ui_label || platformName || ''} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <img src={LINK_ICON} alt="" className="w-5 h-5 opacity-60" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[15px] font-semibold text-grey-0 font-red-hat-display truncate">
                                                    {link.ui_label || link.provider || platformName || 'Provider'}
                                                </h4>
                                                {link.description && (
                                                    <p className="text-[13px] font-manrope font-[500] text-grey-2 line-clamp-1 mt-0.5">{link.description}</p>
                                                )}
                                            </div>
                                            <div className="px-3.5 py-2 bg-white text-primary-default font-red-hat-display font-bold border border-primary-default rounded-lg hover:bg-primary-default hover:text-white transition-colors text-[13px] flex items-center gap-1.5 shrink-0 group-hover:bg-primary-default group-hover:text-white">
                                                {(link.button_label || 'BOOK').toUpperCase()}
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Locked Tabs (Stays, Activities, Food) — dummy data + overlay ──

const CITY_CHIP_DATE_RANGES = ['Apr 17 - Apr 18', 'Apr 18 - Apr 20', 'Apr 21 - Apr 25'] as const

const DUMMY_STAYS: Array<{ name: string; image: string; deals: PlatformPrice[]; price: number }> = [
    { name: 'Waldorf Astoria', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop', price: 11800, deals: [{ platform: 'Agoda', price: 11800, url: '#', is_cheapest: true }, { platform: 'Booking.com', price: 12500, url: '#' }, { platform: 'Expedia.com', price: 13200, url: '#' }] },
    { name: 'InterContinental Hotel', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop', price: 9200, deals: [{ platform: 'Agoda', price: 9200, url: '#', is_cheapest: true }, { platform: 'Booking.com', price: 9800, url: '#' }, { platform: 'Expedia.com', price: 10100, url: '#' }] },
    { name: 'Conrad Hotel & Spa', image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop', price: 14500, deals: [{ platform: 'Expedia.com', price: 14500, url: '#', is_cheapest: true }, { platform: 'Agoda', price: 14900, url: '#' }, { platform: 'Booking.com', price: 15200, url: '#' }] },
    { name: 'The Ritz-Carlton', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop', price: 17900, deals: [{ platform: 'Agoda', price: 17900, url: '#', is_cheapest: true }, { platform: 'Booking.com', price: 18500, url: '#' }, { platform: 'Expedia.com', price: 19200, url: '#' }] },
    { name: 'Four Seasons Hotel', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop', price: 21500, deals: [{ platform: 'Agoda', price: 21500, url: '#', is_cheapest: true }, { platform: 'Expedia.com', price: 22000, url: '#' }, { platform: 'Booking.com', price: 22800, url: '#' }] },
]

const DUMMY_TOUR_DATA: AdaptedTourResponseType[] = [
    { id: 'dummy-tour-1', name: 'Guided Walking Tour — 3 Hours', platform_name: 'GetYourGuide', is_recommended: true, is_personally_recommended: null, personal_recommendation_reason: null, duration: { min_duration: 180, max_duration: 180, unit: 'minute' }, rating: 4.7, link: '#', price: { min_price: 2499, max_price: 2499, currency: '₹', price_type: 'per person' }, cancellation_policy: 'Free cancellation' },
    { id: 'dummy-tour-2', name: 'Evening Sunset Cruise', platform_name: 'Headout', is_recommended: false, is_personally_recommended: null, personal_recommendation_reason: null, duration: { min_duration: 120, max_duration: 120, unit: 'minute' }, rating: 4.5, link: '#', price: { min_price: 3200, max_price: 3200, currency: '₹', price_type: 'per person' }, cancellation_policy: 'Free cancellation' },
    { id: 'dummy-tour-3', name: 'Street Food Adventure — 6 Stops', platform_name: 'GetYourGuide', is_recommended: true, is_personally_recommended: null, personal_recommendation_reason: null, duration: { min_duration: 240, max_duration: 240, unit: 'minute' }, rating: 4.8, link: '#', price: { min_price: 1899, max_price: 1899, currency: '₹', price_type: 'per person' }, cancellation_policy: 'Free cancellation' },
    { id: 'dummy-tour-4', name: 'Sacred Temples Half-Day Tour', platform_name: 'Headout', is_recommended: false, is_personally_recommended: null, personal_recommendation_reason: null, duration: { min_duration: 300, max_duration: 300, unit: 'minute' }, rating: 4.6, link: '#', price: { min_price: 2100, max_price: 2100, currency: '₹', price_type: 'per person' }, cancellation_policy: 'Non-refundable' },
]

const DUMMY_ACTIVITIES = [
    { name: 'City Walking Tour', city: 'Historic District', image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=300&fit=crop', tourIndex: 0 },
    { name: 'Sunset Boat Cruise', city: 'Harbor Area', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop', tourIndex: 1 },
    { name: 'Local Food Tour', city: 'Market Quarter', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop', tourIndex: 2 },
    { name: 'Temple & Shrine Visit', city: 'Cultural Zone', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop', tourIndex: 3 },
]

const DUMMY_FOOD = [
    { name: 'Traditional Local Kitchen', address: 'Old Town, Near Temple Gate', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop' },
    { name: 'Rooftop Fine Dining', address: 'City Center, 32nd Floor', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop' },
    { name: 'Street Food Market', address: 'Night Market, South Block', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop' },
    { name: 'Seafood Restaurant', address: 'Waterfront Pier, East Wing', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop' },
    { name: 'Artisan Cafe & Bakery', address: 'Arts District, Main Street', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop' },
    { name: 'Ramen House', address: 'Station Road, North Exit', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop' },
]

const TAB_CTA_CONFIG = {
    stays: { title: 'Stays', subtitle: 'Complete the itinerary to unlock curated hotel recommendations' },
    experience: { title: 'Activities', subtitle: 'Complete the itinerary to unlock personalized activity suggestions' },
    restaurant: { title: 'Restaurants', subtitle: 'Complete the itinerary to unlock restaurant recommendations' },
} as const

const LOCKED_TAB_PREVIEW_IMAGES: Record<string, string[]> = {
    stays: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200&h=150&fit=crop',
    ],
    experience: [
        'https://images.unsplash.com/photo-1528164344705-47542687000d?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=200&h=150&fit=crop',
    ],
    restaurant: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&h=150&fit=crop',
    ],
}

/** Dummy Stays cards — uses real StaysCardListView with hideActions */
const DummyStaysCards: React.FC = () => (
    <div className="flex flex-col gap-3">
        {DUMMY_STAYS.map((stay, i) => (
            <StaysCardListView
                key={i}
                title={stay.name}
                image={stay.image}
                sortedDeals={stay.deals}
                isDealsLoading={false}
                price={stay.price}
                onCardClick={() => {}}
                onViewDealClick={() => {}}
                onAddToCollection={null}
                hideActions
            />
        ))}
    </div>
)

/** Dummy Activity cards — uses real TourCard component */
const DummyActivityCards: React.FC = () => (
    <div className="flex flex-col gap-4">
        {DUMMY_ACTIVITIES.map((act, i) => (
            <div key={i} className="border border-grey-4 rounded-2xl w-full overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Left side — image + info */}
                    <div className="w-full md:w-[calc(49%-8px)] pr-3 py-4 pl-4">
                        <h3 className="text-[18px] md:text-[16px] font-red-hat-display leading-[18px] font-[550] text-grey-0 mb-2 flex items-center justify-between gap-2">
                            <span className="flex-1 line-clamp-2">{act.name}</span>
                            <span className="text-[14px] font-manrope font-normal text-grey-2 shrink-0 whitespace-nowrap flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-grey-2" /> {act.city}
                            </span>
                        </h3>
                        {/* Image */}
                        <div className="w-full h-[240px] rounded-2xl overflow-hidden bg-grey-5">
                            <img src={act.image} alt={act.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        {/* Buttons */}
                        <div className="hidden md:flex flex-row items-center gap-2 md:gap-3 mt-2">
                            <div className="flex-1 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-semibold text-sm text-center">
                                View Details
                            </div>
                            <div className="flex-1 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-semibold text-sm flex items-center justify-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                View on Map
                            </div>
                        </div>
                    </div>
                    {/* Right side — real TourCard */}
                    <div className="w-full md:w-[calc(51%+8px)] flex flex-col gap-2 items-center justify-center border-l border-grey-4 px-4 md:px-0 md:pl-3 md:py-4 md:pr-4 pb-4">
                        <TourCard
                            tour={DUMMY_TOUR_DATA[act.tourIndex]}
                            triggerType="dummy_preview"
                        />
                    </div>
                </div>
            </div>
        ))}
    </div>
)

/** Dummy Food cards — matches FoodCard.tsx layout */
const DummyFoodCards: React.FC = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DUMMY_FOOD.map((spot, i) => (
            <div key={i} className="group rounded-2xl bg-white overflow-hidden border border-grey-4/60">
                {/* Image — matches aspect-[16/10] */}
                <div className="relative aspect-[16/10] overflow-hidden bg-grey-5">
                    <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" loading="lazy" />
                    {/* Fake action buttons */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-grey-2" />
                        </div>
                    </div>
                </div>
                {/* Content — matches FoodCard */}
                <div className="px-3.5 pt-3 pb-3.5">
                    <h3 className="text-[18px] md:text-[16px] font-red-hat-display leading-[18px] tracking-[-0.02em] font-[550] text-grey-0 line-clamp-2">
                        {spot.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3 h-3 text-grey-1 shrink-0" />
                        <span className="text-sm font-medium font-manrope text-grey-1 line-clamp-1">{spot.address}</span>
                    </div>
                </div>
            </div>
        ))}
    </div>
)

const LockedTabContent: React.FC<{
    tab: 'stays' | 'experience' | 'restaurant'
    countryIds: string[]
    onGoToItinerary?: () => void
    isGenerating?: boolean
}> = ({ tab, countryIds, onGoToItinerary, isGenerating = false }) => {
    const ctaConfig = TAB_CTA_CONFIG[tab]
    const { data: dynamicCityChips } = useQuery({
        queryKey: ['countryCities', countryIds],
        queryFn: async () => {
            if (countryIds.length === 0) return []
            const cityResponses = await Promise.all(countryIds.map((countryId) => getCountryCities(countryId)))
            const uniqueNames: string[] = []
            for (const response of cityResponses) {
                for (const city of response.data.top_cities ?? []) {
                    const name = city.city_name?.trim()
                    if (!name) continue
                    if (!uniqueNames.includes(name)) uniqueNames.push(name)
                    if (uniqueNames.length >= 3) break
                }
                if (uniqueNames.length >= 3) break
            }
            return uniqueNames
        },
        enabled: countryIds.length > 0,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const cityChips = useMemo(() => {
        const realNames = (dynamicCityChips ?? []).filter(Boolean)
        // Only pad with "City 1/2/3" when we have no real cities (or still loading → empty array)
        if (realNames.length === 0) {
            return CITY_CHIP_DATE_RANGES.map((dates, i) => ({
                name: `City ${i + 1}`,
                dates,
                active: i === 0
            }))
        }
        return realNames.map((name, i) => ({
            name,
            dates: CITY_CHIP_DATE_RANGES[i] ?? CITY_CHIP_DATE_RANGES[CITY_CHIP_DATE_RANGES.length - 1],
            active: i === 0
        }))
    }, [dynamicCityChips])

    return (
        <div className="relative w-full h-[calc(100vh-60px)] overflow-hidden">
            {/* Dummy content behind overlay */}
            <div className="pointer-events-none select-none h-full overflow-hidden">
                <div className="flex flex-col md:flex-row h-full">
                    {/* Left: filter bar + cards list */}
                    <div className="flex-1 overflow-hidden">
                        {/* Filter/action bar — matches real tab filters */}
                        <div className="bg-white -mx-0 px-4 py-2 md:py-3">
                            <div className="flex items-center gap-3">
                                {/* Add button */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-grey-4 shrink-0 bg-white text-grey-0">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="text-[12px] font-medium font-manrope whitespace-nowrap">
                                        {tab === 'stays' ? 'Add External Stays' : tab === 'experience' ? 'Add activity' : 'Add spot'}
                                    </span>
                                </div>
                                {/* Divider */}
                                <div className="h-6 w-px bg-grey-4 shrink-0" />
                                {/* City-date chips */}
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {cityChips.map((chip, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-[24px] border shrink-0 text-[14px] font-semibold leading-[18px] font-manrope whitespace-nowrap ${
                                                chip.active
                                                    ? 'bg-primary-default-80 border-primary-default text-primary-default'
                                                    : 'bg-white border-grey-4 text-grey-0'
                                            }`}
                                        >
                                            {chip.name} · {chip.dates}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="p-4 overflow-hidden">
                            {tab === 'stays' && <DummyStaysCards />}
                            {tab === 'experience' && <DummyActivityCards />}
                            {tab === 'restaurant' && <DummyFoodCards />}
                        </div>
                    </div>

                    {/* Right: dummy map */}
                    {(tab === 'stays' || tab === 'experience' || tab === 'restaurant') && (
                        <div className="hidden md:block w-[45%] bg-[#e8e0d0] relative">
                            {/* Fake map with subtle terrain colors */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#e8e0d0] via-[#ddd8c8] to-[#d5cfbf]" />
                                {/* Roads */}
                                {[
                                    { x1: '10%', y1: '30%', x2: '90%', y2: '35%' },
                                    { x1: '40%', y1: '10%', x2: '45%', y2: '90%' },
                                    { x1: '20%', y1: '60%', x2: '80%', y2: '55%' },
                                    { x1: '60%', y1: '15%', x2: '65%', y2: '85%' },
                                ].map((road, i) => (
                                    <svg key={i} className="absolute inset-0 w-full h-full">
                                        <line x1={road.x1} y1={road.y1} x2={road.x2} y2={road.y2} stroke="#c8c0b0" strokeWidth="2" />
                                    </svg>
                                ))}
                                {/* Markers */}
                                {[
                                    { top: '25%', left: '35%' },
                                    { top: '45%', left: '55%' },
                                    { top: '30%', left: '70%' },
                                    { top: '60%', left: '40%' },
                                    { top: '50%', left: '25%' },
                                ].map((pos, i) => (
                                    <div key={i} className="absolute" style={pos}>
                                        <div className="w-7 h-7 rounded-full bg-primary-default shadow-md flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                                            <MapPin className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                ))}
                                {/* Mapbox attribution placeholder */}
                                <div className="absolute bottom-2 left-2 text-[10px] text-grey-2/50 font-manrope">
                                    Map
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Locked overlay — matches RimigoLockedOverlay purple gradient */}
            <div className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ touchAction: 'none', overscrollBehavior: 'contain' }}>
                {/* Purple gradient background — covers full container */}
                <div className="absolute inset-0 pointer-events-none [background:linear-gradient(180deg,rgba(171,114,251,0)_0%,rgba(171,114,251,0.15)_10%,rgba(171,114,251,0.3)_20%,rgba(171,114,251,0.5)_35%,rgba(171,114,251,0.7)_50%,#ab72fb_70%,#ab72fb_100%)]">
                    <div
                        className="absolute inset-0 [backdrop-filter:blur(1px)] md:[backdrop-filter:blur(8px)]"
                        style={{
                            maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 5%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%)',
                            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 5%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%)'
                        }}
                    />
                </div>

                {/* CTA card — centered in viewport */}
                <div className="relative w-full max-w-lg px-6 md:px-4 z-[60] pointer-events-auto">
                    <div className="bg-white shadow-lg md:shadow-xl rounded-2xl p-6 md:p-8 flex flex-col items-center text-center">
                        {/* Preview images — overlapping rounded images like ImageShowCase */}
                        <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-5">
                            {LOCKED_TAB_PREVIEW_IMAGES[tab].map((img, i) => (
                                <div
                                    key={i}
                                    className="w-[70px] md:w-[100px] h-[50px] md:h-[65px] rounded-lg overflow-hidden border-2 border-white shadow-md"
                                    style={{ transform: i % 2 === 1 ? 'rotate(3deg)' : 'rotate(-2deg)' }}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </div>
                            ))}
                        </div>

                        <h3 className="text-[22px] md:text-[28px] font-semibold font-red-hat-display text-grey-0 mb-2">
                            {isGenerating ? `Generating ${ctaConfig.title}...` : `Unlock ${ctaConfig.title}`}
                        </h3>
                        <p className="text-[14px] font-manrope font-medium text-grey-2 mb-6 max-w-[300px]">
                            {isGenerating
                                ? `Your ${ctaConfig.title.toLowerCase()} are being curated. This may take a moment.`
                                : ctaConfig.subtitle}
                        </p>
                        {isGenerating ? (
                            <div className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-primary-default/10">
                                <Loader2 className="w-5 h-5 text-primary-default animate-spin" />
                                <span className="text-[15px] font-semibold font-red-hat-display text-primary-default">
                                    Generating...
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onGoToItinerary}
                                className="w-full max-w-[280px] py-3.5 px-6 bg-primary-default text-white font-bold font-red-hat-display rounded-xl hover:bg-primary-default/90 transition-colors cursor-pointer text-[16px]"
                            >
                                Generate Itinerary
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreateFlowTabContent
