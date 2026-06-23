import { useEffect, useRef } from "react";
import NumberWeProud from "../sections/NumberWeProud";
import PremiumHero from "../sections/PremiumHero";
import TravllerSaved from "../sections/TravllerSaved";
import WhatyouGet from "../sections/WhatyouGet";
import FAQ_REUSE from "../sections/FAQ_reuseable";
import RimigoFooter from "@/components/Footer/RimigoFooter";
import { FAQ_HEADER, faqItems } from "../constants";
import AreYouReady from "../sections/AreYouReady";
import HowItWorks from "../sections/HowItWorks";
import ScrollNavbar from "../components/ScrollNavbar";
import MobileStickyCTA from "../components/MobileStickyCTA";
import { UnlimitedItinearies } from "../sections/UnlimitedItinearies";
import { GetExlusive } from "../sections/GetExlusive";
import { EnhanceYourTrip } from "../sections/EnhanceYourTrip";
import TravelersCarousel from "../sections/TravelersCarousel";
import PremiumBenefits from "../sections/PremiumBenefits";
import { usePostHog } from "@/modules/amplitude/components/PostHogProvider";
import { useSidebarContext } from "@/components/layouts/SideBarLayout";
import { useAuth } from "@/lib/auth/providers/AuthProviders";
import { useUserInfo } from "@/hooks/useUserInfo";
import { usePremiumPurchase } from "../hooks/usePremiumPurchase";
import { usePremiumScrollActions } from "../hooks/usePremiumScrollActions";
import { usePremiumLandingEffects } from "../hooks/usePremiumLandingEffects";
import { useLoginModal } from "@/modules/Onboarding/context/LoginModalContext";

const PremiumLandingPage = () => {
    const { trackButtonClickCustom } = usePostHog();
    const { setHideHamburger } = useSidebarContext();
    const { isAuthenticated } = useAuth();
    const { isPremium } = useUserInfo();

    const premiumFormRef = useRef<HTMLDivElement | null>(null);
    const premiumBenefitsRef = useRef<HTMLDivElement | null>(null);

    const { scrollToPremiumForm, scrollToPremiumBenefits } = usePremiumScrollActions(
        premiumFormRef,
        premiumBenefitsRef,
        trackButtonClickCustom
    );

    const { handleBuyNowWithAuth, isProcessingPayment } = usePremiumPurchase(
        trackButtonClickCustom
    );
    const { openLoginModal } = useLoginModal()

    const handleBuyNowClick = async () => {
        trackButtonClickCustom({
            buttonPage: 'premium_landing_v1',
            buttonName: 'buy_now_clicked',
            buttonAction: 'click',
            extra: { section: 'premium_benefits', is_authenticated: isAuthenticated }
        })
        if (!isAuthenticated) {
            trackButtonClickCustom({
                buttonPage: 'premium_landing_v1',
                buttonName: 'buy_now_clicked',
                buttonAction: 'login_redirect',
                extra: { section: 'premium_benefits', is_authenticated: false }
            })
            // Open login modal - it will auto-capture current URL
            // After login success, refresh the page to update auth state
            openLoginModal({
                redirectAfterLogin: false,
                onLoginSuccess: () => {
                    void handleBuyNowWithAuth()
                }
            })
        } else {
            void handleBuyNowWithAuth()
        }
    }

    usePremiumLandingEffects(setHideHamburger, isAuthenticated, premiumBenefitsRef);

    const mobileStickyButtons = [
        {
            title: "REQUEST CALLBACK",
            onClick: scrollToPremiumForm,
            textStyle: "text-[15px] font-red-hat-display font-[645]",
            className: "flex-[1.7] py-3 bg-linear-to-r from-header-black to-black text-white rounded-lg",
            variant: "custom" as const,
        },
    ];

    useEffect(() => {
        const scrollTarget = sessionStorage.getItem('scrollTo')
        if (scrollTarget === 'request-callback') {
            sessionStorage.removeItem('scrollTo')
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                premiumFormRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 500)
        }
    }, [])

    // if (!isPremium) {
    //     mobileStickyButtons.push({
    //         title: "BUY NOW",
    //         onClick: scrollToPremiumBenefits,
    //         textStyle: "text-[17px] font-red-hat-display font-[645]",
    //         className: "flex-1 py-3 bg-linear-to-r from-primary-default to-primary-dark text-white rounded-lg",
    //         variant: "custom" as const,
    //     });
    // }

    return (
        <>
            <ScrollNavbar
                onRequestCallback={scrollToPremiumForm}
                onBuyNow={isPremium ? scrollToPremiumForm : scrollToPremiumBenefits}
                isPremium={isPremium}
            />
            <MobileStickyCTA
                buttons={mobileStickyButtons}
                buttonsContainerClassName="flex-row gap-3"
            />

            <main>
                <PremiumHero
                    onBuyNow={isPremium ? scrollToPremiumForm : scrollToPremiumBenefits}
                    onRequestCallback={scrollToPremiumForm}
                    isPremium={isPremium}
                />
                <WhatyouGet />
                <TravllerSaved />
                <UnlimitedItinearies />
                <GetExlusive />
                <EnhanceYourTrip />
                <HowItWorks />
                <TravelersCarousel />
                <NumberWeProud />
                <div ref={premiumBenefitsRef}>
                    <PremiumBenefits
                        onBuyNow={isPremium ? scrollToPremiumForm : handleBuyNowClick}
                        onRequestCallback={scrollToPremiumForm}
                        isProcessingPayment={isProcessingPayment}
                        isPremium={isPremium}
                    />
                </div>
                <FAQ_REUSE
                    title={FAQ_HEADER}
                    items={faqItems}
                    defaultOpenItems={['item-1']}
                />
                <div ref={premiumFormRef} id="request-callback">
                    <AreYouReady />
                </div>
                <RimigoFooter />
            </main>
        </>
    );
};

export default PremiumLandingPage;
