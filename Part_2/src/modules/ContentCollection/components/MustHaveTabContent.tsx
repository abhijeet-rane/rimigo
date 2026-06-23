import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Lightbulb, Link2, FileCheck, Wifi } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { useIsMobile } from '@/hooks/use-mobile'
import { contentCollectionApi } from '../api/contentCollectionApi'
import Divider from '@/components/shared/Divider/Divider'
import TipsTabContent from './TipsTabContent'
import LinksTabContent from './LinksTabContent'
import VisaTabContent from './VisaTabContent'
import SimTabContent from './SimTabContent'
import type { ApiResponse, ContentCollection, Section } from '../types/contentCollection'

const HOURS_24 = 24 * 60 * 60 * 1000

type CollectionApi = {
    getByIdentifier: (identifier: string, sectionType?: string) => Promise<ApiResponse<ContentCollection>>
    addSection: (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
        }
    ) => Promise<unknown>
    deleteSection: (identifier: string, sectionId: string) => Promise<void>
    updateBlock: (
        identifier: string,
        sectionId: string,
        blockId: string,
        payload: Partial<{
            block_type: string
            label: string | null
            description: string | null
            value: Record<string, unknown>
        }>
    ) => Promise<unknown>
}

interface MustHaveTabContentProps {
    collectionIdentifier: string
    isRimigoInternal?: boolean
    isActive?: boolean
    api?: CollectionApi
    stickyTop?: { mobile: number; desktop: number }
    bottomPaddingClassName?: string
}

type SubTabKey = 'tips' | 'links' | 'visa' | 'sim'

const SUB_TABS: { key: SubTabKey; label: string; Icon: React.ElementType }[] = [
    { key: 'tips', label: 'Tips', Icon: Lightbulb },
    { key: 'links', label: 'Useful Links', Icon: Link2 },
    { key: 'visa', label: 'Visa', Icon: FileCheck },
    { key: 'sim', label: 'SIM & Connectivity', Icon: Wifi }
]

const SUBTAB_NAV_HEIGHT = 56
const DEFAULT_STICKY_TOP = { mobile: 105, desktop: 80 }
const SUB_TAB_LABELS: Record<SubTabKey, string> = {
    tips: 'Tips',
    links: 'Useful Links',
    visa: 'Visa',
    sim: 'SIM & Connectivity'
}
const MD_BREAKPOINT_PX = 768

