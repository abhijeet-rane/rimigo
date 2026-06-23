import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon'
import { EXPERT_WHATSAPP_NUMBER } from '@/modules/Premium/utils/expertWhatsApp'
import { POTRAIT_IMAGES } from '@/modules/Premium/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

const BANNER_QUERY = "Hi! I'd like help getting the best prices on my trip bookings."

// 12-point starburst "seal" outline (scalloped badge) for the % discount mark,
// computed once: 24 vertices alternating outer/inner radius around (12,12).
// Outer radius < 12 leaves room for the white stroke inside the viewBox.
const SUNBURST_POINTS = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 === 0 ? 11 : 8.4
    const a = (Math.PI / 12) * i - Math.PI / 2
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')

/** Lilac travel-expert banner. Desktop: in-flow at the bottom of the bookings
 *  card. Mobile: portaled to <body> and pinned just above the fixed "Continue
 *  editing" chat pill — the portal avoids the transformed / overflow-hidden
 *  ancestors that would otherwise break position: fixed. */
export const ExpertBanner: React.FC<{ expanded?: boolean }> = ({ expanded = false }) => {
    const track = useBudgetTrack()
    const isMobile = useIsMobile()

    // Measure the live height of the fixed assistant chat dock and pin the
    // banner directly on top of it. The dock has two states (collapsed pill vs
    // full input bar) with different heights, so a fixed offset can't work —
    // a ResizeObserver keeps the banner flush above it through every change.
    const [dockHeight, setDockHeight] = useState(0)
    useEffect(() => {
        if (!isMobile) return
        let observer: ResizeObserver | undefined
        let frame = 0
        let attempts = 0
        const attach = () => {
            const dock = document.querySelector<HTMLElement>('[data-assistant-dock="mobile"]')
            if (dock) {
                const measure = () => setDockHeight(dock.offsetHeight)
                measure()
                observer = new ResizeObserver(measure)
                observer.observe(dock)
                return
            }
            // The dock mounts independently; retry for ~1s before giving up.
            if (attempts++ < 60) frame = requestAnimationFrame(attach)
        }
        attach()
        return () => {
            observer?.disconnect()
            if (frame) cancelAnimationFrame(frame)
        }
    }, [isMobile])

    const handleContact = () => {
        track(POSTHOG_EVENTS.BUDGET_TAB_EXPERT_CONTACT_CLICK)
        const waUrl = `https://wa.me/${EXPERT_WHATSAPP_NUMBER}?text=${encodeURIComponent(BANNER_QUERY)}`
        window.open(waUrl, '_blank', 'noopener,noreferrer')
    }

    const content = (
        <>
            <div className="flex items-center gap-2 min-w-0">
                <span className="relative shrink-0">
                    <img
                        src={POTRAIT_IMAGES.PORTRAIT_2}
                        alt="Rimigo travel expert"
                        className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="absolute -right-2 -bottom-2 w-[20px] h-[20px]">
                        <svg
                            viewBox="0 0 24 24"
                            className="w-full h-full text-fill-warning"
                            aria-hidden="true">
                            <polygon
                                points={SUNBURST_POINTS}
                                fill="currentColor"
                                stroke="white"
                                strokeWidth="1"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-red-hat-display text-[10px] font-semibold text-[#996200]">
                            %
                        </span>
                    </span>
                </span>
                <p className="font-manrope text-[13px] font-medium tracking-[-0.26px] leading-[18px] text-grey-1">
                    Reach out to our travel expert to avail the best prices on bookings
                </p>
            </div>
            <button
                onClick={handleContact}
                className="flex items-center gap-1.5 rounded-[8px] bg-grey-0 border border-grey-0 px-2.5 py-1.5 font-red-hat-display text-[13px] font-bold tracking-[-0.26px] leading-[18px] text-white cursor-pointer hover:bg-grey-1 transition-colors shrink-0">
                <WhatsAppIcon className="w-4 h-4" />
                Contact
            </button>
        </>
    )

    if (isMobile) {
        // Anchored to bottom-0 so the lilac fills all the way down *behind* the
        // chat strip (no page background peeks through). The content is lifted
        // to rest just above the dock via paddingBottom = measured dock height.
        return createPortal(
            <div
                className="fixed bottom-0 left-0 right-0 z-[55] bg-banner-lilac shadow-[0_-4px_16px_rgba(13,12,13,0.12)] px-4 transition-[padding] duration-300 ease-out"
                style={{ paddingBottom: Math.max(dockHeight - 1, 0) }}>
                <div className="flex items-center justify-between gap-3 py-3">{content}</div>
            </div>,
            document.body
        )
    }

    return (
        // White when every section is collapsed (the earlier look); turns sunken
        // grey — continuous with the section bodies above — once any section is
        // expanded (Figma). Driven purely by CSS: the panel is a `group` and an
        // open section body carries [data-budget-section-open].
        <div
            className={
                expanded
                    ? // Expanded: grey, continuous with the section bodies. Recess
                      // shadow on the sides + bottom only — the top edge is dropped
                      // so no shadow LINE appears across the grey strip above the
                      // lilac box (the bg stays grey, just no top seam).
                      'bg-surface-sunken px-4 md:px-5 py-4 shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.14),inset_-8px_0_8px_-8px_rgba(0,0,0,0.14),inset_0_-8px_8px_-8px_rgba(0,0,0,0.14)]'
                    : // Collapsed: white, no top divider — seamless with the card
                      // above (Figma: no hairline above the banner).
                      'px-4 md:px-5 py-4'
            }>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-banner-lilac px-6 py-3">{content}</div>
        </div>
    )
}
