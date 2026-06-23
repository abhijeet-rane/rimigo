import Typography from '@/components/shared/Typography'
import { ExperiencesCountrySelector } from '../ExperiencesCountrySelector'
import { GradientButton } from '@/components/shared/GradientButton'
import ExperienceCard from '../../ExperienceCard'
import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { experiencesDummyData } from '@/modules/Experiences/data/experiencesDummyData'

interface ExperienceDestionationSelectorPageProps {
    selectedCountry: string
    setSelectedCountry: (country: string) => void
    handleSearch: () => void
    countries: LocationPersonalizationResponse[]
    isLoadingCountries: boolean
}

const ExperienceDestionationSelectorPage: React.FC<ExperienceDestionationSelectorPageProps> = ({
    selectedCountry,
    setSelectedCountry,
    handleSearch,
    countries,
    isLoadingCountries
}) => {
    return (
        <div className="h-screen">
            {/* Layer 3: Headline + CTA (align start vertically) */}
            <div
                className=" flex flex-col items-center justify-start text-center px-6 "
                style={{ paddingTop: '18vh' }}>
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
                    Explore experiences,
                    <br />
                    that you'll{' '}
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
                        love
                    </span>
                    .
                </h1>
                <div className="flex flex-row items-center justify-center gap-2">
                    <Typography
                        size="16"
                        weight="bold"
                        color="grey-2"
                        textAlign="center"
                        family="redhat"
                        className=" min-w-[120px] max-w-[160px]">
                        Where are <br /> you going?
                    </Typography>
                    <ExperiencesCountrySelector
                        onCountrySelect={setSelectedCountry}
                        selectedCountry={selectedCountry}
                        countries={countries}
                        isLoadingCountries={isLoadingCountries}
                    />
                    <GradientButton
                        onClick={handleSearch}
                        title="SEARCH"
                        className="w-full max-w-[98px] p-4"
                        disabled={!selectedCountry}
                    />
                </div>
            </div>
            {/* Layer 1: Centered experience cards (scoped to this page only) */}
            <div className=" h-full z-10 flex justify-center pt-[10vh] relative">
                {/* overlay */}
                <div className="absolute inset-0 z-20 bg-natural-white/70" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-6">
                    {experiencesDummyData.map((experience: any) => (
                        <div key={experience.id}>
                            <ExperienceCard
                                experience={experience}
                                onClick={() => {
                                    // Handle click action - TODO: Implement navigation
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Layer 2: White overlay at 40% (scoped to this page only) */}
            {/* <div className="absolute inset-0 z-20 bg-natural-white/70" /> */}
        </div>
    )
}

export default ExperienceDestionationSelectorPage
