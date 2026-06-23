import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"

type Props = {
    isSubmitting: boolean
}

export function SubmitButton({ isSubmitting }: Props) {
    return (
        <Button
            type="submit"
            disabled={isSubmitting}
            className="
        w-full p-6 bg-header-black text-white
        font-[645] text-[16px]
        flex items-center justify-center gap-2 mt-6
        disabled:opacity-50 cursor-pointer
      "
        >
            <Phone className="h-4 w-4" />
            {isSubmitting ? "SUBMITTING..." : "REQUEST CALLBACK"}
        </Button>
    )
}