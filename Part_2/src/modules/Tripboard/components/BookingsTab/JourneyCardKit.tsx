import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

/* Shared anatomy for the Bookings tab Journey Cards (Figma: Rimigo Design
 * Master · Bookings Tab). Desktop: [300px info cell | provider rows | 100px
 * expander]. Mobile (<md): the three cells stack vertically and the expander
 * becomes a full-width bottom strip. Sections compose these pieces — flights
 * put a custom time-rail in the info cell, stays/activities use InfoCell. */

export const JourneyCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`flex max-md:flex-col rounded-[12px] border border-border-subtle bg-white overflow-hidden ${className}`}>{children}</div>
)

/** Left cell — fixed 300px on desktop, full-width strip on mobile. Pass
 *  `badge` for the "Selling Fast" treatment above the thumbnail row. */
export const InfoCell: React.FC<{
    image?: string | null
    title: React.ReactNode
    subtitle?: React.ReactNode
    badge?: React.ReactNode
    onClick?: () => void
    /** Quiet action(s) pinned to the cell's top-right (e.g. exclude/swap) —
     *  sits outside the clickable title area so it doesn't trigger onClick. */
    cornerAction?: React.ReactNode
    children?: React.ReactNode
}> = ({ image, title, subtitle, badge, onClick, cornerAction, children }) => (
    <div className="md:w-[300px] shrink-0 p-3 md:border-r max-md:border-b border-border-subtle flex flex-col justify-center gap-2">
        {/* `layout` so the cell's contents glide to the new vertical center when
            the card grows/shrinks on expand — framer animates the provider cell
            via transforms (real height jumps to final), so without this the left
            side would snap to center instantly. Same timing as ProviderCell. */}
        <motion.div
            layout
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="flex flex-col gap-2">
            {badge}
            <div className="flex items-start justify-between gap-2">
                <div
                    className={`flex items-start gap-2 min-w-0 ${onClick ? 'cursor-pointer group/info' : ''}`}
                    onClick={onClick}>
                    {image && (
                        <img
                            src={image}
                            alt=""
                            className="w-10 h-10 rounded object-cover shrink-0"
                        />
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <p
                            className={`font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0 truncate ${onClick ? 'group-hover/info:underline underline-offset-2' : ''}`}>
                            {title}
                        </p>
                        {subtitle && (
                            <p className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2 truncate">{subtitle}</p>
                        )}
                    </div>
                </div>
                {cornerAction && <div className="shrink-0 flex items-center gap-0.5">{cornerAction}</div>}
            </div>
            {children}
        </motion.div>
    </div>
)

/** Middle cell wrapper — stacks one or more ProviderRows. `layout` animates
 *  the height whenever the rows change (See N more / Show less), so the cell
 *  expands and collapses smoothly instead of snapping. `layout="position"`
 *  keeps the row contents from squishing during the size tween. */
export const ProviderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    // justify-center vertically centers the provider content against the (often
    // taller) info cell when collapsed to a single row. When expanded, the rows
    // fill the cell so centering is a no-op — matching the Figma card.
    <motion.div
        layout
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="flex-1 flex flex-col justify-center min-w-0 overflow-hidden">
        {/* AnimatePresence lets rows animate OUT on collapse (Show less), not
            just in on expand. popLayout pulls exiting rows out of flow so the
            remaining rows slide smoothly while the cell height tweens. */}
        <AnimatePresence
            initial={false}
            mode="popLayout">
            {children}
        </AnimatePresence>
    </motion.div>
)

/** One provider option row. Radio appears only when the card is expanded to
 *  multiple options (`showRadio`). `body` is the provider identity area;
 *  `right` is usually a PriceButton (or price text + Get Quote). */
export const ProviderRow: React.FC<{
    showRadio?: boolean
    selected?: boolean
    onSelect?: () => void
    body: React.ReactNode
    right: React.ReactNode
    className?: string
}> = ({ showRadio = false, selected = false, onSelect, body, right, className = '' }) => (
    // motion row: `layout` repositions existing rows when the list grows/shrinks,
    // and the opacity/y entrance fades newly revealed rows in (instead of popping)
    // so See-more / Show-less feels smooth. Paired with ProviderCell's height tween.
    <motion.div
        layout
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`flex items-center justify-between gap-3 px-3 py-3 ${showRadio && onSelect ? 'cursor-pointer' : ''} ${className}`}
        onClick={showRadio && onSelect ? onSelect : undefined}>
        <div className="flex items-center gap-3 min-w-0">
            {showRadio && <RadioDot selected={selected} />}
            <div className="min-w-0">{body}</div>
        </div>
        <div className="shrink-0">{right}</div>
    </motion.div>
)

