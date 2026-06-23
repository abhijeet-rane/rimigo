import { LOGO_COMPASS } from '@/constants/icons/svgFromCDN'

/**
 * On-brand loader for the reels viewer — the rotating Rimigo compass, so the
 * "video is loading" state reads as part of the product instead of a bare
 * spinner. Uses the WHITE compass so it reads on the dark video background;
 * sits on a small translucent dark puck so it stays visible on bright
 * thumbnails too.
 */
const ReelVideoLoader: React.FC<{ label?: string | null }> = ({ label = 'Loading video…' }) => (
    <div className="pointer-events-none flex flex-col items-center justify-center gap-3">
        <div className="flex items-center justify-center rounded-full bg-black/45 backdrop-blur-sm p-4 shadow-lg">
            <img
                src={LOGO_COMPASS}
                alt=""
                className="w-10 h-10 object-contain"
                style={{ animation: 'compass-rotate 2s linear infinite', willChange: 'transform' }}
            />
        </div>
        {label && (
            <span className="text-white text-[13px] font-[700] font-red-hat-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {label}
            </span>
        )}
    </div>
)

export default ReelVideoLoader
