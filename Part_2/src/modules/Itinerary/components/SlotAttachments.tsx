import { CreditCard } from 'lucide-react'

import Typography from '@/components/shared/Typography'
import { cn } from '@/lib/utils'

import { AttachmentIcon } from './AttachmentIcon'

interface Attachment {
    id: string
    type: string
    name: string
    url: string
}

/**
 * Renders the `attachments` list embedded on each itinerary slot.
 *
 * Voucher-typed attachments get a distinctive tint + card icon so the
 * traveler reads them as "this slot has a saved ticket / confirmation"
 * rather than a generic file link. Other attachment types (receipt,
 * pass, link, etc.) keep the original neutral chip styling.
 */
export const SlotAttachments = ({ attachments }: { attachments: Attachment[] }) => {
    if (!attachments.length) return null

    return (
        <div className="flex flex-col gap-3">
            <Typography size="16" family="manrope" weight="medium">
                Attachments
            </Typography>

            <div className="grid grid-cols-2 gap-3">
                {attachments.map((item) => {
                    const isVoucher = item.type === 'voucher'
                    return (
                        <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                'rounded-lg p-3 flex items-center gap-3 transition border',
                                isVoucher
                                    ? 'border-primary-default/30 bg-primary-default/[0.04] hover:bg-primary-default/[0.08]'
                                    : 'border-grey-4 hover:bg-grey-5',
                            )}
                        >
                            {isVoucher ? (
                                <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary-default/10 text-primary-default">
                                    <CreditCard className="w-5 h-5" />
                                </span>
                            ) : (
                                <AttachmentIcon url={item.url} />
                            )}

                            <div className="flex flex-col min-w-0">
                                <Typography
                                    size="14"
                                    family="manrope"
                                    weight="medium"
                                    className="truncate"
                                >
                                    {item.name}
                                </Typography>
                                <Typography
                                    family="manrope"
                                    weight="medium"
                                    size="11"
                                    color={isVoucher ? 'primary-default' : 'grey-2'}
                                    className={isVoucher ? 'uppercase tracking-wider' : undefined}
                                >
                                    {isVoucher ? 'Voucher' : item.type}
                                </Typography>
                            </div>
                        </a>
                    )
                })}
            </div>
        </div>
    )
}
