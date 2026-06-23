import { Input } from "@/components/ui/input"

type Props = {
    value: string
    onChange: (v: string) => void
}

export function NameField({ value, onChange }: Props) {
    return (
        <div>
            <label className="font-red-hat-display font-[550] text-[16px]">
                Name
            </label>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your Name"
                required
                className="
          mt-3 rounded-sm border-grey-4 font-manrope text-[16px]! font-medium
          focus:outline-none focus:ring-0 focus:ring-offset-0
          placeholder:text-[15px] placeholder:font-medium
          focus-visible:border-1 focus-visible:ring-0! selection:bg-blue-600! selection:text-white!
        "
            />
        </div>
    )
}