const MustHaveTabContent: React.FC<MustHaveTabContentProps> = ({
    collectionIdentifier,
    isRimigoInternal = false,
    isActive = false,
    api = contentCollectionApi,
    stickyTop = DEFAULT_STICKY_TOP,
    bottomPaddingClassName = 'pb-12'
}) => {
    // Fetch the whole collection once at the parent so we can hide sub-tabs
    // whose section_type has no non-empty blocks. Children still fetch their
    // own filtered slices for editing; this query is for visibility only.
    const { data: collectionResponse } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'must-have-all'],
        queryFn: () => api.getByIdentifier(collectionIdentifier),
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const nonEmptyKeys = useMemo<Set<SubTabKey>>(() => {
        const keys = new Set<SubTabKey>()
        const sectionsList: Section[] = collectionResponse?.data?.sections ?? []
        for (const section of sectionsList) {
            if (!section.blocks || section.blocks.length === 0) continue
            const t = section.section_type
            if (t === 'tips' || t === 'dos_donts') keys.add('tips')
            else if (t === 'links') keys.add('links')
            else if (t === 'visa') keys.add('visa')
            else if (t === 'sim') keys.add('sim')
        }
        // Internal users can add sections in any sub-tab even when empty,
        // so we keep all tabs visible for them.
        if (isRimigoInternal) {
            for (const t of ['tips', 'links', 'visa', 'sim'] as SubTabKey[]) keys.add(t)
        }
        return keys
    }, [collectionResponse, isRimigoInternal])

    const visibleSubTabs = useMemo(() => SUB_TABS.filter((t) => nonEmptyKeys.has(t.key)), [nonEmptyKeys])

    const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('tips')

    // If the active tab disappears (e.g. data refetch removed its content), reset to the first visible.
    useEffect(() => {
        if (visibleSubTabs.length === 0) return
        if (!visibleSubTabs.some((t) => t.key === activeSubTab)) {
            setActiveSubTab(visibleSubTabs[0].key)
        }
    }, [visibleSubTabs, activeSubTab])

    const [isStuck, setIsStuck] = useState(false)
    const sectionRefs = useRef<Record<SubTabKey, HTMLElement | null>>({
        tips: null,
        links: null,
        visa: null,
        sim: null
    })
    // Suppress scroll-spy updates while a click-driven smooth scroll is
    // in flight, otherwise the active pill flickers through every
    // section on the way to the target.
    const isProgrammaticScrollRef = useRef(false)

    useEffect(() => {
        let raf = 0
        const handle = () => {
            raf = 0
            const isDesktop = window.innerWidth >= MD_BREAKPOINT_PX
            const navTop = isDesktop ? stickyTop.desktop : stickyTop.mobile
            const navBottom = navTop + SUBTAB_NAV_HEIGHT

            // Active section = last one whose top has scrolled above the
            // bottom edge of the sticky nav. Iterate in render order so
            // we naturally land on the deepest matching one.
            if (!isProgrammaticScrollRef.current) {
                let nextActive: SubTabKey = 'tips'
                let anyLaidOut = false
                for (const key of Object.keys(sectionRefs.current) as SubTabKey[]) {
                    const rect = sectionRefs.current[key]?.getBoundingClientRect()
                    if (!rect || rect.height === 0) continue
                    anyLaidOut = true
                    if (rect.top <= navBottom + 1) nextActive = key
                }
                if (anyLaidOut) {
                    setActiveSubTab((prev) => (prev === nextActive ? prev : nextActive))
                }
            }

            // Shadow appears once any content has scrolled under the nav.
            const firstSection = sectionRefs.current.tips
            if (firstSection) {
                setIsStuck(firstSection.getBoundingClientRect().top < navTop)
            }
        }
        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(handle)
        }
        handle()
        // Capture phase so scroll events from inner overflow containers
        // (e.g. the tripboard's left-pane scroller) reach us — scroll
        // events don't bubble, but they do flow during capture.
        window.addEventListener('scroll', onScroll, { capture: true, passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
            window.removeEventListener('resize', onScroll)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [stickyTop.desktop, stickyTop.mobile])

    const handleSubTabClick = useCallback((key: SubTabKey) => {
        const el = sectionRefs.current[key]
        if (!el) return
        setActiveSubTab(key)
        isProgrammaticScrollRef.current = true
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.setTimeout(() => {
            isProgrammaticScrollRef.current = false
        }, 700)
    }, [])

    const allSections = useMemo(
        () => [
            {
                key: 'tips' as const,
                node: (
                    <TipsTabContent
                        isRimigoInternal={isRimigoInternal}
                        collectionIdentifier={collectionIdentifier}
                        isActive={isActive}
                        api={api}
                    />
                )
            },
            {
                key: 'links' as const,
                node: (
                    <LinksTabContent
                        isRimigoInternal={isRimigoInternal}
                        collectionIdentifier={collectionIdentifier}
                        isActive={isActive}
                        api={api}
                    />
                )
            },
            {
                key: 'visa' as const,
                node: (
                    <VisaTabContent
                        isRimigoInternal={isRimigoInternal}
                        collectionIdentifier={collectionIdentifier}
                        isActive={isActive}
                        api={api}
                    />
                )
            },
            {
                key: 'sim' as const,
                node: (
                    <SimTabContent
                        isRimigoInternal={isRimigoInternal}
                        collectionIdentifier={collectionIdentifier}
                        isActive={isActive}
                        api={api}
                    />
                )
            }
        ],
        [api, collectionIdentifier, isActive, isRimigoInternal]
    )

    const sections = useMemo(
        () => allSections.filter((s) => nonEmptyKeys.has(s.key)),
        [allSections, nonEmptyKeys]
    )

    // CSS vars so each consumer's sticky offsets flow into both `top:`
    // and section `scroll-margin-top` without conditional class plumbing.
    const stickyVarStyle = {
        ['--mh-top-mobile' as string]: `${stickyTop.mobile}px`,
        ['--mh-top-desktop' as string]: `${stickyTop.desktop}px`,
        ['--mh-scroll-mt-mobile' as string]: `${stickyTop.mobile + SUBTAB_NAV_HEIGHT}px`,
        ['--mh-scroll-mt-desktop' as string]: `${stickyTop.desktop + SUBTAB_NAV_HEIGHT}px`
    } as React.CSSProperties

    // Mobile-only collapse of the subtab nav (the day-city equivalent
    // for must-haves) so the user gets full viewport for the list. Same
    // easing + durations as the other tabs.
    const hideSecondaryHeader = useHideOnScrollDown()
    const isMobileViewport = useIsMobile()

    return (
        <div
            className={cn('flex flex-col w-full bg-grey-5', bottomPaddingClassName)}
            style={stickyVarStyle}>
            <div
                className={cn(
                    'sticky z-20 bg-white/95 backdrop-blur-sm transition-shadow duration-200',
                    '[top:var(--mh-top-mobile)] md:[top:var(--mh-top-desktop)]',
                    isStuck && 'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]'
                )}>
                {/* Collapse the sub-tab chips' HEIGHT on mobile scroll-down
                    (grid-rows 1fr→0fr) instead of only translating them: a
                    transform-only hide leaves the box in flow, so the sticky
                    white header showed an empty band where the chips slid
                    away. Collapsing the height lets the content rise flush
                    under the main tab bar — no white gap. */}
                <div
                    className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                        isMobileViewport && hideSecondaryHeader
                            ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            : 'grid-rows-[1fr] opacity-100'
                    )}>
                    <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
                    {visibleSubTabs.map(({ key, label, Icon }) => {
                        const isActiveSub = activeSubTab === key
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleSubTabClick(key)}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold font-red-hat-display whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                                    isActiveSub
                                        ? 'bg-primary-default text-white'
                                        : 'bg-grey-5 text-grey-1 hover:bg-grey-4 hover:text-grey-0'
                                )}>
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{label}</span>
                            </button>
                        )
                    })}
                </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col">
                {sections.map(({ key, node }, idx) => (
                    <React.Fragment key={key}>
                        {idx > 0 && (
                            <div className="px-4">
                                <Divider className="my-4" />
                            </div>
                        )}
                        <section
                            ref={(el) => {
                                sectionRefs.current[key] = el
                            }}
                            data-subtab={key}
                            className="[scroll-margin-top:var(--mh-scroll-mt-mobile)] md:[scroll-margin-top:var(--mh-scroll-mt-desktop)]">
                            {key !== 'tips' && (
                                <h3 className="px-8 pt-6 pb-2 text-[20px] font-semibold font-red-hat-display text-grey-0">
                                    {SUB_TAB_LABELS[key]}
                                </h3>
                            )}
                            {node}
                        </section>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}

export default MustHaveTabContent
