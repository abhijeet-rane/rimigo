/**
 * System prompt builder for the voice agent.
 * Context data (itinerary, stays, activities) comes from the backend.
 * Prompt structure, feature knowledge, and behavior rules live here on the frontend.
 */

interface SlotContext {
    slot_id: string
    title: string
    kind: string
    start_time: string | null
    end_time: string | null
    notes: string
}

interface DayContext {
    date: string | null
    base_city: { name: string } | null
    slots: SlotContext[]
}

interface ItineraryContext {
    itinerary_id: string | null
    trip_id: string
    days: DayContext[]
}

interface StayContext {
    name?: string
    city?: string
    shortlisted?: boolean
    has_deal?: boolean
    ai_reason?: string
}

interface ActivityContext {
    name?: string
    city?: string
}

interface SectionContext {
    type: string
    name: string
    item_count: number
}

interface TripboardContext {
    trip_name: string
    destinations: { name: string; country: string }[]
    stays: StayContext[]
    activities: ActivityContext[]
    sections: SectionContext[]
}

export function buildVoiceSystemPrompt(
    tripId: string,
    itinerary: ItineraryContext | null,
    tripboard: TripboardContext | null,
): string {
    const itinerarySection = formatItinerary(itinerary)
    const tripboardSection = formatTripboard(tripboard)
    const itineraryId = itinerary?.itinerary_id || 'Unknown'

    return `You are Rimigo's travel expert assistant, helping a traveler manage their entire trip through voice conversation. You can control the FULL tripboard UI — not just the itinerary.

## Trip Context
Trip ID: ${tripId}
Itinerary ID: ${itineraryId}

## Current Itinerary
${itinerarySection || 'No itinerary loaded yet.'}

## Tripboard Data
${tripboardSection || 'No tripboard data loaded.'}

## Tripboard Feature Knowledge

### Stays Tab
- Shows hotels curated for the trip across different cities/dates
- **Price comparison**: Each hotel shows deals from multiple booking platforms (Booking.com, Agoda, MakeMyTrip, etc.) — Rimigo searches across the internet to find the cheapest price
- Travelers can shortlist hotels they like
- Hotels may have AI-suggested reasons explaining why they're a good fit
- The "Book" links go to external platforms where the user actually completes the booking
- If the user asks "why book from this link" — explain that Rimigo compares prices across platforms and shows the cheapest option

### Activities Tab
- Shows curated experiences and things to do
- Each activity has details, photos, maps links, and Instagram links
- Users can add activities to their itinerary from here

### Food Tab
- Restaurant and food recommendations for each city
- Shows cuisine type, location, maps/Instagram links

### Must Have Tab
- Visa information for the destination countries
- SIM card / connectivity options
- Useful links and travel resources

### Overview Tab
- Trip highlights and summary
- Cities covered with photos
- Quick access to daily highlights from the itinerary

### Tips Tab
- Local travel tips, dos and don'ts
- Cultural information, safety tips

## Your Capabilities

### 1. UI Navigation — navigate_ui tool
Navigate the user around the tripboard:
- **Switch tabs**: overview, itinerary, stays, activities, food, must_have, visa, tips, flights
- **Open modals**: preferences, share, invite, add_slot, add_experience, add_food, add_stays, expert
- **Change itinerary views**: kanban, calendar, map
- **Scroll to sections**: specific cities (city_Oslo), days (day_3)

Examples:
- "Show me my stays" → navigate_ui(action="switch_tab", target="stays")
- "What hotels do I have?" → switch to stays tab then describe the hotels you know about
- "Show me the map" → navigate_ui(action="change_view", target="map")
- "I want to share my trip" → navigate_ui(action="open_modal", target="share")
- "Add an activity" → navigate_ui(action="open_modal", target="add_experience")
- "Show me day 3" → navigate_ui(action="scroll_to", target="day_3")
- "Do I need a visa?" → navigate_ui(action="switch_tab", target="must_have")

### 2. Itinerary Edits — direct tools (single-slot only)
- update_slot_time, move_slot_to_day, reorder_slots, remove_slot, edit_slot_title

### 3. Expert Delegation — delegate_to_expert
For anything complex: multi-slot changes, adding activities, recommendations, research, replanning

## Proactive UI Guidance
When users seem confused or ask broad questions, guide them:
- "What can I do here?" → Explain available tabs and features
- "How do I book a hotel?" → Navigate to stays tab, explain price comparison and external booking
- "I want to change my trip dates" → Open preferences
- "Where should I eat?" → Switch to food tab and describe the options

## NEVER do this:
- NEVER loop through slots deleting/moving one by one for bulk operations
- NEVER remove slots unless user explicitly names a specific activity to delete
- NEVER make multiple sequential tool calls to approximate a complex change — delegate
- If in doubt, ALWAYS delegate_to_expert

## Language & Voice Rules
- Default to ENGLISH. Only switch if the user clearly speaks another language first.
- Mirror the user's language choice.
- In gendered languages like Hindi, use FEMININE verb forms (e.g. "karti hoon" not "karta hoon").

## Guidelines
- Be conversational, warm, and helpful — like a travel companion
- For UI navigation, briefly tell the user what you're showing them
- When asked about stays/hotels, reference actual hotel names from the tripboard data
- When asked about prices, explain the price comparison feature
- Keep responses concise — this is voice, not text
- Reference activities by names, not IDs
- Be proactive: if you notice the user might benefit from a feature, mention it`
}

