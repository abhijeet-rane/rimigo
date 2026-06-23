import { AnimatedList } from '@/components/magicui/animated-list'
import { cn } from '@/lib/utils'
import { HandCoins, UserRoundCheck } from 'lucide-react'

interface Item {
    name: string
    description: React.ReactNode
    icon: React.ReactNode
    color: string
}

let notifications = [
    {
        name: 'Congratulations, you are onboarded!',
        description: <p className="text-xs text-gray-500">Congratulations on starting your journey with us.</p>,
        icon: <UserRoundCheck className="size-5 text-primary" />,
        color: '#FFB800'
    },
    {
        name: 'Flights Booked!',
        description: (
            <p className="text-xs text-gray-500">
                Booked via Travclan. Saved <span className="font-bold text-green-500"> &#8377;10000</span>.
            </p>
        ),

        icon: (
            <img
                src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-steps-section/travclan.svg"
                alt="Flight"
                className="object-cover text-primary rounded-full"
            />
        ),
        color: '#00C9A7'
    },

    {
        name: 'Hotels Booked!',
        description: (
            <p className="text-xs text-gray-500">
                Booked via Booking.com. Saved <span className="font-bold text-green-500"> &#8377;20000</span>.
            </p>
        ),
        icon: (
            <img
                src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-steps-section/hotel.svg"
                alt="Hotel"
                className="object-cover text-primary rounded-full"
            />
        ),
        color: '#FF3D71'
    },
    {
        name: `Congratulations, Ultimate Savings Done!`,
        description: (
            <p className="text-xs text-gray-500">
                Congratulations. You saved total of<span className="font-bold text-green-500"> &#8377;30000</span>
            </p>
        ),
        icon: <HandCoins className="size-5 text-primary" />,
        color: '#1E86FF'
    }
]

notifications = Array.from({ length: 4 }, () => notifications).flat()

const Notification = ({ name, icon, description }: Item) => {
    return (
        <figure
            className={cn(
                'relative mx-auto min-h-fit w-full  cursor-pointer overflow-hidden rounded-2xl p-4',
                // animation styles
                'transition-all duration-200 ease-in-out hover:scale-[103%]',
                // light styles
                ' [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]'
            )}>
            <div className="flex flex-row items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md">
                    <span className="text-lg">{icon}</span>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm sm:text-sm font-semibold">{name}</span>
                    {description}
                </div>
            </div>
        </figure>
    )
}

export function AnimatedBookingList({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'hidden lg:flex relative  h-[500px] w-full flex-col overflow-hidden p-4 rounded-md [mask-image:linear-gradient(to_top,transparent_4%,#000_60%)] group-hover:scale-105',
                className
            )}>
            <AnimatedList>
                {notifications.map((item, idx) => (
                    <Notification
                        {...item}
                        key={idx}
                    />
                ))}
            </AnimatedList>
        </div>
    )
}
