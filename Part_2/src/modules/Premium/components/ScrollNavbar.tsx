import { Button } from "@/components/shared/ButtonNew";
import LogoWithBadge from "../components/LogoWithBadge";
import { useScrollThreshold } from "../../../hooks/useScrollThreshold";
import HamburgerBtn from "@/components/common/HamburgerBtn";
import { DEFAULT_LANDING_PAGE_ROUTE } from "@/routes/routes";
import { useAuth } from "@/lib/auth/providers/AuthProviders";

type ScrollNavbarProps = {
    onRequestCallback: () => void
    onBuyNow: () => void
    isPremium?: boolean
}

const ScrollNavbar = ({ onRequestCallback, onBuyNow, isPremium = false }: ScrollNavbarProps) => {
      const { isAuthenticated } = useAuth();
    const scrolled = useScrollThreshold(150,"premium-scroll-container");

    return (
        <nav
            className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-500 ease-out py-1 md:py-3
        ${scrolled
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-2 pointer-events-none"}
      `}
        >
            {/* Background */}
            <div className="absolute inset-0 bg-natural-white/80 md:bg-natural-white/85 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] " />

            {/* Content */}
            <div className="relative mx-auto px-3 md:px-6  h-16 grid grid-cols-3 items-center ">

                {/* LEFT SPACER (keeps logo centered) */}
                <div className="flex justify-start w-full">
                      <HamburgerBtn
                        fallbackRoute={DEFAULT_LANDING_PAGE_ROUTE}
                        className={`md:shadow-md bg-white hover:bg-gray-200 ${
                            isAuthenticated ? 'hidden md:flex' : ''
                        }`}
                      />
                </div>

                {/* CENTER LOGO */}
                <div className="flex justify-center">
                    <LogoWithBadge
                        logoSrc="/icons/logo-transparent-indigo.png"
                        badgeText="PREMIUM"
                    />
                </div>

                {/* RIGHT ACTIONS */}
                <div className=" hidden  md:flex justify-end gap-3 px-12">
                    {/* Request Callback */}
                    <Button
                        title="REQUEST CALLBACK"
                        onClick={onRequestCallback}
                        className="
                        min-w-[160px]
                        w-fit!
                        px-6 py-3
                        font-red-hat-display
                        font-[645]
                        text-[16px]
                        bg-linear-to-r from-header-black to-black
                        text-white
                        rounded-lg
                        transition-all
                        
                        "
                    />

                    {/* Add when checkout will be implemented */}
                    {!isPremium && (
                        <Button
                            title="BUY NOW"
                            onClick={onBuyNow}
                            className="
                            min-w-[140px]
                            w-fit!
                            px-6
                            font-red-hat-display
                            font-[645]
                            text-[16px]
                            bg-linear-to-r from-primary-default to-primary-dark
                            text-white
                            rounded-lg
                            transition-all
                            "
                        />
                    )}
                </div>
            </div>
        </nav>
    );
};

export default ScrollNavbar;
