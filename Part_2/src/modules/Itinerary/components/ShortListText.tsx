import { FC } from 'react'
import { ArrowUp } from 'lucide-react'

interface ShortListTextProps {
    shortlistedCount: number
}

const ShortListText: FC<ShortListTextProps> = ({ shortlistedCount }) => {
    const openInNewTab = (path: string) => {
        window.open(path, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="text-center text-gray-600 mt-10 text-lg">
            {shortlistedCount > 0 ? (
                <p>
                    You have shortlisted{' '}
                    <span className="font-medium text-gray-900">
                        {shortlistedCount} activit{shortlistedCount !== 1 ? 'ies' : 'y'}
                    </span>
                    .
                    <br />
                    <span
                        onClick={() => openInNewTab('/experiences')}
                        className="inline-flex items-center gap-1 cursor-pointer text-primary-default font-medium transition-colors"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openInNewTab('/experiences')}>
                        Wish to add more
                        <ArrowUp className="w-4 h-4" />
                    </span>
                </p>
            ) : (
                <p>
                    You have not shortlisted any activities yet.
                    <br />
                    <span
                        onClick={() => openInNewTab('/experiences')}
                        className="inline-flex items-center gap-1 cursor-pointer text-primary-default  font-medium transition-colors"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openInNewTab('/experiences')}>
                        Shortlist first
                        <ArrowUp className="w-4 h-4" />
                    </span>
                </p>
            )}
        </div>
    )
}

export default ShortListText
