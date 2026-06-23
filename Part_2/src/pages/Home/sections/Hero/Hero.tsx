import { StatItem } from '@/modules/Premium/sections/NumberWeProud'
import HeroHeadline from './component/Heroheadline'
import { HandCoins, Hotel, Play, SquareKanban } from 'lucide-react'
import SectionTitle from '@/modules/Premium/shared/Sectiontitle'
import GlowButton from '@/modules/Premium/shared/GlowButton'
import HeroStats from './component/HeroStats'
import { THREESTAR_WHITE } from '@/constants/icons/svgFromCDN'
import { LANDING_PAGE_BG_VIDEOS, RIMIGO_TUTORIAL_VIDEO, SHARK_TANK_IMAGE_URL, STATIC_LANDING_TEXT } from '@/constants'
import { GradientLoading } from '@/utils/SvgUtils'
import { useState } from 'react'
import HeroVideoModal from './component/HeroVideomodal'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

// Toggle to use Shark Tank image instead of title text
const USE_SHARK_TANK_IMAGE = true

type HeroProps = {
    onCtaClick?: (() => void) | undefined
}

const stats: StatItem[] = [
    { label: 'Lowest prices', icon: <HandCoins className="w-6 h-6 text-primary" /> },
    { label: 'Custom itinerary', icon: <SquareKanban className="w-6 h-6 text-primary" /> },
    { label: 'Handpicked stays', icon: <Hotel className="w-6 h-6 text-primary" /> }
]

const Hero = ({ onCtaClick }: HeroProps) => {
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [showVideo, setShowVideo] = useState(false)
    const { trackButtonClickCustom } = usePostHog()

    const handleVideoClick = () => {
        trackButtonClickCustom({
            buttonPage: 'home_page_v1',
            buttonName: 'see_how_it_works',
            buttonAction: 'cta_button_clicked',
            location: 'hero_section_mobile'
        })
        setShowVideo(true)
    }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <video
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                onLoadedData={() => setVideoLoaded(true)}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    videoLoaded ? 'opacity-100' : 'opacity-0'
                } -z-10`}>
                <source
                    src={LANDING_PAGE_BG_VIDEOS.FULL_VIDEO}
                    type="video/webm"
                />
            </video>

            {/* Gradient overlay */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 to-black/60" />

            {/* top gradient */}
            <GradientLoading className="block absolute -top-14 md:-top-1 left-0 w-full pointer-events-none z-0 scale-x-200 md:scale-x-300" />

            <div className="relative z-10 max-w-full mx-auto px-6 pt-[0px] md:pt-0 pb-10 md:pb-20 text-center flex flex-col justify-center items-center gap-9 md:gap-9 mt-13 md:mt-40">
                <br className="md:hidden"/>
                {USE_SHARK_TANK_IMAGE ? (
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-white text-[12px] font-medium md:text-[16px] font-manrope tracking-[8%] md:leading-[28px]">As seen  on </p>
                        <img
                            src={SHARK_TANK_IMAGE_URL}
                            alt="Shark Tank India"
                            className="h-auto object-contain"
                            style={{ maxHeight: '28px' }}
                        />
                    </div>
                ) : (
                    <SectionTitle
                        title="Expert verified"
                        imgSrc={THREESTAR_WHITE}
                        bgColor="bg-badge-button"
                        className="text-[13px]! md:text-[14px]! font-[550]! font-red-hat-display! text-white!  tracking-[-4%] mr-[6px]! md:mr-[10px]!"
                    />
                )}
                <HeroHeadline />
                {/* Stacked on mobile, side by side on desktop */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 md:mt-10">
                    <GlowButton
                        onClick={onCtaClick}
                        glowClassName="bg-linear-to-r from-primary-default to-primary-dark blur-xl opacity-50 scale-110"
                        buttonClassName="bg-linear-to-r from-primary-light to-primary-default to-primary-dark font-semibold font-red-hat-display px-[45px] py-[15px] rounded-xl text-[19px] font-bold! font-red-hat-display"
                        showGlow={true}>
                        Plan my trip
                    </GlowButton>

                    {/* Mobile: underline text style */}
                    <button
                        onClick={handleVideoClick}
                        className="cursor-pointer font-red-hat-display font-semibold text-[16px] leading-[28px] underline inline-flex md:hidden items-center gap-1.5 text-natural-white transition-all duration-200 hover:opacity-80"
                    >
                        <Play size={18} className="w-4 h-4" />
                        {STATIC_LANDING_TEXT.cta.seeHowItWorks}
                    </button>

                    {/* Desktop: bordered button matching Login style, same height as Plan my trip */}
                    <button
                        onClick={handleVideoClick}
                        className="cursor-pointer font-red-hat-display font-semibold text-[16px] hidden md:inline-flex items-center gap-2 px-6 py-[15px] bg-transparent border border-natural-white text-natural-white rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                    >
                        <Play size={18} className="w-4 h-4" />
                        {STATIC_LANDING_TEXT.cta.seeHowItWorks}
                    </button>
                </div>

                <div className="mt-2 md:mt-5">
                    <HeroStats stats={stats} />
                </div>
            </div>

            {/* Video modal for mobile "How it works" */}
            <HeroVideoModal
                isOpen={showVideo}
                onClose={() => setShowVideo(false)}
                videoUrl={RIMIGO_TUTORIAL_VIDEO}
                title="How It Works"
                maxWidth="6xl"
            />
        </section>
    )
}

export default Hero
