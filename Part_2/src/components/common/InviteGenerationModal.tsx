import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, UserPlus } from 'lucide-react'
import { generateInvite } from '@/api/tripInviteAPI/tripInviteAPI'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface InviteGenerationModalProps {
    isOpen: boolean
    onClose: () => void
    tripId: string
    anchorRect?: DOMRect | null
    ModalContainer?: string
}

const InviteGenerationModal = ({ isOpen, onClose, tripId, anchorRect ,ModalContainer }: InviteGenerationModalProps) => {
    const [loading, setLoading] = useState(false)
    const [inviteData, setInviteData] = useState<{ invite_token: string; invite_url: string; status: string; expires_at?: string | null } | null>(
        null
    )
    const [copied, setCopied] = useState(false)
    const { trackButtonClickCustom } = usePostHog()

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const handleGenerateInvite = async () => {
        if (loading) return

        trackButtonClickCustom?.({
            buttonPage: 'trip_preferences_modal',
            buttonName: 'generate_invite_link',
            buttonAction: 'click',
            extra: {
                tripId,
                hasExistingInvite: !!inviteData,
            }
        })

        setLoading(true)
        try {
            const invite = await generateInvite(tripId, {})

            setInviteData({
                ...invite
            })
            toast.success('Invite link generated successfully!')
        } catch (error: any) {
            console.error('Error generating invite:', error)
            toast.error(error.message || 'Failed to generate invite. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleCopyLink = async () => {
        if (!inviteData?.invite_url) return

        try {
            await navigator.clipboard.writeText(inviteData.invite_url)
            setCopied(true)
            toast.success('Invite link copied to clipboard!')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy link:', error)
            toast.error('Failed to copy link. Please try again.')
        }
    }

    const handleClose = () => {
        setInviteData(null)
        setCopied(false)
        onClose()
    }

    // Calculate position: place below the anchor element, horizontally aligned to its right edge
    const top = anchorRect ? anchorRect.bottom + 12 : window.innerHeight / 2 - 200
    const left = anchorRect ? anchorRect.right - 360 : window.innerWidth / 2 - 180
    const clampedLeft = Math.min(Math.max(16, left), window.innerWidth - 360 - 16)
    const panelHeight = inviteData ? 350 : 250
    const maxTop = Math.max(16, window.innerHeight - panelHeight - 16)
    const clampedTop = Math.min(Math.max(16, top), maxTop)

    const modalContent = (
        <div className={`fixed inset-0 z-50 ${ModalContainer}`}>
            <div
                className="absolute inset-0"
                onClick={handleClose}
            />
            <div
                className="absolute flex w-[360px] max-h-[80vh] border border-grey-4/80 flex-col overflow-hidden rounded-[24px] bg-white shadow-xl"
                style={{ top: clampedTop, left: clampedLeft }}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-grey-0">Invite Traveler</h2>
                        <p className="text-sm font-[550] text-grey-2 mt-1">Share a link to let your friends join and plan the trip together</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cursor-pointer p-1 text-grey-2/80 hover:text-grey-0"
                        aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="border-t border-grey-4/80" />

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {!inviteData ? (
                        <div className="space-y-4">
                            {/* Generate Button */}
                            <button
                                type="button"
                                onClick={handleGenerateInvite}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-default text-white rounded-lg font-semibold text-sm hover:bg-primary-default/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                {loading ? (
                                    <>
                                        <svg
                                            className="animate-spin h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                        </svg>
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        <span>Generate Invite Link</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Success Message */}
                            <div className="flex items-center gap-2 text-green-600">
                                <Check className="h-5 w-5" />
                                <span className="text-sm font-semibold">Invite link generated successfully!</span>
                            </div>

                            {/* Invite URL Display */}
                            <div>
                                <label className="text-sm font-semibold text-grey-1 mb-2 block">Invite Link</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={inviteData.invite_url}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-grey-4/80 rounded-lg text-sm text-grey-0] bg-grey-5"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-grey-5 border border-grey-4/80 rounded-lg hover:bg-grey-4 transition-colors"
                                        title="Copy link">
                                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-grey-2/80" />}
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setInviteData(null)
                                    }}
                                    className="flex-1 px-4 py-2 border border-grey-4/80 rounded-lg text-sm font-semibold text-grey-0 hover:bg-grey-5 transition-colors">
                                    Generate Another
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 bg-primary-default text-white rounded-lg text-sm font-semibold hover:bg-primary-default/90 transition-colors">
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default InviteGenerationModal
