import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BedDouble, Plus } from 'lucide-react'
import type { ItineraryStay } from '@/api/itineraryApi'

/**
 * Day-header stay affordance — a compact pill that surfaces the hotel
 * attached to this day, or invites the user to pick one when the day is
 * empty. Tapping a filled pill opens a small floating menu with
 * ``Change hotel`` / ``Remove from trip`` actions — mirroring the
 * desktop Kanban stay-pill menu so every surface exposes the same two
 * operations on an existing stay. Add-stay bypasses the menu and jumps
 * straight to the ``InlineStayPickerDrawer``.
 *
 * Kept intentionally quiet visually: the header is a sticky landmark,
 * not a call-out zone. A faint primary wash for the filled state and a
 * dashed grey outline for the empty state is enough to read the
 * state-change at a glance without shouting over the slot cards below.
 *
 * Shared by ``ItineraryMapView`` (desktop map list) and
 * ``MobileItineraryView`` so both surfaces render the same affordance
 * and delegate to the same parent handlers.
 */
interface StayChipProps {
    stay: ItineraryStay | null
    cityId: string | null
    onAdd?: (cityId: string) => void
    onChange?: (stayId: string, cityId: string | null) => void
    onRemove?: (stayId: string, cityId: string | null) => void
    /** Tight sizing for dense surfaces (mobile day headers). Defaults to
     *  the standard density used on desktop. */
    dense?: boolean
}

const MENU_GUTTER_PX = 12
const MENU_WIDTH_PX = 192

export const StayChip: React.FC<StayChipProps> = ({
    stay,
    cityId,
    onAdd,
    onChange,
    onRemove,
    dense = false
}) => {
    const iconSize = dense ? 'h-[11px] w-[11px]' : 'h-3 w-3'
    const textSize = dense ? 'text-[10px]' : 'text-[11px]'
    const pad = dense ? 'px-1.5 py-[3px]' : 'px-2 py-0.5'
    const maxW = dense ? 'max-w-[140px]' : 'max-w-[180px]'

    const chipRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

    // Recompute the menu anchor from the chip's current client rect,
    // clamped inside the viewport. Used both when opening the menu and
    // on every scroll/resize tick so the menu tracks the chip as the
    // day strip slides horizontally underneath it.
    const computeMenuPos = (): { top: number; left: number } | null => {
        const el = chipRef.current
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const rawLeft = rect.left
        const maxLeft =
            (typeof window !== 'undefined' ? window.innerWidth : 0) -
            MENU_WIDTH_PX -
            MENU_GUTTER_PX
        const left = Math.max(MENU_GUTTER_PX, Math.min(rawLeft, maxLeft))
        return { top: rect.bottom + 6, left }
    }

    // While the menu is open:
    // - outside-click / Escape dismiss (same as desktop Kanban pill)
    // - scroll/resize re-anchor: the menu is ``position: fixed`` but
    //   the chip lives inside a horizontally-scrollable day strip on
    //   mobile, so without tracking the chip the menu would look
    //   orphaned the moment the user slides. rAF-throttled reposition
    //   keeps the two glued without laying a layout thrash on every
    //   scroll frame.
    useEffect(() => {
        if (!menuPos) return
        const onDoc = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return
            if (chipRef.current?.contains(e.target as Node)) return
            setMenuPos(null)
        }
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuPos(null)
        }
        let rafId = 0
        const reposition = () => {
            rafId = 0
            const next = computeMenuPos()
            if (!next) return
            setMenuPos((prev) => {
                if (!prev) return prev
                if (prev.top === next.top && prev.left === next.left) return prev
                return next
            })
        }
        const scheduleReposition = () => {
            if (rafId !== 0) return
            rafId = window.requestAnimationFrame(reposition)
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onEsc)
        window.addEventListener('scroll', scheduleReposition, true)
        window.addEventListener('resize', scheduleReposition)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('keydown', onEsc)
            window.removeEventListener('scroll', scheduleReposition, true)
            window.removeEventListener('resize', scheduleReposition)
            if (rafId !== 0) window.cancelAnimationFrame(rafId)
        }
    }, [menuPos])

    const openMenu = () => {
        const next = computeMenuPos()
        if (next) setMenuPos(next)
    }

    if (stay) {
        const hasMenu = Boolean(onChange || onRemove)
        return (
            <>
                <button
                    ref={chipRef}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (!hasMenu) return
                        if (menuPos) {
                            setMenuPos(null)
                        } else {
                            openMenu()
                        }
                    }}
                    aria-haspopup={hasMenu ? 'menu' : undefined}
                    aria-expanded={hasMenu ? Boolean(menuPos) : undefined}
                    title={stay.hotel_name}
                    className={`group/stay inline-flex ${maxW} cursor-pointer items-center gap-1.5 rounded-md bg-primary-default/[0.07] ${pad} ring-1 ring-primary-default/20 transition-colors hover:bg-primary-default/[0.12] hover:ring-primary-default/40 active:bg-primary-default/[0.15]`}>
                    <BedDouble
                        className={`${iconSize} shrink-0 text-primary-default`}
                        strokeWidth={2.25}
                        aria-hidden
                    />
                    <span
                        className={`font-manrope truncate ${textSize} font-semibold leading-none text-primary-default`}>
                        {stay.hotel_name}
                    </span>
                </button>
                {menuPos && typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              ref={menuRef}
                              role="menu"
                              aria-label="Stay actions"
                              className="fixed z-[120] overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.28),0_4px_12px_-4px_rgba(15,23,42,0.16)]"
                              style={{
                                  top: menuPos.top,
                                  left: menuPos.left,
                                  width: MENU_WIDTH_PX
                              }}
                              onMouseDown={(e) => e.stopPropagation()}>
                              {onChange ? (
                                  <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                          setMenuPos(null)
                                          onChange(stay.stay_id, stay.city_id ?? cityId)
                                      }}
                                      className="block w-full cursor-pointer px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-grey-0 transition-colors hover:bg-primary-default/5">
                                      Change hotel
                                  </button>
                              ) : null}
                              {onChange && onRemove ? (
                                  <div className="h-px w-full bg-grey-4/80" />
                              ) : null}
                              {onRemove ? (
                                  <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                          setMenuPos(null)
                                          onRemove(stay.stay_id, stay.city_id ?? cityId)
                                      }}
                                      className="block w-full cursor-pointer px-3 py-2.5 text-left font-manrope text-[13px] font-semibold text-secondary-red transition-colors hover:bg-secondary-red/5">
                                      Remove from trip
                                  </button>
                              ) : null}
                          </div>,
                          document.body
                      )
                    : null}
            </>
        )
    }

    if (!cityId || !onAdd) return null

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onAdd(cityId)
            }}
            className={`group/add inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-grey-4 bg-white ${pad} transition-colors hover:border-primary-default/55 hover:bg-primary-default/[0.04] active:bg-primary-default/[0.08]`}>
            <Plus
                className={`${iconSize} shrink-0 text-primary-default`}
                strokeWidth={2.5}
                aria-hidden
            />
            <span
                className={`font-manrope ${textSize} font-bold leading-none text-primary-default`}>
                Select stay
            </span>
        </button>
    )
}

export default StayChip
