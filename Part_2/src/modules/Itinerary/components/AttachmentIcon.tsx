import { ExternalLink } from 'lucide-react'

export const AttachmentIcon = ({ url }: { url: string }) => {
    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)

    if (isImage) {
        return (
            <img
                src={url}
                className="w-10 h-10 rounded object-cover"
                alt="attachment"
            />
        )
    }

    return (
        <ExternalLink
            size={20}
            className="text-primary-default"
        />
    )
}
