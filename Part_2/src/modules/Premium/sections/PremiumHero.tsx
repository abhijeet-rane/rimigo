import { RIMIGO_TEXT_LOGO } from "@/constants/icons/svgFromCDN";
import { HERO_IMAGES } from "../constants";
import HeroBackground from "../shared/HeroBackground";
import GlowButton from "../shared/GlowButton";
import { DEFAULT_LANDING_PAGE_ROUTE } from "@/routes/routes";
import HamburgerBtn from "@/components/common/HamburgerBtn";
import { useAuth } from "@/lib/auth/providers/AuthProviders";
import { useSearchParams } from "react-router-dom";

type PremiumHeroProps = {
  onBuyNow: () => void
  onRequestCallback: () => void
  isPremium?: boolean
}

const PremiumHero = ({ onBuyNow, onRequestCallback, isPremium = false }: PremiumHeroProps) => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const buyCta = searchParams.get("buy") === "true";
  const ctaLabel = buyCta ? "BUY NOW" : "REQUEST CALLBACK";
  const ctaHandler = buyCta ? onBuyNow : onRequestCallback;

  return (
    <section className="relative min-h-[80vh] md:min-h-[95vh] flex flex-col overflow-hidden">

       <HamburgerBtn
          fallbackRoute={DEFAULT_LANDING_PAGE_ROUTE}
          className={`absolute top-4 left-4 z-20 bg-natural-white/90 hover:bg-natural-white shadow-md ${
          isAuthenticated ? 'hidden md:flex' : ''
        }`}
        />

      <HeroBackground
        logoSrc={RIMIGO_TEXT_LOGO}
        badgeText="PREMIUM"
        sideImageSrc={HERO_IMAGES}
      />


      {/* Center Content */}
      <div className="
        relative z-10 flex flex-1 flex-col items-center justify-center text-center
        px-[5%] mb-8 md:px-[10%] lg:px-[12%]
        -translate-y-[6%] md:translate-y-0
      ">

        {/* Heading */}
        <h1
          className="font-red-hat-display  font-[400] leading-none md:font-[350]  "
          style={{
            fontSize: "clamp(1.5rem, 9vw, 6rem)",
          }}
        >
          Let experts plan your 
          <br />
          
          <span className="text-primary-default italic">
            perfect vacation
          </span>
          
        </h1>

        {/* Subtitle */}
        <p
          className="mt-[7%] md:mt-[4%] font-manrope text-gray-600 px-3"
          style={{
            fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
            fontWeight: 400,
          }}
        >
          Your travel expert manages every detail so you can travel without any worries.
        </p>

        {/* CTA Buttons – FIXED SIZE */}
        <div className="pt-10 md:pt-5 mt-3 md:mt-[4%] relative flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {isPremium ? (
            <GlowButton onClick={ctaHandler} showGlow={true}>
              {ctaLabel}
            </GlowButton>
          ) : (
            <>
              {/* <button
                type="button"
                onClick={onRequestCallback}
                className="
                  min-w-[11.5rem] md:min-w-[12.5rem]
                  px-5 py-2.5 md:px-6 md:py-3
                  text-[1.3rem] md:text-[clamp(1.1rem,1.5vw,1.4rem)]
                  font-semibold font-red-hat-display
                  bg-linear-to-r from-header-black to-black
                  text-white
                  rounded-xl
                  cursor-pointer
                  transition-all
                "
              >
                REQUEST CALLBACK
              </button> */}
              <GlowButton
                onClick={ctaHandler}
                showGlow={true}
                buttonClassName="
                  min-w-[11.5rem] md:min-w-[12.5rem]
                  px-5 py-2.5 md:px-6 md:py-3
                  text-[1.3rem] md:text-[clamp(1.1rem,1.5vw,1.4rem)]
                  font-semibold font-red-hat-display
                  bg-linear-to-r! from-primary-default! to-primary-dark!
                  text-white
                  rounded-xl
                "
              >
                {ctaLabel}
              </GlowButton>
            </>
          )}
        </div>

        {/* Exclusive Offer + Arrow */}
        {/* <div className="flex items-center justify-start translate-x-[-15%] md:-translate-x-full mt-8 md:mt-3">

          <span
            className="mt-[5%] flex flex-col items-start font-bold text-secondary-orange rotate-[-10deg]"
            style={{
              fontFamily: "Caveat, cursive",
              fontSize: "clamp(1.7rem, 2vw, 2rem)",
              lineHeight: 1,
            }}
          >
            <span>Exclusive</span>
            <span>Launch offer</span>
          </span>

          <img
            src={ORANGE_ARROW}
            alt="Orange Arrow"
            className="w-[30%] max-w-35 object-contain mb-5"
          />
        </div> */}

      </div>
    </section>
  );
};

export default PremiumHero;
