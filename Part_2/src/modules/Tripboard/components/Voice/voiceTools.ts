/**
 * Tool definitions for the OpenAI Realtime voice agent.
 * These are sent to OpenAI during the WebRTC session setup.
 *
 * Keeping tools on the frontend means:
 * - No backend deploy needed when adding new UI actions
 * - Client-side tools (navigate_ui, delegate_to_expert) stay close to the UI
 * - Backend only provides data context + ephemeral token
 */

export function getVoiceToolDefinitions() {
    return [
        {
            type: 'function',
            name: 'update_slot_time',
            description: 'Update the start time and/or end time of an activity in the itinerary.',
            parameters: {
                type: 'object',
                properties: {
                    slot_id: { type: 'string', description: 'The ID of the slot to update' },
                    start_time: { type: 'string', description: 'New start time in ISO format (YYYY-MM-DDTHH:MM:SS)' },
                    end_time: { type: 'string', description: 'New end time in ISO format (YYYY-MM-DDTHH:MM:SS)' },
                },
                required: ['slot_id'],
            },
        },
        {
            type: 'function',
            name: 'move_slot_to_day',
            description: 'Move an activity from one day to another in the itinerary.',
            parameters: {
                type: 'object',
                properties: {
                    slot_id: { type: 'string', description: 'The ID of the slot to move' },
                    target_date: { type: 'string', description: 'The target date (YYYY-MM-DD)' },
                    start_time: { type: 'string', description: 'Optional new start time (HH:MM)' },
                },
                required: ['slot_id', 'target_date'],
            },
        },
        {
            type: 'function',
            name: 'remove_slot',
            description: 'Remove an activity from the itinerary.',
            parameters: {
                type: 'object',
                properties: {
                    slot_id: { type: 'string', description: 'The ID of the slot to remove' },
                },
                required: ['slot_id'],
            },
        },
        {
            type: 'function',
            name: 'edit_slot_title',
            description: 'Update the title or notes of an activity.',
            parameters: {
                type: 'object',
                properties: {
                    slot_id: { type: 'string', description: 'The ID of the slot to edit' },
                    title: { type: 'string', description: 'New title' },
                    notes: { type: 'string', description: 'New notes' },
                },
                required: ['slot_id'],
            },
        },
        {
            type: 'function',
            name: 'reorder_slots',
            description: 'Reorder activities within a day.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'The date (YYYY-MM-DD)' },
                    slot_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Slot IDs in the desired order',
                    },
                },
                required: ['date', 'slot_ids'],
            },
        },
        {
            type: 'function',
            name: 'delegate_to_expert',
            description: 'Delegate a complex request (recommendations, replanning, research) to the ATA Expert.',
            parameters: {
                type: 'object',
                properties: {
                    request: { type: 'string', description: "The user's request to delegate" },
                },
                required: ['request'],
            },
        },
        {
            type: 'function',
            name: 'navigate_ui',
            description: 'Navigate the tripboard UI — switch tabs, open modals, change views, scroll to sections.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['switch_tab', 'open_modal', 'change_view', 'scroll_to'],
                        description: 'The type of UI navigation action',
                    },
                    target: {
                        type: 'string',
                        description: 'Target for the action. For switch_tab: overview|itinerary|stays|activities|food|must_have|visa|tips|flights. For open_modal: preferences|share|invite|add_slot|add_experience|add_food|add_stays|expert. For change_view: kanban|calendar|map. For scroll_to: day_N or city_Name.',
                    },
                },
                required: ['action', 'target'],
            },
        },
    ]
}
