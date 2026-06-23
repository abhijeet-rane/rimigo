import React from 'react'

interface CareersLayoutProps {
    children: React.ReactNode
}

const CareersLayout = ({ children }: CareersLayoutProps) => {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
        </div>
    )
}

export default CareersLayout
