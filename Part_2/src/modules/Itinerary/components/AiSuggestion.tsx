import Typography from '@/components/shared/Typography'
import { AiSuggestion } from '@/utils/SvgUtils'

interface AiSuggestionsListProps {
    suggestions: string[]
    className?: string
}

export const AiSuggestionsList: React.FC<AiSuggestionsListProps> = ({ suggestions, className = '' }) => {
    if (!suggestions || suggestions.length === 0) return null

    return (
        <div className={`flex flex-col gap-3 bg-primary-default-08 px-4 py-3.5 ${className}`}>
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 shrink-0 text-primary-default [&_svg]:block">
                    <AiSuggestion />
                </div>
                <Typography
                    size="12"
                    weight="semibold"
                    color="primary-default"
                    family="manrope"
                    className="leading-tight">
                    Suggestions
                </Typography>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {suggestions.map((text, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                        <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-default"
                            aria-hidden
                        />
                        <Typography
                            size="12"
                            weight="medium"
                            family="manrope"
                            color="primary-default"
                            className="min-w-0 flex-1 leading-relaxed">
                            {text}
                        </Typography>
                    </li>
                ))}
            </ul>
        </div>
    )
}
