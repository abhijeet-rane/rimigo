import React from 'react'

import type { ExperienceWithShort } from '@/modules/WatchAlong/api/watchAlongApi'

import ShortsCarousel from '@/modules/WatchAlong/components/ShortsCarousel'

import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { Play } from 'lucide-react'

interface DiscoverWatchAlongPanelProps {
    shorts: ExperienceWithShort[]
    isLoading: boolean
    hasMore?: boolean
    onLoadMore?: () => void
    isLoadingMore?: boolean
    onShortClick?: (index: number) => void
    PageName ?: string
    /**
     * 'light' (default) renders the original lavender card used by the
     * landing/explore pages. 'dark' switches the surface for the
     * Activities tab → Explore → "Quick Bites" treatment.
     */
    variant?: 'light' | 'dark'
    /** Override the rotated "Things to do…" copy on the intro panel. */
    headline?: string
    /** Override the secondary headline shown beneath on desktop. */
    subHeadline?: string
    /** Override the CTA button label (default: VIEW ALL). */
    ctaLabel?: string
}

const SPARKLES_URL = 'https://media.rimigo.com/1764248235818_9a9848a8782856fcaa54fe2a73e01e27.png'
// const DIAMOND_URL = 'https://media.rimigo.com/1764248394924_5a22d4a9ad9f53d8b449a09f758019d2.png'
// const MASK_URL = 'https://media.rimigo.com/1764248430105_88e2346518cc5c6fac0d4261c9f7a157.png'
const DISCOVER_PLACES = 'https://media.rimigo.com/1767422596089_discover_places-from_real_travelers.png'

interface IntroPanelProps {
    onWatchAll?: () => void
    variant?: 'light' | 'dark'
    headline?: string
    subHeadline?: string
    ctaLabel?: string
}

// const FEATURE_BADGES = [
//     { label: 'Gems', image: DIAMOND_URL },
//     { label: 'Hidden Places', image: MASK_URL }
// ]

const IntroPanel: React.FC<IntroPanelProps> = ({
    onWatchAll,
    variant = 'light',
    headline,
    subHeadline,
    ctaLabel = 'VIEW ALL'
}) => {
    const isDark = variant === 'dark'
    return (
        <div
            className={cn(
                'shrink-0 flex md:flex-col max-md:items-center md:gap-6 rounded-[28px] max-md:pr-4 text-left md:pl-3 md:pt-4',
                isDark ? 'text-white md:w-52' : 'text-black md:w-47.5'
            )}>
            <img
                src={SPARKLES_URL}
                alt="Sparkles"
                className="h-8 w-8 md:h-14 md:w-14 "
            />
            <div className="w-2 md:hidden"></div>

            <img
                src={DISCOVER_PLACES}
                className=" md:mt-3 w-36.25 h-12.5 md:w-35 md:h-25 hidden"
            />
            <div className='flex md:flex-col md:gap-8 w-full md:items-start items-start pr-3  '>
                {/* <img
                src={TITLE_URL}
                alt="Rare finds by Rimigo"
                className="md:mt-3 w-[145px] h-15 md:w-35 md:h-25 max-sm:hidden"
            /> */}
                <h2 className={cn(
                    'font-bold flex-3 leading-7 md:leading-8 max-md:flex-3 max-md:pr-3 w-full -rotate-6 md:pt-0',
                    isDark ? 'text-[22px] md:text-[26px] whitespace-nowrap' : 'text-[30px] md:text-[34px]'
                )} style={{ fontFamily: 'Caveat' }}>
                {headline ?? 'Things to do'} <div className={isDark ? 'block' : 'hidden md:block'}>{subHeadline ?? 'to get you started'}</div>
                </h2>

                <div className="flex max-md:flex-1 max-md:ml-auto flex-wrap md:gap-4 md:pt-12 max-md:-mr-4 w-[60%] md:w-full md:flex-1  ">
                    {/* {FEATURE_BADGES.map((badge) => (
                        <div
                            key={badge.label}
                            className="flex flex-col items-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full">
                                <img
                                    src={badge.image}
                                    alt={badge.label}
                                    className="w-[72px] h-[72px] md:h-32 md:w-32 object-contain"
                                />
                            </div>
                        </div>
                    ))} */}
                    <Button
                        onClick={onWatchAll}
                        className={cn(
                            'cursor-pointer font-red-hat-display font-[759] leading-4.5 text-[16px]',
                            isDark
                                // Quick Bites variant per spec: solid
                                // primary-purple pill with white text
                                // and a triangular play glyph to the
                                // right of the label.
                                ? 'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary-default text-white hover:bg-primary-light'
                                : 'md:w-full p-5 rounded-sm! bg-primary-dark text-white'
                        )}>
                        {ctaLabel}
                        {isDark && <Play className="w-4 h-4 text-white" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export const DiscoverWatchAlongPanel: React.FC<DiscoverWatchAlongPanelProps> = ({
    shorts,
    isLoading,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
    onShortClick,
    PageName = 'youtube_shorts',
    variant = 'light',
    headline,
    subHeadline,
    ctaLabel
}) => {
    const isDark = variant === 'dark'
    if (!isLoading && shorts.length === 0) return null
    const { trackButtonClickCustom } = usePostHog()


    const handleWatchAll = () => {
        if (!shorts.length) return
        trackButtonClickCustom?.({
            buttonPage: PageName,
            buttonName: 'view_all_shorts',
            buttonAction: 'click',
            extra: {
                sourceSection: 'intro_panel_cta'
            }
        })
        onShortClick?.(0) // ✅ open first short
    }

    return (
        <GenericCard
            className={cn(
                'max-md:pb-10.75 max-md:-mr-5 ',
                isDark ? 'bg-grey-0 text-white' : 'bg-primary-default-12',
                !isDark && shorts.length <= 3
                    ? "bg-[url('https://media.rimigo.com/1765808132062_empty_caraousel_bg.png')] bg-contain bg-right bg-no-repeat  "
                    : ''
            )}>
            <div className="flex max-md:flex-col gap-6">
                <IntroPanel
                    onWatchAll={handleWatchAll}
                    variant={variant}
                    headline={headline}
                    subHeadline={subHeadline}
                    ctaLabel={ctaLabel}
                />
                <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <div className="flex gap-4.5">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div
                                    key={`skeleton-${index}`}
                                    className="h-90 w-45 shrink-0 rounded-[28px] bg-white/10"
                                />
                            ))}
                        </div>
                    ) : (
                        <ShortsCarousel
                            experiences={shorts}
                            onShortClick={onShortClick || (() => { })}
                            hasMore={hasMore}
                            onLoadMore={onLoadMore}
                            isLoadingMore={isLoadingMore}
                            useShortThumbnail
                            gradientStartColor="rgba(231, 220, 248, 1)"
                            gradientEndColor="rgba(231, 220, 248, 0)"
                        />
                    )}
                </div>
            </div>
        </GenericCard>
    )
}