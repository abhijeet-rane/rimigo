import React, { useEffect, useMemo, useRef, useState } from 'react'
import StickyAside from '@/components/shared/Sticky/StickyAside'
import { useIsMobile } from '@/hooks/use-mobile'

type ScrollTabConfig = {
    id: string
    tabTitle: string
    component: React.ReactNode
    visible?: boolean // Controls tab visibility (default: true)
}

type ScrollTabGroup = {
    tabs: ScrollTabConfig[]
    stickyAside?: React.ReactNode
}

type ScrollTabsContainerProps = {
    /** Legacy: flat list of tabs (for backward compatibility) */
    tabs?: ScrollTabConfig[]
    /** New: grouped tabs with optional sticky aside per group */
    groups?: ScrollTabGroup[]
    /** Height of any sticky header above the tabs (px). Used to offset scroll and observer. */
    stickyOffset?: number
    /** Extra class for the sticky tab bar wrapper */
    tabBarClassName?: string
    /** Extra class for the whole container */
    className?: string
    /** Gap between grid columns when sticky aside is present in rem units (default: 1.5 for gap-6) */
    gridGap?: number
    /** Optional callback function that is called when a tab is clicked. Receives the tab id as parameter. */
    onTabClick?: (tabId: string) => void
}

const ScrollTabsContainer: React.FC<ScrollTabsContainerProps> = ({
    tabs,
    groups,
    stickyOffset = 96,
    tabBarClassName,
    className,
    gridGap = 1.5,
    onTabClick
}) => {
    const tabsRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const scrollParentRef = useRef<HTMLElement | Window | null>(null)
    const suppressIORef = useRef<boolean>(false)
    const suppressTimeoutRef = useRef<number | null>(null)
    const isMobile = useIsMobile()
    // Normalize: if groups provided, use groups; otherwise convert tabs to a single group
    const normalizedGroups = useMemo(() => {
        if (groups) return groups
        if (tabs) return [{ tabs }]
        return []
    }, [groups, tabs])

    // Flatten all tabs from all groups for the tab bar, filtering out tabs where visible is false
    const allTabs = useMemo(() => normalizedGroups.flatMap((group) => group.tabs).filter((tab) => tab.visible !== false), [normalizedGroups])

    const [activeTab, setActiveTab] = useState<string>(allTabs[0]?.id || '')
    const activeTabRef = useRef(activeTab)
    const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({ left: 8, width: 40 })

    const sectionIds = useMemo(() => allTabs.map((t) => t.id), [allTabs])

    // Update activeTab if allTabs changes and current activeTab is no longer valid
    useEffect(() => {
        if (allTabs.length > 0 && !allTabs.some((t) => t.id === activeTab)) {
            setActiveTab(allTabs[0].id)
        } else if (allTabs.length > 0 && !activeTab) {
            setActiveTab(allTabs[0].id)
        }
    }, [allTabs, activeTab])

    // Keep ref updated
    useEffect(() => {
        activeTabRef.current = activeTab
    }, [activeTab])

    // Initialize underline on mount
    useEffect(() => {
        const container = tabsRef.current
        if (!container) return
        const init = () => {
            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
            const btn = buttons[0]
            if (btn) {
                const left = btn.offsetLeft + 8
                const width = btn.clientWidth - 16
                setUnderlineStyle({ left, width })
            }
        }
        const id = window.requestAnimationFrame(init)
        return () => window.cancelAnimationFrame(id)
    }, [])

    // Keep underline in sync on tab change and resize
    useEffect(() => {
        const container = tabsRef.current
        if (!container) return
        const update = () => {
            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
            const idx = sectionIds.indexOf(activeTab)
            const btn = buttons[idx] || buttons[0]
            if (btn) {
                const left = btn.offsetLeft + 8
                const width = btn.clientWidth - 16
                setUnderlineStyle({ left, width })
            }
        }
        const id = window.requestAnimationFrame(update)
        const ro = new ResizeObserver(update)
        ro.observe(container)
        window.addEventListener('resize', update)
        return () => {
            window.cancelAnimationFrame(id)
            ro.disconnect()
            window.removeEventListener('resize', update)
        }
    }, [activeTab, sectionIds])

    // Resolve nearest scrollable parent (window fallback)
    useEffect(() => {
        const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
            if (!node) return window
            const overflowRegex = /(auto|scroll|overlay)/
            let parent: HTMLElement | null = node.parentElement
            while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent)
                const overflowY = style.overflowY
                const overflow = style.overflow
                if (overflowRegex.test(overflowY) || overflowRegex.test(overflow)) {
                    return parent
                }
                parent = parent.parentElement
            }
            return window
        }
        scrollParentRef.current = getScrollParent(containerRef.current)
    }, [])
    useEffect(() => {
        if (isMobile) return
        // IntersectionObserver logic
    }, [sectionIds, stickyOffset])

    // Intersection observer to update active tab on scroll
    useEffect(() => {
        const sectionIdToTab: Record<string, string> = sectionIds.reduce(
            (acc, id) => {
                acc[id] = id
                return acc
            },
            {} as Record<string, string>
        )

        const collectTargets = () =>
            sectionIds.map((id) => ({ id, el: document.getElementById(id) })).filter((x): x is { id: string; el: HTMLElement } => Boolean(x.el))

        let targets = collectTargets()
        if (targets.length === 0) {
            const raf = requestAnimationFrame(() => {
                targets = collectTargets()
            })
            return () => cancelAnimationFrame(raf)
        }

        const ratios = new Map<string, number>()
        const observer = new IntersectionObserver(
            (entries) => {
                if (suppressIORef.current) {
                    return
                }
                entries.forEach((e) => {
                    const id = (e.target as HTMLElement).id
                    const ratio = e.intersectionRatio || 0
                    ratios.set(id, ratio)
                })

                const currentId = activeTabRef.current
                const currentRatio = ratios.get(currentId) ?? 0
                const keepThreshold = 0.45
                if (currentRatio >= keepThreshold) return

                let bestId: string | null = null
                let bestRatio = 0
                ratios.forEach((r, id) => {
                    if (r > bestRatio) {
                        bestRatio = r
                        bestId = id
                    }
                })
                const minSwitch = 0.25
                if (bestId && bestRatio >= minSwitch) {
                    const next = sectionIdToTab[bestId]
                    if (next && next !== activeTabRef.current) {
                        setActiveTab(next)
                    }
                }
            },
            {
                root: scrollParentRef.current instanceof Window ? null : (scrollParentRef.current as Element | null),
                threshold: [0.1, 0.25, 0.5, 0.75],
                rootMargin: `-${stickyOffset}px 0px -45% 0px`
            }
        )

        targets.forEach(({ el }) => observer.observe(el))
        return () => observer.disconnect()
    }, [sectionIds, stickyOffset])

    const handleTabClick = (id: string) => {
        setActiveTab(id)
        onTabClick?.(id)

        const el = document.getElementById(id)
        if (!el) return

        el.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })

        // Prevent IO from fighting with programmatic scroll
        suppressIORef.current = true
        if (suppressTimeoutRef.current) window.clearTimeout(suppressTimeoutRef.current)
        // Smooth scroll with offset for sticky headers; support inner scroll containers
        const isWindow = scrollParentRef.current instanceof Window || scrollParentRef.current === null
        const sp = isWindow ? window : (scrollParentRef.current as HTMLElement)
        const targetTop = el.getBoundingClientRect().top
        if (isWindow) {
            const absoluteY = window.scrollY + targetTop - (stickyOffset + 8)
            window.scrollTo({ top: absoluteY, behavior: 'smooth' })
        } else {
            const spRect = (sp as HTMLElement).getBoundingClientRect()
            const currentScrollTop = (sp as HTMLElement).scrollTop
            const offsetWithin = targetTop - spRect.top
            const nextTop = currentScrollTop + offsetWithin - (stickyOffset + 8)
            ;(sp as HTMLElement).scrollTo({ top: nextTop, behavior: 'smooth' })
        }
        // Re-enable IO after scroll likely settles
        suppressTimeoutRef.current = window.setTimeout(() => {
            suppressIORef.current = false
        }, 700)
    }

    return (
        <div
            className={className}
            ref={containerRef}>
            {/* Sticky, horizontally scrollable tab bar */}
            <div
                style={{ position: 'sticky', top: -Math.max(0, stickyOffset), background: '#FFF', zIndex: 30 }}
                className="pt-12 md:pt-14">
                <div
                    ref={tabsRef}
                    className={`relative  flex items-center gap-2 md:gap-6 text-sm border border-t-0 border-l-0 border-r-0 touch-pan-x overscroll-x-contain border-feature-card-border bg-white overflow-x-auto no-scrollbar ${tabBarClassName || ''}`}>
                    {allTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabClick(tab.id)}
                            className="px-2 pb-3 cursor-pointer whitespace-nowrap"
                            style={{
                                color: activeTab === tab.id ? 'var(--primary-indigo, #7011F6)' : 'var(--grey-2, #747474)',
                                fontFamily: 'Manrope',
                                fontSize: '16px',
                                lineHeight: '20px',
                                letterSpacing: '-0.32px',
                                fontWeight: activeTab === tab.id ? 700 : 600
                            }}>
                            <div>{tab.tabTitle}</div>
                        </button>
                    ))}
                    <div
                        className="absolute bottom-0 h-[2px] transition-all duration-300 ease-out"
                        style={{
                            left: underlineStyle.left,
                            width: underlineStyle.width,
                            backgroundColor: 'var(--primary-indigo, #7011F6)'
                        }}
                    />
                </div>
            </div>

            {/* Sections grouped by groups */}
            <div className="mt-5">
                {normalizedGroups.map((group, groupIndex) => {
                    const hasStickyAside = !!group.stickyAside

                    return (
                        <div key={groupIndex}>
                            {hasStickyAside ? (
                                // Grid layout when sticky aside is present
                                <div
                                    className="grid grid-cols-1 lg:grid-cols-3 "
                                    style={{ gap: `${gridGap}rem` }}>
                                    <div className="lg:col-span-2">
                                        {group.tabs.map((tab) => (
                                            <section
                                                key={tab.id}
                                                id={tab.id}
                                                className="scroll-mt-24">
                                                {tab.component}
                                            </section>
                                        ))}
                                    </div>
                                    <StickyAside top={stickyOffset + 16}>{group.stickyAside}</StickyAside>
                                </div>
                            ) : (
                                // Full width when no sticky aside
                                <div>
                                    {group.tabs.map((tab) => (
                                        <section
                                            key={tab.id}
                                            id={tab.id}
                                            className="scroll-mt-24">
                                            {tab.component}
                                        </section>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ScrollTabsContainer

export type { ScrollTabConfig, ScrollTabGroup, ScrollTabsContainerProps }
