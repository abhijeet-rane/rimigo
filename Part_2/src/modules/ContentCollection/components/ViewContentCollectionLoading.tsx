import React from 'react'
import { Bus, Ship } from 'lucide-react'
import CustomShimmer from '@/components/shared/Shimmer'
import StaysCardSkeleton from '@/pages/Stays/Components/StaysCardSkeleton'
import CollectionTabs from './CollectionTabs'

// ── Itinerary kanban skeleton helpers (mirror the "Itinerary Loader" design) ──
// Every shimmering block is the shared CustomShimmer; non-shimmer chrome (borders,
// dots, dashed connectors, the "Add stay" buttons, transfer/ferry labels) is plain
// markup, exactly as in the design. CustomShimmer forces width:100%, so block widths
// come from sized parent wrappers.
// Standard design tokens — grey-4 is the shared skeleton fill (same as
// --shimmer-color and the canonical StaysCardSkeleton); grey-3 for rules/dots.
const SK_TONE = 'var(--color-grey-4)'
const RULE = 'var(--color-grey-3)' // arrows, dots, dashed connectors

const SkLine = ({ w, h = 10, r = 4 }: { w?: number | string; h?: number; r?: number }) => (
    <div style={w !== undefined ? { width: w } : undefined}>
        <CustomShimmer height={h} radius={r} backgroundColor={SK_TONE} foregroundColor={SK_TONE} />
    </div>
)

const SkCard = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
    <div className={`bg-white border border-grey-4 rounded-2xl overflow-hidden ${className}`}>{children}</div>
)

const ItineraryNoteCard = () => (
    <SkCard className="p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 shrink-0"><CustomShimmer height={36} radius={999} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
        <div className="flex-1 flex flex-col gap-2"><SkLine w="85%" /><SkLine w="55%" h={8} /></div>
    </SkCard>
)

const ItineraryFlightCard = () => (
    <SkCard className="px-4 py-3.5 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0"><CustomShimmer height={44} radius={8} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
            <div className="flex-1 flex flex-col gap-1.5"><SkLine w="70%" /><SkLine w="45%" h={8} /></div>
            <div className="flex flex-col items-end gap-1.5"><SkLine w={60} h={8} /><SkLine w={50} /></div>
        </div>
        <div className="flex justify-between items-center">
            <div className="flex flex-col gap-2"><SkLine w={64} h={14} /><SkLine w={32} h={18} r={6} /><SkLine w={50} h={7} /></div>
            <div className="flex flex-col items-center gap-1">
                <SkLine w={40} h={7} />
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: RULE }} />
                    <span className="w-[60px]" style={{ borderTop: `1.5px dashed ${RULE}` }} />
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: RULE }} />
                </div>
            </div>
            <div className="flex flex-col items-end gap-2"><SkLine w={70} h={14} /><SkLine w={32} h={18} r={6} /><SkLine w={40} h={7} /></div>
        </div>
    </SkCard>
)

const ItineraryTransferCard = ({ variant = 'transfer', duration, row1Max, row2Max }: { variant?: 'transfer' | 'ferry'; duration: string; row1Max: number; row2Max: number }) => (
    <SkCard className="px-3.5 py-3 flex flex-col gap-2.5">
        <div className="flex items-center pb-2 border-b border-dashed border-grey-4">
            <span className="flex items-center gap-1.5">
                {variant === 'ferry' ? <Ship size={14} className="text-grey-3" /> : <Bus size={14} className="text-grey-3" />}
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-grey-3">{variant === 'ferry' ? 'Ferry' : 'Transfer'}</span>
            </span>
            <span className="ml-auto text-[11px] font-semibold tracking-wide uppercase text-grey-3">{duration}</span>
        </div>
        <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full border-[1.5px] shrink-0" style={{ borderColor: RULE }} />
            <div className="flex-1" style={{ maxWidth: row1Max }}><CustomShimmer height={10} radius={4} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
            <SkLine w={50} />
        </div>
        <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RULE }} />
            <div className="flex-1" style={{ maxWidth: row2Max }}><CustomShimmer height={10} radius={4} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
            <SkLine w={50} />
        </div>
    </SkCard>
)

