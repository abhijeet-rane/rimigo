import React, { useRef, useState, useEffect } from 'react'
interface CategoryTabsProps {
    activeTab: string // Category key from API
    onTabChange: (tab: string) => void
    availableCategories: string[] // Category keys from API (excluding "hero")
    categoryTitles: Record<string, string> // API-provided category titles mapped by category key
    /** Optional icon (e.g. globe, flag) to show before each tab label */
    categoryIcons?: Record<string, React.ReactNode>
}

/**
 * Generate section ID from category key
 * Format: section-{categoryKey}
 */
const getSectionIdFromCategoryKey = (categoryKey: string): string => {
    return `section-${categoryKey.toLowerCase()}`
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
    activeTab, 
    onTabChange, 
    availableCategories,
    categoryTitles,
    categoryIcons 
}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScrollability = () => {
        if (!scrollRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setCanScrollLeft(scrollLeft > 0)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }

    useEffect(() => {
        if (availableCategories.length > 0) {
            setTimeout(() => {
                checkScrollability()
            }, 100)
        }
    }, [availableCategories.length])

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return
        const scrollAmount = 200
        const newScrollLeft =
            direction === 'left'
                ? scrollRef.current.scrollLeft - scrollAmount
                : scrollRef.current.scrollLeft + scrollAmount
        scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }

    const handleTabClick = (categoryKey: string) => {
        onTabChange(categoryKey)
        
        // Scroll to the section
        const sectionId = getSectionIdFromCategoryKey(categoryKey)
        const element = document.getElementById(sectionId)
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    // Get display title for a tab (use API title if available, otherwise use category key)
    const getTabTitle = (categoryKey: string): string => {
        return categoryTitles[categoryKey] || categoryKey
    }

    return (
        <div className="w-full mb-2">
            {/* Mobile: Full width with horizontal lines */}
            <div className="max-md:w-screen max-md:relative max-md:left-[50%] max-md:-translate-x-1/2 max-md:border-t max-md:border-b max-md:border-grey-4 max-md:bg-white">
                <div 
                    className="w-full relative max-md:px-4 max-md:py-2 max-md:border-0 max-md:rounded-none max-md:shadow-none md:bg-white md:border md:border-grey-4 md:px-4 md:py-2.5 md:rounded-[50px] md:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
                    
                    {/* Left gradient overlay */}
                    {canScrollLeft && (
                        <div
                            onClick={() => scroll("left")}
                            className="absolute left-0 top-0 h-full md:w-24 max-md:w-18 z-10 
                                bg-gradient-to-r from-white to-transparent 
                                cursor-pointer rounded-l-[50px] flex items-center justify-start pl-2"
                        />
                    )}

                    {/* Right gradient overlay */}
                    {canScrollRight && (
                        <div
                            onClick={() => scroll("right")}
                            className="absolute right-0 top-0 h-full md:w-24 max-md:w-18 z-10 
                                bg-gradient-to-l from-white to-transparent 
                                cursor-pointer rounded-r-[50px] flex items-center justify-end pr-2"
                        />
                    )}

                    {/* Tabs container */}
                    <div 
                        ref={scrollRef}
                        onScroll={checkScrollability}
                        className="w-full flex items-center justify-start gap-2 overflow-x-auto scroll-smooth flex-shrink-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {/* Padding for left gradient overlay */}
                        <div className="shrink-0 w-1" />
                        
                        {availableCategories.map((categoryKey) => {
                            const isActive = categoryKey === activeTab
                            const icon = categoryIcons?.[categoryKey]
                            return (
                                <button
                                    key={categoryKey}
                                    onClick={() => handleTabClick(categoryKey)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer whitespace-nowrap transition-all duration-200 flex-shrink-0 hover:opacity-80"
                                    style={{
                                        backgroundColor: isActive ? '#F4EDFF' : '#FFFFFF',
                                        color: isActive ? '#4D1D91' : '#000000',
                                        fontFamily: 'Manrope',
                                        fontSize: '14px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.32px',
                                        fontWeight: 600,
                                        border: isActive 
                                            ? '1.5px solid var(--primary-indigo, #7011F6)' 
                                            : '1px solid #E5E7EB',
                                        transition: 'all 0.2s ease-in-out'
                                    }}>
                                    {icon && <span className="flex items-center justify-center flex-shrink-0 w-5 h-5">{icon}</span>}
                                    <span>{getTabTitle(categoryKey)}</span>
                                </button>
                            )
                        })}

                        {/* Padding for right gradient overlay */}
                        <div className="shrink-0 w-1" />
                    </div>
                </div>
            </div>
        </div>
    )
}