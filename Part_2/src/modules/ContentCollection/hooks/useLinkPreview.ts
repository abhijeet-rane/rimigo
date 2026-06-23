import { useMemo } from 'react'

export interface LinkPreviewData {
    title?: string
    description?: string
    image?: string
    siteName?: string
    favicon?: string
}

/**
 * Simple hook to extract link preview data from URL
 * Similar to fetchLinkPreview in AddAttachmentForm.tsx
 * Uses Google's favicon service for reliable icon fetching
 */
export const useLinkPreview = (url: string): { previewData: LinkPreviewData | null } => {
    const previewData = useMemo(() => {
        try {
            const urlObj = new URL(url)
            const hostname = urlObj.hostname

            // Format domain name for display
            let domainName = hostname.replace('www.', '')
            const domainParts = domainName.split('.')
            if (domainParts.length >= 2) {
                domainName = domainParts[domainParts.length - 2]
            }

            return {
                title: domainName.charAt(0).toUpperCase() + domainName.slice(1),
                description: '',
                image: `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`,
                siteName: hostname.replace('www.', ''),
                favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
            }
        } catch {
            return null
        }
    }, [url])

    return { previewData }
}


