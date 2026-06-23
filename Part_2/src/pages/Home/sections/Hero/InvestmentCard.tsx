import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text'
import { STATIC_TEXT } from '@/constants'
import { cn } from '@/lib/utils'
const InvestmentCard = () => {
    return (
        <a
            href="https://yourstory.com/2025/04/ai-travel-tech-startup-rimigo-550-000-pre-seed-funding"
            target="_blank"
            rel="noopener noreferrer">
            <div
                className={cn(
                    'group rounded-full border border-black/5 bg-white text-black transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 '
                )}>
                <div className="group relative mx-auto flex items-center justify-center rounded-full px-3 py-1 xs:px-4 xs:py-1.5 sm:px-5 sm:py-2 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]">
                    <span
                        className={cn(
                            'absolute inset-0 block h-full w-full animate-gradient rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]'
                        )}
                        style={{
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'destination-out',
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'subtract',
                            WebkitClipPath: 'padding-box'
                        }}
                    />
                    🎉
                    <hr className="mx-2 h-3 xs:h-4 w-px shrink-0 bg-neutral-500" />
                    <AnimatedGradientText className="inline-flex items-center justify-center px-2 py-1 text-xs xs:px-4 xs:py-1.5 sm:text-sm md:text-base transition ease-out hover:text-black hover:duration-300">
                        {STATIC_TEXT.INVESTMENT_CARD_TEXT}
                    </AnimatedGradientText>
                </div>
            </div>
        </a>
    )
}

export default InvestmentCard
