import { type CSSProperties, type ReactNode } from 'react'
import { BedDouble, FerrisWheel, Plane } from 'lucide-react'
import { EXCEL_ICON, INSTAGRAM_ICON, THREESTAR_PRIMARY_INDIGO, YOUTUBE_ICON } from '@/constants/icons/svgFromCDN'
import { openAssistantWindow } from '@/pages/Stays/Components/assistantController'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

/**
 * Activities-tab "Turn your inspiration into a trip" banner (section 4 of the
 * Explore feed, below the curated collections). The CTA opens the AI assistant
 * and pops its attachment picker so the user can drop an Instagram reel /
 * YouTube video / itinerary spreadsheet.
 */

// Click the assistant's on-screen attachment trigger once it stops moving, so
// the popover anchors to the trigger's final (post-animation) position.
const openAttachmentPicker = () => {
    const onScreen = (el: HTMLElement): boolean => {
        if (el.offsetParent === null) return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
    }
    let attempts = 0
    let lastKey = ''
    const tick = () => {
        const trigger = Array.from(document.querySelectorAll<HTMLElement>('[data-attachment-trigger]')).find(onScreen)
        if (trigger) {
            const r = trigger.getBoundingClientRect()
            const key = `${Math.round(r.top)},${Math.round(r.left)}`
            if (key === lastKey) {
                trigger.click()
                return
            }
            lastKey = key
        }
        if (attempts++ < 50) window.setTimeout(tick, 80)
    }
    window.setTimeout(tick, 250)
}

const InspirationBanner: React.FC = () => {
    const { trackButtonClickCustom } = usePostHog()

    const handleClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ADD_ATTACHMENT_FROM_ATTACHMENT_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        openAssistantWindow()
        openAttachmentPicker()
    }

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl border-[1.5px] border-[#B98DEE] p-5 md:min-h-[150px] md:p-6"
            style={{ background: 'linear-gradient(135deg, #F5F0FE 0%, #F0E8FD 55%, #EBE1FC 100%)' }}>
            {/* Decorative media — desktop chat bubbles, mobile watermarks. */}
            <DesktopDecor />
            <MobileDecor />

            {/* Copy + CTA */}
            <div className="relative z-10 max-w-full sm:max-w-[52%] md:max-w-none">
                <h3 className="text-[18px] md:text-[20px] font-bold font-manrope leading-snug tracking-[-0.4px] text-grey-0">
                    Turn your inspiration into a trip
                    <img
                        src={THREESTAR_PRIMARY_INDIGO}
                        alt=""
                        aria-hidden
                        className="-ml-1 inline-block h-9 w-9 object-contain"
                        style={{ transform: 'translateY(-4px) rotate(14deg)', verticalAlign: 'middle' }}
                    />
                </h3>
                <p className="mt-1.5 text-[13px] md:text-[14px] font-medium font-manrope leading-snug text-grey-1 md:whitespace-nowrap">
                    Add an Instagram reel, YouTube video, Itinerary spreadsheet and we&rsquo;ll plan a trip for you.
                </p>
                <button
                    type="button"
                    onClick={handleClick}
                    style={{
                        borderRadius: 6,
                        background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                    }}
                    className="mt-3.5 inline-flex w-fit items-center px-4 py-2.5 text-[14px] font-bold font-manrope text-white transition-opacity hover:opacity-90 cursor-pointer">
                    Add inspiration
                </button>
            </div>
        </div>
    )
}

// ── Decorations ──────────────────────────────────────────────────────────────

/** A faded, glassy "chat bubble" — the desktop motif: a wide, mostly-transparent
 *  outlined pill with a faint icon chip, a purple bar + a fainter bar, and a
 *  small purple accent dot. Reads as a soft watermark, not a solid card. */
