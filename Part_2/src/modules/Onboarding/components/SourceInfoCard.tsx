import React from 'react'
import StackedProfileImages from './StackedProfileImages'
import Typography from '@/components/shared/Typography'

const SourceInfoCard: React.FC<{
    firstName: string
    imageUrl: string
    source_app: string
}> = ({ firstName, imageUrl, source_app }) => {
    const SOURCE_APP_ICON_MAP: Record<string, string> = {
        instagram: 'https://media.rimigo.com/1768216268750_instagram.png',
        youtube: 'https://media.rimigo.com/1768216429541_youtube.png'
    }

    const DEFAULT_SOURCE_ICON = 'https://media.rimigo.com/1768216268750_instagram.png'

    const normalizedSourceApp = source_app?.toLowerCase() || ''
    const sourceIcon =
        SOURCE_APP_ICON_MAP[normalizedSourceApp] ?? DEFAULT_SOURCE_ICON

    return (
        <div className="relative flex flex-col items-center gap-3.5 rounded-xl px-10 py-2 ">
            {/* Stacked images */}
            <StackedProfileImages
                urls={[imageUrl]}
                radius={90}
                overlap={60}
            />

            {/* Description */}
            <div className="flex flex-col gap-3 items-center">
                <div className="flex flex-row gap-2 items-center">
                    <img
                        src={sourceIcon}
                        alt={normalizedSourceApp || 'instagram'}
                        className="w-6 h-6 object-contain"
                    />
                    <Typography
                        size="18"
                        weight="semibold"
                        color="grey-0"
                        family="manrope">
                        @{firstName}
                    </Typography>
                </div>
                {/* <PoweredByRimigo /> */}

            </div>
        </div>
    )
}

export default SourceInfoCard
