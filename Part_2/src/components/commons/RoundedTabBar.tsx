import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface Tab {
    label: string
    value: string
}

interface TabBarProps {
    tabs: Tab[]
    onTabChange: (value: string, index: number) => void
    defaultTab?: number
}

const RoundedTabBar: React.FC<TabBarProps> = ({ tabs, onTabChange, defaultTab = 0 }) => {
    const [activeTab, setActiveTab] = useState<number>(defaultTab)

    const handleTabClick = (index: number): void => {
        setActiveTab(index)
        onTabChange(tabs[index].value, index)
    }

    return (
        <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            {tabs.map((tab, index) => (
                <button
                    key={tab.value}
                    onClick={() => handleTabClick(index)}
                    className="cursor-pointer relative px-6 py-2 text-sm font-medium transition-colors duration-200 rounded-full"
                    style={{ zIndex: 1 }}>
                    {activeTab === index && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-white rounded-full shadow-md"
                            style={{ zIndex: -1 }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className={`relative z-10 ${activeTab === index ? 'text-primary-default font-semibold' : 'text-gray-600'}`}>
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    )
}

export { RoundedTabBar, type Tab, type TabBarProps }