export const RadioDot: React.FC<{ selected: boolean }> = ({ selected }) => (
    // Ring drawn with stacked filled circles (outer color ring → white inset →
    // optional center), not a CSS border — so it always renders even if a
    // border-style reset is missing in the cascade.
    <span
        role="radio"
        aria-checked={selected}
        className="relative w-[24px] h-[24px] shrink-0">
        <span className={`absolute inset-0 rounded-full ${selected ? 'bg-primary-default' : 'bg-grey-3'}`} />
        <span className="absolute inset-[2px] rounded-full bg-white" />
        {selected && <span className="absolute inset-[6px] rounded-full bg-primary-default" />}
    </span>
)

/** Provider identity: wordmark image when we have a logo URL, else name text
 *  (with optional favicon). */
export const ProviderIdentity: React.FC<{ logoUrl?: string | null; name: string; faviconUrl?: string | null }> = ({ logoUrl, name, faviconUrl }) => {
    const [logoErrored, setLogoErrored] = React.useState(false)
    if (logoUrl && !logoErrored) {
        return (
            <img
                src={logoUrl}
                alt={name}
                // Height-led sizing with generous max-width so wide wordmarks
                // (e.g. "Cathay Pacific") render at full height instead of
                // being capped on width and shrinking shorter than the row.
                className="h-[28px] max-w-[160px] object-contain object-left"
                onError={() => setLogoErrored(true)}
            />
        )
    }
    return (
        <span className="flex items-center gap-1 min-w-0">
            {faviconUrl && (
                <img
                    src={faviconUrl}
                    alt=""
                    className="w-[18px] h-[18px] rounded-sm object-cover shrink-0"
                />
            )}
            <span className="font-red-hat-display text-[12px] font-semibold tracking-[-0.24px] text-grey-0 truncate">{name}</span>
        </span>
    )
}

export const CheapestBadge: React.FC = () => (
    <span className="rounded-[20px] bg-fill-success px-1.5 py-0.5 font-red-hat-display text-[10px] font-extrabold leading-[14px] text-white">
        CHEAPEST
    </span>
)

/** Metadata pill — "Free Cancellation", "8h"… `warning` = Selling Fast,
 *  `success` = "Get extra ₹X off". */
export const TagPill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'warning' | 'success' }> = ({ children, variant = 'default' }) => {
    const styles =
        variant === 'warning'
            ? 'bg-fill-warning border-fill-warning text-white'
            : variant === 'success'
              ? 'bg-fill-success border-fill-success text-white rounded-full'
              : 'bg-grey-5 border-grey-4 text-grey-0'
    return (
        <span
            className={`inline-flex items-center rounded border px-1 py-0.5 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] leading-4 whitespace-nowrap ${variant === 'success' ? 'rounded-full' : ''} ${styles}`}>
            {children}
        </span>
    )
}

/** Purple-bordered price affordance. Renders an <a> when `href` is given.
 *  `sub` is the "per person" / "₹12,000/night" line. */
