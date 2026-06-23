import { useState } from 'react'
import { STATIC_TEXT } from '@/constants'
import SectionDescription from '@/components/SectionDescription'
import { FEATURE_DATA } from './constants'
import { StepCardList } from './components/StepCardList'
import { StepPreview } from './components/StepPreview'

export default function Steps() {
          const [activeStep, setActiveStep] = useState(0)

          return (
            <section className="bg-gradient-to-b from-white to-stone-50/50 py-20 px-4">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12 px-3">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-[-0.6px]">
                    {STATIC_TEXT.STEPS_HEADER}
                  </h1>

                  <SectionDescription
                    description={STATIC_TEXT.STEPS_DESCRIPTION}
                    align="center"
                    className="max-w-full mx-auto mt-4"
                  />
                </div>

                {/* ================= MOBILE LAYOUT ================= */}
                <div className="lg:hidden space-y-10">
                {FEATURE_DATA.map((step, index) => (
                        <div key={step.id} className="bg-grey-5 rounded-3xl px-6 py-6 shadow-sm border border-grey-4 flex flex-col items-center justify-center">
                        {/* Header with icon and title */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center justify-center min-w-[35px] min-h-[35px] rounded-full bg-primary-default text-white shadow-md">
                                    {<step.icon size={22} />}
                                </div>
                                <h3 className="font-semibold text-[17px] text-header-black leading-tight tracking-[-0.2px]">
                                    {step.title}
                                </h3>
                            </div>

                        {/* Video preview */}
                        <StepPreview step={step} index={index} />
                    </div>
                    ))}
                </div>

                {/* ================= DESKTOP LAYOUT ================= */}
                <div className="hidden lg:flex flex-col items-center gap-8">
                    <div className="w-full">
                        <StepCardList
                        steps={FEATURE_DATA}
                        activeStep={activeStep}
                        onSelect={setActiveStep}
                        />
                    </div>
                    <div className="w-full max-w-[850px]">
                <StepPreview
                step={FEATURE_DATA[activeStep]}
                index={activeStep}
                />
            </div>
            </div>
        </div>
        </section>
    )
}
