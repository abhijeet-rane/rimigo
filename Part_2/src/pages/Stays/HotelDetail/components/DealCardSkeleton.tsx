const DealsCardSkeleton = () => {
    return (
        <div className="w-full rounded-2xl border border-grey-4 bg-natural-white overflow-hidden animate-pulse">
            {/* Room Title */}
            <div className="flex justify-between items-center bg-grey-5 p-4 border-b border-grey-4">
                <div className="h-5 w-1/4 bg-grey_4 rounded"></div>
                <div className="flex gap-2">
                    <div className="h-5 w-5 bg-grey_4 rounded-full"></div>
                    <div className="h-5 w-5 bg-grey_4 rounded-full"></div>
                </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-grey-4">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-6 w-24 bg-grey_3 rounded-full"></div>
                ))}
            </div>

            {/* Room Options */}
            <div className="grid grid-cols-2 border-b border-grey-4">
                {/* Refundable column */}
                <div className="flex flex-col p-4 gap-3 border-r border-grey-4">
                    <div className="h-5 w-1/3 bg-grey_4 rounded"></div>
                    <div className="h-4 w-3/4 bg-grey_3 rounded"></div>
                    <div className="h-4 w-2/3 bg-grey_3 rounded"></div>
                </div>

                {/* Non-refundable column */}
                <div className="flex flex-col p-4 gap-3">
                    <div className="h-5 w-1/2 bg-grey_4 rounded"></div>
                    <div className="h-4 w-3/4 bg-grey_3 rounded"></div>
                    <div className="h-4 w-2/3 bg-grey_3 rounded"></div>
                </div>
            </div>

            {/* Provider price rows */}
            <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between border border-grey-4 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-grey_3 rounded-full"></div>
                            <div className="flex flex-col gap-2">
                                <div className="w-24 h-4 bg-grey_3 rounded"></div>
                                <div className="w-16 h-3 bg-grey_4 rounded"></div>
                            </div>
                        </div>
                        <div className="w-20 h-5 bg-grey_3 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="h-[24px] bg-grey_4"></div>
        </div>
    )
}

export default DealsCardSkeleton
