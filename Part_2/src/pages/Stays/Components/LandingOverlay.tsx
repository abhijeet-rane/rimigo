import React from 'react'
import StaysCard from './StaysCard'
import type { LandingCardData } from '../Constants/landingDummyCards'

interface LandingOverlayProps {
    cards: LandingCardData[]
    formattedCityName?: string
}

const LandingOverlay: React.FC<LandingOverlayProps> = ({ cards, formattedCityName }) => {
    return (
        <>
            {/* Layer 1: Centered dummy cards (scoped to this page only) */}
            <div
                className="absolute inset-0 z-10 pointer-events-none flex justify-center"
                style={{ paddingTop: '43vh' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-6">
                    {cards.map((d) => (
                        <div
                            key={d.id}
                            className="pointer-events-none">
                            <StaysCard
                                id={d.id}
                                title={d.title}
                                price={d.price}
                                image={d.image}
                                platformReviews={d.platformReviews}
                                locationTag={d.locationTag}
                                curatedLabels={d.curatedLabels}
                                formattedCityName={formattedCityName}
                                fullHeight={false}
                                overallRating={d.overallRating}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Layer 2: White overlay at 40% (scoped to this page only) */}
            <div className="absolute inset-0 z-20 bg-natural-white/70" />

            {/* Layer 3: Headline + CTA (align start vertically) */}
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
                    Find the best stays,
                    <br />
                    personalised from our
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
                        {' '}
                        handpicked{' '}
                    </span>
                    list.
                </h1>
                {/* <button
          onClick={onExplore}
          className="cursor-pointer px-6 py-3 transition-colors shadow"
          style={{
            borderRadius: '12px',
            background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)',
            boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.12)',
            color: 'var(--full-white, #FFF)',
            textAlign: 'center',
            fontFamily: 'Red Hat Display',
            fontSize: '16px',
            fontStyle: 'normal',
            fontWeight: 645,
            lineHeight: 'normal',
            letterSpacing: '-0.16px'
          }}
        >
          EXPLORE STAYS
        </button> */}
            </div>
        </>
    )
}

export default LandingOverlay