const ItineraryRestaurantCard = ({ l1, l2 }: { l1: string; l2: string }) => (
    <SkCard className="p-3 flex items-center gap-3">
        <div className="w-14 h-14 shrink-0"><CustomShimmer height={56} radius={8} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
        <div className="flex-1 flex flex-col gap-2"><SkLine w={l1} /><SkLine w={l2} h={8} /></div>
    </SkCard>
)

const ItineraryActivityCard = ({ img, l1, l2 }: { img: number; l1: string; l2: string }) => (
    <SkCard className="flex flex-col">
        <CustomShimmer height={img} radius={0} backgroundColor={SK_TONE} foregroundColor={SK_TONE} />
        <div className="p-3.5 flex flex-col gap-2.5"><SkLine w={l1} h={12} /><SkLine w={l2} h={8} /></div>
    </SkCard>
)

const ItineraryAddBtn = ({ label, dashed }: { label: string; dashed?: boolean }) => (
    <div className={`h-[38px] rounded-full flex items-center justify-center gap-1.5 ${dashed ? 'border border-dashed border-primary-default' : 'border border-grey-4 bg-white'}`}>
        <span className="text-primary-default font-bold text-sm leading-none">+</span>
        <span className={`text-[13px] font-semibold ${dashed ? 'text-primary-default' : 'text-grey-2'}`}>{label}</span>
    </div>
)

const ItineraryDayColumn = ({ sub, opacity = 1, stayFilled = false, children }: { sub: number; opacity?: number; stayFilled?: boolean; children: React.ReactNode }) => (
    <div className="w-[308px] shrink-0 flex flex-col gap-3" style={{ opacity }}>
        <div className="flex items-start gap-2 px-1 pt-1">
            <span className="text-grey-3 text-sm leading-none mt-0.5 select-none">⋮⋮</span>
            <div className="flex-1 flex flex-col gap-1.5">
                <SkLine w={130} h={12} />
                <div className="opacity-70"><SkLine w={sub} h={8} /></div>
            </div>
        </div>
        {stayFilled ? (
            // A filled stay pill (like "Aston Sunset Beach Resort …"), not the Add-stay button.
            <div className="h-[38px] rounded-xl border border-grey-4 bg-white px-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: SK_TONE }} />
                <SkLine w="65%" h={10} />
            </div>
        ) : (
            <ItineraryAddBtn label="Add stay" />
        )}
        {children}
    </div>
)

// Static skeleton block (solid SK_TONE, no sweep) — the building block for the
// itinerary / stays / activities / food skeleton chrome.
const SkBlock = ({ w, h, r = 4 }: { w?: number | string; h: number; r?: number }) => (
    <div style={w !== undefined ? { width: w } : undefined}>
        <CustomShimmer height={h} radius={r} backgroundColor={SK_TONE} foregroundColor={SK_TONE} />
    </div>
)

