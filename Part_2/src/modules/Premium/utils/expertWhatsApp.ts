import { postPremiumFormData } from '@/modules/Premium/api/premiumPageAPI'

/** Direct WhatsApp hand-off for "Talk to expert" on mobile. The number is E.164
 *  without the leading '+' (wa.me format); the copy is sent both as the
 *  lead-capture query and prefilled into WhatsApp. */
export const EXPERT_WHATSAPP_NUMBER = '918904648059'
export const EXPERT_DIRECT_QUERY = "Hi! I'd like to connect with a Rimigo travel expert."

interface TravelerLite {
    name?: string
    phone?: string
    country_code?: string
}

/**
 * Fire the mobile "Talk to expert" hand-off: record the lead (best-effort) and
 * open WhatsApp prefilled with the same copy. The WhatsApp open must run inside
 * the originating tap gesture so mobile browsers don't treat it as a blocked
 * popup — call this synchronously from the click handler.
 */
export function fireExpertWhatsAppHandoff(opts: {
    travelerDetails?: TravelerLite
    subscriptionIntent: string
}): void {
    const { travelerDetails, subscriptionIntent } = opts
    if (travelerDetails?.phone) {
        void postPremiumFormData({
            name: travelerDetails.name || '',
            phone: travelerDetails.phone,
            country_code: travelerDetails.country_code || '+91',
            subscription_intent: subscriptionIntent,
            query_text: EXPERT_DIRECT_QUERY,
        }).catch(() => {
            /* lead capture is best-effort; the WhatsApp hand-off is the CTA */
        })
    }
    const waUrl = `https://wa.me/${EXPERT_WHATSAPP_NUMBER}?text=${encodeURIComponent(EXPERT_DIRECT_QUERY)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
}
