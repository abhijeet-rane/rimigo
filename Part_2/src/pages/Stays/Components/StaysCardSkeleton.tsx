type ViewType = 'grid' | 'list'

interface StaysCardSkeletonProps {
    viewType?: ViewType
}

const StaysCardSkeleton = ({ viewType = 'grid' }: StaysCardSkeletonProps) => {
    // List View Skeleton — structurally identical to StaysCardListView
    // (image on left, content column on right; price rail at bottom of
    // content). Same paddings, gaps, and rounded corners so the switch
    // from shimmer → real card doesn't shift layout.
    if (viewType === 'list') {
        return (
            <div className="group relative rounded-xl border border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0] bg-white flex flex-col sm:flex-row w-full p-3 gap-4 animate-pulse">
                {/* ── Image Section ── mirrors: w-full sm:w-[200px] sm:min-w-[200px] h-[200px] rounded-xl */}
                <div className="relative w-full sm:w-[200px] sm:min-w-[200px] h-[200px] sm:h-[200px] rounded-xl overflow-hidden shrink-0 bg-grey-4">
                    {/* Action slot — matches desktop overlay (top-right hearts). */}
                    <div className="hidden sm:flex absolute right-2 top-2 items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/60" />
                        <div className="h-8 w-8 rounded-full bg-white/60" />
                    </div>
                    {/* Mobile overlay: shortlist left, +select right */}
                    <div className="sm:hidden absolute left-2 right-2 top-2 flex items-center justify-between">
                        <div className="h-8 w-8 rounded-full bg-white/60" />
                        <div className="h-8 w-8 rounded-full bg-white/60" />
                    </div>
                </div>

                {/* ── Content Section ── mirrors: flex flex-1 flex-col gap-3 min-w-0 */}
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                    {/* Title + "+ Select" row */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="h-5 rounded bg-grey-4 w-2/3" />
                            <div className="hidden sm:block h-4 rounded bg-grey-4 w-14 shrink-0" />
                        </div>

                        {/* Star rating + platform review pills + map icon */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* star cluster */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                <div className="h-3.5 w-3.5 rounded-sm bg-grey-4" />
                                <div className="h-3.5 w-3.5 rounded-sm bg-grey-4" />
                                <div className="h-3.5 w-3.5 rounded-sm bg-grey-4" />
                            </div>
                            {/* review pill — matches the rounded-full bg-[#f5f4f7] container */}
                            <div className="h-6 w-36 rounded-full bg-[#f5f4f7]" />
                        </div>

                        {/* Inline sub-text (locationTag) */}
                        <div className="h-3 rounded bg-grey-4 w-1/2" />
                    </div>

                    {/* Spacer — pushes price rail to the bottom on desktop */}
                    <div className="hidden sm:block sm:grow sm:shrink-0" />

                    {/* ── Price rail ── mirrors: bg-[#f5f4f7] rounded-[8px] p-2 */}
                    <div className="bg-[#f5f4f7] rounded-[8px] p-2 w-full">
                        <div className="bg-white flex items-center justify-between pl-3 pr-2 sm:pr-1 py-1 rounded-[8px] w-full">
                            <div className="flex items-center gap-2">
                                <div className="h-[20px] w-[60px] rounded bg-grey-4" />
                                <div className="h-4 w-16 rounded-2xl bg-grey-4" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="h-5 w-16 rounded bg-grey-4" />
                                    <div className="h-3 w-10 rounded bg-grey-4" />
                                </div>
                                <div className="h-[30px] w-[70px] rounded bg-grey-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Grid View Skeleton (Default)
    return (
        <div className="rounded-2xl max-md:w-[342px] max-md:shrink-0  overflow-hidden border border-feature-card-border bg-natural-white animate-pulse">
            {/* Image Skeleton */}
            <div className="relative aspect-[4/3] overflow-hidden bg-grey_4">
                {/* Heart button skeleton */}
                <div className="absolute right-3 top-3 rounded-full bg-grey_3 w-10 h-10" />

                {/* Review Pills Skeleton */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                    <div className="bg-grey_3 rounded-full w-24 h-7" />
                    <div className="bg-grey_3 rounded-full w-24 h-7" />
                </div>
            </div>

            {/* Hotel Details Skeleton */}
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="h-6 bg-grey_4 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-grey_4 rounded w-1/2" />
                    </div>
                    <div className="text-right ml-4">
                        <div className="h-6 bg-grey_4 rounded w-20 mb-1" />
                        <div className="h-3 bg-grey_4 rounded w-24" />
                    </div>
                </div>

                {/* Features Section Skeleton */}
                <div className="bg-grey_4 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-grey_3 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-grey_3 rounded w-full" />
                        <div className="h-3 bg-grey_3 rounded w-3/4" />
                        <div className="h-3 bg-grey_3 rounded w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StaysCardSkeleton