const Bubble: React.FC<{ icon: ReactNode; className?: string; style?: CSSProperties }> = ({ icon, className = '', style }) => (
    <div
        className={`absolute flex w-[270px] items-center justify-between rounded-md border border-[#C9B6EE] bg-white/40 px-1.5 py-1.5 shadow-[0_4px_16px_rgba(90,50,160,0.05)] backdrop-blur-[2px] ${className}`}
        style={style}>
        {/* Left: white icon chip + two stacked "text" lines (first one bigger). */}
        <span className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#B3A0E8] shadow-[0_2px_6px_rgba(90,50,160,0.18)]">
                {icon}
            </span>
            <span className="flex flex-col gap-1.5">
                <span className="block h-2.5 w-16 rounded-full bg-[#BBA9EE]" />
                <span className="block h-2 w-10 rounded-full bg-[#D2C6F2]" />
            </span>
        </span>
        {/* Right: a faint trailing bar. */}
        <span className="block h-2.5 w-14 rounded-full bg-[#E7DFF7]" />
        {/* Accent dot — bottom-right. */}
        <span className="absolute -bottom-1.5 right-4 h-2.5 w-2.5 rounded-full bg-[#8B6FD9]" />
    </div>
)

/** Desktop: faded glassy chat bubbles with muted travel icons (plane / compass /
 *  bed) plus the three media sources — Instagram / YouTube / Excel, all washed
 *  out — spread across two rows on the right like a soft watermark. */
const DesktopDecor: React.FC = () => (
    <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[66%] sm:block"
        aria-hidden>
        {/* Plane — top row, far left (toward the text). */}
        <Bubble
            className="top-[16%] right-[460px]"
            style={{ transform: 'rotate(-4deg)' }}
            icon={<Plane className="h-7 w-7 text-white" strokeWidth={2} />}
        />
        {/* Ferris wheel — top row, in line with the plane, right. */}
        <Bubble
            className="top-[16%] right-[100px]"
            style={{ transform: 'rotate(3deg)' }}
            icon={<FerrisWheel className="h-7 w-7 text-white" strokeWidth={2} />}
        />
        {/* Bed — bottom row, a little left (less than the plane). */}
        <Bubble
            className="bottom-[14%] right-[215px]"
            style={{ transform: 'rotate(2deg)' }}
            icon={<BedDouble className="h-7 w-7 text-white" strokeWidth={2} />}
        />
        {/* Instagram — just right of the ferris wheel bubble. */}
        <img
            src={INSTAGRAM_ICON}
            alt=""
            className="absolute top-[12%] right-2 h-10 w-10 object-contain opacity-80"
            style={{ transform: 'rotate(-4deg)' }}
        />
        {/* YouTube — in line with the bed, well left of it (near the plane). */}
        <img
            src={YOUTUBE_ICON}
            alt=""
            className="absolute bottom-[15%] right-[510px] h-9 w-9 object-contain opacity-50"
            style={{ transform: 'rotate(-4deg)' }}
        />
        {/* Excel — bottom row, just right of the bed bubble. */}
        <img
            src={EXCEL_ICON}
            alt=""
            className="absolute bottom-[15%] right-[160px] h-10 w-10 object-contain opacity-50"
            style={{ transform: 'rotate(6deg)' }}
        />
    </div>
)

/** Mobile: the same media icons as soft watermarks scattered around the card. */
const MobileDecor: React.FC = () => (
    <div
        className="pointer-events-none absolute inset-0 sm:hidden"
        aria-hidden>
        {/* Excel — top-right, dropped a little lower and bleeding past the
            right border (card overflow is visible). */}
        <img
            src={EXCEL_ICON}
            alt=""
            className="absolute top-4 -right-2 h-10 w-10 object-contain opacity-55"
            style={{ transform: 'rotate(6deg)' }}
        />
        {/* Instagram — right edge, lower than centre. */}
        <img
            src={INSTAGRAM_ICON}
            alt=""
            className="absolute right-3 top-[60%] h-9 w-9 object-contain opacity-50"
            style={{ transform: 'translateY(-50%) rotate(-6deg)' }}
        />
        {/* YouTube — bottom, toward the centre-right. */}
        <img
            src={YOUTUBE_ICON}
            alt=""
            className="absolute bottom-1 right-16 h-10 w-10 object-contain opacity-45"
            style={{ transform: 'rotate(6deg)' }}
        />
    </div>
)

export default InspirationBanner
