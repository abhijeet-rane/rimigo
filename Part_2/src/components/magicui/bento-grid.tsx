import { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { WorldMap } from '../ui/world-map'

interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
    children: ReactNode
    className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
    name: string
    className: string
    background: ReactNode
    Icon?: React.ElementType
    description: string
    href: string
    cta: string
}

interface BentoCardContentProps extends BentoCardProps {
    content?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
    return (
        <div
            className={cn('relative grid w-full auto-rows-[14rem] md:auto-rows-[14rem] lg:auto-rows-[18rem] grid-cols-3 gap-4', className)}
            {...props}>
            {children}
        </div>
    )
}

const BentoCard = ({ name, className, background, Icon, description, content = '', ...props }: BentoCardContentProps) => (
    <div
        key={name}
        className={cn(
            'group relative col-span-4 flex flex-col justify-between overflow-hidden rounded-xl',
            ' bg-transparent lg:bg-background  border border-transparent lg:border-[1px] lg:border-gray-200',
            className
        )}
        {...props}>
        {content?.length == 0 ? (
            <>
                <div>{background}</div>
                <div className="pointer-events-none z-10 absolute   lg:bottom-4 left-0 flex transform-gpu flex-row  md:flex-col gap-1 p-4 transition-all duration-300 group-hover:-translate-y-10">
                    {Icon && (
                        <Icon className="hidden lg:block size-4 origin-right transform-gpu text-primary transition-all duration-300 ease-in-out group-hover:scale-75 text-right" />
                    )}

                    <h3 className="hidden lg:block text-lg font-semibold text-[#2b2c32] text-left">{name}</h3>
                    <p className="max-w-lg text-md hidden md:block text-neutral-400">{description}</p>
                </div>

                <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] " />
            </>
        ) : (
            <div className="relative">
                <WorldMap
                    dots={[
                        {
                            start: {
                                lat: 64.2008,
                                lng: -149.4937
                            }, // Alaska (Fairbanks)
                            end: {
                                lat: 34.0522,
                                lng: -118.2437
                            } // Los Angeles
                        },
                        {
                            start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
                            end: { lat: -15.7975, lng: -47.8919 } // Brazil (Brasília)
                        },
                        {
                            start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
                            end: { lat: 38.7223, lng: -9.1393 } // Lisbon
                        },
                        {
                            start: { lat: 51.5074, lng: -0.1278 }, // London
                            end: { lat: 28.6139, lng: 77.209 } // New Delhi
                        },
                        {
                            start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                            end: { lat: 43.1332, lng: 131.9113 } // Vladivostok
                        },
                        {
                            start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                            end: { lat: -1.2921, lng: 36.8219 } // Nairobi
                        }
                    ]}
                />
                <div className="pointer-events-none z-10 absolute bottom-[-60px]  lg:bottom-0 left-0 flex transform-gpu flex-row  md:flex-col gap-1 p-4 transition-all duration-300 group-hover:-translate-y-10">
                    {Icon && (
                        <Icon className="size-4 origin-right transform-gpu text-primary transition-all duration-300 ease-in-out group-hover:scale-75 text-right" />
                    )}
                    <h3 className="text-lg font-semibold text-[#2b2c32] text-left">{name}</h3>
                    <p className="max-w-lg text-md hidden md:block text-neutral-400">{description}</p>
                </div>
                <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 " />
            </div>
        )}
    </div>
)

export { BentoCard, BentoGrid }
