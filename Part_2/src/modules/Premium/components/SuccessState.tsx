import { CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

export function SuccessState({ name, compact = false }: { name?: string; compact?: boolean }) {
    return (
        <CardContent className={cn("text-center", compact ? "py-7 px-4 sm:px-6" : "py-24")}>
            {compact ? (
                <div className="flex flex-col items-center">
                    <div className="mx-auto mb-3 h-30 w-30 overflow-hidden rounded-xl flex items-center justify-center">
                        <DotLottieReact
                            src="https://media.rimigo.com/1771327910853_Done.json"
                            loop
                            autoplay
                            speed={1}
                            className="h-full w-full"
                        />
                    </div>
                    <h2 className="font-red-hat-display text-[20px] font-semibold leading-tight text-grey-0">
                        Awesome {name?.split(" ")[0]}!
                    </h2>
                    <p className="mt-1 font-red-hat-display text-[20px] font-semibold leading-tight text-grey-0">
                        We&rsquo;ll get in touch
                    </p>
                    <p className="mt-3 max-w-[280px] font-manrope text-[14px] font-medium leading-5 text-grey-2">
                        Our travel expert will contact you to discuss the next steps.
                    </p>
                </div>
            ) : (
                <>
                    <h2 className="font-red-hat-display font-[550] text-[32px] text-white">
                        Awesome {name?.split(" ")[0]}!
                        <br />
                        We&rsquo;ll get in touch
                    </h2>
                    <p className="mt-3 font-medium font-manrope text-[18px] text-white">
                        Our travel expert will contact you to discuss the next steps.
                    </p>
                </>
            )}
        </CardContent>
    )
}
