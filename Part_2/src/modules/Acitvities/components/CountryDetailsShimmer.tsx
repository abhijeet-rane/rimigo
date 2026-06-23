import CustomShimmer from '@/components/shared/Shimmer'

const CountryDetailsShimmer = () => {
    return (
        <>
            {/* Country Info Shimmer */}
            <div className="flex flex-col gap-1 max-w-[480px]">
                <CustomShimmer
                    height={28}
                    radius={4}
                    className="w-3/4"
                />
                <CustomShimmer
                    height={14}
                    radius={4}
                    className="w-full mt-1"
                />
                <CustomShimmer
                    height={14}
                    radius={4}
                    className="w-5/6 mt-1"
                />
            </div>

            {/* Country Stats Shimmer */}
            <div className="flex-1 flex flex-col md:flex-row items-start gap-6 w-full lg:w-auto">
                {/* Stat Item 1 */}
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <CustomShimmer
                            height={18}
                            radius={4}
                            className="w-5"
                        />
                        <CustomShimmer
                            height={14}
                            radius={4}
                            className="w-32"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <CustomShimmer
                            height={16}
                            radius={4}
                            className="w-24"
                        />
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-40"
                        />
                    </div>
                </div>

                <div className="hidden md:block w-[1px] h-[52px] bg-[color:var(--color-grey-4)] self-center"></div>

                {/* Stat Item 2 */}
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <CustomShimmer
                            height={18}
                            radius={4}
                            className="w-5"
                        />
                        <CustomShimmer
                            height={14}
                            radius={4}
                            className="w-28"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <CustomShimmer
                            height={16}
                            radius={4}
                            className="w-20"
                        />
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-36"
                        />
                    </div>
                </div>

                <div className="hidden md:block w-[1px] h-[52px] bg-[color:var(--color-grey-4)] self-center"></div>

                {/* Stat Item 3 */}
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <CustomShimmer
                            height={18}
                            radius={4}
                            className="w-5"
                        />
                        <CustomShimmer
                            height={14}
                            radius={4}
                            className="w-36"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-16"
                        />
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-44"
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default CountryDetailsShimmer
