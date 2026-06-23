import { BEACH_TREE } from '@/constants/icons/svgFromCDN'

interface TripFlagsProps {
    flags?: string[]
    size?: number
    overlap?: boolean
    borderColor?: string
}

export const TripFlags = ({
    flags,
    size = 20,
    overlap = true,
    borderColor = 'border-white',
}: TripFlagsProps) => (
    <div className={`flex items-center justify-center ${overlap ? '-space-x-1' : 'gap-1'} shrink-0`}>
        {flags?.length ? (
            flags.map((flagUrl, i) => (
                <img
                    key={i}
                    src={flagUrl}
                    alt="flag"
                    className={`rounded-full object-cover border-[2px] ${borderColor}`}
                    style={{ width: size, height: size, zIndex: flags.length - i }}
                />
            ))
        ) : (
            <img
                src={BEACH_TREE}
                alt="destination"
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        )}
    </div>
)