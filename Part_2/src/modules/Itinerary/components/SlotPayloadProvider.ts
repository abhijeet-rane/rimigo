export interface SlotPayloadProvider {
    getPayload: () => Record<string, any> | null
}
