import { ImageShowCase } from '../../../pages/Landing/Components/ImageShowCase'
import SearchBar from '@/components/common/SearchBar'
import { useActivitiesSearch } from '../hooks/useActivitiesSearch'
import { FERRIS_WHEEL_ICON, GEM_ICON, SPARKLES_ICON, TOUR_GUIDE_ICON } from '@/constants/thiingsIcons'
import { EXPERIENCE_IMG_1, EXPERIENCE_IMG_2, EXPERIENCE_IMG_3, EXPERIENCE_IMG_4, EXPERIENCE_IMG_5 } from '@/constants/icons/svgUrls'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import MobileSearchModal from '@/components/MobileSearchBar'

// Using the same images but will arrange them differently
const imgRectangle327 = EXPERIENCE_IMG_1
const imgRectangle292 = EXPERIENCE_IMG_2
const imgRectangle325 = EXPERIENCE_IMG_3
const imgRectangle326 = EXPERIENCE_IMG_4
const imgRectangle305 = EXPERIENCE_IMG_5

const staticImages = [imgRectangle327, imgRectangle292, imgRectangle325, imgRectangle326, imgRectangle305]

const ActivitesZeroStatePage = () => {
    // Use activities search hook for search functionality
    const { whereConfig, whenConfig, preferencesConfig, onSearch } = useActivitiesSearch()

    return (
        <>
            <ReactHelmet title={`Activities | Rimigo `} />
            <div className="relative w-full h-screen bg-white flex flex-col items-center justify-start ">
                <div className="w-full flex flex-col items-center justify-center bg-grey-5 pt-[6%] pb-[5%] rounded-b-[32px] shadow-[0px_2px_8px_#e0e0e0] ">
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
                        className="text-[32px] md:text-[56px] leading-[40px] md:leading-[56px] font-red-hat-display font-[467] text-grey-0 text-center mb-16 tracking-tight"
                        style={{
                            filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                        }}>
                        Explore experiences
                        <br />
                        that you'll{' '}
                        <span
                            className="text-primary-default italic font-[467]"
                            style={{
                                filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                            }}>
                            love
                        </span>
                    </h1>

                    <div className=" flex items-center w-fit max-w-[1000px] px-4 ">
                        {/* Where are you going text */}
                        <div className="max-md:hidden text-grey-2 text-[16px] font-medium leading-[18px] text-right font-red-hat-display ">
                            Where are
                            <br />
                            you going?
                        </div>

                        {/* SearchBar Component with global search */}
                        <div className="flex-1 ">
                            <div className="md:hidden">
                                <MobileSearchModal
                                    iconSrc={FERRIS_WHEEL_ICON}
                                    onSearch={onSearch}
                                    whereConfig={whereConfig}
                                    whenConfig={whenConfig}
                                    preferencesConfig={preferencesConfig}
                                    headerType={'experiences'}
                                />
                            </div>
                            <div className="max-md:hidden">
                                <SearchBar
                                    iconSrc={FERRIS_WHEEL_ICON}
                                    iconAlt="Activities"
                                    onSearch={onSearch}
                                    showFilters={false}
                                    showSort={false}
                                    whereConfig={whereConfig}
                                    whenConfig={whenConfig}
                                    preferencesConfig={preferencesConfig}
                                    locationPreferences={[]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Benefits Section */}
                <div className="w-full max-w-[1000px] md:mt-24 px-4 mt-12 md:pb-20">
                    <div className="flex items-center justify-center gap-4 mb-8 md:mb-12">
                        <div className="h-[1px] w-24 bg-gradient-to-l from-[color:var(--color-grey-4)] to-transparent"></div>

                        <span className="text-[14px] md:text-[12px] font-bold text-grey-2 font-red-hat-display tracking-widest uppercase">
                            KEY BENEFITS
                        </span>
                        <div className="h-[1px] w-24 bg-gradient-to-r from-[color:var(--color-grey-4)] to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Card 1 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10 flex items-center justify-center ">
                                <img
                                    src={GEM_ICON}
                                    alt="Gem"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                Uncover <span className="font-[600] text-grey-0">hidden gems</span> and{' '}
                                <span className="font-[600] text-grey-0">offbeat</span> spots
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10 flex items-center justify-center">
                                <img
                                    src={SPARKLES_ICON}
                                    alt="Sparkles"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                <span className="font-[600] text-grey-0">Handpicked places</span> tailored to your preferences
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-[color:var(--color-grey-5)] rounded-[16px] p-3 flex items-center gap-4">
                            <div className="w-10  flex items-center justify-center">
                                <img
                                    src={TOUR_GUIDE_ICON}
                                    alt="Sparkles"
                                    className="size-full "
                                />
                            </div>
                            <p className="text-[14px] text-grey-0 font-[400] leading-snug font-manrope">
                                Get inspired from <span className="font-[600] text-grey-0">authentic</span> traveller experiences
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ActivitesZeroStatePage
