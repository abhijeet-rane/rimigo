import { motion } from 'framer-motion'
import { GetATAByAgentIdResponse } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import ATAFeatures from './ATAFeatures'

interface MainContentProps {
    agent: GetATAByAgentIdResponse
    isLoading: boolean
    ataFeatureOnClick: (feature: any) => void
}

const MainContent = ({ agent, isLoading, ataFeatureOnClick }: MainContentProps) => {
    if (isLoading) {
        return <div>Loading...</div>
    }

    const ATA_HEADER_TEXT = `Let us help you plan your trip using`
    const ATA_HEADER_TEXT_2 = `${agent.display_name}`

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 px-5 py-7 overflow-y-auto   h-full flex flex-col justify-between">
            <div className=" h-[30%] flex flex-col justify-between">
                <div className=" h-[20%]"></div>
                <div className="mb-3.5 w-full flex justify-center items-center">
                    <h1 className="relative text-2xl tracking-[-0.02em] font-medium leading-9 font-red-hat-display text-grey-0 text-center flex items-center justify-center">
                        {ATA_HEADER_TEXT} <br /> {ATA_HEADER_TEXT_2}
                    </h1>
                </div>
            </div>

            <ATAFeatures
                ata={agent}
                ataFeatureOnClick={ataFeatureOnClick}
            />
        </motion.div>
    )
}

export default MainContent
