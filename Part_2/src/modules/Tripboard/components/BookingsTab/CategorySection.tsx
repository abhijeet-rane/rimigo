import React, { useEffect } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { useReportSectionOpen } from './sectionExpansion'

/* Collapsible category section + sub-section header for the Bookings tab
 * (Figma: Rimigo Design Master · Bookings Tab). Sections stack inside the
 * white bookings card, separated by top borders; expanded bodies sit on the
 * sunken surface. */

interface CategorySectionProps {
    icon: string
    title: string
    /** "1 booking" / "2 bookings · 5 nights". Pass null for "No bookings yet". */
    countLabel: string | null
    /** Formatted price. Null renders the empty "–". */
    price: string | null
    priceSub?: string | null
    open: boolean
    onToggle: () => void
    /** Spinner/shimmer slot shown next to the count while recalculating. */
    headerExtra?: React.ReactNode
    /** Keep the body mounted (just visually hidden) while collapsed, instead of
     *  lazy-mounting it on open. Used by Activities so its cards fetch live tour
     *  prices on Bookings-tab load — making the headline total correct upfront
     *  rather than jumping when the section is first expanded. */
    mountChildrenWhenClosed?: boolean
    children?: React.ReactNode
}

export const CategorySection: React.FC<CategorySectionProps> = ({
    icon,
    title,
    countLabel,
    price,
    priceSub,
    open,
    onToggle,
    headerExtra,
    mountChildrenWhenClosed = false,
    children
}) => {
    const isEmpty = price === null

    // Report open/closed up so the ExpertBanner can match the content background
    // (grey while any section is expanded). Cleared on unmount.
    const reportOpen = useReportSectionOpen()
    useEffect(() => {
        reportOpen?.(title, open)
        return () => reportOpen?.(title, false)
    }, [title, open, reportOpen])

    // Mobile-only bottom border on the last section: the panel is edge-to-edge on
    // mobile (no rounding/shadow to close it), so the last section needs a hairline
    // below it. On desktop the ExpertBanner renders in-flow as the last child, so
    // this stays mobile-scoped.
    return (
        <div className="border-t border-border-subtle first:border-t-0 max-md:last:border-b">
            <button
                onClick={onToggle}
                disabled={isEmpty && !children}
                className={`w-full flex items-center justify-between gap-3 bg-white p-4 md:p-5 text-left ${isEmpty && !children ? 'cursor-default' : 'cursor-pointer hover:bg-grey-5/40'} transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                    {/* `icon` is a 3D illustration URL (flights/stays/activities)
                        or an emoji (transport/ancillaries) rendered in a tile. */}
                    {icon.startsWith('http') ? (
                        <img
                            src={icon}
                            alt=""
                            className="w-11 h-11 object-contain shrink-0"
                        />
                    ) : (
                        <span className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center text-[22px] leading-none shrink-0">
                            {icon}
                        </span>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-red-hat-display text-[18px] font-semibold tracking-[-0.36px] leading-6 text-grey-0">{title}</span>
                        <span className="flex items-center gap-2 font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2">
                            {countLabel ?? 'No bookings yet'}
                            {headerExtra}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-0.5">
                        {isEmpty ? (
                            <span className="font-red-hat-display text-[18px] font-semibold leading-6 text-grey-3">–</span>
                        ) : (
                            <>
                                <span className="font-red-hat-display text-[18px] font-semibold tracking-[-0.36px] leading-6 text-grey-0">
                                    {price}
                                </span>
                                {priceSub && (
                                    <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2">
                                        {priceSub}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    {(!isEmpty || children) && <ChevronDown className={`w-6 h-6 text-grey-0 transition-transform ${open ? '-scale-y-100' : ''}`} />}
                </div>
            </button>
            {/* Expanded body sits on the sunken surface, recessed with the Figma
                inner shadow (0 0 8px var(--OverlayBackdrop) inset) and a top border
                splitting it from the header. Both live HERE — so they show only when
                the section is open, and the inset shadow reads as the shadow on each
                section separator (Stays/Activities/…). The grey padding gutter keeps
                the shadow visible past the white cards. Kept low-opacity so the edge
                reads soft, not harsh. */}
            {children && (open || mountChildrenWhenClosed) && (
                <div
                    className={`bg-surface-sunken p-4 md:p-5 flex flex-col gap-8 border-t border-border-subtle shadow-[inset_0_0_8px_0_rgba(0,0,0,0.14)] ${open ? '' : 'hidden'}`}>
                    {children}
                </div>
            )}
        </div>
    )
}

/** "Tokyo · 30 Oct – 04 Nov" header inside an expanded section body. `right`
 *  is an ExploreMoreLink or a right-aligned date for activity day groups. */
export const SubSectionHeader: React.FC<{ lead: string; trailing?: string | null; right?: React.ReactNode }> = ({ lead, trailing, right }) => (
    <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-1 min-w-0">
            <span className="font-red-hat-display text-[16px] font-bold tracking-[-0.32px] leading-5 text-grey-0">{lead}</span>
            {trailing && (
                <>
                    <span className="font-red-hat-display text-[14px] font-semibold text-grey-2">∙</span>
                    <span className="font-red-hat-display text-[16px] font-medium tracking-[-0.32px] leading-5 text-grey-1 truncate">{trailing}</span>
                </>
            )}
        </span>
        {right}
    </div>
)

export const ExploreMoreLink: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = 'Explore more' }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-1 font-red-hat-display text-[14px] font-bold tracking-[-0.28px] leading-[18px] text-primary-default hover:underline underline-offset-2 cursor-pointer shrink-0">
        {label}
        <ExternalLink className="w-4 h-4" />
    </button>
)

/** Right-aligned date for activity day headers ("1 Oct"). */
export const SubSectionDate: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="font-manrope text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-2 shrink-0">{children}</span>
)

/** Cards within one sub-section stack with 16px gaps; the header sits 16px
 *  above them. */
export const SubSection: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="flex flex-col gap-4">{children}</div>
