import React from 'react'

interface SimpleFooterProps {
    compassLogoUrl?: string
    rimigoLogoUrl?: string
    tagline?: string
}

export const SimpleFooter: React.FC<SimpleFooterProps> = ({
    compassLogoUrl = 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_white_transparent_bg.png',
    tagline = 'Vacations made easy, powered by AI'
}) => {
    return (
        <footer className="w-full">
            {/* Full-width background container with gradient */}
            <div 
                className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] relative overflow-hidden"
                style={{
                    background: `
                      radial-gradient(
                        150% 120% at 50% 120%,
                        #A788FF 0%,
                        #4D1D91 60%
                      )
                    `
                  }}
                  
                  
            >
                <div className="relative z-10 w-full max-w-[80%] md:max-w-[85%] lg:max-w-[80%] mx-auto px-6 md:px-8 lg:px-12 py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        {/* Tagline - Above the logos */}
                        <p
                            className="mb-4"
                            style={{
                                width: '256px',
                                height: '22px',
                                fontFamily: 'Red Hat Display, sans-serif',
                                fontWeight: 550,
                                fontStyle: 'normal',
                                fontSize: '16px',
                                lineHeight: '22px',
                                letterSpacing: '-0.02em',
                                verticalAlign: 'middle',
                                color: '#FFFFFF',
                            }}>
                            {tagline}
                        </p>
                        
                        {/* Logo and Brand */}
                        <div className="flex items-center justify-center gap-3">
                            <img
                                src={compassLogoUrl}
                                alt="Rimigo Compass Logo"
                                className="h-8 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

