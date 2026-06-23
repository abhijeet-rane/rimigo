import CustomShimmer from "@/components/shared/Shimmer" 

export const StaysCardSkeleton = () => {
  return (
    <div className="rounded-2xl border border-grey-4 overflow-hidden bg-white w-full">
      {/* Image */}
      <div className="relative aspect-4/3">
        <CustomShimmer height={300} radius={0} className="w-full h-full" />

        {/* Top-right action buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <CustomShimmer height={32}  radius={999} />
          <CustomShimmer height={32} radius={999} />
        </div>

        {/* Review pills */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <CustomShimmer height={28} radius={14} className="w-20" />
          <CustomShimmer height={28} radius={14} className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <CustomShimmer height={20} radius={4} className="w-4/5" />

        {/* Location */}
        <CustomShimmer height={14} radius={4} className="w-2/3" />

        {/* Curated labels */}
        <div className="flex gap-2 flex-wrap">
          <CustomShimmer height={24} radius={12} className="w-20" />
          <CustomShimmer height={24} radius={12} className="w-24" />
        </div>

        {/* Deals shimmer */}
        <div className="relative">
          <div className="flex gap-3 overflow-hidden">
            <CustomShimmer height={72} radius={12} className="w-36 shrink-0" />
            <CustomShimmer height={72} radius={12} className="w-36 shrink-0" />
          </div>

          {/* Edge fade like real deals row */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-grey-4">
          <div className="space-y-1">
            <CustomShimmer height={22} radius={4} className="w-24" />
            <CustomShimmer height={12} radius={4} className="w-16" />
          </div>
          <CustomShimmer height={40} radius={10} className="w-28" />
        </div>
      </div>
    </div>
  )
}