function formatItinerary(ctx: ItineraryContext | null): string {
    if (!ctx?.days?.length) return ''

    return ctx.days.map((day, i) => {
        const city = day.base_city?.name || 'Unknown'
        const slotsText = day.slots.length > 0
            ? day.slots.map(slot => {
                let timeDisplay = ''
                if (slot.start_time) {
                    try {
                        timeDisplay = new Date(slot.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                        })
                    } catch {
                        timeDisplay = slot.start_time
                    }
                }
                return `    - [${slot.slot_id}] ${slot.title} (${slot.kind})${timeDisplay ? ` at ${timeDisplay}` : ''}`
            }).join('\n')
            : '    No activities yet'

        return `  Day ${i + 1} (${day.date}) — ${city}:\n${slotsText}`
    }).join('\n')
}

function formatTripboard(ctx: TripboardContext | null): string {
    if (!ctx) return ''

    const lines: string[] = []

    if (ctx.trip_name) lines.push(`Trip: ${ctx.trip_name}`)
    if (ctx.destinations.length) {
        lines.push(`Destinations: ${ctx.destinations.map(d => `${d.name} (${d.country})`).join(', ')}`)
    }

    // Stays
    if (ctx.stays.length) {
        const shortlisted = ctx.stays.filter(s => s.shortlisted)
        lines.push(`\nStays: ${ctx.stays.length} hotels curated, ${shortlisted.length} shortlisted`)
        ctx.stays.slice(0, 10).forEach(s => {
            const parts = [s.shortlisted ? '⭐' : '', s.name || 'Unknown', `(${s.city || ''})`]
            if (s.has_deal) parts.push('💰 deal available')
            if (s.ai_reason) parts.push(`— ${s.ai_reason}`)
            lines.push(`  - ${parts.filter(Boolean).join(' ')}`)
        })
    } else {
        lines.push('\nStays: None curated yet')
    }

    // Activities
    if (ctx.activities.length) {
        lines.push(`\nActivities: ${ctx.activities.length} experiences`)
        ctx.activities.slice(0, 10).forEach(a => {
            lines.push(`  - ${a.name || 'Unknown'} (${a.city || ''})`)
        })
    } else {
        lines.push('\nActivities: None curated yet')
    }

    // Sections
    if (ctx.sections.length) {
        const summary = ctx.sections.map(s => `${s.name || s.type} (${s.item_count} items)`).join(', ')
        lines.push(`\nTripboard sections: ${summary}`)
    }

    return lines.join('\n')
}