// Static experience card skeleton. Two variants:
//  • internal — editing affordances: View Details/View on Map under the image,
//    "+ Add tour" and "Explore more tours" around the tour card.
//  • traveler (default) — read-only: image with a "Sneak Peek" badge + carousel
//    arrow, then the tour card. No add/view buttons.
const ExperienceCardSkeleton = ({ internal = false }: { internal?: boolean }) => (
    <div className="border border-grey-4 rounded-2xl p-4 bg-white flex flex-col gap-4">
        {/* Title + location + menu */}
        <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
                <SkBlock w={200} h={16} />
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: SK_TONE }} />
                <SkBlock w={84} h={12} />
            </div>
            <SkBlock w={18} h={12} />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
            {/* Left: image (+ View buttons for internal) */}
            <div className="w-full md:w-1/2 flex flex-col gap-3">
                <div className="relative h-[230px] rounded-2xl overflow-hidden" style={{ background: SK_TONE }}>
                    {!internal && (
                        <>
                            {/* "Sneak Peek" badge */}
                            <div className="absolute left-3 top-3 h-9 pl-1.5 pr-3 rounded-full bg-white/70 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md" style={{ background: SK_TONE }} />
                                <SkBlock w={56} h={9} />
                            </div>
                            {/* carousel arrow */}
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70" />
                        </>
                    )}
                </div>
                {internal && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1"><CustomShimmer height={40} radius={8} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
                        <div className="flex-1"><CustomShimmer height={40} radius={8} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
                    </div>
                )}
            </div>
            {/* Right: tour card (+ Add tour / Explore more for internal) */}
            <div className="w-full md:w-1/2 flex flex-col gap-3">
                {internal && (
                    <div className="flex items-center justify-end">
                        <span className="h-8 px-3 rounded-full border border-dashed border-grey-4 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: SK_TONE }} />
                            <SkBlock w={48} h={9} />
                        </span>
                    </div>
                )}
                <div className="rounded-2xl border border-grey-4 bg-white p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded" style={{ background: SK_TONE }} />
                        <SkBlock w={56} h={13} />
                    </div>
                    <SkBlock w="92%" h={14} />
                    <SkBlock w="58%" h={14} />
                    <div className="mt-auto flex items-end justify-between pt-3">
                        <div className="flex flex-col gap-1.5">
                            <SkBlock w={130} h={9} />
                            <SkBlock w={150} h={9} />
                            <SkBlock w={84} h={9} />
                        </div>
                        <SkBlock w={84} h={38} r={10} />
                    </div>
                </div>
                {internal && (
                    <div className="flex items-center justify-between border-t border-grey-4 pt-2.5">
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full" style={{ background: SK_TONE }} />
                            <SkBlock w={120} h={11} />
                        </div>
                        <SkBlock w={44} h={11} />
                    </div>
                )}
            </div>
        </div>
    </div>
)

// Static food card skeleton — mirrors FoodCard: 16:10 image with map/Instagram
// action badges, then name + address line.
const FoodCardSkeleton = () => (
    <div className="rounded-xl bg-white border border-grey-4 overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
        <div className="relative aspect-[16/10]" style={{ background: SK_TONE }}>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                <span className="w-8 h-8 rounded-full bg-white/80" />
                <span className="w-8 h-8 rounded-full bg-white/80" />
            </div>
        </div>
        <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2">
            <SkBlock w="78%" h={16} />
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: SK_TONE }} />
                <SkBlock w="58%" h={11} />
            </div>
        </div>
    </div>
)

interface ViewContentCollectionLoadingProps {
    isRimigoInternal?: boolean
    sectionTypes?: Array<{ section_type: string; name: string }>
    activeTab?: string | null
    onTabClick?: (tab: string) => void
    showTabs?: boolean
    /**
     * Skip the internal tab bar (real or shimmer). Use when an outer header
     * already renders the tabs — e.g. TripboardHeader in the tripboard loading
     * shell — so we don't stack two tab bars on top of each other.
     */
    hideTabBar?: boolean
}

