import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { AnimatedBookingList } from '@/pages/Home/sections/Steps/AnimatedBookingList'
import { IconClipboardCopy, IconFileBroken } from '@tabler/icons-react'
import { motion } from 'framer-motion'

// const TotalSavings = () => {
//     return (
//         <motion.div
//             initial={{ opacity: 0, x: 100 }}
//             whileInView={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.8, ease: "easeOut" }}
//             viewport={{ once: false, amount: 0.2 }}
//             className="w-full max-w-[300px] md:max-w-[200px] bg-white shadow-xl border-green-500 border-[1px] md:absolute md:bottom-[-40px] md:right-[-100px] rounded-md p-4"
//         >
//             <p className="text-green-500 text-md md:text-lg font-semibold">Total Savings</p>

//             <div className="space-y-2 mt-2">
//                 {[
//                     { label: "Time", value: "1000 hours" },
//                     { label: "Flights", value: "₹10,000" },
//                     { label: "Transfers", value: "₹10,000" },
//                     { label: "Hotels", value: "₹30,000" },
//                 ].map((item, index) => (
//                     <p key={index} className="flex items-center text-sm md:text-md">
//                         <img src="/story-card/tick.svg" alt="tick" className="w-4 h-4 mr-2" />
//                         <span className="text-icon">{item.label}: </span>
//                         <span className="text-green-500 ml-1">{item.value}</span>
//                     </p>
//                 ))}
//             </div>

//             {/* Divider */}
//             <div className="w-full h-[1px] bg-green-500 my-3"></div>

//             {/* Total Savings */}
//             <p className="flex items-center text-sm md:text-md font-semibold">
//                 <img src="/story-card/tick.svg" alt="tick" className="w-4 h-4 mr-2" />
//                 <span className="text-icon">Total: </span>
//                 <span className="text-green-500 ml-1">₹50,000</span>
//             </p>
//         </motion.div>
//     );
// };

export function BookingGrid() {
    return (
        <>
            <BentoGrid className="max-w-4xl mx-auto  md:auto-rows-[25rem] relative  rounded-md">
                {items.map((item, i) => (
                    <BentoGridItem
                        key={i}
                        className={item.className}
                        content={item.content}
                    />
                ))}
            </BentoGrid>
            <div className="w-full text-center ">
                <p className="text-header-black text-center text-[16px] md:text-[20px] ">Secure the lowest price online in seconds.</p>
            </div>
        </>
    )
}
const Skeleton = () => (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl   bg-dot-black/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]  border border-transparent  bg-neutral-100"></div>
)
const items = [
    {
        title: 'The Dawn of Innovation',
        description: 'Explore the birth of groundbreaking ideas and inventions.',
        header: <Skeleton />,
        className: 'md:col-span-2',
        icon: <IconClipboardCopy className="h-4 w-4 text-neutral-500" />,
        content: (
            <>
                <div className="w-full h-full left-0 right-0 bottom-0 ">
                    <div className="flex flex-col items-center justify-center w-full h-full ">
                        <div className="flex flex-col items-center justify-center w-full h-full overflow-visible">
                            <motion.img
                                initial={{ opacity: 0, y: 100 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                viewport={{ once: false, amount: 0.2 }}
                                src="/optimized/booking_optimized.svg"
                                alt="Booking"
                                className="lg:mt-4  object-cover"
                            />
                        </div>
                    </div>
                </div>
            </>
        )
    },
    {
        title: 'The Digital Revolution',
        description: 'Dive into the transformative power of technology.',
        header: <Skeleton />,
        className: 'md:col-span-1 md:row-span-1',
        icon: <IconFileBroken className="h-4 w-4 text-neutral-500" />,
        content: (
            <>
                <AnimatedBookingList className="w-full h-full relative hidden md:block" />
            </>
        )
    }
]
