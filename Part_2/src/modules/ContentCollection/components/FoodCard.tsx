import { useMemo, useState } from 'react'
import {
    FOOD_NAME_KEYWORDS_TO_ICON,
    FOOD_FALLBACK_ICON
} from '@/constants/thiingsIcons'
import { INSTAGRAM_ICON } from '@/constants/icons/svgFromCDN'
import { MapPin } from 'lucide-react'
import CustomShimmer from '@/components/shared/Shimmer'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import RemoveSectionButton from './RemoveSectionButton'

const GOOGLE_MAPS_ICON = 'https://media.rimigo.com/1770999094693_Google_Maps_icon_(2020).svg.png'

export interface FoodItemData {
    sectionId?: string
    name: string
    map_link?: string
    instagram_url?: string
    image_url?: string
    address?: string
    latitude?: number
    longitude?: number
    city_id?: string
    city_name?: string
}

function getIconForName(name: string): string {
    if (!name || typeof name !== 'string') return FOOD_FALLBACK_ICON
    const lower = name.toLowerCase()
    for (const [keyword, iconUrl] of Object.entries(FOOD_NAME_KEYWORDS_TO_ICON)) {
        if (lower.includes(keyword)) return iconUrl
    }
    return FOOD_FALLBACK_ICON
}

interface FoodCardProps {
    item: FoodItemData
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onClick?: () => void
    onDeleteSection?: (sectionId: string) => void
    showDeleteButton?: boolean
    isDeleting?: boolean
}

export default function FoodCard({
    item,
    onMouseEnter,
    onMouseLeave,
    onClick,
    onDeleteSection,
    showDeleteButton = false,
    isDeleting = false
}: FoodCardProps) {
    const { name, map_link, instagram_url, image_url, address } = item    

    const iconUrl = useMemo(() => getIconForName(name), [name])
    const [imageErrored, setImageErrored] = useState(false)
    const [imgLoaded, setImgLoaded] = useState(false)
    const showImage = Boolean(image_url) && !imageErrored
    const hasInstagram = Boolean(instagram_url?.trim())
    const { trackButtonClickCustom } = usePostHog()
    const sectionId = item.sectionId

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (sectionId && onDeleteSection) {
            onDeleteSection(sectionId)
        }
    }
    

    return (
        <div
            className="relative group rounded-xl bg-white overflow-hidden border border-[#dfdde0] hover:border-grey-0 shadow-[0px_2px_8px_0px_#dfdde0] transition-colors cursor-pointer"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        >
            {showDeleteButton && sectionId && onDeleteSection && (
                <RemoveSectionButton onClick={handleDeleteClick} disabled={isDeleting} />
            )}
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {showImage ? (
                    <>
                        {!imgLoaded && (
                            <div className="absolute inset-0">
                                <CustomShimmer fill radius={0} backgroundColor="var(--color-grey-4)" foregroundColor="var(--color-grey-5)" />
                            </div>
                        )}
                        <img
                            src={image_url}
                            alt={name}
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImageErrored(true)}
                            className="w-full h-full object-cover group-hover:scale-105"
                            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 200ms ease-out, transform 500ms ease-out' }}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-grey-5 via-grey-4/30 to-grey-5 flex items-center justify-center">
                        <img
                            src={iconUrl}
                            alt=""
                            className="w-16 h-16 object-contain opacity-60"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                    </div>
                )}

                {/* Quick action badges on image */}
                <div className={`absolute top-2.5 flex items-center gap-1.5 ${showDeleteButton && sectionId && onDeleteSection ? 'right-12' : 'right-2.5'}`}>
                    {map_link && (
                        <a
                            href={map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation()
                                trackButtonClickCustom?.({
                                    buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                    buttonName: POSTHOG_EVENTS.FOOD_CARD_MAPS_CLICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: {
                                        map_link: map_link,
                                    },
                                })
                            }}
                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all"
                            aria-label="Google Maps"
                        >
                            <img src={GOOGLE_MAPS_ICON} alt="" className="w-4.5 h-4.5 object-contain" />
                        </a>
                    )}
                    {hasInstagram && (
                        <a
                            href={instagram_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation()
                                trackButtonClickCustom?.({
                                    buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                    buttonName: POSTHOG_EVENTS.FOOD_CARD_INSTAGRAM_CLICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: {
                                        instagram_url: instagram_url,
                                    },
                                })
                            }}
                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all"
                            aria-label="Instagram"
                        >
                            <img src={INSTAGRAM_ICON} alt="" className="w-4 h-4 object-contain" />
                        </a>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-3.5 pt-3 pb-3.5">
                <h3 className="text-[18px] md:text-[16px] font-red-hat-display leading-[18px] tracking-[-2%] font-[550] text-grey-0 line-clamp-2">
                    {name || '—'}
                </h3>

                {address && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3 h-3 text-grey-1 shrink-0" />
                        <span className="text-sm font-medium font-manrope text-grey-1 line-clamp-1">
                            {address}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}