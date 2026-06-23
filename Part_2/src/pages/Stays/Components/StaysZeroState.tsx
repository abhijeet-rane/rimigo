import { ImageShowCase } from '../../../pages/Landing/Components/ImageShowCase'
import {
    GuestsSegmentConfig,
    LocationPreference,
    PreferencesSegmentConfig,
    WhenSegmentConfig,
    WhereSegmentConfig
} from '@/components/common/SearchBar'
import { STAYS_IMG_1, STAYS_IMG_2, STAYS_IMG_3, STAYS_IMG_4, STAYS_IMG_5 } from '@/constants/icons/svgUrls'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import MobileSearchModal from '@/components/MobileSearchBar'
import { WishlistButtonConfig } from '@/components/WishlistHeader'
import { Search } from 'lucide-react'
import React from 'react'
import { CALENDER_ICON, NOTES_ICON, SPEED_ICON } from '@/constants/thiingsIcons'
import MobileBaseHeader from '@/components/MobileBaseHeader'

// Using the same images but will arrange them differently
const imgRectangle327 = STAYS_IMG_1
const imgRectangle292 = STAYS_IMG_2
const imgRectangle325 = STAYS_IMG_3
const imgRectangle326 = STAYS_IMG_4
const imgRectangle305 = STAYS_IMG_5

const staticImages = [imgRectangle327, imgRectangle292, imgRectangle325, imgRectangle326, imgRectangle305]
interface StaysZeroStateProps {
    wishlistConfig?: WishlistButtonConfig
    headerType: 'stays' | 'experiences'
    onSearch: (params: any) => void
    preferencesConfig?: PreferencesSegmentConfig
    locationPreferences?: LocationPreference[]
    guestsConfig?: GuestsSegmentConfig
    whereConfig?: WhereSegmentConfig
    whenConfig?: WhenSegmentConfig
    iconSrc?: string
}
const StaysZeroState: React.FC<StaysZeroStateProps> = ({
    headerType,
    onSearch,
    preferencesConfig,
    locationPreferences,
    guestsConfig,
    whereConfig,
    whenConfig,
    iconSrc
}) => {
    // Use activities search hook for search functionality
    const [isSearchOpen, setIsSearchOpen] = React.useState(false)

    return (
        <>
            <ReactHelmet title={`Stays | Rimigo `} />
            <div className="relative w-full h-screen bg-white flex flex-col items-center justify-start mb-20">
                <MobileBaseHeader
                    title={'Stays'}
                    wishlistConfig={{ enabled: false }}
                />
                <div className="w-full flex flex-col items-center justify-center bg-grey-5  pb-[5%] rounded-b-[32px] shadow-[0px_2px_8px_#e0e0e0] ">
                    {/* Top Images Fan */}

                    <div className="flex items-center justify-center mb-12 max-md:mt-20">
                        <ImageShowCase
                            className="max-md:w-[64px] max-md:h-[52px]"
                            images={staticImages}
                            aspectRatio="landscape"
                            showPlayButton={false}
                            isHovered={false}
                            enableTiltOnHover={false}
                            maxImages={5}
                            imageWidthPortraitCustom="w-[90px]"
                            imageHeightPortraitCustom="h-[72px]"
                            showBorder={false}
                            showShadow={true}
                            gap="gap-4"
                        />
                    </div>

                    {/* Header */}
                    <h1
                        className="text-[32px] md:text-[56px] leading-[40px] md:leading-[56px] font-red-hat-display font-[467] text-grey-0 text-center mb-[48px] tracking-tight"
                        style={{
                            filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                        }}>
                        Find the best stays, <br />
                        personalised for{' '}
                        <span
                            className="text-primary-default italic font-[467]"
                            style={{
                                filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                            }}>
                            you
                        </span>
                    </h1>

                    <div className=" flex items-center  px-4 w-[100%]  flex-col gap-4">
                        {/* SearchBar Component with global search */}
                        <div className=" w-full">
                            <MobileSearchModal
                                outerOpen={isSearchOpen}
                                iconSrc={iconSrc}
                                onSearch={onSearch}
                                headerType={headerType}
                                preferencesConfig={preferencesConfig}
                                locationPreferences={locationPreferences}
                                guestsConfig={guestsConfig}
                                whereConfig={whereConfig}
                                whenConfig={whenConfig}
                            />
                        </div>

                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="w-full bg-primary-default text-natural-white p-4 rounded-[12px] font-semibold font-red-hat-display flex items-center justify-center gap-2.5">
                            <Search className="w-4 h-4" />
                            {'Search'}
                        </button>
                    </div>
                </div>

                {/* Key Benefits Section */}
                <div className="w-full max-w-[1000px] md:mt-24 px-4 mt-12 md:pb-20">
                    <div className="flex items-center justify-center gap-4 mb-8 md:mb-12">
                        <div className="h-[1px] w-24 bg-gradient-to-l from-[color:var(--color-grey-4)] to-transparent"></div>

                        <span className="text-[14px] md:text-[12px] font-bold text-grey-2 font-red-hat-display tracking-widest uppercase whitespace-nowrap">
                            KEY BENEFITS
                        </span>
                        <div className="h-[1px] w-24 bg-gradient-to-r from-[color:var(--color-grey-4)] to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Card 1 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10 flex items-center justify-center ">
                                <img
                                    src={NOTES_ICON}
                                    alt="Gem"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                Get a personalised<span className="font-[600] text-grey-0"> match score</span> for each stay{' '}
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10 flex items-center justify-center">
                                <img
                                    src={CALENDER_ICON}
                                    alt="Sparkles"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                Search for options that fit your<span className="font-[600] text-grey-0"> profile & criteria</span>
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10  flex items-center justify-center">
                                <img
                                    src={SPEED_ICON}
                                    alt="Sparkles"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                Find the <span className="font-[600] text-grey-0">best deals </span>across popular platforms
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default StaysZeroState
