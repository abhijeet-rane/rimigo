import React from 'react'
import type { TravelInfoData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import SubjectLine from './primitives/SubjectLine'
import ContentBox from './primitives/ContentBox'
import CollapsibleSection from './molecules/CollapsibleSection'

/** Strip markdown artifacts (**, *, #) that LLM may inject. */
const clean = (text?: string | null): string => (text || '').replace(/\*{1,2}/g, '').replace(/^#+\s*/gm, '').trim()

interface TravelInfoCardProps {
    data: TravelInfoData
}

const INITIAL_VISIBLE = 2

const TravelInfoCard: React.FC<TravelInfoCardProps> = ({ data }) => {
    const facts = data.key_facts || []
    const hasOverflow = facts.length > INITIAL_VISIBLE

    const renderFacts = (items: typeof facts) =>
        items.map((fact, idx) => (
            <ContentBox key={idx}>
                <p className="text-sm font-medium text-grey_2 font-manrope uppercase tracking-wide mb-1">
                    {clean(fact.label)}
                </p>
                <p className="text-base text-grey_0 font-manrope leading-6">
                    {clean(fact.value)}
                </p>
            </ContentBox>
        ))

    return (
        <ChatCardShell intent="neutral">
            {data.response && <ResponseText text={clean(data.response)} size="title" />}

            <SubjectLine prefix="About" subject={clean(data.subject)} />

            {facts.length > 0 && !hasOverflow && (
                <div className="flex flex-col gap-2">{renderFacts(facts)}</div>
            )}

            {hasOverflow && (
                <>
                    <div className="flex flex-col gap-2">{renderFacts(facts.slice(0, INITIAL_VISIBLE))}</div>
                    <CollapsibleSection
                        title="More Details"
                        itemCount={facts.length - INITIAL_VISIBLE}
                        showLabel="Show more"
                        hideLabel="Show less"
                    >
                        <div className="flex flex-col gap-2">{renderFacts(facts.slice(INITIAL_VISIBLE))}</div>
                    </CollapsibleSection>
                </>
            )}
        </ChatCardShell>
    )
}

export default TravelInfoCard
