import React from 'react'
import VideoCard from './VideoCard'
import { TravelContent } from '../api/watchAlongApi'

interface WatchAlongLandingOverlayProps {
    previewVideos?: TravelContent[]
}

const WatchAlongLandingOverlay: React.FC<WatchAlongLandingOverlayProps> = ({ previewVideos = [] }) => {
    return (
        <>
            {/* Layer 1: Centered video cards (scoped to this page only) */}
            {previewVideos.length > 0 && (
                <div
                    className="absolute inset-0 z-10 pointer-events-none flex justify-center"
                    style={{ paddingTop: '43vh' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-6">
                        {previewVideos.slice(0, 3).map((video) => (
                            <div
                                key={video.id}
                                className="pointer-events-none">
                                <VideoCard
                                    video={video}
                                    onClick={() => {
                                        // Handle click action - disabled in preview mode
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Layer 2: White overlay at 70% (scoped to this page only) */}
            <div className="absolute inset-0 z-20 bg-natural-white/70" />

            {/* Layer 3: Headline (align start vertically) */}
            <div
                className="absolute inset-0 z-30 flex flex-col items-center justify-start text-center px-6"
                style={{ paddingTop: '22vh' }}>
                <h1
                    style={{
                        color: 'var(--grey-0, #101010)',
                        textAlign: 'center',
                        textShadow: '0 2px 8px var(--grey-4, #E0E0E0)',
                        fontFamily: 'Red Hat Display',
                        fontSize: '48px',
                        fontStyle: 'normal',
                        fontWeight: 467,
                        lineHeight: '56px',
                        letterSpacing: '-0.48px',
                        marginBottom: '24px'
                    }}>
                    Watch travel videos,
                    <br />
                    discover experiences{' '}
                    <span
                        style={{
                            color: 'var(--primary-indigo, #7011F6)',
                            fontFamily: 'Red Hat Display',
                            fontSize: '48px',
                            fontStyle: 'italic',
                            fontWeight: 467,
                            lineHeight: '56px',
                            letterSpacing: '-0.48px'
                        }}>
                        you'll love
                    </span>
                    .
                </h1>
            </div>
        </>
    )
}

export default WatchAlongLandingOverlay