export const PriceButton: React.FC<{
    price: string
    sub?: string | null
    href?: string | null
    onClick?: (e: React.MouseEvent) => void
    struck?: boolean
    /** Fixed minimum chip width (px) — stays use a set 114px so chips line up
     *  regardless of price length, matching the design. */
    minWidthPx?: number
    /** Centered layout (stays): price + sub centered, arrow pinned to the
     *  right edge. Default is the right-aligned inline layout (flights). */
    centered?: boolean
}> = ({ price, sub, href, onClick, struck = false, minWidthPx, centered = false }) => {
    const style = minWidthPx ? { minWidth: minWidthPx } : undefined
    const priceEl = (
        <span
            className={`font-red-hat-display text-[16px] font-bold tracking-[-0.32px] leading-5 text-grey-0 ${struck ? 'line-through text-grey-3' : ''}`}>
            {price}
        </span>
    )
    const subEl = sub && <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2">{sub}</span>
    const inner = centered ? (
        <>
            {priceEl}
            {subEl}
            {href && <ArrowUpRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-primary-default shrink-0" />}
        </>
    ) : (
        <>
            <span className="flex items-center gap-1.5">
                {priceEl}
                {href && <ArrowUpRight className="w-[18px] h-[18px] text-primary-default shrink-0" />}
            </span>
            {subEl}
        </>
    )
    const cls = centered
        ? // pr-7 reserves the right column for the arrow so the centered price/sub clear it
          'relative flex flex-col items-center justify-center text-center rounded-[10px] border-[1.5px] border-primary-default pl-3 pr-7 py-2 bg-white hover:bg-primary-pale-purple transition-colors'
        : 'flex flex-col items-end rounded-[10px] border-[1.5px] border-primary-default px-3 py-2 bg-white hover:bg-primary-pale-purple transition-colors'
    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                style={style}
                className={cls}>
                {inner}
            </a>
        )
    }
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            style={style}
            className={`${cls} ${!onClick ? 'cursor-default hover:bg-white' : ''}`}>
            {inner}
        </button>
    )
}

/** Plain price (no border) for rows whose CTA is a separate button (Rimigo
 *  Get Quote rows). */
export const PriceText: React.FC<{ price: string; sub?: string | null }> = ({ price, sub }) => (
    <span className="flex flex-col items-end">
        <span className="font-red-hat-display text-[16px] font-bold tracking-[-0.32px] leading-5 text-grey-0">{price}</span>
        {sub && <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2">{sub}</span>}
    </span>
)

/** Right expander cell — "See N more" pill on desktop (100px column),
 *  full-width bottom strip on mobile. */
export const MoreCell: React.FC<{
    count: number
    expanded: boolean
    onToggle: () => void
}> = ({ count, expanded, onToggle }) => {
    if (count <= 0 && !expanded) return <div className="md:w-[100px] shrink-0" />
    return (
        // Desktop: pill in the 100px right column. Mobile: borderless centered
        // text on a full-width sunken footer strip (Figma mobile flight card).
        <div
            className={`md:w-[100px] shrink-0 flex items-center justify-center max-md:w-full max-md:border-t max-md:border-border-subtle max-md:bg-grey-5 ${
                // Collapsed: center the pill against the taller info cell.
                // Expanded: pin it to the top, aligned with the first row.
                expanded ? 'md:items-start md:pt-5' : 'md:items-center'
            }`}>
            <button
                onClick={onToggle}
                className={`flex items-center gap-1 px-2 py-1.5 font-red-hat-display text-[14px] md:text-[12px] font-bold tracking-[-0.24px] text-grey-6 cursor-pointer transition-colors md:rounded-full md:border ${
                    expanded ? 'md:bg-surface-subtle md:border-surface-subtle' : 'md:bg-white md:border-border-subtle md:hover:bg-grey-5'
                }`}>
                {expanded ? (
                    'Show less'
                ) : (
                    <span>
                        {/* "See N more" on mobile, "N more" on desktop (Figma). */}
                        <span className="md:hidden">See </span>
                        {count} more
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '-scale-y-100' : ''}`} />
            </button>
        </div>
    )
}
