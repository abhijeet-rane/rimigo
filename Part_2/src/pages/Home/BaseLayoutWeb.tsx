import React from 'react'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/Footer/Footer'

interface BaseLayoutWebProps {
    children: React.ReactNode
    disableNavbarScrollEffect?: boolean
}

export default function BaseLayoutWeb({ children  , disableNavbarScrollEffect}: BaseLayoutWebProps) {
    return (
        <>
            <Navbar disableScrollEffect={disableNavbarScrollEffect}/>
            <main>{children}</main>
            <Footer />
        </>
    )
}
