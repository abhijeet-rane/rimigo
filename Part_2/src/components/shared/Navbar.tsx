
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RIMIGO_TEXT_LOGO } from '@/constants/icons/svgFromCDN'
import HeroCTA from '@/pages/Home/sections/Hero/component/Herocta'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import clsx from 'clsx'
import LogoRimigoIconText from '@/modules/Onboarding/components/LogoRimigoIconText'

interface NavbarProps {
    disableScrollEffect?: boolean
}

const Navbar = ({ disableScrollEffect = true }: NavbarProps) => {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        if (disableScrollEffect) return
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])


    return (
        <nav
            className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
                 disableScrollEffect || scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm' : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-6 py-3 md:py-0">
                <div className="flex items-center justify-between h-16 md:h-20 gap-3">
                {/* LEFT: Logo */}
                <div className="flex items-center gap-8">
                    {disableScrollEffect || scrolled ? (
                        <>
                        {/* Logo */}
                        <a href="/" data-testid="logo-link">
                            <img
                                src={RIMIGO_TEXT_LOGO}
                                alt="Rimigo"
                                className="h-10 md:h-12"
                            />
                        </a>
                        </>
                    ): (
                        <LogoRimigoIconText text="Rimigo" className='mt-0! md:mt-0! mb-0! md:mb-0! ' logoClassName=' md:h-10! md:w-10px' textClassName='md:text-[37px]'/>
                    )}
                </div>

                    {/* RIGHT: HeroCTA (Plan my trip) + Login */}
                    <div className="flex items-center gap-3">
                        <div
                            className={`hidden md:block transition-all mt-15 duration-300 ${
                                disableScrollEffect || scrolled ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'

                            }`}>
                            <HeroCTA isAuthenticated={isAuthenticated} />
                        </div>

                        {/* Login — bordered button, hidden when authenticated */}
                        {!isAuthenticated && (
                            <button
                                onClick={() => navigate('/login')}
                                className={clsx(
                                    "cursor-pointer font-red-hat-display px-3 py-3 md:px-4 md:py-2.5 bg-transparent/50 border rounded-[12px] font-semibold text-[16px] inline-flex items-center gap-1.5 md:gap-2 transition-all duration-200 hover:bg-grey-2 active:scale-[0.98]",
                                    {
                                        "text-grey-1 border-grey-1": disableScrollEffect || scrolled,
                                        "text-natural-white border-natural-white": !disableScrollEffect && !scrolled
                                    }
                                )}
                            >
                                Login
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </nav>
    )
}

export default Navbar