const ViewContentCollectionLoading: React.FC<ViewContentCollectionLoadingProps> = ({
    isRimigoInternal = false,
    sectionTypes,
    activeTab,
    onTabClick,
    showTabs = false,
    hideTabBar = false
}) => {
    // Experience tab loading shimmer - matches ExperienceWithTours layout
    // Activities tab shimmer — mirrors the real layout: city/date tabs (no arrows),
    // "In your itinerary / Shortlisted" toggle + Explore more, a "+ Add activity"
    // button, then experience cards, with the map on the right. Static (SK_TONE).
    const renderExperienceLoadingShimmer = () => (
        <div className="flex flex-col lg:flex-row">
            {/* Left Side: Experience List */}
            <div className="flex-1 lg:max-w-[50%]">
                <div className="flex flex-col gap-4 px-3 sm:px-5 py-3">
                    {/* City/date tabs — segmented, NO arrows; 2 lines (city + date),
                        first tab "active" (bordered) — one per itinerary day. */}
                    <div className="flex items-stretch gap-2 overflow-hidden border-b border-grey-4 pb-3">
                        {[100, 96, 84, 88, 80].map((w, i) => (
                            <div key={i} className={`flex flex-col gap-1.5 py-1.5 ${i === 0 ? 'rounded-lg border border-grey-4 px-3' : 'px-1'}`}>
                                <SkBlock w={w} h={12} />
                                <SkBlock w={Math.max(w - 28, 36)} h={9} />
                            </div>
                        ))}
                    </div>

                    {/* In your itinerary / Shortlisted toggle. Right side: internal sees
                        "Explore more activities" text; travelers see a map-view icon. */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <SkBlock w={120} h={34} r={999} />
                            <SkBlock w={100} h={34} r={999} />
                        </div>
                        {isRimigoInternal ? (
                            <div className="hidden sm:block"><SkBlock w={150} h={12} /></div>
                        ) : (
                            <span className="w-9 h-9 rounded-full border border-grey-4 shrink-0" />
                        )}
                    </div>

                    {/* + Add activity (internal only) */}
                    {isRimigoInternal && (
                        <div className="flex justify-end">
                            <SkBlock w={120} h={38} r={999} />
                        </div>
                    )}

                    {/* Experience cards */}
                    <div className="flex flex-col gap-4">
                        {[1, 2].map((i) => (
                            <ExperienceCardSkeleton key={i} internal={isRimigoInternal} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Map Shimmer */}
            <div className="hidden lg:block lg:w-[50%] lg:sticky lg:top-0 lg:self-start lg:h-screen">
                <div className="relative w-full h-full bg-grey-5">
                    <CustomShimmer height={500} radius={0} className="w-full h-full" />
                </div>
            </div>
        </div>
    )

    // Stays tab shimmer — mirrors the real Stays layout: city/date chip row,
    // For You/Shortlist toggle + per-night price disclaimer, then a single-column
    // list of faithful list-view stay cards, with the map on the right. Static
    // (no sweep), matching the itinerary skeleton.
    const renderStaysLoadingShimmer = () => (
        <div className="flex flex-col lg:flex-row">
            {/* Left Side: Stays List */}
            <div className="flex-1 lg:max-w-[50%]">
                <div className="flex flex-col gap-4 px-3 sm:px-5 py-3">
                    {/* City/date tabs — segmented, NO arrows; each is 2 lines (city +
                        date range). First tab is "active" (bordered), like the real one. */}
                    <div className="flex items-stretch gap-2 overflow-hidden border-b border-grey-4 pb-3">
                        {[100, 84, 80, 72].map((w, i) => (
                            <div key={i} className={`flex flex-col gap-1.5 py-1.5 ${i === 0 ? 'rounded-lg border border-grey-4 px-3' : 'px-1'}`}>
                                <SkBlock w={w} h={12} />
                                <SkBlock w={Math.max(w - 24, 40)} h={9} />
                            </div>
                        ))}
                    </div>

                    {/* Guests pill + "Explore more stays" */}
                    <div className="flex items-center justify-between gap-2">
                        <SkBlock w={148} h={32} r={999} />
                        <div className="hidden sm:block"><SkBlock w={128} h={12} /></div>
                    </div>

                    {/* Explore / Shortlisted toggle + per-night disclaimer */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <SkBlock w={90} h={34} r={999} />
                            <SkBlock w={108} h={34} r={999} />
                        </div>
                        <div className="hidden sm:block"><SkBlock w={176} h={12} /></div>
                    </div>

                    {/* Stay cards — the SAME canonical skeleton StaysExploreSection uses
                        during its own load, so the page-shell → tab handoff is seamless
                        (no skeleton swap / flicker). */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {[1, 2, 3].map((index) => (
                            <StaysCardSkeleton key={index} viewType="list" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Map Shimmer */}
            <div className="hidden lg:block lg:w-[50%] lg:sticky lg:top-0 lg:self-start lg:h-screen">
                <div className="relative w-full h-full bg-grey-5">
                    <CustomShimmer height={500} radius={0} className="w-full h-full" />
                </div>
            </div>
        </div>
    )

    // Food tab shimmer — mirrors the real layout: single-line city filter chips, then
    // a 2-column grid of food cards (16:10 image + name + address). Full width, no map.
    const renderFoodLoadingShimmer = () => (
        <div className="flex flex-col gap-4 px-3 sm:px-5 py-3">
            {/* City filter chips — single line, first active (bordered) */}
            <div className="flex items-center gap-2 overflow-hidden border-b border-grey-4 pb-3">
                {[84, 64, 92, 56, 76].map((w, i) => (
                    <div key={i} className={`flex items-center px-3 py-1.5 rounded-lg ${i === 0 ? 'border border-grey-4' : ''}`}>
                        <SkBlock w={w} h={13} />
                    </div>
                ))}
            </div>

            {/* 2-column grid of food cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                    <FoodCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )

    // Itinerary tab loading shimmer — recreates the "Itinerary Loader" design so the
    // skeleton reads as the itinerary that replaces it. Responsive:
    //   • lg+    → desktop kanban (city route bar + horizontal day columns)
    //   • mobile → day-pill selector + a single vertical day (date/route/Map View
    //              header, then stacked cards), matching the mobile itinerary.
    // Both reuse the same card shapes (note · flight · transfer · restaurant ·
    // activity) so content slots in without a layout jump when data lands.
    const renderItineraryLoadingShimmer = () => (
        <>
            {/* ── Desktop: horizontal kanban ─────────────────────────────── */}
            <div className="hidden lg:block bg-grey-5 min-h-[calc(100vh-72px)] px-7 pt-4">
                {/* City route bar — pills only, no arrows */}
                <div className="flex items-center gap-3 mb-3 overflow-hidden">
                    {[120, 140, 150, 160, 90].map((w, i) => (
                        <div key={i} style={{ width: w }}><CustomShimmer height={32} radius={999} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
                    ))}
                </div>

                {/* Day columns — each filled with varied slot types so no column has a
                    trailing void; mirrors the real board's note/flight/transfer/ferry/
                    restaurant/activity mix and filled stay pills. */}
                <div className="flex gap-4 items-start overflow-hidden">
                    <ItineraryDayColumn sub={100}>
                        <ItineraryNoteCard />
                        <ItineraryFlightCard />
                        <ItineraryRestaurantCard l1="80%" l2="55%" />
                        <ItineraryActivityCard img={160} l1="85%" l2="55%" />
                    </ItineraryDayColumn>
                    <ItineraryDayColumn sub={60} stayFilled>
                        <ItineraryTransferCard duration="30m" row1Max={130} row2Max={90} />
                        <ItineraryTransferCard variant="ferry" duration="30m" row1Max={100} row2Max={130} />
                        <ItineraryRestaurantCard l1="80%" l2="60%" />
                        <ItineraryActivityCard img={170} l1="85%" l2="55%" />
                        <ItineraryRestaurantCard l1="70%" l2="50%" />
                    </ItineraryDayColumn>
                    <ItineraryDayColumn sub={40} stayFilled>
                        <ItineraryRestaurantCard l1="75%" l2="50%" />
                        <ItineraryActivityCard img={180} l1="78%" l2="60%" />
                        <ItineraryRestaurantCard l1="85%" l2="45%" />
                        <ItineraryActivityCard img={150} l1="72%" l2="55%" />
                    </ItineraryDayColumn>
                    <ItineraryDayColumn sub={40} stayFilled>
                        <ItineraryRestaurantCard l1="80%" l2="55%" />
                        <ItineraryTransferCard duration="15m" row1Max={90} row2Max={110} />
                        <ItineraryActivityCard img={170} l1="70%" l2="60%" />
                        <ItineraryRestaurantCard l1="78%" l2="52%" />
                        <ItineraryTransferCard variant="ferry" duration="15m" row1Max={110} row2Max={90} />
                    </ItineraryDayColumn>
                    <ItineraryDayColumn sub={70} stayFilled>
                        <ItineraryFlightCard />
                        <ItineraryTransferCard duration="15m" row1Max={100} row2Max={120} />
                        <ItineraryActivityCard img={180} l1="72%" l2="55%" />
                        <ItineraryRestaurantCard l1="80%" l2="50%" />
                    </ItineraryDayColumn>
                    <ItineraryDayColumn sub={60} opacity={0.6} stayFilled>
                        <ItineraryRestaurantCard l1="70%" l2="50%" />
                        <ItineraryActivityCard img={160} l1="75%" l2="55%" />
                        <ItineraryRestaurantCard l1="65%" l2="45%" />
                    </ItineraryDayColumn>
                </div>
            </div>

            {/* ── Mobile: day-pill selector + single vertical day ────────── */}
            <div className="lg:hidden bg-grey-5 min-h-[calc(100vh-112px)] px-4 pt-3">
                {/* Day selector pills */}
                <div className="flex gap-2 overflow-hidden">
                    {[64, 68, 68, 68, 64].map((w, i) => (
                        <div key={i} style={{ width: w }}>
                            <CustomShimmer height={34} radius={999} backgroundColor={SK_TONE} foregroundColor={SK_TONE} />
                        </div>
                    ))}
                </div>
                <div className="h-px bg-grey-4 -mx-4 my-3" />

                {/* Day section header — date / route + select-stay / Map View */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-2 pt-0.5">
                        <SkLine w={150} h={14} />
                        <SkLine w={190} h={10} />
                    </div>
                    <div className="w-[100px] shrink-0"><CustomShimmer height={36} radius={10} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
                </div>

                {/* Selected day's cards, stacked — varied card types, no "+ Add" button */}
                <div className="flex flex-col gap-3">
                    <ItineraryNoteCard />
                    <ItineraryFlightCard />
                    <ItineraryTransferCard duration="30m" row1Max={130} row2Max={90} />
                    <ItineraryRestaurantCard l1="80%" l2="60%" />
                    <ItineraryActivityCard img={180} l1="85%" l2="55%" />
                    <ItineraryTransferCard variant="ferry" duration="30m" row1Max={100} row2Max={130} />
                </div>

                {/* Peek of the next day */}
                <div className="mt-5 flex items-start justify-between opacity-60">
                    <div className="flex flex-col gap-2">
                        <SkLine w={150} h={14} />
                        <SkLine w={120} h={10} />
                    </div>
                    <div className="w-[100px] shrink-0"><CustomShimmer height={36} radius={10} backgroundColor={SK_TONE} foregroundColor={SK_TONE} /></div>
                </div>
            </div>
        </>
    )

    // Default/generic loading shimmer for other tabs
    const renderDefaultLoadingShimmer = () => (
        <div className="flex flex-col gap-10 mt-10 px-4">
            <CustomShimmer height={400} radius={16} className="w-full" />
            <CustomShimmer height={400} radius={16} className="w-full" />
        </div>
    )

    // Determine which shimmer to render based on active tab
    const renderContentShimmer = () => {
        if (!activeTab) {
            return renderDefaultLoadingShimmer()
        }

        switch (activeTab) {
            case 'itinerary':
                return renderItineraryLoadingShimmer()
            case 'experience':
                return renderExperienceLoadingShimmer()
            case 'stays':
                return renderStaysLoadingShimmer()
            case 'restaurant':
                return renderFoodLoadingShimmer()
            default:
                return renderDefaultLoadingShimmer()
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="w-full mx-auto">
                {/* Tabs - show actual tabs if loaded, otherwise shimmer. Skipped entirely
                    when an outer header already owns the tab bar (hideTabBar). */}
                {!hideTabBar && (
                    showTabs && sectionTypes && activeTab && onTabClick ? (
                        <CollectionTabs
                            sectionTypes={sectionTypes}
                            activeTab={activeTab}
                            onTabClick={onTabClick}
                        />
                    ) : (
                        <div className="h-[72px] flex items-center gap-6 border-b border-grey-4 px-4">
                            <CustomShimmer height={24} radius={4} className="w-24" />
                            <CustomShimmer height={24} radius={4} className="w-24" />
                            <CustomShimmer height={24} radius={4} className="w-32" />
                        </div>
                    )
                )}

                {/* Content shimmer - renders different layouts based on active tab */}
                {renderContentShimmer()}
            </div>
        </div>
    )
}

export default ViewContentCollectionLoading