import React, { useEffect } from 'react'
import WishlistButton, { WishlistButtonConfig } from './WishlistHeader'
import { Menu } from 'lucide-react'
import { useSidebarContext } from './layouts/SideBarLayout'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

interface MobileBaseHeaderProps {
    title: string
    wishlistConfig: WishlistButtonConfig
    /** Optional content to show on the right (e.g. share button). When set, takes precedence over wishlist. */
    rightSlot?: React.ReactNode
}

const MobileBaseHeader: React.FC<MobileBaseHeaderProps> = ({ title, wishlistConfig, rightSlot }) => {
    const { isAuthenticated } = useAuth()

    const { openSidebar, setHideHamburger } = useSidebarContext()
    useEffect(() => {
        // 🔒 Permanently hide hamburger
        setHideHamburger(true)
    }, [setHideHamburger])
    return (
        <div className="w-full flex items-center justify-between px-[30px]  py-5 bg-white  relative ">
            {/* Empty div to take left space for proper centering */}
            {isAuthenticated && (
                <button
                    className="h-10 w-10 rounded-full flex justify-center items-center bg-white "
                    onClick={openSidebar}>
                    <Menu className="w-6 h-6 text-header-black" />
                </button>
            )}

            {/* Title centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2 font-red-hat-display font-[645] text-[16px] text-center">
                {title.toLocaleUpperCase()}
            </div>

            {/* Right: custom slot (e.g. share), or wishlist, or spacer */}
            <div className="flex items-center justify-end min-w-[40px]">
                {rightSlot ?? (wishlistConfig.enabled ? <WishlistButton config={wishlistConfig} /> : <div className="h-8" />)}
            </div>
        </div>
    )
}

export default MobileBaseHeader
