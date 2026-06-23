import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, User, Phone, LogOut, Mail } from 'lucide-react'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'

import { updateTraveler } from '@/api/travelerAPI/travelerAPI'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import { formatEmail, shouldDisplayEmail } from '@/utils/emailFormatter'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import UserAvatar from '@/components/shared/UserAvatar'

const formatPhone = (countryCode: string | null, phone: string | null) => {
    if (!phone) return '—'
    return countryCode ? `${countryCode} ${phone}` : phone
}

// --- Preference Row ---
const PreferenceRow = ({
    label,
    value,
    icon: Icon,
    onClick,
    leading
}: {
    label: string
    value: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    onClick?: () => void
    leading?: React.ReactNode
}) => {
    const isClickable = Boolean(onClick)
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full px-6 flex items-center justify-between py-3 border-b border-[#EDEDED] last:border-0 text-left ${
                isClickable ? 'hover:bg-[#F8F8F8] cursor-pointer' : 'cursor-default'
            }`}>
            <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-[#F8F8F8] rounded-lg flex items-center justify-center flex-shrink-0">
                {leading ? (
                    <div className="flex-shrink-0">{leading}</div>
                ) : (
                    <div className="w-10 h-10 bg-[#F8F8F8] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-[#101010]" />
                    </div>
                )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-red-hat-display font-semibold text-[#101010]">{label}</div>
                    <div className="text-sm text-manrope text-[#747474] mt-1 truncate">{value}</div>
                </div>
            </div>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 ml-2 ${isClickable ? 'text-[#747474]' : 'text-[#D0D0D0]'}`} />
        </button>
    )
}

