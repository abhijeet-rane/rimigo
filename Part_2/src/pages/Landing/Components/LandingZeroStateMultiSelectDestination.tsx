import { ImageShowCase } from './ImageShowCase'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { EXPERIENCE_IMG_1, EXPERIENCE_IMG_2, EXPERIENCE_IMG_3, EXPERIENCE_IMG_4, EXPERIENCE_IMG_5 } from '@/constants/icons/svgUrls'
import { GradientLoadingFooter } from '@/components/Footer/RimigoFooter'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import MultiSelectDestinationPicker from '@/components/shared/MultiSelectDestinationPicker'
import CollectionsPage from '@/pages/Collections'

const staticImages = [EXPERIENCE_IMG_1, EXPERIENCE_IMG_2, EXPERIENCE_IMG_3, EXPERIENCE_IMG_4, EXPERIENCE_IMG_5]

const LandingZeroStateMultiSelectDestination = () => {
    const handleProceed = (selectedDestinations: SearchDestinationCardData[]) => {
        if (selectedDestinations.length === 0) return

        const firstSelected = selectedDestinations[0]
        const params = new URLSearchParams({
            country_id: firstSelected.id,
            country_name: firstSelected.title,
            checkCountryMismatch: 'false'
        })

        // Add individual country IDs as country_id_1, country_id_2, etc.
        selectedDestinations.forEach((dest, index) => {
            params.set(`country_id_${index + 1}`, dest.id)
        })

        window.location.href = `${DEFAULT_LANDING_PAGE_ROUTE}?${params.toString()}`
    }

    return (
        <div className="relative w-full min-h-full bg-grey-5 md:bg-white flex flex-col items-center justify-start">
            <div className="w-full min-h-auto md:h-auto flex flex-col items-center justify-start bg-grey-5 pt-[4%] md:py-[6%] rounded-b-[32px] md:shadow-[0px_2px_8px_#e0e0e0]">
                {/* Top Images Fan */}
                <div className="flex items-center justify-center mt-30 md:mt-0 mb-6 md:mb-12 px-4">
                    <ImageShowCase
                        className="max-md:w-[64px] max-md:h-[52px]"
                        images={staticImages}
                        aspectRatio="landscape"
                        showPlayButton={false}
                        isHovered={false}
                        enableTiltOnHover={false}
                        showBorder={false}
                        maxImages={5}
                        imageWidthPortraitCustom="w-20"
                        imageHeightPortraitCustom="h-16"
                        gap="none"
                    />
                </div>

                {/* Header */}
                <h1
                    className="text-[35px] md:text-[56px] leading-[32px] md:leading-[56px] mt-30 md:mt-0 font-red-hat-display font-[467] font-medium text-grey-0 text-center mb-8 md:mb-16 tracking-tight px-4"
                    style={{
                        filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                    }}>
                    End-to-end travel
                    <br />
                    assistance for{' '}
                    <span
                        className="text-primary-default italic font-[467]"
                        style={{
                            filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                        }}>
                        you
                    </span>
                </h1>

                {/* Multi-select destination picker */}
                <MultiSelectDestinationPicker
                    onProceed={handleProceed}
                    showHeader={false}
                    className="max-w-[760px]"
                />
            </div>
            {/* ── Tripboards nudge section ── */}
            <div className="w-full max-w-7xl mx-auto md:px-8 mt-10 md:mt-6">

                {/* Collections component */}
                <CollectionsPage hideHeader TitleClassname={"block!"} />
            </div>

            <div className="block mt-auto w-full">
                <GradientLoadingFooter />
            </div>
        </div>
    )
}

export default LandingZeroStateMultiSelectDestination
