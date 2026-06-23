import { GetATAByAgentIdResponse } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import { TrendingUp } from 'lucide-react'

const ATAFeatures = ({ ata, ataFeatureOnClick }: { ata: GetATAByAgentIdResponse; ataFeatureOnClick: (feature: any) => void }) => {
    const popular_searches = ata.features

    return (
        <div className="w-full relative flex flex-col items-start gap-3 text-left text-xs text-dimgray font-red-hat-display">
            <div className="flex items-center gap-1">
                <TrendingUp
                    size={16}
                    className="text-grey_2"
                />
                <b className="relative tracking-[-0.01em] text-xs text-grey-2 font-medium">Popular searches</b>
            </div>
            <div className="flex flex-row flex-wrap gap-2">
                {popular_searches.map((feature) => (
                    <div
                        key={feature.identifier}
                        className="w-[202px] flex items-start text-sm text-gray border border-grey-4 rounded-[8px] shadow-[0px_4px_8px_#f8f8f8]">
                        <div
                            onClick={() => ataFeatureOnClick(feature)}
                            className="flex-1 rounded-[8px]  cursor-pointer bg-white flex items-center py-2 px-3 gap-2">
                            <img
                                // TOOD: remove this fallback image
                                src={
                                    feature.icon_url && feature.icon_url !== ''
                                        ? feature.icon_url
                                        : 'https://i.postimg.cc/HLTQ1ghx/burj-khalifa-ticket-best-price.png'
                                }
                                className="w-8 relative max-h-full object-cover"
                                alt=""
                            />
                            {/* TODO: Change it to display_name with new input */}
                            <div className="flex-1 relative tracking-[-0.02em] font-medium">{feature.name}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ATAFeatures