// --- Edit Steps ---
const EditNameStep = ({
    initialName,
    onSave,
    onClose,
    isSaving
}: {
    initialName: string
    onSave: (name: string) => void
    onClose: () => void
    isSaving: boolean
}) => {
    const [name, setName] = useState(initialName)

    return (
        <div className="flex flex-col h-full z-[25010]">
            <div className="flex items-start justify-between p-6 pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-[#101010]">Edit Name</h2>
                    <p className="text-sm text-[#747474] mt-1">Update your full name</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer p-1 text-[#747474] hover:text-[#101010]"
                    aria-label="Close">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <label className="block">
                    <span className="text-sm font-medium text-[#101010] mb-2 block">Full Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 border border-[#EDEDED] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#101010]"
                    />
                </label>
            </div>

            <div className="p-6 flex gap-3 border-t border-[#EDEDED]">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="cursor-pointer flex-1 px-4 py-3 border border-[#EDEDED] rounded-lg text-[#101010] font-medium hover:bg-[#F8F8F8] disabled:opacity-50 disabled:cursor-not-allowed z-[25012]">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(name.trim())}
                    disabled={isSaving || !name.trim()}
                    className="cursor-pointer flex-1 px-4 py-3 bg-[#101010] text-white rounded-lg font-medium hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    )
}

const EditEmailStep = ({
    initialEmail,
    onSave,
    onClose,
    isSaving
}: {
    initialEmail: string
    onSave: (email: string) => void
    onClose: () => void
    isSaving: boolean
}) => {
    const sanitizedEmail =
        initialEmail?.includes('@placeholder.com') ? '' : initialEmail
    const [email, setEmail] = useState(sanitizedEmail)

    return (
        <div className="flex flex-col h-full z-[25010]">
            <div className="flex items-start justify-between p-6 pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-[#101010]">Edit Email</h2>
                    <p className="text-sm text-[#747474] mt-1">Update your email address</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer p-1 text-[#747474] hover:text-[#101010]"
                    aria-label="Close">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <label className="block">
                    <span className="text-sm font-medium text-[#101010] mb-2 block">Email Address</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 border border-[#EDEDED] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#101010]"
                    />
                </label>
            </div>

            <div className="p-6 flex gap-3 border-t border-[#EDEDED]">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="cursor-pointer flex-1 px-4 py-3 border border-[#EDEDED] rounded-lg text-[#101010] font-medium hover:bg-[#F8F8F8] disabled:opacity-50 disabled:cursor-not-allowed z-[25012]">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(email.trim())}
                    disabled={isSaving || !email.trim()}
                    className="cursor-pointer flex-1 px-4 py-3 bg-[#101010] text-white rounded-lg font-medium hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    )
}

// --- Main Modal ---
interface TravelerProfileModalProps {
    isOpen: boolean
    onClose: () => void
    isPremium: boolean
    isPro?: boolean
}

const TravelerProfileModal = ({ isOpen, onClose, isPremium, isPro }: TravelerProfileModalProps) => {
    const container = typeof document !== 'undefined' ? document.body : null
    const [travelerId, setTravelerId] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState<'name' | 'email' | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const { signOut } = useAuth()

    const [localName, setLocalName] = useState('')
    const [localEmail, setLocalEmail] = useState('')

    // Fetch travelerId from token
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                if (!userInfo?.traveler_id) throw new Error('Traveler ID not found')
                setTravelerId(userInfo.traveler_id)
            } catch (err) {
                toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            }
        }
        fetchTravelerId()
    }, [])

    // Fetch traveler details
    const { travelerDetails } = useTravelerDetails(travelerId ?? undefined)

    // Populate local state from API data when travelerDetails loads
    useEffect(() => {
        if (!travelerDetails) return

        // Initialize local state from API data (only if not already set to avoid overwriting edits)
        if (travelerDetails.name && !localName) {
            setLocalName(travelerDetails.name)
        }
        if (travelerDetails.email && !localEmail) {
            setLocalEmail(travelerDetails.email)
        }
    }, [travelerDetails])

    // Sync to local state
    useEffect(() => {
        const updateStoredUserInfo = async () => {
            if (!travelerDetails) return

            const existing = await TokenStorage.getUserInfo()
            if (!existing) return

            // Only update if email is real + changed
            if (shouldDisplayEmail(travelerDetails.email) && existing.email !== travelerDetails.email) {
                const updatedUserInfo = {
                    ...existing,
                    email: travelerDetails.email
                }

                await TokenStorage.setUserInfo(updatedUserInfo)
            }
        }

        updateStoredUserInfo()
    }, [travelerDetails])

    const displayContent = useMemo(() => {
        if (!travelerDetails) return null
        // Use local state if set (for edits), otherwise fall back to API data
        const name = localName || travelerDetails.name || '—'
        const email = localEmail || travelerDetails.email || ''
        const emailDisplay = shouldDisplayEmail(email) ? email : '—'
        return {
            name,
            email: emailDisplay,
            phone: formatPhone(travelerDetails.country_code, travelerDetails.phone)
        }
    }, [travelerDetails, localName, localEmail])

    if (!isOpen || !container || !travelerDetails || !displayContent) return null

    const handleLogout = async () => {
        try {
            await signOut()
            window.location.href = '/'
        } catch (error) {
            toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        }
    }

    const handleSave = async (data: { name?: string; email?: string }) => {
        if (!travelerId || !travelerDetails) return
        setIsSaving(true)
        try {
            // Format email only if it's being explicitly updated
            const formattedEmail = data.email !== undefined ? formatEmail(data.email) : undefined

            // Use local state if available, otherwise fall back to travelerDetails
            const currentName = localName || travelerDetails.name || ''

            // If updating name or email, call the API
            if (data.name !== undefined || formattedEmail !== undefined) {
                const payload: { name: string; email?: string } = {
                    name: data.name ?? currentName
                }
                // Only include email if it's being explicitly updated
                if (formattedEmail !== undefined) {
                    payload.email = formattedEmail
                }

                // Call the API directly (without adapter since we removed gender requirement)
                await updateTraveler(travelerId, payload)

                // Update local state only after successful API call
                if (data.name !== undefined) setLocalName(data.name)
                if (data.email !== undefined) setLocalEmail(formattedEmail || '')
                setActiveSection(null)
                toast.success('Profile updated successfully!')
            } else {
                // No API call needed, just update local state (shouldn't happen, but handle it)
                if (data.name !== undefined) setLocalName(data.name)
                if (data.email !== undefined) setLocalEmail(formattedEmail || '')
                setActiveSection(null)
                toast.success('Profile updated successfully!')
            }
        } catch (err) {
            // Don't update state or show success toast on error
            toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsSaving(false)
        }
    }

    const sections = [
        { key: 'name', label: 'Full Name', value: displayContent.name, icon: User, editable: true },
        { key: 'email', label: 'Email', value: displayContent.email, icon: Mail, editable: true },
        { key: 'phone', label: 'Mobile Number', value: displayContent.phone, icon: Phone, editable: false }
    ] as const

    const mainModalContent = (
        <div className="fixed inset-0 z-2500">
            {/* Overlay */}
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="absolute bottom-16 left-2 md:left-4 flex w-[300px] sm:w-[390px] max-h-[80vh] flex-col overflow-hidden rounded-[18px] bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[#101010]">Your Profile</h2>
                        <p className="text-sm text-[#747474] mt-1">Manage your personal information</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer p-1 text-[#747474] hover:text-[#101010]"
                        aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="border-t border-[#EDEDED]" />

                {/* Body */}
                <div className="flex-1 overflow-y-auto py-0">
                {sections.map((section) => (
                    <PreferenceRow
                        key={section.key}
                        label={section.label}
                        value={section.value}
                        icon={section.icon}
                        onClick={section.editable ? () => setActiveSection(section.key as 'name' | 'email') : undefined}
                        leading={
                            section.key === 'name' ? (
                                <UserAvatar
                                    isPremium={isPremium}
                                    isPro={isPro}
                                    size="md"
                                    name={displayContent.name}
                                />
                            ) : undefined
                        }
                    />
                ))}

                <PreferenceRow
                    key="logout"
                    label="Log Out"
                    value=""
                    icon={LogOut}
                    onClick={handleLogout}
                />
            </div>

            </div>
        </div>
    )

    const editModalContent = activeSection && (
        <div className="fixed inset-0 z-[25011]">
            <div
                className="absolute inset-0"
                onClick={() => setActiveSection(null)}
            />
            <div className="absolute flex w-[300px] md:w-[390px]  bottom-16 left-2 md:left-4 max-h-[80vh] flex-col overflow-hidden rounded-[24px] bg-white shadow-xl ">
                {activeSection === 'name' && (
                    <EditNameStep
                        initialName={localName || travelerDetails?.name || ''}
                        onSave={(name) => handleSave({ name })}
                        onClose={() => setActiveSection(null)}
                        isSaving={isSaving}
                    />
                )}
                {activeSection === 'email' && (
                    <EditEmailStep
                        initialEmail={localEmail || travelerDetails?.email || ''}
                        onSave={(email) => handleSave({ email })}
                        onClose={() => setActiveSection(null)}
                        isSaving={isSaving}
                    />
                )}
            </div>
        </div>
    )

    return (
        <>
            {createPortal(mainModalContent, container)}
            {activeSection && createPortal(editModalContent, container)}
        </>
    )
}

export { TravelerProfileModal }
