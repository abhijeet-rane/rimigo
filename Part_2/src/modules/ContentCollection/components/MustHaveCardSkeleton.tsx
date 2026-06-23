// Compact card-shaped loading skeletons for the Must Have tab. Mirrors the
// real link / tip card silhouette (kept minimal) so there's no layout jump.

interface MustHaveCardSkeletonProps {
    variant?: 'link' | 'tip'
}

const Bar = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-grey-4 ${className}`} />
)

const MustHaveCardSkeleton: React.FC<MustHaveCardSkeletonProps> = ({ variant = 'link' }) => {
    if (variant === 'tip') {
        return (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0]">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-grey-4 animate-pulse" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <Bar className="h-3.5 w-1/3" />
                    <Bar className="h-3 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="w-full rounded-xl bg-white border border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0] p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-grey-4 animate-pulse shrink-0" />
                <Bar className="h-3.5 flex-1 max-w-[120px]" />
                <Bar className="h-7 w-16 rounded-md shrink-0 ml-auto" />
            </div>
            <Bar className="h-3 w-full" />
        </div>
    )
}

interface MustHaveSkeletonGridProps {
    variant?: 'link' | 'tip'
    count?: number
}

/** 2-up grid of compact skeleton cards, matching the real list grid spacing. */
export const MustHaveSkeletonGrid: React.FC<MustHaveSkeletonGridProps> = ({ variant = 'link', count = 4 }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-4">
        {Array.from({ length: count }).map((_, i) => (
            <MustHaveCardSkeleton key={i} variant={variant} />
        ))}
    </div>
)

export default MustHaveCardSkeleton
