import { useState } from 'react'
import clsx from 'clsx'
import BookingsListPage from '@/modules/Premium/pages/BookingsListPage'
import TripContentListPublicPage from '@/modules/ContentCollection/pages/TripCollections/TripContentListPublicPage'
import { ShortlistedExperiencesProvider } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'

type Tab = 'bookings' | 'tripboards'

const TABS: { key: Tab; label: string }[] = [
    { key: 'bookings', label: 'Bookings' },
    { key: 'tripboards', label: 'Tripboards' },
]

const PurchasesPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('bookings')

    return (
        <div className="min-h-screen bg-white">
            {/* Tab bar */}
            <div className="sticky top-0 z-40 bg-white border-b border-grey-4">
                <div className="max-w-[1320px] mx-auto px-4">
                    <div className="flex items-center justify-center gap-6 h-[72px]">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={clsx(
                                        'relative h-full px-1 text-[16px] font-semibold font-red-hat-display transition-colors cursor-pointer',
                                        isActive
                                            ? 'text-primary-default'
                                            : 'text-grey-2 hover:text-grey-0'
                                    )}>
                                    {tab.label}
                                    {/* Active underline */}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-default rounded-full" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
            
            {/* Tab content */}
            <div>
                {activeTab === 'bookings' && <BookingsListPage embedded />}
                {activeTab === 'tripboards' && (
                    <ShortlistedExperiencesProvider>
                        <TripContentListPublicPage hideSearchHeader />
                    </ShortlistedExperiencesProvider>
                )}
            </div>
        </div>
    )
}

export default PurchasesPage
