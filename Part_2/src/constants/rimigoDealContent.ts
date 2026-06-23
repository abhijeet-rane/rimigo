export const RIMIGO_DEAL_CONTENT = {
    internal: {
        title: 'Rimigo Deal',
        description: 'This is a Rimigo internal deal. You have access to detailed pricing information and can proceed with the booking through our internal system.',
        variant: 'default' as const,
    },
    pro: {
        title: 'Rimigo Deal',
        description: 'Please reach out to your dedicated travel expert to book this deal.',
        variant: 'default' as const,
    },
    premium: {
        title: 'Rimigo Deal',
        description: 'Please reach out to your dedicated travel expert to book this deal.',
        variant: 'premium' as const,
    },
    nonPremium: {
        title: 'Rimigo Deal',
        description: 'Unlock this deal with Rimigo Premium.',
        variant: 'premium' as const,
        ctaText: 'Explore Rimigo Premium',
    },
}
